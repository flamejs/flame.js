import ImageView from './image_view';
import { image } from '../utils/images';

export default ImageView.extend({
    layout: { width: 16, height: 16 },
    classNames: ['loading-indicator'],
    value: image('loading.gif')
});
