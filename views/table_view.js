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

    initialFlameState: 'idle',

    defaultColumnWidth: 88,
    rowHeaderWidth: null,
    tableDelegate: null,
    content: null, // Set to a Flame.TableController
    allowRefresh: true,
    batchUpdates: true,
    useAutoWidth: false,
    tableViewDelegate: null,

    contentAdapter: function() {
        return Flame.TableViewContentAdapter.create({
            content: this.get('content')
        });
    }.property('content'),

    tableDataView: Flame.TableDataView.extend({
        dataBinding: '^content._data',
        content: Ember.computed.alias('parentView.content'),
        dirtyCells: Ember.computed.alias('parentView.content.dirtyCells'),
        areValuesOnRows: Ember.computed.alias('parentView.content.areValuesOnRows'),
        totalRowIds: Ember.computed.alias('parentView.content.totalRowIds'),
        totalColumnIds: Ember.computed.alias('parentView.content.totalColumnIds'),
        tableViewDelegate: Ember.computed.alias('parentView.tableViewDelegate'),
        cellsMarkedForUpdate: Ember.computed.alias('parentView.content.cellsMarkedForUpdate'),
        batchUpdates: Ember.computed.alias('parentView.batchUpdates')
    }),

    rowDepth: function() {
        return this.get('contentAdapter.rowHeaderRows.maxDepth');
    }.property('contentAdapter.rowHeaderRows'),

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
            this.gotoFlameState('clickInProgress');

            var target = jQuery(event.target);
            if (target.is('div.resize-handle')) {
                this.gotoFlameState('resizing');
                var owner = this.get('owner');
                var cell = target.closest('td').first();
                owner.set('resizingCell', cell);
                owner.set('dragStartX', event.pageX);
                owner.set('startX', parseInt(target.parent().css('width'), 10));
                owner.set('offset', parseInt(this.get('owner.tableCorner').css('width'), 10));
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
                header = this.get('owner.content.columnLeafs')[index];

                var columnDataAsString = owner.getColumnContents(header).map(function(e) { return e; }).join('<br>');
                var columnDimensions = Flame.measureString(columnDataAsString, 'ember-view');

                var isBold = target.closest('td').css('font-weight') === 'bold';
                var headerLabelDimensions = Flame.measureString(owner.getLeafHeaderLabel(header), 'ember-view', 'label', isBold ? 'font-weight:bold;' : '');

                var width = Math.max(columnDimensions.width, headerLabelDimensions.width) + 40;

                if (width < owner.MIN_COLUMN_WIDTH) width = owner.MIN_COLUMN_WIDTH;
                owner.setColumnWidth(header.leafIndex, width);
                var resizeDelegate = owner.get('tableViewDelegate');
                if (resizeDelegate) {
                    resizeDelegate.columnResized(index, width);
                }
                return true;
            }
            return false;
        }
    }),

    clickInProgress: Flame.State.extend({
        mouseUp: function(event) {
            this.gotoFlameState('idle');
            var clickDelegate = this.get('owner.tableViewDelegate');
            if (clickDelegate && clickDelegate.columnHeaderClicked) {
                var target = jQuery(event.target), index, header;
                if (!!target.closest('.column-header').length && (index = target.closest('td').attr('data-leaf-index'))) {
                    if (clickDelegate.columnHeaderClicked) {
                        header = this.get('owner.content.columnLeafs')[index];
                        clickDelegate.columnHeaderClicked(header, target);
                    }
                    return true;
                } else if (!!target.closest('.row-header').length) {
                    if (clickDelegate.rowHeaderClicked) {
                        var cell = target.closest('td');
                        index = parseInt(cell.attr('data-index'), 10);
                        header = this.get('owner.content._headers.rowHeaders')[index];
                        if (!header) return false;
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
            var cell = this.get('owner.resizingCell');
            var deltaX = event.pageX - this.get('owner.dragStartX');
            var cellWidth = this.get('owner.startX') + deltaX;
            if (cellWidth < this.get('owner.MIN_COLUMN_WIDTH')) cellWidth = this.get('owner.MIN_COLUMN_WIDTH');
            var leafIndex;
            // Adjust size of the cell
            if (this.get('owner.type') === 'column') { // Update data table column width
                leafIndex = parseInt(cell.attr('data-leaf-index'), 10) + 1;
                cell.parents('table').find('colgroup :nth-child(%@)'.fmt(leafIndex)).css('width', '%@px'.fmt(cellWidth));
                this.get('owner')._synchronizeColumnWidth();
            } else {
                var width = this.get('owner.offset') + deltaX - 2;
                if (width < 30) width = 30;
                width -= 1;
                // Move data table and column header
                this.get('owner.scrollable').css('left', '%@px'.fmt(width));
                this.get('owner.columnHeader').parent().css('left', '%@px'.fmt(width));
                this.get('owner.tableCorner').css('width', '%@px'.fmt(width));
                // Update column width
                var totalDepth = this.get('owner.rowDepth');
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
            var resizeDelegate = owner.get('tableViewDelegate');
            if (resizeDelegate) {
                var cell = owner.get('resizingCell');
                if (owner.get('type') === 'column' && resizeDelegate.columnResized) {
                    var width = parseInt(cell.css('width'), 10);
                    var index = parseInt(cell.attr('data-leaf-index'), 10);
                    resizeDelegate.columnResized(index, width);
                } else if (resizeDelegate.rowHeaderResized) {
                    // Can't use col-element to get the width from as it does not work correctly in IE
                    var widths = this.$('.row-header tr:first', '[class*=level]').map(function() { return $(this).width(); });
                    resizeDelegate.rowHeaderResized(widths.get());
                }
            }
            this.gotoFlameState('idle');
            return true;
        }
    }),

    setColumnWidth: function(columnIndex, cellWidth) {
        var headerCellWidth = this._getBrowserSpecificHeaderCellWidth(cellWidth);
        this.$().parent().find('div.column-header').find('colgroup :nth-child(%@)'.fmt(columnIndex + 1)).css('width', '%@px'.fmt(headerCellWidth));

        cellWidth = this._getBrowserSpecificTableCellWidth(cellWidth);
        var table = this.objectAt(0);
        table.updateColumnWidth(columnIndex, cellWidth);
    },

    getColumnContents: function(columnHeader) {
        return this.get("content.tableData").map(function(e) {
            var elem = e[columnHeader.leafIndex];
            return Ember.isNone(elem) ? '' : elem.formattedValue();
        });
    },

    getLeafHeaderLabel: function(header) {
        var leaf = this.get("content.columnLeafs")[header.leafIndex];
        return leaf.get("headerLabel");
    },

    _synchronizeColumnWidth: function() {
        // Update data table columns
        var cell = this.get('resizingCell');
        var table = this.objectAt(0);
        var width = this._getBrowserSpecificTableCellWidth(parseInt(cell.css('width'), 10));
        var index = parseInt(cell.attr('data-leaf-index'), 10);
        table.updateColumnWidth(index, width);
    },

    _getBrowserSpecificHeaderCellWidth: function(width) {
        return width + 3;
    },

    _getBrowserSpecificTableCellWidth: function(width) {
        return width + 3;
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
        this.get('scrollable').scroll(jQuery.proxy(this.didScroll, this));
    },

    isScrolling: false,
    didScroll: function(event) {
        var scrollable = this.get('scrollable');
        this.lastScrollTop = scrollable.scrollTop();
        this.lastScrollLeft = scrollable.scrollLeft();
        if (!this.isScrolling) {
            requestAnimationFrame(jQuery.proxy(this._updateHeaderPositions, this));
        }
        this.isScrolling = true;
    },

    _updateHeaderPositions: function() {
        if (this.lastScrollTop !== this.lastSetScrollTop) {
            this.get('rowHeader').css('top', '-%@px'.fmt(this.lastScrollTop));
            this.lastSetScrollTop = this.lastScrollTop;
        }
        if (this.lastScrollLeft !== this.lastSetScrollLeft) {
            this.get('columnHeader').css('left', '-%@px'.fmt(this.lastScrollLeft));
            this.lastSetScrollLeft = this.lastScrollLeft;
        }
        this.isScrolling = false;
    },

    _headersDidChange: function() {
        // When the headers change, fully re-render the view
        this.rerender();
    }.observes('contentAdapter.headers'),

    render: function(buffer) {
        var renderColumnHeader = this.get('renderColumnHeader');
        var renderRowHeader = this.get('renderRowHeader');
        var didRenderTitle = false;

        var headers = this.get('contentAdapter.headers');
        if (!headers) {
            return; // Nothing to render
        }

        if (this.get('content.title')) {
            buffer.push('<div class="panel-title">%@</div>'.fmt(this.get('content.title')));
            didRenderTitle = true;
        }

        var defaultColumnWidth = this.get('defaultColumnWidth');
        var defaultRowHeaderWidth = this.get('rowHeaderWidth') || defaultColumnWidth;
        var rowHeaderWidths = this.get('content').rowHeaderWidths ? this.get('content').rowHeaderWidths() : null;

        var columnHeaderRows = this.get('contentAdapter.columnHeaderRows');
        var rowHeaderRows = this.get('contentAdapter.rowHeaderRows');
        var columnHeaderHeight = columnHeaderRows.maxDepth * 21 + 1 + columnHeaderRows.maxDepth;
        var leftOffset = 0;
        if (renderRowHeader) {
            if (rowHeaderWidths) {
                var totalWidth = 0;
                for (var i = 0; i < Math.max(rowHeaderRows.maxDepth, 1); i++) {
                    totalWidth += isNaN(rowHeaderWidths[i]) ? defaultRowHeaderWidth : rowHeaderWidths[i];
                }
                leftOffset = totalWidth + 1 + (renderColumnHeader ? 0 : 5);
            } else {
                leftOffset = rowHeaderRows.maxDepth * defaultRowHeaderWidth + 1 + (renderColumnHeader ? 0 : 5);
            }
        }
        var topOffset = didRenderTitle ? 18 : 0;

        if (renderColumnHeader) {
            // Top left corner of the headers
            buffer.push('<div class="table-corner" style="top: %@px; left: 0px; height: %@px; width: %@px;"></div>'.fmt(topOffset, columnHeaderHeight, leftOffset));
            // Column headers
            this._renderHeader(buffer, 'column', leftOffset, defaultColumnWidth);
            topOffset += columnHeaderHeight;
        }
        if (renderRowHeader) {
            // Row headers
            this._renderHeader(buffer, 'row', topOffset, defaultRowHeaderWidth);
        }

        // Scrollable div
        buffer.push('<div class="scrollable" style="overflow: auto; bottom: 0px; top: %@px; left: %@px; right: 0px;">'.fmt(topOffset, leftOffset));
        // There should really only be one child view, the TableDataView
        this.forEach(function(view) {
            view.renderToBuffer(buffer);
        });
        buffer.push('</div>');
    },

    _renderHeader: function(buffer, type, offset, defaultColumnWidth) {
        var headers = this.get('contentAdapter.headers');
        if (!headers) {
            buffer.push('<div></div>');
            return;
        }

        var position, i;
        if (type === 'column') {
            headers = this.get('contentAdapter.columnHeaderRows');
            position = 'left';
        } else {
            headers = this.get('contentAdapter.rowHeaderRows');
            position = 'top';
        }
        var length = headers.length;

        buffer.begin('div').addClass('%@-header'.fmt(type)).attr('style', 'position: absolute; %@: %@px'.fmt(position, offset));
        buffer.pushOpeningTag();
        buffer.begin('table').attr('style', 'position: absolute').attr('width', '1px');
        buffer.pushOpeningTag();

        buffer.push('<colgroup>');
        if (type === 'row') {
            var widths = this.get('content').rowHeaderWidths ? this.get('content').rowHeaderWidths() : null;
            for (i = 0; i < (headers.maxDepth || 1); i++) {
                var width = (widths && widths[i]) ? widths[i] : defaultColumnWidth;
                buffer.push('<col style="width: %@px;" class="level-%@">'.fmt(width, i + 1));
            }
        } else {
            var l = this.get('content.columnLeafs').length;
            for (i = 0; i < l; i++) {
                buffer.push('<col style="width: %@px;" />'.fmt(this.get('content.columnLeafs')[i].get('render_width') || defaultColumnWidth));
            }
        }
        buffer.push('</colgroup>');

        for (i = 0; i < length; i++) {
            if (type === 'column') {
                buffer.push('<tr class="level-%@">'.fmt(i + 1));
            } else {
                buffer.push('<tr>');
            }
            this._renderRow(buffer, headers[i], type, i);
            buffer.push('</tr>');
        }

        buffer.pushClosingTag(); // table
        buffer.pushClosingTag(); // div
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
            buffer.begin('td');

            headerLabel = header.get ? header.get('headerLabel') : header.label;
            if (!headerLabel) headerLabel = "";

            buffer.attr('title', headerLabel.replace(/<br>/g, '\n'));

            if (header.rowspan > 1) {
                buffer.attr('rowspan', header.rowspan);
            }
            if (header.colspan > 1) {
                buffer.attr('colspan', header.colspan);
            }

            label = '<div class="label">%@</div>';
            var resizeHandle = "";
            buffer.attr('class', (i % 2 === 0 ? "even-col" : "odd-col"));
            if (type === 'column' && !header.hasOwnProperty('children')) { // Leaf node
                buffer.attr('data-index', i);
                // Mark the leafIndex, so when sorting it's trivial to find the correct field to sort by
                buffer.attr('data-leaf-index', header.leafIndex);
                if (this.get('isResizable') && this.get('renderColumnHeader')) {
                    resizeHandle = '<div class="resize-handle">&nbsp;</div>';
                }

                var headerSortDelegate = this.get('tableViewDelegate');
                if (headerSortDelegate && headerSortDelegate.getSortForHeader) {
                    sortDirection = headerSortDelegate.getSortForHeader(header);
                }
                var sortClass = sortDirection ? 'sort-%@'.fmt(sortDirection) : '';
                label = '<div class="label ' + sortClass +'">%@</div>';
            } else if (type === 'row') {
                buffer.attr('data-index', header.dataIndex);
                if (this.get('renderColumnHeader')) {
                    if (this.get("isResizable")) {
                        if (header.hasOwnProperty('children')) {
                            // Ensure that resize-handle covers the whole height of the cell border. Mere child count
                            // does not suffice with multi-level row headers.
                            var leafCount = countLeaves(header);
                            resizeHandle = '<div class="resize-handle" style="height: %@px"></div>'.fmt(leafCount * 21);
                        } else {
                            resizeHandle = '<div class="resize-handle"></div>';
                        }
                    }
                    if (this.get('isRowHeaderClickable') && header.get('isClickable')) {
                        label = '<a href="javascript:void(0)">%@</a>';
                    }
                }
            }

            buffer.pushOpeningTag(); // td
            buffer.push('<div class="content-container">');
            buffer.push(resizeHandle);
            buffer.push(label.fmt(headerLabel));
            buffer.push('</div>');
            buffer.pushClosingTag(); // td
        }
    }
});
