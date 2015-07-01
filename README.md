# Expressively

A convention based express framework.

This framework has opinionated defaults, which makes it fast to get up and running, and fun to use (if you like the
defaults).

* Configs lodash / underscore templated from NODE_ENV based json files
* dev environment
* optimized environment with simple css and js minification
* Jade templating
* routes and middleware stacks created via json
* Static html file cache created from jade templating

## The directory structure

    cache (should be gitignored - static served)
    configs
        vars
    middlewares
        "pages" in index.js / view.jade pods
        other middlewares
    public ( static served)
    views (jade mixins, includes, layouts)
    assets.json
    routes.json
    startup.js
    waitFor.js

## Usage

A minimal index.js example (express and the app are passed in to give you more control)

```javascript
var simpleton = require('expressively'),
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

### Cache

The static file cache is put here.

To send a response and write it to the cache use:

`res.cache(require.resolve('./view.jade', data)`.

To clear the static cache use `res.clearCache()` or `require('expressively').clearCache()`. This method return a promise
that is resolved when the cache files are deleted.

If configs.optimize is false, the cache will not be used.

### Configs

Any point after `startup.js` is called, configs are available synchronously as, `require('expressively').configs`.
In addition to the built aspects, configs.env, configs.app, and configs.express are available.

The configs are dynamically built based on `node.process.NODE_ENV`. Each json file in configs is an underscore template that
gets passed `vars/[NODE_ENV].json`. The resulting json gets extended onto the configs object. 

The configs object is available as `require('express-singleton').configs` after the `start()` call. Before the start call
you will see mostly an empty object.

express and app are attached to the configs object as .express and .app.

Important configs:

```json
{
    "port" : "// The port number the express app should listen on"
}
```

### Middlewares 

[`routes.json`](https://www.npmjs.com/package/express-json-middleware) will look for available middlewares here.
You can put your "pages" as directories here with each page directory containing and `index.js` and a `view.jade`.
You can refere to just the directory name in routes.json, and you can do `res.cache(require.resolve('./view.jade'), date)`
to render your page and cache it.

### Public

This directory will be served as static content

### Views

Jade templates can be stored here for conveniance

## Files (in base directory)


* [`assets.json`](https://www.npmjs.com/package/express-asset-handler)
* [`routes.json`](https://www.npmjs.com/package/express-json-middleware)
* `waitFor.js` - file gets called immediately before calling app.listen. listen is not called until this is resolved
* `startup.js` - file gets called immediately after configs are built. so if you need to do things before the static 
middleware is added (e.g. node sass) do it here.
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
