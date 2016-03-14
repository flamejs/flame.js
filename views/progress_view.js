import View from '../view';

export default View.extend({
    classNames: ['flame-progress-view'],

    value: null,
    maximum: null,
    animate: false,

    handlebars: function() {
        var height = this.get('layout').height;
        return "<div style='height: %@px;' class='progress-container'></div><div style='height: %@px; width: %@px;' class='progress-bar'></div>".fmt(height - 2, height - 4, this.get('size'));
    }.property(),

    size: function() {
        var progress = this.get('value') / this.get('maximum');
        if (isNaN(progress)) {
            return 0;
        } else {
            var width = this.get('layout').width;
            if (progress > 1) progress = 1;
            return Math.floor(width * progress) - 4;
        }
    }.property('value', 'maximum'),

    sizeDidChange: function() {
        Ember.run.schedule('afterRender', this, function() {
            if (this.get('_state') === 'inDOM') {
                if (this.get('animate')) {
                    this.$('.progress-bar').animate({width: this.get('size')}, 300);
                } else {
                    this.$('.progress-bar').css('width', this.get('size'));
                }
            }
        });
    }.observes('size')
});
