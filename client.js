'use strict';

/**
 * Simple client API
 *
 * @param {Object} config Configuration that is internally by an app.
 * @param {Server} server Server url
 * @param {Object} options configuration
 * @returns {Object} a simple API
 */
module.exports = function client(config, server, options) {
  options = options || {};

  var provider = require('./client/http')(config, server, options);

  return {
    /**
     * Switch to a different version provider.
     *
     * @param {String} client Name of the client that we want to leverage.
     * @api public
     */
    using: function using(client) {
      provider.end();
      provider = require('./client/'+ client)(config, server, options);

      return this;
    },

    /**
     * Tag the given url with the correct version number.
     *
     * @param {String} url URL for the version number.
     * @api public
     */
    tag: function tag(url) {
      return this.prefix() + url;
    },

    /**
     * Generate a prefix for a asset. This is the combination of server and
     * version number.
     *
     * @returns {String}
     * @api public
     */
    prefix: function prefix() {
      return server +'/versions:'+ config.version;
    }
  };
};

// require('versions').connect(server).using('redis')
