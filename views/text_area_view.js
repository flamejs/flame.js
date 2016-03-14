import View from '../view';
import EventManager from '../mixins/event_manager';
import FocusSupport from '../mixins/focus_support';

const { alias, equal } = Ember.computed;

export default View.extend({
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

    textArea: Ember.TextArea.extend(EventManager, FocusSupport, {
        classNameBindings: ['isInvalid', 'isFocused'],
        acceptsKeyResponder: true,
        // Start from a non-validated state. 'isValid' being null means that it hasn't been validated at all (perhaps
        // there's no validator attached) so it doesn't make sense to show it as invalid.
        isValid: null,
        isInvalid: equal('isValid', false),
        value: alias('parentView.value'),
        placeholder: alias('parentView.placeholder'),
        isVisible: alias('parentView.isVisible'),
        disabled: alias('parentView.isDisabled'),
        readonly: alias('parentView.readonly'),

        keyDown: function() { return false; },
        keyUp: function() {
            this._elementValueDidChange();
            return false;
        }
    })
});
