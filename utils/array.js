Ember.mixin(Array.prototype, {
    sum: function() {
        return this.reduce(function(sum, x) { return sum+x; }, 0);
    },

    isEqual: function(ary) {
        if (!ary) return false ;
        if (ary == this) return true;

        var loc = ary.get('length') ;
        if (loc != this.get('length')) return false ;

        while(--loc >= 0) {
            if (!Ember.isEqual(ary.objectAt(loc), this.objectAt(loc))) return false ;
        }
        return true ;
    },

    max: function() {
        return Math.max.apply(Math, this);
    },

    min: function() {
        return Math.min.apply(Math, this);
    },

    flatten: function() {
        return this.reduce(function(a, b) { return a.concat(b); }, []);
    }
});
