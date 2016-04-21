import ButtonView from './button_view';

import '../stylesheets/views/checkbox_view.css.scss';

import imgUrl from 'lib/flame/images/checkmark.svg';

// A checkbox. The state of the checkbox is indicated by the isSelected property.
export default ButtonView.extend({
    displayProperties: ['title'],
    classNames: ['flame-checkbox-view'],
    isSticky: true,

    render: function(buffer) {
        buffer.push('<div class="flame-checkbox-box"></div>');
        this.renderCheckMark(buffer);
        var tooltip = this.get('tooltip') || '';
        buffer.push(`<label class="flame-checkbox-label" title="${tooltip}">`);
        buffer.push(Ember.isNone(this.get('title')) ? '' : Handlebars.Utils.escapeExpression(this.get('title')));
        buffer.push('</label>');
    },

    renderCheckMark: function(buffer) {
        buffer.push(`<div class="flame-view flame-checkbox-checkmark" style="left: 4px; top: 2px;"><img src="${imgUrl}"></div>`);
    }
});
