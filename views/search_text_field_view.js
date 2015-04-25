//= require ./text_field_view

Flame.SearchTextFieldView = Flame.TextFieldView.extend({
    classNames: ['flame-search-field'],
    childViews: ['textField', 'clearButton'],

    clearButton: Flame.ButtonView.extend({
        resetClassNames: true,
        layout: { right: 5, top: 2 },
        isVisible: Ember.computed.bool('parentView.value'),
        handlebars: '<img src="/assets/images/search_clear.svg">',

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
