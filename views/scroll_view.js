import View from '../view';

import '../stylesheets/views/scroll_view.css.scss';

/**
  ScrollView provides a scrollable container. In the DOM this is just a div
  with `overflow: auto`.

  When the ScrollView is scrolled, it will notify each child view that implements
 `didScroll`, passing in the height of the ScrollView and the total amount scrolled.

  TODO * when a child view falls completely outside of the visible area, display should
         be set to `none` so that the browser does not need to render views that are not
         visible.
       * the ScrollView should fire an update when the ScrollView is resized (either
         due to the window being resized, or due to a HorizontalSplitView).
*/
export default View.extend({
    classNames: ['scroll-view'],
    /** Last known vertical scroll offset */
    lastScrollY: 0,
    /** Is the ScrollView currently being scrolled? */
    isScrolling: false,

    didInsertElement: function() {
        this.$().on('scroll', this.didScroll.bind(this));
        this._update();
    },

    willDestroyElement: function() {
        this.$().off('scroll');
    },

    didScroll: function(event) {
        this.lastScrollY = this.get('element').scrollTop;
        if (!this.isScrolling) {
            requestAnimationFrame(this._update.bind(this));
        }
        this.isScrolling = true;
    },

    _update: function() {
        var height = this.get('element').offsetHeight;
        var scrollTop = this.lastScrollY;
        this.isScrolling = false;
        // Notify childViews the scrollview has scrolled
        var i, childViews = this._childViews, len = childViews.length;
        for (i = 0; i < len; i++) {
            var view = childViews[i];
            if (view.didScroll) view.didScroll(height, scrollTop);
        }
    }
});
