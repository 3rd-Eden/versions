'use strict';

/**
 * Simple custom middleware layer loader.
 *
 * @private
 */
[
  { method: 'initialize', middleware: 'initialize' },
  { method: 'versioning', middleware: 'prefix' },
  { method: 'update', middleware: 'update' },
  { method: 'done', middleware: '404' }
].forEach(function generate(api) {
  var cached;
  exports[api.method] = function sugar(arg) {
    cached = cached || require('./'+ api.middleware);

    return arg ? cached(arg) : cached;
  };
});
