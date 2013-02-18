# versions

Versions is simple but powerful node module to create a flexible content
devilivery application. It caches all your static assets agressively and allows
you to use url versioning to bust that cache and therefor making optimimal use
of the browsers internal cache.

The module can easliy be configured by adding a `versions.json` file in the root
of your application folder:

```js
{
  "directory": "./public/",
  "maxAge": "10 hours",
  "port": 8080
}
```

Alternatively you can use various of chainable API to configure or override
these values:

```js
versions.cache('10 hours').path('/.public/').listen(8080);
```

## License

MIT
