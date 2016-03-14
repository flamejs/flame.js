/**
  Flame.computed.nearest can be used to created computed properties based on
  properties up in the parentView chain.

  Let's define this computed property:

      bar: Flame.computed.nearest('foo.bar')

  The first time we `get` or `set` this computed property, we search through
  the parentView chain for the first view that has the `foo` property and
  define the following computed property:

      __foo_bar: Ember.computed.alias('parentView.parentView.parentView.foo.bar')

  Any future use of the `get` property will just be an alias to the `__foo_bar`
  property.

  You can also pass a computed property macro as a second argument to `nearest`.

      bar: Flame.computed.nearest('foo.bar', Ember.computed.empty)

  This would then generate the following computed property:

      __foo_bar: Ember.computed.empty('parentView.parentView.parentView.foo.bar')
*/
export function nearest(key, macro) {
    var propertyName = '__' + key.replace(/\./g, '_');

    return Ember.computed(propertyName, function(k, value) {
        if (!Ember.meta(this).descs[propertyName]) {
            createProperty(this, propertyName, key, macro);
        }
        if (arguments.length > 1) {
            this.set(propertyName, value);
        }
        return this.get(propertyName);
    });
};

var IS_PATH_REGEX = /[\.]/,
    PATH_SPLIT_REGEX = /([^\.]+)(\..*)/;

function createProperty(target, propertyName, property, macro) {
    var rest = '';

    if (IS_PATH_REGEX.test(property)) {
        var match = property.match(PATH_SPLIT_REGEX);
        property = match[1];
        rest = match[2];
    }

    var view = target.get('parentView');
    var path = 'parentView';

    while (view) {
        if (property in view) break;
        view = view.get('parentView');
        path += '.parentView';
    }

    Ember.assert("Could not find property '%@' in ancestor views".fmt(property), view);
    Ember.assert("Don't use Flame.computed.nearest to fetch a property from the parent view", path !== 'parentView');

    path += '.' + property + rest;

    if (typeof macro === 'undefined') macro = Ember.computed.alias;

    Ember.defineProperty(target, propertyName, macro(path));
}
