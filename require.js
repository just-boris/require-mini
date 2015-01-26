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

function loadScript(name, path) {
    var deferred = defer();
    deferred.name = name;
    deferred.path = path;
    invokeLater(deferred, function() {
        return new Promise(function(resolve, reject) {
            var el = document.createElement("script");
            el.onerror = function() {
                reject();
                deferred.reject(new Error('Error while loading module "'+name+'"'));
            };
            el.onload = resolve;
            el.async = true;
            el.src = toUrl(name, true);
            document.getElementsByTagName('body')[0].appendChild(el);
        });
    });
    return deferred.promise;
}
function _require(deps, factory, errback, path) {
    return Promise.all(deps.map(function (dependency) {
        if(path.indexOf(dependency) > -1) {
            return Promise.reject(new Error('Circular dependency: '+path.concat(dependency).join(' -> ')));
        }
        var newPath = path.concat(dependency);
        if(predefines[dependency]) {
            modules[dependency] = _require.apply(null, predefines[dependency].concat([newPath]))
        }
        else if (!modules[dependency]) {
            modules[dependency] = loadScript(dependency, newPath);
        }
        return modules[dependency];
    })).then(function (modules) {
        return factory.apply(null, modules);
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
var modules, predefines, lastTask, pendingModule;
require.resetContext = function() {
    modules = {};
    predefines = {};
    lastTask = Promise.resolve();
    pendingModule = null;
};

function toUrl(name, appendJS) {
    return './' + name + (appendJS ? '.js' : '');
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
