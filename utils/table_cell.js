export default function TableCell(opts) {
    this.value = null;
    for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }
};

TableCell.prototype.content = function() {
    return this.formattedValue();
};

TableCell.prototype.showEditor = function() {
    return false;
};

TableCell.prototype.showReadOnlyEditor = function() {
    return false;
};

TableCell.prototype.formattedValue = function() {
    return this.value === null ? '' : this.value;
};

TableCell.prototype.editableValue = function() {
    throw new Error('Not implemented');
};

TableCell.prototype.validate = function(newValue) {
    return true;
};

TableCell.prototype.formatValueForBackend = function(value) {
    throw new Error('Not implemented');
};

TableCell.prototype.isEditable = function() {
    return false;
};

TableCell.prototype.isCopyable = function() {
    return true;
};

TableCell.prototype.isPastable = function() {
    return true;
};

// Returns an array of CSS classes for this cell
TableCell.prototype.cssClasses = function() {
    return [];
};

TableCell.prototype.cssClassesString = function() {
    return this.cssClasses().join(' ');
};
