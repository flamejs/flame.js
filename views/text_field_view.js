import View from '../view';
import ActionSupport from '../mixins/action_support';
import EventManager, { ALLOW_BROWSER_DEFAULT_HANDLING } from '../mixins/event_manager';
import FocusSupport from '../mixins/focus_support';
import { trueFalse } from '../utils/computed';

import '../stylesheets/views/text_field_view.scss';

const { alias, equal } = Ember.computed;

export const TextField = Ember.TextField.extend(EventManager, FocusSupport, {
    classNameBindings: ['isInvalid', 'isEditableLabel', 'isFocused'],
    acceptsKeyResponder: true,
    type: trueFalse('parentView.isPassword', 'password', 'text'),
    isInvalid: equal('parentView.isValid', false),
    value: alias('parentView.value'),
    placeholder: alias('parentView.placeholder'),
    isEditableLabel: alias('parentView.isEditableLabel'),
    isVisible: alias('parentView.isVisible'),
    disabled: alias('parentView.isDisabled'),
    name: alias('parentView.name'),
    attributeBindings: ['name', 'disabled'],
    _setValueDelay: 700,
    _timer: null,

    init: function() {
        this._super();
        // This would normally call `interpretKeyEvents`, but EventManager
        // already does this on `keyDown`.
        this.off('keyUp');
        this.off('input');
        this.on('input', this, this._setValue);
    },

    willDestroyElement: function() {
        if (this._timer) {
            Ember.run.cancel(this._timer);
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
    // EventManager handles specially by stopping the parent propagation).
    mouseDown: function() { return ALLOW_BROWSER_DEFAULT_HANDLING; },
    mouseMove: function() { return ALLOW_BROWSER_DEFAULT_HANDLING; },
    mouseUp: function() { return ALLOW_BROWSER_DEFAULT_HANDLING; }
});

/**
  The actual text field is wrapped in another view since browsers like Firefox
  and IE don't support setting the `right` CSS property (used by LayoutSupport)
  on input fields.
*/
export default View.extend(ActionSupport, {
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

    textField: TextField
});
