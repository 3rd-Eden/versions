describe('versions()', function () {
  'use strict';

  var chai = require('chai')
    , path = require('path')
    , sinon = require('sinon')
    , sinonChai = require('sinon-chai')
    , expect = chai.expect;

  chai.use(sinonChai);
  chai.Assertion.includeStack = true;

  describe('initialization', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
    });

    after(function (done) {
      versions.end(done);
    });

    it('reads in our default versions.json', function () {
      var yayson = require('../versions.json');

      expect(versions.get('log level')).to.equal(yayson['log level']);
      expect(versions.get('cors')).to.equal(yayson.cors);
    });

    it('inherts from the EventEmitter', function () {
      expect(versions).to.be.instanceOf(require('events').EventEmitter);
    });

    it('exposes the current version number', function () {
      expect(versions.version).to.equal(require('../package.json').version);
    });
  });

  describe("#parse", function () {
    var versions;
    before(function () {
      versions = require('../').clone();
    });

    after(function (done) {
      versions.end(done);
    });

    it('parsers numberic values', function () {
      expect(versions.parse(1000)).to.equal(1000);
      expect(versions.parse('1000')).to.equal(1000);
    });

    it('correctly expands strings to numbers', function () {
      expect(versions.parse('1s')).to.equal(1000);
      expect(versions.parse('1 second')).to.equal(1000);
    });
  });

  describe('#read', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('silently ignores files that do not exist', function () {
      versions.logger.on('error', function () {
        throw new Error('Should now write an error output');
      });

      versions.read('/foo/bar/bananana');
      versions.logger.removeAllListeners('error');
    });

    it('merges the content of the files with the config', function () {
      versions.read(path.resolve(__dirname, './fixtures/extra.json'));
      expect(versions.get('extra shizzle')).to.equal('fuck yea');
    });

    it('shows a human readable error on parse errors', function () {
      var errors = 0;
      versions.logger.on('error', function () {
        errors++;
      });

      versions.read(path.resolve(__dirname, './fixtures/broken.json'));
      versions.logger.removeAllListeners('error');
      expect(errors).to.equal(2);
    });

    it('reads plain javascript files', function () {
      versions.read(path.resolve(__dirname, './fixtures/extra.js'));
      expect(versions.get('plain')).to.equal('javascript');
    });

    it('reads the configuration from the root folder', function () {
      var version = require('versions');

      expect(version.get('auth')).to.equal('foo');
    });
  });

  describe("#clone", function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('should generate an identical clone of the instance', function () {
      var clone = versions.clone();

      expect(clone.config).to.deep.equal(versions.config);
      clone.end();
    });
  });

  describe('#layer', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
      versions.initialize('server');
    });

    after(function (done) {
      versions.end(done);
    });

    it('loads in our own middleware', function (done) {
      versions.once('debug:initialize', done);

      // The debug module emits the debug:initialize so we know when that is
      // called, we have succesfully loaded our shizzle
      versions.layer('debug');
    });

    it('it automatically discovers connect modules', function () {
      versions.layer('responseTime');

      // Do a source code comparison, function === will not work for closures
      var handle = versions.app.stack.pop().handle;
      expect(versions.connectjs.responseTime().toString()).to.equal(handle.toString());
    });

    it('configures middleware when an option is supplied', function (done) {
      var args = 'foo';

      versions.on('debug:initialize', function (data) {
        expect(data).to.equal(args);
        done();
      }).layer('debug', args);
    });

    it('requires third party modules');
  });

  describe('#listen', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('sets a custom port number if supplied as argument');
    it('supports HTTP');
    it('supports SPDY');
    it('adds middleware layers');
    it('sets up the HTTP server');
    it('emits a listening event');
  });

  describe('#async', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('selects the fastest result using .fastest()', function (done) {
      versions.async.fastest(
        [300, 200, 100, 40, 900, 110]
      , function (count, cb) {
        setTimeout(function called() {
          cb(null, count);
        }, count);
      }, function (err, count) {
        expect(err).to.not.be.instanceof(Error);
        expect(count).to.equal(40);

        done();
      });
    });

    it('selects the first result without an error using .failover()', function (done) {
      versions.async.failover(
        [new Error('I'), new Error('Should'), new Error('Die'), 'hard', new Error('now'), 'last']
      , function (item, cb) {
        process.nextTick(function async() {
          if (item instanceof Error) return cb(item);
          return cb(null, item);
        });
      }, function (err, item) {
        expect(err).to.not.be.instanceof(Error);
        expect(item).to.equal('hard');

        done();
      });
    });
  });

  describe('#initialize', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('setups & initializes our middleware handler');
    it('setups the cache');
    it('setups syncing');
    it('adds metrics');
  });

  describe('#write', function () {
    var versions, req, res, data;

    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
      versions.initialize('server');
    });

    beforeEach(function () {
      res = {
          setHeader: sinon.stub()
        , end: sinon.stub()
      };

      data = {
          buffer: 'test'
        , 'content-type': 'application/json'
        , 'last-modified': 1234
        , compressed: {
              deflate: 'body with deflated content'
            , gzip: 'body with gzipped content'
          }
      };
    });

    after(function (done) {
      versions.end(done);
    });

    it('sets the correct headers', function () {
      var age = 86400000
        , exp = new Date(Date.now() + age).toUTCString();
      req = { headers: { 'accept-encoding': 'cakes' } };
      versions.set('max age', age).write(req, res, data);

      expect(res.setHeader.callCount).to.be.equal(5);
      expect(res.setHeader).to.be.calledWith('Expires', exp);
      expect(res.setHeader).to.be.calledWith('Cache-Control', 'max-age='+ age +', public');
      expect(res.setHeader).to.be.calledWith('Last-Modified', data['last-modified']);
      expect(res.setHeader).to.be.calledWith('Content-Type', data['content-type']);
      expect(res.setHeader).to.be.calledWith('Content-Length', data.buffer.length);
    });

    it('returns uncompressed buffer if non requested', function () {
      req = { headers: { 'accept-encoding': 'cakes' } };
      versions.write(req, res, data);

      expect(res.setHeader.callCount).to.be.equal(5);
      expect(res.end).to.be.calledWith('test');
      expect(res.end).to.be.calledOnce;
    });

    it('returns uncompressed buffer no compression available', function () {
      req = { headers: { 'accept-encoding': 'gzip,deflate' } };
      data = { buffer: 'test' };
      versions.write(req, res, data);

      expect(res.setHeader.callCount).to.be.equal(5);
      expect(res.end).to.be.calledWith('test');
      expect(res.end).to.be.calledOnce;
    });

    it('prefers gzip over deflate', function () {
      req = { headers: { 'accept-encoding': 'gzip,deflate' } };
      versions.write(req, res, data);

      expect(res.setHeader).to.be.calledWith('Content-Encoding', 'gzip');
      expect(res.setHeader.callCount).to.be.equal(6);
      expect(res.end).to.be.calledWith('body with gzipped content');
      expect(res.end).to.be.calledOnce;
    });

    it('returns compression type deflate if requested', function () {
      req = { headers: { 'accept-encoding': 'deflate' } };
      versions.write(req, res, data);

      expect(res.setHeader).to.be.calledWith('Content-Encoding', 'deflate');
      expect(res.end).to.be.calledWith('body with deflated content');
      expect(res.setHeader.callCount).to.be.equal(6);
      expect(res.end).to.be.calledOnce;
    });
  });

  describe('#allows', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    var accept = {
      headers: {
        'if-none-match': '1313',
        'if-modified-since': new Date().toUTCString(),
        'accept-encoding': 'gzip,deflate,cakes',
      },
      url: '/foo/bar.banana',
      method: 'GET'
    };

    var decline = {
      url: '/',
      headers: {}
    };

    it('detects gzip support', function () {
      expect(versions.allows('gzip', accept)).to.equal(true);
      expect(versions.allows('gzip', decline)).to.equal(false);
    });

    it('detects deflate support', function () {
      expect(versions.allows('deflate', accept)).to.equal(true);
      expect(versions.allows('deflate', decline)).to.equal(false);
    });

    it('ignores IE6 without service pack', function () {
      accept.headers['user-agent'] = 'Mozilla/5.0 (compatible; MSIE 6.0; Windows NT 5.1)';

      expect(versions.allows('gzip', accept)).to.equal(false);
    });

    it('accepts IE6 with a service pack', function () {
      accept.headers['user-agent'] = 'Mozilla/5.0 (Windows; U; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 2.0.50727)';

      expect(versions.allows('gzip', accept)).to.equal(true);
    });

    it('forces gzip on obfuscated encoding headers', function () {
      var headers = [
        'Accept-EncodXng',
        'X-cept-Encoding',
        'XXXXXXXXXXXXXXX',
        '~~~~~~~~~~~~~~~',
        '---------------'
      ];

      var values = [
        'gzip',
        'deflate',
        'gzip,deflate',
        'deflate,gzip',
        'XXXXXXXXXXXXX',
        '~~~~~~~~~~~~~',
        '-------------'
      ];

      headers.forEach(function (header) {
        values.forEach(function (val) {
          var req = { headers: {} };
          req.headers[header] = val;

          expect(versions.allows('gzip', req)).to.equal(true);
        });
      });
    });

    it('detects invalid extensions', function () {
      expect(versions.allows('extension', accept)).to.equal(true);
      expect(versions.allows('extension', decline)).to.equal(false);

      versions.set('blacklisted extensions', ['.banana']);
      expect(versions.allows('extension', accept)).to.equal(false);

      // We need to forcefully nuke extensions because it will stay the same in
      // watch mode.
      versions.config['blacklisted extensions'].length = 0;
    });

    it('detects 304 requests', function () {
      expect(versions.allows('304', accept)).to.equal(true);
      expect(versions.allows('304', decline)).to.equal(false);

      accept.method = 'POST';
      expect(versions.allows('304', accept)).to.equal(false);
    });

    it('answers with false for unknown queries', function () {
      expect(versions.allows('drinks', accept)).to.equal(false);
      expect(versions.allows('cows', accept)).to.equal(false);
      expect(versions.allows('sexy bear hugs', accept)).to.equal(false);
      expect(versions.allows('foo bar', accept)).to.equal(false);
    });
  });

  describe('#compress', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('only compresses text files', function (done) {
      versions.compress('image/png', 'foo fafdaf afdsfasdf08 -8 -a8', function (err, data) {
        expect(err).to.equal(undefined);
        expect(data).to.equal(undefined);

        done();
      });
    });

    it('compresses content', function (done) {
      var buffer = require('fs').readFileSync(__filename);

      versions.compress('text/javascript', buffer, function (err, data) {
        expect(err).to.equal(null);
        expect(data).to.have.property('gzip');
        expect(data).to.have.property('deflate');

        Object.keys(data).forEach(function type (key) {
          expect(Buffer.isBuffer(data[key])).to.equal(true);
          expect(data[key].toString()).to.not.equal(buffer.toString());
          expect(data[key].length).to.be.below(buffer.length);
        });

        done();
      });
    });

    it('compresses font files');
  });

  describe('#get', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('retrieves a value from the config', function () {
      expect(versions.get('foo bar banan')).to.equal(undefined);
      expect(versions.get('cors')).to.equal('*');
    });
  });

  describe('#set', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('automatically converts values', function () {
      expect(versions.get('max age')).to.not.equal(1000);
      versions.set('max age', '1 second');
      expect(versions.get('max age')).to.equal(1000);
    });

    it('does not set values that are already set', function () {
      expect(versions.get('no you')).to.equal(undefined);

      versions.set('no you', 'foo');
      versions.once('change:no you', function () {
        throw new Error('Should not have fired the change callback');
      });

      versions.set('no you', 'foo');
      versions.removeAllListeners('change: no you');
    });

    it('merges arrays', function () {
      versions.set('array', [1, 2]);
      expect(versions.get('array')).to.include(1);
      expect(versions.get('array')).to.include(2);

      versions.set('array', [3, 4]);
      expect(versions.get('array')).to.include(1);
      expect(versions.get('array')).to.include(2);
      expect(versions.get('array')).to.include(3);
      expect(versions.get('array')).to.include(4);
      expect(versions.get('array')).to.not.include(5);
    });

    it('merges arrays in the correct order', function () {
      var origin = [
        { url: 'https://webops.nodejitsu.com', id: 'webops' },
        { url: 'https://www.nodejitsu.com', id: 'home' },
        { url: 'https://raw.github.com/nodejitsu/handbook/integration', id: 'handbook' }
      ];

      versions.set('origin servers', origin);
      versions.get('origin servers').forEach(function (server, index) {
        expect(server.url).to.equal(origin[index].url);
        expect(server.id).to.equal(origin[index].id);
      });
    });

    it('does not merge duplicate items in to the array', function () {
      var origin = [
        { url: 'https://webops.nodejitsu.com', id: 'webops' },
        { url: 'https://www.nodejitsu.com', id: 'home' },
        { url: 'https://raw.github.com/nodejitsu/handbook/integration', id: 'handbook' }
      ];

      versions.set('origin servers', origin);
      versions.set('origin servers', origin);
      versions.set('origin servers', origin);
      versions.set('origin servers', origin);
      versions.set('origin servers', origin);
      versions.set('origin servers', origin);
      versions.set('origin servers', origin);

      versions.get('origin servers').forEach(function (server, index) {
        expect(server.url).to.equal(origin[index].url);
        expect(server.id).to.equal(origin[index].id);
      });
    });

    it('merges objects', function () {
      versions.set('object', { foo: 'bar' });
      expect(versions.get('object').foo).to.equal('bar');
      expect(versions.get('object')).not.have.property('baz');

      versions.set('object', { foo: 'baz', baz: 'foo' });
      expect(versions.get('object').foo).to.equal('baz');
      expect(versions.get('object')).have.property('baz');
    });

    it('emits `change` events for new values', function () {
      versions.once('change:event', function (from, to) {
        expect(from).to.equal(undefined);
        expect(to).to.equal('bar');
      });

      versions.set('event', 'bar');
    });

    it('emits `change` events', function () {
      versions.once('change:event', function (from, to) {
        expect(from).to.equal('bar');
        expect(to).to.equal('foo');
      });

      versions.set('event', 'foo');
    });

    it('blocks `change` events', function () {
      versions.once('change:block', function () {
        throw new Error('FAIL');
      });

      versions.set('block', 'value', false);
      versions.removeAllListeners('change:block');
    });
  });

  describe('configuration sugar', function () {
    var versions;
    before(function () {
      versions = require('../').clone();
      versions.logger.notification = 8;
    });

    after(function (done) {
      versions.end(done);
    });

    it('expects path() to set the directory', function () {
      expect(versions.get('directory')).to.not.equal('foo');

      versions.path('foo');
      expect(versions.get('directory')).to.equal('foo');
    });

    it('expects lifetime() to set max age', function () {
      expect(versions.get('max age')).to.not.equal(2000);

      versions.lifetime('2 seconds');
      expect(versions.get('max age')).to.equal(2000);
    });

    it('expects expire() to set the internal cache', function () {
      expect(versions.get('expire internal cache')).to.not.equal(61200000);

      versions.expire('17 hours');
      expect(versions.get('expire internal cache')).to.equal(61200000);
    });
  });
});
