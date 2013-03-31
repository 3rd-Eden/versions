'use strict';

var url = require('url')
  , parser;

module.exports = function router(req, res, next) {
  req.uri = req.uri || url.parse(req.url, true);

  var query = req.uri.query
    , self = this;

  // Check if the user is authorized to use the routes, we added this protection
  // layer as it can be used to completely flush our internal cache and inspect
  // what kind of information is being served from the server.
  if (
      !(req.uri.pathname in routes)
    || (this.get('auth') && !(query && query.auth && this.get('auth') === query.auth))
  ) {
    return next();
  }

  parser = parser || this.connectjs.json();
  parser(req, res, function parsed(err) {
    if (err) return res.JSON({ error: err.message });

    routes[req.uri.pathname].call(self, req, res, next);
  });
};

/**
 * Our actual routes.
 *
 * @type {Object}
 * @api private
 */
var routes = {
  /**
   * Flushes the internal cache.
   */
  '/flush': function flush(req, res, next) {
    this.cache.destroy().start();
    this.metrics.incr('flush', { req: req, res: res });

    res.JSON({ flush: 'OK' });
  },

  /**
   * Expire a specific item in the cache, specified by ?key=<keyname>
   */
  '/expire': function expire(req, res, next) {
    var query = req.uri.query
      , cache = this.cache
      , matches = 0;

    cache.forEach(function each(key) {
      if(query && ~key.indexOf(query.key)) {
        cache.remove(key);
        matches++;
      }
    });

    this.metrics.incr('expire', { req: req, res: res });
    res.JSON({ expire: 'OK', expired: matches });
  },

  /**
   * Inspects an item in the cache, use ?key=<keyname> to inspect the cache
   * item.
   */
  '/inspect': function inspect(req, res, next) {
    var query = req.uri.query;

    this.cache.forEach(function (key, value, expires) {
      if (query && ~key.indexOf(query.key)) res.JSON({
        "key": key,
        "data": {
          "Content-Length": value.buffer.length,
          "Content-Length GZIP": (value.gzip ? value.gzip.length : 0),
          "Content-Type": value['content-type'],
          "Last-Modified": value['last-modified']
        }
      });
    });

    this.metrics.incr('inspect', { req: req, res: res });
    res.JSON({ inspect: 'Failed to find the requested key file in cache' });
  },

  /**
   * Lists all keys that are stored in memory.
   */
  '/keys': function keys(req, res, next) {
    this.metrics.incr('keys', { req: req, res: res });
    res.JSON({ keys: Object.keys(this.cache.cache) });
  },

  /**
   * Outputs the current version.
   */
  '/version': function version(req, res, next) {
    var body = req.body;

    if (req.method === 'GET') return res.JSON({ version: this.get('version') });
    if (!body || !('version' in body)) return res.JSON({ error: 'Invalid body' });

    this.emit('sync:version', body.version, this.get('version'));
    this.set('version', body.version);

    res.JSON({ version: body.version });
  },

  /**
   * Outputs the current configuration.
   */
  '/sync': function config(req, res, next) {
    var body = req.body
      , synced = [];

    if (req.method === 'GET') return res.JSON(this.config);
    if (!this.get('sync')) return res.JSON({ error: 'Sync disabled on this server' });

    if (typeof body !== 'object' || Array.isArray(body)) {
      return res.JSON({ error: 'Invalid body' });
    }

    // Start merging in the data with our configuration details.
    Object.keys(body).forEach(function each(key) {
      var prev = this.get(key);

      // Don't set unknown values
      if (!prev) return;

      this.emit('sync:'+ key, body[key], prev);
      this.set(key, body[key]);

      synced.push(key);
    }, this);

    res.JSON({ synced: synced });
  },

  /**
   * Outputs the server stats.
   */
  '/metrics': function metrics(req, res, next) {
    this.metrics.incr('metrics', { req: req, res: res });
    res.JSON(this.metrics);
  }
};
