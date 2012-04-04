//= require ./label_view

Flame.DisclosureView = Flame.LabelView.extend({
    classNames: ['flame-disclosure-view'],
    buttonBinding: Ember.Binding.from('visibilityTarget').transformTrueFalse(
        Flame.image('disclosure_triangle_down.png'),
        Flame.image('disclosure_triangle_left.png')
    ),
    handlebars: '<img {{bindAttr src="button"}}> {{value}}',
    action: function() {
        var value = this.getPath('visibilityTarget');
        this.setPath('visibilityTarget', !value);
        return true;
    }
});

