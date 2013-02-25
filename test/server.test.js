describe('versions()', function () {
  'use strict';

  var versions = require('../').clone()
    , chai = require('chai')
    , expect = chai.expect;

  chai.Assertion.includeStack = true;

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

  describe("#parse", function () {
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
    versions.logger.notification = 8;
    var path = require('path');

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
  });

  describe('#layer', function () {
    var v;

    beforeEach(function generate() {
      v = versions.clone();
      v.initialize('server');
    });

    afterEach(function end(done) {
      v.end(done);
    });

    it('loads in our own middleware', function (done) {
      v.once('debug:initialize', done);

      // The debug module emits the debug:initialize so we know when that is
      // called, we have succesfully loaded our shizzle
      v.layer('debug');
    });

    it('it automatically discovers connect modules', function () {
      v.layer('responseTime');

      // Do a source code comparison, function === will not work for closures
      var handle = v.app.stack.pop().handle;
      expect(v.connectjs.responseTime().toString()).to.equal(handle.toString());
    });

    it('configures middleware when an option is supplied', function (done) {
      var args = 'foo';

      v.on('debug:initialize', function (data) {
        expect(data).to.equal(args);
        done();
      }).layer('debug', args);
    });

    it('requires third party modules');
  });

  describe('#listen', function () {
    it('sets a custom port number if supplied as argument');
    it('adds middleware layers');
    it('sets up the HTTP server');
    it('emits a listening event');
  });

  describe('#initialize', function () {
    it('setups & initializes our middleware handler');
    it('setups the cache');
    it('setups syncing');
    it('adds metrics');
  });

  describe('#write', function () {
    it('sets the correct headers');
    it('decided which content to use');
  });

  describe('#allows', function () {
    var accept = {
      headers: {
        'if-none-match': '1313',
        'if-modified-since': new Date().toUTCString(),
        'accept-encoding': 'gzip,deflate,cakes'
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
        expect(Buffer.isBuffer(data)).to.equal(true);
        expect(data.toString()).to.not.equal(buffer.toString());
        expect(data.length).to.be.below(buffer.length);

        done();
      });
    });
  });

  describe('#get', function () {
    it('retrieves a value from the config', function () {
      expect(versions.get('foo bar banan')).to.equal(undefined);
      expect(versions.get('cors')).to.equal('*');
    });
  });

  describe('#set', function () {
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

  after(function () {
    versions.end();
  });
});
