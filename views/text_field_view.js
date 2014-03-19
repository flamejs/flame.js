/**
  The actual text field is wrapped in another view since browsers like Firefox
  and IE don't support setting the `right` CSS property (used by LayoutSupport)
  on input fields.
 */
Flame.TextFieldView = Flame.View.extend(Flame.ActionSupport, {
    classNames: ['flame-text'],
    childViews: ['textField'],
    acceptsKeyResponder: true,

    layout: { left: 0, top: 0 },
    defaultHeight: 22,
    defaultWidth: 200,

    value: '',
    placeholder: null,
    isPassword: false,
    isValid: null,
    isEditableLabel: false,
    isVisible: true,
    isDisabled: false,
    autocompleteDelegate: null,
    isAutocomplete: function() {
        return !Ember.empty(this.get('autocompleteDelegate'));
    }.property('autocompleteDelegate'),
    name: null,

    becomeKeyResponder: function() {
        this.get('textField').becomeKeyResponder();
    },

    insertNewline: function() {
        return this.fireAction();
    },

    textField: Ember.TextField.extend(Flame.EventManager, Flame.FocusSupport, {
        classNameBindings: ['isInvalid', 'isEditableLabel', 'isFocused'],
        acceptsKeyResponder: true,
        type: Flame.computed.trueFalse('parentView.isPassword', 'password', 'text'),
        isInvalid: Flame.computed.equals('parentView.isValid', false),
        valueBinding: '^value',
        placeholderBinding: '^placeholder',
        isEditableLabelBinding: '^isEditableLabel',
        isVisibleBinding: '^isVisible',
        disabledBinding: '^isDisabled',
        isAutocompleteBinding: '^isAutocomplete',
        attributeBindings: ['name', 'disabled'],
        nameBinding: "^name",

        // Ember.TextSupport (which is mixed in by Ember.TextField) calls interpretKeyEvents on keyUp.
        // Since the event manager already calls interpretKeyEvents on keyDown, the action would be fired
        // twice, both on keyDown and keyUp. So we override the keyUp method and only record the value change.
        keyUp: function(event) {
            this._elementValueDidChange();
            if ((event.which === 8 || event.which > 31) && this.get('isAutocomplete')) {
                this.get('parentView')._fetchAutocompleteResults();
                return true;
            }
            return false;
        },

        // Trigger a value change notification also when inserting a new line. Otherwise the action could be fired
        // before the changed value is propagated to this.value property.
        insertNewline: function() {
            this._elementValueDidChange();
            Ember.run.sync();
            return false;
        },

        cancel: function() { return false; },

        // The problem here is that we need browser's default handling for these events to make the input field
        // work. If we had no handlers here and no parent/ancestor view has a handler returning true, it would
        // all work. But if any ancestor had a handler returning true, the input field would break, because
        // true return value signals jQuery to cancel browser's default handling. It cannot be remedied by
        // returning true here, because that has the same effect, thus we need a special return value (which
        // Flame.EventManager handles specially by stopping the parent propagation).
        mouseDown: function() { return Flame.ALLOW_BROWSER_DEFAULT_HANDLING; },
        mouseMove: function() { return Flame.ALLOW_BROWSER_DEFAULT_HANDLING; },
        mouseUp: function() { return Flame.ALLOW_BROWSER_DEFAULT_HANDLING; }
    }),

    _autocompleteView: null,

    _fetchAutocompleteResults: function() {
        // Don't want to wait until the value has synced, so just grab the raw val from input
        var newValue = this.$('input').val();
        if (newValue) {
            this.get('autocompleteDelegate').fetchAutocompleteResults(newValue, this);
        } else {
            this._closeAutocompleteMenu();
        }
    },

    didFetchAutocompleteResults: function(options) {
        if (options.length === 0) {
            this._closeAutocompleteMenu();
            return;
        }
        if (!this._autocompleteMenu || this._autocompleteMenu.isDestroyed) {
                this._autocompleteMenu = Flame.AutocompleteMenuView.create({
                    minWidth: this.$().width(),
                    target: this,
                    textField: this.textField,
                    action: '_selectAutocompleteItem',
                    items: options
                });
                this._autocompleteMenu.popup(this);
        } else if (!this._autocompleteMenu.isDestroyed) {
            this._autocompleteMenu.set('items', options);
        }
    },

    _closeAutocompleteMenu: function() {
        if (this._autocompleteMenu){
            this._autocompleteMenu.close();
            this._autocompleteMenu = null;
        }
    },

    _selectAutocompleteItem: function(id) {
        this.set('value', this._autocompleteMenu.get('items').findProperty('value', id).title);
    }

});

