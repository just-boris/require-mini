beforeEach(function () {
    require.resetContext();
    require.config({
        baseUrl: './base/test/fixtures/'
    });
});
afterEach(function () {
    expect(pendingModule).toBeNull();
});

describe("reqiure", function() {
    it("should require modules", function (done) {
        require(['A', 'B'], function (A, B) {
            expect(A).toBe("module A");
            expect(B).toBe("module B");
            setTimeout(done);
        });
    });

    it("should not load same module twice", function (done) {
        spyOn(window, 'loadScript').and.callThrough();
        require(['A'], function (A1) {
            require(['A'], function(A2) {
                expect(A1).toBe(A2);
                expect(A2).toBe("module A");
                expect(window.loadScript.calls.count()).toBe(1);
                setTimeout(done);
            });
        });
    });

    it("should load modules with dependencies", function (done) {
        require(['C'], function (C) {
            expect(C).toBe("module C with module A");
            setTimeout(done);
        });
    });

    it("should can predefine modules", function (done) {
        define('C', function () {
            return 'module C';
        });
        require(['C'], function (C) {
            expect(C).toBe('module C');
            setTimeout(done);
        });
    });

    it("should not load dependencies before require", function (done) {
        define('A', ['B'], function () {
            return 'module A';
        });
        define('B', function () {
            return 'module B';
        });
        require(['A'], function (A) {
            expect(A).toBe('module A');
            setTimeout(done);
        });
    });

    it("loading by shim", function (done) {
        require.config({
            shim: {
                'no-AMD': {
                    init: function() {
                        return window.noAMD
                    }
                },
                'no-AMD-plugin': {
                    deps: ['no-AMD'],
                    exports: 'noAMD.plugin'
                }
            }
        });
        require(['no-AMD-plugin'], function(plugin) {
            expect(plugin).toBe('no-AMD plugin');
            delete window.noAmd;
            done();
        })
    });
});

describe("module locals", function () {
    it("should can inject require", function (done) {
        define('A', ['require'], function(require) {
           return require(['B'], function(B) {return 'A'+B;});
        });
        define('B', function() {
            return 'B'
        });
        require(['A'], function(A) {
            expect(A).toBe('AB');
            done();
        });
    });

    it("should can inject module and its config", function (done) {
        require.config({
            config: {
                'A': 'a message for A'
            }
        });
        define('A', ['module'], function(module) {
            return module;
        });
        require(['A'], function(A) {
            expect(A.id).toBe('A');
            expect(A.config()).toBe('a message for A');
            done();
        });
    });

    it("should return empty object when there is no config", function (done) {
        define('A', ['module'], function(module) {
            return module;
        });
        require(['A'], function(A) {
            expect(A.config()).toEqual({});
            done();
        });
    });

    it("should can export values through exports or module.exports", function (done) {
        define('A', ['module'], function(module) {
            module.exports = 'whole A module'
        });
        define('B', ['exports'], function(exports) {
            exports.name = 'B'
        });
        define('C', ['module', 'exports'], function(module, exports) {
            module.exports.a = 'a';
            exports.b = 'b';
        });
        require(['A', 'B', 'C'], function(A, B, C) {
            expect(A).toBe('whole A module');
            expect(B).toEqual({name: 'B'});
            expect(C).toEqual({a: 'a', b: 'b'});
            done();
        });
    });
});

describe("plugin support", function () {
    it("require-text", function (done) {
        require.config({
            paths: {
                text: '/base/bower_components/requirejs-text/text'
            }
        });
        require(['text!text-module.txt'], function(module) {
            expect(module).toBe('text-content');
            expect(require.specified('text!text-module.txt')).toBeTruthy();
            done();
        });
    });
});

describe('error handling', function() {
    beforeEach(function () {
        spyOn(require, 'onError');
    });
    it("should report about error in load scripts", function (done) {
        var onLoad = jasmine.createSpy('onLoad');
        require(['no-module'], onLoad, function(error) {
            expect(onLoad).not.toHaveBeenCalled();
            expect(error.message).toEqual('Error while loading module "no-module"');
            setTimeout(done, 1);
        });
    });

    it("should detect circular dependency", function (done) {
        define('A', ['B'], function() {});
        define('B', ['C'], function() {});
        define('C', ['A'], function() {});
        var onLoad = jasmine.createSpy('onLoad');
        require(['A'], onLoad, function(error) {
            expect(onLoad).not.toHaveBeenCalled();
            expect(error.message).toMatch('Circular dependency: ');
            setTimeout(done);
        });
    });

    it("should throw exception on unknown defines", function () {
        expect(function() {
            define(function() {});
        }).toThrowError('Unexpected define!');
    });

    it("should not allow to require 'module' on top level", function (done) {
        require(['module'], function () {}, function(error) {
            expect(error.message).toBe('Module "module" should be required only by modules');
            setTimeout(done);
        })
    });
});

describe("utils", function () {

    describe("toUrl", function () {
        it("simple", function () {
            expect(require.toUrl('A')).toBe('./base/test/fixtures/A');
        });

        it("for bundle", function () {
            require.config({
                baseUrl: './js/',
                bundles: {
                    pack: ['A', 'B']
                }
            });
            expect(require.toUrl('A')).toBe('./js/pack');
            expect(require.toUrl('B')).toBe('./js/pack');
            expect(require.toUrl('C')).toBe('./js/C');
        });

        it("with paths", function () {
            require.config({
                paths: {
                    'jQuery': '//yastatic.net/jquery/2.1.3/jquery.min'
                }
            });
            expect(require.toUrl('jQuery')).toBe('//yastatic.net/jquery/2.1.3/jquery.min');
        });

        it("with urlArgs", function () {
            require.config({
                baseUrl: './js/',
                urlArgs: 'v=1.0'
            });
            expect(require.toUrl('A')).toBe('./js/A?v=1.0');
        });
    });

    it("specified", function () {
        expect(require.specified('A')).toBeFalsy();
        define('A', function() {});
        require(['A'], function() {});
        expect(require.specified('A')).toBeTruthy();
    });
});
