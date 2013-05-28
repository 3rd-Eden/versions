'use strict';

var EventEmitter = require('events').EventEmitter
  , Expirable = require('expirable')
  , Leverage = require('leverage')
  , Logger = require('devnull')
  , zlib = require('zlib')
  , path = require('path')
  , ms = require('./ms');

/**
 * Unique identifier for the server.
 *
 * @type {Number}
 * @private
 */
var id = 0;

/**
 * Versions is simple dedicated static server, it does it best to ensure that
 * all static files are cached properly.
 *
 * Options:
 * - cloned: Is this a cloned instance? <boolean>
 *
 * @constructor
 * @param {Object} options Optional configuration.
 * @api public
 */
function Versions(options) {
  options = options || {};

  this.config = Object.create(null);
  this.id = [process.pid, id, Date.now()].join('-');

  // Default the root of the module to the folder that required this module.
  this.set('root', path.dirname(module.parent.filename));
  this.logger = new Logger({ namespacing: -1 });

  var root = path.resolve(__dirname, '../..');

  // Read in the various of configurations that we want to merge in to our own
  // configuration object.
  if (!options.cloned) {
    this.read(path.join(root, 'package.json'));   // For version number
    this.read('./versions.json');                 // For our defaults
    this.read(path.join(root, 'versions.json'));  // For their defaults
    this.read(path.join(root, 'versions.js'));    // For their defaults
  } else {
    Object.keys(options.cloned).forEach(function merge(key) {
      // Merge in the cloned configuration, silently
      this.set(key, options.cloned[key], true);
    }, this);
  }

  // Now that we have fetched their details, we can see if we need to silence
  // our logger.
  this.logger.level = Logger.levels[this.get('log level')];
}

/**
 * Versions inherits from the EventEmitter so we can emit events for internal
 * changes.
 *
 * @private
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
 * Async helper.
 *
 * @type {Object}
 * @api public
 */
Versions.prototype.async = require('./async');

/**
 * Semver compare
 *
 * @type {Object}
 * @api private
 */
Versions.prototype.semver = require('semver');

/**
 * Duration conversion parser.
 *
 * @param {String} ms The string that needs to be parsed
 * @param {Object} options Optional configuration for parsing
 * @api private
 */
Versions.prototype.parse = function parse(nr, options) {
  if (+nr && !options) return +nr;
  return ms(nr, options);
};

/**
 * Request.. Sends requests.
 *
 * @type {Function}
 * @api private
 */
Versions.prototype.request = require('request');

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
 * Layer allows us to easily add new middleware layers to our server.
 *
 * @param {String} name The filename of the layer.
 * @param {Object} options Optional configuration to initialize the middleware
 * @api private
 */
Versions.prototype.layer = function layer(name, options) {
  // This is actually a connect middleware
  if (name in this.connectjs) {
    this.app.use(this.connectjs[name](arguments[1], arguments[2]));
    return this;
  }

  var middleware;

  // Use our own middleware collection instead
  try { middleware = require('./lib/'+ name); }
  catch (e) {
    this.logger.debug('[versions] Failed to load '+ name, e);

    // If it's not found it might be a third party module
    try { middleware = require(name); }
    catch (e) {
      this.logger.error('[versions] Unable to load the '+ name +' middleware');
      this.logger.error('[versions] Please make sure that the module is installed');
      this.logger.error('[versions] Continuing without the '+ name +' middleware');
      return this;
    }
  }

  // This middleware layer was probably not exported using `module.exports` and
  // requires an extra configuration step
  if (options || middleware.length === 1) {
    this.logger.debug('[versions] Configuring the '+ name +' middleware');
    middleware = middleware.call(this, options);
  }

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

  // Configure the middleware.
  this.layer('responseTime');
  this.layer('initialize');
  this.layer('versioning');
  this.layer('conditional');
  this.layer('compress');
  this.layer('memorize');

  // Allow the loading of third party components.
  if (this.get('plugins')) {
    this.get('plugins').forEach(function add(plugin) {
      if ('string' === typeof plugin) {
        this.layer(plugin);
      } else {
        this.layer(plugin.name, plugin.config);
      }
    }, this);
  }

  // Only add static server support if it a `directory` was specified in the
  // configuration.
  if (this.get('directory')) {
    // Check if the directory exists, we can just lazy require the fs module
    // here as the listen call is done during the boot strapping of the server.
    if (require('fs').existsSync(this.get('static'))) {
      this.layer('static', this.get('static'), { maxAge: this.get('max age') });
    } else {
      this.logger.error(
          '[versions] The %s does not exists, local file serving is disabled'
        , this.get('static')
      );
    }
  }

  // Routing should only be enabled with an `auth` configuration.
  if (this.get('auth')) {
   this.layer('rest');
  }

  // Only add support for origin pull if we actually have servers configured.
  if (this.get('origin servers').length) {
    this.layer('pull');
  }

  // End of the configurable middleware.
  this.layer('done');

  // Start listening for changes.
  if (this.get('ssl')) {
    if (this.get('spdy')) {
      this.server = require('spdy').createServer(this.get('ssl'), this.app);
    } else {
      this.server = require('https').createServer(this.get('ssl'), this.app);
    }
  } else {
    this.server = require('http').createServer(this.app);
  }

  this.server.listen(this.get('port'), function listening(err) {
    this.emit('listening', err);
  }.bind(this));

  return this;
};

