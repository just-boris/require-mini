var gulp = require('gulp');
var runSequence = require('run-sequence');
var del = require('del');
var jshint = require('gulp-jshint');
var include = require('gulp-include');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var karma = require('karma').server;

var buildTarget = 'dest';

gulp.task('clean', function(done) {
    del(buildTarget, done);
});

gulp.task('lint', function() {
    return gulp.src(['src/**/*.js', 'test/**/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('build', function() {
    return gulp.src('src/require-mini.js')
        .pipe(include())
        .pipe(gulp.dest(buildTarget))
        .pipe(sourcemaps.init())
        .pipe(uglify({compress: {unsafe: true}}))
        .pipe(sourcemaps.write('./'))
        .pipe(rename(function(path) {
            if(path.extname === '.js') {
                path.basename += '.min';
            }
        }))
        .pipe(gulp.dest(buildTarget));
});

gulp.task('test', [], function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done);
});

gulp.task('test-server', [], function () {
    karma.start({
        configFile: __dirname + '/karma.conf.js'
    }, done);
});

gulp.task('default', function(done) {
    runSequence('clean', 'lint', 'build', 'test', done);
});
