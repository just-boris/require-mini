var modules = {};

function loadScript(name) {
    return new Promise(function (resolve, reject) {
        var el = document.createElement("script");
        el.onload = resolve;
        el.onerror = reject;
        el.async = true;
        el.src = './' + name + '.js';
        document.getElementsByTagName('body')[0].appendChild(el);
    });
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
