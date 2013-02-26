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
  '/flush': function flush(req, res, next) {
    this.cache.destroy().start();
    this.metrics.incr('flush');

    res.JSON({ flush: 'OK' });
  },

  '/inspect': function inspect(req, res, next) {
    var query = req.uri.query;

    this.cache.forEach(function (key, value, expires) {
      if (query && ~key.indexOf(query.key)) res.JSON({
        "key": key,
        "data": {
          "Content-Length": value.buffer.length,
          "Content-Length GZIP": (value.gzip ? value.gzip.length : 0),
          "Content-Type": value.contentType,
          "Last-Modified": value.lastModified
        }
      });
    });

    this.metrics.incr('inspect');
    res.JSON({ inspect: 'Failed to find the requested key file in cache' });
  },

  '/keys': function keys(req, res, next) {
    this.metrics.incr('keys');
    res.JSON({ keys: Object.keys(this.cache.cache) });
  },

  '/version': function version(req, res, next) {
    var body = req.body;

    if (req.method === 'GET') return res.JSON({ version: this.get('version') });
    if (!body || !('version' in body)) return res.JSON({ error: 'Invalid body' });

    this.emit('sync:version', body.version, this.get('version'));
    this.set('version', body.version);
  },

  '/config': function config(req, res, next) {
    res.JSON(this.config);
  },

  '/metrics': function metrics(req, res, next) {
    this.metrics.incr('metrics');
    res.JSON(this.metrics);
  }
};
