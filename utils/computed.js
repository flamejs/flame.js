export function notEqual(dependentKey, value) {
    return Ember.computed(dependentKey, function() {
        return value !== Ember.get(this, dependentKey);
    });
}

export function trueFalse(dependentKey, trueValue, falseValue) {
    return Ember.computed(dependentKey, function() {
        return Ember.get(this, dependentKey) ? trueValue : falseValue;
    });
}
