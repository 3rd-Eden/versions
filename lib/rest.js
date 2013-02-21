'use strict';

var url = require('url')
  , ms = require('ms');

/**
 * routes.js
 * Handle HTTP routes for managing the cache.
 */
module.exports = function update(req, res, next) {
  req.uri = req.uri || url.parse(req.url, true);

  var versions = req.versions
    , config = versions.config
    , query = req.uri.query;

  // Check if the user is authorized to use the routes, we added this protection
  // layer as it can be used to completely flush our internal cache and inspect
  // what kind of information is being served from the server.
  if (query && query.auth && config.auth !== query.auth) return next();

  switch (req.uri.pathname) {
    case '/flush':
      versions.cache.destroy().start();
      versions.metrics.incr('flush');
      res.JSON({ flush: 'OK' });
      break;

    case '/inspect':
      versions.cache.forEach(function (key, value, expires) {
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

      versions.metrics.incr('inspect');
      res.JSON({ inspect: 'Failed to find the requested key file in cache' });
      break;

    case '/keys':
      versions.metrics.incr('keys');
      res.JSON({ keys: Object.keys(versions.cache.cache) });
      break;

    case '/metrics':
      versions.metrics.incr('metrics');
      res.JSON(versions.metrics);
      break;

    case '/version':
      res.JSON(config.version);
      break;

    default: next();
  }
};
