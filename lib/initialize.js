'use strict';

/**
 * initialize.js:
 *
 * Initialize a new versions request, prepare the request and clean it up before
 * we can use it. It does this by:
 *
 * - Adding and removing headers from the request.
 */
module.exports = function versions(req, res, next) {
  res.setHeader('X-Powered-By', 'Versions/'+ this.version);
  res.setHeader('Vary', 'Accept-Encoding');

  // Enable CORS for the resources so WebGL Textures, Images and Fonts can be
  // loaded correctly. See https://developer.mozilla.org/En/HTTP_Access_Control
  res.setHeader('Access-Control-Allow-Origin', this.get('cors'));
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  /**
   * Stringify JSON data and send it to the client.
   *
   * @param {Object} data JSON data
   * @api private
   */
  res.JSON = function stringify(data) {
    if (stringify.sent) return;

    // Write the JSON and mark as sent
    res.end(JSON.stringify(data, null, 2));
    stringify.sent = true;
  };

  this.metrics.incr('requests', { req: req, res: res });
  next();
};
