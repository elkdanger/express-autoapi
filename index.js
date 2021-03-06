var fs = require('fs');
var path = require('path');
var _ = require('underscore')._;
var utils = require('./util.js');
var chalk = require('chalk');

var defaults = {
    root: '/api',
    debug: false,
    rootModule: 'index'
};

var debugMode = false;

function __log(args) {
    if (debugMode) {
        console.log.apply(null, arguments);
    }
}

/**
 * Processes a list of files and produces the api routing for them
 * @param files The list of files to process
 * @param settings express-autoapi settings
 * @param state The process state
 */
function processFileList(files, base, settings, state) {

    for (var i = 0; i < files.length; i++) {

        var modulePath = path.join(base, files[i]);

        var stats = fs.statSync(modulePath);

        if (stats.isFile()) {

            // Try to load the module
            var module = require(modulePath);            
            var relative = path.relative(settings.source, modulePath);

            __log('Relative path: %s', relative);

            var pathWithoutExtension = relative.substr(0, relative.lastIndexOf('.'));
            var routeName = pathWithoutExtension.replace(/\\/g, '/').replace(/\./g, '_');
            
            var isRoot = new RegExp(settings.rootModule + '/?$', 'g').test(routeName);
            var routePath = routeName;

            // Special case for an index file - put these in the root of the api            
            if (isRoot) {

                if(routePath.lastIndexOf('/') > -1)
                    routePath = routePath.substr(0, routePath.lastIndexOf('/'));
                else
                    routePath = undefined;
            }

            __log('%s (%s)', routeName, routePath);

            var apiPath = utils.combineApiPath(settings.root, routePath);

            state.endpoints[routeName] = {
                baseUrl: apiPath,
                filename: modulePath,
                routeName: routeName
            };

            __log(state.endpoints[routeName]);

            settings.app.use(apiPath, module);
        }
        else if (stats.isDirectory()) {
            var dirFiles = fs.readdirSync(modulePath);
            processFileList(dirFiles, modulePath, settings, state);
        }
    }
}

module.exports = {

    setup: function(settings) {

        settings = _.extend({}, defaults, settings || {});
        debugMode = settings.debug;

        if (!settings.app)
            throw "Express app not specified";

        var loggedSettings = _.extend({}, settings);
        delete loggedSettings.app;
    	__log("Settings: ", loggedSettings);

        if (!settings.source || typeof settings.source != 'string')
            throw "No Api source directory found";

        if (!fs.existsSync(settings.source))
            return;

        var state = {
            endpoints: {},
            settings: settings
        };

        var files = fs.readdirSync(settings.source);

        processFileList(files, settings.source, settings, state);

        return state;
    }
};
