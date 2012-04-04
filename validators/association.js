Flame.Validator.association = Flame.Validator.create({
   validate: function(target, key) {
       var association = target.get(key);
       if (Ember.isArray(association)) {
           return association.every(function(assoc) { return assoc.get('isValid'); });
       } else if (association) {
           return association.get('isValid');
       } else {
           return true;
       }
   }
});
