Flame.computed = {
    equals: function(dependentKey, value) {
        return Ember.computed(dependentKey, function() {
            return value === Ember.getPath(this, dependentKey);
        }).cacheable();
    },

    notEquals: function(dependentKey, value) {
        return Ember.computed(dependentKey, function() {
            return value !== Ember.getPath(this, dependentKey);
        }).cacheable();
    },

    trueFalse: function(dependentKey, trueValue, falseValue) {
        return Ember.computed(dependentKey, function() {
            return Ember.getPath(this, dependentKey) ? trueValue : falseValue;
        }).cacheable();
    }
};

// XXX these are already in Ember master, include them here in case an older
// Ember version is used
Flame.computed.not = function(dependentKey) {
    return Ember.computed(dependentKey, function(key) {
        return !Ember.getPath(this, dependentKey);
    }).cacheable();
};

Flame.computed.empty = function(dependentKey) {
    return Ember.computed(dependentKey, function(key) {
        var val = Ember.getPath(this, dependentKey);
        return val === undefined || val === null || val === '' || (Ember.isArray(val) && Ember.get(val, 'length') === 0);
    }).cacheable();
};

Flame.computed.bool = function(dependentKey) {
    return Ember.computed(dependentKey, function(key) {
        return !!Ember.getPath(this, dependentKey);
    }).cacheable();
};

Flame.computed.or = function(dependentKey, otherKey) {
    return Ember.computed(dependentKey, otherKey, function(key) {
        return Ember.getPath(this, dependentKey) || Ember.getPath(this, otherKey);
    }).cacheable();
};
