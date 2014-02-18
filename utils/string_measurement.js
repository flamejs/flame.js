Ember.mixin(Flame, {
    _setupStringMeasurement: function(parentClasses, elementClasses, additionalStyles) {
        if (!parentClasses) parentClasses = '';
        if (!elementClasses) elementClasses = '';
        if (!additionalStyles) additionalStyles = '';

        var element = this._metricsCalculationElement;
        if (!element) {
            var parentElement = document.createElement('div');
            parentElement.style.cssText = 'position:absolute; left:-10010px; top:-10px; width:10000px; visibility:hidden;';
            element = this._metricsCalculationElement = document.createElement('div');
            parentElement.appendChild(element);
            document.body.insertBefore(parentElement, null);
        }

        element.parentNode.className = parentClasses;
        element.className = elementClasses;
        element.style.cssText = 'position:absolute; left: 0; top: 0; bottom: auto; right: auto; width: auto; height: auto;' + additionalStyles;
        return element;
    },

    measureString: function(string, parentClasses, elementClasses, additionalStyles) {
        var element = this._setupStringMeasurement(parentClasses, elementClasses, additionalStyles);
        element.innerHTML = string;
        return {
            width: element.clientWidth,
            height: element.clientHeight
        };
    }
});
