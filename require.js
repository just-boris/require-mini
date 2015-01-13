var modules = {},
    pendingModules = {};

function defer() {
    var result = {};
    result.promise = new Promise(function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
    });
    return result;
}

function loadScript(name, path) {
    var deferred = defer(),
        el = document.createElement("script");
    deferred.path = path.concat(name);
    pendingModules[name] = deferred;
    el.onerror = function() {
        delete pendingModules[name];
        deferred.reject(new Error('Error while loading module "'+name+'"'));
    };
    el.async = true;
    el.src = './' + name + '.js';
    document.getElementsByTagName('body')[0].appendChild(el);
    return deferred.promise;
}
function _require(deps, factory, errback, path) {
    return Promise.all(deps.map(function (dependency) {
        if(path.indexOf(dependency) > -1) {
            return Promise.reject(new Error('Circular dependency: '+path.concat(dependency).join(' -> ')));
        }
        if (!modules[dependency]) {
            modules[dependency] = loadScript(dependency, path);
        }
        return modules[dependency];
    })).then(function (modules) {
        return factory.apply(null, modules);
    }, function(reason) {
        if(typeof errback === 'function') {
            errback(reason);
        } else {
            console.error(reason);
        }
        return Promise.reject(reason);
    });
}

function require(deps, factory, errback) {
    return _require(deps, factory, errback, []);
}

function define(name, deps, factory) {
    if(!Array.isArray(deps)) {
        factory = deps;
        deps = [];
    }
    var deferred = pendingModules[name];
    if(deferred) {
        var module = _require(deps, factory, deferred.reject, deferred.path);
        deferred.resolve(module);
        delete pendingModules[name];
    } else {
        modules[name] = _require(deps, factory, null, []);
    }
}
