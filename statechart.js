/*jshint loopfunc: true */

Flame.State = Ember.Object.extend({
    gotoFlameState: function(stateName) {
        this.get('owner').gotoFlameState(stateName);
    },

    // Touch events sometimes hide useful data in an originalEvent sub-hash.
    normalizeTouchEvents: function(event) {
        if (!event.touches) {
            event.touches = event.originalEvent.touches;
        }
        if (!event.pageX) {
            event.pageX = event.originalEvent.pageX;
        }
        if (!event.pageY) {
            event.pageY = event.originalEvent.pageY;
        }
        if (!event.screenX) {
            event.screenX = event.originalEvent.screenX;
        }
        if (!event.screenY) {
            event.screenY = event.originalEvent.screenY;
        }
        if (!event.clientX) {
            event.clientX = event.originalEvent.clientX;
        }
        if (!event.clientY) {
            event.clientY = event.originalEvent.clientY;
        }
        return event;
    },

    $: function(args) {
        args = Array.prototype.slice.call(arguments);
        var owner = this.get('owner');
        return owner.$.apply(owner, args);
    }
});

Flame.State.reopenClass({
    gotoFlameState: function(stateName, returnValue) {
        return function() {
            this.gotoFlameState(stateName);
            return returnValue === undefined ? true : returnValue;
        };
    }
});

Flame.Statechart = {
    initialFlameState: null,
    currentFlameState: undefined,

    init: function() {
        this._super();

        // Look for defined states and initialize them
        var key;
        for (key in this) {
            var state = this[key];
            if (Flame.State.detect(state)) {
                this[key] = state.create({ owner: this, name: key });
                this._setupProxyMethods(this[key]);
            }
        }
        Ember.assert('No initial state defined for statechart!', !Ember.isNone(this.get('initialFlameState')));
        this.gotoFlameState(this.get('initialFlameState'));
    },

    /**
      Sets up proxy methods so that methods called on the owner of the statechart
      will be invoked on the current state if they are not present on the owner of
      the statechart.
    */
    _setupProxyMethods: function(state) {
        for (var property in state) {
            if (state.constructor.prototype.hasOwnProperty(property) && Ember.typeOf(state[property]) === 'function' &&
                !this[property] && property !== 'enterState' && property !== 'exitState') {
                this[property] = function(methodName) {
                    return function(args) {
                        args = Array.prototype.slice.call(arguments);
                        args.unshift(methodName);
                        return this.invokeStateMethod.apply(this, args);
                    };
                }(property);
            }
        }
    },

    gotoFlameState: function(stateName) {
        Ember.assert('Cannot go to an undefined or null state!', !Ember.isNone(stateName));
        var currentFlameState = this.get('currentFlameState');
        var newState = this.get(stateName);
        // do nothing if we are already in the state to go to
        if (currentFlameState === newState) {
            return;
        }
        if (!Ember.isNone(newState) && newState instanceof Flame.State) {
            if (!Ember.isNone(currentFlameState)) {
                if (currentFlameState.exitState) currentFlameState.exitState();
            }
            this.set('currentFlameState', newState);
            if (newState.enterState) newState.enterState();
        } else {
            throw new Error('%@ is not a state!'.fmt(stateName));
        }
    },

    invokeStateMethod: function(methodName, args) {
        args = Array.prototype.slice.call(arguments); args.shift();
        var state = this.get('currentFlameState');
        Ember.assert('Cannot invoke state method without having a current state!', !Ember.isNone(state) && state instanceof Flame.State);
        var method = state[methodName];
        if (Ember.typeOf(method) === 'function') {
            return method.apply(state, args);
        } else if (methodName === 'keyDown') {
            args.unshift(methodName);
            return !this._handleKeyEvent.apply(this, args);
        }
    }
};
