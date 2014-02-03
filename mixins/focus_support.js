Flame.FocusSupport = {
    // To make text fields/areas behave consistently with our concept of key responder, we have to also
    // tell the browser to focus/blur the input field
    didBecomeKeyResponder: function() {
        var $element = this.$();
        if ($element) $element.focus();
    },

    didLoseKeyResponder: function() {
        var $element = this.$();
        if ($element) $element.blur();
    },

    focusIn: function() {
        if (Flame.keyResponderStack.current() !== this) {
            this.becomeKeyResponder();
        }
    },

    focusOut: function() {
        if (Flame.keyResponderStack.current() === this) {
            // If focus was lost from the document, keep the "local" focus intact
            if (document.hasFocus()) this.resignKeyResponder();
        }
    }
};
