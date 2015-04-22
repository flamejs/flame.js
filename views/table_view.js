//= require ./table_data_view

var alias = Ember.computed.alias;

var unbindScroll = function() {
    var scrollable = this.get('scrollable');
    if (scrollable) {
        scrollable.off('scroll');
    }
};

Flame.TableView = Flame.View.extend(Flame.Statechart, {
    MIN_COLUMN_WIDTH: 30,

    classNames: ['flame-table-view'],
    childViews: ['tableDataView'],
    displayProperties: ['contentAdapter.headers'],
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
        dataBinding: 'parentView.content._data',
        content: alias('parentView.content'),
        dirtyCells: alias('parentView.content.dirtyCells'),
        areValuesOnRows: alias('parentView.content.areValuesOnRows'),
        totalRowIds: alias('parentView.content.totalRowIds'),
        totalColumnIds: alias('parentView.content.totalColumnIds'),
        tableViewDelegate: alias('parentView.tableViewDelegate'),
        cellsMarkedForUpdate: alias('parentView.content.cellsMarkedForUpdate'),
        batchUpdates: alias('parentView.batchUpdates')
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
                var owner = this.get('owner');
                // If a table cell is being edited at this point, its 'editField' would get displaced by the resizing operation, so we just turn the editing off
                var tableDataView = owner.get('tableDataView');
                if (tableDataView.get('currentFlameState.name') === 'editing') {
                    tableDataView.cancel();
                }
                var cell = target.closest('td');
                owner.setProperties({
                    resizingCell: cell,
                    dragStartX: event.pageX,
                    startX: cell.get(0).clientWidth + 1,
                    offset: parseInt(this.get('owner.tableCorner').css('width'), 10),
                    type: cell.is('.column-header td') ? 'column' : 'row'
                });
                this.gotoFlameState('resizing');
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
                if (resizeDelegate && resizeDelegate.columnResized) {
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
            if (clickDelegate) {
                var target = jQuery(event.target);
                var header;
                if (!!target.closest('.column-header').length) {
                    if (clickDelegate.columnHeaderClicked) {
                        // Find the corresponding TableHeader instance for the clicked cell.
                        var level = parseInt(target.closest('tr').attr('class').match(/level\-(\d+)/)[1], 10);
                        var row = this.get('owner.contentAdapter.columnHeaderRows')[level - 1];
                        header = row[target.closest('tr').find('td').index(target.closest('td'))];
                        clickDelegate.columnHeaderClicked(header, target);
                    }
                    return true;
                } else if (!!target.closest('.row-header').length) {
                    if (clickDelegate.rowHeaderClicked) {
                        var cell = target.closest('td');
                        var index = parseInt(cell.attr('data-index'), 10);
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
        enterState: function() {
            var cell = this.get('owner.resizingCell');
            var $table = cell.closest('table');
            var columns = $table.find('col');

            if (this.get('owner.type') === 'column') {
                var column = parseInt(cell.attr('data-leaf-index'), 10);
                this.set('resizingColumn', columns.eq(column));
            } else {
                var totalDepth = columns.length;
                var cells = [];
                $table.find('td').each(function() {
                    var $cell = $(this);
                    if (!$cell.attr('colspan')) cells.push($cell);
                    if (cells.length === totalDepth) return false;
                });
                this.set('cells', cells);

                // Get column index for resized cell
                // must account for row headers spanning multiple columns to get the right leafIndex and width
                var remainingDepth = 0;
                cell.nextAll().each(function() {
                    remainingDepth += $(this).attr('colspan') || 1;
                });
                var leafIndex = totalDepth - remainingDepth - 1;

                this.set('resizingColumn', columns.eq(leafIndex));
                this.set('owner.resizingCell', cells[leafIndex]);
                this.set('owner.startX', cells[leafIndex].get(0).clientWidth + 1);
            }
        },

        mouseMove: function(event) {
            var owner = this.get('owner');
            var deltaX = event.pageX - owner.get('dragStartX');
            var minWidth = owner.get('MIN_COLUMN_WIDTH');
            var cellWidth = owner.get('startX') + deltaX;
            if (cellWidth < minWidth) cellWidth = minWidth;
            // Adjust size of the cell
            if (owner.get('type') === 'column') { // Update data table column width
                this.get('resizingColumn').css('width', cellWidth);
                owner._synchronizeColumnWidth(cellWidth);
            } else {
                var width = owner.get('offset') + cellWidth - owner.get('startX');

                // Move data table and column header
                owner.get('scrollable').css('left', width);
                owner.get('columnHeader').parent().css('left', width);
                owner.get('tableCorner').css('width', width);

                this.get('resizingColumn').css('width', cellWidth);
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
                    var widths = this.get('cells').map(function(cell) { return cell.outerWidth(); });
                    resizeDelegate.rowHeaderResized(widths);
                }
            }
            this.gotoFlameState('idle');
            return true;
        }
    }),

    setColumnWidth: function(columnIndex, cellWidth) {
        this.$('.column-header col').eq(columnIndex).css('width', cellWidth + 3);
        var table = this.objectAt(0);
        table.updateColumnWidth(columnIndex, cellWidth + 3);
    },

    getColumnContents: function(columnHeader) {
        return this.get('content.tableData').map(function(e) {
            var elem = e[columnHeader.leafIndex];
            return Ember.isNone(elem) ? '' : elem.formattedValue();
        });
    },

    getLeafHeaderLabel: function(header) {
        var leaf = this.get('content.columnLeafs')[header.leafIndex];
        return leaf.get('headerLabel');
    },

    _synchronizeColumnWidth: function(width) {
        // Update data table columns
        var cell = this.get('resizingCell');
        var table = this.objectAt(0);
        var index = parseInt(cell.attr('data-leaf-index'), 10);
        table.updateColumnWidth(index, width);
    },

    willInsertElement: unbindScroll,
    willDestroyElement: unbindScroll,

    didInsertElement: function() {
        this.set('scrollable', this.$('.scrollable'));
        this.set('rowHeader', this.$('.row-header table'));
        this.set('columnHeader', this.$('.column-header table'));
        this.set('tableCorner', this.$('.table-corner'));
        this.get('scrollable').on('scroll', jQuery.proxy(this.didScroll, this));
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
            this.get('rowHeader').css('top', -this.lastScrollTop);
            this.lastSetScrollTop = this.lastScrollTop;
        }
        if (this.lastScrollLeft !== this.lastSetScrollLeft) {
            this.get('columnHeader').css('left', -this.lastScrollLeft);
            this.lastSetScrollLeft = this.lastScrollLeft;
        }
        this.isScrolling = false;
    },

    render: function(buffer) {
        var renderColumnHeader = this.get('renderColumnHeader');
        var renderRowHeader = this.get('renderRowHeader');
        var didRenderTitle = false;

        var headers = this.get('contentAdapter.headers');
        if (!headers) {
            return; // Nothing to render
        }

        if (this.get('content.title')) {
            buffer.push('<div class="panel-title">%@</div>'.fmt(Handlebars.Utils.escapeExpression(this.get('content.title'))));
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
            buffer.push('<div class="table-corner" style="top: %@px; left: 0; height: %@px; width: %@px;"></div>'.fmt(topOffset, columnHeaderHeight, leftOffset));
            // Column headers
            this._renderHeader(buffer, 'column', leftOffset, defaultColumnWidth);
            topOffset += columnHeaderHeight;
        }
        if (renderRowHeader) {
            // Row headers
            this._renderHeader(buffer, 'row', topOffset, defaultRowHeaderWidth);
        }

        // Scrollable div
        buffer.push('<div class="scrollable" style="overflow: auto; bottom: 0; top: %@px; left: %@px; right: 0;">'.fmt(topOffset, leftOffset));
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
                buffer.push('<col style="width: %@px;">'.fmt(this.get('content.columnLeafs')[i].get('render_width') || defaultColumnWidth));
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
            // We have to support <br> for row headers, so we'll replace them back after escaping
            headerLabel = Ember.Handlebars.Utils.escapeExpression(headerLabel).replace(/&lt;br&gt;/g, '<br>');
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
                    var activeSort = headerSortDelegate.getSortForHeader(header);
                    sortDirection = activeSort ? activeSort.direction : null;
                }
                var sortClass = sortDirection ? 'sort-%@'.fmt(sortDirection) : '';
                label = '<div class="label ' + sortClass + '">%@</div>';
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
                        label = '%@';
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
