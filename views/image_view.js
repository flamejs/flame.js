import View from '../view';

export default View.extend({
    imageHeight: null,
    imageWidth: null,
    value: null,

    handlebars: '<img {{bind-attr src="view.value"}} {{bind-attr height="view.imageHeight"}} {{bind-attr width="view.imageWidth"}}>'
});
