//= require ./text_field_view

Flame.SearchTextFieldView = Flame.TextFieldView.extend({
    classNames: ['flame-search-field'],

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
