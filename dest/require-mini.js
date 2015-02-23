(function(global) {
    (function(global){
    
    //
    // Check for native Promise and it has correct interface
    //
    
    var NativePromise = global['Promise'];
    var nativePromiseSupported =
      NativePromise &&
      // Some of these methods are missing from
      // Firefox/Chrome experimental implementations
      'resolve' in NativePromise &&
      'reject' in NativePromise &&
      'all' in NativePromise &&
      'race' in NativePromise &&
      // Older version of the spec had a resolver object
      // as the arg rather than a function
      (function(){
        var resolve;
        new NativePromise(function(r){ resolve = r; });
        return typeof resolve === 'function';
      })();
    
    
    //
    // export if necessary
    //
    
    if (typeof exports !== 'undefined' && exports)
    {
      // node.js
      exports.Promise = Promise || NativePromise;
    }
    else
    {
      // in browser add to global
      if (!nativePromiseSupported)
        global['Promise'] = Promise;
    }
    
    
    //
    // Polyfill
    //
    
    var PENDING = 'pending';
    var SEALED = 'sealed';
    var FULFILLED = 'fulfilled';
    var REJECTED = 'rejected';
    var NOOP = function(){};
    
    // async calls
    var asyncSetTimer = typeof setImmediate !== 'undefined' ? setImmediate : setTimeout;
    var asyncQueue = [];
    var asyncTimer;
    
    function asyncFlush(){
      // run promise callbacks
      for (var i = 0; i < asyncQueue.length; i++)
        asyncQueue[i][0](asyncQueue[i][1]);
    
      // reset async asyncQueue
      asyncQueue = [];
      asyncTimer = false;
    }
    
    function asyncCall(callback, arg){
      asyncQueue.push([callback, arg]);
    
      if (!asyncTimer)
      {
        asyncTimer = true;
        asyncSetTimer(asyncFlush, 0);
      }
    }
    
    
    function invokeResolver(resolver, promise) {
      function resolvePromise(value) {
        resolve(promise, value);
      }
    
      function rejectPromise(reason) {
        reject(promise, reason);
      }
    
      try {
        resolver(resolvePromise, rejectPromise);
      } catch(e) {
        rejectPromise(e);
      }
    }
    
    function invokeCallback(subscriber){
      var owner = subscriber.owner;
      var settled = owner.state_;
      var value = owner.data_;  
      var callback = subscriber[settled];
      var promise = subscriber.then;
    
      if (typeof callback === 'function')
      {
        settled = FULFILLED;
        try {
          value = callback(value);
        } catch(e) {
          reject(promise, e);
        }
      }
    
      if (!handleThenable(promise, value))
      {
        if (settled === FULFILLED)
          resolve(promise, value);
    
        if (settled === REJECTED)
          reject(promise, value);
      }
    }
    
    function handleThenable(promise, value) {
      var resolved;
    
      try {
        if (promise === value)
          throw new TypeError('A promises callback cannot return that same promise.');
    
        if (value && (typeof value === 'function' || typeof value === 'object'))
        {
          var then = value.then;  // then should be retrived only once
    
          if (typeof then === 'function')
          {
            then.call(value, function(val){
              if (!resolved)
              {
                resolved = true;
    
                if (value !== val)
                  resolve(promise, val);
                else
                  fulfill(promise, val);
              }
            }, function(reason){
              if (!resolved)
              {
                resolved = true;
    
                reject(promise, reason);
              }
            });
    
            return true;
          }
        }
      } catch (e) {
        if (!resolved)
          reject(promise, e);
    
        return true;
      }
    
      return false;
    }
    
    function resolve(promise, value){
      if (promise === value || !handleThenable(promise, value))
        fulfill(promise, value);
    }
    
    function fulfill(promise, value){
      if (promise.state_ === PENDING)
      {
        promise.state_ = SEALED;
        promise.data_ = value;
    
        asyncCall(publishFulfillment, promise);
      }
    }
    
    function reject(promise, reason){
      if (promise.state_ === PENDING)
      {
        promise.state_ = SEALED;
        promise.data_ = reason;
    
        asyncCall(publishRejection, promise);
      }
    }
    
    function publish(promise) {
      promise.then_ = promise.then_.forEach(invokeCallback);
    }
    
    function publishFulfillment(promise){
      promise.state_ = FULFILLED;
      publish(promise);
    }
    
    function publishRejection(promise){
      promise.state_ = REJECTED;
      publish(promise);
    }
    
    /**
    * @class
    */
    function Promise(resolver){
      if (typeof resolver !== 'function')
        throw new TypeError('Promise constructor takes a function argument');
    
      if (this instanceof Promise === false)
        throw new TypeError('Failed to construct \'Promise\': Please use the \'new\' operator, this object constructor cannot be called as a function.');
    
      this.then_ = [];
    
      invokeResolver(resolver, this);
    }
    
    Promise.prototype = {
      constructor: Promise,
    
      state_: PENDING,
      then_: null,
      data_: undefined,
    
      then: function(onFulfillment, onRejection){
        var subscriber = {
          owner: this,
          then: new this.constructor(NOOP),
          fulfilled: onFulfillment,
          rejected: onRejection
        };
    
        if (this.state_ === FULFILLED || this.state_ === REJECTED)
        {
          // already resolved, call callback async
          asyncCall(invokeCallback, subscriber);
        }
        else
        {
          // subscribe
          this.then_.push(subscriber);
        }
    
        return subscriber.then;
      },
    
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    
    Promise.all = function(promises){
      var Class = this;
    
      if (!Array.isArray(promises))
        throw new TypeError('You must pass an array to Promise.all().');
    
      return new Class(function(resolve, reject){
        var results = [];
        var remaining = 0;
    
        function resolver(index){
          remaining++;
          return function(value){
            results[index] = value;
            if (!--remaining)
              resolve(results);
          };
        }
    
        for (var i = 0, promise; i < promises.length; i++)
        {
          promise = promises[i];
    
          if (promise && typeof promise.then === 'function')
            promise.then(resolver(i), reject);
          else
            results[i] = promise;
        }
    
        if (!remaining)
          resolve(results);
      });
    };
    
    Promise.race = function(promises){
      var Class = this;
    
      if (!Array.isArray(promises))
        throw new TypeError('You must pass an array to Promise.race().');
    
      return new Class(function(resolve, reject) {
        for (var i = 0, promise; i < promises.length; i++)
        {
          promise = promises[i];
    
          if (promise && typeof promise.then === 'function')
            promise.then(resolve, reject);
          else
            resolve(promise);
        }
      });
    };
    
    Promise.resolve = function(value){
      var Class = this;
    
      if (value && typeof value === 'object' && value.constructor === Class)
        return value;
    
      return new Class(function(resolve){
        resolve(value);
      });
    };
    
    Promise.reject = function(reason){
      var Class = this;
    
      return new Class(function(resolve, reject){
        reject(reason);
      });
    };
    
    })(new Function('return this')());
    

    /* brought from https://github.com/KyleAMathews/deepmerge and unwrapped from UMD */
    function deepmerge(target, src) {
        var array = Array.isArray(src);
        var dst = array && [] || {};
    
        if (array) {
            target = target || [];
            dst = dst.concat(target);
            src.forEach(function(e, i) {
                if (typeof dst[i] === 'undefined') {
                    dst[i] = e;
                } else if (typeof e === 'object') {
                    dst[i] = deepmerge(target[i], e);
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
                });
            }
            Object.keys(src).forEach(function (key) {
                if (typeof src[key] !== 'object' || !src[key]) {
                    dst[key] = src[key];
                }
                else {
                    if (!target[key]) {
                        dst[key] = src[key];
                    } else {
                        dst[key] = deepmerge(target[key], src[key]);
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
                return (shim.init && shim.init()) || getGlobal(shim.exports);
            });
        }, null, path);
    }
    function loadScript(name) {
        return new Promise(function(resolve, reject) {
            var el = require.load(null, name, toUrl(name, true));
            el.onerror = reject;
            el.onload = resolve;
        });
    }
    
    function loadWithPlugin(dependency, path) {
        var index = dependency.indexOf('!'),
            plugin = dependency.substr(0, index);
        dependency = dependency.substr(index+1);
        return _require([plugin], function(plugin) {
            return new Promise(function(resolve, reject) {
                function localRequire() {
                    if(!resolved) {
                        return require.apply(null, arguments);
                    }
                }
                Object.keys(require).forEach(function(key) {
                    localRequire[key] = require[key];
                });
                var resolved = false;
                resolve.error = reject;
                resolve.fromText = function(name, text) {
                    if(!text) {
                        text = name;
                    }
                    var previousModule = pendingModule;
                    pendingModule = {name: name, resolve: resolve, reject: reject, path: path};
                    /* jshint -W054 */
                    (new Function(text))();
                    /* jshint +W054 */
                    pendingModule = previousModule;
                    resolved = true;
                };
                plugin.load(dependency, localRequire, resolve, config);
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
                    throw new Error('Module "module" should be required only by modules');
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
        config = deepmerge(config, options);
    };
    require.load = function (context, name, url) {
        var el = document.createElement("script");
        el.src = url;
        el.async = true;
        document.getElementsByTagName('body')[0].appendChild(el);
        return el;
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
    


    global.define = define;
    global.require = require;
    global.requirejs = require;
})(window);
