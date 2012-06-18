
/*
  A child view in a TreeView. In most cases you don't need to extend this, you can instead define
  a handlebarsMap on the tree view. If you want to use a custom view instead of handlebars, consider
  extending this class and defining a custom treeItemViewClass (see below). If you do need to override
  the rendering directly in this class, you should note that you're then responsible for rendering
  also the nested list view (and a toggle button if you want one).

  TODO Should perhaps extract the class definition used in treeItemViewClass into a separate subclass
       for easier extending.
 */
Flame.TreeItemView = Flame.ListItemView.extend({
    useAbsolutePositionBinding: 'parentView.rootTreeView.useAbsolutePositionForItems',
    classNames: ['flame-tree-item-view'],
    classNameBindings: ['parentView.nestingLevel'],
    isExpanded: function(key, value) {
        if (arguments.length === 1) {
            if (this._isExpanded !== undefined) return this._isExpanded;
            return this.getPath('content.treeItemIsExpanded') || this.get('defaultIsExpanded');
        } else {
            this._isExpanded = value;
            return value;
        }
    }.property('content.treeItemIsExpanded', 'defaultIsExpanded').cacheable(),
    layout: { left: 0, right: 0, top: 0, height: 0 },

    defaultIsExpanded: function() {
        return this.getPath('parentView.rootTreeView.defaultIsExpanded');
    }.property('parentView.rootTreeView.defaultIsExpanded').cacheable(),

    // Don't use the list view isSelected highlight logic
    isSelected: function(key, value) {
        return false;
    }.property().cacheable(),

    // This is the highlight logic for tree items, the is-selected class is bound to the flame-tree-item-view-container
    classAttribute: function() {
        return this.get('content') === this.getPath('parentView.rootTreeView.selection') ? 'flame-tree-item-view-container is-selected' : 'flame-tree-item-view-container';
    }.property('content', 'parentView.rootTreeView.selection').cacheable(),

    // The HTML that we need to produce is a bit complicated, because while nested items should appear
    // indented, the selection highlight should span the whole width of the tree view, and should not
    // cover possible nested list view that shows possible children of this item. The div with class
    // flame-tree-item-view-container is meant to display the selection highlight, and the div with class
    // flame-tree-item-view-pad handles indenting the item content. Possible nested list comes after.
    //
    // TODO It seems using handlebars templates is quite a bit slower than rendering programmatically,
    //      which is very much noticeable in IE7. Should probably convert to a render method.
    handlebars: '<div {{bindAttr class="classAttribute"}}><div class="flame-tree-item-view-pad">' +
            '{{#if hasChildren}}{{view toggleButton}}{{/if}}' +
            '{{view treeItemViewClass content=content}}</div></div>'+
            '{{#if renderSubTree}}{{view nestedTreeView}}{{/if}}',

    /**
     * Do we want to create the view for the subtree? This will return true if there is a subtree and it has
     * been shown at least once.
     *
     * Thus the view for the subtree is created lazily and never removed. To achieve the laziness, this property is
     * updated by _updateSubTreeRendering and cached.
     */
    renderSubTree: function() {
        return this.get("hasChildren") && this.get("isExpanded");
    }.property().cacheable(),

    /**
     * Force updating of renderSubTree when we need to create the subview.
     */
    _updateSubTreeRendering: function() {
        var show = this.get("renderSubTree");
        if (!show && this.get("isExpanded") && this.get("hasChildren")) {
            this.propertyWillChange("renderSubTree");
            this.propertyDidChange("renderSubTree");
        }
    }.observes("hasChildren", "isExpanded"),

    // This view class is responsible for rendering a single item in the tree. It's not the same thing as
    // the itemViewClass, because in the tree view that class is responsible for rendering the item AND
    // possible nested list view, if the item has children.
    treeItemViewClass: function() {
        return Flame.View.extend({
            useAbsolutePosition: false,
            layout: { top: 0, left: 0, right: 0, height: 20 },
            classNames: ['flame-tree-item-view-content'],
            contentIndexBinding: 'parentView.contentIndex',
            handlebars: function() {
                return this.getPath('parentView.parentView.rootTreeView').handlebarsForItem(this.get('content'));
            }.property('content').cacheable()
        });
    }.property(),

    /**
     * Get the immediate parent-view of all the TreeItemViews that are under this view in the tree. If no child views
     * are currently shown, return null.
     * The implementation of this method is intimately tied to the view structure defined in 'handlebars'-property.
     *
     * @returns {Ember.View} view that is the parent of all the next level items in the tree.
     */
    childListView: function() {
        if (this.get("renderSubTree")) {
            // Is there a nicer way to get in touch with child list? This is a bit brittle.
            return this.getPath("childViews.lastObject.childViews.firstObject");
        }
        return null;
    }.property("showsubTree").cacheable(),

    hasChildren: function() {
        return !Ember.none(this.getPath('content.treeItemChildren'));
    }.property('content.treeItemChildren'),

    mouseUp: function() {
        if (this.getPath('parentView.rootTreeView.clickTogglesIsExpanded')) {
            this.toggleProperty('isExpanded');
        }
        return false;  // Always propagate to ListItemView
    },

    // The view class displaying a disclosure view that allows expanding/collapsing possible children
    toggleButton: Flame.DisclosureView.extend({
        classNames: ['flame-tree-view-toggle'],
        ignoreLayoutManager: true,
        useAbsolutePosition: false,
        acceptsKeyResponder: false,
        visibilityTargetBinding: 'parentView.isExpanded',
        action: function() { return false; }  // Allow click to propagate to the parent
    }),

    // The view class for displaying possible nested list view, in case this item has children.
    nestedTreeView: function() {
        return Flame.TreeView.extend({
            useAbsolutePosition: this.getPath('parentView.rootTreeView.useAbsolutePositionForItems'),
            layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 0, spacing: 0, bottomMargin: 0 }),
            layout: { top: 0, left: 0, right: 0 },
            classNames: ['flame-tree-view-nested'],
            isVisible: Flame.computed.bool('parentView.isExpanded'), // Ember isVisible handling considers undefined to be visible
            allowSelection: this.getPath('parentView.rootTreeView.allowSelection'),
            allowReordering: this.getPath('parentView.rootTreeView.allowReordering'),
            content: this.getPath('content.treeItemChildren'),
            itemViewClass: this.getPath('parentView.rootTreeView.itemViewClass'),
            isNested: true
        });
    }.property('content')
});
