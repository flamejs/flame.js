//= require ./split_view_divider_view_base

Flame.SplitView = Flame.View.extend({
    allowResizing: true,
    dividerThickness: 7,
    dividerView: Flame.View.extend(Flame.SplitViewDividerViewBase),

    didInsertElement: function() {
        this._updateLayout();
    }
});
