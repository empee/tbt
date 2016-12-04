var tbt = require('../');

var data = {
  people: [
    { name: 'Bob', lastname: 'Billy', favoriteFoods: [{ name: 'Steak', how: 'Well done' }, { name: 'Pizza', toppings: ['Salami', 'Pineapple', 'Tuna'] }] },
    { name: 'John', favoriteFoods: ['Lasagne', 'Kimchi'] },
    { name: 'Jane', lastname: 'Doe', doesntLikeFood: true },
    { lastname: 'Smith', favoriteFoods: ['Soylent green'] },
  ],
};

tbt.path = __dirname;
tbt('loops', data, function (err, rendered) {
  if (err) return;
  console.log(rendered);
});
