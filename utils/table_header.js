Flame.TableHeader = Ember.Object.extend({
    isClickable: false,

    headerLabel: function() {
        return this.get('label');
    }.property('label'),

    createCell: function(data) {
        throw 'Not implemented';
    }
});
