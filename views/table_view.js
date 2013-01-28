//= require ./table_data_view

Flame.TableView = Flame.View.extend(Flame.Statechart, {
    MIN_COLUMN_WIDTH: 30,

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
    rowHeaderWidth: null,
    tableDelegate: null,
    content: null,  // Set to a Flame.TableController
    allowRefresh: true,
    batchUpdates: true,
    useAutoWidth: false,

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
        tableViewDelegateBinding: '^tableViewDelegate',
        cellsMarkedForUpdateBinding: '^content.cellsMarkedForUpdate',
        batchUpdatesBinding: '^batchUpdates'
    }),

    rowDepth: function() {
        return this.getPath('contentAdapter.rowHeaderRows.maxDepth');
    }.property('contentAdapter.rowHeaderRows').cacheable(),

    /* IE 5-8 trigger mouse events in unorthodox order:

     IE 5-8:        Any sane browser:
     mousedown      mousedown
     mouseup        mouseup
     click          click
     mouseup        mousedown
     dblclick       mouseup
                    click
                    dblclick

     Normally, the dblclick event works as expected, because the mouseup event is not being triggered for idle state
     if mouseDown precedes it (because mouseup event is handled in resizing state). However, because IE8 triggers
     two mouseups but only one mousedown for a dblclick event, the mouseUp function is called for idle state - which
     in turn opens the sort order panel.

     By adding another state we can mitigate the issue. The mousedown event puts the view into clickInProgress
     state, and in clickInProgress mouseup returns it back to idle state. So, the state transition works as before.
     However, if user clicks the resize-handle the view goes to resizing state. The first mouseup event moves the view
     back to idle state, where the second redundant mouseup gets eaten silently.

    */
    idle: Flame.State.extend({
        mouseDown: function(event) {
            this.gotoState('clickInProgress');

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

        doubleClick: function(event) {
            var owner = this.get('owner');
            if (!owner.get('useAutoWidth')) return false;

            var target = jQuery(event.target), index, header;
            if (!!target.closest('.column-header').length && (index = target.closest('td').attr('data-leaf-index'))) {
                header = this.getPath('owner.content.columnLeafs')[index];

                var columnDataAsString = owner.getColumnContents(header).map(function(e) { return e; }).join("<br />");
                var columnDimensions = Flame.measureString(columnDataAsString, 'ember-view');

                var isBold = target.closest('td').css("font-weight") == "bold";
                var headerLabelDimensions = Flame.measureString(owner.getLeafHeaderLabel(header), 'ember-view', 'label', isBold ? "font-weight:bold;" : '');

                var width = Math.max(columnDimensions.width, headerLabelDimensions.width) + 40;

                if (width < owner.MIN_COLUMN_WIDTH) width = owner.MIN_COLUMN_WIDTH;
                owner.setColumnWidth(header.leafIndex, width);

                return true;
            }
            return false;
        }
    }),

    clickInProgress: Flame.State.extend({
        mouseUp: function(event) {
            this.gotoState('idle');
            var clickDelegate = this.getPath('owner.tableViewDelegate');
            if (clickDelegate && clickDelegate.columnHeaderClicked) {
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
                        index = parseInt(cell.attr('data-index'), 10);
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
            if (cellWidth < this.MIN_COLUMN_WIDTH) { cellWidth = this.MIN_COLUMN_WIDTH; }
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
                var totalDepth = this.getPath('owner.rowDepth');
                var remainingDepth = 0;
                // must account for row headers spanning multiple columns to get the right leafIndex and width
                cell.nextAll().each(function() {
                    var colspan = $(this).attr('colspan');
                    remainingDepth += colspan ? parseInt(colspan, 10) : 1;
                });
                leafIndex = totalDepth - remainingDepth;

                var colWidth = cellWidth;
                if ($(cell).attr('colspan')) {
                    var colStart = leafIndex - parseInt($(cell).attr('colspan'), 10) + 1; // the first column included in the span
                    for(colStart; colStart < leafIndex; colStart++) {
                        colWidth -= parseInt(cell.parents('table').find('colgroup :nth-child(%@)'.fmt(colStart)).css('width'), 10);
                    }
                }
                cell.parents('table').find('colgroup :nth-child(%@)'.fmt(leafIndex)).css('width', '%@px'.fmt(colWidth));
            }
        },

        mouseUp: function(event) {
            var owner = this.get('owner');
            if (owner.get('type') === 'column') {
                var resizeDelegate = owner.get('tableViewDelegate');
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

    setColumnWidth: function(columnIndex, cellWidth) {
        var headerCellWidth = this._getBrowserSpecificHeaderCellWidth(cellWidth);
        this.$().parent().find('div.column-header').find('colgroup :nth-child(%@)'.fmt(columnIndex + 1)).css('width', '%@px'.fmt(headerCellWidth));

        cellWidth = this._getBrowserSpecificTableCellWidth(cellWidth);
        var table = this.get('childViews')[0];
        table.updateColumnWidth(columnIndex, cellWidth);
    },

    getColumnContents: function(columnHeader) {
        return this.getPath("content.tableData").map(function(e) {
            var elem = e[columnHeader.leafIndex];
            return Ember.none(elem) ? '' : elem.formattedValue();
        });
    },

    getLeafHeaderLabel: function(header) {
        var leaf = this.getPath("content.columnLeafs")[header.leafIndex];
        return leaf.get("headerLabel");
    },

    _synchronizeColumnWidth: function() {
        // Update data table columns
        var cell = this.get('resizingCell');
        var table = this.get('childViews')[0];
        var width = this._getBrowserSpecificTableCellWidth(parseInt(cell.css('width'), 10));
        var index = parseInt(cell.attr('data-leaf-index'), 10);
        table.updateColumnWidth(index, width);
    },

    _getBrowserSpecificHeaderCellWidth: function(cellWidth) {
        if (jQuery.browser.mozilla) cellWidth += 3;
        if (jQuery.browser.webkit || jQuery.browser.msie) cellWidth += 4;
        return cellWidth;
    },

    _getBrowserSpecificTableCellWidth: function(width) {
        if (jQuery.browser.webkit || jQuery.browser.msie) { width += 4; }
        if (jQuery.browser.mozilla) { width -= 2; }
        return width;
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
        var rowHeaderWidth = this.get('rowHeaderWidth') || defaultColumnWidth;

        var columnHeaderRows = this.getPath('contentAdapter.columnHeaderRows');
        var rowHeaderRows = this.getPath('contentAdapter.rowHeaderRows');
        var columnHeaderHeight = columnHeaderRows.maxDepth * 21 + 1 + columnHeaderRows.maxDepth;
        var leftOffset = 0;
        if (renderRowHeader) {
            leftOffset = rowHeaderRows.maxDepth * rowHeaderWidth + 1 + (renderColumnHeader ? 0 : 5);
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
            buffer = this._renderHeader(buffer, 'row', topOffset, rowHeaderWidth);
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

    _renderRow: function(buffer, row, type, rowIndex) {
        var length = row.length;
        var label, sortDirection, headerLabel;

        function countLeaves(headerNode) {
            if (headerNode.hasOwnProperty('children')) {
                var count = 0;
                for (var idx = 0; idx < headerNode.children.length; idx++) {
                    count += countLeaves(headerNode.children[idx]);
                }
                return count;
            } else {
                return 1;
            }
        }

        for (var i = 0; i < length; i++) {
            var header = row[i];
            buffer = buffer.begin('td');

            headerLabel = header.get ? header.get('headerLabel') : header.label;
            buffer = buffer.attr('title', headerLabel.replace(/<br>/g, '\n'));

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
                // Mark the leafIndex, so when sorting it's trivial to find the correct field to sort by
                buffer = buffer.attr('data-leaf-index', header.leafIndex);
                if (this.get('isResizable') && this.get('renderColumnHeader')) {
                    buffer = buffer.push('<div class="resize-handle">&nbsp;</div>');
                }

                var headerSortDelegate = this.get('tableViewDelegate');
                if (headerSortDelegate && headerSortDelegate.getSortForHeader) {
                    sortDirection = headerSortDelegate.getSortForHeader(header);
                }
                var sortClass = sortDirection ? 'sort-%@'.fmt(sortDirection) : '';
                label = '<div class="label ' + sortClass +'">%@</div>';
            } else if (type === 'row') {
                buffer = buffer.attr('data-index', header.dataIndex);
                if (this.get('renderColumnHeader')) {
                    if (this.get("isResizable")) {
                        if (header.hasOwnProperty('children')) {
                            // Ensure that resize-handle covers the whole height of the cell border. Mere child count
                            // does not suffice with multi-level row headers.
                            var leafCount = countLeaves(header);

                            buffer = buffer.push('<div class="resize-handle" style="height: %@px"></div>'.fmt(leafCount * 21));
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

