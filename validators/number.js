Flame.Validator.number = Flame.Validator.create({
    validate: function(target, key) {
        var value = target.get(key);
        return (value === '') || !(isNaN(value) || isNaN(parseFloat(value)));
    }
});
