Flame.MenuScrollViewButton = Flame.View.extend({
    classNames: ['scroll-element'],
    classNameBindings: ['directionClass', 'isShown'],

    directionClass: function() {
        return 'scroll-%@'.fmt(this.get('direction'));
    }.property().volatile(),

    isShown: false,
    direction: 'down', // 'up' / 'down'
    useAbsolutePosition: true,

    mouseLeave: function() {
        if (this.get('isShown')) {
            this.get('parentView').stopScrolling();
            return true;
        }
        return false;
    },
    mouseEnter: function() {
        if (this.get('isShown')) {
            this.get('parentView').startScrolling(this.get('direction') === 'up' ? -1 : 1);
            return true;
        }
        return false;
    },

    // Eat the clicks and don't pass them to the elements beneath.
    mouseDown: function() { return true; },
    mouseUp: function() { return true; }
});

Flame.MenuScrollView = Flame.View.extend({
    classNames: ['menu-scroll-view'],
    needScrolling: false,
    scrollDirection: 0,
    scrollPosition: 'top', // 'top', 'middle', 'bottom'

    childViews: ['upArrow', 'viewPort', 'downArrow'],
    scrollSize: 10, // How many pixels to scroll per scroll

    viewPort: Flame.View.extend({
        classNames: ['scroll-view-viewport']
    }),

    upArrow: Flame.MenuScrollViewButton.extend({direction: 'up', layout: { height: 20, top: 0, width: '100%' }}),
    downArrow: Flame.MenuScrollViewButton.extend({direction: 'down', layout: { height: 20, bottom: 0, width: '100%' }}),

    willDestroyElement: function() {
        this._super();
        this.stopScrolling();
    },

    setScrolledView: function(newContent) {
        this.get('viewPort').replace(0, 1, [newContent]);
    },

    scrollPositionDidChange: function() {
        var upArrow = this.get('upArrow');
        var downArrow = this.get('downArrow');
        var scrollPosition = this.get('scrollPosition');
        upArrow.set('isShown', this.get('needScrolling') && scrollPosition !== 'top');
        downArrow.set('isShown', this.get('needScrolling') && scrollPosition !== 'bottom');
    }.observes('scrollPosition', 'needScrolling'),

    startScrolling: function(scrollDirection) {
        this.set('scrollDirection', scrollDirection);
        this.scroll();
    },

    stopScrolling: function() {
        this.set('scrollDirection', 0);
        if (this._timer) {
            Ember.run.cancel(this._timer);
        }
    },

    _recalculateSizes: function() {
        var height = this.get('parentView.layout.height');
        if (height > 0) {
            var paddingAndBorders = 5 + 5 + 1 + 1;  // XXX obtain paddings & borders from MenuView?
            this.set('layout', { height: height - paddingAndBorders, width: '100%' });
            var viewPort = this.get('viewPort');
            if (viewPort) {
                viewPort.set('layout', {
                    height: height - paddingAndBorders,
                    top: 0,
                    width: '100%'
                });
            }
        }
    }.observes('parentView.layout', 'needScrolling'),

    _scrollTo: function(position, scrollTime) {
        var viewPort = this.get('viewPort').$();
        viewPort.scrollTop(position);
    },

    scroll: function() {
        var scrollDirection = this.get('scrollDirection');
        var scrollTime = 20;
        var scrollSize = this.get('scrollSize');
        var viewPort = this.get('viewPort').$();
        var oldTop = viewPort.scrollTop();
        var viewPortHeight = viewPort.height();
        var continueScrolling = true;
        var scrollPosition = this.get('scrollPosition');

        var delta = scrollSize;
        if (scrollDirection === -1) {
            if (delta > oldTop) {
                delta = oldTop;
                continueScrolling = false;
            }
        } else if (scrollDirection === 1) {
            var listHeight = this.get('viewPort.firstObject').$().outerHeight();
            var shownBottom = oldTop + viewPortHeight;
            if (shownBottom + delta >= listHeight) {
                delta = listHeight - shownBottom;
                continueScrolling = false;
            }
        }
        delta *= scrollDirection;
        this._scrollTo(oldTop + delta, 0.9 * scrollTime * Math.abs(delta / scrollSize));

        if (!continueScrolling) {
            if (scrollDirection === 1) {
                scrollPosition = 'bottom';
            } else if (scrollDirection === -1) {
                scrollPosition = 'top';
            }
            this.stopScrolling();
        } else {
            this._timer = Ember.run.later(this, this.scroll, scrollTime);
            scrollPosition = 'middle';
        }
        this.set('scrollPosition', scrollPosition);
    }
});
