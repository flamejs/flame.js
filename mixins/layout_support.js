// Support for defining the layout with a hash, e.g. layout: {left: 10, top: 10, width: 100, height: 30}
Flame.LayoutSupport = {
    useAbsolutePosition: true,
    concatenatedProperties: ['displayProperties'],
    layout: {left: 0, right: 0, top: 0, bottom: 0},
    defaultWidth: undefined,
    defaultHeight: undefined,
    layoutManager: undefined,
    rootView: false,

    _layoutProperties: ['left', 'right', 'top', 'bottom', 'width', 'height'],
    _cssProperties: ['left', 'right', 'top', 'bottom', 'width', 'height', 'margin-left', 'margin-top'],
    _layoutChangeInProgress: false,
    _layoutSupportInitialized: false,

    init: function() {
        this._super();
        this._initLayoutSupport();
        this.consultLayoutManager();
        this.updateLayout();  // Make sure CSS is up-to-date, otherwise can sometimes get out of sync for some reason
    },

    createChildView: function(view, attrs) {
        view = this._super(view, attrs);
        Flame._bindPrefixedBindings(view);
        return view;
    },

    // When using handlebars templates, the child views are created only upon rendering, not in init.
    // Thus we need to consult the layout manager also at this point.
    didInsertElement: function() {
        this._super();
        this.consultLayoutManager();
    },

    childViewsDidChange: function() {
        this._super.apply(this, arguments);
        this.consultLayoutManager();
    },

    _initLayoutSupport: function() {
        // Do this initialization even if element is not currently using absolute positioning, just in case
        var layout = Ember.Object.create(Ember.copy(this.get('layout')));  // Clone layout for each instance in case it's mutated (happens with split view)

        if (layout.width === undefined && layout.right === undefined && this.get('defaultWidth') !== undefined) {
            layout.width = this.get('defaultWidth');
        }
        if (layout.height === undefined && (layout.top === undefined || layout.bottom === undefined) && this.get('defaultHeight') !== undefined) {
            layout.height = this.get('defaultHeight');
        }

        this.set('layout', layout);

        // For changes to the layout it's enough to update the DOM
        this.addObserver('layout', this, this.updateLayout);

        this._layoutSupportInitialized = true;
    },

    _renderElementAttributes: function(buffer) {
        Ember.assert('Layout support has not yet been initialized!', !!this._layoutSupportInitialized);
        if (!this.get('useAbsolutePosition')) return;

        var layout = this.get('layout') || {};
        this._resolveLayoutBindings(layout);
        var cssLayout = this._translateLayout(layout);

        this._cssProperties.forEach(function(prop) {
            var value = cssLayout[prop];
            if (!Ember.none(value)) {
                buffer.style(prop, value);
            }
        });
        if (layout.zIndex !== undefined) buffer.style('z-index', layout.zIndex);

        var backgroundColor = this.get('backgroundColor');
        if (backgroundColor !== undefined) buffer.style('background-color', backgroundColor);

        buffer.addClass('flame-view');
    },

    render: function(buffer) {
        this._renderElementAttributes(buffer);
        return this._super(buffer);
    },

    _resolveLayoutBindings: function(layout) {
        if (layout._bindingsResolved) return;  // Only add the observers once, even if rerendered
        var self = this;
        this._layoutProperties.forEach(function(prop) {
            var value = layout[prop];
            // Does it look like a property path (and not e.g. '50%')?
            if (!Ember.none(value) && 'string' === typeof value && value !== '' && isNaN(parseInt(value, 10))) {
                // TODO remove the observer when view destroyed?
                self.addObserver(value, self, function() {
                    self.adjustLayout(prop, self.getPath(value));
                });
                layout[prop] = self.getPath(value);
            }
        });
        layout._bindingsResolved = true;
    },

    // Given a layout hash, translates possible centerX and centerY to appropriate CSS properties
    _translateLayout: function(layout) {
        var cssLayout = {};

        cssLayout.width = layout.width;
        if (layout.centerX === undefined) {
            cssLayout.left = layout.left;
            cssLayout.right = layout.right;
        } else {
            cssLayout.left = '50%';
            cssLayout['margin-left'] = (-((layout.width || 0) / 2) + layout.centerX) + 'px';
        }

        cssLayout.height = layout.height;
        if (layout.centerY === undefined) {
            cssLayout.top = layout.top;
            cssLayout.bottom = layout.bottom;
        } else {
            cssLayout.top = '50%';
            cssLayout['margin-top'] = (-((layout.height || 0) / 2) + layout.centerY) + 'px';
        }

        this._cssProperties.forEach(function(prop) {
            var value = cssLayout[prop];
            // If a number or a string containing only a number, append 'px'
            if (value !== undefined && ('number' === typeof value || parseInt(value, 10).toString() === value)) {
                cssLayout[prop] = value+'px';
            }
        });

        return cssLayout;
    },

    // If layout manager is defined, asks it to recompute the layout, i.e. update the positions of the child views
    consultLayoutManager: function() {
        // View initializations might result in calling this method before they've called our init method.
        // That causes very bad effects because the layout property has not yet been cloned, which means
        // that several views might be sharing the layout property. So just ignore the call if not initialized.
        if (!this._layoutSupportInitialized) return;

        // This if needed to prevent endless loop as the layout manager is likely to update the children, causing this method to be called again
        if (!this._layoutChangeInProgress) {
            this._layoutChangeInProgress = true;
            try {
                var layoutManager = this.get('layoutManager');
                if (layoutManager !== undefined) layoutManager.setupLayout(this);
            } finally {
                this._layoutChangeInProgress = false;
            }
        }
    },

    layoutDidChangeFor: function(childView) {
        this.consultLayoutManager();
    },

    // Can be used to adjust one property in the layout. Updates the DOM automatically.
    adjustLayout: function(property, value, increment) {
        Ember.assert('Layout support has not yet been initialized!', !!this._layoutSupportInitialized);

        var layout = this.get('layout');
        var oldValue = layout[property];
        var newValue;
        if (value !== undefined) {
            newValue = value;
        } else if (increment !== undefined) {
            newValue = oldValue + increment;
        } else throw 'Give either a new value or an increment!';

        if (oldValue !== newValue) {
            layout[property] = newValue;
            this.updateLayout();
        }
    },

    // Call this method to update the DOM to reflect the layout property, without recreating the DOM element
    updateLayout: function() {
        Ember.assert('Layout support has not yet been initialized!', !!this._layoutSupportInitialized);

        if (this.get('useAbsolutePosition')) {
            var cssLayout = this._translateLayout(this.get('layout') || {});
            var element = this.get('element');
            if (element) {
                jQuery(element).css(cssLayout);
            } else {
                // Apparently not yet in DOM - should be fine though, we update the layout in didInsertElement
            }
        }

        var parentView = this.get('parentView');
        if (parentView && parentView.layoutDidChangeFor) parentView.layoutDidChangeFor(this);
    }.observes('isVisible'),

    // XXX: isVisible property doesn't seem to always get set properly, so make sure it is true
    isVisible: true,

    _isVisibleWillChange: function() {
        var callback;
        if (!this.get('isVisible')) {
            callback = 'willBecomeVisible';
        } else {
            callback = 'willBecomeHidden';
        }
        this.invokeRecursively(function(view) {
            if (view[callback]) view[callback].apply(view);
        });
    }.observesBefore('isVisible')
};

