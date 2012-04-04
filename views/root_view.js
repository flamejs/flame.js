
/* 
   Use this view at the top of the view hierarchy, either directly or as a superclass.
   The rootView property is needed for being able to set up the prefixed bindings, see
   Flame._bindPrefixedBindings for more info.
*/
Flame.RootView = Flame.View.extend({
    rootView: true
});
