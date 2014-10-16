//= require ./text_field_view

Flame.AutocompleteTextFieldView = Flame.TextFieldView.extend(Flame.Statechart, Flame.ActionSupport, {
    _autocompleteView: null,
    _lastQueuedQuery: null,
    autocompleteDelegate: null,
    initialFlameState: 'idle',

    textField: Flame.TextField.extend({
        _debounce: null,

        keyUp: function(event) {
            this._super(event);
            this._debounce = Ember.run.debounce(this, 'autocompleteAction', event, 500);
        },

        autocompleteAction: function(event) {
            if (event.which === 8 || event.which > 31) {
                // Don't want to wait until the value has synced, so just grab the raw val from input
                var query = this.$().val();
                this.get('parentView').doAutocompleteRequest(query);
                return true;
            }
        },

        willDestroyElement: function() {
            this._super();
            if (this._debounce) Ember.run.cancel(this._debounce);
        }
    }),

    idle: Flame.State.extend({
        enterState: function() {
            var lastQuery = this.get('owner._lastQueuedQuery');
            if (lastQuery) {
                this.set('owner._lastQueuedQuery', null);
                this.doAutocompleteRequest(lastQuery);
            }
        },

        doAutocompleteRequest: function(query) {
            if (!this.get('owner.autocompleteDelegate')) return;

            if (query) {
                this.get('owner.autocompleteDelegate').fetchAutocompleteResults(query, this.get('owner'));
                this.gotoFlameState('requesting');
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
            if (query) this.set('owner._lastQueuedQuery', query);
        },

        didFinishAutocompleteRequest: function() {
            this.gotoFlameState('idle');
        },

        didFetchAutocompleteResults: function(options) {
            if (options.length === 0) {
                this.get('owner')._closeAutocompleteMenu();
                return;
            }

            // Do not bother to show this result as it's going to be replaced anyway soon with _lastQueuedtQuery results
            if (this.get('owner._lastQueuedQuery') === null) {
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
        this.set('value', this._autocompleteMenu.get('items').findBy('value', id).title);
    },

    _closeAutocompleteMenu: function() {
        if (this._autocompleteMenu) {
            this._autocompleteMenu.close();
            this._autocompleteMenu = null;
        }
    }
});
