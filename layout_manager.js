//= require_self
//= require_tree ./layout_managers

/*
  Layout managers are helpers that you can delegate setting the layout properties to when you get
  tired of doing it manually. They can also update the layout on the fly by reacting to changes
  in the layout of child views.
*/
Flame.LayoutManager = Ember.Object.extend({
    setupLayout: undefined
});
