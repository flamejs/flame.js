import LabelView, { ALIGN_CENTER } from './label_view';
import Popover from './popover';
import { measureString } from '../utils/string_measurement';

export default Popover.extend({
    layout: { height: 25, width: 200 },
    classNames: ['popover-tooltip'],
    handlebars: '{{view view.contentView}}',
    isModal: false,

    popup(anchor, position) {
        this.setProperties({ anchor, position });
        this._super(anchor, position);
    },

    // Popover only works if a width is set, so to have a tooltip that is just
    // wide enough, we need to measure the string.
    sizeToFit: function() {
        const { width } = measureString(this.get('value'), 'ember-view flame-view');
        this.adjustLayout('width', width + 20);
        const layout = this._layoutRelativeTo(this.get('anchor'), this.get('position'));
        this.set('layout', layout);
        this.updateLayout();
    }.on('didInsertElement'),

    contentView: LabelView.extend({
        layout: { height: 25, width: '100%' },
        textAlign: ALIGN_CENTER,
        value: Ember.computed.alias('parentView.value')
    })
});
