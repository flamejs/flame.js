Flame.SplitView = Flame.View.extend({
    allowResizing: true,
    dividerThickness: 7,

    dividerView: Flame.View.extend(Flame.Statechart, {
        classNames: 'flame-split-view-divider'.w(),
        initialState: 'idle',

        idle: Flame.State.extend({
            mouseDown: function(event) {
                var parentView = this.get('owner.parentView');
                if (!parentView.get('allowResizing')) return false;
                parentView.startResize(event);
                this.gotoState('resizing');
                return true;
            },

            doubleClick: function(event) {
                var parentView = this.get('owner.parentView');
                if (!parentView.get('allowResizing')) return false;
                parentView.toggleCollapse(event);
                return true;
            }
        }),

        resizing: Flame.State.extend({
            mouseMove: function(event) {
                this.get('owner.parentView').resize(event);
                return true;
            },

            mouseUp: Flame.State.gotoHandler('idle')
        })
    })
});
