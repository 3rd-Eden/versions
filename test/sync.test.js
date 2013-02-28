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

  after(function (done) {
    var client = require('redis').createClient(redis.port, redis.host);
    client.flushall(function () {
      client.end();
      done();
    });
  });

  describe('redis', function () {
    var api, versions, port;
    this.timeout(10000);

    before(function (done) {
      var v = require('../')
        , completed = 0;

      function ready() {
        if (++completed === 2) done();
      }

      port = portnumbers;
      versions = v.clone().set('redis', redis).set('sync', true).listen(port);
      api = v.clone()
        .set('redis', redis)
        .set('sync', true)
        .connect('http://localhost:'+ port);

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
        expect(api.get('version')).to.equal(to);

        done();
      });

      versions.set('version', '3.3.3');
    });

    it('propagates the version change from the client to the server', function (done) {
      versions.once('sync:version', function (to) {
        expect(to).to.equal('2.2.2');
        expect(versions.get('version')).to.equal(to);

        done();
      });

      api.version('2.2.2');
    });
  });

  describe('server cluster (redis)', function () {
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

      api = v.clone()
        .set('redis', redis)
        .set('sync', true)
        .connect('http://localhost:'+ port);

      api.once('sync#ready', ready);
    });

    after(function (done) {
      Object.keys(servers).forEach(function (port) {
        servers[port].end();
      });

      api.end(done);
    });

    it('propagetes the version changes through the cluster', function (done) {
      var completed = 0;

      Object.keys(servers).forEach(function (port) {
        servers[port].once('sync:version', function (to) {
          expect(to).to.equal('1.2.3');
          expect(servers[port].get('version')).to.equal(to);

          if (++completed === instances) {
            Object.keys(servers).forEach(function (p) {
              var version = servers[p].get('version');

              expect(version).to.equal('1.2.3');
            });

            done();
          }
        });
      });

      api.version('1.2.3');
    });

    it('receives the latest config when a node is added to the cluster', function (done) {
      this.timeout(10000);

      // Give it some time to fully propagate all the changes
      setTimeout(function() {
        // current version number of the cluster.
        var version = servers[port].get('version');
        expect(version).to.equal('1.2.3');

        // Add a new Node.
        var node = require('../').clone()
          .set('version', '9.2.4')
          .set('redis', redis).set('sync', true)
          .listen(portnumbers);

        expect(node.get('version')).to.not.equal(version);

        node.once('sync#version', function (to) {
          expect(to).to.equal(version);

          node.end();
          done();
        });
      }, 5000);
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
