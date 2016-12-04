/*   __ ___.    __    *
 * _/  |\_ |___/  |_  *
 * \   __\ __ \   __\ *
 *  |  | | \_\ \  |   *
 *  |__| |___  /__|   *
 * (c)toyboy \/ 2016  */
(function (root, mod) {
  if (typeof module === 'object' && module.exports) {
    module.exports = mod._;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return mod._;
    });
  } else {
    if (root.tbt) {
      root.tbt.load(mod.$);
    } else {
      root.tbt = mod._;
    }
  }
})(this, (function () {
  /*
   * Our cache
   * $ prefixed are helpers
   * $ surrounded are partials
   * others are normal templates
   */
  var $ = {};

  /*
   * Gets a template from cache
   * If not found tries to fetch it
   */
  var tbt = function (name, options, callback, fetched) {
    if (!callback) return;
    var fn = $[name] || undefined;
    if (fn) callback(false, fn.call(tbt.clone ? JSON.parse(JSON.stringify(options)) : options));
    else if (!fetched) return tbt.fetch(name, options, callback);
    else callback(true);
  };

  /*
   * Default settings
   */
  tbt.path = (typeof __dirname === 'undefined') ? '/templates' : __dirname;
  tbt.strip = true;
  tbt.clone = false;

  /*
   * Fetches specified template from tbt.path
   */
  tbt.fetch = function (name, options, callback) {

    /*
     * Most likely a node.js'ish env, try to use fs module to load template
     */
    if (typeof process !== 'undefined' && typeof process.argv !== 'undefined') {
      var tpl = require('fs').readFileSync(tbt.path + '/' + name + '.tbt').toString('utf8');

      if (tbt.compile(tpl, name)) {
        return tbt(name, options, callback, true);
      }

      return callback(true);
    }

    if (typeof XMLHttpRequest === 'undefined') return callback(true);

    /*
     * Most likely in a browser, try to use xmlhttprequest to load template
     */
    var req = new XMLHttpRequest();
    req.open('get', tbt.path + '/' + name + '.tbt?' + Date.now());

    req.addEventListener('load', function () {
      if (req.status === 200 && tbt.compile(req.responseText, name)) {
        return tbt(name, options, callback, true);
      }

      return callback(true);
    });

    req.addEventListener('error', function () {
      callback(true);
    });

    req.addEventListener('abort', function () {
      callback(true);
    });

    req.send();
  };

  /*
   * Compiles a template from string and stores under a defined name
   * If the template only contains partials, it will not be saved since our compiler automatically inserts partials into cache
   */
  tbt.compile = function (string, name) {
    var tpl = compiler(string);
    if (tpl.tpl) return $[name] = tpl.tpl;
    else if (tpl.partials) return true;
    return false;
  };

  /*
   * Loads pre-compiled templates into our template cache
   */
  tbt.load = function ($$) {
    Object.keys($$).forEach(function (name) { $[name] = $$[name]; });
  };

  /*
   * Creates "exported" version of templates, partials and helpers currently in cache
   * Basic exported version doesn't include compiler or internal helpers not used by templates
   * Can be passed custom wrapper as parameter, $ object in the template will be replaced with our cache
   */
  tbt.export = function (exp) {
    var moduleLoader = String(function (root, mod) {
      if (typeof module === 'object' && module.exports) {
        module.exports = mod._;
      } else if (typeof define === 'function' && define.amd) {
        define(function () {
          return mod._;
        });
      } else {
        if (root.tbt) {
          root.tbt.load(mod.$);
        } else {
          root.tbt = mod._;
        }
      }
    });

    var tbtRuntime = String(function () {
      var $ = {};

      var tbt = function (name, options, callback) {
        if (!callback) return;
        return $[name] ?
          callback(false, $[name].call(tbt.clone ? JSON.parse(JSON.stringify(options)) : options)) :
          callback(true);
      };

      tbt.clone = false;

      tbt.load = function ($$) {
        Object.keys($$).forEach(function (name) { $[name] = $$[name]; });
      };

      return { _: tbt, $: $ };
    });

    if (!exp) exp = ('(' + moduleLoader + '(this,(' + tbtRuntime + ')()));');

    var $$ = Object.keys($).map(function (fn) {
      return '"' + fn + '":' + String($[fn]);
    }).join(',');

    return exp.replace(/\$([\s]*)=([\s]*){}/, '$={' + $$ + '}')
              .replace(/clone([\s]*)=([\s]*)(true|false)/, 'clone=' + tbt.clone);
  };

  /*
   * Used to add user defined helpers, helper needs to add itself to $ and prefix it's name by $ if it's a runtime helper!
   */
  tbt.helper = function (name, fn) {
    compiler.helpers[name] = fn;
    return true;
  };

  /*
   * The actual compiler
   * Takes a string (template) as input
   * Outputs compiled template or information that template only included partials
   */
  var compiler = function compiler(template) {
    var root = { type: 'root', nodes: [] };
    var curNode = root;
    var partials = false;

    /*
     * Parses template tag arguments
     * Supports: Strings, Operators, numbers and variables
     */
    var parseArgs = function (args) {
      var oArgs = [];
      args = args.join(' ');
      var re = /((([\<\>\-,;:%+*\/=\!\?\&\|\(\)]){1,3})|("([^"]+)")|('([^']+)')|([\$\@\.\w]+))/g;
      var match;

      while (match = re.exec(args)) {
        if (match[1].match(/("([^"]+)")|('([^']+)')/g))
          oArgs.push({ type: 'str', val: match[1].slice(1, -1) });

        else if (match[1].match(/([\<\>\-,;:%+*\/=\!\?\&\|\(\)]){1,3}/g))
          oArgs.push({ type: 'op', val: match[1] });

        else if (match[1].match(/true|false|null|undefined/g))
          oArgs.push({ type: 'lit', val: match[1] });

        else if (match[1].match(/^\@/g))
          oArgs.push({ type: 'eval', val: match[1].slice(1), sup: true });

        else if (match[1].match(/^(\d{1,}\.?\d*)$/))
          oArgs.push({ type: 'number', val: match[1] });

        else if (match[1].match(/([\.\w\$]+)/g))
          oArgs.push({ type: 'eval', val: match[1] });
      }

      return oArgs;
    };

    /*
     * Creates a new node and parses arguments
     */
    var createNode = function (cmd, type, sup, args, branch) {
      var node = { parent: curNode, args: [], sup: sup };

      if (cmd !== 'str') {
        node.args = parseArgs(args);
      }

      switch (cmd) {
        case 'str':
          node.type = cmd;
          node.args = args;
          break;

        case 'block':
          node.type = type;
          node.nodes = [];
          break;

        case 'load':
          node.type = 'load';
          node.name = type;
          if (node.args.length % 3 !== 0) throw new SyntaxError('Invalid arguments');

          for (var i = 0, j = node.args.length; i < j; i++) {
            switch (i % 3) {
              case 0:
                if (node.args[i].type !== 'eval')
                  throw new SyntaxError('Expected eval');
                break;
              case 1:
                if (node.args[i].type !== 'op' || node.args[i].val !== '=')
                  throw new SyntaxError('Expected = operator');
                break;
              case 3:
                if (node.args[i].type === 'op')
                  throw new SyntaxError('Unexpected operator');
                break;
            }
          }

          break;

        case 'save':
          node.type = 'save';
          node.name = type;
          node.nodes = [];
          break;

        case 'else':
        case 'else_if':
          node.type = 'if';
          node.name = cmd;
          break;

        case 'eval':
          node.type = '$eval$';
          node.name = type;
          break;
      }

      curNode.nodes.push(node);
      if (branch === true) curNode = node;
    };

    /*
     * Parses a single node, either text node or template tag
     */
    var parseNode = function (line, fn) {
      /*
       * Text node, pass thru, don't fiddle with it.
       */
      if (!fn) {
        if (line.length > 0) createNode('str', '', false, [line]);
        return;
      }

      var args = line.match(/"([^"]*)"|'([^']*)'|[^\s]+/g);
      var type = args.shift();
      var cmd = type[0];
      var sup = false;

      type = type.substr(1);

      /*
       * Suppress errors (getting undefined in evaluated template..)
       */
      if (cmd === '@') {
        sup = true;
        cmd = type[0];
        type = type.substr(1);
      }

      switch (cmd) {
        /*
         * Block start
         */
        case '#':
          createNode('block', type, sup, args, true);
          break;

        /*
         * Block end
         */
        case '/':
          if (type !== curNode.type &&
             (type === 'save' && curNode.name !== type) &&
             (type === 'if' && curNode.type !== 'else_if' && curNode.type !== 'else')) {
            /*
             * Type doesn't match, we are not closing a save partial block
             * and we are not in if/else if/else
             */
            throw new SyntaxError('Unexpected /' + type);
          }

          curNode = curNode.parent;
          break;

        /*
         * Insert partial
         */
        case '>':
          createNode('load', type, sup, args);
          break;

        /*
         * Save partial / block start
         */
        case '<':
          partials = true; // in case template only has partials in it
          createNode('save', type, sup, args, true);
          break;

        /*
         * else / else if are a special case, they are a block without #
         */
        case 'e':
          /*
           * If first word inside {{}} is else -> else or else if
           */
          if (cmd + type === 'else') {

            /*
             * If first argument is if -> else if, needs to be preceded by if block
             */
            if (args[0] === 'if') {
              if (curNode.type !== 'if')
                throw new SyntaxError('Unexpected else if');

              args.shift();
              curNode = curNode.parent;
              createNode('block', 'else_if', sup, args, true);
              break;
            }

            /*
             * Otherwise it's just else, else doesn't take arguments so throw on those
             * needs to be preceeded by if or else if block
             */
            if (curNode.type !== 'if' && curNode.type !== 'else_if')
              throw new SyntaxError('Unexpected else');
            if (args.length > 0)
              throw new SyntaxError('Else doesn\'t take arguments');

            curNode = curNode.parent;
            createNode('block', 'else', sup, args, true);
            break;
          }
          /*
           * Break intentionally omitted
           * When first word started with e but wasn't else it must be a variable or other function call
           */

        /*
         * Variable / function call
         */
        default:
          args.unshift(cmd + type);
          createNode('eval', cmd + type, sup, args);
          break;
      }
    };

    /*
     * Removes template comments {{* *}}, controlled white spaces and escapes new lines
     */
    [{ r: /~}}([\s]*)/g, v: '}}' },
      { r: /([\h]*){{~/g, v: '{{' },
      { r: /{{\*(.*?)\*}}/g, v: '' },
      { r: /\n/g, v: '\\n' },
    ].forEach(function (r) {
      template = template.replace(r.r, r.v);
    });

    /*
     * If tbt.strip is set (default), loop rows and remove whitespace from beginning and end of line, remove new lines
     */
    if (tbt.strip) {
      template = template.split('\\n').map(function (row) {
        return row.trim();
      }).join('').replace(/\r\t\n\\n/g, '');
    }

    /*
     * Loop trough tags and parse them as nodes
     */
    var cursor = 0;
    var re = /{{([^\}]+)}}/g;
    var match;

    while (match = re.exec(template)) {
      // Between each template tag there will be a text node of length 0 or more
      parseNode(template.slice(cursor, match.index));

      // After text node comes template tag
      parseNode(match[1], true);

      cursor = match.index + match[0].length;
    }

    // "The rest" text node
    parseNode(template.substr(cursor, template.length - cursor));

    /*
     * If we did not end up back in our root node, there's something wrong with the template
     */
    if (curNode !== root) throw new SyntaxError('Unexpected end of file');

    /*
     * Walk trough all nodes and generate code
     */
    var tpl = compiler.branch(root.nodes);

    /*
     * If tpl (code) length is longer than 0 we have content, eval with to return the output, return evaluated code
     */
    if (tpl.length > 0) {
      eval('tpl = ' + 'function(){var $o="";' + tpl + ' return $o};');
      return { tpl: tpl };
    }

    /*
     * We didn't have code above, if we have partials set the template only included partials so this is not an error case
     */
    if (partials) return { partials: true };

    /*
     * No partials, no code, nothing.
     */
    return false;
  };

  /*
   * If user adds own helpers they will need $, so add it to compiler as well..
   */
  compiler.$ = $;

  /*
   * Used to resolve arguments
   */
  compiler.resolve = function (args) {
    for (var i = 0, j = args.length; i < j; i++) {
      switch (args[i].type) {
        case 'str':
          args[i] = '"' + args[i].val.replace(/"/g, '\\"') + '"';
          break;

        case 'lit':
        case 'number':
        case 'op':
          args[i] = args[i].val;
          break;

        case 'eval':
          if (args[i].val === 'this') {
            args[i] = 'this';
          } else {
            args[i] = 'this' + args[i].val.replace(/\.\./g, '$parent.').split('.').map(function (arg) {
              if (arg.indexOf('-') !== -1) return '["' + arg + '"]';
              else if (arg.match(/([0-9].+)/)) return '[' + arg + ']';
              return '.' + arg;
            }).join('') + (args[i].sup ? '||""' : '');
          }

          break;
      }
    }

    return args;
  };

  /*
   * Walk nodelist (or part of it) and return code as string
   */
  compiler.branch = function (nodes, from, to) {
    var parts = [];
    var i = from || 0;
    var j = to || nodes.length;
    var node = nodes[i++];
    var part;

    if (!node) return '';

    for (; i <= j; node = nodes[i++], part = undefined) {
      if (!node) break;

      /*
       * String nodes pass thru after escaping " characters
       */
      if (node.type === 'str') {
        parts.push({ type: 'str', val: '"' + node.args.join('').replace(/"/g, '\\"') + '"' });
        continue;
      }

      switch (node.type) {

        /*
         * Variable or function
         */
        case '$eval$':

          /*
           * Helper
           */
          if (compiler.helpers[node.args[0].val]) {
            part = compiler.helpers[node.args.shift().val].call(this, node);
          } else { // Variable
            if (node.sup) {
              node.args[0].sup = true;
              node.sup = false;
            }

            /*
             * Allows to set variable like {{variable = $index + 1}} or {{total += price}}
             */
            if (node.args.length > 2 &&
                node.args[1].type === 'op' &&
                node.args[1].val.slice(-1) === '=') {
              this.resolve(node.args);
              part = { type: 'eval', val:  node.args.join(' ') + ';' };
              break;
            }

            /*
             * Allows to do {{= "prefix_" + variable}} or {{=variable === true ? 'blue' : 'red'}}
             */
            if (node.args[0].type === 'op' && node.args[0].val === '=') {
              node.args.shift();
              this.resolve(node.args);
              part = { type: 'eval', val: '$o+=' + node.args.join(' ') + ';' };
            } else {
              this.resolve(node.args);
              part = { type: 'str', val: node.args.join(' ') };
            }
          }

          break;

        /*
         * Block (each, if,else if,else)
         */
        default:
          this.resolve(node.args);
          if (!compiler.helpers[node.type]) {
            throw new ReferenceError('Unknown block ' + node.type);
          }

          part = compiler.helpers[node.type].call(this, node);
          break;
      }

      if (part) {
        if (node.sup) part.sup = true;
        parts.push(part);
      }
    }

    /*
     * Generate the actual output string
     */
    var $o = '';
    parts.forEach(function (part) {
      if (part.type === 'eval') $o += part.val;
      else $o += '$o += ' + part.val + ';';
    });

    return $o;
  };

  compiler.helpers = {};

  /*
   * Array/Object looper
   * assigns usefull stuff like current key ($key), current index ($index), is the loop first/last ($first/$last)
   */
  compiler.helpers.each = function (node) {

    /*
     * This part is common between all loops, which is why it's inserted to $ (cache)
     */
    this.$.$each = function (obj, template) {
      var i = 0;
      var key;
      var pKey;
      var $o = '';

      var exec = function (info) {
        var params = ['$parent', '$key', '$index', '$first', '$last'];
        var k;

        while (k = params.pop()) {
          this[k] = info.pop();
        }

        $o += template.call(this) || '';
      };

      if (Array.isArray(obj)) {
        for (var j = obj.length; i < j; i++) {
          if (i in obj) exec.call(obj[i], [this, i, i, i === 0, !!(i === j - 1)]);
        }
      } else {
        var keys = Object.keys(obj);
        for (key in keys) {
          if (pKey) exec.call(obj[pKey], [this, pKey, i - 1, i - 1 === 0, false]);
          pKey = keys[key];
          i++;
        }

        if (pKey) exec.call(obj[pKey], [this, pKey, i - 1, i - 1 === 0, true]);
      }

      return $o;
    };

    /*
     * This is the code we generate to start a loop in the compiled template
     * Walks trought the block (child nodes) with this.branch(node.nodes)
     */
    var code = 'if(' + node.args[0] + ')$o+=$.$each.call(this,' + node.args[0] + ',function(){' +
      'var $o="";' + this.branch(node.nodes) + 'return $o;});';

    return { type: 'eval', val: code };
  };

  /*
   * If/else if/else code generators, again these walk trough the block with this.branch
   */
  compiler.helpers.if = function (node) {
    return {
      type: 'eval',
      val: 'if(' + node.args.join(' ') + '){' + this.branch(node.nodes) + '}',
    };
  };

  compiler.helpers.else_if = function (node) {
    return {
      type: 'eval',
      val: 'else if(' + node.args.join(' ') + '){' + this.branch(node.nodes) + '}',
    };
  };

  compiler.helpers.else = function (node) {
    return {
      type: 'eval',
      val: 'else{' + this.branch(node.nodes) + '}',
    };
  };

  /*
   * Saves a partial, walks trough the block, generates and evaluates the function which is saved to $ (cache)
   */
  compiler.helpers.save = function (node) {
    eval('var fn=function(){var $o="";' + compiler.branch(node.nodes) + 'return $o;}');
    $['$' + node.name + '$'] = fn;
    return;
  };

  /*
   * Loads partial, generates code that evaluates arguments (assigns to this) and then calls the partial
   */
  compiler.helpers.load = function (node) {
    var code = node.args.map(function (arg, i) {
      if (i % 3 === 2) return arg + ';';
      return arg;
    }).join('');

    code += '$o+=$["$' + node.name + '$"].call(this);';

    return { type: 'eval', val: code };
  };

  return { _: tbt, $: $ };
})());
