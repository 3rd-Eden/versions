module.exports = function helpers(config) {
  'use strict';

  var Expire = require('expirable')
    , path = require('path')
    , zlib = require('zlib')

  var exports = Object.create(null)
    , start = Date.now();

  /**
   * Expose a cache.
   *
   * @private
   */
  exports.cache = new Expire(config['expire internal cache']);

  /**
   * Expose the configuration.
   *
   * @private
   */
  exports.config = config;

  /**
   * Setup our metrics system, we want to know how our static cache is
   * performing.
   *
   * @private
   */
  exports.metrics = Object.create(null, {
    'request per sec': {
      get: function requests() {
        var seconds = ((Date.now() - start) / 1000).toFixed(0)
          , persec = (this.requests / seconds).toFixed(2);

        return persec + ' requests per second';
      },
      enumerable: true
    },
    'cache size': {
      get: function cachesize() {
        var size = 0;

        exports.cache.forEach(function forEach(key, value) {
          if (value.buffer) size += value.buffer.length;
          if (value.gzip) size += value.gzip.length;
        });

        return (size / 1024).toFixed(2) +'kb';
      },
      enumerable: true
    }
  });

  /**
   * Increase a metric
   *
   * @param {String} counter Name of the counter that we need to increase
   */
  exports.metrics.incr = function incr(counter) {
    if (counter in exports.metrics) exports.metrics[counter]++;
    else exports.metrics[counter] = 1;

    return exports;
  };

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
      && !~config.blacklist.indexOf(req.extension);
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
