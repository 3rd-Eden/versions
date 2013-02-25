'use strict';

var portnumber = 1024;

/**
 * Automatic increasing test numbers.
 *
 * Example:
 *   var port = portnumbers
 *     , another = portnumbers;
 *
 *   console.log(port, portnumber); // 1025, 1026
 *
 * @api public
 */
if (!('portnumbers' in global)) Object.defineProperty(global, 'portnumbers', {
  get: function get() {
    return portnumber++;
  }
});

/**
 * Add a .request() method to the connect middleware to make it easier to test.
 */
require('./connect.request');
