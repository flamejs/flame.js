Flame.Validator.notBlank = Flame.Validator.create({
    validate: function(target, key) {
        var string = target.get(key);
        if (string) {
            return string.trim().length !== 0;
        } else {
            return false;
        }
    }
});
