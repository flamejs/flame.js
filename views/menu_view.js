//= require ./panel
//= require ./collection_view
//= require ../mixins/action_support
//= require ./menu_scroll_view

// Only to be used in Flame.MenuView. Represent menu items with normal JS objects as creation of one Ember object took
// 3.5 ms on fast IE8 machine.
Flame.MenuItem = function MenuItem(opts) {
    for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }
};

Flame.MenuItem.prototype.renderToBuffer = function(buffer) {
    var classes = ['flame-view', 'flame-list-item-view', 'flame-menu-item-view'];
    if (this.isSelected) classes.push('is-selected');
    if (!this.isEnabled()) classes.push('is-disabled');
    var subMenuLength = Ember.isNone(this.subMenuItems) ? -1 : this.subMenuItems.get('length');
    var template = '<div id="%@" class="%@" %@>%@%@%@</div>';
    buffer.push(
        template.fmt(
            this.id,
            classes.join(' '),
            this.item.tooltip ? 'title="%@"'.fmt(this.item.tooltip) : '',
            this.isChecked ? '<div class="flame-menu-item-view-checkmark"></div>' : '',
            Handlebars.Utils.escapeExpression(this.title),
            subMenuLength > 0 ? '<div class="menu-indicator"></div>' : ''
        )
    );
};

Flame.MenuItem.prototype.isEnabled = function() {
    return !(this.isDisabled || (this.subMenuItems && this.subMenuItems.length === 0));
};

Flame.MenuItem.prototype.isSelectable = function() {
    return this.isEnabled() && !this.subMenuItems;
};

Flame.MenuItem.prototype.$ = function() {
    return Ember.$('#%@'.fmt(this.id));
};

Flame.MenuItem.prototype.closeSubMenu = function() {
    var subMenu = this.subMenuView;
    if (!Ember.isNone(subMenu)) {
        subMenu.close();
        this.subMenuView = null;
    }
};

