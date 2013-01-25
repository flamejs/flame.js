//= require_self
//= require_tree ./validators

Flame.Validator = Ember.Object.extend({
    /**
     @param {Object} target the target object
     @param {String} key the target object property
     @returns {Boolean} validation status
     */
    validate: function(target, key) {
        return true;
    },

    validateValue: function(value) {
        return this.validate(Ember.Object.create({value: value}), 'value');
    },

    /**
     @returns {String} the property which the validator will set the result of the validation.
     */
    isValidProperty: function(key) {
        return key + 'IsValid';
    }
});

/**
 *  Mix this in to your model object to perform on the fly validation.
 *  You must provide a 'validations' hash, with the keys defining each property of your model to validate,
 *  and the values the validation logic.
 *
 *  The validation logic should be defined either as a Flame validator singleton, an anonymous function, or a hash.
 *
 *  Validation is done on-demand, demand being the first call to foo.get("barIsValid") or foo.get("isValid").
 *  Thus we don't validate stuff that just goes to DataStore but only the thing we use and about whose validity we're
 *  interested in.
 *
 *  If you define 'Coupled properties' for a property foo, this means that when foo has changed, we need to revalidate not
 *  just foo but also each coupled property. For example, if we have properties password and passwordCheck, when we
 *  edit password we need to revalidate the validation for passwordCheck also.
 *
 *  Validations can only be set once to the object (this is usually done in the definition of the objects class).
 *
 */
