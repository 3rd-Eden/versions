'use strict';

var url = require('url');

/**
 * routes.js
 * Handle HTTP routes for managing the cache.
 */
module.exports = function update(req, res, next) {
  req.uri = req.uri || url.parse(req.url);

  var versions = req.versions;

  switch (req.uri.pathname) {
    case '/flush':
      versions.cache.destroy().start();
      res.JSON({ flush: 'OK' });
      break;

    case '/inspect':
      res.JSON({ flush: 'OK' });
      break;

    default: next();
  }
};
