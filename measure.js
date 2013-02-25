'use strict';

exports.collect = function collect(versions) {
  var metrics = Object.create(null, {
    'requests per second': {
      get: function requests() {
        var seconds = ((Date.now() - start) / 1000).toFixed(0)
          , persec = (this.requests / seconds).toFixed(2);

        return persec + ' requests per second';
      },
      enumerable: true
    },
    'cache size': {
      get: function cachesize() {
        var size = 0;

        versions.cache.forEach(function forEach(key, value) {
          if (value.buffer) size += value.buffer.length;
          if (value.gzip) size += value.gzip.length;
        });

        return (size / 1024).toFixed(2) +'kb';
      },
      enumerable: true
    }
  });

  /**
   * Increase a metric
   *
   * @param {String} counter Name of the counter that we need to increase
   * @returns {Metrics}
   * @api public
   */
  metrics.incr = function incr(counter) {
    if (counter in metrics) metrics[counter]++;
    else metrics[counter] = 1;

    return metrics;
  };

  var start = Date.now();
  return metrics;
};
