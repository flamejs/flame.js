//= require ./list_view

/**
  Flame.ListView has the problem that it creates and renders a view for each and
  every item in the collection that it displays. For large collections this will be
  terribly slow and inefficient.

  Flame.LazyListView is a drop-in alternative for Flame.ListView that only renders
  item views that are visible within the Flame.ScrollView this list view is contained
  in. Additionally item views will be recycled, i.e. item views that scroll off the
  visible area will be reused to show items that have become visible by scrolling.

  To make the scrolling as smooth as possible, a small number of extra views is
  rendered above and below the visible area. This number of views can be configured
  with the `bufferSize` property. Setting this to 10 will render 5 extra views on
  top and 5 on the bottom.

  Flame.LazyListView currently only works correctly when used within a Flame.ScrollView.

  TODO * variable row height
       * spacing between items

  @class LazyListView
  @extends ListView
*/
Flame.LazyListView = Flame.ListView.extend({
    classNames: ['flame-lazy-list-view'],
    /** The default height of one row in the LazyListView */
    itemHeight: 25,
    bufferSize: 10,
    constrainDragginToXAxis: false,
    _suppressObservers: false,

    _lastScrollHeight: undefined,
    _lastScrollTop: undefined,

    init: function() {
        this._super();
        this._recycledViews = {};
    },

    arrayWillChange: function() {},

    arrayDidChange: function(content, start, removed, added) {
        if (content && !this._suppressObservers) {
            // Not the most efficient thing to do, but it does make things a lot
            // less complicated. Since item views are supposed to render quickly
            // and because only the visible rows are rendered, this is quite ok though.
            this.fullRerender();
        }
    },

    /** Do a full rerender of the ListView */
    fullRerender: function() {
        // Recycle any currently rendered views
        var self = this;
        this.forEachChildView(function(view) {
            if (typeof view.get('contentIndex') !== 'undefined') {
                self._recycleView(view);
            }
        });
        this.numberOfRowsChanged();
        this.didScroll(this._lastScrollHeight, this._lastScrollTop);
    },

    // Some browsers reset the scroll position when the `block` CSS property has
    // changed without firing a scroll event.
    didInsertElement: function() {
        this._updateScrollPosition();
    },

    _updateScrollPosition: function() {
        var scrollView = this.nearestOfType(Flame.ScrollView);
        if (scrollView && scrollView.get('element')) {
            var element = scrollView.get('element');
            this._lastScrollHeight = element.offsetHeight;
            this._lastScrollTop = element.scrollTop;
            this.didScroll(this._lastScrollHeight, this._lastScrollTop);
        }
    },

    willDestroyElement: function() {
        this.forEach(function(view) {
            if (typeof view.get('contentIndex') !== 'undefined') {
                this._recycleView(view);
            }
        }, this);
    },

    numberOfRowsChanged: function() {
        Ember.run.scheduleOnce('afterRender', this, this._updateHeight);
    },

    _updateHeight: function() {
        var height = this.numberOfRows() * this.get('itemHeight');
        if (this.get('useAbsolutePosition')) {
            this.adjustLayout('height', height);
        } else {
            // In case the LazyListView has `useAbsolutePosition` set to false, `adjustLayout` will not work
            // and we need to set the height manually.
            if (this.$()) this.$().css('height', height + 'px');
            this.get('layout').height = height;
        }
    },

    numberOfRows: function() {
        return this.get('content.length');
    },

    didScroll: function(scrollHeight, scrollTop) {
        this._lastScrollHeight = scrollHeight;
        this._lastScrollTop = scrollTop;

        var range = this._rowsToRenderRange(scrollHeight, scrollTop);
        var min = range.end, max = range.start;
        var i, childViews = this._childViews, len = childViews.length;
        for (i = 0; i < len; i++) {
            var view = childViews[i];
            var contentIndex = view.get('contentIndex');
            if (typeof contentIndex !== 'undefined') {
                if (contentIndex < range.start || contentIndex > range.end) {
                    // This view is no longer visible, recycle it if it's not being dragged
                    if (!view.get('isDragged')) this._recycleView(view);
                } else {
                    min = Math.min(min, contentIndex);
                    max = Math.max(max, contentIndex);
                }
            }
        }

        // Fill up empty gap on top
        if (min === range.end) min++;
        for (i = range.start; i < min; i++) {
            this.viewForRow(i);
        }
        // Fill up empty gap on bottom
        if (max !== range.start) {
            for (i = range.end; i > max; i--) {
                this.viewForRow(i);
            }
        }

        this._hideRecycledViews();
    },

    /**
      Given the `scrollHeight` and `scrollTop`, calculate the range of rows
      in the visible area that need to be rendered.

      @param scrollHeight {Number}
      @param scrollTop {Number}
      @returns {Object} The range object, with `start` and `end` properties.
    */
    _rowsToRenderRange: function(scrollHeight, scrollTop) {
        if (!this.get('element')) return { start: 0, end: -1 };

        var length = this.numberOfRows();
        var itemHeight = this.get('itemHeight');
        // Need to know how much the list view is offset from the parent scroll view
        var offsetFromParent = this.get('parentView.element').scrollTop + this.$().position().top;
        var normalizedScrollTop = Math.max(0, scrollTop - offsetFromParent);
        var topRow = ~~(normalizedScrollTop / itemHeight);
        var bufferSize = this.get('bufferSize');
        var desiredRows = ~~(scrollHeight / itemHeight) + bufferSize;

        // Determine start and end index of rows to render
        var start = topRow - bufferSize / 2;
        var end = Math.min(length - 1, start + desiredRows);
        start = Math.max(0, end - desiredRows);

        return { start: start, end: end };
    },

    viewClassForItem: function(item) {
        return this.get('itemViewClass');
    },

    itemForRow: function(row) {
        return this.get('content')[row];
    },

    rowForItem: function(item) {
        var index = this.get('content').indexOf(item);
        return index === -1 ? null : index;
    },

    /**
      Get a view for the item on row number `row`.
      If possible, recycle an already existing view that is not visible anymore.
      When there are no views to recycle, create a new one.

      @param row {Number} The row number for which we want a view.
      @param attributes {Object} Attributes that should be used when a new view is created.
      @returns {Flame.ItemView} A fully instantiated view that renders the given row.
    */
    viewForRow: function(row, attributes) {
        var itemHeight = this.itemHeightForRow(row);
        var item = this.itemForRow(row);
        var viewClass = this.viewClassForItem(item);
        var itemClass = item.constructor.toString();
        var view = (this._recycledViews[itemClass] && this._recycledViews[itemClass].pop());
        if (!view) {
            view = this.createChildView(viewClass, jQuery.extend({ useAbsolutePosition: true }, attributes || {}));
            this.pushObject(view);
        }
        view.beginPropertyChanges();
        if (item === this.get('selection')) {
            view.set('isSelected', true);
        }
        view.set('content', item);
        view.set('contentIndex', row);
        view.layout.top = row * itemHeight;
        view.updateLayout();
        view.set('isVisible', true);
        view.endPropertyChanges();
        return view;
    },

    _hideRecycledViews: function() {
        Ember.changeProperties(function() {
            var views = this._recycledViews;
            for (var key in views) {
                if (views.hasOwnProperty(key)) {
                    var viewArray = views[key];
                    var length = viewArray.length;
                    for (var i = 0; i < length; i++) {
                        var view = viewArray[i];
                        if (view.get('isVisible')) view.set('isVisible', false);
                    }
                }
            }
        }, this);
    },

    /** Prepare a view to be recycled at a later point */
    _recycleView: function(view) {
        view.set('contentIndex', undefined);
        view.set('isSelected', false);
        var itemClass = view.get('content').constructor.toString();
        if (!this._recycledViews[itemClass]) this._recycledViews[itemClass] = [];
        this._recycledViews[itemClass].push(view);
    },

    /** Select the view at index `index` */
    selectIndex: function(index) {
        if (!this.get('allowSelection')) return false;
        var item = this.itemForRow(index);
        this.set('selection', item);
        return true;
    },

    changeSelection: function(direction) {
        var selection = this.get('selection');
        var row = this.rowForItem(selection);
        var newIndex = row + direction;
        // With this loop we jump over items that cannot be selected
        while (newIndex >= 0 && newIndex < this.numberOfRows()) {
            if (this.selectIndex(newIndex)) return true;
            newIndex += direction;
        }
        return false;
    },

    _setIsSelectedStatus: function(contentItem, status) {
        if (contentItem) {
            var row = this.rowForItem(contentItem);
            var view = this.childViewForIndex(row);
            // Might be that this view is not being rendered currently
            if (view) view.set('isSelected', status);
        }
    },

    itemHeightForRow: function(index) {
        return this.get('itemHeight');
    },

    indexForMovedItem: function(draggingInfo, proposedIndex, originalIndex) {
        return { currentIndex: proposedIndex, toParent: this.get('content'), toPosition: proposedIndex };
    },

    moveItem: function(from, draggingInfo) {
        throw new Error('Not implemented yet!');
    },

    childViewForIndex: function(index) {
        return this.findBy('contentIndex', index);
    }
});
