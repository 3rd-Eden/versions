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
files it's automatically setting the appropriate caching headers. This way you
assets will be served from the browser cache instead of the server.

#### Advanced gzipping

Gzip is enabled on every compatible file format. Even if the origin server
doesn't support gzip. In addition to that, we have disabled gzip for IE 5 and
IE6 without service pack 2 as it's known to impropperly cache it. We also have
detection for obfuscated gzip headers as researched by the [Yahoo performance
team](http://developer.yahoo.com/blogs/ydn/posts/2010/12/pushing-beyond-gzipping/).

#### REST API for managing your server

You can communicate with the server using a REST API. You can inspect items from
the cache, see what keys are cached or flush the server. The possibilities are
endless.

#### Metrics

Everybody loves stats, thats why we are gathering metrics about the requests and
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

### versions.json

The versions file can configure different aspects of the module. The following
properties can be configured:

<dl>
  <dt>auth</dd>
  <dd>
    The <code>auth</code> property is a simple security token that you can use
    to secure your versions REST API. After setting this property it requires an
    <code>?auth=<prop></code> parameter to be used to access the API.
  </dd>

  <dt>blacklisted extensions</dt>
  <dd>
    Black list extensions that you do want to have pulled from your origin
    server. You can for example black list <code>.conf</code> files or maybe
    some other random files. Please note that people can still fetch these files
    directly from the origin server.
  </dd>

  <dt>cors</dt>
  <dd>
    Set custom <code>Access-Control-Allow-Origin</code> headers. The default
    value is <code>*</code> so all values are allowed. If you only want allow
    access from a specific domain set the domain here.
  </dd>

  <dt>directory</dt>
  <dd>
    A directory that is relative the module that required versions that is used
    to serve static content. If you want this directory to be relative to a
    different path. You can see a <code>root</code> property.
  </dd>

  <dt>expire internal cache</dt>
  <dd>
    How long should we keep items in our internal (memory) cache. It accepts a
    numeric value as miliseconds or a human readable string like
    <code>10 hours</code> or <code>90 minutes</code>. Defaults to
    <code>1 hour</code>.
  </dd>

  <dt>max age</dt>
  <dd>
    How long should the browser cache the files? It accepts a numeric value as
    miliseconds or a human readable string like <code>10 hours</code> or
    <code>90 days</code>. Defaults to <code>30 days</code>. Please note that
    this value should not be longer then a year.
  </dd>

  <dt>port</dt>
  <dd>
    As you might imagine, on which port number do you want to run the server.
    Defaults to <code>8080</code>.
  </dd>

  <dt>origin servers</dt>
  <dd>
    An array of of servers objects that is used to fetch resources from that is
    not found in the <code>directory</code> property.

    <code>{ url: "http://example.com", name: "foo" }</code>
  </dd>

  <dt>version</dt>
  <dd>
    The version number of the cache that can be automatically increased and
    synced between clients so cache can be expired on demand and still have the
    same version number/cache hits between different clients.
  </dd>

  <dt>aliases</dt>
  <dd>
    In order to parallize the downloading of assets in the browser it's should
    be spread accross multiple subdomains/domains. You can supply origins
    multiple origin servers that the client will use to distribute the assets.
  </dt>

  <dt>sync</dt>
  <dd>
    Syncronise configuration between client and server.
  </dd>

  <dt>redis</dt>
  <dd>
    In order to enable a truely distributed cache cloud you can opt in to use a
    Redis back-end for syncing purposes. This object accepts the following
    properties:

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
        The key that should be used to store the configuration and be used as
        channel name for the pub/sub channel. Defaults to <code>versions</code>
      </li>
    </ul>
  </dd>
</dl>

Full example of a versions.json:

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
  "port": 8080
}
```

### Configuration API

In addition to reading your `versions.json` file for the configuration it's also
possible to set the configuration using dedicated API methods or the
`versions#set` method. The `versions#set` method expects 2 arguments, the first
argument is the name of the configuration key that you want to update and the
second value in the actual value:

```js
var versions = require('versions');

versions.set('auth', 'superSec3rtp4ssw0rd')
```

The API is also chainable, so you can do as many `versions#set` calls if needed.
Versions also provides you with some API sugar to make configuring a bit more
human readable:

```js
versions.path('/public').expire('10 hours');
```

The following API methods map directly to configuration (see versions.json
configuration above for detailed information about what each configuration key
triggers):

API       | Configuration key
----------|------------------
path      | directory
lifetime  | max age
expire    | expire internal cache

## License

MIT