Flame.Validatable = Ember.Mixin.create({
    _propertyValidity: null,
    _objectIsValid: null,
    _validations: null,

    isValidProperty: function(property) {
        return property + 'IsValid';
    },

    // The observer calls this method with a value, so we have to add ignoreCoupledProperties afterwards
    validateProperty: function(target, key, value, ignoreCoupledProperties) {
        if (Ember.none(ignoreCoupledProperties)) {
            ignoreCoupledProperties = false;
        }
        if (value === undefined) {
            value = target.get(key);
        }
        var validationObj = target.get('validations')[key];
        var coupledProperties = null;
        if (jQuery.isPlainObject(validationObj)) {
            var hash = validationObj;
            validationObj = hash.validation;
            coupledProperties = hash.coupledProperties;
        }

        var isValid;
        if (!jQuery.isArray(validationObj)) {
            validationObj = [validationObj];
        }
        for (var i = 0; i < validationObj.length; i++) {
            if (!(isValid = this._validate(validationObj[i], target, key, value))) {
                break;
            }
        }
        var isValidProperty = this.isValidProperty(key);
        target.beginPropertyChanges();
        target.set(isValidProperty, isValid);
        // Coupled properties are properties that should be revalidated if the original property changes
        if (!ignoreCoupledProperties && coupledProperties) {
            if (!jQuery.isArray(coupledProperties)) {
                throw "Hint: coupledProperties must be an array!";
            }
            for (var j = 0; j < coupledProperties.length; j++) {
                var coupledProperty = coupledProperties[j];
                if (coupledProperty !== key) {
                    this.validateProperty(this, coupledProperty, undefined, true);
                }
            }
        }
        target.set('isValid', target._checkValidity());
        target.endPropertyChanges();
    },

    invalidProperties: function() {
        var invalids = [];
        var validations = this.get("validations");
        for (var key in validations) {
            if (this.get(this.isValidProperty(key)) !== true) {
                invalids.push(key);
            }
        }
        return invalids;
    }.property(),

    _validate: function(validator, target, key, value) {
        var isValid = null;
        if (validator instanceof Flame.Validator) {
            isValid = validator.validate(target, key);
        } else if (!Ember.none(validator)) {
            //if not Flame.Validator, assume function
            isValid = validator.call(this, value);
        }
        return isValid;
    },

    /**
     @returns {Boolean} to indicate if all properties of model are valid.
     **/
    _checkValidity: function(forceRevalidation) {
        var validations = this.get("validations");
        for (var key in validations) {
            if (forceRevalidation) {
                this.validateProperty(this, key, this.get(key));
            }
            if (validations.hasOwnProperty(key) && this.get(this.isValidProperty(key)) !== true) {
                return false;
            }
        }
        return true;
    },

    isValid: function(key, val) {
        if (typeof val !== "undefined") {
            this._objectIsValid = val;
        }
        if (this._objectIsValid === null) { // If we haven't initialized this property yet.
            this._objectIsValid = this._checkValidity();
        }
        return this._objectIsValid;
    }.property(),

    /**
     * Allow setting of validations only once. Validations set through this property are ignored after they've been
     * set once.
     */
    validations: function(key, val) {
        if (!Ember.none(val)) {
            if (this._validations === null) {
                this._validations = val;
            } else {
                Ember.Logger.info("Trying to set validations after the validations have already been set!");
            }
        }
        return this._validations;
    }.property(),

    /**
     * Create all the *isValid properties this object should have based on its validations-property.
     */
    _createIsValidProperties: function() {
        var validations = this.get("validations");
        var propertyName;
        var self = this;
        // TODO do this without setting computer properties, using only simple properties (i.e. the kind 'foo' is when
        // defined like Ember.Object({foo: false}).
        for (propertyName in validations) {
            if (validations.hasOwnProperty(propertyName)) {
                this._createIsValidProperty(propertyName);
            }
        }
        for (propertyName in validations) {
            if (validations.hasOwnProperty(propertyName)) {
                this.addObserver(propertyName, this, 'validateProperty');
                this.validateProperty(this, propertyName);
            }
        }
    },

    _createIsValidProperty: function(propertyName) {
        if (this._propertyValidity === null) { this._propertyValidity = {}; }
        var self = this;
        Ember.defineProperty(this, this.isValidProperty(propertyName), Ember.computed(
                function(propertyIsValidName, value) {
                    // Emulate common property behaviour where setting undefined value does nothing.
                    if (typeof value !== "undefined") {
                        self.propertyWillChange(propertyIsValidName);
                        self._propertyValidity[propertyIsValidName] = value;
                        self.propertyDidChange(propertyIsValidName);
                    }
                    return self._propertyValidity[propertyIsValidName];
                }
        ).property());
    },

    /**
     * Add validation for
     * @param {String} propertyName Name of the property we want to validate.
     * @param {Object} validator Flame.Validator or function that will handle the validation of this property.
     */
    setValidationFor: function(propertyName, validator) {
        // TODO do this without setting computed properties, using only simple properties (i.e. the kind 'foo' is when
        // defined with Ember.Object({foo: false}).

        var validations = this.get("validations");
        validations[propertyName] = validator;
        this._createIsValidProperty(propertyName);
        this.removeObserver(propertyName, this, 'validateProperty'); // In case we're redefining the validation
        this.addObserver(propertyName, this, 'validateProperty');
        this.validateProperty(this, propertyName);
    },

    unknownProperty: function(key) {
        var res = /^(.+)IsValid$/.exec(key);
        var validations = this.get("validations");
        if (res && validations) {
            var propertyName = res[1];
            if (validations[propertyName]) {
                this._createIsValidProperties();
                return this.get(key);
            }
        }
        // Standard bailout, either the property wasn't of the form fooIsValid or we don't have property foo in
        // this.validations.
        return this._super(key);
    },

    setUnknownProperty: function(key, value) {
        var res = /^(.+)IsValid$/.exec(key);
        var validations = this.get("validations");
        if (res && validations) {
            var propertyName = res[1];
            if (validations[propertyName]) {
                this._createIsValidProperties();
                return this.set(key, value);
            }
        }
        // Standard bailout, either the property wasn't of the form fooIsValid or we don't have property foo in
        // this.validations.
        return this._super(key, value);
    }
});

