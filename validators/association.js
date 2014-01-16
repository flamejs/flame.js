Flame.Validator.association = Flame.Validator.create({
    validate: function(target, key, forceRevalidation) {
        if (forceRevalidation === undefined) {
            forceRevalidation = false;
        }
        var association = target.get(key);
        if (Ember.isArray(association)) {
            return association.every(function(assoc) { return forceRevalidation ? assoc._checkValidity(true) : assoc.get('isValid'); });
        } else if (association) {
            return forceRevalidation ? association._checkValidity(true) : association.get('isValid');
        } else {
            return true;
        }
    }
});
