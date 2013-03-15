'use strict';

/**
 * conditional.js
 *
 * Handle conditional GET requests without any server overhead.
 */
module.exports = function conditional(req, res, next) {
  if (this.allows('304', req)) {
    res.setHeader('Expires', new Date(Date.now() + this.get('max age')).toUTCString());
    res.setHeader('X-Cache', '304');
    res.statusCode = 304;

    // Not needed for 304 requests, it only adds pointless overhead
    res.removeHeader('Vary');
    this.metrics.incr('304', { req: req, res: res });
    return res.end();
  }

  next();
};
