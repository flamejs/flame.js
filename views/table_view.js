//= require ./table_data_view

Flame.TableView = Flame.View.extend(Flame.Statechart, {
    classNames: 'flame-table-view'.w(),
    childViews: 'tableDataView'.w(),
    acceptsKeyResponder: false,

    // References to DOM elements
    scrollable: null, // the scrollable div that holds the data table
    rowHeader: null, // the row header table element
    columnHeader: null, // the column header table element
    tableCorner: null,

    renderColumnHeader: true,
    renderRowHeader: true,
    isRowHeaderClickable: true,
    isResizable: true,
    allowSelection: false,

    initialState: 'idle',

    defaultColumnWidth: 88,
    cellUpdateDelegate: null,
    clickDelegate: null,
    resizeDelegate: null,
    content: null,  // Set to a Flame.TableController
    allowRefresh: true,
    batchUpdates: true,

    contentAdapter: function() {
        return Flame.TableViewContentAdapter.create({
            content: this.get('content')
        });
    }.property('content').cacheable(),

    tableDataView: Flame.TableDataView.extend({
        dataBinding: '^content._data',
        dirtyCellsBinding: '^content.dirtyCells',
        areValuesOnRowsBinding: '^content.areValuesOnRows',
        totalRowIdsBinding: '^content.totalRowIds',
        totalColumnIdsBinding: '^content.totalColumnIds',
        cellUpdateDelegateBinding: '^cellUpdateDelegate',
        cellsMarkedForUpdateBinding: '^content.cellsMarkedForUpdate',
        batchUpdatesBinding: '^batchUpdates'
    }),

    rowDepth: function() {
        return this.getPath('contentAdapter.rowHeaderRows').map(function(a) {
            return a.length;
        }).max();
    }.property('contentAdapter.rowHeaderRows').cacheable(),

    idle: Flame.State.extend({
        mouseDown: function(event) {
            var target = jQuery(event.target);
            if (target.is('div.resize-handle')) {
                this.gotoState('resizing');
                var owner = this.get('owner');
                var cell = target.parent();
                owner.set('resizingCell', cell);
                owner.set('dragStartX', event.pageX);
                owner.set('startX', parseInt(target.parent().css('width'), 10));
                owner.set('offset', parseInt(this.getPath('owner.tableCorner').css('width'), 10));
                owner.set('type', cell.is('.column-header td') ? 'column' : 'row');
                return true;
            } else if (!!target.closest('.column-header').length) {
                return true;
            } else if (target.is('a')) {
                return true;
            }

            return false;
        },

        mouseUp: function(event) {
            var clickDelegate = this.getPath('owner.clickDelegate');
            if (clickDelegate) {
                var target = jQuery(event.target), index, header;
                if (!!target.closest('.column-header').length && (index = target.closest('td').attr('data-leaf-index'))) {
                    if (clickDelegate.columnHeaderClicked) {
                        header = this.getPath('owner.content.columnLeafs')[index];
                        clickDelegate.columnHeaderClicked(header, target);
                    }
                    return true;
                } else if (!!target.closest('.row-header').length) {
                    if (clickDelegate.rowHeaderClicked) {
                        var cell = target.closest('td');
                        index = parseInt(cell.attr('data-index'), 10) / parseInt(cell.attr('rowspan') || 1, 10);
                        header = this.getPath('owner.content._headers.rowHeaders')[index];
                        if (!header) { return false; }
                        clickDelegate.rowHeaderClicked(header, target, index);
                    }
                    return true;
                }
            }

            return false;
        }
    }),

    resizing: Flame.State.extend({
        mouseMove: function(event) {
            var target = jQuery(event.target);
            var cell = this.getPath('owner.resizingCell');
            var deltaX = event.pageX - this.getPath('owner.dragStartX');
            var cellWidth = this.getPath('owner.startX') + deltaX;
            if (cellWidth < 30) { cellWidth = 30; }
            var leafIndex;
            // Adjust size of the cell
            if (this.getPath('owner.type') === 'column') { // Update data table column width
                leafIndex = parseInt(cell.attr('data-leaf-index'), 10) + 1;
                cell.parents('table').find('colgroup :nth-child(%@)'.fmt(leafIndex)).css('width', '%@px'.fmt(cellWidth));
                this.get('owner')._synchronizeColumnWidth();
            } else {
                var width = this.getPath('owner.offset') + deltaX - 2;
                if (width < 30) { width = 30; }
                if (jQuery.browser.mozilla) {
                    width -= 1;
                } else if (jQuery.browser.webkit || jQuery.browser.msie) {
                    width -= 2;
                }
                // Move data table and column header
                this.getPath('owner.scrollable').css('left', '%@px'.fmt(width));
                this.getPath('owner.columnHeader').parent().css('left', '%@px'.fmt(width));
                this.getPath('owner.tableCorner').css('width', '%@px'.fmt(width));
                // Update column width
                var depth = this.getPath('owner.rowDepth');
                leafIndex = depth - cell.nextAll().length;
                cell.parents('table').find('colgroup :nth-child(%@)'.fmt(leafIndex)).css('width', '%@px'.fmt(cellWidth));
            }
        },

        mouseUp: function(event) {
            var owner = this.get('owner');
            if (owner.get('type') === 'column') {
                var resizeDelegate = owner.get('resizeDelegate');
                if (resizeDelegate && resizeDelegate.columnResized) {
                    var cell = owner.get('resizingCell');
                    var width = parseInt(cell.css('width'), 10);
                    var index = parseInt(cell.attr('data-leaf-index'), 10);
                    resizeDelegate.columnResized(index, width);
                }
            }
            this.gotoState('idle');
            return true;
        }
    }),

    _synchronizeColumnWidth: function() {
        // Update data table columns
        var cell = this.get('resizingCell');
        var table = this.get('childViews')[0];
        var width = parseInt(cell.css('width'), 10);
        var index = parseInt(cell.attr('data-leaf-index'), 10);
        if (jQuery.browser.webkit || jQuery.browser.msie) { width += 4; }
        if (jQuery.browser.mozilla) { width -= 2; }
        table.updateColumnWidth(index, width);
    },

    willInsertElement: function() {
        var scrollable = this.get('scrollable');
        if (scrollable) {
            scrollable.unbind();
        }
    },

    didInsertElement: function() {
        this.set('scrollable', this.$('.flame-table').parent().parent());
        this.set('rowHeader', this.$('.row-header table'));
        this.set('columnHeader', this.$('.column-header table'));
        this.set('tableCorner', this.$('.table-corner'));
        this.get('scrollable').scroll({self: this}, this.didScroll);
    },

    didScroll: function(event) {
        var self = event.data.self;
        var scrollable = self.get('scrollable');
        // Scroll fixed headers
        self.get('rowHeader').css('top', '-%@px'.fmt(scrollable.scrollTop()));
        self.get('columnHeader').css('left', '-%@px'.fmt(scrollable.scrollLeft()));
    },

    _headersDidChange: function() {
        this.rerender();
        // When the headers change, fully re-render the view
    }.observes('contentAdapter.headers'),

    render: function(buffer) {
        this._renderElementAttributes(buffer);
        var renderColumnHeader = this.get('renderColumnHeader');
        var renderRowHeader = this.get('renderRowHeader');
        var didRenderTitle = false;

        var headers = this.getPath('contentAdapter.headers');
        if (!headers) {
            return; // Nothing to render
        }

        if (this.getPath('content.title')) {
            buffer = buffer.push('<div class="panel-title">%@</div>'.fmt(this.getPath('content.title')));
            didRenderTitle = true;
        }

        var defaultColumnWidth = this.get('defaultColumnWidth');
        var columnHeaderRows = this.getPath('contentAdapter.columnHeaderRows');
        var rowHeaderRows = this.getPath('contentAdapter.rowHeaderRows');
        var columnHeaderHeight = columnHeaderRows.maxDepth * 21 + 1 + columnHeaderRows.maxDepth;
        var leftOffset = 0;
        if (renderRowHeader) {
            leftOffset = rowHeaderRows.maxDepth * defaultColumnWidth + 1 + (renderColumnHeader ? 0 : 5);
        }
        var topOffset = didRenderTitle ? 18 : 0;

        if (renderColumnHeader) {
            // Top left corner of the headers
            buffer = buffer.push('<div class="table-corner" style="top: %@px; left: 0px; height: %@px; width: %@px;"></div>'.fmt(topOffset, columnHeaderHeight, leftOffset));
            // Column headers
            buffer = this._renderHeader(buffer, 'column', leftOffset, defaultColumnWidth);
            topOffset += columnHeaderHeight;
        }
        if (renderRowHeader) {
            // Row headers
            buffer = this._renderHeader(buffer, 'row', topOffset, defaultColumnWidth);
        }

        // Scrollable div
        buffer = buffer.begin('div').attr('style', 'overflow: auto; bottom: 0px; top: %@px; left: %@px; right: 0px;'.fmt(topOffset, leftOffset));
        buffer = buffer.attr('class', 'scrollable');
        // There should really only be one child view, the TableDataView
        this.forEachChildView(function(view) {
            view.renderToBuffer(buffer);
        });
        buffer = buffer.end(); // div
    },

    _renderHeader: function(buffer, type, offset, defaultColumnWidth) {
        var headers = this.getPath('contentAdapter.headers');
        if (!headers) {
            return buffer.begin('div').end();
        }

        var position, i;
        if (type === 'column') {
            headers = this.getPath('contentAdapter.columnHeaderRows');
            position = 'left';
        } else {
            headers = this.getPath('contentAdapter.rowHeaderRows');
            position = 'top';
        }
        var length = headers.length;

        buffer = buffer.begin('div').addClass('%@-header'.fmt(type)).attr('style', 'position: absolute; %@: %@px'.fmt(position, offset));
        buffer = buffer.begin('table').attr('style', 'position: absolute').attr('width', '1px');
        buffer = buffer.begin('colgroup');
        if (type === 'row') {
            for (i = 1; i < 4; i++) {
                buffer = buffer.push('<col style="width: %@px;" class="level-%@" />'.fmt(defaultColumnWidth, i));
            }
        } else {
            var l = this.getPath('content.columnLeafs').length;
            for (i = 0; i < l; i++) {
                buffer = buffer.push('<col style="width: %@px;" />'.fmt(this.getPath('content.columnLeafs')[i].get('render_width') || defaultColumnWidth));
            }
        }
        buffer = buffer.end();
        for (i = 0; i < length; i++) {
            buffer = buffer.begin('tr');
            if (type === 'column') {
                buffer = buffer.attr('class', 'level-%@'.fmt(i + 1));
            }
            buffer = this._renderRow(buffer, headers[i], type, i);
            buffer = buffer.end(); // tr
        }
        buffer = buffer.end().end(); // table // div

        return buffer;
    },

    _renderRow: function(buffer, row, type, depth) {
        var length = row.length;
        var label, arrow, headerLabel;
        for (var i = 0; i < length; i++) {
            var header = row[i];
            buffer = buffer.begin('td');

            headerLabel = header.get ? header.get('headerLabel') : header.label;
            buffer = buffer.attr('title', headerLabel);

            if (header.rowspan > 1) {
                buffer = buffer.attr('rowspan', header.rowspan);
            }
            if (header.colspan > 1) {
                buffer = buffer.attr('colspan', header.colspan);
            }

            label = '<div class="label">%@</div>';
            buffer.attr('class', (i % 2 === 0 ? "even-col" : "odd-col"));
            if (type === 'column' && !header.hasOwnProperty('children')) { // Leaf node
                buffer = buffer.attr('data-index', i);
                // Mark the leafIndex, so when sorting its trivial to find the correct field to sort by
                buffer = buffer.attr('data-leaf-index', header.leafIndex);
                if (this.get('isResizable') && this.get('renderColumnHeader')) {
                    buffer = buffer.push('<div class="resize-handle">&nbsp;</div>');
                }

                label = '<div class="label">%@';

                if (arrow) {
                    label += '<img src="%@" style="vertical-align: middle" />'.fmt(arrow);
                }
                label += '</div>';
            } else if (type === 'row') {
                buffer = buffer.attr('data-index', depth % this.getPath('content.rowLeafs').length);
                if (this.get('renderColumnHeader')) {
                    if (this.get("isResizable")) {
                        if (header.hasOwnProperty('children')) {
                            buffer = buffer.push('<div class="resize-handle" style="height: %@px"></div>'.fmt(header.children.length * 21));
                        } else {
                            buffer = buffer.push('<div class="resize-handle"></div>');
                        }
                    }
                    if (this.get("isRowHeaderClickable") && header.get('isClickable')) {
                        label = '<a href="javascript:void(0)">%@</a>';
                    }
                }
            }
            buffer = buffer.push(label.fmt(headerLabel)).end(); // td
        }
        return buffer;
    }
});

