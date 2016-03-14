import { keyResponderStack } from './event_manager';

export default Ember.Mixin.create({
    // To make text fields/areas behave consistently with our concept of key responder, we have to also
    // tell the browser to focus/blur the input field
    didBecomeKeyResponder: function() {
        var $element = this.$();
        // Webkit browsers jump the caret to the end of the (text)input on programmatical focus,
        // so we wait minimally for the browser to do its focusing and see if ours is still needed
        if ($element) {
            Ember.run.next(function() {
                if (document.activeElement !== $element[0]) $element.focus();
            });
        }
    },

    didLoseKeyResponder: function() {
        var $element = this.$();
        if ($element) $element.blur();
    },

    focusIn: function() {
        if (keyResponderStack.current() !== this) {
            this.becomeKeyResponder();
        }
    },

    focusOut: function() {
        if (keyResponderStack.current() === this) {
            // If focus was lost from the document, keep the "local" focus intact
            if (document.hasFocus()) this.resignKeyResponder();
        }
    }
});
