// There's Ember.computed.empty and Ember.computed.notEmpty, but there's no
// counterpart for Ember.computed.equal
Ember.computed.notEqual = function(dependentKey, value) {
    return Ember.computed(dependentKey, function() {
        return value !== Ember.get(this, dependentKey);
    });
};

Flame.computed = {
    trueFalse: function(dependentKey, trueValue, falseValue) {
        return Ember.computed(dependentKey, function() {
            return Ember.get(this, dependentKey) ? trueValue : falseValue;
        });
    }
};
