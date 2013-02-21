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

#### versions.json

The versions file can configure different aspects of the module. The following
properties can be configured:

<dl>
  <dt>auth</dd>
  <dd>
    The `auth` property is a simple security token that you can use to secure
    your versions REST API. It's unsecured by default but by after setting this
    property it requires an `?auth=<prop>` parameter to be used to access the
    API.
  </dd>
</dl>

Full example of a versions.json:

```js
{
  "auth": "my-secret-auth-key",
  "blacklisted extensions": [".foo"],
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
