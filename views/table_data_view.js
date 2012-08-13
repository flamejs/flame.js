Flame.TableDataView = Flame.View.extend(Flame.Statechart, {
    classNames: ['flame-table-data-view'],
    acceptsKeyResponder: true,
    batchUpdates: true,
    updateBatchSize: 500,
    _updateCounter: 0,
    selectedCell: null,
    editValue: null,
    contentBinding: '^content',

    initialState: 'loaded',

    loaded: Flame.State.extend({
        mouseDown: function(event) {
            if (this.get('owner').selectCell(jQuery(event.target))) {
                this.gotoState('selected');
                return true;
            } else { return false; }
        },

        enterState: function() {
            if (this.getPath('owner.state') === "inDOM") {
                this.getPath('owner.selection').hide();
            }
        }
    }),

    selected: Flame.State.extend({
        mouseDown: function(event) {
            var target = jQuery(event.target);
            var selectedDataCell = this.getPath('owner.selectedDataCell');
            // If a cell is clicked that was already selected, start editing it
            if (target.hasClass('table-selection') && selectedDataCell.options && selectedDataCell.options()) {
                this.startEdit();
                return true;
            } else return !!this.get('owner').selectCell(target);
        },

        insertNewline: function(event) {
            return this.startEdit();
        },

        deleteBackward: function(event) {
            this.wipeCell();
            return true;
        },

        deleteForward: function(event) {
            this.wipeCell();
        },

        wipeCell: function() {
            var dataCell = this.getPath('owner.selectedDataCell');
            if (Ember.none(dataCell)) {
                return;
            }

            if (dataCell.isEditable()) {
                this.get('owner')._validateAndSet("");
            }
        },

        doubleClick: function() {
            this.startEdit();
        },

        startEdit: function(event) {
            var dataCell = this.getPath('owner.selectedDataCell');
            if (Ember.none(dataCell)) {
                return;
            }
            if (dataCell.isEditable()) {
                this.gotoState('editing');
            } else if (!dataCell.options()) {
                this.gotoState('selectingReadOnly');
            }
        },

        cancel: function(event) {
            this.get('owner').resignKeyResponder();
            return true;
        },

        moveLeft: function(event) {
            var selectedCell = this.getPath('owner.selectedCell');
            this.get('owner').selectCell(selectedCell.prev());
            return true;
        },

        moveRight: function(event) {
            var selectedCell = this.getPath('owner.selectedCell');
            this.get('owner').selectCell(selectedCell.next());
            return true;
        },

        moveDown: function(event) {
            var selectedCell = this.getPath('owner.selectedCell');
            this.get('owner').selectCell(jQuery(selectedCell.parent().next().children()[selectedCell.attr('data-index')]));
            return true;
        },

        moveUp: function(event) {
            var selectedCell = this.getPath('owner.selectedCell');
            this.get('owner').selectCell(jQuery(selectedCell.parent().prev().children()[selectedCell.attr('data-index')]));
            return true;
        },

        insertTab: function(event) {
            this.get('owner').invokeStateMethodByValuesOn('moveDown', 'moveRight');
            return true;
        },

        insertBacktab: function(event) {
            this.get('owner').invokeStateMethodByValuesOn('moveUp', 'moveLeft');
            return true;
        },

        // We need to use the keyPress event, as some browsers don't report the character pressed correctly with keyDown
        keyPress: function(event) {
            var dataCell = this.getPath('owner.selectedDataCell');
            if (Ember.none(dataCell) || (dataCell && !dataCell.isEditable())) {
                return false;
            }
            var key = String.fromCharCode(event.which);
            if (event.metaKey) { return false; }
            if (key.match(/[a-zA-Z0-9+*\-\[\/\=]/)) {
                var owner = this.get('owner');
                owner.set('editValue', key);
                this.startEdit();
                return true;
            }
            return false;
        },

        enterState: function() {
            this.getPath('owner.selection').show();
        }
    }),

    // Used to allow users to select text from read-only cells
    selectingReadOnly: Flame.State.extend({
        cancel: function(event) {
            this.get('owner')._cancelEditingOrSelecting();
            return true;
        },

        insertNewline: function(event) {
            var owner = this.get('owner');
            this.gotoState('selected');
            owner.invokeStateMethodByValuesOn('moveRight', 'moveDown');
        },

        moveLeft: function(event) {
            this._invokeInSelected('moveLeft');
        },

        moveRight: function(event) {
            this._invokeInSelected('moveRight');
        },

        moveDown: function(event) {
            this._invokeInSelected('moveDown');
        },

        moveUp: function(event) {
            this._invokeInSelected('moveUp');
        },

        insertTab: function(event) {
            this._invokeInSelected('insertTab');
        },

        insertBacktab: function(event) {
            this._invokeInSelected('insertBacktab');
        },

        deleteBackward: function(event) {
            this.gotoState('selected');
            return true;
        },

        mouseDown: function(event) {
            var owner = this.get('owner');
            var cell = jQuery(event.target);
            if (owner.isCellSelectable(cell)) {
                this.gotoState('selected');
                owner.selectCell(cell);
                return true;
            } else {
                return false;
            }
        },

        enterState: function() {
            var owner = this.get('owner');
            var selection = owner.get('selection');
            var dataCell = owner.get('selectedDataCell');
            var readOnlyValue = owner.editableValue(dataCell, true);
            selection.html(readOnlyValue);
            selection.addClass('read-only is-selectable');
        },

        exitState: function() {
            var selection = this.getPath('owner.selection');
            selection.html('');
            selection.removeClass('read-only is-selectable');
        },

        _invokeInSelected: function(action) {
            var owner = this.get('owner');
            this.gotoState('selected');
            owner.invokeStateMethod(action);
        }
    }),

    editing: Flame.State.extend({
        cancel: function(event) {
            this.get('owner')._cancelEditingOrSelecting();
            return true;
        },

        insertNewline: function(event) {
            var owner = this.get('owner');
            if (owner._confirmEdit()) {
                this.gotoState('selected');
                owner.invokeStateMethodByValuesOn('moveRight', 'moveDown');
            }
            return true;
        },

        insertTab: function(event) {
            var owner = this.get('owner');
            if (owner._confirmEdit()) {
                this.gotoState('selected');
                owner.invokeStateMethod('insertTab');
            }
            return true;
        },

        insertBacktab: function(event) {
            var owner = this.get('owner');
            if (owner._confirmEdit()) {
                this.gotoState('selected');
                owner.invokeStateMethod('insertBacktab');
            }
            return true;
        },

        mouseDown: function(event) {
            var owner = this.get('owner');
            var cell = jQuery(event.target);
            if (owner.isCellSelectable(cell) && owner._confirmEdit()) {
                this.gotoState('selected');
                owner.selectCell(cell);
                return true;
            } else { return false; }
        },

        enterState: function() {
            var owner = this.get('owner');
            var selectedCell = owner.get('selectedCell');
            var dataCell = owner.get('selectedDataCell');
            var editCell = owner.get('editField');
            var scrollable = owner.getPath('parentView.scrollable');
            var selection = owner.get('selection');
            var options = dataCell.options();

            if (!dataCell.showEditor(selectedCell, owner, owner.get('content'))) {
                // No special editor, use one of the defaults
                if (options) { // Drop down menu for fields with a fixed set of options
                    var menu = Flame.MenuView.create({
                        minWidth: selectedCell.outerWidth(),
                        parent: owner, // Reference to the cube table view
                        items: options.map(function(o) {
                            return {
                                title: o[0],
                                value: o[1],
                                isChecked: o[1] === dataCell.value,
                                action: function() { owner.didSelectMenuItem(this.get('value')); }
                            };
                        }),
                        // Make the cube table view go back to the selected state when the menu is closed
                        close: function() { this.get('parent').gotoState('selected'); this._super(); }
                    });
                    menu.popup(selectedCell);
                } else { // Normal edit field for everything else
                    var backgroundColor = selectedCell.css('backgroundColor');

                    // If background color is unset, it defaults to transparent. Different browser have different
                    // ways of saying "transparent". Let's assume "transparent" actually means "white".
                    if (['rgba(0, 0, 0, 0)', 'transparent'].contains(backgroundColor)) {
                        backgroundColor = 'white';
                    }

                    editCell.css({
                        left: parseInt(selection.css('left'), 10) + parseInt(selection.css('border-left-width'), 10) + 'px',
                        top: parseInt(selection.css('top'), 10) + parseInt(selection.css('border-top-width'), 10) + 'px',
                        width: selection.outerWidth() - parseInt(selection.css('border-left-width'), 10) - parseInt(selection.css('border-right-width'), 10) + 'px',
                        height: selection.outerHeight() - parseInt(selection.css('border-top-width'), 10) - parseInt(selection.css('border-bottom-width'), 10) + 'px',
                        backgroundColor: backgroundColor
                    });
                    var editValue = owner.editableValue(dataCell);

                    editCell.val(editValue);
                    owner.set('editValue', null);
                    editCell.show();
                    // Put cursor at end of value
                    editCell.selectRange(1024, 1024);
                }
            }
        },

        exitState: function() {
            var owner = this.get('owner');
            var editField = owner.get('editField');

            editField.hide();
            editField.removeClass('invalid');
        }
    }),

    didSelectMenuItem: function(value) {
        var editField = this.get('editField');
        editField.val(value || '');
        this._confirmEdit();
        this.invokeStateMethodByValuesOn('moveRight', 'moveDown');
    },

    willLoseKeyResponder: function() {
        this.set('selectedCell', null);
        this.gotoState('loaded');
    },

    // Get the Cell instance that corresponds to the selected cell in the view
    selectedDataCell: function() {
        var selectedCell = this.get('selectedCell');
        return this.get('data')[selectedCell.parent().attr('data-index')][selectedCell.attr('data-index')];
    }.property(),

    editableValue: function(dataCell, readOnly) {
        var editValue = this.get('editValue');
        if (editValue !== null) {
            return editValue;
        } else {
            editValue = readOnly ? dataCell.formattedValue() : dataCell.editableValue();
            return !Ember.none(editValue)? editValue : '';
        }
    },

    didInsertElement: function() {
        this.set('selection', this.$('.table-selection'));
        this.set('editField', this.$('.table-edit-field'));
    },

    _selectionDidChange: function() {
        var selectedCell = this.get('selectedCell');
        if (!selectedCell) {
            return;
        }
        var selection = this.get('selection');
        var scrollable = this.getPath('parentView.scrollable');

        var position = selectedCell.position();
        var scrollTop = scrollable.scrollTop();
        var scrollLeft = scrollable.scrollLeft();

        var offset = jQuery.browser.webkit ? 1 : 2;
        selection.css({
            left: position.left + scrollLeft - offset + 'px',
            top: position.top + scrollTop - offset + 'px',
            width: selectedCell.outerWidth() - 3 + 'px',
            height: selectedCell.outerHeight() - 1 + 'px'
        });

        // Ensure the selection is within the visible area of the scrollview
        if (position.top < 0) {
            scrollable.scrollTop(scrollTop + position.top);
        } else if (position.top + selectedCell.outerHeight() > scrollable.outerHeight()) {
            var top = position.top + selectedCell.outerHeight() - scrollable.outerHeight();
            scrollable.scrollTop(top + scrollTop + 17);
        } else if (position.left < 0) {
            scrollable.scrollLeft(scrollLeft + position.left);
        } else if (position.left + selectedCell.outerWidth() > scrollable.outerWidth()) {
            var left = position.left + selectedCell.outerWidth() - scrollable.outerWidth();
            scrollable.scrollLeft(left + scrollLeft + 17);
        }
    }.observes('selectedCell'),

    _confirmEdit: function() {
        var newValue = this.get('editField').val();
        return this._validateAndSet(newValue);
    },

    // Returns true if cell valid, or false otherwise
    _validateAndSet: function(newValue) {
        var data = this.get('data');
        var selectedCell = this.get('selectedCell');
        var columnIndex = parseInt(selectedCell.attr('data-index'), 10);
        var rowIndex = parseInt(selectedCell.parent().attr('data-index'), 10);
        var dataCell = data[rowIndex][columnIndex];

        // Skip saving if value has not been changed
        if (Ember.compare(dataCell.editableValue(), newValue) === 0) {
            return true;
        } else if (dataCell.validate(newValue)) {
            var cellUpdateDelegate = this.get('cellUpdateDelegate');
            Ember.assert('No cellUpdateDelegate set!', !!cellUpdateDelegate);

            var index = [rowIndex, columnIndex];
            if (cellUpdateDelegate.cellUpdated(dataCell, newValue, index)) {
                var dirtyCells = this.get('dirtyCells').slice();
                dirtyCells.push([rowIndex, columnIndex]);
                this.set('dirtyCells', dirtyCells);
            }

            return true;
        } else {
            this.get('editField').addClass('invalid');
            return false;
        }
    },

    _cancelEditingOrSelecting: function() {
        this.gotoState('selected');
    },

    invokeStateMethodByValuesOn: function(onRowsState, onColumnsState) {
        if (this.get('areValuesOnRows')) {
            this.invokeStateMethod(onRowsState);
        } else {
            this.invokeStateMethod(onColumnsState);
        }
    },

    selectCell: function(newSelection) {
        // TODO click can also come from element in a table cell
        if (this.getPath('parentView.allowSelection') && this.isCellSelectable(newSelection)) {
            this.set('selectedCell', newSelection);
            return true;
        }
        return false;
    },

    isCellSelectable: function(cell) {
        return cell && cell[0] && cell[0].nodeName === 'TD';
    },

    updateColumnWidth: function(index, width) {
        var cells = this.$('td[data-index=%@]'.fmt(index));
        cells.css({'width': '%@px'.fmt(width)});
        this.propertyDidChange('selectedCell'); // Let the size of the selection div be updated
    },

    render: function(buffer) {
        this._renderElementAttributes(buffer);
        this.set('selectedCell', null);
        this.gotoState('loaded');
        this._renderTable(buffer);
    },

    _renderTable: function(buffer) {
        var data = this.get('data');
        if (!data) { return buffer; }
        var rowCount = data.length;
        if (!data[0]) {
            return buffer;
        }
        var columnCount = data[0].length;
        var defaultCellWidth = this.getPath('parentView.defaultColumnWidth');
        var columnLeafs = this.getPath('parentView.content.columnLeafs');
        var cellWidth;

        var classes = 'flame-table';
        if (!this.getPath('parentView.allowSelection')) { classes += ' is-selectable'; }
        buffer = buffer.begin('table').attr('class', classes).attr('width', '1px');
        var i, j;
        for (i = 0; i < rowCount; i++) {
            buffer.push('<tr data-index="'+i+'">');
            for (j = 0; j < columnCount; j++) {
                var cell = data[i][j];
                var cssClassesString = cell ? cell.cssClassesString() : "";
                cellWidth = columnLeafs[j].get('render_width') || defaultCellWidth;
                if (jQuery.browser.mozilla) cellWidth -= 5;

                buffer.push('<td data-index="%@" class="%@" style="width: %@px;" %@>%@</td>'.fmt(
                        j,
                        (cssClassesString + (j % 2 === 0 ? " even-col" : " odd-col")),
                        cellWidth,
                        (cell && cell.titleValue ? 'title="%@"'.fmt(cell.titleValue()) : ''),
                        (cell ? cell.formattedValue() : '<span style="color: #999">...</span>')));
            }
            buffer.push("</tr>");
        }
        buffer = buffer.end(); // table

        // Selection indicator
        buffer = buffer.begin('div').attr('class', 'table-selection').end();

        // Edit field (text)
        buffer = buffer.begin('input').attr('class', 'table-edit-field').end();
    },

    // Update dirty cells
    _cellsDidChange: function() {
        this.manipulateCells(this.get('dirtyCells'), function(cell, element, isEvenColumn) {
            var cssClassesString = (cell ? cell.cssClassesString() : "") + (isEvenColumn ? " even-col" : " odd-col");
            var formattedValue = cell.formattedValue();
            var titleValue = cell.titleValue && cell.titleValue();
            element.className = cssClassesString;
            element.innerHTML = Ember.none(formattedValue) ? "" : formattedValue;
            if (titleValue) {
                element.title = titleValue;
            }
        }, ++this._updateCounter);
    }.observes('dirtyCells'),

    // Mark and disable updating cells
    _updatingCellsDidChange: function() {
        this.manipulateCells(this.get('cellsMarkedForUpdate'), function(cell, element, isEvenColumn) {
            if (cell.pending) {
                // Cell isn't loaded yet, insert a placeholder value
                cell.pending.isUpdating = true;
                element.className += (isEvenColumn ? " even-col" : " odd-col");
            } else {
                cell.isUpdating = true;
                var cssClassesString = cell.cssClassesString() + (isEvenColumn ? " even-col" : " odd-col");
                element.className = cssClassesString;
            }
        });
    }.observes('cellsMarkedForUpdate'),

    manipulateCells: function(cellRefs, callback, updateCounter) {
        var data = this.get('data');
        if (!cellRefs || cellRefs.length === 0) { return; }
        var table = this.$('table.flame-table');

        var allCells = table.find('td');
        // Everyone expects that the cellRefs array is empty when we return from this function. We still need the
        // content so save it elsewhere.
        var content = cellRefs.splice(0, cellRefs.length);
        var updateBatchSize = this.get('batchUpdates') ? this.get('updateBatchSize') : -1;
        this._batchUpdate(updateBatchSize, 0, updateCounter, content, data, allCells, callback);
    },

    _batchUpdate: function(maxUpdates, startIx, updateCounter, cellRefs, data, allCells, callback) {
        if (typeof updateCounter !== "undefined" && updateCounter != this._updateCounter) { return; }
        // If we for some reason update / change the table before all these calls have gone through, we may update
        // nodes that no longer exist in DOM but that shouldn't cause problems.
        var len = cellRefs.length;
        var element, index, cell;
        var columnLength = data[0].length;
        // If maxUpdates is -1, we fetch everything in one batch
        var upTo = maxUpdates === -1 ? len : maxUpdates;

        for (var i = startIx; i < len && (i - startIx) < upTo; i++) {
            index = cellRefs[i];
            var x = index[0], y = index[1];
            if (!data[x][y]) {
                // Possibly updating a cell that's still being batch loaded, insert a placeholder for update attributes
                data[x][y] = {pending: {}};
            }
            cell = data[x][y];
            element = allCells[x * columnLength + y];
            if (element) {
                callback(cell, element, y % 2 === 0);
            }
        }
        if (i < len) {
            // We've still got some updating to do so let's do it in the next run loop. Thus we should not get any slow
            // script errors but that doesn't mean that the interface is responsive at any degree.
            var self = this;
            Ember.run.next(function() {
                self._batchUpdate(maxUpdates, i, updateCounter, cellRefs, data, allCells, callback);
            });
        }
    }
});
