Flame.TextAreaView = Flame.View.extend({
    classNames: ['flame-text'],
    childViews: ['textArea'],
    layout: { left: 0, top: 0 },
    defaultHeight: 20,
    defaultWidth: 200,
    acceptsKeyResponder: true,

    value: '',
    placeholder: null,
    isValid: null,
    isVisible: true,
    isDisabled: false,
    readonly: false,

    becomeKeyResponder: function() {
        this.get('textArea').becomeKeyResponder();
    },

    textArea: Ember.TextArea.extend(Flame.EventManager, Flame.FocusSupport, {
        classNameBindings: ['isInvalid', 'isFocused'],
        acceptsKeyResponder: true,
        // Start from a non-validated state. 'isValid' being null means that it hasn't been validated at all (perhaps
        // there's no validator attached) so it doesn't make sense to show it as invalid.
        isValid: null,
        isInvalid: Ember.computed.equal('isValid', false),
        value: Ember.computed.alias('parentView.value'),
        placeholder: Ember.computed.alias('parentView.placeholder'),
        isVisible: Ember.computed.alias('parentView.isVisible'),
        disabled: Ember.computed.alias('parentView.isDisabled'),
        readonly: Ember.computed.alias('parentView.readonly'),

        keyDown: function() { return false; },
        keyUp: function() {
            this._elementValueDidChange();
            return false;
        }
    })
});
