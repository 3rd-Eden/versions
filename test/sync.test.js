/*global portnumbers, escape */
describe('versions.connect() & version() config sync', function () {
  'use strict';

  var chai = require('chai')
    , expect = chai.expect;

  chai.Assertion.includeStack = true;

  // The actual redis server config
  var redis = {
    host: 'localhost'
    , port: 6379
  };

  describe('redis', function () {
    var api, versions, port;

    before(function (done) {
      var v = require('../')
        , completed = 0;

      function ready() {
        if (++completed === 2) done();
      }

      port = portnumbers;
      versions = v.clone().set('redis', redis).set('sync', true).listen(port);
      api = v.clone().set('redis', redis).set('sync', true).connect('http://localhost:'+ port);

      versions.once('sync#ready', ready);
      api.once('sync#ready', ready);
    });

    after(function (done) {
      versions.end();
      api.end(done);
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
  });

  describe('redis server cluster', function () {
    var servers = {}
      , instances = 10
      , api, port;

    before(function (done) {
      var v = require('../')
        , completed = -1;

      function ready() {
        if (++completed === instances) done();
      }

      for (var i = 0; i < instances; i++) {
        port = portnumbers;
        servers[port] = v.clone().set('redis', redis).set('sync', true).listen(port);
        servers[port].once('sync#ready', ready);
      }

      api = v.clone().set('redis', redis).set('sync', true).connect('http://localhost:'+ port);
      api.once('sync#ready', ready);
    });

    after(function (done) {
      Object.keys(servers).forEach(function (port) {
        servers[port].end();
      });

      api.end(done);
    });

    it('receives the latest config when a node is added to the cluster');

    it('propagetes the version changes through the cluster', function (done) {
      var completed = 0;

      Object.keys(servers).forEach(function (port) {
        servers[port].once('sync:version', function (to) {
          expect(to).to.equal('1.2.3');

          if (++completed === instances) done();
        });
      });

      api.version('1.2.3');
    });
  });

  describe('http', function () {
    var api, versions, port;

    before(function () {
      var v = require('../');

      port = portnumbers;
      versions = v.clone().set('sync', true).listen(port);
      api = v.clone().set('sync', true).connect('http://localhost:'+ port, {
        interval: '500 ms'
      });
    });

    after(function (done) {
      versions.end();
      api.end(done);
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
  });
});
