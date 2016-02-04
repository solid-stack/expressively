'use strict';

var DEFAULT_PORT    = 4321,
    storedConfigs   = {
        env : 'Start method must be called before configs are retrieved.'
    },
    routes          = null,
    nodeEnv         = process.env.NODE_ENV || 'dev',
    getConfigs      = require('./getConfigs.js'),
    path            = require('path'),
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
        cacheDirectory,
        configsDirectory,
        express,
        middlewaresDirectory,
        publicDirectory,
        routesFilePath,
        startupFile,
        verbose,
        viewsDirectory;

    if (!options.baseDirectory) {
        throw new Error('You must pass in an options object that has options.baseDirectory');
    }

    express         = options.express   || require('express');
    app             = options.app       || express();
    baseDirectory   = options.baseDirectory;
    verbose         = options.verbose;

    cacheDirectory          = options.cacheDirectory        || path.join(baseDirectory, 'cache');
    configsDirectory        = options.configsDirectory      || path.join(baseDirectory, 'configs');
    middlewaresDirectory    = options.middlewaresDirectory  || path.join(baseDirectory, 'middlewares');
    publicDirectory         = options.publicDirectory       || path.join(baseDirectory, 'public');
    viewsDirectory          = options.viewsDirectory        || path.join(baseDirectory, 'views');

    startupFile             = options.startupFile           || path.join(baseDirectory, 'startup.js');




    return BB
        .try(function() {
            verbose && console.log(chalk.green('> getting configs'));
            return getConfigs(nodeEnv, configsDirectory, verbose);
        })
        .then(function(configs) {
            configs.app = app;
            configs.express = express;
            _.extend(storedConfigs, configs);
        })
        .then(function() {
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({ extended: false }));
        })
        .then(function() {
            app.set('views', viewsDirectory);
            app.set('view engine', 'jade');
            verbose && console.log(chalk.green('> setup jade template engine'));

            app.use(staticCache.configure({
                app         : app,
                express     : express,
                cacheDir    : cacheDirectory,
                verbose     : verbose,
                dev         : ! storedConfigs.optimize
            }));
            verbose && console.log(chalk.green('> setup static file cache'));

            verbose && console.log(chalk.green('> public directory'), publicDirectory);
            app.use(express.static(publicDirectory));

        })
        .then(checkIfFile(startupFile)
        .then(function(isFile) {
            if (isFile) {
                verbose && console.log(chalk.green('> calling startup file'));
                return require(startupFile)(storedConfigs, app);
            } else {
                verbose && console.log(chalk.green('> not calling startup file'));
            }
        })
        .then(function() {
            app.use(express.static(publicDirectory));
        })
        .then(checkIfFile(baseDirectory, 'assets.json'))
        .then(function(isFile) {
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
        .then(function() {
            routesFilePath  = path.join(baseDirectory, 'routes.json');
            routes          = require(routesFilePath);
            verbose && console.log(chalk.green('> routes file:'), routesFilePath);
            createRoutes({
                app         : app,
                express     : express,
                routes      : routes,
                middlewares  : middlewaresDirectory
            });
        })
        .then(checkIfFile(baseDirectory, 'waitFor.js'))
        .then(function(isFile) {
            if (isFile) {
                verbose && console.log(chalk.green('> calling waitFor file'));
                return require(path.join(baseDirectory, 'waitFor'))(storedConfigs, app);
            } else {
                verbose && console.log(chalk.green('> not calling waitFor file'));
            }
        })
        .then(function() {
            var port = storedConfigs.port || DEFAULT_PORT;
            app.listen(port);
            console.log(chalk.green('> express app listening on port:'), port);
        })
        .then(function() {
            return storedConfigs;
        });
}

function checkIfFile(filePath) {
    return function() {
        return fs
            .lstatAsync(filePath)
            .then(function() {
                return true;
            })
            .catch(function() {
                return false;
            });
    };
}
