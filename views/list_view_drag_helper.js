/*
  This helper class hides the ugly details of doing dragging in list views and tree views.

  One challenge in the implementation is how to designate a specific potential drop position.
  For a list of items, a natural choice would be to use an insert position: e.g. 0 would mean
  insert as the first item, 5 would mean insert as the fifth item. We can extend this for
  tree views by using an array of indexes: [2, 1, 4] would mean take the child number 2 from
  the topmost list, then child number 1 from the next, and insert the item as the fourth
  child of that. But there's an added complexity: When the item being moved is removed from
  its parent, all other items inside that parent shift, potentially changing the meaning of a
  path array. This means that while calculating a potential drop position, and when actually
  doing the insertion, positions potentially have a different meaning. It can be taken into
  account but it results into convoluted code.

  Better approach is to use unambiguous drop position designators. Such a designator can be
  constructed by naming an existing item in the tree (identified with a path *before* the
  item being moved is removed), and stating the insertion position relative to that. We need
  three insertion position indicators: before, after and inside (= as the first child, needed
  when there's currently no children at all). We can represent those as letters 'b', 'a' and
  'i'. This is handled in the nested Path class.

  In order to support dragging, items on all levels must provide a property 'childListView'
  thar returns the view that has as its children all the items on the next level. If the
  object has nothing underneath it, it must return null.
  This is useful when the item views are complex and do not directly contain their child
  items as their only child views.

  See for example the following tree:

          A
         /|\
        / | \
       Z  X  Y
          |   \
          V    3
         / \
        2   4

  Here V is not ItemView but others are. Then A and Y should return itself, X should return V, and
  1 to 4 and Z should return null.
 */
