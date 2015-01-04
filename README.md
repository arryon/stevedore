#Fixtures hook

##Introduction
This project needed a fixture hook because seed data needs to be set in place for
production environments. Sails itself has no such mechanism, so I created one.

##Working
The local config file <app_dir>/config/local.js is the place where the hook
looks to find the fixture settings. The settings are ordered in an object with
key 'order' specifying the order in which the fixtures should be loaded.
Since this hook also injects associations, some models should be populated first
in order to make the association work. Sails associates based on id's and validates
the existence of the association before creating it.

Each key that is not 'order' is assumed to represent the model with the same name.
The contents of the key must be an array of objects representing model instances.
Each object is inspected for a key 'collections'. This points to an association with
a dominant side on the current model.

If the model already has instances in the DB, it is assumed the fixture for this model should
_not_ be installed, and the next fixture is tried. If no models are present, each
object is inspected for associations.
If no collections are found, the object is passed through as is.

###Collections
The contents of the collections attribute is in itself an object of attributes,
where the singular, lowercase form of an existing model name is used as attribute.
The contents of such an attribute, finally, is a query that will be fed to a {where: <query>}
object when making a DB query. The resulting id's are then appended as the model's
associations.

##Example config

```
fixtures: {
  order: ['User', 'Group', 'Role'],
  User: [
    {
      username: 'test',
      email: 'test@test.com',
      password: 'test'
    },
    {
      username: 'user2',
      email: 'no@mail.here',
      password: 'user2'
    }
  ],
  Role: [
    {
      name: 'admin',
      collections: {
        user: {username: 'test'},
      }
    },
    {
      name: 'reader',
      collections: {
        group: ['Group1']
      }
    }
  ],
  Group: [
    {
      name: 'Group1',
      collections: {
        user: {username: ['user2', 'test']},
      }
    },
    {
      name: 'Group2',
      collections: {
        user: {username: ['test']}
      }
    }
  ]
},
```
