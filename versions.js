'use strict';

var EventEmitter = require('events').EventEmitter
  , Expirable = require('Expireable')
  , Logger = require('devnull')
  , path = require('path');

function Versions() {
  this.config = Object.create(null);

  // Default the root of the module to the folder that required this module.
  this.set('root', path.dirname(module.parent.filename));

  // Read in the various of configurations that we want to merge in to our own
  // config object.
  this.read('../../node_modules/package.json');    // For version number
  this.read('./versions.json');                    // For our defaults
  this.read('../../node_modules/versions.json');   // For their defaults

  // Now that we have our configuration we can start setting up rest.
  this.logger = new Logger({
      namespacing: -1                             // Turn off namespaces
    , level: Logger.levels[this.get('log level')] // Set custom log level
  });
}

/**
 * Versions inherits from the EventEmitter so we can emit events for internal
 * changes.
 */
Versions.prototype.__proto__ = EventEmitter.prototype;

/**
 * The current running version of Versions
 *
 * @type {String}
 * @public
 */
Versions.prototype.version = require('./package.json').version;

/**
 * Duration conversion parser.
 *
 * @type {Function}
 * @param {String} ms The string that needs to be parsed
 * @param {Object} options Optional configuration for parsing
 * @api public
 */
Versions.prototype.parse = require('ms');

/**
 * These values need to be converted automatically using the `Versions#parse`
 * method.
 *
 * @type {Array}
 * @private
 */
Versions.prototype.convert = [
    'max age'
  , 'expire internal cache'
];

/**
 * Read in a configuration file and merge it with our internal configuration.
 *
 * @param {String} path
 * @returns {Versions}
 * @api public
 */
Versions.prototype.read = function read(path) {
  var local = {};

  try { local = require(path); }
  catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      this.logger.error('[versions] Failed to parse '+ path +':');
      this.logger.error('[versions] - The file contains invalid JSON.');
    }

    return this;
  }

  // Merge the changes in to our configuration object.
  Object.keys(local).forEach(function merge(key) {
    this.set(key, local[key]);
  }, this);

  return this;
};

/**
 * Layer allows us to easily add new middlware layers to our server.
 *
 * @param {String} name The filename of the layer.
 * @param {Object} options Optional configuration to initialize the middleware
 */
Versions.prototype.layer = function layer(name, options) {
  // This is actually a connect middleware
  if ('name' in this.connect) {
    this.app.use(this.connect[name](arguments[1], arguments[2]));
    return this;
  }

  // Use our own middleware collection instead
  var middleware = require('./lib/'+ name);

  // This middleware layer was probably not exported using `module.exports` and
  // requires an extra configuration step
  if (options) middleware = middleware(options);

  // We are going to bind all the middleware layers to `this` so they all have
  // access to our configuration and methods they need.
  this.app.use(middleware.bind(this));
  return this;
};

/**
 * Listen instructs Versions to setup the static server. This function should
 * only be called once you are done with all your modifications.
 *
 * @param {Number} port Optional port number, if you didn't set in a config file
 * @param {Function} callback Callback for when the server has started
 * @api public
 */
Versions.prototype.listen = function listen(port, callback) {
  if (port) this.set('port', port);
  if (callback) this.once('listening', callback);

  // Initialize the server configuration.
  this.initialize('server');

  // Configure the middleware
  this.layer('responseTime');
  this.layer('initialization');
  this.layer('conditional');
  this.layer('compress');
  this.layer('memorize');
  this.layer('static', this.get('static'), { maxAge: this.get('max age') });
  this.layer('rest');
  this.layer('pull');
  this.layer('done');

  // Start listening for changes.
  this.server = require('http').createServer(this.app);
  this.server.listen(this.get('port'), function listening(err) {
    this.emit('listening', err);
  }.bind(this));
};

/**
 * Initialize extra configuration details.
 *
 * @param {String} type Initialization type
 * @api private
 */
Versions.prototype.initialize = function initialize(type) {
  // Set up our middleware handlers.
  this.connect = require('connect');
  this.app = this.connect();

  // Prepare our cache and Metrics.
  this.cache = new Expirable(this.get('expire internal cache'));
  this.metrics = require('./metrics').collect(this);

  // Do we need to sync?
  if (this.get('sync') && this.get('redis')) {
    this.sync();
  }

  return this;
};

/**
 * Read out the configuration.
 *
 * @param {String} key
 * @returns {Mixed} The value
 * @api public
 */
Versions.prototype.get = function get(key) {
  return this.config[key];
};

