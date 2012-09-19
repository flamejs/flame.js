//= require ./select_button_view
//= require ./text_field_view

Flame.ComboBoxView = Flame.SelectButtonView.extend({
    classNames: ['flame-combo-box-view'],
    childViews: 'textView buttonView'.w(),
    handlebars: undefined,
    acceptsKeyResponder: false,

    textView: Flame.TextFieldView.extend({
        layout: { left: 0, right: 0 },
        valueBinding: 'parentView.value'
    }),

    insertSpace: function() { return false; },

    buttonView: Flame.ButtonView.extend({
        acceptsKeyResponder: false,
        handlebars: '<img src="%@">'.fmt(Flame.image('select_button_arrow.png')),
        layout: { right: -5, width: 22, height: 22 },

        action: function() {
            this.get('parentView')._openMenu();
        }
    })
});
