//= require ./image_view
//= require ./panel
//= require ./label_view
//= require ./button_view
//= require ./text_area_view

Flame.AlertPanel = Flame.Panel.extend();

Flame.AlertPanel.INFO_ICON = Flame.image('info_icon.png');
Flame.AlertPanel.WARN_ICON = Flame.image('warn_icon.png');
Flame.AlertPanel.ERROR_ICON = Flame.image('error_icon.png');

Flame.AlertPanel.reopen({
    layout: { centerX: 0, centerY: -50, width: 400, height: 155 },
    classNames: 'flame-alert-panel'.w(),
    icon: Flame.AlertPanel.INFO_ICON,
    isModal: true,
    allowClosingByClickingOutside: false,
    allowMoving: true,
    isCancelVisible: true,
    isConfirmVisible: true,
    isCloseable: true,
    title: '',
    message: '',
    details: '',
    cancelButtonTitle: 'Cancel',
    confirmButtonTitle: 'OK',
    detailsButtonTitle: 'Show details',
    closeButtonTitle: 'Close',

    contentView: Flame.View.extend({
        layout: { left: 15, right: 15, top: 36, bottom: 15 },
        childViews: 'iconView messageView detailsButtonView cancelButtonView okButtonView'.w(),

        iconView: Flame.ImageView.extend({
            layout: { left: 10, top: 10 },
            valueBinding: '^icon'
        }),

        messageView: Flame.LabelView.extend({
            layout: { left: 75, top: 10, right: 2, bottom: 30 },
            valueBinding: '^message'
        }),

        detailsPanelView: Flame.Panel.extend({
            layout: { centerX: 0, centerY: -25, width: 800, height: 500 },
            dimBackground: false,
            contentView: Flame.View.extend({
                layout: { left: 15, right: 15, top: 36, bottom: 15 },
                childViews: 'textAreaView closeButtonView'.w(),
                textAreaView: Flame.TextAreaView.extend({
                    layout: { left: 10, top: 10, right: 10, bottom: 30 },
                    valueBinding: '^details'
                    // TODO: readOnly: true
                }),
                closeButtonView: Flame.ButtonView.extend({
                    layout: { width: 90, bottom: 2, right: 2 },
                    titleBinding: '^closeButtonTitle',
                    action: function() {
                        this.getPath('parentView.parentView').close();
                    }
                })
            })
        }),

        detailsButtonView: Flame.ButtonView.extend({
            layout: { width: 180, bottom: 2, left: 2 },
            titleBinding: '^detailsButtonTitle',
            isVisibleBinding: SC.Binding.bool('^details'),
            detailsBinding: '^details',
            closeButtonTitleBinding: '^closeButtonTitle',
            action: function() {
                this.getPath('parentView.detailsPanelView').create({
                    details: this.get('details'),
                    closeButtonTitle: this.get('closeButtonTitle')
                }).popup();
            }
        }),

        cancelButtonView: Flame.ButtonView.extend({
            layout: { width: 90, bottom: 2, right: 110 },
            titleBinding: '^cancelButtonTitle',
            isVisibleBinding: '^isCancelVisible',
            action: function() {
                this.getPath('parentView.parentView').onCancel();
            }
        }),

        okButtonView: Flame.ButtonView.extend({
            layout: { width: 90, bottom: 2, right: 2 },
            titleBinding: '^confirmButtonTitle',
            isVisibleBinding: '^isConfirmVisible',
            isDefault: true,
            action: function() {
                this.getPath('parentView.parentView').onConfirm();
            }

        })
    }),

    // Key event handler for ESC
    cancel: function() {
        this.onCancel();
    },

    // override this to actually do something when user clicks OK
    onConfirm: function() {
        if (this.get('isCloseable')) this.close();
    },

    // override this to actually do something when user clicks Cancel
    onCancel: function() {
        if (this.get('isCloseable')) this.close();
    }
});


Flame.AlertPanel.reopenClass({
    info: function(config) {
        config = jQuery.extend(config || {}, {icon: Flame.AlertPanel.INFO_ICON, isCancelVisible: false});
        return Flame.AlertPanel.create(config);
    },
    warn: function(config) {
        config = jQuery.extend(config || {}, {icon: Flame.AlertPanel.WARN_ICON});
        return Flame.AlertPanel.create(config);
    },
    error: function(config) {
        config = jQuery.extend(config || {}, {icon: Flame.AlertPanel.ERROR_ICON});
        return Flame.AlertPanel.create(config);
    }
});
