# Expressively

A convention based express framework.

This framework has opinionated defaults, which makes it fast to get up and running, and fun to use (if you like the
defaults).

* Configs lodash / underscore templated from NODE_ENV based json files
* dev environment
* optimized environment with simple css and js minification
* Jade templating
* routes and middleware stacks created via json
* Static html file cache created from pug templating

## The directory structure

    cache (should be gitignored - static served)
    middlewares
        "pages" in index.js / view.pug pods
        other middlewares
    public ( static served)
    views (pug mixins, includes, layouts)
    assets.json
    routes.json
    startup.js
    waitFor.js

## Usage

A minimal index.js example (express and the app are passed in to give you more control)

```javascript
var expressively = require('expressively'),
    express = require('express'),
    app = express(),
    configs = require('./configs);

// Start the express app based on the files available in the base directory.
expressively
    .start({
        baseDirectory   : __dirname,
        configs: configs
    })
    .then(function(results) {
        console.log('app started with:', results.configs);
    })
    .catch(function(error) {
        console.log('there was an error:', error);
    });
```

Other options:

`options.express` - express, if not provided, will be created for you
`options.app` - the express app, if not provided, will be created for you
`options.verbose` - more output as app starts up.
`options.staticOptions` - the options object to pass to [`express.static`](http://expressjs.com/en/api.html#express.static). Will default to `{ maxage : '365d' }` if nothing is passed in.

## Usage with Socket.io

You can use this with socket.io. Since the docs in socket.io show a more complicated method, below is a full example with browserify.
You will need to npm install `expressively`, `socket.io`, and `socket.io-client`.

```javascript
var expressively = require('expressively'),
    socketio = require('socket.io');

expressively
    .start({
        baseDirectory   : __dirname,
    })
    .then(function(result){

        var io = socketio(result.server);

        io.on('connection', function (socket) {
            console.log('socket connected');
            console.log('you will only see this if someone is looking at the front end');
            socket.emit('news', { hello: 'world' });
            socket.on('my other event', function (data) {
                console.log(data);
            });
        });})
```

Now on the front end (assuming you are using browserify):

```javascript
var io = require('socket.io-client'),
    socket = io.connect('http://my.domain.com');

socket.on('news', function (data) {
    console.log(data);
    socket.emit('my other event', {my : 'data'});
});
```

If you are using nginx and you have issues, make sure your reverse proxy looks something like this:

```
location / {
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-NginX-Proxy true;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $http_host;
    proxy_set_header Upgrade $http_upgrade;

    proxy_http_version 1.1;

    proxy_pass http://my_app/;
    proxy_redirect off;
}
```

Not have Upgrade and version 1.1 will cause problems.

## Directories

### Cache

The static file cache is put here.

To send a response and write it to the cache use:

`res.cache(require.resolve('./view.pug', data)`.

To clear the static cache use `res.clearCache()` or `require('expressively').clearCache()`. This method return a promise
that is resolved when the cache files are deleted.

If configs.optimize is false, the cache will not be used.

### Configs

Starting in `v1.0.0` there is less magic in expressively, and configs are not built for you.
You can now pass them in and use expressively to store them. 

Expressively can be used to store your configs. Simply pass them in as the value on the `configs` key:

```
expressively.start({ baseDirectory: __dirname, configs: configs })
```

In addition to the built aspects, configs.env, configs.app, and configs.express are available.

The configs object is available as `require('express-singleton').configs` after the `start()` call. Before the start call
you will see mostly an empty object.

Important configs:

```json
{
    "port" : "// The port number the express app should listen on"
}
```

Optional configs:

```json
{
    "protocol" : "http|https //Only really needed for HTTPS, HTTP is run by default",
    "https" : {
        "key" : "//relative path to private key from baseDirectory",
        "cert" : "//relateive path to certificate from baseDirectory"
    }
}
```

### Middlewares

[`routes.json`](https://www.npmjs.com/package/express-json-middleware) will look for available middlewares here.
You can put your "pages" as directories here with each page directory containing and `index.js` and a `view.pug`.
You can refer to just the directory name in routes.json, and you can do `res.cache(require.resolve('./view.pug'), date)`
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
middleware is added (e.g. node sass) do it here. If it returns a promise, things wait until the promise is resolved.
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
