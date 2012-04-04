Flame.TableHeader = Ember.Object.extend({
    isClickable: false,

    headerLabel: function() {
        return this.get('label');
    }.property('label').cacheable(),

    createCell: function(data) {
        throw 'Not implemented';
    }
});
