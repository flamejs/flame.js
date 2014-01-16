Flame.TableSortSupport = {
    sortAscendingCaption: 'Sort ascending...',
    sortDescendingCaption: 'Sort descending...',

    sortContent: function(sortDescriptor) {
        throw new Error('Not implemented!');
    },

    columnHeaderClicked: function(header, targetElement) {
        this._showSortMenu(header, this._sortMenuOptions(header), targetElement);
    },

    _showSortMenu: function(header, options, anchorView) {
        // set width based on longest item title
        var longestTitle = options.map(function(i) { return i.title.length; }).max();
        var menu = Flame.MenuView.createWithMixins({
            items: options,
            layout: { width: longestTitle * 8 },
            target: this,
            action: 'sortContent',
            payload: Ember.computed.alias('value')
        });
        menu.popup(anchorView);
    },

    _sortMenuOptions: function(header) {
        return [
            {title: this.get('sortAscendingCaption'), value: {header: header, order: 'asc'}},
            {title: this.get('sortDescendingCaption'), value: {header: header, order: 'desc'}}
        ];
    }
};
