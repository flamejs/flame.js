//= require ./label_view

// When multiple panels with modal panes are shown at the same time, we need this to get them to stack on
// top of each other. If they use a static z-index, all the panels would appear on top of all the modal panes.
Flame._zIndexCounter = 100;

Flame.reopen({
    POSITION_BELOW:  1 << 0,
    POSITION_RIGHT:  1 << 1,
    POSITION_LEFT:   1 << 2,
    POSITION_ABOVE:  1 << 3,
    POSITION_MIDDLE: 1 << 4
});

// A pop-up panel, modal or non-modal. The panel is destroyed on closing by default. If you intend to reuse the same
// panel instance, set destroyOnClose: false.
Flame.Panel = Flame.View.extend({
    classNames: ['flame-panel'],
    childViews: ['titleView', 'contentView', 'resizeView'],
    destroyOnClose: true,
    acceptsKeyResponder: true,
    isModal: true,
    allowClosingByClickingOutside: true,
    allowClosingByCancelButton: false,
    allowMoving: false,
    dimBackground: true,
    title: null,
    isShown: false,
    // make isResizable true to allow panel to be resized by the user
    isResizable: false,
    // Default minimum size for the resized panel
    minHeight: 52,
    minWidth: 100,
    // When given a unique id, the panel's layout (so far only position) will be persisted
    layoutPersistenceKey: null,

    init: function() {
        Ember.assert('Flame.Panel needs a contentView!', !!this.get('contentView'));
        this._super();
    },

    titleView: Flame.View.extend(Flame.Statechart, {
        layout: { left: 0, right: 0, height: 'height', bottomPadding: 1 },
        isVisible: Ember.computed.notEqual('parentView.title', null),
        initialFlameState: 'idle',
        childViews: ['headerView'],

        height: function() {
            return this.get('parentView.headerView.height') || 36;
        }.property('parentView.headerView.height'),

        headerView: function() {
            return this.get('parentView.headerView') || this.get('labelView');
        }.property('parentView.headerView'),

        labelView: Flame.LabelView.extend({
            classNames: ['flame-panel-title'],
            layout: { left: 4, right: 4, top: 2 },
            textAlign: Flame.ALIGN_CENTER,
            value: Ember.computed.alias('parentView.parentView.title')
        }),

        idle: Flame.State.extend({
            mouseDown: function(event) {
                var owner = this.get('owner');
                if (!owner.get('parentView.allowMoving')) {
                    return true;
                }
                owner._pageX = event.pageX;
                owner._pageY = event.pageY;
                var offset = owner.get('parentView').$().offset();
                owner._panelX = offset.left;
                owner._panelY = offset.top;
                this.gotoFlameState('moving');
                return true;
            },
            touchStart: function(event) {
                // Normalize the event and send it to mouseDown()
                this.mouseDown(this.normalizeTouchEvents(event));
                return true;
            }
        }),

        moving: Flame.State.extend({
            enterState: function() {
                this.element = this.get('owner.parentView').$();
                this.windowHeight = jQuery(window).height();
                this.windowWidth = jQuery(window).width();
                this.elementWidth = this.element.outerWidth();
                this.elementHeight = this.element.outerHeight();
            },
            mouseMove: function(event) {
                var owner = this.get('owner');
                var newX = owner._panelX + (event.pageX - owner._pageX);
                var newY = owner._panelY + (event.pageY - owner._pageY);
                this.newX = Math.max(5, Math.min(newX, this.windowWidth - this.elementWidth - 5));  // Constrain inside window
                this.newY = Math.max(5, Math.min(newY, this.windowHeight - this.elementHeight - 5));
                this.element.css({ left: this.newX, top: this.newY, right: '', bottom: '', marginLeft: '', marginTop: '' });
                return true;
            },
            touchMove: function(event) {
                // Don't scroll the page while doing this
                event.preventDefault();
                // Normalize the event and send it to mouseMove()
                this.mouseMove(this.normalizeTouchEvents(event));
                return true;
            },
            mouseUp: Flame.State.gotoFlameState('idle'),
            touchEnd: Flame.State.gotoFlameState('idle'),
            exitState: function() {
                // Save panel layout
                var layoutPersistenceKey = this.get('owner').nearestOfType(Flame.Panel).get('layoutPersistenceKey');
                if (layoutPersistenceKey) {
                    var panelLayouts = JSON.parse(localStorage.getItem('panelLayouts')) || {};
                    panelLayouts[layoutPersistenceKey] = {
                        position: { left: this.newX, top: this.newY }
                    };
                    localStorage.setItem('panelLayouts', JSON.stringify(panelLayouts));
                }
            }
        })
    }),

    resizeView: Flame.View.extend(Flame.Statechart, {
        layout: { bottom: 3, right: 3, height: 16, width: 16 },
        ignoreLayoutManager: true,
        classNames: ['flame-resize-thumb'],
        isVisible: Ember.computed.alias('parentView.isResizable'),
        initialFlameState: 'idle',
        isResizing: false,

        idle: Flame.State.extend({
            enterState: function(event) {
                this.set('owner.isResizing', false);
            },
            mouseDown: function(event) {
                var owner = this.get('owner');
                var panelElement = owner.get('parentView').$();
                if (!owner.get('parentView.isResizable')) {
                    return true;
                }
                owner._pageX = event.pageX;
                owner._pageY = event.pageY;
                owner._startW = panelElement.outerWidth();
                owner._startH = panelElement.outerHeight();
                this.gotoFlameState('resizing');
                return true;
            },
            touchStart: function(event) {
                // Normalize the event and send it to mouseDown()
                this.mouseDown(this.normalizeTouchEvents(event));
                return true;
            }
        }),
        resizing: Flame.State.extend({
            enterState: function(event) {
                this.set('owner.isResizing', true);
            },
            mouseMove: function(event) {
                var owner = this.get('owner');
                var parentView = owner.get('parentView');
                var newW = owner._startW + (event.pageX - owner._pageX);
                var newH = owner._startH + (event.pageY - owner._pageY);
                newW = Math.max(parentView.get('minWidth'), newW);  // Minimum panel width
                newH = Math.max(parentView.get('minHeight'), newH);  // Minimum panel height: title bar plus this "thumb"
                parentView.$().css({ width: newW, height: newH });
                return true;
            },
            touchMove: function(event) {
                // Don't scroll the page while resizing
                event.preventDefault();
                // Normalize the event and send it to mouseMove()
                this.mouseMove(this.normalizeTouchEvents(event));
                return true;
            },
            mouseUp: Flame.State.gotoFlameState('idle'),
            touchEnd: Flame.State.gotoFlameState('idle')
        })
    }),

    // This is the pane that's used to obscure the background if isModal === true
    modalPane: function() {
        return Flame.View.create({
            layout: { left: 0, top: 0, right: 0, bottom: 0 },
            classNames: ['flame-modal-pane'],
            classNameBindings: ['parentPanel.dimBackground'],

            parentPanel: null,
            mouseDown: function() {
                if (this.get('parentPanel.allowClosingByClickingOutside')) {
                    this.get('parentPanel').close();
                }
                return true;
            },
            touchStart: function() {
                if (this.get('parentPanel.allowClosingByClickingOutside')) {
                    this.get('parentPanel').close();
                }
                return true;
            }
        });
    }.property().volatile(),

    insertNewline: function(event) {
        var defaultButton = this.firstDescendantWithProperty('isDefault');
        if (defaultButton && defaultButton.simulateClick) {
            defaultButton.simulateClick();
        }
        return true;
    },

    cancel: function(event) {
        if (this.get('allowClosingByCancelButton')) {
            this.close();
        }
        return true;
    },

    _getDimensionsForAnchorElement: function(anchorElement) {
        if (anchorElement.closest('svg').length > 0) {
            return { height: anchorElement[0].getBBox().height, width: anchorElement[0].getBBox().width };
        } else {
            return { height: anchorElement.outerHeight(), width: anchorElement.outerWidth() };
        }
    },

    _layoutRelativeTo: function(anchor, position) {
        position = position || Flame.POSITION_BELOW;

        var layout = this.get('layout');
        var anchorElement = anchor instanceof jQuery ? anchor : anchor.$();
        var offset = anchorElement.offset();

        var contentView = this.objectAt(0);
        if (contentView && contentView.get('layout') && contentView.get('layout').height && (!layout || !layout.height)) {
            layout.height = contentView.get('layout').height;
        }

        var dimensions = this._getDimensionsForAnchorElement(anchorElement);

        if (position & (Flame.POSITION_BELOW | Flame.POSITION_ABOVE)) {
            layout.top = offset.top + ((position & Flame.POSITION_BELOW) ? dimensions.height : -layout.height);
            layout.left = offset.left;
            if (position & Flame.POSITION_MIDDLE) {
                layout.left = layout.left - (layout.width / 2) + (dimensions.width / 2);
            }
        } else if (position & (Flame.POSITION_RIGHT | Flame.POSITION_LEFT)) {
            layout.top = offset.top;
            layout.left = offset.left + ((position & Flame.POSITION_RIGHT) ? dimensions.width : -layout.width);
            if (position & Flame.POSITION_MIDDLE) {
                layout.top = layout.top - (layout.height / 2) + (dimensions.height / 2);
            }
        } else {
            Ember.assert('Invalid position for panel', false);
        }

        // Make sure the panel is still within the viewport horizontally ...
        var $window = Ember.$(window);
        var windowWidth = $window.width();
        if (layout.left + layout.width > windowWidth - 10) {
            layout.left = windowWidth - layout.width - 10;
            layout.movedX = true;
        }
        // ... and vertically
        if ((position & Flame.POSITION_BELOW && (layout.top + layout.height > $window.height() - 10) && offset.top - layout.height >= 0) ||
            (position & Flame.POSITION_ABOVE && (layout.top < 0))) {
            layout.movedY = true;
        } else if (layout.top < 0) {
            layout.top = 10;
        }
        return layout;
    },

    popup: function(anchor, position) {
        if (!this.get('isShown')) {
            if (this.get('isModal')) {
                var modalPane = this.get('modalPane');
                modalPane.set('parentPanel', this);
                modalPane.get('layout').zIndex = Flame._zIndexCounter;
                Ember.run(function() {
                    modalPane.append();
                });
                this.set('_modalPane', modalPane);
            }

            if (anchor) {
                this.set('layout', this._layoutRelativeTo(anchor, position));
            }
            this.get('layout').zIndex = Flame._zIndexCounter + 10;
            Flame._zIndexCounter += 100;

            this.append();
            this.set('isShown', true);
            this.set('isVisible', true);
            if (this.get('acceptsKeyResponder')) this.becomeKeyResponder(false);
            // Try to restore panel layout
            var layoutPersistenceKey = this.get('layoutPersistenceKey');
            if (layoutPersistenceKey) {
                var panelLayouts = JSON.parse(localStorage.getItem('panelLayouts')) || {};
                if (panelLayouts[layoutPersistenceKey]) {
                    var layout = this.get('layout');
                    layout.top = panelLayouts[layoutPersistenceKey].position.top;
                    layout.left = panelLayouts[layoutPersistenceKey].position.left;
                    layout.centerX = undefined;
                    layout.centerY = undefined;
                }
            }
            Ember.run.scheduleOnce('afterRender', this, this._focusDefaultInput);
        }
    },

    close: function() {
        if (this.isDestroyed) return;
        if (this.get('isShown')) {
            if (this.get('isModal')) {
                this.get('_modalPane').remove();
                this.get('_modalPane').destroy();
            }
            this.remove();
            this.set('isShown', false);
            this.set('isVisible', false);
            if (this.get('acceptsKeyResponder')) this.resignKeyResponder();
            Flame._zIndexCounter -= 100;

            if (this.get('destroyOnClose')) this.destroy();
        }
    },

    _focusDefaultInput: function() {
        var defaultFocus = this.firstDescendantWithProperty('isDefaultFocus');
        if (defaultFocus) defaultFocus.becomeKeyResponder();
    }
});
