//= require ./panel
//= require ./collection_view
//= require ../mixins/action_support
//= require ./scroll_view

/* Only to be used in Flame.MenuView. Represent menu items with normal JS objects as creation of one Ember object took
 * 3.5 ms on fast IE8 machine.
 */
Flame.MenuItem = function(opts) {
    var key;
    for (key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }

    this.renderToElement = function () {
        var classes = ["flame-view", "flame-list-item-view", "flame-menu-item-view"];
        if (this.isSelected) { classes.push("is-selected"); }
        if (this.isChecked) { classes.push("is-checked"); }
        var subMenuLength = Ember.none(this.subMenuItems) ? -1 : this.subMenuItems.get('length');
        var menuIndicatorClasses = ["menu-indicator"];
        if (!this.isEnabled()) {
            classes.push("is-disabled");
        } else if (subMenuLength > 0) {
            menuIndicatorClasses.push("is-enabled");
        }
        var title = Handlebars.Utils.escapeExpression(this.title);
        var template = "<div id='%@' class='%@'><div class='title'>%@</div><div class='%@'></div></div>";
        var div = template.fmt(this.id, classes.join(" "), title, menuIndicatorClasses.join(" "));
        return div;
    };

    this.isEnabled = function() {
        return !(this.isDisabled || (this.subMenuItems && this.subMenuItems.length === 0));
    };
    this.isSelectable = function() {
        return this.isEnabled() && !this.subMenuItems;
    };
    this.elementSelector = function() {
        return Ember.$("#%@".fmt(this.id));
    };
    this.closeSubMenu = function() {
        var subMenu = this.subMenuView;
        if (!Ember.none(subMenu)) {
            subMenu.close();
            this.subMenuView = null;
        }
    };

};

/**
 * A menu. Can be shown as a "stand-alone" menu or in cooperation with a SelectButtonView.
 *
 * MenuView has a property 'subMenuKey'. Should objects based on which the menu is created return null/undefined for
 * that property, the item itself will be selectable. Otherwise if the property has more than zero values, a submenu
 * will be shown.
 *
 */
