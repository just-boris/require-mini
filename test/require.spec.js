beforeEach(function () {
    modules = {};
});
afterEach(function () {
    expect(Object.keys(pendingModules).length).toBe(0);
});

describe("reqiure", function() {
    it("should require modules", function (done) {
        require(['base/test/fixtures/A', 'base/test/fixtures/B'], function (A, B) {
            expect(A).toBe("module A");
            expect(B).toBe("module B");
            done();
        });
    });

    it("should load modules with dependencies", function (done) {
        require(['base/test/fixtures/C'], function (C) {
            expect(C).toBe("module C with module A");
            done();
        });
    });

    it("should can predefine modules", function (done) {
        define('C', function () {
            return 'module C';
        });
        require(['C'], function (C) {
            expect(C).toBe('module C');
            done();
        });
    });
});

describe('error handling', function() {
    it("should report about error in load scripts", function (done) {
        var onLoad = jasmine.createSpy('onLoad');
        require(['no-module'], onLoad, function(error) {
            expect(onLoad).not.toHaveBeenCalled();
            expect(error.message).toEqual('Error while loading module "no-module"');
            done();
        });
    });

    it("should detect circular dependency", function (done) {
        var onLoad = jasmine.createSpy('onLoad');
        require(['base/test/fixtures/circular A'], onLoad, function(error) {
            expect(onLoad).not.toHaveBeenCalled();
            expect(error.message).toMatch('Circular dependency: ');
            done();
        });
    });
});