/**
 * Updates a configuration value and emits a `change:<key>` event.
 *
 * @param {String} key Configuration property that needs to be updated
 * @param {Mixed} to The new value
 * @returns {Versions}
 */
Versions.prototype.set = function set(key, to, emit) {
  var from = this.config[key];

  // Do we need to parse down the value?
  if (~this.convert.indexOf(key)) to = this.parse(to);
  if (from === to) return this;

  // Always emit the change, unless an explecit `false` has been provided
  if (emit !== false) emit = true;

  // Check how we need to set the data, try to make it aware of different types
  // that can be stored in a configuration like objects and arrays, we probably
  // want to merge those in instead of completely overriding the config value.
  if (Array.isArray(from)) {
    if (!Array.isArray(to) && !~from.indexOf(to)) from.push(to);
    else if (to.forEach) to.forEach(function each(value) {
      if (~from.indexOf(value)) return;

      from.push(value);
    });

    this.config[key] = from;
  } else if ('object' === typeof from) {
    Object.keys(to).forEach(function each(key) {
      from[key] = to[key];
    });

    this.config[key] = from;
  } else {
    this.config[key] = to;
  }

  return emit ? this.emit('change:'+ key, from, to) : this;
};

/**
 * Setup a sync system that can be used for client to communicate with the
 * servers.
 *
 * @api public
 */
Versions.prototype.sync = function sync() {
  if (this.get('redis')) {
    if (this.connections) return false;

    var namespace = this.get('redis').namespace || 'versions'
      , self = this
      , pub, sub;

    // Generate the redis connections
    this.connections = this.versions.factory();
    sub = this.connections.sub;
    pub = this.connections.pup;

    // Setup our subscription channel so we can start listening for events.
    sub.on('message', function message(channel, data) {
      if (channel !== namespace) return;

      // Prevent invalid data to be transmitted
      try { data = JSON.parse(data); }
      catch (e) {
        return self.logger.error('Failed to parse PUB/SUB message', data);
      }

      // Make sure that it's valid data
      if (!data || !data.key || data.value) {
        return self.logger.error('Received an invalid data structure', data);
      }

      // Make sure that the value actually differs from our own implementation.
      var prev = self.get(data.key);
      if (prev === data.value) return self.logger.debug('Data already up to date');

      self.set(data.key, data.value, false);
    }).subscribe(namespace);

    // Start listening for configuration changes so we can publish them across
    // the cluster.
    ['version', 'aliases'].forEach(function forEach(key) {
      self.on('change:'+ key, function change(from, to) {
        pub.publish(namespace, JSON.stringify(to));
      });
    });

    return true;
  }

  return false;
};

/**
 * Generate some Redis connections.
 *
 * @returns {Object}
 * @api private
 */
Versions.prototype.factory = function factory() {
  var config = this.get('redis')
    , redis = require('redis');

  return ['pub', 'sub'].reduce(function create(conn, type) {
    var client = conn[type] = redis.createClient(config.port, config.host);

    // Optional connection authorization
    if ('auth' in config) client.auth();
    return conn;
  }, {});
};

/**
 * Generate some API sugar for configuring versions. This will allow you to
 * either override configurations that were loaded from the `versions.json`
 * configuration file in the root of your application or just set the
 * configuration values if you don't want to use a `versions.json` file.
 *
 * The generate API supports chaining:
 *
 *   require('versions').cache('10 days').path('/public').listen();
 *   require('versions').path('/public').listen();
 *
 * @param {Mixed} arg The value that needs to be set.
 * @returns {Versions}
 * @api public
 */
[
  { method: 'path', config: 'directory' },
  { method: 'cache', config: 'max age' },
  { method: 'expire', config: 'expire internal cache' }
].forEach(function generate(api) {
  Versions.prototype[api.method] = function sugar(arg) {
    this.set(api.config, arg);
    return this;
  };
});

/**
 * Establish a connection with a Versions server so it can sync version numbers
 * between the server and clients.
 *
 * @param {String} server The domain name of the Versions server.
 * @param {Object} options Connection options.
 * @returns {Version.Client}
 */
Versions.prototype.connect = function connect(server, options) {
  return new Versions.Client(this, server, options);
};

Versions.prototype.end = function () {
  if ('connections' in this) {
    Object.keys(this.connections).forEach(function each(key) {
      this.connections[key].end();
    }, this);
  }
};

/**
 * Lazy load the Client instance.
 */
Object.defineProperty(Versions, 'Client', {
  get: function get() {
    return require('./client');
  }
});

module.exports = new Versions();
