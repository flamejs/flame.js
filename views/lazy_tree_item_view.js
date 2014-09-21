//= require ./lazy_list_item_view

Flame.LazyTreeItemView = Flame.LazyListItemView.extend({
    classNames: ['flame-tree-item-view'],
    itemContent: '{{view.content}}',
    isExpanded: false,

    collapsedImage: Flame.image('disclosure_triangle_right.svg'),
    expandedImage: Flame.image('disclosure_triangle_down.svg'),

    handlebars: function() {
        return '{{{view.disclosureImage}}} <span>' + this.get('itemContent') + '</span>';
    }.property('itemContent'),

    isExpandedDidChange: function() {
        Ember.run.schedule('afterRender', this, function() {
            this.$().find('img').first().replaceWith(this.get('disclosureImage'));
        });
    }.observes('isExpanded'),

    isExpandable: function() {
        return this.get('parentView').isExpandable(this.get('content'));
    },

    disclosureImage: function() {
        var isExpandable = this.isExpandable();
        if (!isExpandable) return '';
        return '<img src="%@">'.fmt(this.get('isExpanded') ? this.get('expandedImage') : this.get('collapsedImage'));
    }.property('isExpanded', 'content', 'expandedImage', 'collapsedImage'),

    mouseIsDown: Flame.LazyListViewStates.MouseIsDown.extend({
        mouseUp: function(event) {
            var owner = this.get('owner');
            if (owner.isExpandable()) {
                var parentView = owner.get('parentView');
                owner.toggleProperty('isExpanded');
                parentView.toggleItem(owner);
            }
            return this._super(event);
        }
    }),

    /**
      If this item is expanded, we want to collapse it before we start
      dragging to simplify the reordering.
    */
    willStartDragging: function() {
        if (this.get('isExpanded')) {
            this.toggleProperty('isExpanded');
            this.get('parentView').toggleItem(this);
        }
    }
});
