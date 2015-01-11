describe("reqiure", function() {
	it("should require modules", function(done) {
		require(['base/test/fixtures/A', 'base/test/fixtures/B'], done);
	});
});
