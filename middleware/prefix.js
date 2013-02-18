'use strict';

/**
 * Allow prefixing of the urls for caching busting or cache references. If the
 * url starts with `versions:` it will remove supplied path and stitches back
 * the correct url.
 */
module.exports = function prefix(req, res, next) {
  if (!/^\/versions/.test(req.url)) return next();

  var url = req.url.split('/');

  // Remove the matched versioning path from the url
  url.splice(1, 1);
  req.url = req.originalUrl = url.join('/');
};
