Ember.mixin(String.prototype, {
    truncate: function(maxLength) {
        var length = Ember.none(maxLength) ? 30 : maxLength;
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

