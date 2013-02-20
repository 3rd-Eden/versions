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

  request(config['origin-pull'].home + req.url, function requested(err, origin, body) {
    if (err) return next();

    var data = Object.create(null);

    // Setup our cached object
    data.buffer = body;
    data.lastModified = origin.headers['last-modified'];
    data.contentType = origin.headers['content-type'];

    // @TODO gzip
    versions.write(res, data, config);
    cache.set(req.url, data);
  });
};
