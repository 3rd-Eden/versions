'use strict';

/**
 * Simple custom middleware layer loader.
 *
 * @private
 */
[
  { method: 'versioning', middleware: 'prefix' },
  { method: 'headers', middleware: 'headers' },
  { method: 'done', middleware: '404' }
].forEach(function generate(api) {
  var cached;
  exports[api.method] = function sugar() {
    return cached || (cached = require('./'+ api.middleware));
  };
});
