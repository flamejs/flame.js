//= require ./split_view

/**
  HotizontalSplitView divides the current view between topView and bottomView using a horizontal
  dividerView.
*/
Flame.HorizontalSplitView = Flame.SplitView.extend({
    classNames: ['flame-horizontal-split-view'],
    childViews: ['topView', 'dividerView', 'bottomView'],
    topHeight: 100,
    bottomHeight: 100,
    minTopHeight: 0,
    minBottomHeight: 0,
    flex: 'bottom',

    _unCollapsedTopHeight: undefined,
    _unCollapsedBottomHeight: undefined,
    _resizeStartY: undefined,
    _resizeStartTopHeight: undefined,
    _resizeStartBottomHeight: undefined,

    init: function() {
        Ember.assert('Flame.HorizontalSplitView needs topView and bottomView!', !!this.get('topView') && !!this.get('bottomView'));
        this._super();

        if (this.get('flex') === 'bottom') this.set('bottomHeight', undefined);
        else this.set('topHeight', undefined);
    },

    _updateLayout: function() {
        var topView = this.get('topView');
        var dividerView = this.get('dividerView');
        var bottomView = this.get('bottomView');

        var totalHeight = this.$().innerHeight();
        var dividerThickness = this.get('dividerThickness');
        var topHeight = this.get('flex') === 'bottom' ? this.get('topHeight') : undefined;
        var bottomHeight = this.get('flex') === 'top' ? this.get('bottomHeight') : undefined;
        if (topHeight === undefined && bottomHeight !== undefined && totalHeight !== null && totalHeight !== 0) topHeight = totalHeight - bottomHeight - dividerThickness;
        if (bottomHeight === undefined && topHeight !== undefined && totalHeight !== null && totalHeight !== 0) bottomHeight = totalHeight - topHeight - dividerThickness;

        if ('number' === typeof topHeight && topHeight < this.get('minTopHeight')) {
            bottomHeight += topHeight - this.get('minTopHeight');
            topHeight = this.get('minTopHeight');
        }
        if ('number' === typeof bottomHeight && bottomHeight < this.get('minBottomHeight')) {
            topHeight += bottomHeight - this.get('minBottomHeight');
            bottomHeight = this.get('minBottomHeight');
        }
        this.set('topHeight', topHeight);
        this.set('bottomHeight', bottomHeight);

        if (this.get('flex') === 'bottom') {
            this._setDimensions(topView, 0, topHeight, '');
            this._setDimensions(dividerView, topHeight, dividerThickness, '');
            this._setDimensions(bottomView, topHeight + dividerThickness, '', 0);
        } else {
            this._setDimensions(topView, 0, '', bottomHeight + dividerThickness);
            this._setDimensions(dividerView, '', dividerThickness, bottomHeight);
            this._setDimensions(bottomView, '', bottomHeight, 0);
        }
    }.observes('topHeight', 'bottomHeight', 'minTopHeight', 'minBottomHeight'),

    _setDimensions: function(view, top, height, bottom) {
        view.get('layout').setProperties({
            left: 0,
            height: height,
            right: 0,
            top: top,
            bottom: bottom
        });
        view.updateLayout();
    },

    toggleCollapse: function(event) {
        if (!this.get('allowResizing')) return;

        if (this.get('flex') === 'bottom') {
            if (this.get('topHeight') === this.get('minTopHeight') && this._unCollapsedTopHeight !== undefined) {
                this.set('topHeight', this._unCollapsedTopHeight);
            } else {
                this._unCollapsedTopHeight = this.get('topHeight');
                this.set('topHeight', this.get('minTopHeight'));
            }
        } else {
            if (this.get('bottomHeight') === this.get('minBottomHeight') && this._unCollapsedBottomHeight !== undefined) {
                this.set('bottomHeight', this._unCollapsedBottomHeight);
            } else {
                this._unCollapsedBottomHeight = this.get('bottomHeight');
                this.set('bottomHeight', this.get('minBottomHeight'));
            }
        }
    },

    startResize: function(event) {
        this._resizeStartY = event.pageY;
        this._resizeStartTopHeight = this.get('topHeight');
        this._resizeStartBottomHeight = this.get('bottomHeight');
    },

    resize: function(event) {
        if (this.get('flex') === 'bottom') {
            this.set('topHeight', this._resizeStartTopHeight + (event.pageY - this._resizeStartY));
        } else {
            this.set('bottomHeight', this._resizeStartBottomHeight - (event.pageY - this._resizeStartY));
        }
    }
});
