/**
  This stuff solves two recurring problems with bindings:
    1) you often need several bindings to the same controller,
    2) you may want to use bindings to 'configure' views nested deep in the hierarchy.

  One option would be to have one binding on the top level in the view definition, then
  bind to that in the child views, but that's also suboptimal because you need a lot of
  parentView.parentView... type paths which are not robust w.r.t. changes in the view
  hierarchy. So here's how to do it:

  fooView1: Flame.View.extend({
    controllerPath: 'MyApp.someController',
    fooAction: 'MyApp.createFoo',

    fooView2: Flame.View.extend({
      fooView3: Flame.View.extend({
        foobarBinding: '$controllerPath.someProperty'  // Binds to MyApp.someController.someProperty
      }),
      fooView4: Flame.ButtonView.extend({
        foobarBinding: '$controllerPath.anotherProperty',  // Binds to MyApp.someController.anotherProperty
        actionBinding: '^fooAction'  // Binds to parentView.parentView.fooAction
      })
    })
  })

  Put in a bit more formal way:

    $<propertyName>[.<path>] => looks up propertyName in parent view/s, uses its value to prefix
                                given path, and binds to the resulting path
    ^<propertyName>[.<path>] => looks up propertyName in parent view/s and uses the path to that
                                to prefix given path

  Another way to think of this is that $propertyName expands to the value of that property,
  whereas ^propertyName expands to the path to that property.

  Beware that the latter syntax only works when the property you're binding to has a value
  other than 'undefined' at the time when the views are created. However it does work if it's
  defined by a binding, even if the binding hasn't been synchronized yet.

  A note about implementation: This kind of bindings are bound in Flame._bindPrefixedBindings,
  which needs to be explicitly called from the init of all root views (views that don't have
  parents). I have tried to make this more automagic by overriding Ember.Binding.connect. While
  it's easy to detect prefixed bindings there, the basic problem is that parentView is not
  yet set at that point. One possible approach is to add the prefixed bindings to a queue
  in connect and then process them later. However, the obj in connect is not the same as
  the final view object, but instead some kind of intermediate object that is then presumably
  wrapped later (in the prototype chain I assume) to become the real thing. Trying to bind
  to the intermediate object later doesn't work, and I cannot figure out a way to work out
  the final object, given the intermediate one (might be impossible). Thus, we're currently
  stuck with this implementation (which works but might get slow - it has to go through all
  properties of all views).
*/

var IS_PREFIXED_BINDING = /^[\^\$]/;
Ember.mixin(Ember.Binding.prototype, {
    connect: function(obj) {
        if (!IS_PREFIXED_BINDING.test(this._from)) return this._super(obj);
    }
});

var IS_BINDING = /Binding$/;
var PREFIXED_BINDING = /^(\^|\$)([^.]+)(.*)$/;

// Bind our custom prefixed bindings. This method has to be explicitly called after creating a new child view.
export function bindPrefixedBindings(view) {
    var foundPrefixedBindings = false;
    for (var key in view) {
        if (bindPrefixed(key, view)) {
            foundPrefixedBindings = true;
        }
    }
    return foundPrefixedBindings;
}

function bindPrefixed(key, view) {
    var foundPrefixedBindings = false;
    if (IS_BINDING.test(key)) {
        var binding = view[key];
        Ember.assert('Expected an Ember.Binding!', binding instanceof Ember.Binding);

        var m = binding._from.match(PREFIXED_BINDING);
        if (m) {
            foundPrefixedBindings = true;
            var useValue = m[1] === '$';
            var property = m[2];
            var suffix = m[3];
            var prefix;

            if (useValue) {
                prefix = lookupValueOfProperty(view, property);
            } else {
                prefix = lookupPathToProperty(view, property);
            }
            Ember.assert("Property '%@' was not found!".fmt(property), !Ember.isNone(prefix));

            var finalPath = prefix + suffix;
            // Copy transformations and the ilk.
            var newBinding = binding.copy();
            newBinding._from = finalPath;
            newBinding.connect(view);
            // Make debugging easier
            binding._resolved_form = newBinding._resolved_form = newBinding._from;
            binding._unresolved_form = newBinding._unresolved_form = binding._from;
        }
    }
    return foundPrefixedBindings;
}

function lookupValueOfProperty(view, propertyName) {
    var cur = view, value;

    while (value === undefined && value !== null && cur !== undefined && cur !== null) {
        value = cur.get(propertyName);
        cur = cur.get('parentView');
    }

    return value;
}

function lookupPathToProperty(view, propertyName) {
    var path = [propertyName, 'parentView'];
    var cur = view.get('parentView');
    // Sometimes there's a binding but it hasn't 'kicked in' yet, so also check explicitly for a binding
    var bindingPropertyName = propertyName + 'Binding';

    while (!Ember.isNone(cur)) {
        // It seems that earlier (at least 0.9.4) the constructor of the view contained plethora of properties,
        // but nowadays (at least 0.9.6) the properties are there throughout the prototype-chain and not in the
        // last prototype. Thus testing whether current objects prototype has the property does not give correct
        // results.
        // So we check if the current object has the property (perhaps some of its prototypes has it) or it has
        // a binding for the property and in case it has, this object is the target of our binding.
        if (typeof Ember.get(cur, propertyName) !== "undefined" || typeof Ember.get(cur, bindingPropertyName) !== "undefined") {
            return path.reverse().join('.');
        }
        path.push('parentView');
        cur = cur.get('parentView');
    }

    return undefined;
}
