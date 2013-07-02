Flame.ImageView = Flame.View.extend({
    templateContext: function() {
        return { value: this.get('value') };
    }.property('value').volatile(),

    handlebars: '<img {{bindAttr src="value"}}>'
});
