let metricsCalculationElement;

function setupStringMeasurement(parentClasses, elementClasses, additionalStyles) {
    if (!parentClasses) parentClasses = '';
    if (!elementClasses) elementClasses = '';
    if (!additionalStyles) additionalStyles = '';

    var element = metricsCalculationElement;
    if (!element) {
        var parentElement = document.createElement('div');
        parentElement.style.cssText = 'position:absolute; left:-10010px; top:-10px; width:10000px; visibility:hidden;';
        element = metricsCalculationElement = document.createElement('div');
        parentElement.appendChild(element);
        document.body.insertBefore(parentElement, null);
    }

    element.parentNode.className = parentClasses;
    element.className = elementClasses;
    element.style.cssText = 'position:absolute; left: 0; top: 0; bottom: auto; right: auto; width: auto; height: auto;' + additionalStyles;
    return element;
}

export function measureString(stringOrArray, parentClasses, elementClasses, additionalStyles) {
    var escape = Handlebars.Utils.escapeExpression;
    var measuredString;
    // We also accept an array of strings and then return the width of the longest one by joining them with <br>.
    if (Ember.isArray(stringOrArray)) {
        measuredString = stringOrArray.reduce(function(currentStrings, nextString) {
            return currentStrings + escape(nextString) + '<br>';
        }, '');
    } else {
        measuredString = escape(stringOrArray);
    }
    var element = setupStringMeasurement(parentClasses, elementClasses, additionalStyles);
    element.innerHTML = measuredString;

    return {
        width: element.clientWidth,
        height: element.clientHeight
    };
}
