'use strict';

var version = require('../package.json').version
  , response = new Buffer('/* 404: File Not Found. Served by: Versions/'+ version +' */');

/**
 * 404.js:
 *
 * The file was found on our server, 404 that mofo.
 */
module.exports = function fourofour(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');

  this.metrics.incr('404', { req: req, res: res });
  res.end(response);
};
