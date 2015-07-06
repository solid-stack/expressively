'use strict';

var path    = require('path'),
    _       = require('lodash'),
    BB      = require('bluebird'),
    fs      = BB.promisifyAll(require('fs')),
    chalk   = require('chalk');

module.exports = getConfigs;

function getConfigs(nodeEnv, configsDir, verbose) {

    var vars = null;
    return BB
        .try(function() {

            var varsPath = path.join(configsDir, 'vars', nodeEnv + '.json');

            vars = require(varsPath);
            vars.env = nodeEnv;

            verbose && console.log(chalk.green('> building configs:'), configsDir);
        })
        .catch(function(error) {
            console.log(chalk.red('> configuration building error:\n'), error);
            console.log(chalk.yellow('> if you are not using configs, ignore the error above'));
            console.log(chalk.yellow('> returning empty object'));
            vars = {};
        })
        .then(function() {
            return fs.readdirAsync(configsDir);
        })
        .map(function(fileName) {
            fileName = path.join(configsDir, fileName);
            verbose && console.log(chalk.green('> reading file:'), fileName);
            if ('.json' === path.extname(fileName)) {
                return fs.readFileAsync(fileName);
            }
        })
        .then(function(contents) {
            return _.compact(contents);
        })
        .map(function(content) {
            return JSON.parse(_.template(content)(vars));
        })
        .reduce(function (configs, config) {
            return _.extend(configs, config);
        }, {})
        .then(function(configs) {
            verbose && console.log(chalk.green('> node env:'), nodeEnv);
            configs.env = nodeEnv;
            return configs;
        })
        .catch(function(error) {
            console.log(chalk.red('> configuration templating error:\n', error));
            console.log(chalk.yellow('> if you are not using configs, ignore the error above'));
            console.log(chalk.yellow('> returning empty object'));
            return {};
        });

}