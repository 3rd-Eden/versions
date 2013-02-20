'use strict';

var request = require('request');

/**
 * pull.js
 *
 * Pull resources from the remote origin servers and cache them internally.
 */
module.exports = function pull(req, res, next) {
  var versions = req.versions
    , config = versions.config
    , cache = versions.cache;

  request.get({
    uri: config['origin servers'][0].url + req.url,
    encoding: null // FUUUUUUUUUUUUUUUU for utf-8 as default >_<
  }, function requested(err, origin, body) {
    if (err) return next();

    var data = Object.create(null);

    // Setup our cached object and register the origin's response headers so we
    // proxy them correctly to the end user.
    data.buffer = body;
    data.lastModified = origin.headers['last-modified'];
    data.contentType = origin.headers['content-type'];

    // Compress the data and pass in the origin response so our compression
    // function can check if this resource needs to be compressed
    versions.compress(data.contentType, body, function compiling(err, compressed) {
      if (compressed && !err) data.gzip = compressed;

      res.setHeader('X-Cache', 'Pull');
      versions.write(req, res, data);
      cache.set(req.versioned +'#'+ req.url, data);
    });
  });
};
