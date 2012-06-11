Flame.ButtonView = Flame.View.extend(Flame.ActionSupport, Flame.Statechart, {
    defaultHeight: 24,
    classNames: ['flame-button-view'],
    classNameBindings: ['isHovered', 'isActive', 'isSelected', 'isDisabled', 'isDefault', 'isFocused'],
    acceptsKeyResponder: true,
    isHovered: false,
    isActive: false,
    isSelected: false,  // for 'sticky' buttons, means that the button is stuck down (used for tab views)
    isDisabled: false,
    isDefault: false,  // If true, fires in a panel when user hits enter
    isSticky: false,  // If true, each click (mouseUp to be specific) toggles 'isSelected'
    initialState: 'idle',

    handlebars: "<label class='flame-button-label'>{{title}}</label>",

    render: function(buffer) {
        var height = this.getPath('layout.height');
        if (this.get('useAbsolutePosition') && !Ember.none(height)) buffer.style('line-height', (height-2)+'px');  // -2 to account for borders
        this._super(buffer);
    },

    insertSpace: function(event) {
        this.simulateClick();
        return true;
    },

    idle: Flame.State.extend({
        mouseEnter: function() {
            this.gotoState('hover');
            return true;
        },

        touchStart: function(event) {
            this.gotoState('mouseDownInside');
            return true;
        },

        simulateClick: function() {
            this.gotoState('hover');
            this.get('owner').simulateClick();
            Ember.run.later(this.get('owner'), 'mouseLeave', 150);
        }
    }),

    hover: Flame.State.extend({
        mouseLeave: function() {
            this.gotoState('idle');
            return true;
        },

        mouseDown: function() {
            if (!this.getPath('owner.isDisabled')) {
                this.gotoState('mouseDownInside');
            }
            return true;
        },

        simulateClick: function() {
            this.mouseDown();
            Ember.run.later(this.get('owner'), 'mouseUp', 100);
        },

        enterState: function() {
            this.get('owner').set('isHovered', true);
        },

        exitState: function() {
            var owner = this.get('owner');
            // Because the mouseLeave event is executed via Ember.run.later, it can happen that by the time we exitState
            // the owner has been destroyed
            if (!owner.isDestroyed) {
                owner.set('isHovered', false);
            }
        }
    }),

    mouseDownInside: Flame.State.extend({
        _handleClick: function() {
            var owner = this.get('owner');
            owner.fireAction();
            if (owner.get('isSticky')) {
                owner.set('isSelected', !owner.get('isSelected'));
            }
        },

        mouseUp: function() {
            this._handleClick();
            this.gotoState('hover');
            return true;
        },

        touchEnd: function(event) {
            this._handleClick();
            this.gotoState('idle');
            return true;
        },

        mouseLeave: function() {
            this.gotoState('mouseDownOutside');
            return true;
        },

        enterState: function() {
            this.get('owner').set('isActive', true);
        },

        exitState: function() {
            this.get('owner').set('isActive', false);
        }
    }),

    mouseDownOutside: Flame.State.extend({
        mouseUp: function() {
            this.gotoState('idle');
            return true;
        },

        mouseEnter: function() {
            this.gotoState('mouseDownInside');
            return true;
        }
    })
});
