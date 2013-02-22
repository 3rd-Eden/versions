module.exports = function helpers(config) {
  'use strict';

  var Expire = require('expirable')
    , path = require('path')
    , zlib = require('zlib');

  var exports = Object.create(null)
    , start = Date.now();

  /**
   * Writes a cached response.
   *
   * @param {Request} req HTTP server request
   * @param {Response} res HTTP server response
   * @param {Object} data the stuff that we need to write
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

    return exports;
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
   * Checks if we are allowed to fetch these files from an origin server.
   *
   * @param {Request} req
   * @returns {Boolean}
   * @api private
   */
  exports.allowed = function allowed(req) {
    req.extension = req.extension || path.extname(req.url);

    // Don't accept queries without file extensions.
    return req.extension !== ''
      // Ignore blacklisted extensions
      && !~config['blacklisted extensions'].indexOf(req.extension);
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
      process.nextTick(callback);
      return exports;
    }

    zlib.gzip(data, callback);
    return exports;
  };

  return exports;
};
