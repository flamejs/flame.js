//= require ./split_view

/*
 * VerticalSplitView divides the current view between leftView and rightView using a vertical
 * dividerView.
 */
Flame.VerticalSplitView = Flame.SplitView.extend({
    classNames: 'flame-vertical-split-view'.w(),
    childViews: 'leftView dividerView rightView'.w(),
    leftWidth: 100,
    rightWidth: 100,
    minLeftWidth: 0,
    minRightWidth: 0,
    flex: 'right',

    _unCollapsedLeftWidth: undefined,
    _unCollapsedRightWidth: undefined,
    _resizeStartX: undefined,
    _resizeStartLeftWidth: undefined,
    _resizeStartRightWidth: undefined,

    init: function() {
        Ember.assert('Flame.VerticalSplitView needs leftView and rightView!', !!this.get('leftView') && !!this.get('rightView'));
        this._super();

        if (this.get('flex') === 'right') this.rightWidth = undefined;
        else this.leftWidth = undefined;

        this._updateLayout(); // Update layout according to the initial widths

        this.addObserver('leftWidth', this, this._updateLayout);
        this.addObserver('rightWidth', this, this._updateLayout);
        this.addObserver('minLeftWidth', this, this._updateLayout);
        this.addObserver('minRightWidth', this, this._updateLayout);
    },

    _updateLayout: function() {
        var leftView = this.get('leftView');
        var dividerView = this.get('dividerView');
        var rightView = this.get('rightView');

        var totalWidth = this.$().innerWidth();
        var dividerThickness = this.get('dividerThickness');
        var leftWidth = this.get('flex') === 'right' ? this.get('leftWidth') : undefined;
        var rightWidth = this.get('flex') === 'left' ? this.get('rightWidth') : undefined;
        if (leftWidth === undefined && rightWidth !== undefined && totalWidth !== null) leftWidth = totalWidth - rightWidth - dividerThickness;
        if (rightWidth === undefined && leftWidth !== undefined && totalWidth !== null) rightWidth = totalWidth - leftWidth - dividerThickness;

        if ('number' === typeof leftWidth && leftWidth < this.get('minLeftWidth')) {
            rightWidth += leftWidth - this.get('minLeftWidth');
            leftWidth = this.get('minLeftWidth');
        }
        if ('number' === typeof rightWidth && rightWidth < this.get('minRightWidth')) {
            leftWidth += rightWidth - this.get('minRightWidth');
            rightWidth = this.get('minRightWidth');
        }
        this.set('leftWidth', leftWidth);
        this.set('rightWidth', rightWidth);

        if (this.get('flex') === 'right') {
            this._setDimensions(leftView, 0, leftWidth, undefined);
            this._setDimensions(dividerView, leftWidth, dividerThickness, undefined);
            this._setDimensions(rightView, leftWidth + dividerThickness, undefined, 0);
        } else {
            this._setDimensions(leftView, 0, undefined, rightWidth + dividerThickness);
            this._setDimensions(dividerView, undefined, dividerThickness, rightWidth);
            this._setDimensions(rightView, undefined, rightWidth, 0);
        }
    },

    _setDimensions: function(view, left, width, right) {
        var layout = view.get('layout');
        layout.set('left', left);
        layout.set('width', width);
        layout.set('right', right);
        layout.set('top', 0);
        layout.set('bottom', 0);

        view.updateLayout();
    },

    toggleCollapse: function(event) {
        if (!this.get('allowResizing')) return;

        if (this.get('flex') === 'right') {
            if (this.get('leftWidth') === this.get('minLeftWidth') && this._unCollapsedLeftWidth !== undefined) {
                this.set('leftWidth', this._unCollapsedLeftWidth);
            } else {
                this._unCollapsedLeftWidth = this.get('leftWidth');
                this.set('leftWidth', this.get('minLeftWidth'));
            }
        } else {
            if (this.get('rightWidth') === this.get('minRightWidth') && this._unCollapsedRightWidth !== undefined) {
                this.set('rightWidth', this._unCollapsedRightWidth);
            } else {
                this._unCollapsedRightWidth = this.get('rightWidth');
                this.set('rightWidth', this.get('minRightWidth'));
            }
        }
    },

    startResize: function(event) {
        this._resizeStartX = event.pageX;
        this._resizeStartLeftWidth = this.get('leftWidth');
        this._resizeStartRightWidth = this.get('rightWidth');
    },

    resize: function(event) {
        if (this.get('flex') === 'right') {
            this.set('leftWidth', this._resizeStartLeftWidth + (event.pageX - this._resizeStartX));
        } else {
            this.set('rightWidth', this._resizeStartRightWidth - (event.pageX - this._resizeStartX));
        }
    }
});
