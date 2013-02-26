'use strict';

function noop() {}

/**
 * Return the fastest result, ignoring errors.
 *
 * @param {Array} collection
 * @param {Function} iterator
 * @param {Mixed} context
 * @param {Function} callback
 * @api public
 */
exports.fastest = function fastest(collection, iterator) {
  var callback, context, failure
    , length = collection.length
    , completed = 0;

  if (arguments.length === 4) {
    context = arguments[2];
    callback = arguments[3];
  } else {
    callback = arguments[2];
  }

  callback = callback || noop;

  collection.forEach(function forEach(item) {
    iterator.call(context, item, function iterating(err) {
      if (!err) {
        callback.apply(context, arguments);
        callback = noop;
      }

      if (++completed === length) {
        callback.call(context);
      }
    });
  });
};

/**
 * Keep iterating over the array in series until we find a response without an
 * error.
 *
 * @param {Array} collection
 * @param {Function} iterator
 * @param {Mixed} context
 * @param {Function} callback
 * @api public
 */
exports.failover = function failover(collection, iterator, complete) {
  var callback, context, failure
    , length = collection.length
    , completed = 0;

  if (arguments.length === 4) {
    context = arguments[2];
    callback = arguments[3];
  } else {
    callback = arguments[2];
  }

  callback = callback || noop;

  (function series() {
    if (!collection.length) return callback.call(context);

    iterator.call(context, collection.shift(), function iterator(err) {
      if (!err) return callback.apply(context, arguments);

      process.nextTick(series);
    });
  })();
};
