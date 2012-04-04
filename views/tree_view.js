//= require ./list_view
//= require ./tree_item_view

/*
  A tree view displays a hierarchy of nested items. The items may all be of the same type, or there can be several
  types of items (e.g. folders and files). Tree view internally uses nested ListViews. Items with subitems can be
  expanded and collapsed.

  If allowReordering is true, items can be reordered by dragging. It is possible to drag items from one container
  to another and also between levels (e.g. from a container to its parent). Reordering is done live so that at any
  given time, user will see what the resulting order is, should they choose to release the mouse button.

  The most important properties for configuring a tree view are:

   - content: A list of the top-level items. For each item, property treeItemChildren defines its children, if any.
   - selection: The selected item in the content array or one of the children or grand-children.
   - allowSelection: Whether user can select items.
   - allowReordering: Whether user can reorder items by dragging.
   - handlebarsMap: A map of handlebars templates to use for rendering the items, for each different type. For example:
        handlebarsMap: {
            'App.Folder': '{{content.name}} ({{content.treeItemChildren.length}} reports)',
            'App.Report': '{{content.name}}',
            defaultTemplate: '{{content.title}}'
        }

  If you don't want to use handlebars templates for the item views, you can alternatively define property
  'itemViewClass', which will then be used for all item types and levels. The class you name must extend
  Flame.TreeItemView, and must also render the nested list view. See comments in TreeItemView for more info.

  TODO:
   - when selection changes, scroll the selected item to be fully visible (esp. important for keyboard selection)
   - create the nested list views lazily upon expanding (would speed up initial rendering for big trees)
   - IE testing/support
   - Syncing reorderings back to the tree content source
   - keyboard support
 */
Flame.TreeView = Flame.ListView.extend({
    classNames: ['flame-tree-view'],
    classNameBindings: ['isNested', 'nestingLevel'],
    defaultIsExpanded: false,
    itemViewClass: Flame.TreeItemView,
    isNested: false,
    clickTogglesIsExpanded: true,
    /* Whether to use absolute positioning for the items and nested lists. Currently it makes things quite tricky
       and should be avoided at all cost (don't expect everything to work just by turning this on, you will likely
       need to override the itemViewClass as well). */
    useAbsolutePositionForItems: false,

    handlebarsForItem: function(item) {
        var handlebarsMap = this.get('handlebarsMap') || {};
        return handlebarsMap[item.constructor.toString()] || handlebarsMap.defaultTemplate;
    },

    nestingLevel: function() {
        return 'level-%@'.fmt(this.getPath('treeLevel'));
    }.property('treeLevel'),

    // Propagates selection to the parent. This way we can make sure that only exactly one of the nested
    // list views is showing a selection (see property isTreeItemSelected in TreeItemView)
    _treeSelectionDidChange: function() {
        var selection = this.get('selection');
        var parentTreeView = this.get('parentTreeView');
        if (selection && parentTreeView) {
            parentTreeView.set('selection', selection);
            this.set('selection', undefined);
        }
    }.observes('selection'),

    // If this is a nested tree view, propagate the call to the parent, accumulating path to the item
    startReordering: function(dragHelper, event) {
        var parentTreeView = this.get('parentTreeView');
        if (parentTreeView) {
            dragHelper.get('itemPath').insertAt(0, this.getPath('parentView.contentIndex'));
            parentTreeView.startReordering(dragHelper, event);
        } else {
            Flame.set('mouseResponderView', this);  // XXX a bit ugly...
            this._super(dragHelper, event);
        }
    },

    treeLevel: function() {
        return (this.getPath('parentTreeView.treeLevel') || 0) + 1;
    }.property('parentTreeView.treeLevel'),

    parentTreeView: function() {
        return this.get('isNested') ? this.getPath('parentView.parentView') : undefined;
    }.property('isNested', 'parentView.parentView'),

    rootTreeView: function() {
        return this.getPath('parentTreeView.rootTreeView') || this;
    }.property('parentTreeView.rootTreeView')

});
