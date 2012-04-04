Flame.ProgressView = Flame.View.extend({
    classNames: ['flame-progress-view'],
    animate: false,

    handlebars: function() {
        var height = this.get('layout').height;
        return "<div style='height: %@px;' class='progress-container'></div><div style='height: %@px; width: %@px;' class='progress-bar'></div>".fmt(height - 2, height - 4, this.get('size'));
    }.property().cacheable(),

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

    _sizeDidChange: function() {
        // In CubeTableLoadingView, the progress views are rendered before the value & maximum bindings have synchronized,
        // which means the handlebars template uses width 0. Then they synchronize _before_ the element is added to DOM,
        // which means $(...) doesn't work yet. Defer updating to next runloop.
        Ember.run.next(this, function() {
            if (this.get('animate')) {
                this.$('.progress-bar').animate({ width: this.get('size') }, 300);
            } else {
                this.$('.progress-bar').css('width', this.get('size'));
            }
        });
    }.observes('size')
});
