'use strict';

/**
 * Simple custom middleware layer loader.
 *
 * @private
 */
[
  'done',
  'conditional',
  'initialize',
  'memorize',
  'update',
  'versioning'
].forEach(function generate(api) {
  var cached;

  exports[api] = function sugar(arg) {
    cached = cached || require('./'+ api);

    return arg ? cached(arg) : cached;
  };
});
