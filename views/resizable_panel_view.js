// This extends the panel view, which is movable by dragging the title bar, to
// also be resizable by dragging the bottom-right corner.

Flame.ResizablePanel = Flame.Panel.extend({
  // Set isResizable to true to make panel resizable
  isResizable: false,
  // Overrides original Panel childViews to add a third, the resizeView in
  // the lower right-hand corner of the panel.
  childViews: ['titleView', 'contentView', 'resizeView'],
  // Clicking inside this view allows the user to drag the lower-right corner 
  // of the panel.
  resizeView: Flame.View.extend(Flame.Statechart, {
    layout: { bottom: 0, right: 0, height: 16, width: 16 },
    classNames: ['flame-resize-thumb'],
    isVisibleBinding: Ember.Binding.from('parentView.isResizable'),
    initialState: 'idle',

    idle: Flame.State.extend({
      mouseDown: function(event) {
        var owner = this.get('owner');
        var panelElement = owner.get('parentView').$();
        if (!owner.getPath('parentView.isResizable')) {
          return true;
        }
        owner._pageX = event.pageX;
        owner._pageY = event.pageY;
        owner._startW = panelElement.outerWidth();
        owner._startH = panelElement.outerHeight();
        this.gotoState('resizing');
        return true;
      }
    }),
    resizing: Flame.State.extend({
      mouseMove: function(event) {
        var owner = this.get('owner');
        var newW = owner._startW + (event.pageX - owner._pageX);
        var newH = owner._startH + (event.pageY - owner._pageY);
        newW = Math.max(100, newW);  // Minimum panel width
        newH = Math.max(52, newH);  // Minimum panel height: title bar plus this "thumb"
        owner.get('parentView').$().css({width: newW, height: newH });
        return true;
      },
      mouseUp: Flame.State.gotoHandler('idle')
    })
  })
});