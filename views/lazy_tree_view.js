//= require ./lazy_list_view
//= require ./lazy_tree_item_view

/**
  The tree in the `LazyTreeView` is being rendered as a flat list, with items
  being indented to give the impression of a tree structure.
  We keep a number of internal caches to easily map this flat list onto the
  tree we're rendering.

  TODO * `LazyTreeView` currently has the limitation that it does not allow
         dragging items between different levels.

  @class LazyTreeView
  @extends LazyListView
*/
Flame.LazyTreeView = Flame.LazyListView.extend({
    classNames: 'flame-tree-view flame-lazy-tree-view'.w(),
    itemViewClass: Flame.LazyTreeItemView,
    _rowToItemCache: null,
    _itemToRowCache: null,
    _itemToLevelCache: null,
    _itemToParentCache: null,
    _expandedItems: null,
    _numberOfCachedRows: null,

    init: function() {
        this._invalidateRowCache();
        this._expandedItems = Ember.Set.create();
        // Call the super-constructor last as Flame.ListView constructor calls #_selectionDidChange() which causes
        // calls to #_setIsSelectedStatus() that calls #rowForItem() which expects the caches to be set up.
        this._super();
    },

    // override this to temporarily disable re-ordering
    disableReordering: function(event) {
        return false;
    },

    numberOfRowsChanged: function() {
        this._invalidateRowCache();
        this.loadCache();
        this._super();
    },

    numberOfRows: function() {
        return this._numberOfCachedRows;
    },

    loadItemIntoCache: function(item, level, parent) {
        this._rowToItemCache[this._numberOfCachedRows] = item;
        this._itemToRowCache.set(item, this._numberOfCachedRows);
        this._itemToLevelCache.set(item, level);
        if (parent) this._itemToParentCache.set(item, parent);

        this._numberOfCachedRows++;

        // If an item is not expanded, we don't care about its children
        if (!this._expandedItems.contains(item)) return;
        // Handle children
        var children = item.get('treeItemChildren');
        if (children) {
            var length = children.get('length');
            for (var i = 0; i < length; i++) {
                this.loadItemIntoCache(children.objectAt(i), level + 1, item);
            }
        }
    },

    loadCache: function() {
        var content = this.get('content');
        var length = content.get('length');
        for (var i = 0; i < length; i++) {
            this.loadItemIntoCache(content.objectAt(i), 0);
        }
    },

    viewClassForItem: function(item) {
        var itemViewClasses = this.get('itemViewClasses');
        return itemViewClasses[item.constructor.toString()];
    },

    itemForRow: function(row) {
        return this._rowToItemCache[row];
    },

    rowForItem: function(item) {
        return this._itemToRowCache.get(item);
    },

    levelForItem: function(item) {
        return this._itemToLevelCache.get(item);
    },

    /** The tree view needs to additionally set the correct indentation level */
    viewForRow: function(row) {
        var item = this.itemForRow(row);
        var isExpanded = this._expandedItems.contains(item);
        var view = this._super(row, { isExpanded: isExpanded });
        view.set('isExpanded', isExpanded);
        var level = this._itemToLevelCache.get(item);
        // Check if we already have the correct indentation level
        if (view._indentationLevel !== level) {
            var classNames = view.get('classNames');
            classNames.removeObject('level-' + (view._indentationLevel + 1));
            classNames.pushObject('level-' + (level + 1));
            view._indentationLevel = level;
        }
        return view;
    },

    _invalidateRowCache: function() {
        this._rowToItemCache = [];
        this._itemToRowCache = Ember.Map.create();
        this._itemToLevelCache = Ember.Map.create();
        this._itemToParentCache = Ember.Map.create();
        this._numberOfCachedRows = 0;
    },

    isExpandable: function(item) {
        return true;
    },

    expandItem: function(item) {
        this._expandedItems.add(item);
        var row = this.rowForItem(item);
        var view = this.childViewForIndex(row);
        if (view && !view.get('isExpanded')) {
            view.set('isExpanded', true);
            this.toggleItem(view);
        }
    },

    /**
      This is where we expand or collapse an item in the `LazyTreeView`.
      The expanding or collapsing is done in these steps:

      1. Record the expanded/collapsed status of the item.
      2. Update the position of views that have shifted due to an item being
         expanded or collapsed.
      3. Remove views that were used to render a subtree that is now collapsed.
      4. Render missing views; When collapsing an item, we might need to render
         extra views to fill up the gap created at the bottom of the visible area.
         This also renders the subtree of the item we just expanded.

      @param view {Flame.LazyListItemView} The view that was clicked to expand or collapse the item
    */
    toggleItem: function(view) {
        var item = view.get('content');
        var isExpanded = view.get('isExpanded');
        if (isExpanded) {
            this._expandedItems.add(item);
        } else {
            this._expandedItems.remove(item);
        }
        this.numberOfRowsChanged();

        // Update rendering
        var indices = [];
        var range = this._rowsToRenderRange(this._lastScrollHeight, this._lastScrollTop);
        this.forEach(function(view) {
            var contentIndex = view.get('contentIndex');
            var content = view.get('content');
            var row = this.rowForItem(content);
            if (typeof row === 'undefined' && typeof contentIndex !== 'undefined') {
                this._recycleView(view);
            } else if (typeof contentIndex !== 'undefined') {
                indices.push(row);
                if (contentIndex !== row) {
                    view.set('contentIndex', row);
                    var itemHeight = this.itemHeightForRow(row);
                    view.$().css('top', row * itemHeight + 'px');
                }
                if (row < range.start || row > range.end) {
                    this._recycleView(view);
                }
            }
        }, this);

        // Render missing views
        for (var i = range.start; i <= range.end; i++) {
            if (indices.indexOf(i) === -1) {
                this.viewForRow(i);
            }
        }
        this._hideRecycledViews();
    },

    moveRight: function() {
        return this._collapseOrExpandSelection('expand');
    },

    moveLeft: function() {
        return this._collapseOrExpandSelection('collapse');
    },

    _collapseOrExpandSelection: function(action) {
        var selection = this.get('selection');
        if (selection) {
            var row = this.rowForItem(selection);
            var view = this.childViewForIndex(row);
            if (view) {
                if (action === 'collapse' && view.get('isExpanded')) {
                    view.set('isExpanded', false);
                    this.toggleItem(view);
                    return true;
                } else if (action === 'expand' && !view.get('isExpanded')) {
                    view.set('isExpanded', true);
                    this.toggleItem(view);
                    return true;
                }
            } else {
                // The view is currently not visible, just record the status
                if (this._expandedItems.contains(selection)) {
                    this._expandedItems.remove(selection);
                } else {
                    this._expandedItems.add(selection);
                }
                return true;
            }
        }
        return false;
    },

    closestCommonAncestor: function(item1, item2) {
        var ancestor = this._itemToParentCache.get(item1);
        var parent = this._itemToParentCache.get(item2);
        while (parent) {
            if (parent === ancestor) {
                return parent;
            } else {
                parent = this._itemToParentCache.get(parent);
            }
        }
    },

    isValidDrop: function(item, dropParent) {
        return true;
    },

    /**
      @param {Object} draggingInfo
      @param {Number} proposedIndex
      @param {Number} originalIndex
    */
    indexForMovedItem: function(draggingInfo, proposedIndex, originalIndex) {
        // Get items of interest
        var itemFrom = this.itemForRow(originalIndex);
        var itemAbove = this.itemForRow(proposedIndex - 1);
        var itemBelow = this.itemForRow(proposedIndex);

        // Bounds checking
        if (proposedIndex < 0) proposedIndex = 0;
        if (proposedIndex > this.numberOfRows()) proposedIndex = this.numberOfRows();

        // Only allow moving between the same level
        var itemLevel = this.levelForItem(itemFrom);
        var acceptedIndex,
            toParent,
            toPosition;
        if (itemBelow && this.levelForItem(itemBelow) === itemLevel) {
            acceptedIndex = proposedIndex;
            toParent = this._itemToParentCache.get(itemBelow);
            toPosition = (toParent && toParent.get('treeItemChildren') || this.get('content')).indexOf(itemBelow);
        } else if (itemAbove && this.levelForItem(itemAbove) === itemLevel && !this._expandedItems.contains(itemAbove)) {
            acceptedIndex = proposedIndex;
            toParent = this._itemToParentCache.get(itemAbove);
            toPosition = toParent ? toParent.get('treeItemChildren.length') : this.get('content.length');
        } else if ((!itemBelow || (itemBelow && this.levelForItem(itemBelow) < itemLevel)) &&
                   itemAbove && this.levelForItem(itemAbove) > itemLevel) {
            acceptedIndex = proposedIndex;
            toParent = this.closestCommonAncestor(itemFrom, itemAbove);
            toPosition = toParent ? toParent.get('treeItemChildren.length') : this.get('content.length');
        } else if (itemAbove && itemLevel - 1 === this.levelForItem(itemAbove) && this._expandedItems.contains(itemAbove)) {
            // Dragging into parent item that is currently empty and open
            acceptedIndex = proposedIndex;
            toParent = itemAbove;
            toPosition = 0;
        } else {
            return draggingInfo;
        }

        if (!this.isValidDrop(itemFrom, toParent)) return draggingInfo;

        return  { currentIndex: acceptedIndex, toParent: toParent, toPosition: toPosition };
    },

    moveItem: function(from, draggingInfo) {
        var movedView = this.childViewForIndex(from);
        var to = draggingInfo.currentIndex;
        var direction = from < to ? -1 : 1;
        var itemHeight = this.get('itemHeight');
        this.forEachChildView(function(view) {
            var contentIndex = view.get('contentIndex');
            if (contentIndex > from && contentIndex < to ||
                contentIndex < from && contentIndex >= to) {
                view.set('contentIndex', contentIndex + direction);
                view.$().animate({top: view.get('contentIndex') * itemHeight + 'px'});
            }
        });
        if (direction < 0) to--;
        movedView.set('contentIndex', to);
        movedView.$().animate({top: to * itemHeight + 'px'});

        if (direction < 0) to++;
        var fromItem = this.itemForRow(from);
        var fromParent = this._itemToParentCache.get(fromItem);
        var toParent = draggingInfo.toParent || fromParent;

        var fromContent = fromParent ? fromParent.get('treeItemChildren') : this.get('content');
        var toContent = toParent ? toParent.get('treeItemChildren') : this.get('content');
        if (fromContent === toContent && from < to) draggingInfo.toPosition--;

        this._suppressObservers = true;
        fromContent.removeObject(fromItem);
        toContent.insertAt(draggingInfo.toPosition, fromItem);
        this.numberOfRowsChanged();
        // Keep suppressing observers until the next runloop
        Ember.run.next(this, function() {
            this._suppressObservers = false;
        });

        var delegate = this.get('reorderDelegate');
        if (delegate) {
            Ember.run.next(this, function() {
                delegate.didReorderContent(toContent);
            });
        }
    }
});
