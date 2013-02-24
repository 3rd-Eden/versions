'use strict';

var HashRing = require('hashring');

/**
 * A Versions client.
 *
 * @constructor
 * @param {Versions} versions Reference to the versions instance
 * @param {String} server Root server
 * @param {Object} options Options
 */
function Sync(versions, server, options) {
  options = options || {};

  var domains = this.get('aliases')
    , self = this;

  // Generate a list domains that are running our versions software. So we can
  // add these servers to our hashring directly
  if (!~domains.indexOf(server)) domains.push(server);

  this.server = server;
  this.destroyed = false;
  this.versions = versions;
  this.hashring = new HashRing(domains);
  this.interval = versions.parse(options.interval || '10 seconds');

  // Setup our syncing
  this.initialize();
}

/**
 * Proxy the Eventmitter#on method of the server so people can do:
 *
 *   var versions = require('versions').connect(server);
 *   versions.on('error', function error() { .. });
 *
 * And listen to events from the versions instance, like configuration changes
 * etc. Also proxy the logger so we don't need to setup our own logger.
 *
 * @type {Function}
 * @api public
 */
['on', 'logger'].forEach(function proxy(api) {
  Object.defineProperty(Sync.prototype, api, {
    get: function get() {
      return this.versions[api];
    }
  });
});

/**
 * Tag automatically spreads your resources across a different aliased servers
 * to increase parallel downloading of assets.
 *
 * @see http://www.yuiblog.com/blog/2007/04/11/performance-research-part-4/
 * @param {String} url URL for the version number.
 * @api public
 */
Sync.prototype.tag = function tag(url) {
  var server = this.hashring.get(url);

  return this.prefix(server) + url;
};

/**
 * Generate a prefix for a asset. This is the combination of server and
 * version number.
 *
 * @param {String} server Optional server name that it should use to prefix
 * @returns {String}
 * @api public
 */
Sync.prototype.prefix = function prefix(server) {
  server = server || this.server;

  return server +'/versions:'+ this.get('version');
};

/**
 * Simple wrapper around the configuration. By adding this wrapper we can easily
 * override one simple method of our client interface in order to support
 * fetching the configuration resources from a different server/origin.
 *
 * @param {String} config Name of the configuration key
 * @returns {Mixed}
 * @api private
 */
Sync.prototype.get = function get(config) {
  return this.versions.config.get(config);
};

/**
 * Same as above.
 *
 * @param {String} key
 * @param {Mixed} value
 * @api private
 */
Sync.prototype.set = function set(key, value) {
  return this.versions.config.set(key, value);
};

/**
 * Initialize the client.
 *
 * @api private
 */
Sync.prototype.initialize = function initialize() {
  var url = this.server + '/version'
    , self = this
    , request;

  // If we have authorization set, add the correct param so our request doesn't
  // fail like a mofo.
  if (this.get('auth')) url += '?auth='+ this.get('auth');

  /**
   * They see me pollin, they hatin.
   *
   * @api private
   */
  function theySeeMePolling() {
    request({
      uri: url,
      method: 'GET'
    }, function theyHatin(err, origin, body) {
      if (self.destroyed) return; // someone ended the connection

      if (err || origin.statusCode !== 200) {
        return self.polling = setTimeout(theySeeMePolling, self.interval);
      }

      // Parse the shit
      try { body = JSON.parse(body); }
      catch (e) {}

      if (body.version) self.set('version', body.version);
      self.polling = setTimeout(theySeeMePolling, self.interval);
    });
  }

  // Determin which kind of syncing we are using, are using our Redis backend or
  // just plain ol HTTP.
  if (this.verions.sync()) {
    // We need to fetch our configuration from redis and merge it with our own
    // to ensure that we have an up to date version number internally.
  } else if (!this.get('redis')) {
    request = this.request = this.request || require('request');
    theySeeMePolling();
  }
};

/**
 * Set's a new version number on the server.
 *
 * @param {String} number New version number
 * @param {Function} callback Continuation
 * @api public
 */
Sync.prototype.version = function version(number, callback) {
  callback = callback || noop;

  // If we are using redis, it will be pub/subbed over the connection
  this.set('version', number);
  if (this.get('redis')) return process.nextTick(callback);

  var url = this.server + '/version';

  // If we have authorization set, add the correct param so our request doesn't
  // fail like a mofo.
  if (this.get('auth')) url += '?auth='+ this.get('auth');

  // Lazy load the require library
  this.request = this.request || require('request');
  this.require('request')({
      uri: url
    , method: 'PUT'
    , json: { version: number }
  }, function requested(err, origin, body) {
    if (err || origin.statusCode !== 200) {
      return callback(err || new Error('Invalid Status Code returned'));
    }

    try { body = JSON.parse(body); }
    catch (e) { return callback(new Error('Failed to parse response')); }

    return callback(undefined, body);
  });
};

/**
 * Adds a new server alias
 *
 * @param {String} node Domain name
 * @api private
 */
Sync.prototype.alias = function alias(node) {
  this.hashring.add(node);
  return this;
};

/**
 * Destroy everything. Fire ze missles.
 *
 * @api private
 */
Sync.prototype.end = function end() {
  if (this.polling) clearTimeout(this.polling);

  this.versions.end();
  this.destroyed = true;
};

/**
 * Dummy backup function.
 *
 * @private
 */
function noop() {}
