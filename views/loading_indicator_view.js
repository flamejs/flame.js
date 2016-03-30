import ImageView from './image_view';

const loading = require('lib/flame/images/loading.gif');

export default ImageView.extend({
    layout: { width: 16, height: 16 },
    classNames: ['loading-indicator'],
    value: loading
});
