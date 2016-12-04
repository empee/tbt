/*   __ ___.    __    *
 * _/  |\_ |___/  |_  *
 * \   __\ __ \   __\ *
 *  |  | | \_\ \  |   *
 *  |__| |___  /__|   *
 * (c)toyboy \/ 2016  */
var uglify = require('uglify-js');
var tbt = require('../');

module.exports = function (files, options) {
  if (!options) options = {};

  if (options.tbt) {
    tbt = options.tbt;
  }

  if (options.clone) {
    tbt.clone = options.clone;
  }

  if (options.helpers) {
    require(options.helpers)(tbt);
  }

  files.forEach(function (file) {
    tbt.compile(file.content, file.name);
  });

  var code = tbt.export(options.customLoader);

  if (options.noMinify) {
    var stream = uglify.OutputStream({ beautify: true });
    var ast = uglify.parse(code);
    ast.print(stream);
    return stream.toString();
  } else {
    var options = {
      fromString: true,
      compress: true,
      mangle: {
        except: ['$', '$o'],
      },
    };
    var build = uglify.minify(code, options);
    return build.code;
  }
};
