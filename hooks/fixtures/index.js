/**
 * Some code adapted from a permissions-hook in the making:
 * https://github.com/tjwebb/sails-permissions/blob/master/api/hooks/permissions-api/index.js#L26
 */
var fs = require('fs'),
    util = require('./util');

module.exports = function(sails) {
  return {
    configure: function () {
      sails.log.silly('Configuring fixtures');
      //global variables
      global.Promise = require('bluebird');
      global._ = require('lodash');
    },

    initialize: function (next) {
      sails.after('hook:orm:loaded', function () {
        sails.log.verbose('initializing fixtures');
        installFixtures(sails, next);
      });
    }
  };
};

function NoFixturesError () {}
NoFixturesError.prototype = Object.create(Error.prototype);

/*
 * The real workhorse of installing fixtures starts here. Re-made with promises,
 * Should be a whole lot easier to interpret now
 */

function installFixtures (sails, cb) {
  Promise.promisifyAll(fs);
  fs.statAsync(__dirname + '/../../../config/local.js')
  .then(function (result) {

    var fixtures = require('../../../config/local').fixtures;
    if (fixtures === undefined) {
      throw new NoFixturesError();
    }
    var util = require('./util');

    /**
     * Each of the fixtures defined in the order has to be injected. This is done using
     * the sails.emit(...) function, caught by sails.after(...).
     * The function singleFixture installs the fixtures of one model, then emits that it's done
     * using the provided hook, after which the next in line fixture will be installed
     */
    var hooks = _.map(_.rest(fixtures.order), function (name) { return name });
    _(hooks).each(function (name, idx) {
      //if this is the last value, set the hook to loaded
      var next = (hooks.length === idx+1
        ? 'loaded'
        : hooks[idx+1]
      );
      sails.after('hook:fixture:'+name, function () {
        singleFixture(name, fixtures[name], 'hook:fixture:'+next, sails);
      });
    });
    //when the last fixture has been injected, the `loaded` hook will be called,
    //to which we subscribe the callback function of the hook
    sails.after('hook:fixture:loaded', function () {
      cb();
    });

    var first = fixtures.order[0];
    if (fixtures.order.length > 1) {
      var next = fixtures.order[1];
      singleFixture(first, fixtures[first], 'hook:fixture:'+next, sails);
    }
    else {
      singleFixture(first, fixtures[first], 'hook:fixture:loaded', sails);
    }
  })
  .catch(NoFixturesError, function (err) {
    sails.log.verbose('No fixtures in local config, skipping');
    cb();
  })
  .catch(function (err) {
    sails.log.error('Fixtures error: ' + err);
    cb();
  });
};

function singleFixture (name, obj, hook, sails) {
  sails.log.verbose('Installing fixtures for ' + name);
  var Model = sails.models[name.toLowerCase()]; //can be undefined
  return util.create(Model, obj, sails)
  .catch(function (err) {
    sails.log.error('Got error creating model: ' + err);
  })
  .finally(function () {
    sails.emit(hook);
  });
};