Flame.MenuView = Flame.Panel.extend(Flame.ActionSupport, {
    classNames: ['flame-menu'],
    childViews: ['contentView'],
    contentView: Flame.ScrollView,
    dimBackground: false,
    subMenuKey: 'subMenu',
    itemTitleKey: "title",
    /* Attribute that can be used to indicate a disabled menu item. The item will be disabled only if
     * isEnabled === false, not some falseish value. */
    itemEnabledKey: "isEnabled",
    itemCheckedKey: "isChecked",
    itemValueKey: "value",
    itemActionKey: "action",
    itemHeight: 21,
    /* Margin between the menu and top/bottom of the viewport. */
    menuMargin: 12,
    minWidth: null, // Defines minimum width of menu
    items: [],
    parentMenu: null,
    value: null,
    _allItemsDoNotFit: true,
    _anchorElement: null,
    _menuItems: [],
    highlightIndex: -1, // Currently highlighted index.
    userHighlightIndex: -1, // User selected highlighted index
    // Reflects the content item in this menu or the deepest currently open submenu that is currently highlighted,
    // regardless of whether mouse button is up or down. When mouse button is released, this will be set as the real
    // selection on the top-most menu, unless it's undefined (happens if currently on a non-selectable item)
    internalSelection: undefined,

    init: function() {
        this._super();
        this._needToRecreateItems();
    },

    _calculateMenuWidth: function() {
        var items = this.get("items");
        if (Ember.get(items, 'length') === 0) {
            return;
        }
        var itemTitleKey = this.get("itemTitleKey");
        var allTitles = items.reduce(function(currentTitles, item) {
            var nextTitle = Ember.get(item, itemTitleKey);
            return currentTitles + nextTitle + '<br/>';
        }, '');
        // Give the menus a 16px breathing space to account for sub menu indicator, and to give some right margin
        return Flame.measureString(allTitles, 'ember-view flame-view flame-list-item-view flame-menu-item-view', 'title').width + 16;
    },

    _createMenuItems: function() {
        var items = this.get("items"),
            itemCheckedKey = this.get("itemCheckedKey"),
            itemEnabledKey = this.get("itemEnabledKey"),
            itemTitleKey = this.get("itemTitleKey"),
            itemValueKey = this.get("itemValueKey"),
            subMenuKey = this.get("subMenuKey"),
            selectedValue = this.get("value"),
            menuItems;
        menuItems = items.map(function(item, i) {
            //Only show the selection on the main menu, not in the submenus.
            return new Flame.MenuItem({
                item: item,
                isSelected: Ember.get(item, itemValueKey) === selectedValue,
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
        this.set("_menuItems", menuItems);
        if (Ember.none(this.get("parentMenu"))) {
            menuItems.forEach(function(item, i) {
                if (item.isSelected) { this.set("highlightIndex", i); }
            }, this);
        }
        this.getPath("contentView").setScrolledView(this._createMenuView());
        if (this.get("_anchorElement")) {
            this._updateMenuSize();
        }

        //Set content of scroll stuff
        //calculate the the height of menu
    }.observes("items", "elementId"),

    _createMenuView: function() {
        var items = this.get("_menuItems");
        return Flame.View.create({
            useAbsolutePosition:false,
            render: function(renderingBuffer) {
                // Push strings to rendering buffer with one pushObjects call so we don't get one arrayWill/DidChange
                // per menu item.
                var tempArr = items.map(function(menuItem) { return menuItem.renderToElement(); });
                renderingBuffer.push(tempArr.join(''));
            }
        });
    },

    makeSelection: function() {
        var parentMenu = this.get("parentMenu");
        var action, value;
        if (!Ember.none(parentMenu)) {
            parentMenu.makeSelection();
            this.close();
        } else {
            var internalSelection = this.get('internalSelection');
            if (typeof internalSelection !== "undefined") {
                value = Ember.get(internalSelection, this.get("itemValueKey"));
                this.set("value", value);
                //If we have an action, call it on the selection.
                action = Ember.get(internalSelection, this.get("itemActionKey")) || this.get('action');
            }
            //Sync the values before we tear down all bindings in close() which calls destroy().
            Ember.run.sync();
            // Close this menu before firing an action - the action might open a new popup, and if closing after that,
            // the new popup panel is popped off the key responder stack instead of this menu.
            this.close();
            if (!Ember.none(action)) {
                this.fireAction(action, value);
            }
        }
    },

    //This function is here to break the dependency between MenuView and MenuItemView
    createSubMenu: function(subMenuItems) {
        return Flame.MenuView.create({
            items: subMenuItems,
            parentMenu: this,
            subMenuKey: this.get("subMenuKey"),
            itemEnabledKey: this.get("itemEnabledKey"),
            itemTitleKey: this.get("itemTitleKey"),
            itemValueKey: this.get("itemValueKey"),
            itemHeight: this.get("itemHeight"),
            isModal: false
        });
    },

    closeCurrentlyOpenSubMenu: function() {
        // observers of highlightIndex should take care that closing is propagated to the every open menu underneath
        // this menu. Close() sets highlightIndex to -1, _highlightWillChange() will call closeSubMenu() on the item
        // which then calls close() on the menu it depicts and this is continued until no open menus remain under the
        // closed menu.
        var index = this.get("highlightIndex");
        if (index >= 0) {
            this.get("_menuItems").objectAt(index).closeSubMenu();
        }
    },

    popup: function(anchorElementOrJQ, position) {
        var anchorElement = anchorElementOrJQ instanceof jQuery ? anchorElementOrJQ : anchorElementOrJQ.$();
        this._super(anchorElement, position);
        this.set("_anchorElement", anchorElement);
        this._updateMenuSize();
    },

    _updateMenuSize: function() {
        var anchorElement = this.get("_anchorElement");
        //These values come from the CSS but we still need to know them here. Is there a better way?
        var paddingTop = 5;
        var paddingBottom = 5;
        var borderWidth = 1;
        var totalPadding = paddingTop + paddingBottom;
        var margin = this.get("menuMargin");
        var menuOuterHeight = this.get("_menuItems").get("length") * this.get("itemHeight") + totalPadding + 2 * borderWidth;
        var wh = $(window).height();
        var anchorTop = anchorElement.offset().top;
        var anchorHeight = anchorElement.outerHeight();
        var layout = this.get("layout");

        var isSubMenu = !Ember.none(this.get("parentMenu"));
        var spaceDownwards = wh - anchorTop + (isSubMenu ? (borderWidth + paddingTop) : (-anchorHeight));
        var needScrolling = false;

        if (menuOuterHeight + margin * 2 <= wh) {
            if (isSubMenu && spaceDownwards >= menuOuterHeight + margin) {
                layout.set("top", anchorTop - (borderWidth + paddingTop));
            } else if (spaceDownwards < menuOuterHeight + margin) {
                layout.set("top", wh - (menuOuterHeight + margin));
            }
        } else {
            // Constrain menu height
            menuOuterHeight = wh - 2 * margin;
            layout.set("top", margin);
            needScrolling = true;
        }
        layout.set("height", menuOuterHeight);
        if (!layout.width) {
            var menuWidth = Math.max(this.get('minWidth') || 0, this._calculateMenuWidth());
            layout.set("width", menuWidth);
        }
        this.set("layout", layout);
        this.get("contentView").set("needScrolling", needScrolling);
    },

    close: function() {
        if (this.isDestroyed) { return; }
        this.set("highlightIndex", -1);
        this._clearKeySearch();
        this._super();
    },

    /* event handling starts */
    mouseDown: function () {
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
        var parentMenu = this.get("parentMenu");
        if (!Ember.none(parentMenu)) { parentMenu.closeCurrentlyOpenSubMenu(); }
        return true;
    },

    insertNewline: function() {
        this.makeSelection();
        return true;
    },

    keyPress: function(event) {
        var key = String.fromCharCode(event.which);
        if (event.which > 31 && key !== "") { //Skip control characters.
            this._doKeySearch(key);
            return true;
        }
        return false;
    },

    handleMouseEvents: function (event) {
        // This should probably be combined with our event handling in event_manager.
        var itemIndex = this._idToIndex(event.currentTarget.id);
        //JQuery event handling: false bubbles the stuff up.
        var retVal = false;
//        if (itemIndex === -1) { return false; }

        if (event.type === "mouseenter") {
            retVal = this.mouseEntered(itemIndex);
        } else if (event.type === "mouseup") {
            retVal = this.mouseClicked(itemIndex);
        } else if (event.type === "mousedown") {
            retVal = true;
        }
        return !retVal;
    },

    /* Event handling ends */

    mouseClicked: function(index) {
        this.set("highlightIndex", index);
        // This will currently select the item even if we're not on the the current menu. Will need to figure out how
        // to deselect an item when cursor leaves the menu totally (that is, does not move to a sub-menu).
        if (this.get('userHighlightIndex') >= 0) {
            this.makeSelection();
        }
        return true;
    },

    mouseEntered: function(index) {
        this.set("userHighlightIndex", index);
        this._tryOpenSubmenu(false);
        return true;
    },

    _selectNext: function(increment) {
        var menuItems = this.get("_menuItems");
        var len = menuItems.get("length");
        var item;
        var index = this.get("highlightIndex") + increment;
        for (; index >= 0 && index < len; index += increment) {
            item = menuItems.objectAt(index);
            if (item.isEnabled()) {
                this.set("highlightIndex", index);
                break;
            }
        }
        this._clearKeySearch();
        return true;
    },

    _valueDidChange: function() {
        var value = this.get("value");
        var valueKey = this.get("itemValueKey");
        if (!Ember.none(value) && !Ember.none(valueKey)) {
            var index = this._findIndex(function(item) {
                return Ember.get(item, valueKey) === value;
            });
            if (index >= 0) {
                this.set("highlightIndex", index);
            }
        }
    }.observes("value"),

    // Propagate internal selection to possible parent
    _internalSelectionDidChange: function() {
        var selected = this.get('internalSelection');
        Ember.trySetPath(this, "parentMenu.internalSelection", selected);
    }.observes('internalSelection'),

    _findIndex: function(identityFunc) {
        var menuItems = this.get("items");
        var i = 0, len = menuItems.get("length");
        for (; i < len; i++) {
            if (identityFunc(menuItems.objectAt(i))) {
                return i;
            }
        }
        return -1;
    },

    _findByName: function(name) {
        var re = new RegExp("^" + name, "i");
        var titleKey = this.get("itemTitleKey");
        return this._findIndex(function(menuItem) {
            return re.test(Ember.get(menuItem, titleKey));
        });
    },

    _toggleClass: function(className, index, addOrRemove) {
        var menuItem = this.get("_menuItems").objectAt(index);
        menuItem.elementSelector().toggleClass(className, addOrRemove);
    },

    _highlightWillChange: function() {
        var index = this.get("highlightIndex");
        var lastItem = this.get("_menuItems").objectAt(index);
        if (!Ember.none(lastItem)) {
            this._toggleClass("is-selected", index);
            lastItem.isSelected = false;
            lastItem.closeSubMenu();
        }
    }.observesBefore("highlightIndex"),

    _highlightDidChange: function() {
        var index = this.get("highlightIndex");
        var newItem = this.get("_menuItems").objectAt(index);
        var internalSelection;
        if (!Ember.none(newItem)) {
            this._toggleClass("is-selected", index);
            newItem.isSelected = true;
            if (newItem.isSelectable()) {
                internalSelection = newItem.item;
            }
        }
        this.set('internalSelection', internalSelection);

    }.observes("highlightIndex"),

    /** We only want to allow selecting menu items after the user has moved the mouse. We update
        userHighlightIndex when user highlights something, and internally we use highlightIndex to keep
        track of which item is highlighted, only allowing selection if user has highlighted something.
        If we don't ensure the user has highlighted something before allowing selection, this means that when
        a user clicks a SelectViewButton to open a menu, the mouseUp event (following the mouseDown on the select)
        would be triggered on a menu item, and this would cause the menu to close immediately.
         **/
    _userHighlightIndexDidChange: function() {
        this.set('highlightIndex', this.get('userHighlightIndex'));
    }.observes("userHighlightIndex"),

    _clearKeySearch: function() {
        if (!Ember.none(this._timer)) {
            Ember.run.cancel(this._timer);
        }
        this._searchKey = "";
    },

    _doKeySearch: function(key) {
        this._searchKey = (this._searchKey || "") + key;
        var index = this._findByName(this._searchKey);
        if (index >= 0) {
            this.set("highlightIndex", index);
        }

        if (!Ember.none(this._timer)) {
            Ember.run.cancel(this._timer);
        }
        this._timer = Ember.run.later(this, this._clearKeySearch, 1000);
    },

    _indexToId: function(index) {
        return "%@-%@".fmt(this.get("elementId"), index);
    },

    _idToIndex: function(id) {
        var re = new RegExp("%@-(\\d+)".fmt(this.get("elementId")));
        var res = re.exec(id);
        return res && res.length === 2 ? parseInt(res[1], 10) : -1;
    },

    _tryOpenSubmenu: function (selectItem) {
        var index = this.get("highlightIndex");
        var item = this.get("_menuItems").objectAt(index);
        var subMenuItems = item.subMenuItems;
        if (!Ember.none(subMenuItems) && item.isEnabled() && subMenuItems.get("length") > 0) {
            this._clearKeySearch();
            var subMenu = item.subMenuView;
            if (Ember.none(subMenu)) {
                subMenu = this.createSubMenu(subMenuItems);
                item.subMenuView = subMenu;
            }
            subMenu.popup(item.elementSelector(), Flame.POSITION_RIGHT);
            if (selectItem) { subMenu._selectNext(1); }
            return true;
        }
        return false;
    },

    didInsertElement: function() {
        this._super();
        var self = this;
        var id = this.get("elementId");
        var events = "mouseenter.%@ mouseup.%@ mousedown.%@".fmt(id, id, id);
        Ember.$("#%@".fmt(id)).on(events, ".flame-menu-item-view", function(event) {
            return self.handleMouseEvents(event);
        });
    }

});
