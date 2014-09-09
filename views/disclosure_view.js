//= require ./label_view

Flame.DisclosureView = Flame.LabelView.extend({
    classNames: ['flame-disclosure-view'],

    imageExpanded: Flame.image('disclosure_triangle_down.svg'),
    imageCollapsed: Flame.image('disclosure_triangle_right.svg'),

    image: function() {
        return this.get('visibilityTarget') ? this.get('imageExpanded') : this.get('imageCollapsed');
    }.property('visibilityTarget', 'imageExpanded', 'imageCollapsed'),

    handlebars: '<img {{bind-attr src="view.image"}}> {{view.value}}',

    action: function() {
        this.toggleProperty('visibilityTarget');
        return true;
    }
});
