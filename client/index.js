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

  this.versions = versions;
  this.interval = versions.parse(options.interval || '10 seconds');
  this.server = server;
  this.destroyed = false;

  // Generate a list domains that are running our versions software. So we can
  // add these servers to our hashring directly
  var domains = this.get('aliases');

  if (!~domains.indexOf(server)) domains.push(server);

  this.hashring = new HashRing(domains);

  // Setup our syncing
  this.initialize();
}

/**
 * Proxy the Eventmitter#on method of the server so people can do:
 *
 *   var versions = require('versions').connect(server);
 *   versions.on('error', function error() { .. });
 *
 * Proxy the logger so we don't need to setup our own logger.
 *
 * Proxy the request library as it might be needed for syncing purposes if the
 * suggested Redis backend is not used.
 *
 * @type {Function}
 * @api public
 */
['logger', 'request'].forEach(function proxy(api) {
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
  return this.versions.get(config);
};

/**
 * Same as above.
 *
 * @param {String} key
 * @param {Mixed} value
 * @param {Boolean} emit
 * @api private
 */
Sync.prototype.set = function set(key, value, emit) {
  this.versions.set(key, value, emit);
  return this;
};

/**
 * Proxy the events from the Versions instance to the client.
 *
 * @api public
 */
Sync.prototype.on = function on() {
  this.versions.on.apply(this.versions, arguments);
  return this;
};

/**
 * Initialize the client.
 *
 * @api private
 */
Sync.prototype.initialize = function initialize() {
  var url = this.server + '/version'
    , request = this.request
    , self = this;

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
  if (!this.versions.sync()) {
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

  this.request({
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
 * Adds a new server alias.
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
 * @param {Function} callback
 * @api private
 */
Sync.prototype.end = function end(callback) {
  if (this.polling) clearTimeout(this.polling);
  this.destroyed = true;

  this.versions.end(callback);
};

/**
 * Dummy backup function.
 *
 * @private
 */
function noop() {}

module.exports = Sync;
