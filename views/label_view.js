Flame.LabelView = Flame.View.extend(Flame.ActionSupport, {
    layout: { left: 0, top: 0 },
    classNames: ['flame-label-view'],
    classNameBindings: ['textAlign', 'isSelectable', 'isDisabled'],
    defaultHeight: 22,
    defaultWidth: 200,
    isSelectable: false,
    isDisabled: false,
    allowWrapping: false,

    handlebars: '{{view.value}}',

    beforeRender: function(buffer) {
        var height = this.get('layout.height');
        if (this.get('useAbsolutePosition') &&
            !Ember.isNone(height) &&
            !this.get('allowWrapping')) {
            buffer.style('line-height', height + 'px');
        }
        this._super(buffer);
    },

    mouseDown: function(event) {
        return this.fireAction();
    },

    // We should never let mouseUp propagate. If we handled mouseDown, we will receive mouseUp and obviously
    // it shouldn't be propagated. If we didn't handle mouseDown (there was no action), it was propagated up
    // and the mouse responder logic will relay mouseUp directly to the view that handler mouseDown.
    mouseUp: function(event) {
        return true;
    },

    // Apply the same logic to touchStart and touchEnd
    touchStart: function(event) {
        return this.fireAction();
    },
    touchEnd: function(event) {
        return true;
    }
});

Flame.LabelView.reopenClass({
    // Shortcut for creating label views with a static label
    label: function(value, left, top, width, height) {
        return Flame.LabelView.extend({
            layout: { left: left, top: top, width: width, height: height },
            value: value
        });
    }
});
