Flame.Validator.notBlank = Flame.Validator.create({
    validate: function(target, key) {
        return !Ember.isBlank(target.get(key));
    }
});
