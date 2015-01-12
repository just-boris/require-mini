define('base/test/fixtures/C', ['base/test/fixtures/A'], function(A) {
    return 'module C with ' + A;
});
