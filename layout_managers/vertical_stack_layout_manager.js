/*
  VerticalStackLayoutManager is a layout manager that stacks the children vertically, with optional
  top margin, spacing and bottom margin. Use in your view e.g. like this;

   layout: { right: 220, top: 60, width: 200 },
   layoutManager: Flame.VerticalStackLayoutManager.create({ spacing: 10 }),

  Each child view should define layout.height. For the parent view it's set automatically. Should any
  of the child views change their height, the layout is updated automatically. If a childView has
  property 'ignoreLayoutManager' set to true, its layout is not affected nor considered here.
  Similarly, elements with isVisible false are ignored.

  TODO: make ignoreLayoutManager handling more generic if/when more layout managers are implemented
*/
Flame.VerticalStackLayoutManager = Flame.LayoutManager.extend({
    topMargin: 0,
    bottomMargin: 0,
    spacing: 0,

    setupLayout: function(view) {
        var self = this;
        var top = self.get('topMargin');
        var fluid = false, isFirst = true;

        // Filter out views that are not affected by the layout manager
        var views = view.get('childViews').filter(function(childView) {
            return childView.get('ignoreLayoutManager') !== true &&
                (childView.get('isVisible') || childView.get('isVisible') === null) && // isVisible is initially null
                childView.get('layout');
        });
        var len = views.get('length');

        views.forEach(function(childView, i) {
            if ('string' === typeof childView) throw 'Child views have not yet been initialized!';

            if (!isFirst) {  // Cannot check the index because some child views may be hidden and must be ignored
                top += self.get('spacing');
            } else {
                isFirst = false;
            }

            var layout = childView.get('layout');
            childView._resolveLayoutBindings(layout);  // XXX ugly
            Ember.assert('All child views must define layout when using VerticalStackLayoutManager!', !Ember.none(layout));

            top += (layout.topMargin || 0);
            childView.adjustLayout('top', top);  // Use adjustLayout, it checks if the property changes (can trigger a series of layout updates)
            top += (layout.topPadding || 0) + (layout.bottomPadding || 0);  // if view has borders, these can be used to compensate

            var height = layout.height;
            if ('string' === typeof height) height = parseInt(height, 10);
            if (i < len - 1) {  // XXX should not check the index, this check should only consider visible child views
                Ember.assert('All child views except last one must define layout.height when using VerticalStackLayoutManager!', !Ember.none(height));
            }

            if (Ember.none(layout.height)) {
                fluid = true;
            } else {
                top += height;
            }
        });

        // fluid == true means that the last child has no height set, meaning that it's meant to fill in the rest of the parent's view.
        // In that case, we must not set parent's height either, because the system is supposed to remain fluid (i.e. bottom is set).
        if (!fluid) {
            top += this.get('bottomMargin');
            view.adjustLayout('height', top);
        }
    }
});
