//= require ./label_view

Flame.DisclosureView = Flame.LabelView.extend({
    classNames: ['flame-disclosure-view'],

    imageExpanded: Flame.image('disclosure_triangle_down.png'),
    imageCollapsed: Flame.image('disclosure_triangle_left.png'),

    image: function() {
        return this.get('visibilityTarget') ? this.get('imageExpanded') : this.get('imageCollapsed');
    }.property('visibilityTarget', 'imageExpanded', 'imageCollapsed'),

    handlebars: '<img {{bindAttr src="image"}}> {{value}}',

    action: function() {
        var value = this.getPath('visibilityTarget');
        this.setPath('visibilityTarget', !value);
        return true;
    }
});
