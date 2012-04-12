
// Mix this into any view. Calling enterFullscreen then makes the view shown fullscreen. An 'exit fullscreen' button is
// shown automatically on the right upper corner on top of everything.
//
// TODO Make this work on IE7. The problem is that the modal pane covers everything, only the close button appears on top.
Flame.FullscreenSupport = {
    isFullscreen: false,

    _oldAttributes: undefined,
    _pane: undefined,
    _button: undefined,

    modalPane: function() {
        return Flame.View.create({
            layout: { left: 0, top: 0, right: 0, bottom: 0 },
            classNames: ['flame-fullscreen-pane'],
            owner: undefined
        });
    }.property(),

    closeButton: function() {
        return Flame.ButtonView.create({
            layout: { right: 3, top: 3, width: 24, height: 24 },
            classNames: ['flame-fullscreen-close'],
            // XXX image support in ButtonView?
            handlebars: "<img style='margin: 3px;' src='%@'>".fmt(Flame.image('fullscreen_off.png')),
            action: function() {
                this.getPath('owner').exitFullscreen();
            }
        });
    }.property(),

    // A statechart would perhaps make sense here, but as FullscreenSupport is meant to be mixed in to any view
    // you want full-screenable, that view might already be using a statechart for other purposes?
    enterFullscreen: function() {
        if (!this.get('isFullscreen')) {
            // The close button cannot be a child of the pane, because then it's not shown in front of the fullscreen stuff.
            // This is apparently because the pane establishes a stacking context, see http://www.w3.org/TR/CSS21/visuren.html#propdef-z-index
            var pane, closeButton;
            this.set('_pane', pane = this.get('modalPane'));
            this.set('_button', closeButton = this.get('closeButton'));
            pane.set('owner', this);
            closeButton.set('owner', this);
            pane.append();
            closeButton.append();

            var element = this.$();
            var oldAttributes = {
                left: element.css('left'), 
                top: element.css('top'),
                right: element.css('right'),
                bottom: element.css('bottom'),
                width: element.css('width'),
                height: element.css('height'),
                position: element.css('position'),
                zIndex: element.css('zIndex')
            };

            // If both left & right or top & bottom is defined, discard width/height to keep the layout fluid when exiting fullscreen
            if (oldAttributes.left !== 'auto' && oldAttributes.right !== 'auto') oldAttributes.width = undefined;
            if (oldAttributes.top !== 'auto' && oldAttributes.bottom !== 'auto') oldAttributes.height = undefined;
            this.set('_oldAttributes', oldAttributes);

            element.css({ left: 0, top: 0, right: 0, bottom: 0, width: '', height: '', position: 'fixed', zIndex: '50' });

            this.set('isFullscreen', true);
        }
    },

    exitFullscreen: function() {
        if (this.get('isFullscreen')) {
            this.$().css(this.get('_oldAttributes'));
            this.get('_pane').remove();
            this.get('_button').remove();

            this.set('isFullscreen', false);
        }
    }
};
