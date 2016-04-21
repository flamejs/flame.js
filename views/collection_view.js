import ViewSupport from '../mixins/view_support';
import LayoutSupport from '../mixins/layout_support';
import EventManager from '../mixins/event_manager';

import '../stylesheets/views/collection_view.scss';

export default Ember.CollectionView.extend(ViewSupport, LayoutSupport, EventManager, {
    classNames: ['flame-collection-view']
});
