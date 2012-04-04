//= require ./table_controller

/*
  A helper class that accepts the table data as a two-dimensional array (array of rows, where
  each row is an array of cell values for that row). Example:

  Flame.TableView.extend({
      content: Flame.DataTableController.create({
          headers: {
              columnHeaders: [{label: 'Col1'}, {label: 'Col2'}],
              rowHeaders: [{label: 'Row1'}, {label: 'Row2'}, {label: 'Row3'}]
          },
          data: [
              ['cell1', 'cell2'],
              ['cell3', 'cell4'],
              ['cell5', 'cell6']
          ]
      })
  })

  If you need a bit of customization, you can override properties 'headerClass' and 'cellClass'.
  Also have a look at ArrayTableController.
 */
Flame.DataTableController = Flame.TableController.extend({
    headers: null,
    data: null,

    init: function() {
        this._super();
        this._headersDidChange();
    },

    _headers: function() {
        var headers = this.get('headers');
        return {
            rowHeaders: this._wrapHeaders(headers.rowHeaders || []),
            columnHeaders: this._wrapHeaders(headers.columnHeaders || [])
        };
    }.property('headers').cacheable(),

    _wrapHeaders: function(headers) {
        var self = this;
        var headerClass = this.get('headerClass');
        return headers.map(function(header, i) {
            var wrapped = headerClass.create({id: i}, header);
            var children = wrapped.get('children');
            if (children) {
                wrapped.set('children', self._wrapHeaders(children));
            }
            return wrapped;
        });
    },

    headerClass: function() {
        var cellClass = this.get('cellClass');
        return Flame.TableHeader.extend({
            createCell: function(cellData) {
                return new cellClass({value: cellData.value});
            }
        });
    }.property().cacheable(),

    cellClass: Flame.TableCell,

    _transformData: function(data) {
        var flatData = [];
        data.forEach(function(row, i) {
            row.forEach(function(cellValue, j) {
                flatData.push({ path: {row: [i], column: [j]}, value: cellValue });
            });
        });
        return flatData;
    },

    _headersDidChange: function() {
        this._super();
        var data = this.get('data');
        if (data) {
            // We push all the data in one batch as we don't need to go fetching it from anywhere
            this.pushDataBatch(this._transformData(data));
        }
    }.observes('headers')

});
