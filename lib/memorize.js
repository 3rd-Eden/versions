'use strict';

/**
 * memorize.js
 *
 * Memorize the static file serving.
 */
module.exports = function update(req, res, next) {
  var key = req.versioned +'#'+ req.url;

  // Check if we need to handle this file from our internal memory cache
  if (
       this.cache.has(key)      // Is the request cached internally
    && !req.headers.range       // Not a range request, as we send the whole buffer
  ) {
    var data = this.cache.get(key, true);

    // We are probably still bufering this request, bail out
    if (!data) return next();

    res.setHeader('X-Cache', 'HIT');
    this.metrics.incr('cache hit', { req: req, res: res, cache: data });
    return this.write(req, res, data);
  }

  next();
};
