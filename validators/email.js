Flame.Validator.email = Flame.Validator.create({
    validate: function(target, key) {
        var pattern = /^(([A-Za-z0-9]+_+)|([A-Za-z0-9]+\-+)|([A-Za-z0-9]+\.+)|([A-Za-z0-9]+\++))*[A-Za-z0-9]+@((\w+\-+)|(\w+\.))*\w{1,63}\.[a-zA-Z]{2,6}$/i;
        var string = target.get(key);
        return pattern.test(string);
    }
});
