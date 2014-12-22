//= require ./button_view

// A checkbox. The state of the checkbox is indicated by the isSelected property.
Flame.CheckboxView = Flame.ButtonView.extend({
    classNames: ['flame-checkbox-view'],
    isSticky: true,

    render: function(buffer) {
        buffer.push('<div class="flame-checkbox-box"></div>');
        this.renderCheckMark(buffer);
        buffer.push('<label class="flame-checkbox-label">');
        buffer.push(Ember.isNone(this.get('title')) ? '' : this.get('title'));
        buffer.push('</label>');
    },

    renderCheckMark: function(buffer) {
        var imgUrl = Flame.image('checkmark.svg');
        buffer.push('<div class="flame-view flame-checkbox-checkmark" style="left: 4px; top: 2px;"><img src="' + imgUrl + '"></div>');
    }
});
