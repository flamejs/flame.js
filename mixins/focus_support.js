Flame.FocusSupport = {
    // To make text fields/areas behave consistently with our concept of key responder, we have to also
    // tell the browser to focus/blur the input field
    didBecomeKeyResponder: function() {
        this.$().focus();
    },

    didLoseKeyResponder: function() {
        this.$().blur();
    },

    focusIn: function() {
        if (Flame.keyResponderStack.current() !== this) {
            this.becomeKeyResponder();
        }
    },

    focusOut: function() {
        if (Flame.keyResponderStack.current() === this) {
            this.resignKeyResponder();
        }
    }
};

