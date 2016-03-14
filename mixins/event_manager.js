const KEY_BINDINGS = {
    8: 'deleteBackward',
    9: 'insertTab',
    13: 'insertNewline',
    27: 'cancel',
    32: 'insertSpace',
    37: 'moveLeft',
    38: 'moveUp',
    39: 'moveRight',
    40: 'moveDown',
    46: 'deleteForward'
};

const MODIFIED_KEY_BINDINGS = {
    8: 'deleteForward',
    9: 'insertBacktab',
    37: 'moveLeftAndModifySelection',
    38: 'moveUpAndModifySelection',
    39: 'moveRightAndModifySelection',
    40: 'moveDownAndModifySelection'
};

// See TextFieldView for details on what this is needed for
export const ALLOW_BROWSER_DEFAULT_HANDLING = {};  // Just a marker value

export const mouseResponder = Ember.Object.create({
    current: undefined // Which view handled the last mouseDown event?
});

/**
  Holds a stack of key responder views. With this we can neatly handle restoring the previous key responder
  when some modal UI element is closed. There's a few simple rules that governs the usage of the stack:
   - mouse click does .replace (this should also be used for programmatically taking focus when not a modal element)
   - opening a modal UI element does .push
   - closing a modal element does .pop

  Also noteworthy is that a view will be signaled that it loses the key focus only when it's popped off the
  stack, not when something is pushed on top. The idea is that when a modal UI element is opened, we know
  that the previously focused view will re-gain the focus as soon as the modal element is closed. So if the
  previously focused view was e.g. in the middle of some edit operation, it shouldn't cancel that operation.
*/
export const keyResponderStack = Ember.Object.createWithMixins({
    _stack: [],

    // Observer-friendly version of getting current
    currentKeyResponder: function() {
        return this.current();
    }.property().volatile(),

    current: function() {
        var length = this._stack.get('length');
        if (length > 0) return this._stack.objectAt(length - 1);
        else return undefined;
    },

    push: function(view) {
        if (!Ember.isNone(view)) {
            if (view.willBecomeKeyResponder) view.willBecomeKeyResponder();
            if (view.set && !view.isDestroyed) view.set('isFocused', true);
            this._stack.push(view);
            if (view.didBecomeKeyResponder) view.didBecomeKeyResponder();
            this.propertyDidChange('currentKeyResponder');
        }
        return view;
    },

    pop: function() {
        if (this._stack.get('length') > 0) {
            var current = this.current();
            if (current && current.willLoseKeyResponder) current.willLoseKeyResponder();  // Call before popping, could make a difference
            var view = this._stack.pop();
            if (view.set && !view.isDestroyed) view.set('isFocused', false);
            if (view.didLoseKeyResponder) view.didLoseKeyResponder();
            this.propertyDidChange('currentKeyResponder');
            return view;
        }
    },

    replace: function(view) {
        var current = this.current();
        if (current !== view) {
            if (current && !(current instanceof Ember.View)) {
                current.blur();
            }
            this.pop();
            return this.push(view);
        }
    }
});

// Set up a handler on the document for key events.
Ember.$(document).on('keydown.flame keypress.flame', null, function(event, triggeringManager) {
    if (keyResponderStack.current() instanceof Ember.View && keyResponderStack.current().get('isVisible')) {
        return keyResponderStack.current().handleKeyEvent(event, keyResponderStack.current());
    }
    return true;
});

// Handle mouseUp outside of the window
Ember.$(window).on('mouseup', function(event) {
    var mouseResponderView = mouseResponder.get('current');
    if (mouseResponderView !== undefined) {
        // Something (e.g. AJAX callback) may remove the responderView from DOM between mouseDown
        // and mouseUp. In that case return true to ignore the event.
        if (mouseResponderView.get('_state') !== 'inDOM') return true;

        mouseResponder.set('current', undefined);
        return !mouseResponderView.get('eventManager')._dispatch('mouseUp', event, mouseResponderView);
    }
});

