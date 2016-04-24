var gulp = require('gulp')
var coffee = require('gulp-coffee')
var ect = require('gulp-ect')
var less = require('gulp-less')

gulp.task('default', ['build'])

gulp.task('build', ['server', 'client', 'main', 'lib'])

gulp.task('main', function() {
  return gulp.src('wars.js')
    .pipe(gulp.dest('build'));
});
gulp.task('lib', function() {
  return gulp.src('lib/**/*')
    .pipe(gulp.dest('build/lib'));
});
gulp.task('server', function() {
  return gulp.src('server/**/*')
    .pipe(gulp.dest('build/server'));
});

gulp.task('client', ['client-coffee', 'client-less', 'client-ect', 'client-static', 'client-gamenode']);

gulp.task('client-coffee', function() {
  return gulp.src('client/src/*.coffee')
    .pipe(coffee())
    .pipe(gulp.dest('build/client'));
});
gulp.task('client-less', function() {
  return gulp.src('client/less/*.less')
    .pipe(less())
    .pipe(gulp.dest('build/client'));
});
gulp.task('client-ect', function() {
  return gulp.src('client/template/*.ect')
    .pipe(ect())
    .pipe(gulp.dest('build/client'));
});
gulp.task('client-static', function() {
  return gulp.src('client/static/**/*')
    .pipe(gulp.dest('build/client'));
});
gulp.task('client-gamenode', function() {
  return gulp.src('lib/gamenode/web/**/*')
    .pipe(gulp.dest('build/client/gamenode'));
});
