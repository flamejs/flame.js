import "../stylesheets/views/label_view.scss";

import View from '../view';
import ActionSupport from '../mixins/action_support';

export const ALIGN_LEFT = 'align-left';
export const ALIGN_RIGHT = 'align-right';
export const ALIGN_CENTER = 'align-center';

const LabelView = View.extend(ActionSupport, {
    layout: { left: 0, top: 0 },
    classNames: ['flame-label-view'],
    classNameBindings: ['textAlign', 'isSelectable', 'isDisabled'],
    defaultHeight: 22,
    defaultWidth: 200,
    isSelectable: false,
    isDisabled: false,
    allowWrapping: false,
    textOverflow: null,
    whiteSpace: null,

    handlebars: '{{view.value}}',

    beforeRender: function(buffer) {
        var height = this.get('layout.height');
        if (this.get('useAbsolutePosition') &&
                !Ember.isNone(height) &&
                !this.get('allowWrapping')) {
            buffer.style('line-height', height + 'px');
        }
        if (this.get('textOverflow')) buffer.style('text-overflow', this.get('textOverflow'));
        if (this.get('whiteSpace')) buffer.style('white-space', this.get('whiteSpace'));
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

LabelView.reopenClass({
    // Shortcut for creating label views with a static label
    label: function(value, left, top, width, height) {
        return LabelView.extend({
            layout: { left: left, top: top, width: width, height: height },
            value: value
        });
    }
});

export default LabelView;
