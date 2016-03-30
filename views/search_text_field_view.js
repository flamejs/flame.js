import TextFieldView from './text_field_view';
import ButtonView from './button_view';

export default TextFieldView.extend({
    classNames: ['flame-search-field'],
    childViews: ['textField', 'clearButton'],

    clearButton: ButtonView.extend({
        resetClassNames: true,
        layout: { right: 5, top: 2 },
        isVisible: Ember.computed.bool('parentView.value'),
        image: require('lib/flame/images/search_clear.svg'),
        handlebars: "<img src='{{unbound view.image}}'>",
        action: function() {
            this.get('parentView').cancel();
        }
    }),

    cancel: function() {
        if (Ember.isEmpty(this.get('value'))) {
            // Nothing to clear, we don't handle the event
            return false;
        } else {
            this.set('value', '');
            return true;
        }
    }
});
