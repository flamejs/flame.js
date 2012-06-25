/**
  Flame.Popover provides a means to display a popup in the context of an existing element in the UI.
*/
Flame.Popover = Flame.Panel.extend({
    classNames: ['flame-popover'],
    childViews: [],
    dimBackground: false,
    arrow: 'arrow', // How to use a string literal in bindAttr?
    handlebars: '<img {{bindAttr class="arrowPosition arrow"}} {{bindAttr src="image"}} />{{view contentView}}',
    anchor: null,
    position: null,

    _positionArrow: function() {
        var anchor = this.get('anchor');
        var position = this.get('position');
        var arrow = this.$('img.arrow');
        var offset = anchor.offset();
        var arrowOffset;
        if (position & (Flame.POSITION_ABOVE | Flame.POSITION_BELOW)) {
            arrowOffset = offset.left + (anchor.outerWidth() / 2) - parseInt(this.$().css('left').replace('px', ''), 10) - 15;
            arrow.css({ left: arrowOffset + 'px' });
        } else {
            arrowOffset = offset.top + (anchor.outerHeight() / 2) - parseInt(this.$().css('top').replace('px', ''), 10) - 15;
            arrow.css({ top: arrowOffset + 'px' });
            if (position & Flame.POSITION_LEFT) {
                arrow.css({ left: this.getPath('layout.width') - 1 + 'px' });
            }
        }
    },

    _layoutRelativeTo: function(anchor, position) {
        anchor = anchor instanceof jQuery ? anchor : anchor.$();
        this.set('anchor', anchor);
        this.set('position', position);

        var layout = this._super(anchor, position);
        if (layout.moved) {
            // If the popover did not fit the viewport on one side, try to position it on the other side
            position ^= Flame.POSITION_LEFT | Flame.POSITION_RIGHT;
            layout = this._super(anchor, position);
            this.set('position', position);
        }

        if (position & Flame.POSITION_ABOVE) {
            layout.top -= 15;
            this.set('arrowPosition', 'above');
            this.set('image', Flame.image('arrow_down.png'));
        } else if (position & Flame.POSITION_BELOW) {
            layout.top += 15;
            this.set('arrowPosition', 'below');
            this.set('image', Flame.image('arrow_up.png'));
        } else if (position & Flame.POSITION_LEFT) {
            layout.left -= 15;
            this.set('arrowPosition', 'left');
            this.set('image', Flame.image('arrow_right.png'));
        } else if (position & Flame.POSITION_RIGHT) {
            layout.left += 15;
            this.set('arrowPosition', 'right');
            this.set('image', Flame.image('arrow_left.png'));
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
