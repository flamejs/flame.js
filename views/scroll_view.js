/**
  Flame.ScrollView provides a scrollable container. In the DOM this is just a div
  with `overflow: auto`.

  When the ScrollView is scrolled, it will notify each child view that implements
 `didScroll`, passing in the height of the ScrollView and the total amount scrolled.

  TODO * when a child view falls completely outside of the visible area, display should
         be set to `none` so that the browser does not need to render views that are not
         visible.
       * the ScrollView should fire an update when the ScrollView is resized (either
         due to the window being resized, or due to a HorizontalSplitView).
*/
Flame.ScrollView = Flame.View.extend({
    classNames: 'scroll-view'.w(),
    /** Last known vertical scroll offset */
    lastScrollY: 0,
    /** Is the ScrollView currently being scrolled? */
    isScrolling: false,

    didInsertElement: function() {
        this._super();
        this.$().scroll(jQuery.proxy(this.didScroll, this));
        this._update();
    },

    didScroll: function(event) {
        this.set('lastScrollY', this.get('element').scrollTop);
        if (!this.get('isScrolling')) {
            requestAnimationFrame(jQuery.proxy(this._update, this));
        }
        this.set('isScrolling', true);
    },

    _update: function() {
        var height = this.get('element').offsetHeight;
        var scrollTop = this.get('lastScrollY');
        this.set('isScrolling', false);
        // Notify childViews the scrollview has scrolled
        this.forEachChildView(function(view) {
            if (view.didScroll) view.didScroll(height, scrollTop);
        });
    }
});
