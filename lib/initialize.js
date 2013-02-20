'use strict';

var version = require('../package.json').version
  , Expire = require('expirable')
  , cookie = require('cookie');

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
   * Simple persistent storage layer that is used to store data, metrics and what
   * more.
   *
   * @private
   */
  var persistent = Object.create(null);

  persistent.metrics = Object.create(null);
  persistent.config = config;
  persistent.cache = new Expire(config.expire);
  persistent.write = write;

  return function versions(req, res, next) {
    res.setHeader('X-Powered-By', 'Versions/'+ version);
    res.setHeader('Vary', 'Accept-Encoding');

    // Enable CORS for the resources so WebGL Textures, Images and Fonts can be
    // loaded correctly. See https://developer.mozilla.org/En/HTTP_Access_Control
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Remove all that are set for this domain, we want to serve static files from
    // a cookie-less domain name, so we find them, we should remove them so future
    // requests do not send this extra/pointless data again.
    if (req.headers.cookie) {
      var cookies = cookie.parse(req.headers.cookie);

      res.setHeader('Set-Cookie', Object.keys(cookies).map(function nuke(key) {
        return cookie.serialize(key, 'x', {
          expires: new Date(1) // Thu, 01 Jan 1970 00:00:00 GMT
        });
      }).join('; '));
    }

    // Expose our persistent storage layer.
    req.versions = persistent;
    next();
  };
};

/**
 * @param {Response} res HTTP server response
 * @param {Object} data the stuff that we need to write
 * @param {Object} configuration
 * @api private
 */
function write(res, data, config) {
  var body = data.buffer;

  // @TODO gzip headers
  res.setHeader('Expires', new Date(Date.now() + config.maxAge).toUTCString());
  res.setHeader('Cache-Control', 'max-age='+ config.maxAge +', public');
  res.setHeader('Last-Modified', data.lastModified);
  res.setHeader('Content-Type', data.contentType);
  res.setHeader('Content-Length', body.length);

  res.end(body);
}
