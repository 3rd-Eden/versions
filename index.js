'use strict';

var connect = require('connect')
  , path = require('path')
  , ms = require('ms');

/**
 * Our configuration object.
 *
 * @private
 */
var config = Object.create(null);

/**
 * Load in our own middlware layers.
 *
 * @type {Object}
 * @private
 */
var versions = require('./lib');

/**
 * Creates a connection with the specified versions server to fetch the current
 * version number of the app.
 *
 * @param {String} server The server that should connect to
 * @param {String} auth Optional authorization parameter
 */
exports.connect = function connect(server, auth) {
  return require('./client')(config, server, auth);
};

/**
 * Start the versions server.
 *
 * @param {Number} port The port number the server should listen on, or 8080
 * @param {Function} fn Optional callback argument for when the server started
 * @returns {Server}
 * @api public
 */
exports.listen = exports.start = function listen(port, fn) {
  // Parse down the configuration options
  config.port = port || config.port;
  config.root = config.root || path.dirname(module.parent.filename);
  config.maxAge = ms(config['max age']);

  return connect()
    .use(connect.responseTime())

    // Now that we have started our timing sequence, load all other middleware
    // layers should be configured so they are included in the timing.
    .use(versions.initialize(config))
    .use(versions.versioning())
    .use(versions.conditional())
    .use(connect.compress())
    .use(versions.memorize())
    .use(connect.static(path.resolve(config.root, config.directory), {
        maxAge: config.maxAge
    }))
    .use(versions.REST())
    .use(versions.pull())
    .use(versions.done())
  .listen(config.port, fn);
};

/**
 * Read in a configuration file and merge it with our internal configuration.
 *
 * @param {String} path
 * @returns {Versions}
 * @api public
 */
exports.read = function read(path) {
  var local = {};

  try { local = require(path); }
  catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      console.error('[versions] Failed to parse '+ path +':');
      console.error('[versions] - The file contains invalid JSON.');
    }

    return exports;
  }

  Object.keys(local).forEach(function merge(key) {
    config[key] = local[key];
  });

  return exports;
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
  exports[api.method] = function sugar(arg) {
    config[api.config] = arg;
    return exports;
  };
});

/**
 * Check if there's a dedicated `versions.json` configuration file in the folder
 * that depends on our module and load it as default configuration.
 *
 * @private
 */
exports.read('../../node_modules/package.json');    // For version number
exports.read('./versions.json');                    // For our defaults
exports.read('../../node_modules/versions.json');   // For their defaults
