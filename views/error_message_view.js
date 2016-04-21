import LabelView, { ALIGN_LEFT, ALIGN_RIGHT } from './label_view';

import '../stylesheets/error_message.scss';

export default LabelView.extend({
    classNames: ['flame-form-view-validation-error'],
    classNameBindings: ['pointToClass', 'skinny'],
    skinny: false,
    pointTo: 'left',
    textAlign: function() {
        return this.get('pointTo') === 'left' ? ALIGN_LEFT : ALIGN_RIGHT;
    }.property('pointTo'),
    pointToClass: function() {
        return 'points-to-%@'.fmt(this.get('pointTo'));
    }.property('pointTo'),
    handlebars: '<div class="pointer"></div><div class="error-box">{{view.value}}</div>'
});
