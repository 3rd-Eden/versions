'use strict';

var url = require('url')
  , ms = require('ms');

/**
 * routes.js
 * Handle HTTP routes for managing the cache.
 */
module.exports = function update(req, res, next) {
  req.uri = req.uri || url.parse(req.url, true);

  var versions = req.versions;

  switch (req.uri.pathname) {
    case '/flush':
      versions.cache.destroy().start();
      res.JSON({ flush: 'OK' });
      break;

    case '/inspect':
      versions.cache.forEach(function (key, value, expires) {
        if (req.uri.query && ~key.indexOf(req.uri.query.key)) res.JSON({
          "key": key,
          "data": {
            "Content-Length": value.buffer.length,
            "Content-Length GZIP": value.gzip.length,
            "Content-Type": value.contentType,
            "Last-Modified": value.lastModified
          }
        });
      });

      res.JSON({ inspect: 'Failed to find the requested key file in cache' });
      break;

    default: next();
  }
};
