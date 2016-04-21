import View from '../view';
import SplitViewDividerViewBase from './split_view_divider_view_base';

import '../stylesheets/views/split_view.scss';

export default View.extend({
    allowResizing: true,
    dividerThickness: 7,
    dividerView: View.extend(SplitViewDividerViewBase),

    didInsertElement: function() {
        this._updateLayout();
    }
});
