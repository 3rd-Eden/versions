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
    , url = req.url
    , self = this
    , id;

  // This isn't a valid file, so don't fetch it from the server.
  if (!this.allows('extension', req) || !urls.length) return next();

  // Check if this is a hinted origin pull as we might need to filter out
  // a couple:
  if (id = /^\/id\:([^\/]+?)\//gi.exec(req.url)) {
    req.urlchunks = req.urlchunks || req.url.split('/');
    req.urlchunks.splice(1,1);

    url = req.urlchunks.join('/');
    id = id[1];

    // Filter out the id's that don't match
    urls = urls.filter(function filter(origin) {
      return origin.id === id;
    });
  }

  // Construct the urls that will be hitting the origin servers
  urls = urls.map(function map(origin) {
    return origin.url + url;
  });

  this.metrics.incr('origin server pull', { req: req, res: res, urls: urls });
  this.async.failover(urls, function run(url, cb) {
    // FUUUUUUUUUUUUUUUU for utf-8 as default >_<, we need to set encoding to
    // null in order for request to spit out a Buffer instance a body
    request.get({ uri: url, encoding: null }, function fetch(err, origin) {
      if (err) return cb(err);

      if (origin.statusCode !== 200) {
        return cb(new Error('Invalid statusCode ('+ origin.statusCode +')'));
      }

      cb.apply(this, arguments);
    });
  }, function done(err, origin, body) {
    if (err) this.logger.debug('Failed to fetch %s it caused a %s', url, err.message);
    if (err || !origin) return next();

    var data = Object.create(null);

    // Setup our cached object and register the origin's response headers so we
    // proxy them correctly to the end user.
    data.buffer = body;
    data['last-modified'] = origin.headers['last-modified'];
    data['content-type'] = origin.headers['content-type'];

    // Compress the data and pass in the origin response so our compression
    // function can check if this resource needs to be compressed
    self.compress(data['content-type'], body, function compiling(err, compressed) {
      if (compressed && !err) data.compressed = compressed;

      res.setHeader('X-Cache', 'Pull');
      self.write(req, res, data);
      cache.set(req.versioned +'#'+ req.url, data);
    });
  });
};
