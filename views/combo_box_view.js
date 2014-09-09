//= require ./select_button_view
//= require ./text_field_view

Flame.ComboBoxView = Flame.SelectButtonView.extend({
    classNames: ['flame-combo-box-view'],
    childViews: ['textView', 'buttonView'],
    handlebars: null,
    acceptsKeyResponder: false,

    textView: Flame.TextFieldView.extend({
        layout: { left: 0, right: 3 },
        value: Ember.computed.alias('parentView.value')
    }),

    insertSpace: function() { return false; },

    buttonView: Flame.ButtonView.extend({
        acceptsKeyResponder: false,
        handlebars: '<img src="%@">'.fmt(Flame.image('select_button_arrow.svg')),
        layout: { right: -2, width: 22, height: 22 },

        action: function() {
            this.get('parentView')._openMenu();
        }
    })
});
