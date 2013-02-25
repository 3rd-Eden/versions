'use strict';

/**
 * debug.js
 *
 * A small debug middleware that we use for unit testing and debugging issues in
 * our middleware stack
 */
module.exports = function debug(args) {
  this.emit('debug:initialize', args);

  return function debugging(req, res, next) {
    this.logger.debug('request: %s', req.url);

    this.emit('debug:request', req, res);
    next();
  };
};
