### 0.1.11
- Ensure that all metrics emit an object with {req, res}

### 0.1.10
- A new REST route `/expire` has been added to expire individual items instead
  of the whole cache.

### 0.1.9
- By default we disallow fetches from origin servers that don't specify an
  extension. This behaviour can now be overrulled using the `force extensions`
  config.

### 0.1.8
- Fixed a bug in the configuration loading where it would read out the incorrect
  folder.
- Added some default extensions that are blacklisted, these are known backup or
  log files.
- The server will now emit an event for every metric so you can start logging on
  why you get 404's etc.

### 0.1.7
- The `ms` module is horribly broken, now shipping with working copy of it.

### 0.1.6
- Send ping packets over the pub/sub channel to prevent it from going idle.
- Output an error when you are serving static files from a unknown directory.

### 0.1.5
- The client will automatically transform //<domain> in to https://<domain> when
  you tag a `.css` file as relative protocols cause a double download of the
  file in Internet Explorer.
- All stdout from versions is now prefixed with `[versions]`
- Support for deflate instead of just gzip. This will only be used if the
  `accept-encoding` headers doesn't have gzip.

### 0.1.4
- Added support for tagging origin servers using `/id:<origin id>/`
- Fixed a bug where the assests where not receiving gzip compression
- Added a 404 event.

### 0.1.3
- Fixed a bug in the client API that caused the callback for the versions method
  to not be called when the redis backend was configured

### 0.1.2
- Added support for a `versions.js` as configuration file
- Made middleware layers optional
  - The rest middleware now requires the `auth` token
  - Serving local static files now requires the `directory` config
  - origin-pull now requires `origin servers` to be set.
- Support for HTTPS and SPDY by supplying a `ssl` configuration
- Metrics for gzip hits and misses
- Improved gzip detection by searching for obfuscated headers
- Disabled gzip for IE5/6 (without sp2)
- Enabled gzip for font-files
- Metrics now show the process.memory()

### 0.1.1
- If no server is provided in the `versions.connect()` call, assume that want to
  run in development mode and don't want it prefixed with cdn servers.

### 0.1.0
- Internals rewrite to support clients and distributed cloud configurations

### 0.0.1
- Initial release
