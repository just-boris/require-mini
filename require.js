/* istanbul ignore next */
function deepMerge(target, src) {
    var array = Array.isArray(src);
    var dst = array && [] || {};

    if (array) {
        target = target || [];
        dst = dst.concat(target);
        src.forEach(function(e, i) {
            if (typeof dst[i] === 'undefined') {
                dst[i] = e;
            } else if (typeof e === 'object') {
                dst[i] = deepMerge(target[i], e);
            } else {
                if (target.indexOf(e) === -1) {
                    dst.push(e);
                }
            }
        });
    } else {
        if (target && typeof target === 'object') {
            Object.keys(target).forEach(function (key) {
                dst[key] = target[key];
            })
        }
        Object.keys(src).forEach(function (key) {
            if (typeof src[key] !== 'object' || !src[key]) {
                dst[key] = src[key];
            }
            else {
                if (!target[key]) {
                    dst[key] = src[key];
                } else {
                    dst[key] = deepMerge(target[key], src[key]);
                }
            }
        });
    }
    return dst;
}

function getGlobal(value) {
    return value.split('.').reduce(function (obj, prop) {
        return obj && obj[prop];
    }, window);
}

function defer() {
    var result = {};
    result.promise = new Promise(function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}
function invokeLater(context, fn) {
    lastTask = lastTask.then(function() {
        pendingModule = context;
        return fn();
    }).then(cleanup, cleanup);
    function cleanup() {
        pendingModule = null;
    }
}

function loadDep(name, path) {
    if(config.shim[name]) {
        return loadByShim(name, path);
    } else {
        var deferred = defer();
        deferred.name = name;
        deferred.path = path;
        invokeLater(deferred, function() {
            return loadScript(name).catch(function() {
                deferred.reject(new Error('Error while loading module "'+name+'"'));
            });
        });
        return deferred.promise;
    }
}
function loadByShim(name, path) {
    var shim = config.shim[name];
    return _require(shim.deps || [], function() {
        return loadScript(name).then(shim.exportsFn || function() {
            return (shim.init && shim.init()) || getGlobal(shim.exports)
        });
    }, null, path)
}
function loadScript(name) {
    return new Promise(function(resolve, reject) {
        var el = document.createElement("script");
        el.onerror = reject;
        el.onload = resolve;
        el.async = true;
        el.src = toUrl(name, true);
        document.getElementsByTagName('body')[0].appendChild(el);
    });
}

function loadWithPlugin(dependency, path) {
    var index = dependency.indexOf('!'),
        plugin = dependency.substr(0, index);
    dependency = dependency.substr(index+1);
    return _require([plugin], function(plugin) {
        return new Promise(function(resolve, reject) {
            resolve.error = reject;
            resolve.fromText = function(name, text) {
                if(!text) {
                    text = name;
                }
                var previousModule = pendingModule;
                pendingModule = {name: name, resolve: resolve, reject: reject, path: path};
                (new Function(text))();
                pendingModule = previousModule;
            };
            plugin.load(dependency, require, resolve, config);
        });
    }, null, path);
}
function _require(deps, factory, errback, path) {
    var currentModule = path.slice(-1)[0];
    return new Promise(function(resolve, reject) {
        Promise.all(deps.map(function (dependency) {
            if(path.indexOf(dependency) > -1) {
                return Promise.reject(new Error('Circular dependency: '+path.concat(dependency).join(' -> ')));
            }
            var newPath = path.concat(dependency);
            if(locals[dependency]) {
                return locals[dependency](currentModule);
            }
            if(dependency.indexOf('!') > -1) {
                modules[dependency] = loadWithPlugin(dependency, newPath);
            }
            if(predefines[dependency]) {
                modules[dependency] = Promise.resolve().then(function() {
                    return _require.apply(null, predefines[dependency].concat([newPath]));
                });
            }
            else if (!modules[dependency]) {
                modules[dependency] = loadDep(dependency, newPath);
            }
            return modules[dependency];
        })).then(resolve, reject);
    }).then(function (instances) {
        var result = factory.apply(null, instances);
        return currentModule && modules[currentModule].module && modules[currentModule].module.exports || result;
    }, function(reason) {
        if(typeof errback === 'function') {
            errback(reason);
        }
        require.onError(reason);
        return Promise.reject(reason);
    });
}

function require(deps, factory, errback) {
    return _require(deps, factory, errback, []);
}
var modules, predefines, config, lastTask, pendingModule,
    locals = {
        require: function(moduleName) {
            return require;
        },
        module: function(moduleName) {
            var module = modules[moduleName];
            if(!module) {
                throw new Error('Module "module" should be required only by modules')
            }
            return (module.module = module.module || {
                id: moduleName,
                config: function () {
                    return config.config[moduleName] || {};
                }
            });
        },
        exports: function(moduleName) {
            return (locals.module(moduleName).exports = {});
        }
    };
require.resetContext = function() {
    config = {
        urlArgs: '',
        baseUrl: './',
        paths: {},
        shim: {},
        bundles: {},
        config: {}
    };
    modules = {};
    predefines = {};
    lastTask = Promise.resolve();
    pendingModule = null;
};
require.config = function(options) {
    config = deepMerge(config, options);
};

function toUrl(name, appendJS) {
    var bundle = Object.keys(config.bundles).filter(function(bundle) {
        return config.bundles[bundle].indexOf(name) > -1;
    })[0];
    if(bundle) {
        return require.toUrl(bundle);
    }
    if(config.paths[name]) {
        name = config.paths[name];
    }
    if(!/^([\w\+\.\-]+:)?\//.test(name)) {
        name = config.baseUrl + name;
    }
    if(appendJS) {
        name += '.js';
    }
    if(config.urlArgs) {
        name += '?'+config.urlArgs;
    }
    return name;
}

require.toUrl = function(name) {
    return toUrl(name, false);
};
require.specified = function(name) {
    return modules.hasOwnProperty(name);
};
require.onError = function(reason) {
    console.error(reason);
};

require.resetContext();

function define(name, deps, factory) {
    if(typeof name !== 'string') {
        factory = deps;
        deps = name;
        name = null;
    }
    if(!Array.isArray(deps)) {
        factory = deps;
        deps = [];
    }
    var deferred = pendingModule;
    if(name === null && !deferred) {
        throw new Error('Unexpected define!');
    } else if (name === null || deferred && deferred.name === name) {
        var module = _require(deps, factory, deferred.reject, deferred.path);
        deferred.resolve(module);
    } else {
        predefines[name] = [deps, factory, null];
    }
}
define.amd = {};