/**
  A menu. Can be shown as a "stand-alone" menu or in cooperation with a SelectButtonView.

  MenuView has a property 'subMenuKey'. Should objects based on which the menu is created return null/undefined for
  that property, the item itself will be selectable. Otherwise if the property has more than zero values, a submenu
  will be shown.

  Because of the implementation details, this menu will hold values of undefined or null as the same as not set. Thus,
  no selectable menu item must have such value their value.
*/
Flame.MenuView = Flame.Panel.extend(Flame.ActionSupport, {
    classNames: ['flame-menu'],
    childViews: ['contentView'],
    contentView: Flame.MenuScrollView,
    dimBackground: false,
    subMenuKey: 'subMenu',
    itemTitleKey: 'title',
    /* Attribute that can be used to indicate a disabled menu item. The item will be disabled only if
     * isEnabled === false, not some falseish value. */
    itemEnabledKey: 'isEnabled',
    itemCheckedKey: 'isChecked',
    itemValueKey: 'value',
    itemActionKey: 'action',
    itemHeight: 21,
    /* Margin between the menu and top/bottom of the viewport. */
    menuMargin: 12,
    minWidth: null, // Defines minimum width of menu
    items: null,
    parentMenu: null,
    value: null,
    _allItemsDoNotFit: true,
    _anchorElement: null,
    _menuItems: null,
    _highlightIndex: -1, // Currently highlighted index.
    _userHighlightIndex: -1, // User selected highlighted index
    // Reflects the content item in this menu or the deepest currently open submenu that is currently highlighted,
    // regardless of whether mouse button is up or down. When mouse button is released, this will be set as the real
    // selection on the top-most menu, unless it's undefined (happens if currently on a non-selectable item)
    // This is to be handled as a unmodifiable object: always create a new object instead of mutating its properties.
    _internalSelection: { isSet: false, value: null },

    init: function() {
        this._super();
        this._needToRecreateItems();
    },

    _calculateMenuWidth: function() {
        var items = this.get('items') || [];
        if (Ember.get(items, 'length') === 0) {
            return;
        }
        var itemTitleKey = this.get('itemTitleKey');
        var allTitles = items.reduce(function(currentTitles, item) {
            var nextTitle = Ember.get(item, itemTitleKey);
            return currentTitles + nextTitle + '<br>';
        }, '');
        // Give the menus a 16px breathing space to account for sub menu indicator, and to give some right margin (+18px for the padding)
        return Flame.measureString(allTitles, 'ember-view flame-view flame-list-item-view flame-menu-item-view', 'title').width + 16 + 18;
    },

    _createMenuItems: function() {
        var items = this.get('items'),
            itemCheckedKey = this.get('itemCheckedKey'),
            itemEnabledKey = this.get('itemEnabledKey'),
            itemTitleKey = this.get('itemTitleKey'),
            itemValueKey = this.get('itemValueKey'),
            subMenuKey = this.get('subMenuKey'),
            selectedValue = this.get('value'),
            valueIsSet = !Ember.isNone(selectedValue),
            menuItems;
        menuItems = (items || []).map(function(item, i) {
            // Only show the selection on the main menu, not in the submenus.
            return new Flame.MenuItem({
                item: item,
                isSelected: valueIsSet ? Ember.get(item, itemValueKey) === selectedValue : false,
                isDisabled: Ember.get(item, itemEnabledKey) === false,
                isChecked: Ember.get(item, itemCheckedKey),
                subMenuItems: Ember.get(item, subMenuKey),
                title: Ember.get(item, itemTitleKey),
                id: this._indexToId(i)
            });
        }, this);
        return menuItems;
    },

    _needToRecreateItems: function() {
        var menuItems = this._createMenuItems();
        this.set('_menuItems', menuItems);
        if (Ember.isNone(this.get('parentMenu'))) {
            menuItems.forEach(function(item, i) {
                if (item.isSelected) this.set('_highlightIndex', i);
            }, this);
        }
        this.get('contentView').setScrolledView(this._createMenuView());
        if (this.get('_anchorElement')) {
            this._updateMenuSize();
        }

        // Set content of scroll stuff
        // calculate the the height of menu
    }.observes('items'),

    _createMenuView: function() {
        var items = this.get('_menuItems');
        return Flame.View.create({
            useAbsolutePosition: false,
            render: function(buffer) {
                items.forEach(function(menuItem) { menuItem.renderToBuffer(buffer); });
            }
        });
    },

    makeSelection: function() {
        var parentMenu = this.get('parentMenu');
        var action, value;
        if (!Ember.isNone(parentMenu)) {
            parentMenu.makeSelection();
            this.close();
        } else {
            var internalSelection = this.get('_internalSelection');
            if (internalSelection.isSet) {
                value = Ember.get(internalSelection.value, this.get('itemValueKey'));
                this.set("value", value);
                // If we have an action, call it on the selection.
                action = Ember.get(internalSelection.value, this.get('itemActionKey')) || this.get('action');
            }
            // Sync the values before we tear down all bindings in close() which calls destroy().
            Ember.run.sync();
            // Close this menu before firing an action - the action might open a new popup, and if closing after that,
            // the new popup panel is popped off the key responder stack instead of this menu.
            this.close();
            if (!Ember.isNone(action)) {
                this.fireAction(action, value);
            }
        }
    },

    subMenu: function() {
        return Flame.MenuView.extend({
            isModal: false,

            popup: function(anchor, position) {
                if (!this.get('layout.width')) {
                    // We already need to know the width of the menu at this point so that Panel#popup
                    // can correctly position it.
                    var menuWidth = Math.max(this.get('minWidth') || 0, this._calculateMenuWidth());
                    this.set('layout.width', menuWidth);
                }
                this._super(anchor, position);
            },

            _layoutRelativeTo: function(anchor, position) {
                var layout = this._super(anchor, position);
                // If already positioned on the left, nothing else needs to be checked.
                if (this.get('subMenuPosition') === Flame.POSITION_LEFT) return layout;

                if (layout.movedX) {
                    // Any further opened submenu should be opened on the left side.
                    this.set('subMenuPosition', Flame.POSITION_LEFT);
                    layout = this._super(anchor, Flame.POSITION_LEFT);
                }
                return layout;
            }
        });
    }.property(),

    // This function is here to break the dependency between MenuView and MenuItemView
    createSubMenu: function(subMenuItems) {
        return this.get('subMenu').create({
            items: subMenuItems,
            parentMenu: this,
            subMenuKey: this.get('subMenuKey'),
            itemEnabledKey: this.get('itemEnabledKey'),
            itemTitleKey: this.get('itemTitleKey'),
            itemValueKey: this.get('itemValueKey'),
            itemHeight: this.get('itemHeight'),
            subMenuPosition: this.get('subMenuPosition')
        });
    },

    closeCurrentlyOpenSubMenu: function() {
        // observers of highlightIndex should take care that closing is propagated to the every open menu underneath
        // this menu. Close() sets highlightIndex to -1, _highlightWillChange() will call closeSubMenu() on the item
        // which then calls close() on the menu it depicts and this is continued until no open menus remain under the
        // closed menu.
        var index = this.get('_highlightIndex');
        if (index >= 0) {
            this.get('_menuItems').objectAt(index).closeSubMenu();
        }
    },

    popup: function(anchorElementOrJQ, position) {
        if (Ember.isNone(this.get('parentMenu'))) {
            this._openedAt = new Date().getTime();
        }
        var anchorElement = anchorElementOrJQ instanceof jQuery ? anchorElementOrJQ : anchorElementOrJQ.$();
        this._super(anchorElement, position);
        this.set('_anchorElement', anchorElement);
        this._updateMenuSize();
    },

    _updateMenuSize: function() {
        var anchorElement = this.get('_anchorElement');
        // These values come from the CSS but we still need to know them here. Is there a better way?
        var paddingTop = 5;
        var paddingBottom = 5;
        var borderWidth = 1;
        var totalPadding = paddingTop + paddingBottom;
        var margin = this.get('menuMargin');
        var menuOuterHeight = this.get('_menuItems').get('length') * this.get('itemHeight') + totalPadding + 2 * borderWidth;
        var wh = $(window).height();
        var anchorTop = anchorElement.offset().top;
        var anchorHeight = anchorElement.outerHeight();
        var layout = this.get('layout');

        var isSubMenu = !Ember.isNone(this.get('parentMenu'));
        var spaceDownwards = wh - anchorTop + (isSubMenu ? (borderWidth + paddingTop) : (-anchorHeight));
        var needScrolling = false;

        if (menuOuterHeight + margin * 2 <= wh) {
            if (isSubMenu && spaceDownwards >= menuOuterHeight + margin) {
                layout.set('top', anchorTop - (borderWidth + paddingTop));
            } else if (spaceDownwards < menuOuterHeight + margin) {
                layout.set('top', wh - (menuOuterHeight + margin));
            }
        } else {
            // Constrain menu height
            menuOuterHeight = wh - 2 * margin;
            layout.set('top', margin);
            needScrolling = true;
        }
        layout.set('height', menuOuterHeight);
        if (!layout.width) {
            var menuWidth = Math.max(this.get('minWidth') || 0, this._calculateMenuWidth());
            layout.set('width', menuWidth);
        }
        this.notifyPropertyChange('layout');
        this.set('contentView.needScrolling', needScrolling);
    },

    close: function() {
        if (this.isDestroyed) { return; }
        this.set('_highlightIndex', -1);
        this._clearKeySearch();
        this._super();
    },

    /* event handling starts */
    mouseDown: function() {
        return true;
    },

    cancel: function() {
        this.close();
    },

    moveUp: function() { return this._selectNext(-1); },
    moveDown: function() { return this._selectNext(1); },

    moveRight: function() {
        this._tryOpenSubmenu(true);
        return true;
    },

    moveLeft: function() {
        var parentMenu = this.get('parentMenu');
        if (!Ember.isNone(parentMenu)) { parentMenu.closeCurrentlyOpenSubMenu(); }
        return true;
    },

    insertNewline: function() {
        this.makeSelection();
        return true;
    },

    keyPress: function(event) {
        var key = String.fromCharCode(event.which);
        if (event.which > 31 && key !== '') { // Skip control characters.
            this._doKeySearch(key);
            return true;
        }
        return false;
    },

    handleMouseEvents: function(event) {
        // This should probably be combined with our event handling in event_manager.
        var itemIndex = this._idToIndex(event.currentTarget.id);
        // jQuery event handling: false bubbles the stuff up.
        var retVal = false;

        if (event.type === 'mouseenter') {
            retVal = this.mouseEntered(itemIndex);
        } else if (event.type === 'mouseup') {
            retVal = this.mouseClicked(itemIndex);
        } else if (event.type === 'mousedown') {
            retVal = true;
        }
        return !retVal;
    },

    /* Event handling ends */

    mouseClicked: function(index) {
        // If we're just handling a mouseUp that is part of the click that opened this menu, do nothing.
        // When the mouseUp follows within 100ms of opening the menu, we know that's the case.
        if (Ember.isNone(this.get('parentMenu')) && new Date().getTime() - this._openedAt < 300) {
            return;
        }

        this.set('_highlightIndex', index);
        // This will currently select the item even if we're not on the the current menu. Will need to figure out how
        // to deselect an item when cursor leaves the menu totally (that is, does not move to a sub-menu).
        if (this.get('_userHighlightIndex') >= 0) {
            this.makeSelection();
        }
        return true;
    },

    mouseEntered: function(index) {
        this.set('_userHighlightIndex', index);
        this._tryOpenSubmenu(false);
        return true;
    },

    _selectNext: function(increment) {
        var menuItems = this.get('_menuItems');
        var len = menuItems.get('length');
        var item;
        var index = this.get('_highlightIndex') + increment;
        for (; index >= 0 && index < len; index += increment) {
            item = menuItems.objectAt(index);
            if (item.isEnabled()) {
                this.set('_highlightIndex', index);
                break;
            }
        }
        this._clearKeySearch();
        return true;
    },

    _valueDidChange: function() {
        var value = this.get('value');
        var valueKey = this.get('itemValueKey');
        if (!Ember.isNone(value) && !Ember.isNone(valueKey)) {
            var index = this._findIndex(function(item) {
                return Ember.get(item, valueKey) === value;
            });
            if (index >= 0) {
                this.set('_highlightIndex', index);
            }
        }
    }.observes('value'),

    // Propagate internal selection to possible parent
    _internalSelectionDidChange: function() {
        var selected = this.get('_internalSelection');
        Ember.trySet(this, 'parentMenu._internalSelection', selected);
    }.observes('_internalSelection'),

    _findIndex: function(identityFunc) {
        var menuItems = this.get('items');
        var i = 0, len = menuItems.get('length');
        for (; i < len; i++) {
            if (identityFunc(menuItems.objectAt(i))) {
                return i;
            }
        }
        return -1;
    },

    _findByName: function(name) {
        var re = new RegExp('^' + name.replace(/[\^$*+?.(){}\[\]|]/g, "\\$&"), 'i');
        var titleKey = this.get('itemTitleKey');
        return this._findIndex(function(menuItem) {
            return re.test(Ember.get(menuItem, titleKey));
        });
    },

    _toggleClass: function(className, index, addOrRemove) {
        var menuItem = this.get('_menuItems').objectAt(index);
        menuItem.$().toggleClass(className, addOrRemove);
    },

    _highlightWillChange: function() {
        var index = this.get('_highlightIndex');
        var lastItem = this.get('_menuItems').objectAt(index);
        if (!Ember.isNone(lastItem)) {
            this._toggleClass('is-selected', index);
            lastItem.isSelected = false;
            lastItem.closeSubMenu();
        }
    }.observesBefore('_highlightIndex'),

    _highlightDidChange: function() {
        var index = this.get('_highlightIndex');
        var newItem = this.get('_menuItems').objectAt(index);
        var internalSelection = { isSet: false, value: null };
        if (!Ember.isNone(newItem)) {
            this._toggleClass('is-selected', index);
            newItem.isSelected = true;
            if (newItem.isSelectable()) {
                internalSelection = { isSet: true, value: newItem.item };
            }
        }
        this.set('_internalSelection', internalSelection);
    }.observes('_highlightIndex'),

    /**
      We only want to allow selecting menu items after the user has moved the mouse. We update
      userHighlightIndex when user highlights something, and internally we use highlightIndex to keep
      track of which item is highlighted, only allowing selection if user has highlighted something.
      If we don't ensure the user has highlighted something before allowing selection, this means that when
      a user clicks a SelectViewButton to open a menu, the mouseUp event (following the mouseDown on the select)
      would be triggered on a menu item, and this would cause the menu to close immediately.
    */
    _userHighlightIndexDidChange: function() {
        this.set('_highlightIndex', this.get('_userHighlightIndex'));
    }.observes('_userHighlightIndex'),

    _clearKeySearch: function() {
        if (!Ember.isNone(this._timer)) {
            Ember.run.cancel(this._timer);
        }
        this._searchKey = '';
    },

    _doKeySearch: function(key) {
        this._searchKey = (this._searchKey || '') + key;
        var index = this._findByName(this._searchKey);
        if (index >= 0) {
            this.set('_highlightIndex', index);
        }

        if (!Ember.isNone(this._timer)) {
            Ember.run.cancel(this._timer);
        }
        this._timer = Ember.run.later(this, this._clearKeySearch, 1000);
    },

    _indexToId: function(index) {
        return "%@-%@".fmt(this.get('elementId'), index);
    },

    _idToIndex: function(id) {
        var re = new RegExp("%@-(\\d+)".fmt(this.get('elementId')));
        var res = re.exec(id);
        return res && res.length === 2 ? parseInt(res[1], 10) : -1;
    },

    _tryOpenSubmenu: function(selectItem) {
        var index = this.get('_highlightIndex');
        var item = this.get('_menuItems').objectAt(index);
        if (!item) {
            return false;
        }
        var subMenuItems = item.subMenuItems;
        if (!Ember.isNone(subMenuItems) && item.isEnabled() && subMenuItems.get('length') > 0) {
            this._clearKeySearch();
            var subMenu = item.subMenuView;
            if (Ember.isNone(subMenu)) {
                subMenu = this.createSubMenu(subMenuItems);
                item.subMenuView = subMenu;
            }
            subMenu.popup(item.$(), this.get('subMenuPosition') || Flame.POSITION_RIGHT);
            if (selectItem) subMenu._selectNext(1);
            return true;
        }
        return false;
    },

    didInsertElement: function() {
        this._super();
        var self = this;
        this.$().on('mouseenter mouseup mousedown', '.flame-menu-item-view', function(event) {
            return self.handleMouseEvents(event);
        });
    },

    willDestroyElement: function() {
        this._super();
        this.$().off('mouseenter mouseup mousedown');
    }
});
