import { Validator } from '../validations';

export default Validator.create({
    validate: function(target, key) {
        return !Ember.isBlank(target.get(key));
    }
});