/**
 * Initialize extra configuration details.
 *
 * @param {String} type Initialization type
 * @api private
 */
Versions.prototype.initialize = function initialize(type) {
  // Setup our extra configuration values.
  if (!this.get('static')) {
    this.set('static', path.resolve(this.get('root'), this.get('directory')));
  }

  // Setup our middleware handlers.
  this.connectjs = require('connect');
  this.app = this.connectjs();

  // Prepare our cache and Metrics.
  this.cache = new Expirable(this.get('expire internal cache'));
  this.metrics = require('./measure').collect(this);

  // Setup syncing if provided.
  this.sync();
  return this;
};

/**
 * Writes a cached response.
 *
 * @param {Request} req HTTP server request
 * @param {Response} res HTTP server response
 * @param {Object} data the stuff that we need to write
 * @api private
 */
Versions.prototype.write = function write(req, res, data) {
  var age = this.get('max age')
    , body = data.buffer
    , type;

  // Check if we have a GZIP version of the content.
  if ('compressed' in data) {
    // Force GZIP over deflate as it is more stable.
    if (this.allows('deflate', req) && data.compressed.deflate) type = 'deflate';
    if (this.allows('gzip', req) && data.compressed.gzip) type = 'gzip';

    if (type) {
      res.setHeader('Content-Encoding', type);
      body = data.compressed[type];
      this.metrics.incr(type, { req: req, res: res });
    } else {
      this.metrics.incr('compression blocked', { req: req, res: res });
    }
  }

  res.setHeader('Expires', new Date(Date.now() + age).toUTCString());
  res.setHeader('Cache-Control', 'max-age='+ age +', public');
  res.setHeader('Last-Modified', data['last-modified']);
  res.setHeader('Content-Type', data['content-type']);
  res.setHeader('Content-Length', body.length);

  res.end(body);
  return this;
};

/**
 * Checks if the client allows `x` based on the details from the given
 * request.
 *
 * @param {String} what What do we need to test for
 * @param {Request} req HTTP server request
 * @returns {Boolean}
 * @api public
 */
Versions.prototype.allows = function allows(what, req) {
  var headers = req.headers;

  switch (what) {
    // Does the connected browser support GZIP?
    case 'gzip':
      // Detect broken gzip encoding on Internet Explorer 5 & 6
      // @see sebduggan.com/blog/ie6-gzip-bug-solved-using-isapirewrite
      var ua = (headers['user-agent'] || '');
      if (ua && /msie\s[5|6]/i.test(ua) && !/sv1/i.test(ua)) return false;

      // Fast case:
      if (~(headers['accept-encoding'] || '').toLowerCase().indexOf('gzip')) return true;

      // Attempt to detect obfuscated encoding headers, which is the least
      // common case here but caused by firewalls.
      // @see developer.yahoo.com/blogs/ydn/posts/2010/12/pushing-beyond-gzipping
      var obfheader = /^(Accept-EncodXng|X-cept-Encoding|X{15}|~{15}|-{15})$/i
        , obfvalue = /^((gzip|deflate)\s*,?\s*)+|[X\~\-]{4,13}$/i
        , obfuscated = false
        , key;

      for (key in headers) {
        if (obfheader.test(key) && obfvalue.test(headers[key])) {
          obfuscated = true;
          break;
        }
      }

      return obfuscated;

    case 'deflate':
      return !!~(headers['accept-encoding'] || '').toLowerCase().indexOf('deflate');

    // Do we allow this extension to be served from our server?
    case 'extension':
      req.extension = req.extension || path.extname(req.url);

      // Don't accept queries without file extensions and ignore blacklisted
      // extensions
      return ((this.get('force extensions') && req.extension !== '') || !this.get('force extensions'))
        && !~this.get('blacklisted extensions').indexOf(req.extension);

    // Does this request allow 304 requests?
    case '304':
      // Only allow 304's on GET requests the with the correct headers
      // @TODO check for the freshness of the content
      return req.method === 'GET'
        && !!(req.headers['if-none-match'] || req.headers['if-modified-since']);

    default:
      return false;
  }
};

