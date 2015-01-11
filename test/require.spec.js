describe("reqiure", function() {
    it("should require modules", function(done) {
        require(['base/test/fixtures/A', 'base/test/fixtures/B'], function(A, B) {
            expect(A).toBe("module A");
            expect(B).toBe("module B");
            done();
        });
    });

    it("should can predefine modules", function (done) {
        define('C', function() {
            return 'module C';
        });
        require(['C'], function(C) {
            expect(C).toBe('module C');
            done();
        });
    });
});
