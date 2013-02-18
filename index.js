'use strict';

var connect = require('connect')
  , ms = require('ms');

// Read our configuration.
var config = {};

// Check if there's a `versions.json` file in the directory that required this
// module. This makes configuration a lot easier.
try { config = require('../../node_modules/versions.json'); }
catch (e) {}

/**
 * Start the versions server.
 *
 * @param {Number} port The port number the server should listen on, or 8080
 * @param {Function} fn Optional callback argument for when the server started
 * @api public
 */
exports.listen = exports.start = function listen(port, fn) {
  port = port || 8080;

  return connect()
    .use(connect.responseTime())
    .use(connect.compress())
    .use(require('./middleware/headers'))
    .use(connect.staticCache())
    .use(connect.static(config.directory, { maxAge: ms(config.maxAge) }))
    .use(require('./middleware/404.js'))
  .listen(port, fn);
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
