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
