//= require ./collection_view
//= require ./list_view_drag_helper

/*
  Displays a list of items. Allows reordering if allowReordering is true.

  The reordering support is probably the most complicated part of this. It turns out that when reordering items,
  we cannot allow any of the observers on the content or childViews to fire, as that causes childViews to be
  updated, which causes flickering. Thus we update the DOM directly, and sneakily update the content and childViews
  arrays while suppressing the observers.

 */
Flame.ListView = Flame.CollectionView.extend(Flame.Statechart, {
    classNames: ['flame-list-view'],
    classNameBindings: ['isFocused'],
    acceptsKeyResponder: true,
    allowSelection: true,
    allowReordering: true,
    selection: undefined,
    initialState: 'idle',
    reorderDelegate: null,
    init: function() {
        this._super();
        this._selectionDidChange();
    },

    itemViewClass: Flame.ListItemView.extend({
        templateContext: function(key, value) {
            return value !== undefined ? value : Ember.get(this, 'content');
        }.property('content').cacheable(),
        templateBinding: "parentView.template",
        handlebars: "{{title}}"
    }),

    selectIndex: function(index) {
        if (!this.get('allowSelection')) return false;
        var content = this.get('content');
        if (content) {
            var childView = this.get('childViews').objectAt(index);
            if (childView && childView.get('isVisible') && childView.get('allowSelection') !== false) {
                var selection = content.objectAt(index);
                this.set('selection', selection);
                return true;
            }
        }
        return false;
    },

    // direction -1 for up, 1 for down
    // returns true if selection did change
    changeSelection: function(direction) {
        var content = this.get('content');
        var selection = this.get('selection');
        var index = content.indexOf(selection);
        var newIndex = index + direction, len = content.get('length');
        while (newIndex >= 0 && newIndex < len) {  // With this loop we jump over items that cannot be selected
            if (this.selectIndex(newIndex)) return true;
            newIndex += direction;
        }
        return false;
    },

    _selectionWillChange: function() {
        this._setIsSelectedStatus(this.get('selection'), false);
    }.observesBefore('selection'),

    _selectionDidChange: function() {
        this._setIsSelectedStatus(this.get('selection'), true);
    }.observes('selection'),

    _setIsSelectedStatus: function(contentItem, status) {
        if (contentItem) {
            var index = (this.get('content') || []).indexOf(contentItem);
            if (index >= 0) {
                var child = this.get('childViews').objectAt(index);
                if (child) child.set('isSelected', status);
            }
        }
    },

    // If items are removed or reordered, we must update the contentIndex of each childView to reflect their current position in the list
    _updateContentIndexes: function() {
        var childViews = this.get('childViews');
        var len = childViews.get('length');
        for (var i = 0; i < len; i++) {
            var childView = childViews.objectAt(i);
            if (childView) childView.set('contentIndex', i);
        }
        // In case the child views are using absolute positioning, also their positions need to be updated,
        // otherwise they don't appear to move anywhere.
        this.consultLayoutManager();
    },

    didReorderContent: function(content) {
        var delegate = this.get('reorderDelegate');
        if (delegate) {
            Ember.run.next(function() {
                delegate.didReorderContent(content);
            });
        }
    },

    isValidDrop: function(itemDragged, newParent, dropTarget) {
        var delegate = this.get('reorderDelegate');
        if (delegate && delegate.isValidDrop) {
            return delegate.isValidDrop(itemDragged, newParent, dropTarget);
        } else {
            return true;
        }
    },

    // Overridden in TreeView
    rootTreeView: function() {
        return this;
    }.property(),

    arrayWillChange: function(content, start, removedCount) {
        if (!this.getPath('rootTreeView.isDragging')) {
            return this._super.apply(this, arguments);
        }
    },

    arrayDidChange: function(content, start, removed, added) {
        if (!this.getPath('rootTreeView.isDragging')) {
            var result = this._super.apply(this, arguments);
            this._updateContentIndexes();
            return result;
        }
    },

    childViewsWillChange: function() {
        if (!this.getPath('rootTreeView.isDragging')) {
            return this._super.apply(this, arguments);
        }
    },

    childViewsDidChange: function() {
        if (!this.getPath('rootTreeView.isDragging')) {
            return this._super.apply(this, arguments);
        }
    },

    normalize: function(startItem) {
    },

    // Override if needed, return false to disallow reordering that particular item
    allowReorderingItem: function(itemIndex) {
        return true;
    },

    idle: Flame.State.extend({
        moveUp: function() { return this.get('owner').changeSelection(-1); },
        moveDown: function() { return this.get('owner').changeSelection(1); },

        mouseDownOnItem: function(itemIndex, evt) {
            var owner = this.get('owner');
            owner.selectIndex(itemIndex);

            // Store some information in case user starts dragging (i.e. moves mouse with the button pressed down),
            // but only if reordering is generally allowed for this list view and for the particular item
            if (owner.get('allowReordering') && itemIndex !== undefined) {
                if (owner.allowReorderingItem(itemIndex)) {
                    //console.log('Drag started on %s, dragging %s items', itemIndex, itemCount);
                    var childView = owner.get('childViews').objectAt(itemIndex);
                    owner.set('dragHelper', Flame.ListViewDragHelper.create({
                        listView: owner,
                        lastPageX: evt.pageX,
                        yOffset: evt.pageY - childView.$().offset().top,
                        itemPath: [itemIndex]
                    }));
                }
            }

            this.gotoState('mouseButtonPressed');

            // Have to always return true here because the user might start dragging, and if so, we need the mouseMove events.
            return true;
        },

        enterState: function() {
            this.get('owner').set('dragHelper', undefined);  // In case dragging was allowed but not started, clear the drag data
        }
    }),

    // This is here so that we can override the behaviour in tree views
    startReordering: function(dragHelper, event) {
        dragHelper.set('listView', this);
        this.set('dragHelper', dragHelper);
        this.gotoState('reordering');
        return this.mouseMove(event);  // Handle also this event in the new state
    },

    mouseButtonPressed: Flame.State.extend({
        mouseUpOnItem: Flame.State.gotoHandler('idle'),
        mouseUp: Flame.State.gotoHandler('idle'),

        mouseMove: function(event) {
            var owner = this.get('owner');
            if (owner.get('dragHelper')) {  // Only enter reordering state if it was allowed, indicated by the presence of dragHelper
                var dragHelper = owner.get('dragHelper');
                this.gotoState('idle');
                owner.startReordering(dragHelper, event);
            }
            return true;
        }
    }),

    reordering: Flame.State.extend({
        mouseMove: function(evt, view, scheduled) {
            return this.get('owner').get('dragHelper').updateDisplay(evt);
        },

        mouseUp: Flame.State.gotoHandler('idle'),

        // Start reorder drag operation
        enterState: function() {
            var owner = this.get('owner');
            owner.get('dragHelper').initReorder();
            owner.set('isDragging', true);
        },

        // When exiting the reorder state, we need to hide the dragged clone and restore the look of the dragged child view
        exitState: function() {
            var owner = this.get('owner');
            owner.get('dragHelper').finishReorder();
            owner.set('dragHelper', undefined);
            owner.set('isDragging', false);
        }
    })

});
