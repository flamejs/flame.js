//= require ./list_item_view

Flame.LazyListViewStates = {};

Flame.LazyListViewStates.MouseIsDown = Flame.State.extend({
    xOffset: null,
    yOffset: null,

    exitState: function() { this.xOffset = this.yOffset = null; },

    mouseMove: function(event) {
        var owner = this.get('owner');
        var parentView = owner.get('parentView');
        if (!parentView.get('allowReordering') || parentView.disableReordering(event)) return true;
        // Only start dragging if we move more than 2 pixels vertically
        if (this.xOffset === null) { this.xOffset = event.pageX; this.yOffset = event.pageY; }
        if (Math.abs(event.pageY - this.yOffset) < 3) return true;

        var offset = owner.$().offset();
        this.setPath('owner.xOffset', this.xOffset - offset.left);
        this.setPath('owner.yOffset', this.yOffset - offset.top);
        this.gotoState('dragging');
        return true;
    },

    mouseUp: function() {
        var owner = this.get('owner');
        var parentView = owner.get('parentView');
        parentView.selectIndex(owner.get('contentIndex'));
        this.gotoState('idle');
        return true;
    }
});

Flame.LazyListItemView = Flame.ListItemView.extend(Flame.Statechart, {
    layout: { left: 0, right: 0, height: 25 },
    initialState: 'idle',

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

    idle: Flame.State.extend({
        mouseDown: function() {
            this.gotoState('mouseIsDown');
        }
    }),

    mouseIsDown: Flame.LazyListViewStates.MouseIsDown,

    dragging: Flame.State.extend({
        clone: null,
        indicator: null,
        scrollViewOffset: null, // Cache this for performance reasons

        enterState: function() {
            var owner = this.get('owner');
            var listView = owner.get('parentView');
            if (owner.willStartDragging) owner.willStartDragging();
            var listViewElement = listView.$();
            this.setPath('owner.isDragged', true);
            this.scrollViewOffset = listView.get('parentView').$().offset();
            this.clone = this.get('owner').$().safeClone();
            this.clone.addClass('dragged-clone');
            this.clone.draggingInfo = { currentIndex: this.getPath('owner.contentIndex') };
            this.indicator = jQuery('<div class="indicator"><img src="%@"></div>'.fmt(Flame.image('reorder_indicator.png'))).hide();
            listViewElement.append(this.clone);
            listViewElement.append(this.indicator);
        },

        exitState: function() {
            this.setPath('owner.isDragged', false);
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
            this.gotoState('idle');
            return true;
        },

        didDragItem: function(newTop, newLeft) {
            if (this.getPath('owner.parentView.constrainDragginToXAxis')) {
                this.clone.css({top: newTop});
            } else {
                this.clone.css({top: newTop, left: newLeft});
            }
            var itemHeight = this.getPath('owner.parentView.itemHeight');
            var index = Math.ceil(newTop / itemHeight);
            this.clone.draggingInfo = this.getPath('owner.parentView').indexForMovedItem(this.clone.draggingInfo, index, this.getPath('owner.contentIndex'));
            var height = this.clone.draggingInfo.currentIndex * itemHeight;
            this.indicator.css({top: height - 1 + 'px'});
            this.indicator.show();
        },

        finishDragging: function() {
            this.getPath('owner.parentView').moveItem(this.getPath('owner.contentIndex'), this.clone.draggingInfo);
        }
    })
});