/**
 * Compress the contents.
 *
 * @param {String} type Content-Type
 * @param {Mixed} data content that needs to be compressed
 * @param {Function} callback
 * @api private
 */
Versions.prototype.compress = function compress(type, data, callback) {
  var compressed = Object.create(null);

  function iterator(error, content, method) {
    compressed[method] = !error ? content : null;
    if (Object.keys(compressed).length === 2) callback(null, compressed);
  }

  // Only these types of content should be gzipped.
  if (/json|text|javascript|xml/i.test(type || '') || type in this.compressTypes) {
    zlib.gzip(data, function (error, content) { iterator(error, content, 'gzip'); });
    zlib.deflate(data, function (error, content) { iterator(error, content, 'deflate'); });
  } else {
    process.nextTick(callback);
  }

  return this;
};

/**
 * Files that should be gzipped but doesn't match our regexp check.
 *
 * @type {Object}
 * @api public
 */
Versions.prototype.compressTypes = {
  'application/vnd.ms-fontobject': true,
  'application/x-font-ttf': true,
  'font/opentype': true,
  'image/x-icon': true
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
 * @api public
 */
Versions.prototype.set = function set(key, to, emit) {
  var from = this.config[key];

  // Do we need to parse down the value?
  if (~this.convert.indexOf(key)) to = this.parse(to);
  if (from === to) return this;

  // Always emit the change, unless an explicit `false` has been provided
  if (emit !== false) emit = true;

  // Check how we need to set the data, try to make it aware of different types
  // that can be stored in a configuration like objects and arrays, we probably
  // want to merge those in instead of completely overriding the config value.
  if ('object' === typeof from) {
    this.config[key] = this.merge(from, to);
  } else {
    this.config[key] = to;
  }

  // Emit changes if needed
  if (emit) this.emit('change:'+ key, from, to);
  return this;
};

/**
 * Merge in objects.
 *
 * @param {Object} target The object that receives the props
 * @param {Object} additional Extra object that needs to be merged in the target
 * @return {Object} target
 * @api public
 */
Versions.prototype.merge = function merge(target, additional) {
  var result = target
    , undefined;

  if (Array.isArray(target)) {
    this.forEach(additional, function arrayForEach(index) {
      if (JSON.stringify(target).indexOf(JSON.stringify(additional[index])) === -1) {
        result.push(additional[index]);
      }
    });
  } else if ('object' === typeof target) {
    this.forEach(additional, function objectForEach(key, value) {
      if (target[key] === undefined) {
        result[key] = value;
      } else {
        result[key] = merge(target[key], additional[key]);
      }
    });
  } else {
    result = additional;
  }

  return result;
};

/**
 * Iterate over a collection. When you return false, it will stop the iteration.
 *
 * @param {Mixed} collection Either an Array or Object.
 * @param {Function} iterator Function to be called for each item
 * @returns {Versions}
 * @api public
 */
Versions.prototype.forEach = function forEach(collection, iterator, context) {
  var isArray = Array.isArray(collection)
    , length = collection.length
    , i = 0
    , value;

  if (context) {
    if (isArray) {
      for (; i < length; i++) {
        value = iterator.apply(collection[i], context);
        if (value === false) break;
      }
    } else {
      for (i in collection) {
        value = iterator.apply(collection[i], context);
        if (value === false) break;
      }
    }
  } else {
    if (isArray) {
      for (; i < length; i++) {
        value = iterator.call(collection[i], i, collection[i]);
        if (value === false) break;
      }
    } else {
      for (i in collection) {
        value = iterator.call(collection[i], i, collection[i]);
        if (value === false) break;
      }
    }
  }

  return this;
};

/**
 * Setup a sync system that can be used for client to communicate with the
 * servers.
 *
 * @api private
 */
Versions.prototype.sync = function sync() {
  if (!(this.get('redis') && this.get('sync'))) return false;

  //
  // Generate the connections
  //
  this.connections = this.factory();

  var namespace = this.get('namespace') || 'versions'
    , redis = this.connections.pub
    , self = this;

  //
  // Leverage Leverage for the Pub/Sub behaviour.
  //
  var leverage = new Leverage(redis, this.connections.sub, {
    namespace: namespace
  });

  leverage.subscribe(namespace, { ordered: true, replay: 0 });
  leverage.on(namespace +'::message', function onmessage(message, id) {
    var data;

    // Prevent invalid data to be transmitted
    try { data = JSON.parse(message); }
    catch (e) {
      return self.logger.error('[versions] Failed to parse PUB/SUB message', message);
    }

    // Make sure that it's valid data
    if (!data || !data.key || !data.value) {
      return self.logger.error('[versions] Received an invalid data structure', data);
    }

    // Make sure that the value actually differs from our own implementation.
    var prev = self.get(data.key);

    self.set(data.key, data.value, false);
    self.emit('sync:'+ data.key, data.value, prev);
  });

  //
  // Start listening for configuration changes so we can publish them across
  // the cluster.
  //
  this.syncing.forEach(function forEach(key) {
    self.on('change:'+ key, function change(from, to) {
      redis.set(namespace, JSON.stringify(self.config), function (err) {
        if (err) self.logger.error('[versions] Failed to store config');

        leverage.publish(namespace, JSON.stringify({
            key: key
          , value: to
          , from: from
        }), function published(err) {
          if (err) self.logger.error('[versions] Failed to publish message');

          self.emit('stored:'+ key, err);
        });
      });
    });
  });

  leverage.on(namespace +'::online', function online() {
    redis.get(namespace, function cloudconfig(err, config) {
      if (err || !config) self.emit('sync#ready');

      if (err) return self.logger.warning('[versions] Could not sync the initial config from the cloud');
      if (!config) return self.logger.debug('[versions] No config in cloud');

      try { config = JSON.parse(config); }
      catch (e) {
        self.emit('sync#ready');
        return self.logger.error('[versions] Failed to parse initial config');
      }

      self.syncing.forEach(function forEach(key) {
        self.set(key, config[key], false);
        self.emit('sync#'+ key, config[key]);
      });

      self.emit('sync#ready');
    });
  });

  return true;
};

/**
 * The properties that are allowed to be synced.
 *
 * @type {Array}
 * @api private
 */
Versions.prototype.syncing = ['version', 'aliases'];

/**
 * Generate some Redis connections.
 *
 * @returns {Object}
 * @api private
 */
Versions.prototype.factory = function factory() {
  var config = this.get('redis')
    , redis = require('redis')
    , self = this;

  return ['pub', 'sub'].reduce(function create(conn, type) {
    var client = conn[type] = redis.createClient(config.port, config.host)
      , auth = config.auth || config.pass || config.password;

    // Optional connection authorization.
    if (auth) client.auth(auth);

    // Setup an error listener so we know when things go FUBAR
    client.on('error', function error(err) {
      self.logger.error('[versions] The %s connection received an error', type);
      self.logger.error('[versions]', err);
    });

    // Setup a close listener
    client.on('end', function end() {
      self.logger.info('[versions] The %s connection has shutdown', type);
    });

    // Output some useful information for when server is reconnecting
    client.on('reconnecting', function reconnecting(evt) {
      self.logger.debug(
          '[versions] Reconnecting %s, attempt: %d with delay %d'
        , type
        , evt.attempt
        , evt.delay
      );
    });

    // Connected
    client.on('connect', function connect() {
      self.logger.debug('[versions] The %s connections is established', type);
    });

    // The connection is ready to be used
    client.on('ready', function ready() {
      self.logger.debug('[versions] The %s connections is ready', type);
    });

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
  { method: 'lifetime', config: 'max age' },
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
 * @api public
 */
Versions.prototype.connect = function connect(server, options) {
  return new Versions.Client(this, server, options);
};

/**
 * Clean up all internal connections and references.
 *
 * @param {Function} callback
 * @api public
 */
Versions.prototype.end = function (callback) {
  callback = callback || noop;

  // Shut down the Redis connections
  if ('connections' in this) {
    Object.keys(this.connections).forEach(function each(key) {
      var connection = this.connections[key];
      connection.end();

      // Check if there's a KEEPALIVE interval on this connection
      if ('KEEPALIVE' in connection) clearInterval(connection.KEEPALIVE);
    }, this);
  }

  // Kill our Expirable module
  if ('cache' in this) {
    this.cache.destroy();
  }

  // Nuke all the servers
  if ('server' in this) {
    this.server.close(callback);
  } else {
    process.nextTick(callback);
  }
};

/**
 * Creates a pre-configured clone of the current versions instance.
 *
 * @private
 */
Versions.prototype.clone = function clone() {
  var config = JSON.parse(JSON.stringify(this.config));

  return new Versions({ cloned: config });
};

/**
 * Lazy load the Client instance. This is done at `Versions#connect`
 *
 * @private
 */
Object.defineProperty(Versions, 'Client', {
  get: function get() {
    return require('./client');
  }
});

/**
 * Simple callback fall-back
 *
 * @private
 */
function noop() {}

module.exports = new Versions();
