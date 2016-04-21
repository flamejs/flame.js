import LazyListItemView, { MouseIsDownState } from './lazy_list_item_view';

import '../stylesheets/views/lazy_tree_item_view.css.scss';

import triangleDown from 'lib/flame/images/disclosure_triangle_down.svg';
import triangleRight from 'lib/flame/images/disclosure_triangle_right.svg';

export default LazyListItemView.extend({
    classNames: ['flame-tree-item-view'],
    itemContent: '{{view.content}}',
    isExpanded: false,

    collapsedImage: triangleRight,
    expandedImage: triangleDown,

    handlebars: function() {
        return '{{{unbound view.disclosureImage}}} <span>' + this.get('itemContent') + '</span>';
    }.property('itemContent'),

    isExpandedDidChange: function() {
        Ember.run.schedule('afterRender', this, function() {
            this.$().find('img').first().replaceWith(this.get('disclosureImage'));
        });
    }.observes('isExpanded'),

    isExpandable: function() {
        return this.get('parentView').isExpandable(this.get('content'));
    },

    ensureCorrectLevelClass: function(level) {
        if (this._indentationLevel === level) return;

        var classNames = this.get('classNames');
        var levelClass = 'level-' + (level + 1);

        if (this._indentationLevel) {
            // Remove old level class
            var oldLevelClass = 'level-' + (this._indentationLevel + 1);
            classNames.removeObject(oldLevelClass);

            // Updating the classNames array alone is not enough. If the view has already
            // been inserted in the DOM, we also need to update the element.
            if (this.get('_state') === 'inDOM') {
                this.$().removeClass(oldLevelClass);
            }
        }

        // Add new level class
        classNames.pushObject(levelClass);
        if (this.get('_state') === 'inDOM') {
            this.$().addClass(levelClass);
        }

        this._indentationLevel = level;
    },

    disclosureImage: function() {
        var isExpandable = this.isExpandable();
        if (!isExpandable) return '';
        return '<img src="%@">'.fmt(this.get('isExpanded') ? this.get('expandedImage') : this.get('collapsedImage'));
    }.property('isExpanded', 'content', 'expandedImage', 'collapsedImage'),

    mouseIsDown: MouseIsDownState.extend({
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
