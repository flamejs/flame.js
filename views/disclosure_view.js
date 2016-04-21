import LabelView from './label_view';

import '../stylesheets/views/disclosure_view.css.scss';

import triangleDown from 'lib/flame/images/disclosure_triangle_down.svg';
import triangleRight from 'lib/flame/images/disclosure_triangle_right.svg';

export default LabelView.extend({
    classNames: ['flame-disclosure-view'],

    imageExpanded: triangleDown,
    imageCollapsed: triangleRight,

    image: function() {
        return this.get('visibilityTarget') ? this.get('imageExpanded') : this.get('imageCollapsed');
    }.property('visibilityTarget', 'imageExpanded', 'imageCollapsed'),

    handlebars: '<img {{bind-attr src="view.image"}}> {{view.value}}',

    action: function() {
        this.toggleProperty('visibilityTarget');
        return true;
    }
});
