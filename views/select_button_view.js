import ButtonView from './button_view';
import MenuView from './menu_view';
import { image } from '../utils/images';

export default ButtonView.extend({
    classNames: ['flame-select-button-view'],
    items: [],
    value: undefined,
    defaultHeight: 22,
    itemTitleKey: 'title',
    itemValueKey: 'value',
    itemActionKey: 'action',
    subMenuKey: 'subMenu',

    handlebars: function() {
        var itemTitleKey = this.get('itemTitleKey');
        return '<label {{bind-attr title="view._selectedMenuItem.%@"}}>{{view._selectedMenuItem.%@}}</label><div><img src="%@"></div>'.fmt(itemTitleKey, itemTitleKey, image('select_button_arrow.svg'));
    }.property('itemTitleKey'),

    _selectedMenuItem: function() {
        if (this.get('value') === undefined) return undefined;
        var selectedItem = this._findItem();
        return selectedItem;
    }.property('value', 'itemValueKey', 'subMenuKey', 'items'),

    itemsDidChange: function() {
        if (this.get('items') && this.get('items.length') > 0 && !this._findItem()) {
            this.set('value', this.get('items.firstObject.%@'.fmt(this.get('itemValueKey'))));
        }
    }.observes('items'),

    _findItem: function(itemList) {
        // TODO Rewrite this to return a path to the item or an empty array in case no item can be found.
        if (!itemList) itemList = this.get('items');
        var itemValueKey = this.get('itemValueKey'),
            value = this.get('value'),
            subMenuKey = this.get('subMenuKey'),
            foundItem;
        if (Ember.isNone(itemList)) return foundItem;
        itemList.forEach(function(item) {
            var subMenu = Ember.get(item, subMenuKey);
            if (Ember.get(item, itemValueKey) === value) {
                foundItem = item;
                return;
            }
            if (!Ember.isEmpty(subMenu)) {
                var possiblyFound = this._findItem(subMenu);
                if (!Ember.isNone(possiblyFound)) foundItem = possiblyFound;
            }
        }, this);
        return foundItem;
    },

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

        // This has to be created dynamically to set the selectButtonView reference (parentView does not work
        // because a menu is added on the top level of the view hierarchy, not as a child of this view)
        var self = this;
        var properties = {
            selectButtonView: this,
            itemTitleKey: this.get('itemTitleKey'),
            itemValueKey: this.get('itemValueKey'),
            itemActionKey: this.get('itemActionKey'),
            subMenuKey: this.get('subMenuKey'),
            items: Ember.computed.alias('selectButtonView.items'),
            value: Ember.computed.alias('selectButtonView.value'),
            minWidth: this.get('layout.width') || this.$().width(),
            close: function() {
                self.gotoFlameState('idle');
                this._super();
            }
        };

        if (this.get('isSelectable')) properties.isSelectable = this.get('isSelectable');

        MenuView.createWithMixins(properties).popup(this);
    }
});
