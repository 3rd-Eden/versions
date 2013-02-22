'use strict';

var version = require('../package.json').version
  , Expire = require('expirable');

/**
 * initialize.js:
 *
 * Initialize a new versions request, prepare the request and clean it up before
 * we can use it. It does this by:
 *
 * - Adding and removing headers from the request.
 *
 * @param {Object} config configuration that was used for this request
 */
module.exports = function initialize(config) {
  /**
   * Generate our helper functions.
   *
   * @private
   */
  var helpers = require('./helpers')(config);

  return function versions(req, res, next) {
    res.setHeader('X-Powered-By', 'Versions/'+ version);
    res.setHeader('Vary', 'Accept-Encoding');

    // Enable CORS for the resources so WebGL Textures, Images and Fonts can be
    // loaded correctly. See https://developer.mozilla.org/En/HTTP_Access_Control
    res.setHeader('Access-Control-Allow-Origin', config.cors);
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Expose our persistent storage layer.
    req.versions = helpers;

    /**
     * Stringify JSON data and send it to the client.
     *
     * @param {Object} data JSON data
     * @api private
     */
    res.JSON = function stringify(data) {
      if (stringify.sent) return;

      // Write the JSON and mark as sent
      res.end(JSON.stringify(data, null, 2));
      stringify.sent = true;
    };

    req.versions.metrics.incr('requests');
    next();
  };
};
