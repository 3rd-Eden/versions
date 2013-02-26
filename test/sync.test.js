/*global portnumbers, escape */
describe('versions.connect() & version() config sync', function () {
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

    it('propagates the version change from the server to the client', function (done) {
      api.once('sync:version', function (to) {
        expect(to).to.equal('3.3.3');
        done();
      });

      versions.set('version', '3.3.3');
    });

    it('propagates the version change from the client to the server', function (done) {
      versions.once('sync:version', function (to) {
        expect(to).to.equal('2.2.2');
        done();
      });

      api.version('2.2.2');
    });

    after(function () {
      versions.end();
      api.end();
    });
  });

  describe('http', function () {
    var v = require('../')
      , versions = v.clone()
      , port = portnumbers;

    // Setup our Redis credentials
    versions.set('sync', true).listen(port);

    // Connect the client with the server
    var api = v.clone().set('sync', true).connect('http://localhost:'+ port, {
      interval: '1 second'
    });

    it('propagates the version change from the server to the client', function (done) {
      api.once('sync:version', function (to) {
        expect(to).to.equal('3.3.3');
        done();
      });

      versions.set('version', '3.3.3');
    });

    it('propagates the version change from the client to the server', function (done) {
      versions.once('sync:version', function (to) {
        expect(to).to.equal('2.2.2');
        done();
      });

      api.version('2.2.2');
    });

    after(function () {
      versions.end();
      api.end();
    });
  });
});
