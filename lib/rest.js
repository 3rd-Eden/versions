'use strict';

var url = require('url')
  , ms = require('ms');

/**
 * routes.js
 * Handle HTTP routes for managing the cache.
 */
module.exports = function update(req, res, next) {
  req.uri = req.uri || url.parse(req.url, true);

  var query = req.uri.query;

  // Check if the user is authorized to use the routes, we added this protection
  // layer as it can be used to completely flush our internal cache and inspect
  // what kind of information is being served from the server.
  if (query && query.auth && this.get('auth') !== query.auth) return next();

  switch (req.uri.pathname) {
    case '/flush':
      this.cache.destroy().start();
      this.metrics.incr('flush');
      res.JSON({ flush: 'OK' });
      break;

    case '/inspect':
      this.cache.forEach(function (key, value, expires) {
        if (query && ~key.indexOf(query.key)) res.JSON({
          "key": key,
          "data": {
            "Content-Length": value.buffer.length,
            "Content-Length GZIP": value.gzip.length,
            "Content-Type": value.contentType,
            "Last-Modified": value.lastModified
          }
        });
      });

      this.metrics.incr('inspect');
      res.JSON({ inspect: 'Failed to find the requested key file in cache' });
      break;

    case '/keys':
      this.metrics.incr('keys');
      res.JSON({ keys: Object.keys(this.cache.cache) });
      break;

    case '/metrics':
      this.metrics.incr('metrics');
      res.JSON(this.metrics);
      break;

    case '/version':
      res.JSON(this.get('version'));
      break;

    default: next();
  }
};
