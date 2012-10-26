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

/** Clone an element, removing metamorph binding tags and ember metadata */
jQuery.fn.safeClone = function() {
    var clone = jQuery(this).clone();
    // Remove content bindings
    clone.find('script[id^=metamorph]').remove();

    // Remove attr bindings
    clone.find('*').each(function() {
        var $this = jQuery(this);
        var i, attribute;
        var length = $this[0].attributes.length;
        for (i = 0; i < length; i++) {
            attribute = $this[0].attributes[i];
            if (attribute && attribute.name.match(/^data-(bindattr|ember)/)) {
                $this.removeAttr(attr.name);
            }
        }
    });

    // Remove ember ids
    clone.find('[id^=ember]').removeAttr('id');

    return clone;
};
