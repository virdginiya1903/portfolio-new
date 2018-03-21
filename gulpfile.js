const gulp = require('gulp');
const pug = require('gulp-pug');

const sass = require('gulp-sass');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const StyleLint = require('gulp-stylelint');
const plumber = require('gulp-plumber');
const sassGlob = require('gulp-sass-glob');


const del = require('del');

const browserSync = require('browser-sync').create();

const gulpWebpack = require('gulp-webpack');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const eslint = require('gulp-eslint');
const babel = require('gulp-babel');

const imagemin = require('gulp-imagemin');

const ghPages = require('gulp-gh-pages');

//svg
const cheerio = require('gulp-cheerio'); 
const replace = require('gulp-replace');
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');



const paths = {
    root: './build',
    templates: {
        pages: 'src/templates/pages/*.pug',
        src: 'src/templates/**/*.pug',
    },
    styles: {
        src: 'src/styles/**/*.scss',
        dest: 'build/assets/styles/'
    },
    images: {
        src: 'src/images/**/*.*',
        dest: 'build/assets/images/'
    },
    scripts: {
        src: 'src/scripts/**/*.js',
        dest: 'build/assets/scripts/'
    }
}

// pug
function templates() {
    return gulp.src(paths.templates.pages)
        .pipe(pug({ pretty: true }))
        .pipe(gulp.dest(paths.root));
}

// scss
function styles() {
    return gulp.src('./src/styles/app.scss')
        .pipe(plumber())
        .pipe(StyleLint({
            reporters: [
                {formatter: 'string', console: true, fix: true}
            ]
        }))
        .pipe(sourcemaps.init())
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(sourcemaps.write())
        .pipe(rename({suffix: '.min'}))
        .pipe(sassGlob())
        .pipe(gulp.dest(paths.styles.dest))

}

// очистка
function clean() {
    return del(paths.root);
}

// галповский вотчер
function watch() {
    gulp.watch(paths.styles.src, styles);
    gulp.watch(paths.templates.src, templates);
    gulp.watch(paths.images.src, images);
    gulp.watch(paths.scripts.src, scripts);
    gulp.watch(paths.src + 'icons/*.svg', svgSpriteBuild);

}

// локальный сервер + livereload (встроенный)
function server() {
    browserSync.init({
        server: paths.root
    });
    browserSync.watch(paths.root + '/**/*.*', browserSync.reload);
}

// просто переносим картинки
function images() {
    return gulp.src(paths.images.src)
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.jpegtran({progressive: true}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false}
                ]
            })
        ]))
        .pipe(gulp.dest(paths.images.dest));

}

// webpack
function scripts() {
    return gulp.src('src/scripts/app.js')
        .pipe(plumber())
        .pipe(eslint({fix: true}))
        .pipe(eslint.format())
        // .pipe(babel({ presets: ['@babel/env']} ))
        .pipe(gulpWebpack(webpackConfig, webpack))
        .pipe(gulp.dest(paths.scripts.dest));
}

//svg
function svgSpriteBuild() { 
    return gulp.src(paths.src + 'icons/*.svg')
    // minify svg
      .pipe(plumber())
      .pipe(svgmin({
        js2svg: {
          pretty: true
        }
      }))
      .pipe(cheerio({
        run: function ($) {
          $('[fill]').removeAttr('fill');
          $('[stroke]').removeAttr('stroke');
          $('[style]').removeAttr('style');
        },
        parserOptions: {xmlMode: true}
      }))
      .pipe(replace('&gt;', '>'))
      .pipe(svgSprite({
        mode: {
          symbol: {
            sprite: "../sprite.svg",
            render: {
              scss: {
                dest: paths.src + '../_sprite.scss',
                template: paths.src + "scss/templates/_sprite_template.scss"
              }
            }
          }
        }
      }))
      .pipe(gulp.dest(paths.build + 'img/'));
  };
  


//ghPages
gulp.task('deploy', function() {
    return gulp.src('./build/**/*')
        .pipe(ghPages());
});


exports.templates = templates;
exports.styles = styles;
exports.clean = clean;
exports.images = images;
exports.svgSpriteBuild = svgSpriteBuild;




gulp.task('default', gulp.series(
    clean,
    gulp.parallel(styles, templates, images, scripts),
    gulp.parallel(watch, server),
    gulp.parallel(svgSpriteBuild),

));

