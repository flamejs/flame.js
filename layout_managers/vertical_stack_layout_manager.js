import LayoutManager from '../layout_manager';

/**
  VerticalStackLayoutManager is a layout manager that stacks the children vertically, with optional
  top margin, spacing and bottom margin. Use in your view e.g. like this;

   layout: { right: 220, top: 60, width: 200 },
   layoutManager: VerticalStackLayoutManager.create({ spacing: 10 }),

  Each child view should define layout.height. For the parent view it's set automatically. Should any
  of the child views change their height, the layout is updated automatically. If a childView has
  property 'ignoreLayoutManager' set to true, its layout is not affected nor considered here.
  Similarly, elements with isVisible false are ignored.
*/
export default LayoutManager.extend({
    topMargin: 0,
    bottomMargin: 0,
    spacing: 0,

    setupLayout: function(view) {
        var top = this.get('topMargin');
        var fluid = false;
        var maxHeight = view.get('layout.maxHeight');

        var views = this.getAffectedChildViews(view);
        var length = views.get('length');
        views.forEach(function(childView, i) {
            Ember.assert('Child views have not yet been initialized!', typeof childView !== 'string');

            if (i > 0) top += this.get('spacing');

            var layout = childView.get('layout');
            childView._resolveLayoutBindings(layout); // XXX ugly

            top += (layout.topMargin || 0);
            childView.adjustLayout('top', top); // Use adjustLayout, it checks if the property changes (can trigger a series of layout updates)
            top += (layout.topPadding || 0) + (layout.bottomPadding || 0);  // if view has borders, these can be used to compensate

            var height = layout.height;
            if (typeof height === 'string') height = parseInt(height, 10);
            if (i < length - 1) { // XXX should not check the index, this check should only consider visible child views
                Ember.assert('All child views except last one must define layout.height when using VerticalStackLayoutManager!', !Ember.isNone(height));
            }

            if (Ember.isNone(layout.height)) {
                fluid = true;
            } else {
                top += height;
            }
        }, this);

        // fluid == true means that the last child has no height set, meaning that it's meant to fill in the rest of the parent's view.
        // In that case, we must not set parent's height either, because the system is supposed to remain fluid (i.e. bottom is set).
        if (!fluid) {
            top += this.get('bottomMargin');
        }
        if (maxHeight !== undefined && top > maxHeight) {
            top = maxHeight;
        }
        if (!fluid || maxHeight !== undefined) {
            view.adjustLayout('height', top);
        }
    }
});
