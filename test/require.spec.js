/*jshint jasmine: true */
beforeEach(function () {
    require.reset();
});

describe('resolving', function() {

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

describe("script loader", function() {
    function createFakeLoader(depMap) {
        require.config({
            loader: function(dep) {
                console.info('requesting: '+dep);
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        define.apply(this, depMap[dep]);
                        resolve();
                    }, 10);
                });
            }
        });
    }

    it("should load modules", function (done) {
        createFakeLoader({
            A: [function() {return 'A'}],
            B: [['A'], function(A) {
                return new Promise(function(resolve) {
                    resolve(A+'B');
                })
            }],
            C: [['A', 'B'], function(A, B) {
                return 'C' + B + A;
            }]
        });

        require(['C'], function(C) {
            expect(C).toEqual('CABA');
            done();
        });
    });

});
