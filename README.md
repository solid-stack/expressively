# Express Simpleton

A convention based express framework.

## The directory structure

    configs
        vars
    middlewares
    public
    views
    assets.json
    routes.json
    startup.js
    waitFor.js

## Usage

A minimal index.js example (express and the app are passed in to give you more control)

```javascript
var simpleton = require('express-simpleton'),
    express = require('express'),
    app = express();
    
// Start the express app based on the files available in the base directory.
simpleton
    .start({
        baseDirectory   : __dirname
    })
    .then(function(configs) {
        console.log('app started with:', configs);
    })
    .catch(function(error) {
        console.log('there was an error:', error);
    });
```

Other options:

`options.express` - express, if not provided, will be created for you
`options.app` - the express app, if not provided, will be created for you
`options.verbose` - more output as app starts up.

## Directories

### Configs

Any point after `startup.js` is called, configs are available synchronously as, `require('express-simpleton').configs()`.
In addition to the built aspects, configs.env, configs.app, and configs.express are available.

The configs are dynamically built based on `node.process.NODE_ENV`. Each json file in configs is an underscore template that
gets passed `vars/[NODE_ENV].json`. The resulting json gets extended onto the configs object. 

The configs object is available as `require('express-singleton').configs()` after the `start()` call.

Important configs:

```json
{
    "port" : "// The port number the express app should listen on"
}
```

### Middlewares 

[`routes.json`](https://www.npmjs.com/package/express-json-middleware) will look for available middlewares here.

### Public

This directory will be served as static content

### Views

Jade templates

## Files (in base directory)


* [`assets.json`](https://www.npmjs.com/package/express-asset-handler)
* [`routes.json`](https://www.npmjs.com/package/express-json-middleware)
* `waitFor.js` - file gets called immediately before calling app.listen. listen is not called until this is resolved
* `startup.js` - file gets called immediately after configs are built
callback to run immediately after configs are assembled - configs passed in as frist argument, if a
promise is returned will not continue until the promise is resolved. app and express are passed in for convenience as the
second and third arguments:

```javascript
// startup.js
module.exports = function(configs, app, express) {
    if (configs.optimize) {
        app.enable('etag');
        app.use(function (req, res, next) {
            res.setHeader('Cache-Control', 'private, max-age=' + (365 * 24 * 60 * 60 * 1000));
            next();
        });
    }
}
```

## Notes

The optimized dir and baseDir/tmp should be gitignored.
