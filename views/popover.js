import Panel, {
    POSITION_ABOVE,
    POSITION_BELOW,
    POSITION_RIGHT,
    POSITION_LEFT,
    POSITION_MIDDLE
} from './panel';

import arrowUp from 'lib/flame/images/arrow_up.png';
import arrowLeft from 'lib/flame/images/arrow_left.png';
import arrowDown from 'lib/flame/images/arrow_down.png';
import arrowRight from 'lib/flame/images/arrow_right.png';

import '../stylesheets/views/popover.css.scss';

/**
  Popover provides a means to display a popup in the context of an existing element in the UI.
*/
export default Panel.extend({
    classNames: ['flame-popover'],
    childViews: [],
    dimBackground: false,
    handlebars: '<img {{bind-attr class="view.arrowPosition :arrow"}} {{bind-attr src="view.image"}}>{{view view.contentView}}',
    anchor: null,
    position: null,

    ARROW_UP: arrowUp,
    ARROW_DOWN: arrowDown,
    ARROW_LEFT: arrowLeft,
    ARROW_RIGHT: arrowRight,

    _positionArrow: function() {
        var anchor = this.get('anchor');
        var position = this.get('position');
        var arrow = this.$('img.arrow');
        var offset = anchor.offset();
        var arrowOffset;

        var dimensions = this._getDimensionsForAnchorElement(anchor);

        if (position & (POSITION_ABOVE | POSITION_BELOW)) {
            arrowOffset = offset.left + (dimensions.width / 2) - (!this.$().css('left') ? 0 : parseInt(this.$().css('left').replace('px', ''), 10)) - 15;
            arrow.css({ left: arrowOffset + 'px' });
            if (position & POSITION_ABOVE) {
                arrow.css({ top: this.get('layout.height') - 1 + 'px' });
            }
        } else {
            arrowOffset = offset.top + (dimensions.height / 2) - parseInt(this.$().css('top').replace('px', ''), 10) - 15;
            arrow.css({ top: arrowOffset + 'px' });
            if (position & POSITION_LEFT) {
                arrow.css({ left: this.get('layout.width') - 1 + 'px' });
            }
        }
    }.on('didInsertElement'),

    _layoutRelativeTo: function(anchor, position) {
        anchor = anchor instanceof jQuery ? anchor : anchor.$();
        this.set('anchor', anchor);
        this.set('position', position);

        var layout = this._super(anchor, position);
        if (layout.movedX || layout.movedY) {
            // If the popover did not fit the viewport on one side, try to position it on the other side
            if (layout.movedX && position & (POSITION_LEFT | POSITION_RIGHT)) position ^= POSITION_LEFT | POSITION_RIGHT;
            if (layout.movedY && position & (POSITION_ABOVE | POSITION_BELOW)) position ^= POSITION_ABOVE | POSITION_BELOW;
            layout = this._super(anchor, position);
            this.set('position', position);
        }

        if (position & POSITION_ABOVE) {
            layout.top -= 15;
            this.set('arrowPosition', 'above');
            this.set('image', this.ARROW_DOWN);
        } else if (position & POSITION_BELOW) {
            layout.top += 15;
            this.set('arrowPosition', 'below');
            this.set('image', this.ARROW_UP);
        } else if (position & POSITION_LEFT) {
            layout.left -= 15;
            this.set('arrowPosition', 'left');
            this.set('image', this.ARROW_RIGHT);
        } else if (position & POSITION_RIGHT) {
            layout.left += 15;
            this.set('arrowPosition', 'right');
            this.set('image', this.ARROW_LEFT);
        }
        return layout;
    },

    popup: function(anchor, position) {
        Ember.assert('Flame.Popover.popup requires an anchor', !!anchor);
        Ember.assert('Flame.Popover.popup requires a position', !!position);
        this._super(anchor, position | POSITION_MIDDLE);
    }
});
