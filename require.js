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
    function flatDeferred() {
        var result = {};
        result.promise = new Promise(function(resolve, reject) {
            result.resolve = resolve;
            result.reject = reject;
        });
        return result;
    }
    function loadDep(dep) {
        var deferred = flatDeferred();
        deferred.name = dep;
        scriptQueue = scriptQueue.then(function() {
            if(currentRequire) {
                throw new Error('Module '+currentRequire.name+' already loading')
            }
            currentRequire = deferred;
            return config.loader(deferred.name).catch(deferred.reject);
        });
        return deferred.promise;
    }

    function require(deps, factory) {
        function invokeNext(dep, func) {
            return dependencyQueue = dependencyQueue.then(function() {
                dependencyPath.push(dep);
            }).then(func).then(function(result) {
                dependencyPath.pop();
                return result;
            });
        }
        var dependencyQueue = Promise.resolve();
        return Promise.all(deps.map(function(dep) {
            var promise;
            if(dependencyPath.indexOf(dep) > -1) {
                throw new Error('Circular dependency: '+dependencyPath.concat(dep).join(' -> '))
            }
            if(locals[dep]) {
                return locals[dep](currentRequire);
            }
            else if(predefines[dep]) {
                var definition = predefines[dep];
                delete predefines[dep];
                promise = invokeNext(dep, function() {
                    return require.apply(null, definition);
                });
            } else if(!modules[dep]) {
                promise = invokeNext(dep, function() {
                    return loadDep(dep);
                });
            }
            return modules[dep] || (modules[dep] = promise);
        })).then(function(deps) {
            return factory.apply(null, deps)
        }, function(reason) {
            if(reason instanceof Error) {
                console.error(reason.stack);
            }
            return Promise.reject(reason);
        });
    }
    require.config = function(newConfig) {
        config = Object.assign(Object.create(config), newConfig);
    };
    require.toUrl = function(name) {
        var hasExt = name.split('.').length > 1;
        return (config.paths[name] || config.baseUrl + name) + (hasExt ? '' : '.js');
    };
    require.defined = function(name) {
        return !!modules[name];
    };
    require.reset = function() {
        predefines = {};
        dependencyPath = [];
        config = defaultConfig;
        modules = require.modules = {};
        scriptQueue = Promise.resolve();
    };
    var currentRequire, dependencyPath, predefines, config, scriptQueue, modules = require.modules,
        locals = {
            module: function moduleFactory(currentRequire) {
                currentRequire = currentRequire || {};
                return {
                    id: currentRequire.name,
                    uri: currentRequire.url,
                    config: function() {
                        return config.config[currentRequire.name] || {};
                    }
                }
            }
        },
        defaultConfig = {
            baseUrl: '',
            paths: {},
            shim: {},
            config: {},
            loader: function loadScript(name) {
                if(name.indexOf('!') > -1) {
                    var parts = name.split('!'),
                        plugin = parts.shift();
                    name = parts.join('!');
                    var suspendedRequire = currentRequire;
                    currentRequire = null;
                    return require([plugin], function(plugin) {
                        return new Promise(function (resolve, reject) {
                            currentRequire = suspendedRequire;
                            var callback = function(value) {
                                resolve(value);
                                currentRequire.resolve(value);
                                currentRequire = null;
                            };
                            callback.error = function(e) {
                                reject(e);
                                currentRequire.reject(e);
                                currentRequire = null;
                            };
                            callback.fromText = function(scriptText) {
                                (new Function(scriptText))();
                            };
                            plugin.load(name, require, callback, {isBuild: false})
                        })
                    });
                }
                return new Promise(function(resolve, reject) {
                    var el = document.createElement("script");
                    el.onload = function() {
                        if(config.shim[name]) {
                            currentRequire.resolve(global[config.shim[name].exports]);
                            currentRequire = null;
                            delete global[config.shim[name]];
                        }
                        resolve();
                    };
                    el.onerror = reject;
                    el.async = true;
                    el.src = currentRequire.url = require.toUrl(name);
                    document.getElementsByTagName('body')[0].appendChild(el);
                });
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
            var promise = currentRequire;
            currentRequire = null;
            promise.resolve(require(deps, factory));
        } else {
            predefines[name] = [deps, factory];
        }
    };
})(window);
