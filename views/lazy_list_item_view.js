import ListItemView from './list_item_view';
import Statechart, { State } from '../statechart';
import { image } from '../utils/images';

import '../utils/jquery_util';

export const MouseIsDownState = State.extend({
    xOffset: null,
    yOffset: null,

    exitState: function() { this.xOffset = this.yOffset = null; },

    mouseMove: function(event) {
        var owner = this.get('owner');
        var parentView = owner.get('parentView');
        if (!parentView.get('allowReordering') || parentView.disableReordering(event)) return true;
        if (this.xOffset === null) {
            this.xOffset = event.pageX;
            this.yOffset = event.pageY;
        }
        // Only start dragging if we move more than 2 pixels vertically
        if (Math.abs(event.pageY - this.yOffset) < 3) return true;

        var offset = owner.$().offset();
        this.set('owner.xOffset', this.xOffset - offset.left);
        this.set('owner.yOffset', this.yOffset - offset.top);
        this.gotoFlameState('dragging');
        return true;
    },

    mouseUp: function() {
        var owner = this.get('owner');
        var parentView = owner.get('parentView');
        parentView.selectIndex(owner.get('contentIndex'));
        this.gotoFlameState('idle');
        return true;
    }
});

export default ListItemView.extend(Statechart, {
    layout: { left: 0, right: 0, height: 25 },
    flameStates: ['idle', 'mouseIsDown', 'dragging'],
    initialFlameState: 'idle',

    init: function() {
        // Don't rerender the item view when the content changes
        this.set('displayProperties', []);
        this._super();
    },

    mouseDown: function(event) {
        this.invokeStateMethod('mouseDown', event);
        return true;
    },

    mouseMove: function(event) {
        this.invokeStateMethod('mouseMove', event);
        return true;
    },

    mouseUp: function(event) {
        this.invokeStateMethod('mouseUp', event);
        return true;
    },

    idle: State.extend({
        mouseDown: function() {
            this.gotoFlameState('mouseIsDown');
        }
    }),

    mouseIsDown: MouseIsDownState,

    dragging: State.extend({
        clone: null,
        indicator: null,
        scrollViewOffset: null, // Cache this for performance reasons

        enterState: function() {
            var owner = this.get('owner');
            var listView = owner.get('parentView');
            if (owner.willStartDragging) owner.willStartDragging();
            var $listView = listView.$();
            this.set('owner.isDragged', true);
            this.scrollViewOffset = listView.get('parentView').$().offset();
            this.clone = this.$().safeClone();
            this.clone.addClass('dragged-clone');
            this.clone.draggingInfo = { currentIndex: this.get('owner.contentIndex') };
            this.indicator = jQuery('<div class="indicator"><img src="%@"></div>'.fmt(image('reorder_indicator.svg'))).hide();
            $listView.append(this.clone);
            $listView.append(this.indicator);
        },

        exitState: function() {
            this.set('owner.isDragged', false);
            this.finishDragging();
            this.clone.remove();
            this.clone = null;
            this.indicator.remove();
            this.indicator = null;
        },

        mouseMove: function(event) {
            var owner = this.get('owner');
            var listView = owner.get('parentView');
            this.listViewPosition = listView.$().position();
            var scrollView = listView.get('parentView');
            var newTop = event.pageY - owner.get('yOffset') + scrollView.lastScrollY - (scrollView.lastScrollY + this.listViewPosition.top) - this.scrollViewOffset.top;
            var newLeft = event.pageX - this.scrollViewOffset.left - owner.get('xOffset');
            this.didDragItem(newTop, newLeft);
            return true;
        },

        mouseUp: function() {
            this.gotoFlameState('idle');
            return true;
        },

        didDragItem: function(newTop, newLeft) {
            if (this.get('owner.parentView.constrainDragginToXAxis')) {
                this.clone.css({transform: 'translateY(%@px)'.fmt(newTop)});
            } else {
                this.clone.css({transform: 'translate(%@px, %@px)'.fmt(newLeft, newTop)});
            }
            var itemHeight = this.get('owner.parentView.itemHeight');
            var index = Math.ceil(newTop / itemHeight);
            this.clone.draggingInfo = this.get('owner.parentView').indexForMovedItem(this.clone.draggingInfo, index, this.get('owner.contentIndex'), newLeft);
            var height = this.clone.draggingInfo.currentIndex * itemHeight;
            this.indicator.css({ top: height - 1 + 'px', 'margin-left': this.clone.draggingInfo.level * 20 + 7 + 'px' });
            this.indicator.show();
        },

        finishDragging: function() {
            // If user drags the items really quick, sometimes the draggingInfo still contains
            // what enterState has set. This means that draggingInfo lacks some info like toPosition
            // which then makes the items go in wrong places.
            if (this.clone.draggingInfo && !this.clone.draggingInfo.hasOwnProperty("toPosition")) return;
            this.get('owner.parentView').moveItem(this.get('owner.contentIndex'), this.clone.draggingInfo);
        }
    })
});