Flame.ListViewDragHelper = Ember.Object.extend({
    listView: undefined,
    lastPageX: undefined,
    yOffset: undefined,
    itemPath: undefined,
    lastTargetContent: null,

    clone: undefined,
    mouseMoveCounter: 0,

    // Creates a clone of the dragged element and dims the original
    initReorder: function() {
        var newItemPath = Flame.ListViewDragHelper.Path.create({array: this.itemPath, root: this.listView});
        this.itemPath = newItemPath;
        // XXX very ugly...
        this.reorderCssClass = this.isTree() ? '.flame-tree-item-view-container' : '.flame-list-item-view';

        var view = this.itemPath.getView();

        // Don't set the opacity by using element-style but instead set appropriate class. Thus IE filters disappear
        // when they're no longer required for opacity. Plus this automatically restores the original opacity to the
        // element.
        view.set("isDragged", true);
        var element = view.$();
        var clone = element.clone();

        clone.attr('id', element.attr('id')+"_drag");
        clone.addClass('is-dragged-clone');
        clone.appendTo(this.get('listView').$());

        clone.css('opacity', 0.8);

        this.set('clone', clone);
        this._updateCss();

        // As the clone is not linked to any Ember view, we have to add custom event handlers on it
        var listView = this.get('listView');
        clone.mousemove(function(event) {
            listView.mouseMove.apply(listView, arguments);
            return true;
        });
        clone.mouseup(function(event) {
            listView.mouseUp.apply(listView, arguments);
            return true;
        });
    },

    // Moves the clone to match the current mouse position and moves the dragged item in the list/tree if needed
    updateDisplay: function(evt, scheduled) {
        // This logic discards mouseMove events scheduled by the scrolling logic in case there's been a real mouseMove event since scheduled
        if (scheduled === undefined) this.mouseMoveCounter++;
        else if (scheduled < this.mouseMoveCounter) return false;

        this._updateDraggingCloneAndScrollPosition(evt);
        var newPath = this._resolveNewPath(evt.pageX, evt.pageY);

        if (newPath && !this.itemPath.equals(newPath)) {
            var view = this.itemPath.getView();
            this._moveItem(this.itemPath, newPath);
            this.itemPath = this._resolvePath(view);
            this._updateCss();
            this.lastPageX = evt.pageX;  // Reset the reference point for horizontal movement every time the item is moved
        }

        return true;
    },

    finishReorder: function() {
        var itemPathView = this.itemPath.getView();
        this.get('listView').didReorderContent(itemPathView.getPath('parentView.content'));
        itemPathView.set("isDragged", false);
        this.clone.remove();  // Remove the clone holding the clones from the DOM
    },

    // Updates the css classes and 'left' property of the clone and its children, needed for fixing indentation
    // to match the current item position in a tree view.
    _updateCss: function() {
        var draggedElement = this.itemPath.getView().$();
        var rootOffsetLeft = this.clone.offsetParent().offset().left;

        this.clone.attr('class', draggedElement.attr('class') + ' is-dragged-clone');
        this.clone.css('left', draggedElement.offset().left - rootOffsetLeft);

        var originals = this.itemPath.getView().$().find('.flame-tree-item-view', '.flame-tree-view');
        var children = this.clone.find('.flame-tree-item-view', '.flame-tree-view');
        children.each(function(i) {
            var element = jQuery(this), origElement = jQuery(originals.get(i));
            element.attr('class', origElement.attr('class'));
            rootOffsetLeft = element.offsetParent().offset().left;
            element.css('left', origElement.offset().left - rootOffsetLeft);
        });
    },

    // Moves the dragged element in the list/tree to a new location, possibly under a new parent
    _moveItem: function(sourcePath, targetPath) {
        var view = sourcePath.getView();
        var contentItem = view.get('content');
        var sourceParent = view.get('parentView');
        var sourceContent = sourceParent.get('content');
        var element = view.$();

        var targetView = targetPath.getView();
        var targetElement = targetView.$();
        var targetParent = targetPath.position === 'i' ? targetPath.getNestedListView() : targetView.get('parentView');
        var targetContent = targetParent.get('content');
        var targetChildViews = targetParent.get('childViews');

        // First remove the view, the content item and the DOM element from their current parent.
        // If moving inside the same parent, use a special startMoving+endMoving API provided by
        // Flame.SortingArrayProxy to protect against non-modifiable arrays (the sort property is
        // still updated).
        if (sourceContent === targetContent && sourceContent.startMoving) sourceContent.startMoving();
        sourceParent.get('childViews').removeObject(view);
        sourceContent.removeObject(contentItem);
        sourceParent._updateContentIndexes();
        element.detach();

        // Then insert them under the new parent, at the correct position
        var targetIndex = targetView.get('contentIndex');
        if (targetPath.position === 'b') {
            element.insertBefore(targetElement);
            targetChildViews.insertAt(targetIndex, view);
            targetContent.insertAt(targetIndex, contentItem);
        } else if (targetPath.position === 'a') {
            element.insertAfter(targetElement);
            targetChildViews.insertAt(targetIndex+1, view);
            targetContent.insertAt(targetIndex+1, contentItem);
        } else if (targetPath.position === 'i') {
            targetElement.find('.flame-list-view').first().prepend(element);
            targetChildViews.insertAt(0, view);
            targetContent.insertAt(0, contentItem);
        } else throw 'Invalid insert position '+targetPath.position;

        if (sourceContent === targetContent && sourceContent.endMoving) sourceContent.endMoving();
        // We need to do this manually because ListView suppresses the childViews observers while dragging,
        // so that we can do the entire DOM manipulation ourselves here without the list view interfering.
        view.set('_parentView', targetParent);
        targetParent._updateContentIndexes();
    },

    isTree: function() {
        return this.listView instanceof Flame.TreeView;  // XXX ugly
    },

    // Considering the current drag position, works out if the dragged element should be moved to a new location
    // in the list/tree. If dragging in a ListView, we compare against the .flame-list-item-view elements. If in a
    // TreeView, we need to compare against .flame-tree-item-view-container elements, that's what contains the item
    // label (and excludes possible nested tree views).
    _resolveNewPath: function(pageX, pageY) {
        var draggedView = this.itemPath.getView();
        var draggedElement = draggedView.$();
        var itemElements = this.get('listView').$().find(this.reorderCssClass);
        // XXX very ugly
        var currentElement = this.isTree() ? draggedElement.children(this.reorderCssClass).first() : draggedElement;
        var startIndex = itemElements.index(currentElement);
        Ember.assert('Start element not found', startIndex >= 0);

        var cloneTop = this.clone.offset().top;
        var cloneBottom = cloneTop + this.clone.outerHeight();
        var currentDy = cloneTop - draggedElement.offset().top;

        var direction = currentDy > 0 ? 1 : -1;  // Is user dragging the item up or down from its current position in the list?
        var i = startIndex + direction;
        var len = itemElements.length;
        var newIndex = startIndex;

        //console.log('startIndex %s, currentDy %s, len %s, i %s', startIndex, currentDy, len, i);
        while (i >= 0 && i < len) {
            var testElement = jQuery(itemElements[i]);
            if (testElement.closest('.is-dragged-clone').length > 0) break;  // Ignore the clone
            if (testElement.is(':visible') && testElement.closest(draggedElement).length === 0) {
                var thresholdY = testElement.offset().top + testElement.outerHeight() * (0.5 + direction * 0.2);
                //console.log('cloneTop %s, cloneBottom %s, i %s, test top %s, thresholdY', cloneTop, cloneBottom, i, testElement.offset().top, thresholdY);

                if ((direction > 0 && cloneBottom > thresholdY) || (direction < 0 && cloneTop < thresholdY)) {
                    newIndex = i;
                } else {
                    break;
                }
            }
            i += direction;
        }

        var targetView = Ember.View.views[jQuery(itemElements[newIndex]).closest('.flame-list-item-view').attr('id')];
        var path = this._resolvePath(targetView);

        // Path defaults to inside (i), confusingly _resolveNewLevel can also mangle position!
        var canDropInside = direction > 0 && targetView.get('hasChildren') && targetView.get('isExpanded') && !this._pathInvalid(draggedView, path);
        if (!canDropInside) {
            if (direction > 0) {
                path.position = 'a';  // a for after
            } else {
                path.position = 'b';  // b for before
            }
        }

        // Finally we need to see if the new location is a last child in a nested list view, or just after an open 'folder'.
        // If so, the vertical position is not enough to unambiguously define the desired target location, we have to also
        // check horizontal movement to decide which level to put the dragged item on.
        path = this._resolveNewLevel(draggedView, targetView, path, pageX);
        return this._pathInvalid(draggedView, path) ? null : path;
    },

    _resolveNewLevel: function(draggedView, targetView, path, pageX) {
        var xDiff = pageX - this.lastPageX;
        var xStep = 10;  // TODO obtain the real horiz. difference between the DOM elements on the different levels somehow...

        // If as the last item of a nested list, moving left moves one level up (placing immediately after current parent), OR
        // if the current level isn't valid, try and see if there is a valid drop one level up
        while ((xDiff < -xStep || this._pathInvalid(draggedView, path)) && (path.position === 'a' || this.itemPath.equals(path)) &&
               path.array.length > 1 && targetView.get('contentIndex') === targetView.getPath('parentView.childViews.length') - 1) {
            xDiff += xStep;
            path = path.up();
            targetView = path.getView();
        }

        // If previous item has children and is expanded, moving right moves the item as the last item inside that previous one, OR
        // if current level isnt valid and there is a valid preceding cousin, try that instead (notice this alters the position!)
        var precedingView;
        while ((xDiff > xStep || this._pathInvalid(draggedView, path)) && (path.position !== 'i' || this.itemPath.equals(path)) &&
               (precedingView = this._getPrecedingView(targetView)) !== undefined &&
               precedingView !== draggedView && precedingView.get('hasChildren') && precedingView.get('isExpanded') && !this._pathInvalid(draggedView, this._resolvePath(precedingView).down())) {
            xDiff -= xStep;
            path = this._resolvePath(precedingView).down();
            targetView = path.getView();
        }

        return path;
    },

    _pathInvalid: function(draggedView, targetPath) {
        var itemDragged = draggedView.get('content');
        var dropTarget = targetPath.getView().get('content');
        var newParent = null;
        if (targetPath.position === 'i') {
            newParent = dropTarget;
        }  else {
            var newParentItemView = targetPath.up().getView();
            if (newParentItemView) {
                newParent = newParentItemView.get('content');
            }
        }
        var isValid = this.get('listView').isValidDrop(itemDragged, newParent, dropTarget);
        return !isValid;
    },

    _getPrecedingView: function(view) {
        return view.get('contentIndex') > 0 ? view.getPath('parentView.childViews').objectAt(view.get('contentIndex') - 1) : undefined;
    },

    _resolvePath: function(view) {
        var pathArray = [];
        var listView = view.get('parentView');

        do {
            pathArray.insertAt(0, view.get('contentIndex'));
            listView = view.get('parentView');
        } while (listView.get('isNested') && (view = listView.get('parentView')) !== undefined);

        return Flame.ListViewDragHelper.Path.create({array: pathArray, root: this.listView});
    },

    _updateDraggingCloneAndScrollPosition: function(evt) {
        var domParent = this.get('listView').$();
        if (domParent.hasClass('is-nested')) domParent = domParent.offsetParent();  // If nested list in a tree, grab the topmost
        var scrollTop = domParent.scrollTop();
        var parentHeight = domParent.innerHeight();
        var newTop = evt.pageY - this.yOffset - domParent.offset().top + scrollTop;

        // Check top and bottom limits to disallow moving beyond the content area of the list view
        if (newTop < 0) newTop = 0;
        var height = this.clone.outerHeight();
        var scrollHeight = domParent[0].scrollHeight;  // See http://www.yelotofu.com/2008/10/jquery-how-to-tell-if-youre-scroll-to-bottom/
        if (newTop + height > scrollHeight) newTop = scrollHeight - height;

        this.clone.css({position: 'absolute', right: 0, top: newTop});

        // See if we should scroll the list view either up or down (don't scroll if overflow is not auto, can cause undesired tiny movement)
        if (domParent.css('overflow') === 'auto') {
            var topDiff = scrollTop - newTop;
            if (topDiff > 0) {
                domParent.scrollTo('-=%@px'.fmt(Math.max(topDiff / 5, 1)));
            }
            var bottomDiff = (newTop + height) - (scrollTop + parentHeight);
            if (bottomDiff > 0) {
                domParent.scrollTo('+=%@px'.fmt(Math.max(bottomDiff / 5, 1)));
            }
            if (topDiff > 0 || bottomDiff > 0) {  // If scrolled, schedule an artificial mouseMove event to keep scrolling
                var currentCounter = this.mouseMoveCounter;
                Ember.run.next(this, function() { this.updateDisplay(evt, currentCounter); });
            }
        }
    }

});

