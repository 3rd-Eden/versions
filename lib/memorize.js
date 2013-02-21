'use strict';

/**
 * memorize.js
 * Memorize the static file serving.
 */
module.exports = function update(req, res, next) {
  var key = req.versioned +'#'+ req.url
    , versions = req.versions
    , cache = versions.cache;

  // Check if we need to handle this file from our internal memory cache
  if (
       cache.has(key)           // Is the request cached internally
    && !req.headers.range       // Not a range request, as we send the whole buffer
  ) {
    var data = cache.get(key, true);

    // We are probably still bufering this request, bail out
    if (!data) return next();

    res.setHeader('X-Cache', 'HIT');
    versions.metrics.incr('cache hit');
    return versions.write(req, res, data);
  }

  next();
};
