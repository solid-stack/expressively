# Expressively

Express with some directory structure associated.

## Options

 * options.app The express app - created if not passed in
 * options.engine - the express view engine used - defaults to pug
 * options.express express itself - created if not passed in
 * options.protocol - if this is 'https', express will handle https - suggested use for dev only
 * options.https.key - used with options.protocol of https
 * options.https.crt - used with options.protocol of https
 * options.staticOptions - options to pass to the express.static call
 * options.structure - object that describes the directory layout for the app - all paths are relative to structure.base
 * options.structure.base The directory other directory options are relative to - required
 * options.structure.middlewares Path to the "middlewares" directory use from routes.json
 * options.structure.routes The location of the routes.json file
 * options.structure.static An object of directories to be used for express.static - keys are paths
 * options.structure.startup An array of modules to be rerquired in in series - optionally return promises from them - defaults to []
 * options.structure.views The express "views" directory
 * options.verbose If you want verbose outpout

## Usage with Socket.io

You can use this with socket.io. Since the docs in socket.io show a more complicated method, below is a full example with browserify.
You will need to npm install `expressively`, `socket.io`, and `socket.io-client`.

```javascript
var expressively = require('expressively'),
    socketio = require('socket.io');

expressively
    .start({
        ...
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

### Configs

Starting in `v1.0.0` there is less magic in expressively, and configs are not built for you.
To import your own configs in from anywhere in your app just use `require.main.require('./configs')`. The
previous would work if you had a `configs` dir at the level of your main file.

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

### Views

Jade templates can be stored here for conveniance

## Release Notes

* `2.0.0` - Adding more flexibility via configuration and removing some uneeded functionality. Docs incomplete.
* `1.1.3` - Dependency fix to fully support pug.
