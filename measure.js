'use strict';

/**
 * Small helpr library for creating metrics.
 *
 * @param {Versions} versions Reference to versions
 * @api private
 */
exports.collect = function collect(versions) {
  var metrics = Object.create(null, {
    /**
     * Display the requests per second. The current implementation is wrong. And
     * it show shows the average amount of requests for the lifetime of the
     * server.
     */
    'requests per second': {
      get: function requests() {
        var seconds = ((Date.now() - start) / 1000).toFixed(0)
          , persec = (this.requests / seconds).toFixed(2);

        return persec + ' requests per second';
      },
      enumerable: true
    },

    /**
     * Displays the current size of our internal cache. It's bit flacky as it
     * doesn't include the headers and key of the cache. But it gives a clear
     * indication
     */
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
    },

    /**
     * Displays the memory usage of the current node process.
     *
     * @TODO format in to bytes
     */
    'memory': {
      get: function memory() {
        var mem = process.memoryUsage();

        return mem;
      },
      enumerable: true
    }
  });

  /**
   * Increase a metric. We can attach this directly to the metrics object as
   * JSON.stringify does not include functions.
   *
   * @param {String} counter Name of the counter that we need to increase
   * @param {Mixed} meta Meta data
   * @returns {Metrics}
   * @api public
   */
  metrics.incr = function incr(counter, meta) {
    if (counter in metrics) metrics[counter]++;
    else metrics[counter] = 1;

    versions.emit(counter, metrics[counter], meta);
    return metrics;
  };

  var start = Date.now();
  return metrics;
};
