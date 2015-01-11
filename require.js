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

function loadScript(name) {
    var deferred = defer(),
        el = document.createElement("script");
    pendingModules[name] = deferred;
    el.onerror = deferred.reject;
    el.async = true;
    el.src = './' + name + '.js';
    document.getElementsByTagName('body')[0].appendChild(el);
    return deferred.promise;
}
function require(deps, factory) {
    return Promise.all(deps.map(function (dependency) {
        if (!modules[dependency]) {
            modules[dependency] = loadScript(dependency);
        }
        return modules[dependency];
    })).then(function (modules) {
        return factory.apply(null, modules);
    });
}

function define(name, factory) {
    var module = factory();
    if(pendingModules[name]) {
        pendingModules[name].resolve(module);
        delete pendingModules[name];
    } else {
        modules[name] = module;
    }
}
