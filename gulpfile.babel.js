import gulp from "gulp";
import {spawn} from "child_process";
import hugoBin from "hugo-bin";
import gutil from "gulp-util";
import flatten from "gulp-flatten";
import postcss from "gulp-postcss";
import cssImport from "postcss-import";
import cssnext from "postcss-cssnext";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";
import responsive from "gulp-responsive";
import cache from "gulp-cache";

const browserSync = BrowserSync.create();

// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, hugoArgsPreview));

// Build/production tasks
gulp.task("build", ["css", "js", "fonts", "img"], (cb) => buildSite(cb, [], "production"));
gulp.task("build-preview", ["css", "js", "fonts", "img"], (cb) => buildSite(cb, hugoArgsPreview, "production"));

gulp.task('greet', function () {
   console.log('Hello world!');
});


// To-do:
// Adjust for other common sizes
//1920px (this covers FullHD screens and up)
//1600px (this will cover 1600px desktops and several tablets in portrait mode, for example iPads at 768px width, which will request a 2x image of 1536px and above)
//1366px (it is the most widespread desktop resolution)
//1024px (1024x768 screens, excluding iPads which are hi-density anyway, are rarer, but I think you need some image size in between, not to leave too big a gap between pixel sizes, in case the market changes)
//768px (useful for 2x 375px mobile screens, as well as any device that actually requests something close to 768px)
//640px (for smartphones)

gulp.task('img', function () {
  return gulp.src('./src/img/**/*.{jpg,png}')
    .pipe(cache(responsive({
      '**/*.jpg': [{
        // Resize all JPG images to 2x  wide
        width: '200%',
        rename: {
          suffix: '@2x',
          extname: '.jpg',
        }
      },
      { // image-640.jpg is 640 pixels wide
        width: 640,
        rename: {
          suffix: '-640',
          extname: '.jpg',
        }
      },
      { // image-640@2x.jpg is 400 pixels wide
        width: 640 * 2,
        rename: {
          suffix: '-640@2x',
          extname: '.jpg',
        }
      },
      { // image-1024.jpg is 1024 pixels wide
        width: 1024,
        rename: {
          suffix: '-1024',
          extname: '.jpg',
        }
      },
       { // image-1024@2x.jpg is 1024*2 pixels wide
        width: 1024 * 2,
        rename: {
          suffix: '-1024@2x',
          extname: '.jpg',
        }
      },
      {
        // image-1920.jpg is 1920 pixels wide
        width: 1920,
        rename: {
          suffix: '-1920',
          extname: '.jpg',
        },
      }, {
        // image-1920@2x.jpg is 1920*2 pixels wide
        width: 1024 * 2,
        rename: {
          suffix: '-1920@2x',
          extname: '.jpg',
        }
      },

      { // image-640.webp is 640 pixels wide
        width: 640,
        rename: {
          suffix: '-640',
          extname: '.webp',
        }
      }, { // image-640@2x.webp is 640 pixels wide
        width: 640 * 2,
        rename: {
          suffix: '-640@2x',
          extname: '.webp',
        }
      },
      {// image-1024.webp is 1024 pixels wide
        width: 1024,
        rename: {
          suffix: '-1024',
          extname: '.webp',
        }
      },
      { // image-1024@2x.webp is 1024*2 pixels wide
        width: 1024 * 2,
        rename: {
          suffix: '-1024@2x',
          extname: '.webp',
        }
      },
      {
        // image-1920.webp is 1920 pixels wide
        width: 1920,
        rename: {
          suffix: '-1920',
          extname: '.webp',
        }
      },
      {
        // image-1920@2x.webp is 1920*2 pixels wide
        width: 1920 * 2,
        rename: {
          suffix: '-1920@2x',
          extname: '.webp',
        }
      }

    ],
      '**/*.png': {
        // Resize all PNG images to 50% of original pixels wide
        width: '50%',
      },
      // Compress all images to save up space
      '**/*.*': {
        //width: 100,
        //rename: { suffix: '-thumbnail' },
      },
    }, {
      // Global configuration for all images
      // The output quality for JPEG, WebP and TIFF output formats
      quality: 70,
      // Use progressive (interlace) scan for JPEG and PNG output
      progressive: true,
      // Zlib compression level of PNG output format
      compressionLevel: 6,
      // Strip all metadata
      withMetadata: false,
      silent: true,      // Don't spam the console
      withoutEnlargement: true,
      skipOnEnlargement: false, // that option copy original file with/without renaming
      errorOnEnlargement: false,
      errorOnUnusedConfig: false

    }) // closing responsive function
    ) //closing cache function
   ) // Closing pipe
    .pipe(gulp.dest('./dist/img'))
    .pipe(gulp.dest('./site/public/img'));
});

// Compile CSS with PostCSS
gulp.task("css", () => (
  gulp.src("./src/css/*.css")
    .pipe(postcss([cssImport({from: "./src/css/main.css"}), cssnext()]))
    .pipe(gulp.dest("./dist/css"))
    .pipe(browserSync.stream())
));

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log("[webpack]", stats.toString({
      colors: true,
      progress: true
    }));
    browserSync.reload();
    cb();
  });
});

// Move all fonts in a flattened directory
gulp.task('fonts', () => (
  gulp.src("./src/fonts/**/*")
    .pipe(flatten())
    .pipe(gulp.dest("./dist/fonts"))
    .pipe(browserSync.stream())
));

// Development server with browsersync
gulp.task("server", ["hugo", "css", "js", "fonts", "img"], () => {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/css/**/*.css", ["css"]);
  gulp.watch("./src/fonts/**/*", ["fonts"]);
  gulp.watch("./site/**/*", ["hugo"]);
});

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, {stdio: "inherit"}).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
