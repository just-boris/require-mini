module.exports = function(config) {
  var options = {
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      'require.js',
      'test/*.spec.js',
      {pattern: 'test/fixtures/**', included: false}
    ],
    reporters: ['progress'],
    port: 9876,
    colors: true,
    autoWatch: true,
    browsers: ['Firefox'],
    singleRun: true
  };
  if(process.env.coverage) {
    options.reporters.push('coverage');
    options.preprocessors = {
      'require.js': ['coverage']
    };
    options.coverageReporter = {
      type : 'html',
      dir : 'coverage/'
    };
  }
  config.set(options);
};
