import MenuView from '../views/menu_view';

export default {
    sortAscendingCaption: 'Sort ascending...',
    sortDescendingCaption: 'Sort descending...',

    sortContent: function(sortDescriptor) {
        throw new Error('Not implemented!');
    },

    columnHeaderClicked: function(header, targetElement, tableView) {
        if (!header.get('isLeaf')) return;
        this._showSortMenu(header, this._sortMenuOptions(header), targetElement, tableView);
    },

    _showSortMenu: function(header, options, anchorView, tableView) {
        var self = this;
        MenuView.create({
            minWidth: anchorView.outerWidth(),
            items: options,
            action: function() {
                self.sortContent(this.get('value'), tableView);
            }
        }).popup(anchorView);
    },

    _sortMenuOptions: function(header) {
        return [
            {title: this.get('sortAscendingCaption'), value: {header: header, order: 'asc'}},
            {title: this.get('sortDescendingCaption'), value: {header: header, order: 'desc'}}
        ];
    }
};
