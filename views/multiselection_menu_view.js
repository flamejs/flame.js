import View from '../view';
import Panel from './panel';
import CollectionView from './collection_view';
import ActionSupport from '../mixins/action_support';
import MenuViewSupport from '../mixins/menu_view_support';

/**
  A one-level multiselection menu. Can be used with a MultiselectionButtonView
*/
export default Panel.extend(ActionSupport, MenuViewSupport, {
    _highlightedItem: null,

    init: function() {
        this._super();
        this.get('contentView').setScrolledView(this._createMenuView());
    },

    /**
      Show and hide methods of this menu
    */
    popup: function(anchorElementOrJQ, position) {
        var anchorElement = anchorElementOrJQ instanceof jQuery ? anchorElementOrJQ : anchorElementOrJQ.$();
        this._super(anchorElement, position);
        this.set('_anchorElement', anchorElement);
        this._updateMenuSize();
    },

    close: function() {
        this.set("_highlightedItem", null);
        this._clearKeySearch();
        this._super();
    },

    /* Utility methods for menu creation */

    _createMenuView: function() {
        var self = this;
        return CollectionView.createWithMixins({
                content: this.get('items'),
                itemViewClass: View.extend({
                    classNames: ['flame-view', 'flame-list-item-view', 'flame-menu-item-view'],
                    classNameBindings: ['isSelected', 'isDisabled'],
                    attributeBindings: ['tooltip:title'],

                    menu: self,

                    handlebars: '{{#if view.isChecked}}<div class="flame-menu-item-view-checkmark"></div>{{/if}}{{view.content.title}}',

                    title: function() {
                        return Ember.get(this.get('content'), self.get('itemTitleKey'));
                    }.property('content'),

                    tooltip: function() {
                        return Ember.get(this.get('content'), self.get('itemTooltipKey'));
                    }.property('content'),

                    isDisabled: function() {
                        return Ember.get(this.get('content'), self.get('itemEnabledKey')) === false;
                    }.property('content'),

                    isSelected: function() {
                        return this.get('menu._highlightedItem') === this.get('content');
                    }.property('menu._highlightedItem'),

                    isChecked: function() {
                        return this.get('menu.value').contains(this.get('content.value'));
                    }.property('menu.value.[]'),

                    /* event listeners */
                    mouseEnter: function() {
                        this.set('menu._highlightedItem', this.get('content'));
                    },
                    mouseLeave: function() {
                        this.set('menu._highlightedItem', null);
                    },
                    click: function(index) {
                        this.set('menu._highlightedItem', this.get('content'));
                        this.get('menu').selectHighlightedItem();
                        return true;
                    },
                    menuResize: function() {
                        if (self.get('_anchorElement')) {
                            self._updateMenuSize();
                        }
                    }.observes('content').on('init')
                })
            });
    },

    /**
      Method which is called on the selection event and modifies the value accordingly.
      Does not update the UI directly but triggers the observers upon changing the value.
    */
    selectHighlightedItem: function() {
        var chosenValue = Ember.get(this.get('_highlightedItem'), this.get('itemValueKey'));
        var currentValue = this.get('value');
        // if the type of the chosenValue is object, it means that an array was passed
        // inside the option and the whole record chosenValue needs to be overriden
        if (Ember.isArray(chosenValue)) {
            currentValue.replace(0, currentValue.get('length'), chosenValue);
        } else {
            if (!currentValue.contains(chosenValue)) {
                currentValue.pushObject(chosenValue);
            } else {
                if (currentValue.get('length') > 1) {
                    currentValue.removeObject(chosenValue);
                }
            }
        }
    },

    /* methods called by EventManager when up and down arrow-key presses are detected */
    moveUp: function() {
        this._highlightAdjacentMenuItem(-1);
        return true;
    },

    moveDown: function() {
        this._highlightAdjacentMenuItem(1);
        return true;
    },

    _highlightAdjacentMenuItem: function(increment) {
        var itemList = this.get("items");
        var highlightedItem = this.get("_highlightedItem");
        var nextIndex = -1;

        if (highlightedItem) { // case when some option is selected before pressing arrow buttons
            var selectedItemIndex = itemList.indexOf(highlightedItem);
            nextIndex = (selectedItemIndex + increment) % itemList.get("length");
            // in case the new index is negative, subtract it from the length of the list of options
            // to wrap the selection
            if (nextIndex < 0) {
                nextIndex = itemList.get("length") + nextIndex;
            }
        } else { // case when a selected option is not found - start from one of the end of the item list
            if (increment > 0) {
                nextIndex = 0;
            } else {
                nextIndex = itemList.get("length") - 1;
            }
        }
        this.set("_highlightedItem", itemList.objectAt(nextIndex));
    },

    /* method called on enter-button press */
    insertNewline: function() {
        if (this.get("_highlightedItem")) {
            this.selectHighlightedItem();
        }
        return true;
    },

    /* methods to perform key-search among the options of this menu */
    _doKeySearch: function(key) {
        this._super(key);
        var currentItem = this._findByName(this.get('_searchKey'));
        if (currentItem) {
            this.set('_highlightedItem', currentItem);
        }
    },

    _findByName: function(name) {
        var re = new RegExp('^' + name.replace(/[\^$*+?.(){}\[\]|\\]/g, "\\$&"), 'i');
        var titleKey = this.get('itemTitleKey');
        return this.get("items").find(function(item) {
            if (re.test(Ember.get(item, titleKey))) {
                return true;
            }
        });
    }
});
