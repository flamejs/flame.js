import ButtonView from './button_view';
import SelectButtonView from './select_button_view';
import TextFieldView from './text_field_view';

import '../stylesheets/views/combo_box_view.css.scss';

import selectButtonArrow from 'lib/flame/images/select_button_arrow.svg';

export default SelectButtonView.extend({
    classNames: ['flame-combo-box-view'],
    childViews: ['textView', 'buttonView'],
    handlebars: null,
    acceptsKeyResponder: false,

    textView: TextFieldView.extend({
        layout: { left: 0, right: 3 },
        value: Ember.computed.alias('parentView.value')
    }),

    insertSpace: function() { return false; },

    buttonView: ButtonView.extend({
        acceptsKeyResponder: false,
        handlebars: `<img src="${selectButtonArrow}">`,
        layout: { right: -2, width: 22, height: 22 },

        action: function() {
            this.get('parentView')._openMenu();
        }
    })
});
