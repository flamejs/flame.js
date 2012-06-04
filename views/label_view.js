Flame.LabelView = Flame.View.extend(Flame.ActionSupport, {
    layout: { left: 0, top: 0 },
    classNames: ['flame-label-view'],
    classNameBindings: ['textAlign', 'isSelectable', 'isDisabled'],
    defaultHeight: 22,
    defaultWidth: 200,
    isSelectable: false,
    isDisabled: false,

    handlebars: '{{value}}',

    render: function(buffer) {
        var height = this.getPath('layout.height');
        if (this.get('useAbsolutePosition') && !Ember.none(height)) buffer.style('line-height', height+'px');
        this._super(buffer);
    },

    mouseDown: function(evt) {
        return this.fireAction();
    },

    // We should never let mouseUp propagate. If we handled mouseDown, we will receive mouseUp and obviously
    // it shouldn't be propagated. If we didn't handle mouseDown (there was no action), it was propagated up
    // and the mouse responder logic will relay mouseUp directly to the view that handler mouseDown.
    mouseUp: function(evt) {
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
    },

    // Shortcut for creating label views using a binding
    binding: function(valueBinding, left, top, width, height) {
        return Flame.LabelView.extend({
            layout: { left: left, top: top, width: width, height: height },
            valueBinding: valueBinding
        });
    }
});
