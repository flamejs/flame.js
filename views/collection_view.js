Flame.CollectionView =  Ember.CollectionView.extend(Flame.LayoutSupport, Flame.EventManager, {
    classNames: ['flame-list-view'],

    init: function() {
        this._super();
        var emptyViewClass = this.get('emptyView');
        if (emptyViewClass) {
            emptyViewClass.reopen({
                // Ensures removal if orphaned, circumventing the emptyView issue
                // (https://github.com/emberjs/ember.js/issues/233)
                ensureEmptyViewRemoval: function() {
                    if (!this.get('parentView')) {
                        Ember.run.next(this, function() {
                            if (!this.get('isDestroyed')) this.remove();
                        });
                    }
                }.observes('parentView')
            });

        }
    }

});
