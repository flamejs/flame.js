Flame.TableDataView = Flame.View.extend(Flame.Statechart, {
    classNames: ['flame-table-data-view'],
    acceptsKeyResponder: true,
    batchUpdates: true,
    updateBatchSize: 500,
    _updateCounter: 0,
    selectedCell: null,
    editValue: null,
    content: null,

    initialFlameState: 'loaded',

    loaded: Flame.State.extend({
        mouseDown: function(event) {
            var owner = this.get('owner');
            if (owner.selectCell(owner._cellForTarget(event.target))) {
                this.gotoFlameState('selected');
                return true;
            } else {
                return false;
            }
        },

        enterState: function() {
            if (this.get('owner.state') === 'inDOM') {
                this.get('owner.selection').hide();
            }
        }
    }),

    selected: Flame.State.extend({
        mouseDown: function(event) {
            var owner = this.get('owner');
            // If a cell is clicked that was already selected and it's a cell
            // with fixed options, start editing it.
            var selectedDataCell = owner.get('selectedDataCell');
            if (!Ember.isNone(selectedDataCell) && selectedDataCell.options && selectedDataCell.options() && jQuery(event.target).hasClass('table-selection-background')) {
                this.startEdit();
                return true;
            }

            var target = owner._cellForTarget(event.target);
            return !!owner.selectCell(target);
        },

        mouseUp: function(event) {
            var tableViewDelegate = this.get('owner.tableViewDelegate');
            if (tableViewDelegate && tableViewDelegate.mouseUp) {
                var target = jQuery(event.target);
                var targetDataCell;
                var index;
                var columnIndexCell = target.closest('[data-index]');
                var columnIndex = columnIndexCell.attr('data-index');
                var rowIndex = columnIndexCell.parent().attr('data-index');

                if (columnIndex && rowIndex) {
                    targetDataCell = this.get('owner.data')[rowIndex][columnIndex];
                    index = [rowIndex, columnIndex];
                    tableViewDelegate.mouseUp(event, target, targetDataCell, index, this.get('owner'));
                }
            }
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
            var dataCell = this.get('owner.selectedDataCell');
            if (Ember.isNone(dataCell)) {
                return;
            }

            if (dataCell.isEditable()) {
                this.get('owner')._validateAndSet('');
            }
        },

        doubleClick: function() {
            this.startEdit();
        },

        startEdit: function(event) {
            var dataCell = this.get('owner.selectedDataCell');
            if (Ember.isNone(dataCell)) {
                return;
            }
            if (dataCell.isEditable()) {
                this.gotoFlameState('editing');
            } else if (!dataCell.options()) {
                this.gotoFlameState('selectingReadOnly');
            }
        },

        cancel: function(event) {
            this.get('owner').resignKeyResponder();
            return true;
        },

        moveLeft: function(event) {
            var selectedCell = this.get('owner.selectedCell');
            this.get('owner').selectCell(selectedCell.prev());
            return true;
        },

        moveRight: function(event) {
            var selectedCell = this.get('owner.selectedCell');
            this.get('owner').selectCell(selectedCell.next());
            return true;
        },

        moveDown: function(event) {
            var selectedCell = this.get('owner.selectedCell');
            this.get('owner').selectCell(jQuery(selectedCell.parent().next().children()[selectedCell.attr('data-index')]));
            return true;
        },

        moveUp: function(event) {
            var selectedCell = this.get('owner.selectedCell');
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
            var dataCell = this.get('owner.selectedDataCell');
            if (Ember.isNone(dataCell) || (dataCell && !dataCell.isEditable())) {
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
            this.get('owner.selection').show();
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
            this.gotoFlameState('selected');
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
            this.gotoFlameState('selected');
            return true;
        },

        mouseDown: function(event) {
            var owner = this.get('owner');
            var cell = owner._cellForTarget(event.target);
            if (owner.isCellSelectable(cell)) {
                this.gotoFlameState('selected');
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
            var selection = this.get('owner.selection');
            selection.html('<div class="table-selection-background"></div>');
            selection.removeClass('read-only is-selectable');
        },

        _invokeInSelected: function(action) {
            var owner = this.get('owner');
            this.gotoFlameState('selected');
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
                this.gotoFlameState('selected');
                owner.invokeStateMethodByValuesOn('moveRight', 'moveDown');
            }
            return true;
        },

        insertTab: function(event) {
            var owner = this.get('owner');
            if (owner._confirmEdit()) {
                this.gotoFlameState('selected');
                owner.invokeStateMethod('insertTab');
            }
            return true;
        },

        insertBacktab: function(event) {
            var owner = this.get('owner');
            if (owner._confirmEdit()) {
                this.gotoFlameState('selected');
                owner.invokeStateMethod('insertBacktab');
            }
            return true;
        },

        mouseDown: function(event) {
            var owner = this.get('owner');
            var cell = owner._cellForTarget(event.target);
            var editField = owner.get('editField');
            if (owner.isCellSelectable(cell) && owner._confirmEdit()) {
                this.gotoFlameState('selected');
                owner.selectCell(cell);
                return true;
            } else if (!Ember.isEmpty(cell) && editField && cell[0] !== editField[0] && !owner._confirmEdit()) {
                editField.focus();
                return true;
            } else {
                return false;
            }
        },

        enterState: function() {
            var owner = this.get('owner');
            var selectedCell = owner.get('selectedCell');
            var dataCell = owner.get('selectedDataCell');
            var editCell = owner.get('editField');
            var scrollable = owner.get('parentView.scrollable');
            var selection = owner.get('selection');
            var options = dataCell.options();

            selectedCell.addClass('editing');

            if (!dataCell.showEditor(selectedCell, owner, owner.get('content'))) {
                // No special editor, use one of the defaults
                if (options) { // Drop down menu for fields with a fixed set of options
                    var menu = Flame.MenuView.createWithMixins({
                        minWidth: selectedCell.outerWidth(),
                        parent: owner, // Reference to the cube table view
                        items: options.map(function(o) {
                            return {
                                title: o.title,
                                value: o.value,
                                isChecked: o.value === dataCell.value,
                                action: function() { owner.didSelectMenuItem(this.get('value')); }
                            };
                        }),
                        // Make the cube table view go back to the selected state when the menu is closed
                        close: function() { owner.gotoFlameState('selected'); this._super(); }
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
                    editCell.attr('placeholder', dataCell.placeholder());
                    owner.set('editValue', null);
                    editCell.show();
                    // Put cursor at end of value
                    editCell.selectRange(editValue.length, editValue.length);
                }
            }
        },

        exitState: function() {
            var owner = this.get('owner');
            var editField = owner.get('editField');

            var selectedCell = owner.get('selectedCell');
            selectedCell.removeClass('editing');

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
        this.gotoFlameState('loaded');
        this.set('selectedCell', null);
    },

    // Get the Cell instance that corresponds to the selected cell in the view
    selectedDataCell: function() {
        var selectedCell = this.get('selectedCell');
        return this.get('data')[selectedCell.parent().attr('data-index')][selectedCell.attr('data-index')];
    }.property().volatile(),

    editableValue: function(dataCell, readOnly) {
        var editValue = this.get('editValue');
        if (editValue !== null) {
            return editValue;
        } else {
            editValue = readOnly ? dataCell.formattedValue() : dataCell.editableValue();
            return !Ember.isNone(editValue)? editValue : '';
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
        var scrollable = this.get('parentView.scrollable');

        var position = selectedCell.position();
        var scrollTop = scrollable.scrollTop();
        var scrollLeft = scrollable.scrollLeft();

        var offset = jQuery.browser.webkit ? 0 : 1;
        selection.css({
            left: position.left + scrollLeft - offset + 'px',
            top: position.top + scrollTop - offset + 'px',
            width: selectedCell.outerWidth() - 5 + 'px',
            height: selectedCell.outerHeight() - 3 + 'px'
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
        selectedCell.addClass('active-cell');
    }.observes('selectedCell'),

    _selectionWillChange: function() {
        var selectedCell = this.get('selectedCell');
        if (selectedCell) {
            selectedCell.removeClass('active-cell');
        }
    }.observesBefore('selectedCell'),

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
            var cellUpdateDelegate = this.get('tableViewDelegate');
            Ember.assert('No tableViewDelegate set!', !!cellUpdateDelegate || !!cellUpdateDelegate.cellUpdated);

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
        this.gotoFlameState('selected');
    },

    invokeStateMethodByValuesOn: function(onRowsState, onColumnsState) {
        if (this.get('areValuesOnRows')) {
            this.invokeStateMethod(onRowsState);
        } else {
            this.invokeStateMethod(onColumnsState);
        }
    },

    selectCell: function(newSelection) {
        if (this.get('parentView.allowSelection') && this.isCellSelectable(newSelection)) {
            this.set('selectedCell', newSelection);
            return true;
        }
        return false;
    },

    isCellSelectable: function(cell) {
        return cell && cell[0] && cell[0].nodeName === 'TD';
    },

    _cellForTarget: function(target) {
        return jQuery(target).closest('td', this.$());
    },

    updateColumnWidth: function(index, width) {
        var cells = this.$('td[data-index=%@]'.fmt(index));
        cells.css({'width': '%@px'.fmt(width)});
        this.propertyDidChange('selectedCell'); // Let the size of the selection div be updated
    },

    render: function(buffer) {
        this.set('selectedCell', null);
        this.gotoFlameState('loaded');
        this._renderTable(buffer);
    },

    _renderTable: function(buffer) {
        var data = this.get('data');
        if (!(data && data[0])) return;

        var rowCount = data.length;
        var columnCount = data[0].length;
        var defaultCellWidth = this.get('parentView.defaultColumnWidth');
        var columnLeafs = this.get('parentView.content.columnLeafs');
        var cellWidth;

        var classes = 'flame-table';
        if (!this.get('parentView.allowSelection')) classes += ' is-selectable';
        buffer.begin('table').attr('class', classes).attr('width', '1px');
        buffer.pushOpeningTag();
        var i, j;
        for (i = 0; i < rowCount; i++) {
            buffer.push('<tr data-index="'+i+'">');
            for (j = 0; j < columnCount; j++) {
                var content;
                var cell = data[i][j];
                var cssClassesString = '';
                var titleValue = '';
                var styles = '';
                if (cell) {
                    content = cell.content();
                    content = (Ember.isNone(content) ? '' : content);
                    cssClassesString = cell.cssClassesString();
                    styles = (cell.styles && cell.styles() ? cell.styles() : '');
                    titleValue = (cell.titleValue && cell.titleValue() ? 'title="%@"'.fmt(cell.titleValue()) : '');
                } else {
                    content = '<span style="color: #999">...</span>';
                }
                cellWidth = columnLeafs[j].get('render_width') || defaultCellWidth;
                // Surround the content with a relatively positioned div to make absolute positioning of content work with Firefox
                buffer.push('<td data-index="%@" class="%@" style="width: %@px;" %@><div class="content-container" style="%@">%@</div></td>'.fmt(
                        j,
                        (cssClassesString + (j % 2 === 0 ? " even-col" : " odd-col")),
                        cellWidth,
                        titleValue,
                        styles,
                        content));
            }
            buffer.push('</tr>');
        }
        buffer.pushClosingTag(); // table

        // Selection indicator
        buffer.push('<div class="table-selection">');
        // This div serves as the "invisible" (very transparent) background for the table selection div.
        // Without this, the table selection div would be totally transparent and render only a border.
        // This causes inconsistencies in IE; when the table selection div is clicked, it's unclear which
        // element will receive the event.
        buffer.push('<div class="table-selection-background"></div>');
        buffer.push('</div>');

        // Edit field (text)
        buffer.push('<input type="text" class="table-edit-field">');
    },

    // Update dirty cells
    _cellsDidChange: function() {
        this.manipulateCells(this.get('dirtyCells'), function(cell, element, isEvenColumn) {
            var cssClassesString = (cell ? cell.cssClassesString() : "") + (isEvenColumn ? " even-col" : " odd-col");
            var content = cell.content();
            var titleValue = cell.titleValue && cell.titleValue();
            var styles = (cell.styles && cell.styles() ? cell.styles() : '');
            element.className = cssClassesString;
            element.innerHTML = Ember.isNone(content) ? '' : '<div class="content-container" style="%@">%@</div>'.fmt(styles, content);
            if (titleValue) {
                element.title = titleValue;
            }
        }, ++this._updateCounter);
    }.observes('dirtyCells').on('init'),

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
        if (!cellRefs || cellRefs.length === 0 || !this.$()) return;
        var table = this.$('table.flame-table');

        var allCells = table.find('td');
        // Everyone expects that the cellRefs array is empty when we return from this function. We still need the
        // content so save it elsewhere.
        var content = cellRefs.splice(0, cellRefs.length);
        var updateBatchSize = this.get('batchUpdates') ? this.get('updateBatchSize') : -1;
        this._batchUpdate(updateBatchSize, 0, updateCounter, content, data, allCells, callback);
    },

    _batchUpdate: function(maxUpdates, startIx, updateCounter, cellRefs, data, allCells, callback) {
        if (typeof updateCounter !== 'undefined' && updateCounter !== this._updateCounter) return;
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
