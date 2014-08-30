//= require ./label_view

Flame.ErrorMessageView = Flame.LabelView.extend({
    classNames: ['flame-form-view-validation-error'],
    classNameBindings: ['pointToClass', 'skinny'],
    skinny: false,
    pointTo: 'left',
    textAlign: function() {
        return this.get('pointTo') === 'left' ? Flame.ALIGN_LEFT : Flame.ALIGN_RIGHT;
    }.property('pointTo'),
    pointToClass: function() {
        return 'points-to-%@'.fmt(this.get('pointTo'));
    }.property('pointTo'),
    handlebars: '<div class="pointer"></div><div class="error-box">{{view.value}}</div>'
});
