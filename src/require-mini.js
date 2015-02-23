(function(global) {
    //= include ../bower_components/es6-promise-polyfill/promise.js
    //= include deepmerge.js
    //= include core.js

    global.define = define;
    global.require = require;
    global.requirejs = require;
})(window);
