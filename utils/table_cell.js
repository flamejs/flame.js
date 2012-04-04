Flame.TableCell = function(opts) {
    this.value = null;
    for (var key in opts) {
        if (opts.hasOwnProperty(key)) {
            this[key] = opts[key];
        }
    }
};

Flame.TableCell.prototype.formattedValue = function() {
    return this.value === null ? '' : this.value;
};

Flame.TableCell.prototype.editableValue = function() {
    throw 'Not implemented';
};

Flame.TableCell.prototype.validate = function(newValue) {
    return true;
};

Flame.TableCell.prototype.formatValueForBackend = function(value) {
    throw 'Not implemented';
};

Flame.TableCell.prototype.isEditable = function() {
    return false;
};

// Returns an array of CSS classes for this cell
Flame.TableCell.prototype.cssClasses = function() {
    return [];
};

Flame.TableCell.prototype.cssClassesString = function() {
    return "";
};
