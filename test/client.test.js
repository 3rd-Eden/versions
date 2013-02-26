/*global portnumbers, escape */
describe('versions.connect()', function () {
  'use strict';

  var chai = require('chai')
    , expect = chai.expect
    , server
    , api;

  chai.Assertion.includeStack = true;

  // Set up the default client interface.
  before(function () {
    var versions = require('../');
    server = versions.clone().listen(8080);
    api = versions.clone().connect('http://localhost:8080');
  });

  describe('construction', function () {
    it('should proxy some methods back to the versions instance', function () {
      [
          'get', 'set'
        , 'on', 'once', 'removeListener', 'removeAllListeners', 'emit'
      ].forEach(function (method) {
        expect(api[method]).to.be.a('function');
      });
    });

    it('proxies methods', function () {
      ['logger', 'request'].forEach(function (prop) {
        expect(api).to.have.property(prop);
      });
    });
  });

  describe('#get', function () {
    it('should fetch the values from the config', function () {
      expect(api.get('meh')).to.equal(undefined);
      expect(api.get('version')).to.equal('0.0.0');
    });
  });

  describe('#set', function () {
    it('can set a value', function () {
      api.set('foo', 'bar');
      expect(api.get('foo')).to.equal('bar');
    });
  });

  describe('#tag', function () {
    it('should select a server alias from the hash ring', function () {
      api.alias('http://lolcathost:8080').alias('http://127.0.0.1:8080');

      var distribution = {};

      for (var i = 0; i < 1000; i++) {
        var host = api.tag('/'+ (Math.random() * i) +'.css').split(':8080')[0];

        distribution[host] = distribution[host] ? distribution[host] + 1 : 1;
      }

      ['lolcathost', 'localhost', '127.0.0.1'].forEach(function (server) {
        expect(distribution['http://'+ server]).to.be.above(250);
      });
    });

    it('should should prefix the server', function () {
      var tag = api.tag('/css/base.css');

      expect(tag).to.equal('http://localhost:8080/versions:0.0.0/css/base.css');
    });
  });

  describe('#prefix', function () {
    it('should prefix with a given server', function () {
      expect(api.prefix('https://google.com')).to.equal('https://google.com/versions:0.0.0');
    });

    it('should prifix with the default server', function () {
      expect(api.prefix()).to.equal('http://localhost:8080/versions:0.0.0');
    });
  });

  after(function (done) {
    server.end();
    api.end(done);
  });
});
