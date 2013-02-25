/*global portnumbers, escape */
describe.only('versions.connect() & version() config sync', function () {
  'use strict';

  var chai = require('chai')
    , expect = chai.expect;

  chai.Assertion.includeStack = true;

  describe('redis', function () {
    var v = require('../')
      , versions = v.clone()
      , port = portnumbers
      , redis = {
            host: 'localhost'
          , port: 6379
        };

    // Setup our Redis credentials
    versions
      .set('redis', redis)
      .set('sync', true)
      .listen(port);

    // Connect the client with the server
    var api = v.clone()
      .set('redis', redis)
      .set('sync', true)
      .connect('http://localhost:'+ port);

    it('propagates the version change from the client to the server', function (done) {
      api.on('sync:version', function (to) {
        expect(to).to.equal('3.3.3');
        done();
      });

      versions.set('version', '3.3.3');
    });

    it('propagates the version change from the client to the server', function (done) {
      versions.on('sync:version', function (to) {
        expect(to).to.equal('2.2.2');
        done();
      });

      api.set('version', '2.2.2');
    });

    after(function () {
      versions.end();
    });
  });
});
