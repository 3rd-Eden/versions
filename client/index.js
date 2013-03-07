'use strict';

var HashRing = require('hashring')
  , path = require('path')
  , undefined;

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
  server = server || '';

  // Mark that we are now an API client
  versions.id += ':api';

  this.versions = versions;
  this.interval = versions.parse(options.interval || '10 seconds');
  this.server = server;
  this.destroyed = false;

  // Generate a list domains that are running our versions software. So we can
  // add these servers to our hashring directly
  var domains = this.get('aliases');

  if (!~domains.indexOf(server)) domains.push(server);

  this.hashring = new HashRing(domains);

  // Setup our syncing, if we have a server
  if (this.server) this.initialize();
}

/**
 * Generate proxy properties that we can re-use form our `versions` instance.
 * This saves us some extra configuration steps.
 *
 * @type {Function}
 * @api public
 */
['logger', 'request', 'semver'].forEach(function proxy(api) {
  Object.defineProperty(Sync.prototype, api, {
    get: function get() {
      return this.versions[api];
    }
  });
});

/**
 * Generate proxy methods for API's that we want to re-use from our `versions`
 * instance. These wrapped API's will return the proper `this` value by having
 * them point to Sync instead of Versions.
 *
 * @type {Function}
 * @api public
 */
[
    'get', 'set'
  , 'on', 'once', 'removeListener', 'removeAllListeners', 'emit'
].forEach(function each(api) {
  Sync.prototype[api] = function proxy() {
    var res = this.versions[api].apply(this.versions, arguments);
    return res === this.versions ? this : res;
  };
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
  if (!server) return url;

  // In IE7 - 8 a protocol relative stylesheet will cause a double download,
  // make sure that our server isn't relative by forcing HTTPS.
  if (server.charAt(0) === '/' && path.extname(url) === '.css') {
    server = 'https:'+ server;
  }

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

  // If we don't have a server, don't prefix it
  if (!server) return '';
  return server +'/versions:'+ this.get('version');
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

  // Check if we need to prefix the server
  if (url.charAt(0) === '/') url = 'https:'+ url;

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
        if (err) self.logger.error('HTTP sync request resulted in an error', err);
        else self.logger.error('Invalid statusCode (%s) returned', origin.statusCode);

        return self.polling = setTimeout(theySeeMePolling, self.interval);
      }

      // Parse the shit
      try { body = JSON.parse(body); }
      catch (e) {
        self.logger.error('Failed to parse the HTTP response', body);
      }

      if (body.version) {
        var prev = self.get('version');

        self.emit('sync:version', body.version, prev);
        self.set('version', body.version);
      }

      self.polling = setTimeout(theySeeMePolling, self.interval);
    });
  }

  // Determin which kind of syncing we are using, are using our Redis backend or
  // just plain ol HTTP.
  if (!this.versions.sync()) {
    this.logger.debug('They see me polling, they hatin');
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
  var self = this;

  callback = callback || function (err) {
    self.emit('stored:version', err);
  };

  if (!number) {
    number = this.get('version').split('.');
    number[number.length - 1] = ++number[number.length - 1];
    number = number.join('.');
  }

  // If we are using redis, it will be pub/subbed over the connection
  this.set('version', number);
  if (this.get('redis')) return this.once('stored:version', callback);

  var url = this.server + '/version';

  // If we have authorization set, add the correct param so our request doesn't
  // fail like a mofo.
  if (this.get('auth')) url += '?auth='+ this.get('auth');

  // Check if we need to prefix the server
  if (url.charAt(0) === '/') url = 'https:'+ url;

  this.request({
      uri: url
    , method: 'PUT'
    , json: { version: number }
  }, function requested(err, origin, body) {
    if (err || origin.statusCode !== 200) {
      return callback(err || new Error('Invalid Status Code returned'));
    }

    if ('object' !== typeof body) {
      try { body = JSON.parse(body); }
      catch (e) { return callback(new Error('Failed to parse response')); }
    }

    return callback(undefined, body.version);
  });

  return this;
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
