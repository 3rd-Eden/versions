'use strict';

var version = require('../package.json').version;

/**
 * versions.js:
 * Add and remove headers from the responses.
 */
module.exports = function versions(req, res, next) {
  res.setHeader('X-Powered-By', 'Versions/'+ version);
  res.removeHeader('Cookie');

  next();
};
