Flame.ViewSupport = {
    concatenatedProperties: ['displayProperties'],
    displayProperties: [],
    resetClassNames: false,

    init: function() {
        this._super();

        // Add observers for displayProperties so that the view gets rerendered if any of them changes
        var properties = this.get('displayProperties') || [];
        var length = properties.length;
        for (var i = 0; i < length; i++) {
            var property = properties[i];
            this.addObserver(property, this, this.rerender);
        }

        // Remove classNames up to Flame.View to make it easier to define custom
        // styles for buttons, checkboxes etc...
        // We only want to do this in the init of class that sets the flag
        if (this.get('resetClassNames')) {
            var superClassNames = this._collectSuperClassNames();
            var classNames = this.get('classNames').removeObjects(superClassNames);
            this.set('classNames', classNames);
        }
    },

    willDestroy: function() {
        this._super();
        var properties = this.get('displayProperties') || [];
        var length = properties.length;
        for (var i = 0; i < length; i++) {
            this.removeObserver(properties[i]);
        }
    },

    createChildView: function(view, attrs) {
        view = this._super(view, attrs);
        if (view instanceof Ember.View && Flame._bindPrefixedBindings(view)) {
            Ember.finishChains(view);
        }
        return view;
    },

    /**
      Collects the classNames that were defined in super classes, but not
      classNames in Flame.View or superclasses that are above it in the
      class hierarchy.
    */
    _collectSuperClassNames: function() {
        var superClassNames = [];
        var resetingClass = this;
        // Find first class in inheritance chain that sets the resetClassNames property
        while (resetingClass && !resetingClass.hasOwnProperty('resetClassNames') && resetingClass.constructor !== Flame.View) {
            resetingClass = Object.getPrototypeOf(resetingClass);
        }
        // Collect classNames from it's super classes
        var superClass = Object.getPrototypeOf(resetingClass);
        while (superClass && superClass.constructor !== Flame.View) {
            superClassNames.pushObjects(superClass.classNames || []);
            superClass = Object.getPrototypeOf(superClass);
        }
        // Add back the classNames from Flame.View and deeper
        if (superClass.constructor === Flame.View) {
            superClassNames.removeObjects(superClass.classNames);
        }
        return superClassNames;
    }
};
