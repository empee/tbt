```javascript
/*   __ ___.    __    *
 * _/  |\_ |___/  |_  *
 * \   __\ __ \   __\ *
 *  |  | | \_\ \  |   *
 *  |__| |___  /__|   *
 * (c)toyboy \/ 2016  */
```
*Tiny* and *mostly ~~harmless~~* handlebars compatible template engine

### Features?
* Common.js, amd and global module
* Looping objects and arrays with support to get key, index, first and last of each iteration
  * {{#each products}}{{>product}}{{/each}} 
* Variable resolver that supports paths like \.\.products.0.name and "strings"
* Conditionals if/else if/else with all kinds of crazy !<>=%/ operators that lets you do stuff like
  * class="{{#if price > 9000}}too-expensive{{else if price > 1000}}maybe{{else}}can-afford{{/if}}"
* Ternary operator for simple stuff like
  * class="{{= price > 1000 ? 'apple-prices' : 'normal-prices'}}"
* Allows you to assign variables, can also be used to do math like {{\.\.total += price}}
* Partials support, with inline generation {{<myPartial}}code goes here{{/myPartial}} and parameters!
* Custom helpers! Not as fancy way of doing them as handlebars but *good-enough*
* Includes a cool command line compiler (like all the big boys do)
* Will break your white spaces all day and not get tired! Or try to allow you to somewhat control them like in handlebars {{\~this\~}} 
* Includes template fetch via fs.* when in node.js and XMLHttpRequest when running in browserlike enviroments
* Doesn't require a runtime as exported templates include everything needed to run them
* Even compiled version is able to load other pre-compiled templates/partials/helpers

#### Tiny!
The whole thing (compiler and all) comes in at 19kb (under 8kb minified), the "runtime" part (included in compiled template/partial/helper bundle) weights around 860 bytes minified and around 430 bytes if no looping support is needed!

As a comparison: handlebars (with compiler and all) is 75kb ***minified*** and even the runtime is 16kb when minified, you know you could fit the full tbt twice in that space, just saying.. *still a bit fat compared to doT.js though..*

#### How to use?
```bash
npm intall tbt -g
```
```javascript
var tbt = require('tbt');

// sets the default search path for templates, we assume templates have the extension .tbt
tbt.path = '/var/www/templates/'; 
// tbt will look for /var/www/templates/myTemplate.tbt compile it and run it with data given
tbt('myTemplate', {here: {is: ['my','data'] } }, function(err, text) {
    if(!err) {
        console.log(text);
    }
});

var fs = require('fs');
// Export returns the "runtime" version of all templates/partials/helpers in cache (loaded in with the same tbt in the same session)
fs.writeFileSync('myCompiledTemplates.js', tbt.export()); 
````
```html
...
<script src="myCompiledTemplates.js"></script>
<script>
tbt('myTemplate', {here: {is: ['some', 'new', 'data'] } }, function(err, text) {
    if(!err) $('#myPlaceholder').html(text);
});
</script>
...
```
Few more examples can be found in examples/ folder and in the few tests included.

#### Logic
Supports:
 * if / else if / else
 * each
 * < (save partial)
 * \> (load partial)
 * = variable ? true : false (ternary, adds result to output)
 * variable = 1 + 1 (assigning variables inline)

#### Why?
Handlebars is too big (and lacks alot of logic) and doT is a bit too simple (+ it doesn't even try to be handlebars compatible'ish). And a lot of these template engines that advertise "light weight" "small compiled templates" etc. actually are quite big when you add the runtime needed to actually get any output from the template.

And because why not? How hard can it be? :)

#### License
tbt is licensed under the MIT license (see [LICENSE](https://github.com/empee/tbt/blob/master/LICENSE))

##### Inspired by:
[doT.js](https://github.com/olado/doT) by Laura Doktorova

[Handlebars.js](http://handlebarsjs.com/) by Yehuda Katz

And by [this article](http://krasimirtsonev.com/blog/article/Javascript-template-engine-in-just-20-line) by Krasimir Tsonev

