const fs = require('fs');
const gulp = require('gulp');
const concat = require('gulp-concat');
const insert = require('gulp-insert');
const UglifyJS = require("uglify-js");
const babel = require("babel-core");
const babelOptions = {
  "minified": true,
  "comments": false,
  "presets": [
    ["env", {
      "targets": {
        "ie": 9
      },
      "modules": false,
      "loose": false
    }]
  ]
};

const readFileAndUglify = (path) =>{
  var result = UglifyJS.minify(fs.readFileSync(path, {encoding: 'utf8'}));
  if (result.error) {
    throw Error (result.error);
  }
  return result.code;
}
const transformFileSync = (path) => {
  var result = UglifyJS.minify(babel.transformFileSync(path, babelOptions).code);
  if (result.error) {
    throw Error (result.error);
  }
  return result.code;
};


// deps
gulp.task('deps', function(){
  return gulp.src([
      'node_modules/jquery/dist/jquery.slim.min.js',
      'node_modules/eventemitter3/umd/eventemitter3.min.js',
      'node_modules/js-sha3/build/sha3.min.js',
      'node_modules/localforage/dist/localforage.min.js',
      'node_modules/async/dist/async.min.js'
    ])
    .pipe(concat('filetable.deps.js'))
    .pipe(gulp.dest('dist/'));
});

// build
gulp.task('build', function(){
  return gulp.src([
      'empty'
    ])
    .pipe(insert.append(transformFileSync('index.js')))
    .pipe(concat('filetable.min.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('default', [
  'deps', 'build'
]);
