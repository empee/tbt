var assert = require('chai').assert;
var tbt = require('../');

describe('Parse template', function () {
  describe('Empty template', function () {
    it('Compiler will fail and throw if trying to get template', function (done) {
      assert.isFalse(tbt.compile('', 'test'));
      assert.throws(function () {
        tbt('test', {}, function (err, tpl) {});
      }, Error);

      done();
    });
  });

  describe('Html only template', function () {
    it('Html only template will always just return the html', function (done) {
      assert.isFunction(tbt.compile('<h1>hello</h1>', 'test2'));
      tbt('test2', { data: [{ wont: 'be rendered' }] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, '<h1>hello</h1>');
        done();
      });
    });
  });

  describe('String replace - normal and print safe', function () {
    it('Compile template', function (done) {
      assert.isFunction(tbt.compile('<h1>Hello, {{name}} {{@name}}!</h1>', 'test3'));
      done();
    });

    it('No data', function (done) {
      tbt('test3', {}, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, '<h1>Hello, undefined !</h1>');
        done();
      });
    });

    it('Data', function (done) {
      tbt('test3', { name: 'bob' }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, '<h1>Hello, bob bob!</h1>');
        done();
      });
    });
  });

  describe('If/else if/else', function () {
    it('Compile template', function (done) {
      assert.isFunction(tbt.compile('Hello {{#if name}}{{name}}{{else if lastname}}{{lastname}}{{else}}john doe{{/if}}!', 'test4'));
      done();
    });

    it('No data - else', function (done) {
      tbt('test4', {}, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Hello john doe!');
        done();
      });
    });

    it('Some data - if', function (done) {
      tbt('test4', { name: 'billy bob' }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Hello billy bob!');
        done();
      });
    });

    it('Moar data - if else', function (done) {
      tbt('test4', { lastname: 'scrooge' }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Hello scrooge!');
        done();
      });
    });
  });

  describe('Variable paths + math/each (w/ $key, $last)/set variable', function () {
    it('Compile template', function (done) {
      assert.isFunction(tbt.compile('{{name = "jane"}}Todo: {{#each list}}{{$key + 1}}. {{@item}} {{#if name}}{{name}}{{else}}{{..name}}{{/if}}{{#if !$last}}, {{/if}}{{/each}}', 'test5'));
      done();
    });

    it('No data', function (done) {
      tbt('test5', {}, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Todo: ');
        done();
      });
    });

    it('Some data', function (done) {
      tbt('test5', { list: [{ item: 'Buy beer' }] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Todo: 1. Buy beer jane');
        done();
      });
    });

    it('More data', function (done) {
      tbt('test5', { list: [{ item: 'Buy beer' }, { item: 'Buy bear' }] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Todo: 1. Buy beer jane, 2. Buy bear jane');
        done();
      });
    });

    it('Incomplete data', function (done) {
      tbt('test5', { list: [{ item: 'Buy beer', name: 'Tim' }, { item: 'Buy bear' }] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Todo: 1. Buy beer Tim, 2. Buy bear jane');
        done();
      });
    });

    it('With empty object', function (done) {
      tbt('test5', { list: [{ item: 'Buy beer', name: 'Tim' }, {}] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'Todo: 1. Buy beer Tim, 2.  jane');
        done();
      });
    });
  });

  describe('Partials (w/ cache)/custom helpers', function () {
    it('Compile partial', function (done) {
      assert.isTrue(tbt.compile('{{<user}}{{title}}: {{@username}} - {{@email}} - {{joinDate}}{{#if !$last}}{{breakChar}} {{/if}}{{/user}}'));
      done();
    });

    it('Compile template', function (done) {
      assert.isFunction(tbt.compile('{{#each users}}{{>user title="User" breakChar = ","}}{{/each}}', 'test6'));
      done();
    });

    it('With empty object', function (done) {
      tbt('test6', { users: [{}] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'User:  -  - undefined');
        done();
      });
    });

    it('Register helper', function (done) {
      assert.isTrue(tbt.helper('joinDate', function (node) {
        this.$.joinDate = function () {
          var d = new Date(this.joinDate);
          return !isNaN(d.getDate()) ? d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() : '';
        };

        return { type: 'eval', val: '$o += $.joinDate.call(this);' };
      }));

      done();
    });

    it('Recompile partial (to use helper)', function (done) {
      assert.isTrue(tbt.compile('{{<user}}{{title}}: {{@username}} - {{@email}} - {{joinDate}}{{#if !$last}}{{breakChar}} {{/if}}{{/user}}'));
      done();
    });

    it('Some data, using the new helper', function (done) {
      tbt('test6', { users: [{ username: 'bob', email: 'bob@bob.com', joinDate: '2016-11-30' }, { username: 'tom' }, { email: 'jane@doe.com', joinDate: '2016-01-01' }] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'User: bob - bob@bob.com - 30.11.2016, User: tom -  - , User:  - jane@doe.com - 1.1.2016');
        done();
      });
    });
  });

  describe('Math', function () {
    it('Compile template #1', function (done) {
      assert.isFunction(tbt.compile('{{initial = userValue}}{{#each numbers}}{{..initial += $index}}{{..initial}} * {{this}} = {{..initial * this}}{{#if !$last}}, {{/if}}{{/each}}', 'test7'));
      done();
    });

    it('Number array', function (done) {
      tbt('test7', { userValue: 1, numbers: [2, 4, 8, 16] }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, '1 * 2 = 2, 2 * 4 = 8, 4 * 8 = 32, 7 * 16 = 112');
        done();
      });
    });

    it('Compile template #2', function (done) {
      assert.isFunction(tbt.compile('{{#each data}}i:{{$index}} {{#if $first}}first{{else if $last}}last{{/if}} {{#if !(($index + 2)% 2)}}even{{else}}odd{{/if}},{{/each}}', 'test8'));
      done();
    });

    it('Looping an object and doing some \'advanced\' math', function (done) {
      tbt('test8', { data: { a: '', b: '', c: '' } }, function (err, tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'i:0 first even,i:1  odd,i:2 last even,');
        done();
      });
    });
  });

  describe('Nested loops', function () {
    it('Compile template', function (done) {
      assert.isFunction(tbt.compile('{{#each ppl}}{{name}} {{#if colours}}likes {{#each colours}}{{#if $last}} and {{else if !$first}}, {{/if}}{{this}}{{/each}}{{else}}wants it painted black{{/if}}{{#if $last}}.{{else}}, {{/if}}{{/each}}', 'test9'));
      done();
    });

    it('With data', function (done) {
      tbt('test9', { ppl: [{ name: 'bob' }, { name: 'john', colours: ['pink', 'black', 'yellow'] }, { name: 'jane', colours: ['blue', 'orange', 'purple'] }] }, function (err,  tpl) {
        assert.isFalse(err);
        assert.equal(tpl, 'bob wants it painted black, john likes pink, black and yellow, jane likes blue, orange and purple.');
        done();
      });
    });
  });
});
