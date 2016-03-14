import ButtonView from './button_view';
import MultiselectionMenuView from './multiselection_menu_view';
import { image } from '../utils/images';

export default ButtonView.extend({
    classNames: ['flame-select-button-view'],
    items: [],
    value: undefined,
    defaultHeight: 22,
    itemTitleKey: 'title',
    itemValueKey: 'value',
    itemActionKey: 'action',
    _menuOpen: false,
    /**
      formatTitle is a method which forms the string shown as a title. This property is supposed to
      be set to another function, in which @param = (array of option values) and return value is a string
    */
    formatTitle: function(value) {
        if (value) {
            value.sort();
            return value.toString();
        } else {
            return "";
        }
    },

    handlebars: '<label {{bind-attr title=view._selectedMultipleItemValue}}>{{view._selectedMultipleItemValue}}</label>' +
                '<div><img src="%@"></div>'.fmt(image('select_button_arrow.svg')),

    _selectedMultipleItemValue: function() {
        return this.formatTitle(this.get('value'));
    }.property('value.[]'),

    mouseDown: function() {
        if (!this.get('isDisabled')) this._openMenu();
        return true;
    },

    insertSpace: function() {
        this._openMenu();
        return true;
    },

    _openMenu: function() {
        this.gotoFlameState('mouseDownInside');
        this.set('_menuOpen', true);

        var self = this;
        MultiselectionMenuView.createWithMixins({
            multiselectionButtonView: this,
            itemTitleKey: this.get('itemTitleKey'),
            itemValueKey: this.get('itemValueKey'),
            itemActionKey: this.get('itemActionKey'),
            items: Ember.computed.alias('multiselectionButtonView.items'),
            value: Ember.computed.alias('multiselectionButtonView.value'),
            minWidth: this.get('layout.width') || this.$().width(),

            close: function() {
                self.gotoFlameState('idle');
                self.set('_menuOpen', false);
                this._super();
            }
        }).popup(this);
    }
});
