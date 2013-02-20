'use strict';

/**
 * conditional.js
 * Handle conditional GET requests without any server overhead.
 */
module.exports = function conditional(req, res, next) {
  if (
       req.method === 'GET'
    && req.headers['if-none-match']
    || req.headers['if-modified-since']
  ) {
    res.setHeader('Expires', new Date(Date.now() + req.versions.config.maxAge).toUTCString());
    res.statusCode = 304;

    // Not needed for 304 requests, it only adds pointless overhead
    res.removeHeader('Vary');
    return res.end();
  }

  next();
};
