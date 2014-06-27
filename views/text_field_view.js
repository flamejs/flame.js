Flame.TextField = Ember.TextField.extend(Flame.EventManager, Flame.FocusSupport, {
    classNameBindings: ['isInvalid', 'isEditableLabel', 'isFocused'],
    acceptsKeyResponder: true,
    type: Flame.computed.trueFalse('parentView.isPassword', 'password', 'text'),
    isInvalid: Ember.computed.equal('parentView.isValid', false),
    value: Ember.computed.alias('parentView.value'),
    placeholder: Ember.computed.alias('parentView.placeholder'),
    isEditableLabel: Ember.computed.alias('parentView.isEditableLabel'),
    isVisible: Ember.computed.alias('parentView.isVisible'),
    disabled: Ember.computed.alias('parentView.isDisabled'),
    attributeBindings: ['name', 'disabled'],
    _setValueDelay: 700,
    _timer: null,ame: Ember.computed.alias('parentView.name'),

    init: function() {
        this._super();
        // This would normally call `interpretKeyEvents`, but Flame.EventManager
        // already does this on `keyDown`.
        this.off('keyUp');
        this.off('input');
        this.on('input', this, this._setValue);
    },

    willDestroyElement: function() {
        if (!this.get('parentView.setValueOnEachKeyUp')) {
            if (this._timer) Ember.run.cancel(this._timer);
            this._elementValueDidChange();
        }
    },

    _setValue: function() {
        if (this.get('parentView.setValueOnEachKeyUp')) {
            this._elementValueDidChange();
        } else {
            if (this._timer) Ember.run.cancel(this._timer);
            this._timer = Ember.run.later(this, function() {
                this._elementValueDidChange();
            }, this._setValueDelay);
        }
    },

    // Trigger a value change notification also when inserting a new line. Otherwise the action could be fired
    // before the changed value is propagated to this.value property.
    insertNewline: function() {
        this._elementValueDidChange();
        Ember.run.sync();
        return false;
    },

    cancel: function() { return false; },

    // The problem here is that we need browser's default handling for these events to make the input field
    // work. If we had no handlers here and no parent/ancestor view has a handler returning true, it would
    // all work. But if any ancestor had a handler returning true, the input field would break, because
    // true return value signals jQuery to cancel browser's default handling. It cannot be remedied by
    // returning true here, because that has the same effect, thus we need a special return value (which
    // Flame.EventManager handles specially by stopping the parent propagation).
    mouseDown: function() { return Flame.ALLOW_BROWSER_DEFAULT_HANDLING; },
    mouseMove: function() { return Flame.ALLOW_BROWSER_DEFAULT_HANDLING; },
    mouseUp: function() { return Flame.ALLOW_BROWSER_DEFAULT_HANDLING; }
});

/**
  The actual text field is wrapped in another view since browsers like Firefox
  and IE don't support setting the `right` CSS property (used by LayoutSupport)
  on input fields.
*/
Flame.TextFieldView = Flame.View.extend(Flame.ActionSupport, {
    classNames: ['flame-text'],
    childViews: ['textField'],
    acceptsKeyResponder: true,

    layout: { left: 0, top: 0 },
    defaultHeight: 22,
    defaultWidth: 200,

    value: '',
    placeholder: null,
    isPassword: false,
    isValid: null,
    isEditableLabel: false,
    isVisible: true,
    isDisabled: false,
    name: null,
    /**
      It might be that setting the value is very costly. In that case, instead of
      setting the value on each key up, when `setValueOnEachKeyUp` is set to false
      the value is only set after typing has stopped for the value set in `_setValueDelay`.
    */
    setValueOnEachKeyUp: true,

    becomeKeyResponder: function() {
        this.get('textField').becomeKeyResponder();
    },

    insertNewline: function() {
        return this.fireAction();
    },

    textField: Flame.TextField
});
