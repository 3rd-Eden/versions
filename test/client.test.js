/*global portnumbers, escape */
describe('versions.connect()', function () {
  'use strict';

  var chai = require('chai')
    , expect = chai.expect;

  chai.Assertion.includeStack = true;

  describe('construction', function () {
    var server , port = portnumbers, api;

    before(function () {
      var versions = require('../');
      server = versions.clone().listen(port);
      api = versions.clone().connect('http://localhost:'+ port);
    });

    after(function (done) {
      server.end();
      api.end(done);
    });

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
    var server , port = portnumbers, api;

    before(function () {
      var versions = require('../');
      server = versions.clone().listen(port);
      api = versions.clone().connect('http://localhost:'+ port);
    });

    after(function (done) {
      server.end();
      api.end(done);
    });

    it('should fetch the values from the config', function () {
      expect(api.get('meh')).to.equal(undefined);
      expect(api.get('version')).to.equal('0.0.0');
    });
  });

  describe('#set', function () {
    var server , port = portnumbers, api;

    before(function () {
      var versions = require('../');
      server = versions.clone().listen(port);
      api = versions.clone().connect('http://localhost:'+ port);
    });

    after(function (done) {
      server.end();
      api.end(done);
    });

    it('can set a value', function () {
      api.set('foo', 'bar');
      expect(api.get('foo')).to.equal('bar');
    });
  });

  describe('#tag', function () {
    var server, port, api;

    before(function () {
      var versions = require('../');
      port = 7331;
      server = versions.clone().listen(port);
      api = versions.clone().connect('http://localhost:'+ port);
    });

    after(function (done) {
      server.end();
      api.end(done);
    });

    it('should select a server alias from the hash ring', function () {
      api.alias('http://lolcathost:'+ port).alias('http://127.0.0.1:'+ port);

      var distribution = {};

      for (var i = 0; i < 1000; i++) {
        var host = api.tag('/'+ (Math.random() * i) +'.css').split(':'+ port)[0];

        distribution[host] = distribution[host] ? distribution[host] + 1 : 1;
      }

      ['lolcathost', 'localhost', '127.0.0.1'].forEach(function (server) {
        expect(distribution['http://'+ server]).to.be.above(250);
      });
    });

    it('should prefix the server', function () {
      for (var i = 0; i < 100; i++) {
        var tag = api.tag('/css/base.css');
        expect(tag).to.equal('http://lolcathost:'+ port +'/versions:0.0.0/css/base.css');
      }
    });

    it('forces https for server relative protcol css files', function () {
      var client = require('../').clone().connect('//localhost:8888');

      expect(client.tag('/foo.png')).to.equal('//localhost:8888/versions:0.0.0/foo.png');
      expect(client.tag('/foo.css')).to.equal('https://localhost:8888/versions:0.0.0/foo.css');

      client.end();
    });
  });

  describe('#prefix', function () {
    var server , port = portnumbers, api;

    before(function () {
      var versions = require('../');
      server = versions.clone().listen(port);
      api = versions.clone().connect('http://localhost:'+ port);
    });

    after(function (done) {
      server.end();
      api.end(done);
    });

    it('should prefix with a given server', function () {
      expect(api.prefix('https://google.com')).to.equal('https://google.com/versions:0.0.0');
    });

    it('should prefix with the default server', function () {
      expect(api.prefix()).to.equal('http://localhost:'+ port +'/versions:0.0.0');
    });

    it('should not prefix if no server is provided', function () {
      var client = require('../').clone().connect();

      expect(client.prefix()).to.equal('');
      expect(client.tag('/foo')).to.equal('/foo');

      client.end();
    });
  });

  describe('#version', function () {
    var server , port = portnumbers, api;

    before(function () {
      var versions = require('../');
      server = versions.clone().listen(port);
      api = versions.clone().connect('http://localhost:'+ port);
    });

    after(function (done) {
      server.end();
      api.end(done);
    });

    it('should bump the internal version number', function () {
      api.version('1.3.9');
      expect(api.get('version')).to.equal('1.3.9');
    });

    it('should increase the version patch number if no number is supplied', function () {
      api.set('version', '1.3.9');
      api.version();

      expect(api.get('version')).to.equal('1.3.10');
    });
  });
});
