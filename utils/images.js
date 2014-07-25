//= require ./images_url

Ember.mixin(Flame, {
    image: function(imageUrl) {
        if (typeof FlameImageUrlPrefix === 'undefined') {
            return (Flame.imagePath || '') + imageUrl;
        } else {
            return FlameImageUrlPrefix + imageUrl;
        }
    }
});
