Ember.mixin(Flame, {
    _setupStringMeasurement: function(parentClasses, elementClasses) {
        if (!parentClasses) {
            parentClasses = '';
        }
        if (!elementClasses) {
            elementClasses = '';
        }
        var element = this._metricsCalculationElement;
        if (!element) {
            var parentElement = document.createElement("div");
            parentElement.style.cssText = "position:absolute;left:-10010px; top:-10px; width:10000px; visibility:hidden;";
            element = this._metricsCalculationElement = document.createElement("div");
            element.style.cssText = "position:absolute; left: 0px; top: 0px; bottom: auto; right: auto; width: auto; height: auto;";
            parentElement.appendChild(element);
            document.body.insertBefore(parentElement, null);
        }
        element.parentNode.className = parentClasses;
        element.className = elementClasses;
        return element;
    },

    measureString: function(string, parentClasses, elementClasses) {
        var element = this._setupStringMeasurement(parentClasses, elementClasses);
        element.innerHTML = string;
        return {
            width: element.clientWidth,
            height: element.clientHeight
        };
    }
});
