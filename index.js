'use strict';

var connect = require('connect')
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
var versions = require('./middleware');

/**
 * Start the versions server.
 *
 * @param {Number} port The port number the server should listen on, or 8080
 * @param {Function} fn Optional callback argument for when the server started
 * @returns {Server}
 * @api public
 */
exports.listen = exports.start = function listen(port, fn) {
  port = port || 8080;

  return connect()
    .use(connect.responseTime())
    .use(versions.versioning())
    .use(connect.compress())
    .use(versions.headers())
    .use(connect.staticCache())
    .use(connect.static(config.directory, {
        maxAge: ms(config.maxAge)
    }))
    .use(versions.done())
  .listen(port, fn);
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
  catch (e) { return exports; }

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
  { method: 'cache', config: 'maxAge' }
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
exports.read('../../node_modules/versions.json');
