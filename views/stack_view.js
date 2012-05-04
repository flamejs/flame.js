// Stack view is a list view that grows with the content and uses absolute positioning for the child views.
// Use class StackItemView as the superclass for the item views.
Flame.StackView = Flame.ListView.extend({
    layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 0, spacing: 0, bottomMargin: 0 }),
    allowSelection: false
});
