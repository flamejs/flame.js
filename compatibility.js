
// In IE7, Range is not defined, which Metamorph handles with a fallback
if (typeof Range !== "undefined") {
  // In IE9, Range is defined but createContextualFragment is not, which Metamorph doesn't handle
  // From http://stackoverflow.com/questions/5375616/extjs4-ie9-object-doesnt-support-property-or-method-createcontextualfragme
  if (typeof Range.prototype.createContextualFragment === "undefined") {
      Range.prototype.createContextualFragment = function(html) {
          var doc = this.startContainer.ownerDocument;
          var container = doc.createElement("div");
          container.innerHTML = html;
          var frag = doc.createDocumentFragment(), n;
          while ( (n = container.firstChild) ) {
              frag.appendChild(n);
          }
          return frag;
      };
  }
}

if (String.prototype.trim === undefined) {
    String.prototype.trim = function() {
        return jQuery.trim(this);
    };
}

//nicked from stack overflow http://stackoverflow.com/questions/985272/jquery-selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
function selectText(element) {
    var doc = document;
    var text = doc.getElementById(element);
    var range = null;
    if (doc.body.createTextRange) {
        range = document.body.createTextRange();
        range.moveToElementText(text);
        range.select();
    } else if (window.getSelection) {
        var selection = window.getSelection();
        if (selection.setBaseAndExtent) {
            selection.setBaseAndExtent(text, 0, text, 1);
        } else {
            range = document.createRange();
            range.selectNodeContents(text);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

