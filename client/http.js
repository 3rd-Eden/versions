'use strict';

var Expirable = require('expirable')
  , request = require('request');

module.exports = function (config, server, options) {
  var url = server + '/version'
    , timeout;

  // If we have authorization set, add the correct param so our request doesn't
  // fail like a mofo.
  if ('auth' in options) url += '?auth='+ options.auth;

  /**
   * Start fetching a new version from the server. It does this by polling the
   * server every 5 minutes to see if the version file is updated.
   *
   * @api private
   */
  function fetch() {
    request.get({
      uri: url
    }, function (err, origin, body) {
      if (err || origin.statusCode !== 200) return timeout = setTimeout(fetch, 10000);
    });
  }

  // Start with a fetch
  fetch();

  return {
    fetch: fetch,
    end: function end() {
      clearTimeout(timeout);
    }
  };
};
