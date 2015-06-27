'use strict';

var storedConfigs   = 'Start method must be called before configs are retrieved.',
    routes          = null,
    nodeEnv         = process.env.NODE_ENV || 'dev',
    getConfigs      = require('./getConfigs.js'),
    path            = require('path'),
    createRoutes    = require('express-json-middleware'),
    BB              = require('bluebird'),
    fs              = BB.promisifyAll(require('fs'));

BB.longStackTraces();

module.exports = {
    configs : configs,
    start : start
};

function configs() {
    return storedConfigs;
}

function start(options) {

    var app,
        baseDirectory,
        configsDirectory,
        express,
        middlewaresDirectory,
        publicDirectory,
        routesFilePath,
        verbose,
        viewsDirectory;

    if (!options.baseDirectory) {
        throw new Error('You must pass in an options object that has options.baseDirectory');
    }

    express         = options.express   || require('express');
    app             = options.app       || express();
    baseDirectory   = options.baseDirectory;
    verbose         = options.verbose;

    configsDirectory    = path.join(baseDirectory, 'configs');

    return BB
        .try(function() {
            viewsDirectory = path.join(baseDirectory, 'views');
            app.set('views', viewsDirectory);
            app.set('view engine', 'jade');

            publicDirectory = path.join(baseDirectory, 'public');
            verbose && console.log('public directory', publicDirectory);
            app.use(express.static(publicDirectory));

            middlewaresDirectory = path.join(baseDirectory, 'middlewares');
        })
        .then(function() {
            return getConfigs(nodeEnv, configsDirectory, verbose)
        })
        .then(function(configs) {
            configs.app = app;
            configs.express = express;
            storedConfigs = configs;
        })
        .then(checkIfFile(baseDirectory, 'startup.js'))
        .then(function(isFile) {
            if (isFile) {
                verbose && console.log('calling startup file');
                return require(path.join(baseDirectory, 'startup'))(storedConfigs, app);
            } else {
                verbose && console.log('not calling startup file');
            }
        })
        .then(function() {
            routesFilePath  = path.join(baseDirectory, 'routes.json');
            routes          = require(routesFilePath);
            verbose && console.log('routes file:', routesFilePath);

            // TODO: document this
            app.use(require('express-asset-handler')({
                assetsJson : require(path.join(baseDirectory, 'assets.json')),
                baseAssetsDir : publicDirectory,
                optimize : storedConfigs.optimize,
                optimizedAssetsDir : path.join(publicDirectory, 'optimized'),
                tmpDir : path.join(baseDirectory, 'tmp')
            }));

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
                verbose && console.log('calling waitFor file');
                return require(path.join(baseDirectory, 'waitFor'))(storedConfigs, app);
            } else {
                verbose && console.log('not calling waitFor file');
            }
        })
        .then(function() {
            app.listen(storedConfigs.port);
            console.log('express app listening on port: ', storedConfigs.port);
        })
        .then(function() {
            return storedConfigs;
        });
}

function checkIfFile(baseDirectory, fileName) {
    return function() {
        return fs
            .lstatAsync(path.join(baseDirectory, fileName))
            .then(function(stat) {
                return true;
            })
            .catch(function() {
                return false;
            });
    };
}
