/*global Promise */
if (!Object.assign) {
    Object.defineProperty(Object, "assign", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function(target, firstSource) {
            "use strict";
            if (target === undefined || target === null)
                throw new TypeError("Cannot convert first argument to object");
            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource === undefined || nextSource === null) continue;
                var keysArray = Object.keys(Object(nextSource));
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) to[nextKey] = nextSource[nextKey];
                }
            }
            return to;
        }
    });
}
(function(global) {
    "use strict";
    function makeDeferred() {
        var result = {};
        result.promise = new Promise(function(resolve, reject) {
            result.resolve = resolve;
            result.reject = reject;
        });
        return result;
    }
    function errorHandler(reason) {
        if(reason instanceof Error) {
            console.error(reason.stack);
        }
        return Promise.reject(reason);
    }
    function invokeQueue(context, func) {
        return scriptQueue = scriptQueue.then(function() {
            currentRequire = context;
            return func();
        }).then(function() {
            currentRequire = null;
        }, errorHandler);
    }
    function loadDep(dep, path) {
        var deferred = makeDeferred();
        deferred.name = dep;
        deferred.path = path;
        if(dep.indexOf('!') > -1) {
            loadByPlugin(deferred);
        } else {
            loadScript(deferred);
        }
        return deferred.promise;
    }
    function loadByPlugin(deferred) {
        var parts = deferred.name.split('!'),
            plugin = parts.shift();
        deferred.name = parts.join('!');
        return require([plugin], function(plugin) {
            return new Promise(function (resolve, reject) {
                var callback = function(value) {
                    deferred.resolve(value);
                    resolve(value);
                };
                callback.error = function(e) {
                    deferred.reject(e);
                    reject(e);
                };
                callback.fromText = function(scriptText) {
                    return invokeQueue(deferred, function() {
                        (new Function(scriptText))();
                    });
                };
                plugin.load(deferred.name, locals.require(), callback, {isBuild: false})
            });
        });
    }
    function loadScript(deferred) {
        return invokeQueue(deferred, function() {
            return new Promise(function(resolve, reject) {
                var el = document.createElement("script");
                el.onload = function() {
                    if(config.shim[deferred.name]) {
                        currentRequire.resolve(global[config.shim[deferred.name].exports]);
                    }
                    resolve();
                };
                el.onerror = function(e) {
                    deferred.reject(e);
                    reject(e);
                };
                el.async = true;
                el.src = currentRequire.url = require.toUrl(deferred.name);
                document.getElementsByTagName('body')[0].appendChild(el);
            });
        });
    }

    function _require(deps, factory, path) {
        return Promise.all(deps.map(function(dep) {
            if(locals[dep]) {
                return locals[dep](currentRequire || {name: path.slice(-1)[0]});
            }
            else {
                if(path.indexOf(dep) > -1) {
                    return Promise.reject(new Error('Circular dependency: '+path.concat(dep).join(' -> ')));
                }
                var newPath = path.concat(dep);
                if(predefines[dep]) {
                    var definition = predefines[dep].concat([newPath]);
                    delete predefines[dep];
                    modules[dep] = _require.apply(null, definition);
                } else if(!modules[dep]) {
                    modules[dep] = loadDep(dep, newPath);
                }
                return modules[dep];
            }
        })).then(function(deps) {
            return typeof factory === 'function' ? factory.apply(null, deps) : factory;
        }, errorHandler);
    }
    function require(deps, factory) {
        return _require(deps, factory, []);
    }
    require.config = function(newConfig) {
        config = Object.assign(Object.create(config), newConfig);
    };
    require.toUrl = function(name) {
        var hasExt = name.split('.').length > 1;
        return (config.paths[name] || config.baseUrl + name) + (hasExt ? '' : '.js');
    };
    require.reset = function() {
        predefines = {};
        config = {
            baseUrl: './',
            paths: {},
            shim: {},
            config: {}
        };
        modules = require.modules = {};
        scriptQueue = Promise.resolve();
    };
    var currentRequire, predefines, config, scriptQueue, modules,
        locals = {
            module: function moduleFactory(currentRequire) {
                return {
                    id: currentRequire.name,
                    uri: currentRequire.url,
                    config: function() {
                        return config.config[currentRequire.name] || {};
                    }
                }
            },
            require: function requireFactory() {
                return require;
            }
        };
    require.reset();

    global.requirejs = global.require = require;
    global.define = function define(name, deps, factory) {
        if(typeof name !== 'string') {
            factory = deps;
            deps = name;
            name = null;
        }
        if(!Array.isArray(deps)) {
            factory = deps;
            deps = [];
        }
        if(name === null && !currentRequire) {
            throw new Error('Unexpected define!');
        }
        if (currentRequire && (currentRequire.name == name || !name)) {
            currentRequire.resolve(_require(deps, factory, currentRequire.path));
        } else {
            predefines[name] = [deps, factory];
        }
    };
    //can't assert this now, because we have differences in some things
    //define.amd = {};
})(window);
