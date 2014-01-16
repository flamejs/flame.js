Flame.TableHeader = Ember.Object.extend({
    isClickable: false,

    headerLabel: Ember.computed.alias('label'),

    createCell: function(data) {
        throw new Error('Not implemented');
    }
});
