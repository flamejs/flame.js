/**
  Flame.Popover provides a means to display a popup in the context of an existing element in the UI.
*/
Flame.Popover = Flame.Panel.extend({
    classNames: ['flame-popover'],
    childViews: [],
    dimBackground: false,
    arrow: 'arrow', // How to use a string literal in bind-attr?
    handlebars: '<img {{bind-attr class="view.arrowPosition view.arrow"}} {{bind-attr src="view.image"}} />{{view view.contentView}}',
    anchor: null,
    position: null,

    ARROW_UP: Flame.image('arrow_up.png'),
    ARROW_DOWN: Flame.image('arrow_down.png'),
    ARROW_LEFT: Flame.image('arrow_left.png'),
    ARROW_RIGHT: Flame.image('arrow_right.png'),

    _positionArrow: function() {
        var anchor = this.get('anchor');
        var position = this.get('position');
        var arrow = this.$('img.arrow');
        var offset = anchor.offset();
        var arrowOffset;
        if (position & (Flame.POSITION_ABOVE | Flame.POSITION_BELOW)) {
            arrowOffset = offset.left + (anchor.outerWidth() / 2) - (!this.$().css('left') ? 0 : parseInt(this.$().css('left').replace('px', ''), 10)) - 15;
            arrow.css({ left: arrowOffset + 'px' });
            if (position & Flame.POSITION_ABOVE) {
                arrow.css({ top: this.get('layout.height') - 1 + 'px' });
            }
        } else {
            arrowOffset = offset.top + (anchor.outerHeight() / 2) - parseInt(this.$().css('top').replace('px', ''), 10) - 15;
            arrow.css({ top: arrowOffset + 'px' });
            if (position & Flame.POSITION_LEFT) {
                arrow.css({ left: this.get('layout.width') - 1 + 'px' });
            }
        }
    },

    _layoutRelativeTo: function(anchor, position) {
        anchor = anchor instanceof jQuery ? anchor : anchor.$();
        this.set('anchor', anchor);
        this.set('position', position);

        var layout = this._super(anchor, position);
        if (layout.movedX || layout.movedY) {
            // If the popover did not fit the viewport on one side, try to position it on the other side
            if (layout.movedX && position & (Flame.POSITION_LEFT | Flame.POSITION_RIGHT)) position ^= Flame.POSITION_LEFT | Flame.POSITION_RIGHT;
            if (layout.movedY && position & (Flame.POSITION_ABOVE | Flame.POSITION_BELOW)) position ^= Flame.POSITION_ABOVE | Flame.POSITION_BELOW;
            layout = this._super(anchor, position);
            this.set('position', position);
        }

        if (position & Flame.POSITION_ABOVE) {
            layout.top -= 15;
            this.set('arrowPosition', 'above');
            this.set('image', this.ARROW_DOWN);
        } else if (position & Flame.POSITION_BELOW) {
            layout.top += 15;
            this.set('arrowPosition', 'below');
            this.set('image', this.ARROW_UP);
        } else if (position & Flame.POSITION_LEFT) {
            layout.left -= 15;
            this.set('arrowPosition', 'left');
            this.set('image', this.ARROW_RIGHT);
        } else if (position & Flame.POSITION_RIGHT) {
            layout.left += 15;
            this.set('arrowPosition', 'right');
            this.set('image', this.ARROW_LEFT);
        }
        return layout;
    },

    didInsertElement: function() {
        this._positionArrow();
    },

    popup: function(anchor, position) {
        Ember.assert('Flame.Popover.popup requires an anchor', !!anchor);
        Ember.assert('Flame.Popover.popup requires a position', !!position);
        this._super(anchor, position | Flame.POSITION_MIDDLE);
    }
});
