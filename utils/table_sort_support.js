Flame.TableSortSupport = {
    sortAscendingCaption: 'Sort ascending...',
    sortDescendingCaption: 'Sort descending...',

    sortContent: function(sortDescriptor) {
        throw new Error('Not implemented!');
    },

    columnHeaderClicked: function(header, targetElement) {
        if (!header.get('isLeaf')) return;
        this._showSortMenu(header, this._sortMenuOptions(header), targetElement);
    },

    _showSortMenu: function(header, options, anchorView) {
        Flame.MenuView.create({
            minWidth: anchorView.outerWidth(),
            items: options,
            target: this,
            action: 'sortContent',
            payload: Ember.computed.alias('value')
        }).popup(anchorView);
    },

    _sortMenuOptions: function(header) {
        return [
            {title: this.get('sortAscendingCaption'), value: {header: header, order: 'asc'}},
            {title: this.get('sortDescendingCaption'), value: {header: header, order: 'desc'}}
        ];
    }
};