// This logic is needed so that the view that handled mouseDown will receive mouseMoves and the eventual mouseUp, even if the
// pointer no longer is on top of that view. Without this, you get inconsistencies with buttons and all controls that handle
// mouse click events. The ember event dispatcher always first looks up 'eventManager' property on the view that's
// receiving an event, and lets that handle the event, if defined. So this should be mixed in to all the Flame views.
export default Ember.Mixin.create({
    // Set to true in your view if you want to accept key responder status (which is needed for handling key events)
    acceptsKeyResponder: false,

    /**
      Sets this view as the target of key events. Call this if you need to make this happen programmatically.
      This gets also called on mouseDown if the view handles that, returns true and doesn't have property 'acceptsKeyResponder'
      set to false. If mouseDown returned true but 'acceptsKeyResponder' is false, this call is propagated to the parent view.

      If called with no parameters or with replace = true, the current key responder is first popped off the stack and this
      view is then pushed. See comments for keyResponderStack above for more insight.
    */
    becomeKeyResponder: function(replace) {
        if (this.get('acceptsKeyResponder') !== false && !this.get('isDisabled')) {
            if (replace === undefined || replace === true) {
                keyResponderStack.replace(this);
            } else {
                keyResponderStack.push(this);
            }
        } else {
            var parent = this.get('parentView');
            if (parent && parent.becomeKeyResponder) return parent.becomeKeyResponder(replace);
        }
    },

    /**
      Resign key responder status by popping the head off the stack. The head might or might not be this view,
      depending on whether user clicked anything since this view became the key responder. The new key responder
      will be the next view in the stack, if any.
    */
    resignKeyResponder: function() {
        keyResponderStack.pop();
    },

    eventManager: {
        mouseDown: function(event, view) {
            view.becomeKeyResponder();  // Becoming a key responder is independent of mouseDown handling
            mouseResponder.set('current', undefined);
            var handlingView = this._dispatch('mouseDown', event, view);
            if (handlingView) {
                mouseResponder.set('current', handlingView);
            }
            return !handlingView;
        },

        mouseUp: function(event, view) {
            var mouseResponderView = mouseResponder.get('current');
            if (mouseResponderView !== undefined) {
                // Something (e.g. AJAX callback) may remove the responderView from DOM between mouseDown
                // and mouseUp. In that case return true to ignore the event.
                if (mouseResponderView.get('_state') !== 'inDOM') return true;

                view = mouseResponderView;
                mouseResponder.set('current', undefined);
            }
            return !this._dispatch('mouseUp', event, view);
        },

        mouseMove: function(event, view) {
            var mouseResponderView = mouseResponder.get('current');
            if (mouseResponderView !== undefined) {
                // Something (e.g. AJAX callback) may remove the responderView from DOM between mouseDown
                // and/or mouseMove. In that case return true to ignore the event.
                if (mouseResponderView.get('_state') !== 'inDOM') return true;

                view = mouseResponderView;
            }
            return !this._dispatch('mouseMove', event, view);
        },

        doubleClick: function(event, view) {
            if (mouseResponder.get('current') !== undefined) {
                view = mouseResponder.get('current');
            }
            return !this._dispatch('doubleClick', event, view);
        },

        keyDown: function(event) {
            if (keyResponderStack.current() instanceof Ember.View && keyResponderStack.current().get('isVisible')) {
                return keyResponderStack.current().handleKeyEvent(event, keyResponderStack.current());
            }
            return true;
        },

        keyPress: function(event) {
            if (keyResponderStack.current() instanceof Ember.View && keyResponderStack.current().get('isVisible')) {
                return keyResponderStack.current().handleKeyEvent(event, keyResponderStack.current());
            }
            return true;
        },

        // For the passed in view, calls the method with the name of the event, if defined. If that method
        // returns true, returns the view. If the method returns false, recurses on the parent view. If no
        // view handles the event, returns false.
        _dispatch: function(eventName, event, view) {
            var handler = view.get(eventName);
            if (handler) {
                var result = handler.call(view, event, view);
                if (result === ALLOW_BROWSER_DEFAULT_HANDLING) return false;
                else if (result) return view;
            }
            var parentView = view.get('parentView');
            if (parentView) return this._dispatch(eventName, event, parentView);
            else return false;
        }
    }
});

var eventHandlers = {
    interpretKeyEvents: function(event) {
        var mapping = event.shiftKey ? MODIFIED_KEY_BINDINGS : KEY_BINDINGS;
        var eventName = mapping[event.keyCode];
        if (eventName && this[eventName]) {
            var handler = this[eventName];
            if (typeof handler === 'function') {
                return handler.call(this, event, this);
            }
        }
        return false;
    },

    handleKeyEvent: function(event, view) {
        var emberEvent = null;
        switch (event.type) {
            case 'keydown':
                emberEvent = 'keyDown';
                break;
            case 'keypress':
                emberEvent = 'keyPress';
                break;
        }
        var handler = emberEvent ? this.get(emberEvent) : null;
        if (handler) {
            // Note that in jQuery, the contract is that event handler should return
            // true to allow default handling, false to prevent it. But in Ember, event handlers return true if they handled the event,
            // false if they didn't, so we want to invert that return value here.
            return !handler.call(keyResponderStack.current(), event, keyResponderStack.current());
        }
        return this._handleKeyEvent(emberEvent, event, view);
    },

    _handleKeyEvent: function(eventName, event, view) {
        if (eventName === 'keyDown') { // Try to hand down the event to a more specific key event handler
            var result = this.interpretKeyEvents(event);
            if (result === ALLOW_BROWSER_DEFAULT_HANDLING) return true;
            if (result) return false;
        }
        if (this.get('parentView')) {
            return this.get('parentView').handleKeyEvent(event, view);
        }
        return true;
    }
};

Ember.View.reopen(eventHandlers);
Ember.TextSupport.reopen(eventHandlers);
