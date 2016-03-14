import ListView from './list_view';
import VerticalStackLayoutManager from '../layout_managers/vertical_stack_layout_manager';

// Stack view is a list view that grows with the content and uses absolute positioning for the child views.
// Use class StackItemView as the superclass for the item views.
export default ListView.extend({
    layoutManager: VerticalStackLayoutManager.create({ topMargin: 0, spacing: 0, bottomMargin: 0 }),
    allowSelection: false
});
