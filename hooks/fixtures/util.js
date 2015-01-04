var Promise = require('bluebird'),
    _ = require('lodash');

module.exports.create = function (Model, obj, sails) {
  if (Model === undefined) {
    throw new Error('Undefined model: ' + Model);
  }
  return Model.find()
  .then(function (results) {
    if (results.length > 0) {
      throw new Error('Model not empty, skipping fixture');
    }
    else {
      return addAssociation(Model, obj, sails)
      .each(function (obj) {
        return Model.create(obj);
      });
    }
  });
}
function addAssociation (Model, seeds, sails) {
  return Promise.map(seeds, function (seed) {
    //no associations are present, return as is
    if (seed.collections === undefined) {
      return seed;
    }
    else {
      //the collection keys resemble the models to which the associations belong
      var collectionkeys = Object.keys(seed.collections);

      return Promise.map(collectionkeys, function (key) {
        //key is the name of the model in the fixture's collections
        var Model = sails.models[key];
        if (Model === undefined) {
          throw new Error('Undefined model ' + key);
        }
        var collection = seed.collections[key];
        var query = (collection instanceof Array
          ? {'name': seed.collections[key]}
          : seed.collections[key]);

        return Model.find({where: query})
        .then(function (results) {
          if (results.length === 0) {
            throw new Error('No models existed matching query: '+ JSON.stringify(query));
          }
          else {
            //pluck the ids, append them to the correct attribute and return the
            //object with the correct ids for further promise map iteration
            ids = _.pluck(results, 'id');
            seed[pluralize(key)] = ids;
            delete seed.collections;
            return seed;
          }
        });
      });
    }
  });
};

function pluralize (name) {
  return name + 's';
}