/*
  A helper class for the drag helper, represents a potential insert location in a list/tree.
  See docs for ListViewDragHelper above for details.
 */
Flame.ListViewDragHelper.Path = Ember.Object.extend({
    array: [],
    position: 'i',
    root: null,

    getView: function() {
        var view, i, len = this.array.length, listView = this.root;
        for (i = 0; i < len; i++) {
            var index = this.array[i];
            view = listView.get("childViews").objectAt(index);
            if (i < len - 1) {
                listView = view.get('childListView');
            }
        }
        return view;
    },

    getNestedListView: function() {
        return this.getView().get("childListView");
    },

    up: function() {
        var newArray = this.array.slice(0, this.array.length - 1);
        return Flame.ListViewDragHelper.Path.create({array: newArray, position: 'a', root: this.root});
    },

    down: function() {
        var newArray = Ember.copy(this.array);
        var newPosition;
        var nestedChildrenCount = this.getNestedListView().getPath('content.length');
        if (nestedChildrenCount > 0) {
            newArray.push(nestedChildrenCount - 1);
            newPosition = 'a';
        } else {
            newPosition = 'i';
        }
        return Flame.ListViewDragHelper.Path.create({array: newArray, position: newPosition, root: this.root});
    },

    // Ignores the position letter
    equals: function(other) {
        var len1 = this.array.length, len2 = other.array.length;
        if (len1 !== len2) return false;
        for (var i = 0; i < len1; i++) {
            if (this.array[i] !== other.array[i]) return false;
        }
        return true;
    }
});

