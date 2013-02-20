module.exports = function helpers(config) {
  'use strict';

  var Expire = require('expirable')
    , zlib = require('zlib');

  var exports = Object.create(null);

  /**
   * Expose a cache.
   *
   * @private
   */
  exports.cache = new Expire(config.expire);

  /**
   * Expose the configuration.
   *
   * @private
   */
  exports.config = config;

  /**
   * Writes a cached response.
   *
   * @param {Request} req HTTP server request
   * @param {Response} res HTTP server response
   * @param {Object} data the stuff that we need to write
   * @param {Object} configuration
   * @api private
   */
  exports.write = function write(req, res, data) {
    var body = data.buffer;

    // Check if we have a gzip version of the content
    if (exports.gzip(req, res) && 'gzip' in data) {
      res.setHeader('Content-Encoding', 'gzip');
      body = data.gzip;
    }

    res.setHeader('Expires', new Date(Date.now() + config.maxAge).toUTCString());
    res.setHeader('Cache-Control', 'max-age='+ config.maxAge +', public');
    res.setHeader('Last-Modified', data.lastModified);
    res.setHeader('Content-Type', data.contentType);
    res.setHeader('Content-Length', body.length);

    res.end(body);
  };

  /**
   * See if the client supports gzip.
   *
   * @param {Request} req HTTP server request
   * @returns {Boolean}
   * @api private
   */
  exports.gzip = function gzip(req, res) {
    var accept = (req.headers['accept-encoding'] || '').toLowerCase();

    return !!~accept.indexOf('gzip');
  };

  /**
   * Compress the contents.
   *
   * @param {String} type Content-Type
   * @param {Mixed} data content that needs to be compressed
   * @param {Function} callback
   * @api private
   */
  exports.compress = function compress(type, data, callback) {
    // Only these types of content should be gzipped.
    if (!/json|text|javascript/.test(type || '')) {
      return callback();
    }

    zlib.gzip(data, callback);
  };

  return exports;
};
