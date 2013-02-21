# versions

Versions is a simple but powerful node module that allows you to create a
flexible static server or content delivery network. Serving static assets is a
pain in Node, it's not something it focuses on and everybody advises you to
setup a static server using NGINX or implement a cache proxying using varnish or
squid. The biggest advantage that these servers have is that they support
`sendfile` for sending static assets and is generally agreed upon that this is
"The Best" method for sending static data.

But Node doesn't have this advantage, it's removed from the core "due to reasons"
and the only way to get decent file serving performance is to do agressive
caching of the assets in memory to reduce I/O operations as well as optimize for
cache hits inside the browser or using conditional requests. And that is the
goal of this project. Cache all the things!.

## Features

Versions comes with tons of features to make it easier for you to set up a
simple static server.

#### Origin Pull

In addition to serving files from disk you can also configure versions to pull
static content from an origin server. This way you don't have to upload you
static assets to a separate server in order to get them cached.

####  REST API

You can communicate with the server using a REST API. You can inspect items from
the cache, see what keys are cached or flush the server. The possiblities are
endless.

#### Metrics

Everybody loves stats, thats why we are gathering metrics about the requests and
the state of the server. These metrics can be accessed through the REST API.

#### Love

It's crafted with love, what else do you need?

## Installation

Installation is done through the node package manager (npm)

```
npm install versions --save
```

The `--save` tells npm to automatically add this file to the `dependencies`
object of your `package.json` file.

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
    to secure your versions REST API. It's unsecured by default but by after
    setting this property it requires an <code>?auth=<prop></code> parameter to
    be used to access the API.
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
