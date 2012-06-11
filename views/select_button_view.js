Flame.SelectButtonView = Flame.ButtonView.extend({
    classNames: ['flame-select-button-view'],
    items: [],
    value: undefined,
    defaultHeight: 22,
    itemTitleKey: 'title',
    itemValueKey: 'value',
    itemActionKey: 'action',
    subMenuKey: "subMenu",

    handlebars: function() {
        var itemTitleKey = this.get('itemTitleKey');
        return '<label {{bindAttr title="_selectedMenuItem.%@"}}>{{_selectedMenuItem.%@}}</label><div><img src="%@"></div>'.fmt(itemTitleKey, itemTitleKey, Flame.image('select_button_arrow.png'));
    }.property("value", "_selectedMenuItem").cacheable(),

    _selectedMenuItem: function() {
        if (this.get('value') === undefined) { return undefined; }
        var selectedItem = this._findItem();
        return selectedItem;
    }.property("value", "itemValueKey", "subMenuKey", "items").cacheable(),

    itemsDidChange: function() {
        if (this.get('items') && this.getPath('items.length') > 0 && !this._findItem()) {
            this.set('value', this.getPath('items.firstObject.%@'.fmt(this.get('itemValueKey'))));
        }
    }.observes('items'),

    _findItem: function(itemList) {
        if (!itemList) itemList = this.get('items');
        var itemValueKey = this.get('itemValueKey'),
            value = this.get('value'),
            subMenuKey = this.get('subMenuKey'),
            foundItem;
        if (Ember.none(itemList)) { return foundItem; }
        itemList.forEach(function(item) {
            if (Ember.get(item, subMenuKey)) {
                var possiblyFound = this._findItem(Ember.get(item, subMenuKey));
                if (!Ember.none(possiblyFound)) { foundItem = possiblyFound; }
            } else if (Ember.get(item, itemValueKey) === value) {
                foundItem = item;
            }
        }, this);
        return foundItem;
    },

    menu: function() {
        // This has to be created dynamically to set the selectButtonView reference (parentView does not work
        // because a menu is added on the top level of the view hierarchy, not as a children of this view)
        var self = this;
        return Flame.MenuView.extend({
            selectButtonView: this,
            itemTitleKey: this.get('itemTitleKey'),
            itemValueKey: this.get('itemValueKey'),
            itemActionKey: this.get('itemActionKey'),
            subMenuKey: this.get('subMenuKey'),
            itemsBinding: 'selectButtonView.items',
            valueBinding: 'selectButtonView.value',
            minWidth: this.getPath('layout.width') || this.$().width(),
            close: function() {
                self.gotoState('idle');
                this._super();
            }
        });
    }.property(),

    mouseDown: function() {
        this._openMenu();
        return false;
    },

    insertSpace: function() {
        this._openMenu();
        return true;
    },

    _openMenu: function() {
        this.gotoState('mouseDownInside');
        this.get('menu').create().popup(this);
    }
});
