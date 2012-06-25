//= require ./data_table_controller
//= require ../utils/table_sort_support

Flame.ArrayTableController = Flame.DataTableController.extend(Flame.TableSortSupport, {
    content: [],  // Set to an array of objects to display (rows)
    columns: [],  // Set to an array of labels+properties to display for each object (columns)
                  // e.g. {property: 'firstName', label: 'First Name'}

    headerProperty: null,  // What to display on the (row) headers
    rowHeadersClickable: false,

    init: function() {
        this._super();
        this._setContentObserver(); // set content observer for initially given content array
    },

    headers: function() {
        var headerProperty = this.get('headerProperty');
        Ember.assert('headerProperty not defined for ArrayTableAdapter!', !!headerProperty);
        var rowHeadersClickable = this.get('rowHeadersClickable');
        var self = this;
        return {
            rowHeaders: this.get('content').map(function(object, i) {
                // headers won't update in-place, have to force rerender via observer
                var originalValue = object.get(headerProperty);
                var observerMethod = function() {
                    return function(sender, key, value) {
                        // relies on ArrayTableController#headers being recreated when headers change
                        if (value !== originalValue) {
                            self.refreshHeaders();
                        }
                    };
                }();
                self._setPropertyObserver(object, headerProperty, observerMethod);
                return {
                    isClickable: rowHeadersClickable,
                    label: object.get(headerProperty),
                    object: object
                };
            }),
            columnHeaders: this.get('columns').map(function(column, i) {
                return {label: Ember.getPath(column, 'label'), property: Ember.getPath(column, 'property')};
            })
        };
    }.property('content.@each', 'columns', 'headerProperty', 'rowHeadersClickable').cacheable(),

    data: function() {
        var self = this;
        var columns = this.get('columns');
        return this.get('content').map(function(object, i) {
            return columns.map(function(column, j) {
                // add observer for in-place cell refreshing
                var propertyName = Ember.getPath(column, 'property');
                var observerMethod = function() {
                    return function(sender, key, value) {
                        self.pushDataBatch([{path: {row: [i], column: [j]}, value: value}]);
                    };
                }();
                self._setPropertyObserver(object, propertyName, observerMethod);

                return Ember.get(object, Ember.getPath(column, 'property'));
            });
        });
    }.property('headers').cacheable(),

    _setPropertyObserver: function(object, propertyName, observerMethod) {
        var observerName = propertyName + "DidChangeInArrayTableController"; // extra suffix for avoiding name conflicts
        object.removeObserver(propertyName, object, observerName);
        object[observerName] = observerMethod;
        object.addObserver(propertyName, object, observerName);
    },

    // Removes all observers that were added via _setPropertyObserver.
    _removePropertyObservers: function(object) {
        var observerRegex = /(.+)DidChangeInArrayTableController$/;
        for (var objProperty in object) {
            if (object.hasOwnProperty(objProperty)) {
                if (observerRegex.test(objProperty)) {
                    var propertyName = observerRegex.exec(objProperty)[1];
                    object.removeObserver(propertyName, object, objProperty);
                    delete object[objProperty];
                }
            }
        }
    },

    // remove observers from objects that were removed from content array
    _contentArrayWillChange: function(content, start, removed, added) {
        var lim = start + removed;
        for (var i = start; i < lim; i++) {
            this._removePropertyObservers(content.objectAt(i));
        }
    },

    _setContentObserver: function() {
        var content = this.get('content');
        if (content) {
            content.addArrayObserver(this, {
                willChange: '_contentArrayWillChange',
                didChange: Ember.K
            });
        }
    }.observes('content'),

    _removeContentObserver: function() {
        var content = this.get('content');
        if (content) {
            content.removeArrayObserver(this, {
                willChange: '_contentArrayWillChange',
                didChange: Ember.K
            });
            // have to remove observers from the old array's objects as well
            content.forEach(this._removePropertyObservers, this);
        }
    }.observesBefore('content'),

    sortContent: function(sortDescriptor) {
        var property = sortDescriptor.header.get('property');
        var orderFactor = sortDescriptor.order === 'desc' ? -1 : 1;

        // Directly sorting the array bypasses all observers, better make a copy, sort that & set back
        var contentCopy = this.get('content').slice();
        contentCopy.sort(function(o1, o2) {
            return orderFactor * Ember.compare(Ember.get(o1, property), Ember.get(o2, property));
        });
        this.set('content', contentCopy);
    },

    refreshHeaders: function() {
        this.propertyWillChange('headers');
        this.propertyDidChange('headers');
    }

});
