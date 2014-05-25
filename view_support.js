Flame.ViewSupport = {
    concatenatedProperties: ['displayProperties'],
    displayProperties: [],

    init: function() {
        this._super();

        // Add observers for displayProperties so that the view gets rerendered if any of them changes
        var properties = this.get('displayProperties') || [];
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            this.addObserver(property, this, this.rerender);
        }
    },

    createChildView: function(view, attrs) {
        view = this._super(view, attrs);
        if (view instanceof Ember.View && Flame._bindPrefixedBindings(view)) {
            Ember.finishChains(view);
        }
        return view;
    }
};
