// Support for firing an action, given a target, action and an optional payload. Any of those
// can naturally be defined with a binding. Furthermore, if target is a path the resolves to
// a string, that string is again resolved as a path, etc. until it resolved on non-string.
// For example, target could be 'parentView.controller', which could resolve to
// 'MyApp.fooController', which would then resolve to a controller object. If target is not
// defined, it defaults to the view itself.
//
// Action can be defined as a string or a function. If it's a function, it's called with the
// target bound to 'this'.
//
// If payload is not defined, it defaults to the view itself.
Flame.ActionSupport = {
    target: null,
    action: null,
    payload: null,

    fireAction: function(action, payload) {
        var target = this.get('target') || this;

        while ('string' === typeof target) {  // Use a while loop: the target can be a path gives another path
            if (target.charAt(0) === '.') {
                target = this.getPath(target.slice(1));  // If starts with a dot, interpret relative to this view
            } else {
                target = Ember.getPath(target);
            }
        }
        if (action === undefined) { action = this.get('action'); }

        if (action) {
            var actionFunction = 'function' === typeof action ? action : Ember.get(target, action);
            if (!actionFunction) throw 'Target %@ does not have action %@'.fmt(target, action);
            return actionFunction.call(target, payload || this.get('payload') || this, action, this);
        }

        return false;
    }
};
