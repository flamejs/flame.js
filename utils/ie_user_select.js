// IE < 10 doesn't support -ms-user-select CSS property, so we need to use onselectstart event to stop the selection
if (/msie 9/i.test(window.navigator.userAgent)) {
    Ember.$(function() {
        Ember.$('body').on('selectstart', function(e) {
            var target = Ember.$(e.target);
            return ['INPUT', 'TEXTAREA'].contains(e.target.tagName) ||
                target.parents().andSelf().is('.is-selectable') ||
                target.attr('contenteditable') === 'true';
        });
    });
}
