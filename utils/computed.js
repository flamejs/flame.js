Flame.computed = {
    equals: function(dependentKey, value) {
        return Ember.computed(dependentKey, function() {
            return value === Ember.get(this, dependentKey);
        }).cacheable();
    },

    notEquals: function(dependentKey, value) {
        return Ember.computed(dependentKey, function() {
            return value !== Ember.get(this, dependentKey);
        }).cacheable();
    },

    trueFalse: function(dependentKey, trueValue, falseValue) {
        return Ember.computed(dependentKey, function() {
            return Ember.get(this, dependentKey) ? trueValue : falseValue;
        }).cacheable();
    }
};

// XXX these are already in Ember master, include them here in case an older
// Ember version is used
Flame.computed.not = function(dependentKey) {
    return Ember.computed(dependentKey, function(key) {
        return !Ember.get(this, dependentKey);
    }).cacheable();
};

Flame.computed.empty = function(dependentKey) {
    return Ember.computed(dependentKey, function(key) {
        var val = Ember.get(this, dependentKey);
        return val === undefined || val === null || val === '' || (Ember.isArray(val) && Ember.get(val, 'length') === 0);
    }).cacheable();
};

Flame.computed.bool = function(dependentKey) {
    return Ember.computed(dependentKey, function(key) {
        return !!Ember.get(this, dependentKey);
    }).cacheable();
};

Flame.computed.or = function(dependentKey, otherKey) {
    return Ember.computed(dependentKey, otherKey, function(key) {
        return Ember.get(this, dependentKey) || Ember.get(this, otherKey);
    }).cacheable();
};
