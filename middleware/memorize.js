'use strict';

/**
 * memorize.js
 * Memorize the static file serving.
 */
module.exports = function update(req, res, next) {
  // Check if we need to handle this file from our internal memory cache
  if (
       req.url in req.versions  // Is cached internally
    && !req.headers.range       // Not a range request, as we send the whole buffer
  ) {
    var details = req.versions[req.url]
      , config = req.versions.config
      , data = details.data;

    res.setHeader('Expires', new Date(Date.now() + config.maxAge).toUTCString());
    res.setHeader('Cache-Control', 'max-age='+ config.maxAge +', public');
    res.setHeader('Last-Modified', details.lastModified);
    res.setHeader('Content-Type', details.contentType);
    res.setHeader('Content-Length', data.length);

    return res.end(data);
  }

  next();
};
