/*global Promise */
(function(global) {
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
        function callback() {
            if(loadQueue.length > 0) {
                var deferred = loadQueue.shift();
                requirePath.push(deferred);
                require.config.loader(deferred.name).then(function () {
                    callback()
                }, deferred.reject);
            }
        }
        var deferred = flatDeferred();
        deferred.name = dep;
        loadQueue.push(deferred);
        if(loadQueue.length === 1) {
            callback();
        }
        return deferred.promise;
    }
    function require(deps, factory) {
        function invokeNext(func) {
            return loadChain = loadChain.then(func);
        }
        var loadChain = Promise.resolve();
        return Promise.all(deps.map(function(dep) {
            var promise;
            if(predefines[dep]) {
                var definition = predefines[dep];
                delete predefines[dep];
                promise = invokeNext(function() {
                    return require.apply(null, definition);
                });
            } else if(!modules[dep]) {
                promise = invokeNext(function () {
                    return loadDep(dep)
                });
            }
            return promise ? (modules[dep] = promise) : modules[dep];
        })).then(function(deps) {
            return factory.apply(null, deps)
        }, function(reason) {
            if(reason instanceof Error) {
                reason = reason.stack;
            }
            console.error(reason);
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
    var loadQueue = [],
        requirePath = [],
        predefines = {},
        modules = require.modules = {};

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
        if(name === null && requirePath.length === 0) {
            throw new Error('Unexpected define!');
        }
        var lastReq = requirePath.slice(-1)[0];
        if (lastReq && (lastReq.name == name || !name)) {
            lastReq.resolve(require(deps, factory).then(function (dep) {
                requirePath.pop();
                return dep;
            }));
        } else {
            predefines[name] = [deps, factory];
        }
    };
})(window);