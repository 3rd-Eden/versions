'use strict';

/**
 * versioning.js:
 *
 * Allow prefixing of the urls for caching busting or cache references. If the
 * url starts with `versions:` it will remove supplied path and stitches back
 * the correct url.
 */
module.exports = function prefix(req, res, next) {
  req.versioned = ''; // Add a default value, so we don't end up with undefineds

  if (!/^\/versions\:/i.test(req.url)) return next();

  req.urlchunks = req.urlchunks|| req.url.split('/');

  // Remove the matched versioning path from the url and restore the url to the
  // correct path.
  req.versioned = req.urlchunks.splice(1, 1);
  req.url = req.originalUrl = req.urlchunks.join('/');

  this.metrics.incr('versioned', { req: req, res: res, version: req.versioned });
  next();
};
