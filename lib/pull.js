'use strict';

var request = require('request');

/**
 * pull.js
 *
 * Pull resources from the remote origin servers and cache them internally.
 */
module.exports = function pull(req, res, next) {
  var urls = this.get('origin servers')
    , cache = this.cache
    , self = this;

  // This isn't a valid file, so don't fetch it from the server.
  if (!this.allows('extension', req) || !urls.length) return next();

  urls = urls.map(function map(origin) {
    return origin.url + req.url;
  });

  this.metrics.incr('origin server pull');
  this.async.fastest(urls, function run(url, cb) {
    // FUUUUUUUUUUUUUUUU for utf-8 as default >_<, we need to set encoding to
    // null in order for request to spit out a Buffer instance a body
    request.get({ uri: url, encoding: null }, function fetch(err, origin) {
      if (err) return cb(err);
      if (origin.statusCode !== 200) return cb(new Error('Invalid statusCode'));

      cb.apply(this, arguments);
    });
  }, function done(err, origin, body) {
    if (err || !origin) return next();

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
