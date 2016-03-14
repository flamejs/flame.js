import Statechart, { State } from '../statechart';

export default Ember.Mixin.create(Statechart, {
    classNames: ['flame-split-view-divider'],
    initialFlameState: 'idle',

    idle: State.extend({
        mouseDown: function(event) {
            var parentView = this.get('owner.parentView');
            if (!parentView.get('allowResizing')) return false;
            parentView.startResize(event, this);
            this.gotoFlameState('resizing');
            return true;
        },

        touchStart: function(event) {
            // Normalize the event and send it to mouseDown
            this.mouseDown(this.normalizeTouchEvents(event));
            return true;
        },

        doubleClick: function(event) {
            var parentView = this.get('owner.parentView');
            if (!parentView.get('allowResizing')) return false;
            parentView.toggleCollapse(event);
            return true;
        }
    }),

    resizing: State.extend({
        mouseMove: function(event) {
            this.get('owner.parentView').resize(event);
            return true;
        },

        touchMove: function(event) {
            // Don't scroll the page while we're doing this
            event.preventDefault();
            // Normalize the event and send it to mouseDown
            this.mouseMove(this.normalizeTouchEvents(event));
            return true;
        },

        mouseUp: State.gotoFlameState('idle'),
        touchEnd: State.gotoFlameState('idle'),

        exitState: function() {
            var parentView = this.get('owner.parentView');
            if (parentView.endResize) {
                parentView.endResize();
            }
        }
    })
});
