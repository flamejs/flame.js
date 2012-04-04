Flame.RadioButtonView = Flame.CheckboxView.extend({
    classNames: ['flame-radio-button-view'],

    action: function() {
        this.set('targetValue', this.get('value'));
    },

    isSelected: function() {
        if (Ember.typeOf(this.get('value')) === 'undefined' || Ember.typeOf(this.get('targetValue')) === 'undefined') {
            return false;
        }
        return this.get('value') === this.get('targetValue');
    }.property('targetValue', 'value').cacheable(),

    renderCheckMark: function(context) {
        context.push("<div class='flame-view flame-checkbox-checkmark' style='top:8px;left:8px;width:6px;height:6px;'></div>");
    }
});
