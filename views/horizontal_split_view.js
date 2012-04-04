Flame.HorizontalSplitView = Flame.View.extend({
    classNames: ['flame-horizontal-split-view'],
    childViews: ['leftView', 'dividerView', 'rightView'],
    allowResizing: true,
    leftWidth: 100,
    rightWidth: 100,
    minLeftWidth: 0,
    minRightWidth: 0,
    dividerWidth: 7,
    flex: 'right',
    resizeInProgress: false,

    _unCollapsedLeftWidth: undefined,
    _unCollapsedRightWidth: undefined,
    _resizeStartX: undefined,
    _resizeStartLeftWidth: undefined,
    _resizeStartRightWidth: undefined,

    init: function() {
        ember_assert('Flame.HorizontalSplitView needs leftView and rightView!', !!this.get('leftView') && !!this.get('rightView'));
        this._super();

        if (this.get('flex') === 'right') this.rightWidth = undefined;
        else this.leftWidth = undefined;

        this._updateLayout();  // Update layout according to the initial widths

        this.addObserver('leftWidth', this, this._updateLayout);
        this.addObserver('rightWidth', this, this._updateLayout);
        this.addObserver('minLeftWidth', this, this._updateLayout);
        this.addObserver('minRightWidth', this, this._updateLayout);
    },

    _updateLayout: function() {
        // Damn, this is starting to look complicated...
        var leftView = this.get('leftView');
        var dividerView = this.get('dividerView');
        var rightView = this.get('rightView');

        var totalWidth = Ember.$(this.get('element')).innerWidth();
        var dividerWidth = this.get('dividerWidth');

        var leftWidth = this.get('flex') === 'right' ? this.get('leftWidth') : undefined;
        var rightWidth = this.get('flex') === 'left' ? this.get('rightWidth') : undefined;
        if (leftWidth === undefined && rightWidth !== undefined && totalWidth !== null) leftWidth = totalWidth - rightWidth - dividerWidth;
        if (rightWidth === undefined && leftWidth !== undefined && totalWidth !== null) rightWidth = totalWidth - leftWidth - dividerWidth;

        //console.log('leftWidth %@, totalWidth %@, rightWidth %@'.fmt(leftWidth, totalWidth, rightWidth));

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
            this._setDimensions(dividerView, leftWidth, dividerWidth, undefined);
            this._setDimensions(rightView, leftWidth + dividerWidth, undefined, 0);
        } else {
            this._setDimensions(leftView, 0, undefined, rightWidth + dividerWidth);
            this._setDimensions(dividerView, undefined, dividerWidth, rightWidth);
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

    toggleCollapse: function(evt) {
        if (this.get('allowResizing')) {
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
            this.endResize();
        }
    },

    startResize: function(evt) {
        if (this.get('allowResizing')) {
            this.set('resizeInProgress', true);
            this._resizeStartX = evt.pageX;
            this._resizeStartLeftWidth = this.get('leftWidth');
            this._resizeStartRightWidth = this.get('rightWidth');
            return true;
        }
        return false;
    },

    resize: function(evt) {
        if (this.get('resizeInProgress')) {
            if (this.get('flex') === 'right') {
                this.set('leftWidth', this._resizeStartLeftWidth + (evt.pageX - this._resizeStartX));
            } else {
                this.set('rightWidth', this._resizeStartRightWidth - (evt.pageX - this._resizeStartX));
            }
            return true;
        }
        return false;
    },

    endResize: function(evt) {
        this.set('resizeInProgress', false);
        return true;
    },

    dividerView: Flame.View.extend({
        classNames: ['flame-split-view-divider'],

        mouseDown: function(evt) {
            return this.get('parentView').startResize(evt);
        },
        mouseMove: function(evt) {
            return this.get('parentView').resize(evt);
        },
        mouseUp: function(evt) {
            return this.get('parentView').endResize(evt);
        },
        doubleClick: function(evt) {
            return this.get('parentView').toggleCollapse(evt);
        }
    })
});
