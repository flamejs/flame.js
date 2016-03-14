import { Validator } from '../validations';

var pattern = /^(([A-Za-z0-9]+_+)|([A-Za-z0-9]+\-+)|([A-Za-z0-9]+\.+)|([A-Za-z0-9]+\++))*[A-Za-z0-9\-]+@((\w+\-+)|(\w+\.))*\w{1,63}\.[a-zA-Z]{2,63}$/i;

export default Validator.create({
    validate: function(target, key) {
        return pattern.test(target.get(key));
    }
});
