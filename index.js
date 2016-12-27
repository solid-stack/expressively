'use strict';

const assert = require('assert');

let DEFAULT_PORT    = 4321,
    path            = require('path'),
    join            = path.join,
    http            = require('http'),
    https           = require('https'),
    createRoutes    = require('express-json-middleware'),
    BB              = require('bluebird'),
    fs              = BB.promisifyAll(require('fs')),
    _               = require('lodash'),
    chalk           = require('chalk'),
    bodyParser      = require('body-parser');


module.exports = {
    start : start
};

/**
 *
 * @param options
 *
 * options.app The express app - created if not passed in
 * options.engine - the express view engine used - defaults to pug
 * options.express express itself - created if not passed in
 * options.protocol - if this is 'https', express will handle https - suggested use for dev only
 * options.https.key - used with options.protocol of https
 * options.https.crt - used with options.protocol of https
 * options.staticOptions - options to pass to the express.static call
 * options.structure - object that describes the directory layout for the app - all paths are relative to structure.base
 * options.structure.baseDirectory The directory other directory options are relative to - required
 * options.structure.middlewares Path to the "middlewares" directory use from routes.json
 * options.structure.routes The location of the routes.json file
 * options.structure.static An object of directories to be used for express.static - keys are paths
 * options.structure.startup An array of modules to be rerquired in in series - optionally return promises from them - defaults to []
 * options.structure.views The express "views" directory
 * options.verbose If you want verbose outpout
 *
 */
function start(options) {

    assert(!!options.structure, 'Please pass in options.structure');
    assert(!!options.structure.base, 'Please pass in options.structure.base');

    const verbose = options.verbose || false;
    if (verbose) {
        // TODO: should have separate option for this
        BB.longStackTraces();
    }

    // Not using object.assign, since I don't want to actually call express() if not needed, and options is nested
    options.express = options.express || require('express');
    options.app = options.app || express();
    options.engine = options.engine || 'pug';
    options.staticOptions = options.staticOptions || { maxage : '365d' };
    options.structure.middlewares = options.structure.middlewares || 'middlewares';
    options.structure.routes = options.structure.routes || 'routes.json';
    options.structure.static = options.structure.static || [];
    options.structure.startup = options.structure.startup || [];
    options.structure.views = options.structure.views || 'views';

    let app = options.app;
    let structure = options.structure;

    return BB
        .try(() => {
            verbose && console.log(chalk.green('> add standard bodyParse'));
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({extended : false}));
        })
        .then(() => {
            app.set('views', join(structure.base, structure.views));
            app.set('view engine', options.engine);
            verbose && console.log(chalk.green(`> setup ${options.engine} template engine`));
        })
        .then(() => {
            console.log(chalk.green('> Parsing startups'));
            return BB.map(options.structure.startup, (startup) => {
                console.log(chalk.green(`> starting ${startup}`));
                return require(join(structure.base, startup))();
            });
        })
        .then(() => {
            console.log(chalk.green('> Adding static directories'));

            Object.keys(structure.static).forEach(key => {

                let staticDir = structure.static[key];

                console.log(chalk.green(`> Adding ${staticDir}`));
                // TODO: different static options per dir
                app.use(options.express.static(join(structure.base, staticDir), options.staticOptions));
            });
        })
        .then(() => {
            let routesFilePath = join(structure.base, structure.routes);
            verbose && console.log(chalk.green('> routes file:'), routesFilePath);
            let routes = require(routesFilePath);
            createRoutes({
                app : app,
                express : options.express,
                routes : routes,
                middlewares : join(structure.base, structure.middlewares)
            });
        })
        .then(function () {
            var port = options.port || DEFAULT_PORT,
                server = null;

            // Should only be used for dev
            if(options.protocol === 'https') {
                server = https.createServer({
                    key: fs.readFileSync(path.join(baseDirectory, options.https.key)),
                    cert: fs.readFileSync(path.join(baseDirectory, options.https.cert))
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
                server : server
            };
        });
}
