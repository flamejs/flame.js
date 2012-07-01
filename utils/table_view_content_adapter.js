Flame.TableViewContentAdapter = Ember.Object.extend({
    content: null,

    headers: function() {
        return this.getPath('content._headers');
    }.property('content._headers').cacheable(),

    columnLeafs: function() {
        return this.getPath('content.columnLeafs');
    }.property('content.columnLeafs').cacheable(),

    rowLeafs: function() {
        return this.getPath('content.rowLeafs');
    }.property('content.rowLeafs').cacheable(),

    columnHeaderRows: function() {
        var columnHeaderRows = [];
        var headers = this.get('headers');
        var columnHeaders = headers.columnHeaders;
        var columnHeadersLength = columnHeaders.length;
        var i;
        for (i = 0; i < columnHeadersLength; i++) {
            this._processHeader(columnHeaderRows, columnHeaders[i], 'columns', 0);
        }

        columnHeaderRows.maxDepth = this.get('columnLeafs').map(function (x) { return x.depth; }).max();
        for (i = 0; i < this.get('columnLeafs').length; i++) {
            var colLeaf = this.get('columnLeafs')[i];
            colLeaf.rowspan = columnHeaderRows.maxDepth - colLeaf.depth + 1;
        }

        return columnHeaderRows;
    }.property('headers').cacheable(),

    rowHeaderRows: function() {
        var rowHeaderRows = [[]];
        var headers = this.get('headers');
        var rowHeaders = headers.rowHeaders;
        var rowHeadersLength = rowHeaders.length;
        var i;
        for (i = 0; i < rowHeadersLength; i++) {
            this._processHeader(rowHeaderRows, rowHeaders[i], 'rows', 0, i === 0);
        }

        rowHeaderRows.maxDepth = this.get('rowLeafs').map(function (x) { return x.depth; }).max();
        for (i = 0; i < this.get('rowLeafs').length; i++) {
            var rowLeaf = this.get('rowLeafs')[i];
            rowLeaf.colspan = rowHeaderRows.maxDepth - rowLeaf.depth + 1;
        }

        return rowHeaderRows;
    }.property('headers').cacheable(),

    clear: function() {
        this._headers = null;
        this.propertyDidChange('headers');
    },

    /**
      Calculate the colspan (rowspan) attribute to be used when rendering.
      Rowspan (colspan) will be calculated later on.
      Store the headers in a structure similar to the way they will be rendered,
      i.e. (for column headers) an array of rows where each row is an array of cells.
    */
    _processHeader: function(headerRows, header, type, depth, isFirst) {
        header.depth = depth + 1;

        // This representation is much easier to render
        if (type === 'columns') {
            if (!headerRows[depth]) { headerRows[depth] = []; }
            headerRows[depth].push(header);
        } else if (type === 'rows') {
            if (!isFirst) { headerRows.push([]); }
            headerRows[headerRows.length-1].push(header);
        }

        var count = 0;
        if (header.hasOwnProperty('children')) {
            var children = header.children;
            var length = children.length;
            for (var i = 0; i < length; i++) {
                var child = children[i];
                count += this._processHeader(headerRows, child, type, depth + 1, i === 0);
            }
        } else { count = 1; }

        if (type === 'columns') {
            header.colspan = count;
        } else {
            header.rowspan = count;
        }

        return count;
    }
});
