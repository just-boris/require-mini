beforeEach(function () {
    require.resetContext();
});
afterEach(function () {
    expect(pendingModule).toBeNull();
});

describe("reqiure", function() {
    it("should require modules", function (done) {
        require(['base/test/fixtures/A', 'base/test/fixtures/B'], function (A, B) {
            expect(A).toBe("module A");
            expect(B).toBe("module B");
            setTimeout(done);
        });
    });

    it("should load modules with dependencies", function (done) {
        require(['base/test/fixtures/C'], function (C) {
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
});

describe('error handling', function() {
    it("should report about error in load scripts", function (done) {
        var onLoad = jasmine.createSpy('onLoad');
        require(['no-module'], onLoad, function(error) {
            expect(onLoad).not.toHaveBeenCalled();
            expect(error.message).toEqual('Error while loading module "no-module"');
            setTimeout(done);
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
});
