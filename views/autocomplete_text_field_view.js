//= require ./text_field_view

Flame.AutocompleteTextFieldView = Flame.TextFieldView.extend(Flame.Statechart, Flame.ActionSupport, {
    _autocompleteView: null,
    _lastQueuedQuery: null,
    autocompleteDelegate: null,
    initialState: 'idle',

    textField: Flame.TextField.extend({
        keyUp: function(event) {
            this._super();
            return this.autocompleteAction(event);
        },

        autocompleteAction: function(event) {
            if ((event.which === 8 || event.which > 31)) {
                // Don't want to wait until the value has synced, so just grab the raw val from input
                var query = this.get('parentView').$('input').val();
                this.get('parentView').doAutocompleteRequest(query);
                return true;
            }
        }
    }),

    idle: Flame.State.extend({
        enterState: function() {
            var lastQuery = this.getPath('owner._lastQueuedQuery');
            if (lastQuery) {
                this.setPath('owner._lastQueuedQuery', null);
                this.doAutocompleteRequest(lastQuery);
            }
        },

        doAutocompleteRequest: function(query) {
            if (query) {
                this.getPath('owner.autocompleteDelegate').fetchAutocompleteResults(query, this.get('owner'));
                this.gotoState("requesting");
            } else {
                this.get('owner')._closeAutocompleteMenu();
            }
        }
    }),

    requesting: Flame.State.extend({
        enterState: function() {
            this.get('owner')._closeAutocompleteMenu();
        },

        doAutocompleteRequest: function(query) {
            if (query) this.setPath('owner._lastQueuedQuery', query);
        },

        didFinishAutocompleteRequest: function() {
            this.gotoState("idle");
        },

        didFetchAutocompleteResults: function(options) {
            if (options.length === 0) {
                this.get('owner')._closeAutocompleteMenu();
                return;
            }

            // Do not bother to show this result as it's going to be replaced anyway soon with _lastQueuedtQuery results
            if (this.getPath('owner._lastQueuedQuery') === null) {
                this.get('owner')._showAutocompleteMenu(options);
            }
        }
    }),

    _showAutocompleteMenu: function(options) {
        if (!this._autocompleteMenu || this._autocompleteMenu.isDestroyed) {
            this._autocompleteMenu = Flame.AutocompleteMenuView.create({
                minWidth: this.$().width(),
                target: this,
                textField: this.get('textField'),
                action: '_selectAutocompleteItem',
                items: options
            });
            this._autocompleteMenu.popup(this);
        } else if (!this._autocompleteMenu.isDestroyed) {
            this._autocompleteMenu.set('items', options);
        }
    },

    _selectAutocompleteItem: function(id) {
        this.set('value', this._autocompleteMenu.get('items').findProperty('value', id).title);
    },

    _closeAutocompleteMenu: function() {
        if (this._autocompleteMenu){
            this._autocompleteMenu.close();
            this._autocompleteMenu = null;
        }
    }
});

