if (String.prototype.trim === undefined) {
    String.prototype.trim = function() {
        return jQuery.trim(this);
    };
}

Ember.mixin(String.prototype, {
    truncate: function(maxLength) {
        var length = Ember.isNone(maxLength) ? 30 : maxLength;
        if (this.length <= length) {
            return this.toString();
        } else {
            return this.substr(0, length) + '...';
        }
    },

    isBlank: function() {
        return this.trim().length === 0;
    }
});
