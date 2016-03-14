/**
  Layout managers are helpers that you can delegate setting the layout properties to when you get
  tired of doing it manually. They can also update the layout on the fly by reacting to changes
  in the layout of child views.
*/
export default Ember.Object.extend({
    setupLayout: undefined,

    getAffectedChildViews: function(view) {
        return view.toArray().filter(function(childView) {
            return childView.get('ignoreLayoutManager') !== true &&
                (childView.get('isVisible') || childView.get('isVisible') === null) && // isVisible is initially null
                childView.get('layout');
        });
    }
});
