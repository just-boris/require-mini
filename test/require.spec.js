/*jshint jasmine: true */
beforeEach(function () {
    require.reset();
});

describe('resolving', function() {
    it("should define module without factory function", function (done) {
        var A = {module: 'A'};
        define('A', A);

        require(['A'], function(_A) {
            expect(_A).toEqual(A);
            done();
        })
    });

    it('should properly resolve dependencies (synchronously)', function(done) {
        define('A', function() {
            return 'A';
        });

        define('B', ['A'], function(A) {
            return A + 'B';
        });

        define('C', ['A', 'B'], function(A, B) {
            return 'C' + B + A;
        });

        require(['C'], function(C) {
            expect(C).toEqual('CABA');
            done();
        });
    });

    it('should properly resolve dependencies (asynchronously)', function(done) {
        define('A', function() {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve('A');
                }, 10);
            });
        });

        define('B', ['A'], function(A) {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve(A + 'B');
                }, 10);
            });
        });

        define('C', ['A', 'B'], function(A, B) {
            return new Promise(function(resolve) {
                setTimeout(function() {
                    resolve('C' + B + A);
                }, 10);
            });
        });

        require(['C'], function(C) {
            expect(C).toEqual('CABA');
            done();
        });
    });

    it('should properly resolve multiple declarations', function(done) {
        define('A', function() {
            return 'A1';
        });

        define('A', function() {
            return 'A2';
        });

        define('A', function() {
            return 'A3';
        });

        require(['A'], function(A) {
            expect(A).toEqual('A3');
            done();
        });
    });
});

describe('errors', function() {
    it("should trow error on unexpected anonymous define", function () {
        expect(function() {
            define(['A'], function(A) {});
        }).toThrow(new Error('Unexpected define!'))
    });

    it('should throw error on circular dependence', function(done) {
        define('A', ['B'], function() {
            return 'A';
        });

        define('B', ['C'], function() {
            return 'C';
        });

        define('C', ['A'], function() {
            return 'C';
        });

        require(['A'], function() {}).then(function() {
            expect(true).toBe(false, "unexpected success");
            done();
        }, function() {
            done();
        });
    });

    it('should allow to throw custom error', function(done) {
        define('A', function() {
            return Promise.reject(new Error())
        });

        require(['A'], function() {
            expect(true).toBe(false, "unexpected success");
            done();
        }).catch(function(e) {
            done();
        });
    });
});

describe("custom loader", function() {
    beforeEach(function () {
        this.depMap = {};
        var self = this;
        define('test-loader', function() {
            function getDefinition(dep) {
                return self.depMap[dep].map(function(arg) {
                    if(typeof arg === 'function') {
                        return arg.toString();
                    }
                    if(Array.isArray(arg)) {
                        return JSON.stringify(arg);
                    }
                })
            }
            return {
                load: function(dep, require, cb) {
                    setTimeout(function() {
                        cb.fromText('define('+getDefinition(dep)+')');
                    }, 10);
                }
            }
        })
    });

    it("should load modules", function (done) {
        this.depMap = {
            A: [function() {return 'A'}],
            B: [['test-loader!A'], function(A) {
                return new Promise(function(resolve) {
                    resolve(A+'B');
                })
            }],
            C: [['test-loader!A', 'test-loader!B'], function(A, B) {
                return 'C' + B + A;
            }]
        };

        require(['test-loader!C'], function(C) {
            expect(C).toEqual('CABA');
            done();
        });
    });
});

describe("plugins", function () {
    it("should load module through plugins", function (done) {
        define('test-loader', function() {
            var fakeLoad = jasmine.createSpy('fakeLoad').and.callFake(function(dep, req, cb) {
                cb(dep);
            });
            return {
                load: fakeLoad
            };
        });
        require(['test-loader', 'test-loader!A'], function(plugin, A) {
            expect(A).toBe('A');
            expect(plugin.load).toHaveBeenCalled();
            done();
        });
    });

    it("should can report error while loading module through plugin", function (done) {
        define('test-loader', function() {
            return {
                load: function(dep, req, cb) {
                    return cb.error('Error while loading ' + dep)
                }
            };
        });
        require(['test-loader!A'], function() {}).catch(function(e) {
            expect(e).toBe('Error while loading A');
            done();
        });
    });
});
describe("url builder", function () {
    it("should apply custom base url", function () {
        require.config({
            baseUrl: './modules/'
        });
        expect(require.toUrl('A')).toBe('./modules/A.js');
    });

    it("should load plugin from custom path", function () {
        require.config({
            paths: {
                A: 'http://cdn/with/A'
            }
        });
        expect(require.toUrl('A')).toBe('http://cdn/with/A.js');
    });

    it("should not add extension when it is already there", function () {
        expect(require.toUrl('A.json')).toBe('./A.json');
    });
});

describe("local module", function () {
    it("should pass module config inside", function (done) {
        define('A', ['module'], function(module) {
            return module;
        });

        require(['A'], function(moduleA) {
            expect(moduleA.id).toBe('A');
            done();
        });
    });

    it("should add module config", function (done) {
        require.config({
            config: {
                A: {key: 'value'}
            }
        });

        define('A', ['module'], function(module) {
            return module;
        });

        require(['A'], function(moduleA) {
            expect(moduleA.config()).toEqual({key: 'value'});
            done();
        });
    });
});
