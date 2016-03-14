import MenuScrollView from '../views/menu_scroll_view';
import { measureString } from '../utils/string_measurement';

export default Ember.Mixin.create({
    classNames: ['flame-menu'],
    childViews: ['contentView'],
    contentView: MenuScrollView,
    dimBackground: false,
    allowClosingByCancelButton: true,
    menuMargin: 12,
    minWidth: null,
    itemHeight: 21,
    itemTitleKey: 'title',
    itemEnabledKey: 'isEnabled',
    itemCheckedKey: 'isChecked',
    itemValueKey: 'value',
    itemActionKey: 'action',
    itemTooltipKey: 'tooltip',
    _anchorElement: null,
    value: null,
    items: null,
    _searchKey: '',

    _updateMenuSize: function() {
        var anchorElement = this.get('_anchorElement');
        // These values come from the CSS but we still need to know them here. Is there a better way?
        var paddingTop = 5;
        var paddingBottom = 5;
        var borderWidth = 1;
        var totalPadding = paddingTop + paddingBottom;
        var margin = this.get('menuMargin');
        var menuOuterHeight = this.get('items').get('length') * this.get('itemHeight') + totalPadding + 2 * borderWidth;
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

    _calculateMenuWidth: function() {
        var items = this.get('items') || [];
        if (Ember.get(items, 'length') === 0) {
            return;
        }
        var itemTitleKey = this.get('itemTitleKey');
        var allTitles = items.map(function(item) { return Ember.get(item, itemTitleKey); });
        // Give the menus a 16px breathing space to account for sub menu indicator, and to give some right margin (+18px for the padding)
        return measureString(allTitles, 'ember-view flame-view flame-list-item-view flame-menu-item-view', 'title').width + 16 + 18;
    },

    keyPress: function(event) {
        var key = String.fromCharCode(event.which);
        if (event.which > 31 && key !== '') { // Skip control characters.
            this._doKeySearch(key);
            return true;
        }
        return false;
    },

    _doKeySearch: function(key) {
        this.set('_searchKey', (this.get('_searchKey') || '') + key);
        if (!Ember.isNone(this._timer)) {
            Ember.run.cancel(this._timer);
        }
        this._timer = Ember.run.later(this, this._clearKeySearch, 1000);
    },

    _clearKeySearch: function() {
        if (!Ember.isNone(this._timer)) {
            Ember.run.cancel(this._timer);
        }
        this._searchKey = '';
    }
});
