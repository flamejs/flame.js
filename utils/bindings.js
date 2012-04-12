// Cannot do reopen on Ember.Binding
Ember.mixin(Ember.Binding.prototype, {
    eq: function(testValue) {
        return this.transform(function(value, binding) {
            return ((Ember.typeOf(value) === 'string') && (value === testValue));
        });
    },

    // If value evaluates to true, return trueValue, otherwise falseValue
    transformTrueFalse: function(trueValue, falseValue) {
        return this.transform({
            to: function(value) {
                return value ? trueValue : falseValue;
            },
            from: function(value) {
                return value === trueValue;
            }
        });
    },

    //only return binding if target
    kindOf: function(klasses) {
        return this.transform(function(value, binding) {
            var object = (Ember.isArray(value) ? value.toArray()[0] : value);
            var klassArray = Ember.isArray(klasses) ? klasses : [klasses];
            var isKindOf = klassArray.some(function(k) {
                return object && object instanceof k;
            });
            if (isKindOf) {
                return object;
            } else {
                return null;
            }
        });
    },

    //returns true if obj equals binding value
    equals: function(obj) {
        return this.transform(function(value, binding) {
            return obj === value;
        });
    },

    isNull: function() {
        return this.transform(function(value, binding) {
            return value === null;
        });
    },

    hasPermission: function(key) {
        return this.transform(function(value, binding) {
            return (value && value.hasPermission && value.hasPermission(key));
        });
    }
});
