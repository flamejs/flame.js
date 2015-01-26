var isWebKit = /webkit/i.test(window.navigator.userAgent);

Flame.TableDataView = Flame.View.extend(Flame.Statechart, {
    classNames: ['flame-table-data-view'],
    acceptsKeyResponder: true,
    batchUpdates: true,
    updateBatchSize: 500,
    _updateCounter: 0,
    selectedCell: null,
    selectionEnd: null,
    editValue: null,
    content: null,
    tableViewDelegate: null,

    initialFlameState: 'loaded',

    loaded: Flame.State.extend({
        mouseDown: function(event) {
            var owner = this.get('owner');
            if (owner.selectCell(owner._cellForTarget(event.target), false)) {
                owner.get('selection').show();
                this.gotoFlameState('mouseIsDown');
                return true;
            } else {
                return false;
            }
        },

        enterState: function() {
            var owner = this.get('owner');
            owner.set('selectedCell', null);
            owner.set('selectionEnd', null);
            if (owner.get('_state') === 'inDOM') {
                owner.get('selection').children().addBack().hide();
            }
        }
    }),

    mouseIsDown: Flame.State.extend({
        lastTarget: null,

        mouseMove: function(event) {
            if (event.target !== this.lastTarget) {
                var owner = this.get('owner');
                var cell = owner._cellForTarget(event.target);
                if (cell && owner.isCellSelectable(cell)) {
                    owner.set('selectionEnd', cell);
                }
                this.lastTarget = event.target;
            }
            return true;
        },

        mouseUp: function(event) {
            this.gotoFlameState('selected');
            return this.get('owner').invokeStateMethod('mouseUp', event);
        }
    }),

    selected: Flame.State.extend({
        cellUp: function(cell) {
            return jQuery(cell.parent().prev().children()[cell.attr('data-index')]);
        },

        cellDown: function(cell) {
            return jQuery(cell.parent().next().children()[cell.attr('data-index')]);
        },

        modifySelection: function(cell) {
            var owner = this.get('owner');
            if (owner.isCellSelectable(cell)) {
                owner.set('selectionEnd', cell);
                owner.notifySelectionChange();
                return true;
            }
            return false;
        },

        _trim: function(value) {
            // Trim value to allow correct pasting behavior to cells (normalize line changes, strip leading/trailing whitespace, but preserve tabs)
            value = value.replace(/\r\n|\r/g, '\n');
            value = value.replace(/^[^\S\t]+|[^\S\t]+$/g, '');
            return value;
        },

        pasteValue: function(value) {
            value = this._trim(value);
            var owner = this.get('owner');
            var data = owner.get('data');
            var selectedCell = this.get('owner.selectedCell');
            var rowIndex = owner.rowIndex(selectedCell);
            var columnIndex = owner.columnIndex(selectedCell);

            var pasteFailed = function(pastedValue) {
                var tableViewDelegate = owner.get('tableViewDelegate');
                if (tableViewDelegate && tableViewDelegate.pasteDidFail) tableViewDelegate.pasteDidFail(pastedValue);
            };

            // If only one value is in the clipboard and a range is selected,
            // copy that value to all selected cells.
            if (!/\n|\t/.test(value) && selectedCell !== this.get('owner.selectionEnd')) {
                this._forEachSelectedCell(function(i, j, dataCell) {
                    if (dataCell.isEditable() && dataCell.isPastable()) {
                        var cell = owner.$('tr[data-index=%@]'.fmt(i)).find('td[data-index=%@]'.fmt(j)).first();
                        if (!owner._validateAndSet(value, cell)) pasteFailed(value);
                    }
                });
                return;
            }

            var rows = selectedCell.parent().add(selectedCell.parent().nextAll());
            value.split('\n').forEach(function(line, i) {
                line.split('\t').forEach(function(field, j) {
                    var cell = rows[i] && rows.eq(i).children().eq(columnIndex + j);
                    if (!cell) return;
                    var dataCell = data[rowIndex + i][columnIndex + j];
                    if (dataCell && dataCell.isEditable() && dataCell.isPastable()) {
                        if (dataCell.options()) {
                            var option = dataCell.options().findBy('title', field);
                            if (!option) {
                                pasteFailed(field);
                                return;
                            }
                            field = option.value;
                        }
                        if (!owner._validateAndSet(field, cell)) pasteFailed(field);
                    }
                });
            });
        },

        /**
          For the current selection, get a value that can be pasted to another
          TableView or spreadsheet.
        */
        valueForCopy: function() {
            var value = [];
            var row;
            this._forEachSelectedCell(function(i, j, cell, newLine) {
                if (newLine) {
                    if (!Ember.isEmpty(row)) value.push(row.join('\t'));
                    row = [];
                }
                row.push(cell.isCopyable() ? cell.editableValue() : '');
            });
            if (!Ember.isEmpty(row)) value.push(row.join('\t'));
            return value.join('\n');
        },

        _forEachSelectedCell: function(callback) {
            var owner = this.get('owner');
            var selectedCell = owner.get('selectedCell');
            var selectionEnd = owner.get('selectionEnd');
            var minRow = Math.min(owner.rowIndex(selectedCell), owner.rowIndex(selectionEnd));
            var maxRow = Math.max(owner.rowIndex(selectedCell), owner.rowIndex(selectionEnd));
            var minCol = Math.min(owner.columnIndex(selectedCell), owner.columnIndex(selectionEnd));
            var maxCol = Math.max(owner.columnIndex(selectedCell), owner.columnIndex(selectionEnd));

            var data = owner.get('data');
            for (var i = minRow; i <= maxRow; i++) {
                var newLine = true;
                for (var j = minCol; j <= maxCol; j++) {
                    callback(i, j, data[i][j], newLine);
                    newLine = false;
                }
            }
        },

        _getCellUnderSelection: function(event) {
            var owner = this.get('owner');
            owner.get('selection').hide();
            var cell = document.elementFromPoint(event.clientX, event.clientY);
            owner.get('selection').show();
            return cell;
        },

        mouseDown: function(event) {
            var owner = this.get('owner');
            // For browsers that don't support pointer-events, clicking the selection div
            // will absorb the mouseDown event.
            if (jQuery(event.target).hasClass('table-selection')) {
                event.target = this._getCellUnderSelection(event);
            }

            // If a cell is clicked that was already selected and it's a cell
            // with fixed options, start editing it.
            var $target = jQuery(event.target);
            var selectedDataCell = owner.get('selectedDataCell');
            if (!Ember.isNone(selectedDataCell) &&
                    selectedDataCell.options && selectedDataCell.options() &&
                    $target.is('td') &&
                    owner._cellForTarget(event.target)[0] === owner.get('selectedCell')[0]) {
                this.startEdit();
                return true;
            }

            var target = owner._cellForTarget(event.target);
            if (event.shiftKey && owner.isCellSelectable(target)) {
                owner.set('selectionEnd', target);
                return true;
            } else if ($target.closest('.table-selection').length) {
                // If an element inside of the selection div was clicked, we
                // let the delegate handle the click in mouseUp.
                return true;
            } else {
                this.gotoFlameState('loaded');
                return owner.invokeStateMethod('mouseDown', event);
            }
        },

        mouseUp: function(event) {
            var tableViewDelegate = this.get('owner.tableViewDelegate');
            if (tableViewDelegate && tableViewDelegate.mouseUp) {
                var $target = jQuery(event.target);
                // Fallback for browsers that don't support pointer-events
                if ($target.hasClass('table-selection')) {
                    event.target = this._getCellUnderSelection(event);
                    $target = jQuery(event.target);
                }

                // Did we click on the cell or on an element inside the table selection?
                var cell = $target.is('td') ? $target : jQuery(this._getCellUnderSelection(event));
                var columnIndex = cell.attr('data-index');
                var rowIndex = cell.parent().attr('data-index');

                if (columnIndex && rowIndex) {
                    var dataCell = this.get('owner.data')[rowIndex][columnIndex];
                    var index = [rowIndex, columnIndex];
                    tableViewDelegate.mouseUp(event, cell, dataCell, index, this.get('owner'));
                }
            }
        },

        keyDown: function(event, view) {
            var owner = this.get('owner');
            var selectedDataCell = owner.get('selectedDataCell');
            if ((event.ctrlKey || event.metaKey) && !Ember.isNone(selectedDataCell)) {
                var position = owner.get('selectedCell').position();
                var scrollable = owner.get('parentView.scrollable');
                var $container = owner.$('.clipboard-container');
                $container.css({ left: position.left + scrollable.scrollLeft(), top: position.top + scrollable.scrollTop() });
                $container.empty().show();
                var $textarea = jQuery('<textarea></textarea>')
                    .val(this.valueForCopy())
                    .appendTo($container)
                    .focus()
                    .select();

                var self = this;
                $textarea.on('paste', function(e) {
                    var clipboardData = e.originalEvent.clipboardData || window.clipboardData;
                    var pastedValue = clipboardData.getData('Text');
                    // IE11 doesn't allow AJAX requests from the paste event,
                    // this is how we work around it.
                    Ember.run.later(self, function() {
                        this.pasteValue(pastedValue);
                    }, 100);
                });

                // Make sure that control/command + <other key> combinations will still be handled by the browser
                return false;
            }

            return !owner._handleKeyEvent('keyDown', event, view);
        },

        keyUp: function(event) {
            var $target = jQuery(event.target);
            if ($target.hasClass('clipboard-container textarea')) {
                $target.off('paste');
                var $container = this.$('.clipboard-container');
                $container.empty().hide();
                return true;
            }
            return false;
        },

        // We need to use the keyPress event, as some browsers don't report the character pressed correctly with keyDown
        keyPress: function(event) {
            if (event.ctrlKey || event.metaKey) return false;
            var dataCell = this.get('owner.selectedDataCell');
            if (Ember.isNone(dataCell) || !dataCell.isEditable()) {
                return false;
            }
            var key = String.fromCharCode(event.which);
            if (/[a-zA-Z0-9+*\-\[\/\=]/.test(key)) {
                var owner = this.get('owner');
                owner.set('editValue', key);
                this.startEdit();
                return true;
            }
            return false;
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
            return true;
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
            var owner = this.get('owner');
            if (dataCell.isEditable()) {
                owner.set('selectionEnd', owner.get('selectedCell'));
                this.gotoFlameState('editing');
            } else if (!dataCell.options()) {
                owner.set('selectionEnd', owner.get('selectedCell'));
                this.gotoFlameState('selectingReadOnly');
            }
        },

        cancel: function(event) {
            this.get('owner').resignKeyResponder();
            return true;
        },

        moveLeft: function(event) {
            this.get('owner').selectCell(this.get('owner.selectedCell').prev());
            return true;
        },

        moveLeftAndModifySelection: function(event) {
            return this.modifySelection(this.get('owner.selectionEnd').prev());
        },

        moveRight: function(event) {
            this.get('owner').selectCell(this.get('owner.selectedCell').next());
            return true;
        },

        moveRightAndModifySelection: function(event) {
            return this.modifySelection(this.get('owner.selectionEnd').next());
        },

        moveDown: function(event) {
            this.get('owner').selectCell(this.cellDown(this.get('owner.selectedCell')));
            return true;
        },

        moveDownAndModifySelection: function(event) {
            return this.modifySelection(this.cellDown(this.get('owner.selectionEnd')));
        },

        moveUp: function(event) {
            this.get('owner').selectCell(this.cellUp(this.get('owner.selectedCell')));
            return true;
        },

        moveUpAndModifySelection: function(event) {
            return this.modifySelection(this.cellUp(this.get('owner.selectionEnd')));
        },

        insertTab: function(event) {
            this.get('owner').invokeStateMethod('moveRight');
            return true;
        },

        insertBacktab: function(event) {
            this.get('owner').invokeStateMethod('moveLeft');
            return true;
        },

        enterState: function() {
            this.get('owner').notifySelectionChange();
        },

        exitState: function() {
            if (this.get('owner._state') !== 'inDOM') return;
            var clipboardContainer = this.$('.clipboard-container');
            if (clipboardContainer) clipboardContainer.empty().hide();
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
            owner.invokeStateMethod('moveDown');
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
            this.selectionContent = selection.html();
            selection.html(readOnlyValue);
            selection.addClass('read-only is-selectable');
        },

        exitState: function() {
            var selection = this.get('owner.selection');
            selection.html(this.selectionContent);
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

        moveLeft: function() {
            return Flame.ALLOW_BROWSER_DEFAULT_HANDLING;
        },

        moveRight: function() {
            return Flame.ALLOW_BROWSER_DEFAULT_HANDLING;
        },

        insertNewline: function(event) {
            var owner = this.get('owner');
            if (owner._confirmEdit()) {
                this.gotoFlameState('selected');
                owner.invokeStateMethod('moveDown');
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
                        close: function() {
                            owner.gotoFlameState('selected');
                            this._super();
                        }
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
            editField.hide();
            editField.removeClass('invalid');

            owner.get('selectedCell').removeClass('editing');
        }
    }),

    notifySelectionChange: function() {
        var tableViewDelegate = this.get('tableViewDelegate');
        if (tableViewDelegate && tableViewDelegate.didMakeSelection) {
            tableViewDelegate.didMakeSelection(
                this,
                this.get('selectedCell'),
                this.get('selectionEnd'),
                this.get('selectedDataCell')
            );
        }
    },

    didSelectMenuItem: function(value) {
        var editField = this.get('editField');
        editField.val(value || '');
        this._confirmEdit();
        this.invokeStateMethod('moveDown');
    },

    willLoseKeyResponder: function() {
        this.gotoFlameState('loaded');
    },

    columnIndex: function(cell) {
        return parseInt(cell.attr('data-index'), 10);
    },

    rowIndex: function(cell) {
        return parseInt(cell.parent().attr('data-index'), 10);
    },

    // Get the Cell instance that corresponds to the selected cell in the view
    selectedDataCell: function() {
        var selectedCell = this.get('selectedCell');
        return this.get('data')[this.rowIndex(selectedCell)][this.columnIndex(selectedCell)];
    }.property().volatile(),

    editableValue: function(dataCell, readOnly) {
        var editValue = this.get('editValue');
        if (editValue !== null) {
            return editValue;
        } else {
            editValue = readOnly ? dataCell.formattedValue() : dataCell.editableValue();
            return !Ember.isNone(editValue) ? editValue : '';
        }
    },

    didInsertElement: function() {
        this.set('selection', this.$('.table-selection'));
        this.set('editField', this.$('.table-edit-field'));
    },

    _selectionDidChange: function() {
        Ember.run.once(this, this._updateSelection);
    }.observes('selectedCell', 'selectionEnd'),

    _updateSelection: function() {
        var selectedCell = this.get('selectedCell');
        if (!selectedCell) return;

        var selection = this.get('selection');
        var scrollable = this.get('parentView.scrollable');
        var position = selectedCell.position();
        var scrollTop = scrollable.scrollTop();
        var scrollLeft = scrollable.scrollLeft();

        selectedCell.addClass('active-cell');
        selection.css(this._selectionCSS(selectedCell, this.get('selectionEnd'), scrollTop, scrollLeft, position));

        if (this.get('parentView.currentFlameState.name') === 'resizing') {
            return; // Scrolling the viewport used to mess up resizing columns when the selected cell was not in view
        }

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
    },

    _selectionCSS: function(startCell, endCell, scrollTop, scrollLeft, position) {
        var offset = isWebKit ? 0 : 1;
        endCell = endCell || startCell;
        var startPosition = position;
        var endPosition = startCell === endCell ? position : endCell.position();

        var minLeft = Math.min(startPosition.left, endPosition.left);
        var minTop = Math.min(startPosition.top, endPosition.top);
        var maxLeft = Math.max(startPosition.left, endPosition.left);
        var maxTop = Math.max(startPosition.top, endPosition.top);

        var cellWidth = startPosition.left < endPosition.left ? endCell.outerWidth() : startCell.outerWidth();
        var cellHeight = startPosition.top < endPosition.top ? endCell.outerHeight() : startCell.outerHeight();

        return {
            left: minLeft + scrollLeft - offset,
            top: minTop + scrollTop - offset,
            width: maxLeft + cellWidth - minLeft - 5,
            height: maxTop + cellHeight - minTop - 3
        };
    },

    _selectionWillChange: function() {
        var selectedCell = this.get('selectedCell');
        if (selectedCell) {
            selectedCell.removeClass('active-cell');
        }
    }.observesBefore('selectedCell'),

    _confirmEdit: function() {
        var newValue = this.get('editField').val();
        if (!this._validateAndSet(newValue)) {
            this.get('editField').addClass('invalid');
            return false;
        }
        return true;
    },

    // Returns true if cell valid, or false otherwise
    _validateAndSet: function(newValue, cell) {
        var data = this.get('data');
        var selectedCell = cell || this.get('selectedCell');
        var columnIndex = this.columnIndex(selectedCell);
        var rowIndex = this.rowIndex(selectedCell);
        var dataCell = data[rowIndex][columnIndex];

        // Skip saving if value has not been changed
        if (Ember.compare(dataCell.editableValue(), newValue) === 0) {
            return true;
        } else if (dataCell.validate(newValue)) {
            var tableViewDelegate = this.get('tableViewDelegate');
            Ember.assert('No tableViewDelegate set!', !!tableViewDelegate || !!tableViewDelegate.cellUpdated);

            var index = [rowIndex, columnIndex];
            if (tableViewDelegate.cellUpdated(dataCell, newValue, index)) {
                var dirtyCells = this.get('dirtyCells').slice();
                dirtyCells.push([rowIndex, columnIndex]);
                this.set('dirtyCells', dirtyCells);
            }

            return true;
        } else {
            return false;
        }
    },

    _cancelEditingOrSelecting: function() {
        this.gotoFlameState('selected');
    },

    selectCell: function(newSelection, notify) {
        if (this.get('parentView.allowSelection') && this.isCellSelectable(newSelection)) {
            this.setProperties({
                selectedCell: newSelection,
                selectionEnd: newSelection
            });
            if (notify !== false) this.notifySelectionChange();
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
        cells.first().css('width', width);
        this.propertyDidChange('selectedCell'); // Let the size of the selection div be updated
    },

    render: function(buffer) {
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
        var div = document.createElement('div');
        buffer.begin('table').attr('class', classes).attr('width', '1px');
        buffer.pushOpeningTag();
        for (var i = 0; i < rowCount; i++) {
            buffer.push('<tr data-index="' + i + '">');
            for (var j = 0; j < columnCount; j++) {
                var content;
                var cell = data[i][j];
                var cssClassesString = '';
                var titleValue = '';
                var inlineStyles = '';
                if (cell) {
                    content = cell.content();
                    content = (Ember.isNone(content) ? '' : content);
                    if (content instanceof HTMLElement || content instanceof DocumentFragment) {
                        while (div.firstChild) div.removeChild(div.firstChild);
                        div.appendChild(content);
                        content = div.innerHTML;
                    }
                    cssClassesString = cell.cssClassesString();
                    if (cell.inlineStyles) inlineStyles = cell.inlineStyles();
                    titleValue = (cell.titleValue && cell.titleValue() ? 'title="%@"'.fmt(cell.titleValue()) : '');
                } else {
                    content = '<span style="color: #999">...</span>';
                }
                cellWidth = columnLeafs[j].get('render_width') || defaultCellWidth;
                buffer.push('<td data-index="%@" class="%@" style="width: %@px; %@" %@>%@</td>'.fmt(
                    j,
                    (cssClassesString + (j % 2 === 0 ? ' even-col' : ' odd-col')),
                    cellWidth,
                    titleValue,
                    inlineStyles,
                    content
                ));
            }
            buffer.push('</tr>');
        }
        buffer.pushClosingTag(); // table

        // Selection indicator
        buffer.push('<div class="table-selection"></div>');

        // Edit field (text)
        buffer.push('<input type="text" class="table-edit-field">');

        // Container that will hold the textarea used for copy/pasting cells
        buffer.push('<div class="clipboard-container"></div>');
    },

    // Update dirty cells
    _cellsDidChange: function() {
        this.manipulateCells(this.get('dirtyCells'), function(cell, element, isEvenColumn) {
            var cssClassesString = (cell ? cell.cssClassesString() : '') + (isEvenColumn ? " even-col" : " odd-col");
            var content = cell.content();
            var titleValue = cell.titleValue && cell.titleValue();
            var inlineStyles = cell.inlineStyles ? cell.inlineStyles() : '';
            var cellWidth = element.style.width;
            if (!Ember.isNone(cellWidth)) inlineStyles = 'width: %@; %@'.fmt(cellWidth, inlineStyles);
            element.setAttribute('style', inlineStyles);
            element.className = cssClassesString;

            if (content instanceof HTMLElement || content instanceof DocumentFragment) {
                while (element.firstChild) element.removeChild(element.firstChild);
                element.appendChild(content);
            } else {
                element.textContent = Ember.isNone(content) ? '' : content;
            }

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
                element.className += (isEvenColumn ? ' even-col' : ' odd-col');
            } else {
                cell.isUpdating = true;
                var cssClassesString = cell.cssClassesString() + (isEvenColumn ? ' even-col' : ' odd-col');
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
