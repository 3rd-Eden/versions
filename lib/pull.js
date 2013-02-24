'use strict';

var request = require('request');

/**
 * pull.js
 *
 * Pull resources from the remote origin servers and cache them internally.
 */
module.exports = function pull(req, res, next) {
  var cache = this.cache
    , self = this;

  // This isn't a valid file, so don't fetch it from the server.
  if (!this.allowed(req)) return next();

  this.metrics.incr('origin server pull');
  request.get({
    uri: this.get('origin servers')[0].url + req.url,
    encoding: null // FUUUUUUUUUUUUUUUU for utf-8 as default >_<
  }, function requested(err, origin, body) {
    if (err || origin.statusCode !== 200) return next();

    var data = Object.create(null);

    // Setup our cached object and register the origin's response headers so we
    // proxy them correctly to the end user.
    data.buffer = body;
    data.lastModified = origin.headers['last-modified'];
    data.contentType = origin.headers['content-type'];

    // Compress the data and pass in the origin response so our compression
    // function can check if this resource needs to be compressed
    self.compress(data.contentType, body, function compiling(err, compressed) {
      if (compressed && !err) data.gzip = compressed;

      res.setHeader('X-Cache', 'Pull');
      self.write(req, res, data);
      cache.set(req.versioned +'#'+ req.url, data);
    });
  });
};
