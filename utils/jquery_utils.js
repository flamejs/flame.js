jQuery.fn.selectRange = function(start, end) {
    return this.each(function() {
        if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(start, end);
        } else if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveEnd('character', end);
            range.moveStart('character', start);
            range.select();
        }
    });
};

jQuery.fn.replaceClasses = function(newClasses) {
    this.removeAttr('class');
    if (newClasses) {
        this.attr('class', newClasses);
    }
    return this;
};

