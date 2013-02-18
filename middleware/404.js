'use strict';

var version = require('../package.json').version;

/**
 * 404.js:
 * The file was found on our server, 404 that mofo.
 */
module.exports = function fourofour(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('/* 404: File Not Found. Served by: Versions/'+ version +' */');
};
