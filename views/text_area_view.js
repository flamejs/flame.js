Flame.TextAreaView = Flame.View.extend({
    classNames: ['flame-text'],
    childViews: ['textArea'],
    layout: { left: 0, top: 0 },
    defaultHeight: 20,
    defaultWidth: 200,

    value: '',
    placeholder: null,
    isValid: null,
    isVisible: true,

    becomeKeyResponder: function() {
        this.get('textArea').becomeKeyResponder();
    },

    textArea: Ember.TextArea.extend(Flame.EventManager, Flame.FocusSupport, {
        classNameBindings: ['isInvalid', 'isFocused'],
        acceptsKeyResponder: true,
        // Start from a non-validated state. 'isValid' being null means that it hasn't been validated at all (perhaps
        // there's no validator attached) so it doesn't make sense to show it as invalid.
        isValid: null,
        isInvalidBinding: Ember.Binding.from('isValid').transform(function(v) {
            return v === false;
        }).oneWay(),
        valueBinding: '^value',
        placeholderBinding: '^placeholder',
        isVisibleBinding: '^isVisible',

        keyDown: function() { return false; },
        keyUp: function() {
            this._elementValueDidChange();
            return false;
        }
    })
});

