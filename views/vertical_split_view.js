Flame.VerticalSplitView = Flame.View.extend({
    classNames: ['flame-vertical-split-view'],
    childViews: ['topView', 'dividerView', 'bottomView'],
    allowResizing: true,
    topHeight: 100,
    bottomHeight: 100,
    minTopHeight: 0,
    minBottomHeight: 0,
    dividerHeight: 7,
    flex: 'bottom',
    resizeInProgress: false,

    _unCollapsedTopHeight: undefined,
    _unCollapsedBottomHeight: undefined,
    _resizeStartY: undefined,
    _resizeStartTopHeight: undefined,
    _resizeStartBottomHeight: undefined,

    init: function() {
        ember_assert('Flame.VerticalSplitView needs topView and bottomView!', !!this.get('topView') && !!this.get('bottomView'));
        this._super();

        if (this.get('flex') === 'bottom') this.bottomHeight = undefined;
        else this.topHeight = undefined;

        this._updateLayout();  // Update layout according to the initial heights

        this.addObserver('topHeight', this, this._updateLayout);
        this.addObserver('bottomHeight', this, this._updateLayout);
        this.addObserver('minTopHeight', this, this._updateLayout);
        this.addObserver('minBottomHeight', this, this._updateLayout);
    },

    _updateLayout: function() {
        // Damn, this is starting to look complicated...
        var topView = this.get('topView');
        var dividerView = this.get('dividerView');
        var bottomView = this.get('bottomView');

        var totalHeight = Ember.$(this.get('element')).innerHeight();
        var dividerHeight = this.get('dividerHeight');

        var topHeight = this.get('flex') === 'bottom' ? this.get('topHeight') : undefined;
        var bottomHeight = this.get('flex') === 'top' ? this.get('bottomHeight') : undefined;
        if (topHeight === undefined && bottomHeight !== undefined && totalHeight !== null) topHeight = totalHeight - bottomHeight - dividerHeight;
        if (bottomHeight === undefined && topHeight !== undefined && totalHeight !== null) bottomHeight = totalHeight - topHeight - dividerHeight;

        //console.log('topHeight %@, totalHeight %@, bottomHeight %@'.fmt(topHeight, totalHeight, bottomHeight));

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
            this._setDimensions(topView, 0, topHeight, undefined);
            this._setDimensions(dividerView, topHeight, dividerHeight, undefined);
            this._setDimensions(bottomView, topHeight + dividerHeight, undefined, 0);
        } else {
            this._setDimensions(topView, 0, undefined, bottomHeight + dividerHeight);
            this._setDimensions(dividerView, undefined, dividerHeight, bottomHeight);
            this._setDimensions(bottomView, undefined, bottomHeight, 0);
        }
    },

    _setDimensions: function(view, top, height, bottom) {
        var layout = view.get('layout');
        layout.set('left', 0);
        layout.set('height', height);
        layout.set('right', 0);
        layout.set('top', top);
        layout.set('bottom', bottom);

        view.updateLayout();
    },

    toggleCollapse: function(evt) {
        if (this.get('allowResizing')) {
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
            this.endResize();
        }
    },

    startResize: function(evt) {
        if (this.get('allowResizing')) {
            this.set('resizeInProgress', true);
            this._resizeStartY = evt.pageY;
            this._resizeStartTopHeight = this.get('topHeight');
            this._resizeStartBottomHeight = this.get('bottomHeight');
            return true;
        }
        return false;
    },

    resize: function(evt) {
        if (this.get('resizeInProgress')) {
            if (this.get('flex') === 'bottom') {
                this.set('topHeight', this._resizeStartTopHeight + (evt.pageY - this._resizeStartY));
            } else {
                this.set('bottomHeight', this._resizeStartBottomHeight - (evt.pageY - this._resizeStartY));
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
