var tbt = require('../');

var data = {
  people: [
    { name: 'Bob', colors: ['black', 'red', 'pink'] },
    { name: 'John', colors: ['yellow', 'orange', 'green'], animals: ['dolphin', 'turtle', 'unicorn'] },
    { name: 'Jane', colors: { best: 'brown', bester: 'blue', bestest: 'white' }, animals: ['lion', 'hydra', 'dragon'] },
    { name: 'Joe', animals: ['donkey', 'sloth'] },
  ],
};

tbt.path = __dirname;
tbt.strip = false;
tbt('partials', data, function (err, rendered) {
  if (err) return;
  console.log(rendered);
});
