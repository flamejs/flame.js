import View from '../view';

export default View.extend({
    useAbsolutePosition: false,
    classNames: ['flame-list-item-view'],
    classNameBindings: ['isSelected', 'parentView.allowReordering', 'isDragged'],
    isSelected: false,
    _parentViewOnMouseDown: undefined,
    displayProperties: ['content'],
    acceptsKeyResponder: false,
    childListView: null,

    mouseMove: function(evt) {
        if (this._parentViewOnMouseDown !== undefined) {
            return this._parentViewOnMouseDown.mouseMove(evt);
        } else {
            return false;
        }
    },

    mouseDown: function(evt) {
        // As a result of a drag operation, this view might get detached from the parent, but we still need to
        // relay the mouseUp event to that parent, so store it here into _parentViewOnMouseDown.
        this._parentViewOnMouseDown = this.get('parentView');
        return this._parentViewOnMouseDown.mouseDownOnItem(this.get('contentIndex'), evt);
    },

    mouseUp: function(evt) {
        if (this._parentViewOnMouseDown !== undefined) {
            var parentView = this._parentViewOnMouseDown;
            this._parentViewOnMouseDown = undefined;
            return parentView.mouseUpOnItem(evt);
        } else {
            return false;
        }
    },

    // We don't have the normalize function available, so we'll pass
    // these events to the relevant parent view handlers.
    touchMove: function(evt) {
        if (this._parentViewOnMouseDown !== undefined) {
            return this._parentViewOnMouseDown.touchMove(evt);
        } else {
            return false;
        }
    },

    touchStart: function(evt) {
        // The same caveats apply as in mouseDown: store the parentView and hand the event up to it
        this._parentViewOnMouseDown = this.get('parentView');
        return this._parentViewOnMouseDown.mouseDownOnItem(this.get('contentIndex'), evt);
    },

    touchEnd: function(evt) {
        if (this._parentViewOnMouseDown !== undefined) {
            var parentView = this._parentViewOnMouseDown;
            this._parentViewOnMouseDown = undefined;
            return parentView.mouseUpOnItem(evt);
        } else {
            return false;
        }
    }
});
