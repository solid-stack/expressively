'use strict';

var DEFAULT_PORT    = 4321,
    storedConfigs   = {
        env : 'Start method must be called before configs are retrieved.'
    },
    routes          = null,
    path            = require('path'),
    http            = require('http'),
    https           = require('https'),
    createRoutes    = require('express-json-middleware'),
    staticCache     = require('express-static-file-cache'),
    BB              = require('bluebird'),
    fs              = BB.promisifyAll(require('fs')),
    _               = require('lodash'),
    chalk           = require('chalk'),
    bodyParser = require('body-parser');

BB.longStackTraces();

module.exports = {
    configs : storedConfigs,
    start : start,
    clearCache : staticCache.clearCache
};

function start(options) {

    var app,
        baseDirectory,
        express,
        middlewaresDirectory,
        publicDirectory,
        routesFilePath,
        staticOptions,
        verbose,
        viewsDirectory;

    if (!options.baseDirectory) {
        throw new Error('You must pass in an options object that has options.baseDirectory');
    }

    express = options.express || require('express');
    app = options.app || express();
    baseDirectory = options.baseDirectory;
    staticOptions = options.staticOptions || {
            maxage : '365d'
        };
    verbose = options.verbose;

    return BB
        .try(function () {
            verbose && console.log(chalk.green('> getting configs'));
            return options.configs || {};
        })
        .then(function (configs) {
            configs.app = app;
            configs.express = express;
            _.extend(storedConfigs, configs);
        })
        .then(function () {
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({extended : false}));
        })
        .then(function () {
            viewsDirectory = path.join(baseDirectory, 'views');
            app.set('views', viewsDirectory);
            app.set('view engine', 'pug');
            verbose && console.log(chalk.green('> setup pug template engine'));

            app.use(staticCache.configure({
                app : app,
                express : express,
                cacheDir : path.join(baseDirectory, 'cache'),
                verbose : verbose,
                dev : !storedConfigs.optimize
            }));
            verbose && console.log(chalk.green('> setup static file cache'));

            publicDirectory = path.join(baseDirectory, 'public');
            verbose && console.log(chalk.green('> public directory'), publicDirectory);

            middlewaresDirectory = path.join(baseDirectory, 'middlewares');
        })
        .then(checkIfFile(baseDirectory, 'startup.js'))
        .then(function (isFile) {
            if (isFile) {
                verbose && console.log(chalk.green('> calling startup file'));
                return require(path.join(baseDirectory, 'startup'))(storedConfigs, app);
            } else {
                verbose && console.log(chalk.green('> not calling startup file'));
            }
        })
        .then(function () {
            app.use(express.static(publicDirectory, staticOptions));
        })
        .then(checkIfFile(baseDirectory, 'assets.json'))
        .then(function (isFile) {
            if (isFile) {
                verbose && console.log(chalk.green('> getting assets.json'));
                // TODO: document this
                app.use(require('express-asset-handler')({
                    assetsJson : require(path.join(baseDirectory, 'assets.json')),
                    baseAssetsDir : publicDirectory,
                    optimize : storedConfigs.optimize,
                    optimizedAssetsDir : path.join(publicDirectory, 'optimized'),
                    tmpDir : path.join(baseDirectory, 'tmp')
                }));
            } else {
                verbose && console.log(chalk.green('> not getting assets.json'));
            }

        })
        .then(function () {
            routesFilePath = path.join(baseDirectory, 'routes.json');
            verbose && console.log(chalk.green('> routes file:'), routesFilePath);
            routes = require(routesFilePath);
            createRoutes({
                app : app,
                express : express,
                routes : routes,
                middlewares : middlewaresDirectory
            });
        })
        .then(checkIfFile(baseDirectory, 'waitFor.js'))
        .then(function (isFile) {
            if (isFile) {
                verbose && console.log(chalk.green('> calling waitFor file'));
                return require(path.join(baseDirectory, 'waitFor'))(storedConfigs, app);
            } else {
                verbose && console.log(chalk.green('> not calling waitFor file'));
            }
        })
        .then(function () {
            var port = storedConfigs.port || DEFAULT_PORT,
                server = null;

            if(storedConfigs.protocol === 'https') {
                server = https.createServer({
                    key: fs.readFileSync(path.join(baseDirectory, storedConfigs.https.key)),
                    cert: fs.readFileSync(path.join(baseDirectory, storedConfigs.https.cert))
                }, app);
            } else {
                server = http.createServer(app);
            }

            server.listen(port, function(){
                console.log(chalk.green('> express app listening on port:'), port);
            });

            return server;
        })
        .then(function (server) {
            return {
                server : server,
                configs : storedConfigs
            };
        });
}

function checkIfFile(baseDirectory, fileName) {
    return function() {
        return fs
            .lstatAsync(path.join(baseDirectory, fileName))
            .then(function() {
                return true;
            })
            .catch(function() {
                return false;
            });
    };
}
