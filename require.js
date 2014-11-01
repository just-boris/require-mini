/*global Promise */
(function(global) {
    "use strict";
    function flatDeferred() {
        var resolveDep,
            rejectDep,
            promise = new Promise(function(resolve, reject) {
            resolveDep = resolve;
            rejectDep = reject;
        });
        return {
            promise: promise,
            resolve: resolveDep,
            reject: rejectDep
        }
    }
    function loadDep(dep) {
        var deferred = flatDeferred();
        deferred.name = dep;
        if(currentRequire) {
            throw new Error('Module '+currentRequire.name+' already loading')
        }
        currentRequire = deferred;
        require.config.loader(deferred.name).catch(deferred.reject);
        return deferred.promise;
    }
    function require(deps, factory) {
        function invokeNext(dep, func) {
            return loadChain = loadChain.then(function() {
                dependencyPath.push(dep);
            }).then(func).then(function(result) {
                dependencyPath.pop();
                return result
            });
        }
        var loadChain = Promise.resolve();
        return Promise.all(deps.map(function(dep) {
            var promise;
            if(dependencyPath.indexOf(dep) > -1) {
                throw new Error('Circular dependency: '+dependencyPath.concat(dep).join(' -> '))
            }
            if(predefines[dep]) {
                var definition = predefines[dep];
                delete predefines[dep];
                promise = invokeNext(dep, function() {
                    return require.apply(null, definition);
                });
            } else if(!modules[dep]) {
                promise = invokeNext(dep, function () {
                    return loadDep(dep)
                });
            }
            return promise ? (modules[dep] = promise) : modules[dep];
        })).then(function(deps) {
            return factory.apply(null, deps)
        }, function(reason) {
            if(reason instanceof Error) {
                console.error(reason.stack);
            }
            return Promise.reject(reason);
        });
    }
    require.config = {
        baseUrl: '',
        loader: function loadScript(name) {
            return new Promise(function(resolve, reject) {
                var el = document.createElement("script");
                el.onload = resolve;
                el.onerror = reject;
                el.async = true;
                el.src = require.config.baseUrl + name + '.js';
                document.getElementsByTagName('body')[0].appendChild(el);
            });
        }
    };
    require.reset = function() {
        predefines = {};
        dependencyPath = [];
        modules = require.modules = {}
    };
    var currentRequire, dependencyPath, predefines, modules = require.modules;
    require.reset();

    global.require = require;
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
            currentRequire.resolve(require(deps, factory));
            currentRequire = null;
        } else {
            predefines[name] = [deps, factory];
        }
    };
})(window);