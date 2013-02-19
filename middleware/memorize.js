'use strict';

/**
 * memorize.js
 * Memorize the static file serving.
 */
module.exports = function update(req, res, next) {
  var versions = req.versions
    , cache = versions.cache;

  // Check if we need to handle this file from our internal memory cache
  if (
       cache.has(req.url)       // Is the request cached internally
    && !req.headers.range       // Not a range request, as we send the whole buffer
  ) {
    var data = cache.get(req.url)
      , config = versions.config;

    // We are probably still bufering this request, bail out
    if (!data) return next();
    return versions.write(res, data, config);
  }

  next();
};
