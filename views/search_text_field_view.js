//= require ./text_field_view

Flame.SearchTextFieldView = Flame.TextFieldView.extend({
    classNames: ['flame-search-field'],

    cancel: function() {
        if (Ember.empty(this.get('value'))) {
            // Nothing to clear, we don't handle the event
            return false;
        } else {
            // I don't know why, but for this to work in Firefox we need to run
            // it in the next run loop.
            Ember.run.next(this, function() {
                this.set('value', '');
            });
            return true;
        }
    }
});

