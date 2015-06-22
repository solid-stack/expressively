'use strict';

var path    = require('path'),
    _       = require('lodash'),
    BB      = require('bluebird'),
    fs      = BB.promisifyAll(require('fs'));

module.exports = getConfigs;

function getConfigs(nodeEnv, configsDir, verbose) {

    var varsPath = path.join(configsDir, 'vars', nodeEnv + '.json'),
        vars = require(varsPath);

    vars.env = nodeEnv;

    verbose && console.log('building configs:', configsDir);
    return fs
        .readdirAsync(configsDir)
        .map(function(fileName) {
            fileName = path.join(configsDir, fileName);
            verbose && console.log('reading file:', fileName);
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
        .map(function(config) {
            return config;
        })
        .reduce(function (configs, config) {
            return _.extend(configs, config);
        }, {})
        .then(function(configs) {
            verbose && console.log('node evn:', nodeEnv);
            configs.env = nodeEnv;
            return configs;
        });
}