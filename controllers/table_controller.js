/**
  A controller that you need to use when displaying an Flame.TableView. You need to
  define _headers property and call pushDataBatch to render data (can be called
  several times to render data in batches). The headers should be Flame.TableHeader
  objects.

  There are two refined subclasses of this controller, DataTableController and
  ArrayTableController, which you may find easier to use for simple tables.
*/
Flame.TableController = Ember.Object.extend({
    dirtyCells: [],
    valuesOn: 'column',
    isLoading: false,

    /**
      Takes in an array of cell value objects, e.g.
      [{path: [2,3,8,5], value: 'MRP', count: 1, all_equal: true}, {...}]

      This data is converted to a 2-dimensional array of cells, where each cell
      is either null or an instance of the Cell class (null values represent
      cells for which data has not yet been pushed). The cell instances are
      created by calling TableHeader#createCell for either the corresponding
      row or column header (depending on 'valuesOn' property).

      The path given in the cell value object will be translated to a coordinate
      in the grid of cells. This index will be added to the dirtyCells property,
      which is an array that is used as a FIFO queue. This dirtyCells array is
      used when rendering to only update the cells that have changed since the
      last render.
    */
    pushDataBatch: function(dataBatch) {
        if (dataBatch !== undefined) {
            var headers = this.get('_headers');
            if (!headers) {
                throw "Can't push data without first setting headers!";
            }

            if (!this._dataBatchIsForCurrentTable(dataBatch)) return;

            var dirtyCells = this.get('dirtyCells').slice(); // clone array
            var valuesOn = this.get('valuesOn');
            var fields = this.get(valuesOn + 'Leafs');
            var rowLeafs = this.get('rowLeafs');
            var columnLeafs = this.get('columnLeafs');

            var _data = this.get('_data');
            var length = dataBatch.length;
            var mapping = this.get("_indexFromPathMapping");
            var cell, index;
            var existingObject;
            for (var i = 0; i < length; i++) {
                cell = dataBatch[i];
                index = mapping[cell.path.row][cell.path.column];
                cell.rowHeaderParams = rowLeafs[index[0]].params;
                cell.columnHeaderParams = columnLeafs[index[1]].params;
                cell = fields[index[valuesOn === 'row' ? 0 : 1]].createCell(cell);
                // Cell attributes might have been updated before it's loaded (for example isUpdating might be set while data is still being batched),
                // in this case pending attributes are recorded in a placeholder object with "pending" attribute.
                existingObject = _data[index[0]][index[1]];
                if (existingObject && existingObject.pending) {
                    for (var pendingAttributeName in existingObject.pending) {
                        cell[pendingAttributeName] = existingObject.pending[pendingAttributeName];
                    }
                }
                _data[index[0]][index[1]] = cell;
                dirtyCells.push(index);
            }
            this.set('dirtyCells', dirtyCells);
        }
    },

    // If the table is changed (e.g. by loading another data set into it) during batching,
    // it can get out of sync - i.e. callbacks receive batches for now obsolete cells, which in turn would
    // crash the UI as it would try to access missing cells.
    // Here we'll ensure that the batch belongs actually to current table by checking if first AND last
    // item in the batch are accessible.
    _dataBatchIsForCurrentTable : function(dataBatch) {
        var length = dataBatch.length;
        var mapping = this.get("_indexFromPathMapping");
        return length > 0 ? mapping[dataBatch[0].path.row] && mapping[dataBatch[length-1].path.row] : false;
    },

    _indexFromPathMapping: function() {
        // To use an object as a map, each key needs to have a unique toString()-value. As arrays translate into
        // comma-separated list of their content and our content is just simple numbers and each number has a unique
        // string representation, we can use the path arrays here directly.
        var mapping = {};
        var rowLeafs = this.get('rowLeafs');
        var rowLeafsLen  = rowLeafs.length;
        var columnLeafs = this.get('columnLeafs');
        var columnLeafsLen = columnLeafs.length;

        var i, j;
        var rowCell, colCell;
        var rowMapping;
        for (i = 0; i < rowLeafsLen; i++) {
            rowCell = rowLeafs[i];
            rowMapping = mapping[rowCell.path] = {};
            for (j = 0; j < columnLeafsLen; j++) {
                colCell = columnLeafs[j];
                rowMapping[colCell.path] = [i, j];
            }
        }
        return mapping;
    }.property("rowLeafs", "columnLeafs").cacheable(),

    rowLeafs: function() {
        var headers = this.get('_headers');
        if (!headers) { return null; }
        return this._getLeafs(headers.rowHeaders, []);
    }.property('_headers').cacheable(),

    columnLeafs: function() {
        var headers = this.get('_headers');
        if (!headers) { return null; }
        return this._getLeafs(headers.columnHeaders, []);
    }.property('_headers').cacheable(),

    pathFromIndex: function(index) {
        var rowLeafs = this.get('rowLeafs');
        var columnLeafs = this.get('columnLeafs');
        return {row: rowLeafs[index[0]].path, column: columnLeafs[index[1]].path};
    },

    // Translate a path to an index in the 2-dimensional grid of data
    // see path documentation in table_data.rb for more information
    indexFromPath: function(path) {
        var mapping = this.get("_indexFromPathMapping");
        return mapping[path.row][path.column];
    },

    // Collect leaf nodes and record path to get to each leaf
    _getLeafs: function(nodes, path) {
        var node, length = nodes.length;
        var leafs = [];
        var i;
        for (i = 0; i < length; i++) {
            node = nodes[i];
            if (node.hasOwnProperty('children')) {
                var newPath = node.hasOwnProperty('id') ? path.concat(node.id) : path;
                leafs = leafs.concat(this._getLeafs(node.children, newPath));
            } else {
                node.path = path.concat(node.id);
                leafs.push(node);
            }
        }
        // Mark the leaf index
        for (i = 0; i < leafs.length; i++) {
            leafs[i].leafIndex = i;
        }
        return leafs;
    },

    // When setting headers, resolve refs and record extra information to make rendering easier
    _headersDidChange: function() {
        var headers = this.get('_headers');
        if (!Ember.none(headers)) {
            var data = [];
            this.set('dirtyCells', []);

            // fill this.data with nulls, will be fetched lazily later
            var rowLength = this.get('rowLeafs').length;
            var columnLength = this.get('columnLeafs').length;
            for (i = 0; i < rowLength; i++) {
                data.push([]);
                for (var j = 0; j < columnLength; j++) {
                    data[i].push(null);
                }
            }
            this.set('_data', data);
        }
    }.observes('_headers')
});
