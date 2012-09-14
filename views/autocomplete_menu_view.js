//= require ./menu_view
Flame.AutocompleteMenuView = Flame.MenuView.extend({
    keyPress: function(event) {
         return false;
    },
    moveDown: function() {
        // Using resignKeyResponder() on the text field won't work, because it was already 'resigned' but keeps
        // focus, apparently by design. We need the text input to lose focus though or the selection of the menu options
        // with the arrow keys gets messed up
        this.get('textField').didLoseKeyResponder();
        this._super();
    },
    close: function() {
        this._super();
        // See above
        this.get('textField').didBecomeKeyResponder();
    },
});