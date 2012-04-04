Flame.ListItemView = Flame.View.extend({
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
    }
});
