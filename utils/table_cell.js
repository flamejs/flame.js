Flame.TableCell = function TableCell(opts) {
    this.value = null;
    for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }
};

Flame.TableCell.prototype.content = function() {
    return this.formattedValue();
};

Flame.TableCell.prototype.formattedValue = function() {
    return this.value === null ? '' : this.value;
};

Flame.TableCell.prototype.editableValue = function() {
    throw new Error('Not implemented');
};

Flame.TableCell.prototype.validate = function(newValue) {
    return true;
};

Flame.TableCell.prototype.formatValueForBackend = function(value) {
    throw new Error('Not implemented');
};

Flame.TableCell.prototype.isEditable = function() {
    return false;
};

Flame.TableCell.prototype.isCopyable = function() {
    return true;
};

Flame.TableCell.prototype.isPastable = function() {
    return true;
};

// Returns an array of CSS classes for this cell
Flame.TableCell.prototype.cssClasses = function() {
    return [];
};

Flame.TableCell.prototype.cssClassesString = function() {
    return this.cssClasses().join(' ');
};
