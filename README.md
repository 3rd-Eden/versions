# versions

Versions is a simple but powerful node.js module that allows you to create a
flexible static server or content delivery network. Serving static assets is a
pain in Node, it's not something it focuses on and everybody advises you to
setup a static server using NGINX or implement a cache proxying using Varnish or
Squid. The biggest advantage that these servers have is that they support
`sendfile` for sending static assets and is generally agreed upon that this is
"The Best" method for sending static data. But Node doesn't have this advantage,
it's removed from the core "due to reasons" and the only way to get decent file
serving performance is to do aggressive caching of the assets in memory to reduce
I/O operations as well as optimize for cache hits inside the browser or using
conditional requests. And that is the goal of this project, _cache all the
things!_

### Build status

Please note that the build status only displays the status of the GitHub master
branch. New stable versions are only released once the master passes all tests.

[![Build Status](https://travis-ci.org/3rd-Eden/versions.png?branch=master)](https://travis-ci.org/3rd-Eden/versions)

---

## Features

Versions comes with tons of features to make it easier for you to set up a
simple static server. We try to support as many features as a normal paid CDN
would provide for you.

#### Origin Pull

In addition to serving files from disk you can also configure versions to pull
static content from an origin server. This way you don't have to upload you
static assets to a separate server in order to get them cached.

#### Set caching headers for files

In order to reduce the amount of HTTP requests that a browser would do for your
files, versions automatically sets the appropriate caching headers. This way you
assets will be served from the browser cache instead of the server.

#### Advanced gzipping

Gzip is enabled on every compatible file format, even if the origin server
doesn't support gzip. In addition to that, we have disabled gzip for IE 5 and
IE6 without service pack 2 as it is known to improperly cache it. We also have
detection for obfuscated gzip headers as researched by the [Yahoo performance
team](http://developer.yahoo.com/blogs/ydn/posts/2010/12/pushing-beyond-gzipping/).

#### REST API for managing your server

You can communicate with the server using a REST API. You can inspect items from
the cache, see what keys are cached or flush the server. The possibilities are
endless.

#### Metrics

Everybody loves stats, that's why we are gathering metrics about the requests and
the state of the server. These metrics can be accessed through the REST API.

#### Client API

Versions comes with a dedicated client that can communicate with it's REST API's
or through Pub/Sub.

#### Synchronisation

Synchronises configuration and versions number between different connected
consumers to ensure that they are all hitting the same cached version.

#### Love

It's crafted and engineered with love, what else do you need?

---

## Installation

Installation is done through the node package manager (npm)

```
npm install versions --save
```

The `--save` tells npm to automatically add this file to the `dependencies`
object of your `package.json` file.

## API references

The API references are generated from the source's JSDoc comments:

- [Server API reference](/3rd-Eden/versions/blob/master/API/README.md)
- [Client API reference](/3rd-Eden/versions/blob/master/API/client.md)

## Configuration

The server can be configured in 2 different ways or a hybrid of both. It has a
dedicated configuration file called `versions.json` that lives in the root of
your application folder (the application folder is the folder that contains your
node_modules folder). But you can also configure the module through a chainable
API. And the last would be a hybrid of those. Using a configuration file and
using the API to override some of the configuration values.

<dl>
  <dt>auth</dd>
  <dd>
    <p>
      The <code>auth</code> property is a simple security token that you can use
      to secure your versions REST API. After setting this property it requires
      an <code>?auth=<prop></code> parameter to be used to access the API.
    </p>

    <pre>versions.set('auth', 'Sup3rSecr3tP4z5w0rdy0');</pre>
  </dd>

  <dt>blacklisted extensions</dt>
  <dd>
    <p>
      Black list extensions that you do not want to have pulled from your origin
      server. You can for example black list <code>.conf</code> files or maybe
      some other random files. Please note that people can still fetch these
      files directly from the origin server.
    </p>

    <pre>versions.set('blacklisted extensions', ['.conf', '.log', '.gz']);</pre>
  </dd>

  <dt>cors</dt>
  <dd>
    <p>
      Set custom <code>Access-Control-Allow-Origin</code> headers. The default
      value is <code>*</code> so all values are allowed. If you only want to allow
      access from a specific domain set the domain here.
    </p>

    <pre>versions.set('cors', '*.example.com');</pre>
  </dd>

  <dt>directory</dt>
  <dd>
    <p>
      A directory that is relative to the module that required versions that is
      used to serve static content. If you want this directory to be relative to
      a different path. You can set a <code>root</code> property.
    </p>

    <pre>versions.set('directory', './public');</pre>
  </dd>

  <dt>force extensions</dt>
  <dd>
    <p>
      Only allow files with an extension to be pulled from origin servers. The
      reason behind this is that you might set your own site as full origin and
      that would mean that your regular pages would also be proxied by versions
      and create duplicate content. It's much less common that <code>.html</code>
      are served. Thats why we force extensions by default.
    </p>

    <pre>versions.set('force extensions', false);</pre>
  </dd>

  <dt>expire internal cache</dt>
  <dd>
    <p>
      How long should we keep items in our internal (memory) cache. It accepts a
      numeric value as milliseconds or a human readable string like
      <code>10 hours</code> or <code>90 minutes</code>. Defaults to 1 hour.
    </p>

    <pre>versions.set('expire internal cache', '2 days');</pre>
  </dd>

  <dt>max age</dt>
  <dd>
    <p>
      How long should the browser cache the files? It accepts a numeric value as
      miliseconds or a human readable string like <code>10 hours</code> or
      <code>90 days</code>. Defaults to <code>30 days</code>. Please note that
      this value should not be longer then a year.
    </p>

    <pre>versions.set('max age', '1 year')</pre>
  </dd>

  <dt>port</dt>
  <dd>
    <p>
      As you might imagine, on which port number do you want to run the server.
      Defaults to <code>8080</code>.
    </p>

    <pre>versions.set('port', '8080');</pre>
  </dd>

  <dt>origin servers</dt>
  <dd>
    <p>
      An array of of server objects that is used to fetch resources that
      are not found in the <code>directory</code> property.
    </p>

    <pre>versions.set('origin servers', { url: "http://example.com", name: "foo" });</pre>
  </dd>

  <dt>version</dt>
  <dd>
    <p>
      The version number of the cache that can be automatically increased and
      synced between clients so cache can be expired on demand and still have
      the same version number/cache hits between different clients.
    </p>

    <pre>versions.set('version', '0.0.0');</pre>
  </dd>

  <dt>aliases</dt>
  <dd>
    <p>
      In order to parallelize the downloading of assets in the browser they should
      be spread across multiple subdomains/domains. You can supply 
      multiple origin servers that the client will use to distribute the assets.
    </p>

    <pre>versions.set('aliases', 'http://example.org');</pre>
  </dt>

  <dt>log level</dt>
  <dd>
    <p>
      As versions is intended to run as a standalone server it comes with a logger
      that outputs some useful information. You can control the amount of output
      by changing the log level. The default value is log. Please check the
      <a href="http://github.com/observing/devnull#logging-methods-and-levels">dev/null node.js logger</a>
      for the supported log levels.
    </p>
  
    <pre>versions.set('log level', 'debug');</pre>
  </dd>

  <dt>plugins</dt>
  <dd>
    <p>
      Versions is built on top of the connect framework and is configured to use the
      minimal amount of plugins to get the job done. The plugins array allows
      you to specify extra middleware layers that you want to have loaded into
      versions or custom connect compatible nodejs modules that need to be
      required.
    </p>

    <pre>versions.set('plugins', [{ name: 'logger', config: 'short' }, 'logger']);</pre>
  </dd>

  <dt>sync</dt>
  <dd>
    <p>
      Synchronise configuration between client and server. If you are using
      multiple servers also set the redis configuration.
    </p>

    <pre>versions.set('sync', true);</pre>
  </dd>

  <dt>redis</dt>
  <dd>
    <p>
      In order to enable a truely distributed cache cloud you can opt in to use
      a Redis back-end for syncing purposes. This object accepts the following
      properties:
    </p>

    <ul>
      <li>
        <strong>host</strong>
        The host name of your redis server.
      </li>
      <li>
        <strong>port</strong>
        The port number of your redis server.
      </li>
      <li>
        <strong>auth</strong>
        Optional auth/password to access your redis server.
      <li>
        <strong>namespace</strong>
        The key that should be used to store the configuration and be used as the
        channel name for the pub/sub channel. Defaults to <code>versions</code>
      </li>
    </ul>
  </dd>
</dl>

### versions.json

When you require the versions module it will try to find a `versions.json` (or
`versions.js` with a module.exports pattern) file in your root folder and use
this as default configuration.

```js
{
  "auth": "my-secret-auth-key",
  "blacklisted extensions": [".foo", ".conf"],
  "cors": "*",
  "directory": "./public",
  "expire internal cache": "1 hour",
  "max age": "30 days",
  "origin servers": [
    { "url": "https://www.nodejitsu.com", "id": "home" },
    { "url": "https://webops.nodejitsu.com", "id": "webops" }
  ],
  "port": 8080,
  "plugins": [
    "logger",
    "custom-nodejs-module",
    { 
      "name": "custom-nodejs-module",
      "config": {
        "custom": "configuration options that will be feed in to the middleware"
      }
    }
  ]
}
```

### Configuration API

In addition to reading your `versions.json` file for the configuration it is also
possible to set the configuration using dedicated API methods or the
`versions#set` method. The `versions#set` method expects 2 arguments, the first
argument is the name of the configuration key that you want to update and the
second value is the actual value:

```js
var versions = require('versions');

versions.set('auth', 'superSec3rtp4ssw0rd')
```

The API is also chainable, so you can do as many `versions#set` calls if needed.
Versions also provides you with some API sugar to make configuring a bit more
human readable:

```js
versions.path('/public').expire('10 hours').set('sync', true);
```

The following API methods map directly to configuration (see versions.json
configuration above for detailed information about what each configuration key
triggers):

API       | Configuration key
----------|------------------
path      | directory
lifetime  | max age
expire    | expire internal cache

### Server example

```javascript
'use strict';

// require versions, if you have `versions.json` in the same folder as your
// `package.json` it will load that as default configuration for you
var versions = require('versions');

// If you don't have a versions.json or want to override some values:
versions.set('log level', 'debug')
        .set('auth', 'helloW0nderW0man');

// Or use some of the nicer API sugar
versions.path('./public').lifetime('30 days').expire('10 hours');

// After you have configured everything that you want just start listening on
// the server.
versions.listen(8080);
```

But it can be much shorter if you don't have to overide any configuration from
your `versions.json` file:

```javascript
require('versions').listen();
```

## Rest API

#### GET /flush

Completely removes the internal cache. This does not flush cache-headers for the
HTTP requests.

Returns:

```js
{
  flush: 'OK'
}
```

#### GET /expire?key=<key>

Removes the matched item(s) from the internal cache. It uses the value of
`?key=key` to find and match it against request URLS in the cache.

Returns:

```js
{
  expire: 'OK',
  expired: 1
}
```

#### GET /inspect?key=<key>

Finds the item in the cache and displays some information about it, like the
total size of gzip, content-length etc.

Returns:

```js
{
  key: 'name of the key',
  data: {
    'Content-Length': 0,
    'Content-Length Gzip': 0,
    'Content-Type': 'text/html',
    'Last-Modified': 'Sun, 31 Mar 2013 13:37:33 GMT'
  }
}
```

Or when a given key is not found:

```js
{ inspect: 'Failed to find the requested key file in cache' }
```

#### GET /keys

Lists all items that are currently in the cache.

Returns:

```js
{
  keys: [
    "versions:0.1.14#/css/jitsu.min.css",
    "#/id:home/img/sprite.png",
    "versions:0.1.14#/js/jitsu.min.js",
    "#/id:home/img/nodepm.png",
    "versions:0.1.14#/js/cortex.min.js",
    "#/id:home/img/trusted.png",
    "#/id:home/img/cloud.png",
    "#/id:home/webfonts/ss-standard.woff",
    "#/id:home/webfonts/ss-social-regular.woff",
    "#/id:home/webfonts/ss-social-circle.woff",
    "#/id:home/img/spinner.gif"
  ]
}
```

#### GET /version

Get the current version of internal cache.

Returns:

```json
{ versions: '0.0.0' }
```

#### POST/PUT /version

Update the server to a new version number, if Redis sync is also the changes will
also be synced with other instances.

Returns:

```js
{ versions: '0.0.0' }
```

Or when no body is send:

```js
{ error: 'Invalid body' }
```

#### GET /metrics

Returns a bunch of metrics.

## License

MIT
