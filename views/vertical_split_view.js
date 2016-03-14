import SplitView from './split_view';

/**
  VerticalSplitView divides the current view between leftView and rightView using a vertical
  dividerView.
*/
export default SplitView.extend({
    classNames: ['flame-vertical-split-view'],
    childViews: ['leftView', 'dividerView', 'rightView'],
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

        if (this.get('flex') === 'right') this.set('rightWidth', undefined);
        else this.set('leftWidth', undefined);
    },

    _updateLayout: function() {
        var leftView = this.get('leftView');
        var dividerView = this.get('dividerView');
        var rightView = this.get('rightView');

        var totalWidth = this.$().innerWidth();
        var dividerThickness = this.get('dividerThickness');
        var leftWidth = this.get('flex') === 'right' ? this.get('leftWidth') : undefined;
        var rightWidth = this.get('flex') === 'left' ? this.get('rightWidth') : undefined;
        if (leftWidth === undefined && rightWidth !== undefined && totalWidth !== null && totalWidth !== 0) leftWidth = totalWidth - rightWidth - dividerThickness;
        if (rightWidth === undefined && leftWidth !== undefined && totalWidth !== null && totalWidth !== 0) rightWidth = totalWidth - leftWidth - dividerThickness;

        if (typeof leftWidth === 'number' && leftWidth < this.get('minLeftWidth')) {
            rightWidth += leftWidth - this.get('minLeftWidth');
            leftWidth = this.get('minLeftWidth');
        }
        if (typeof rightWidth === 'number' && rightWidth < this.get('minRightWidth')) {
            leftWidth += rightWidth - this.get('minRightWidth');
            rightWidth = this.get('minRightWidth');
        }
        this.set('leftWidth', leftWidth);
        this.set('rightWidth', rightWidth);

        if (this.get('flex') === 'right') {
            this._setDimensions(leftView, 0, leftWidth, '');
            this._setDimensions(dividerView, leftWidth, dividerThickness, '');
            this._setDimensions(rightView, leftWidth + dividerThickness, '', 0);
        } else {
            this._setDimensions(leftView, 0, '', rightWidth + dividerThickness);
            this._setDimensions(dividerView, '', dividerThickness, rightWidth);
            this._setDimensions(rightView, '', rightWidth, 0);
        }
    }.observes('leftWidth', 'rightWidth', 'minLeftWidth', 'minRightWidth'),

    _setDimensions: function(view, left, width, right) {
        view.get('layout').setProperties({
            left: left,
            width: width,
            right: right,
            top: 0,
            bottom: 0
        });
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
