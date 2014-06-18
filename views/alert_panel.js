//= require ./image_view
//= require ./panel
//= require ./label_view
//= require ./button_view

Flame.AlertPanel = Flame.Panel.extend();

Flame.AlertPanel.INFO_ICON = Flame.image('info_icon.png');
Flame.AlertPanel.WARN_ICON = Flame.image('warn_icon.png');
Flame.AlertPanel.ERROR_ICON = Flame.image('error_icon.png');


Flame.AlertPanelButtonView = Flame.View.extend({
    layout: { width: '100%', right: 0, height: 30 },
    childViews: 'cancelButtonView confirmButtonView'.w(),
    cancelButtonTitle: 'Cancel',
    confirmButtonTitle: 'OK',
    isCancelVisible: true,
    isConfirmVisible: true,
    isCancelDisabled: false,
    isConfirmDisabled: false,
    alertPanelView: null,

    cancelButtonView: Flame.ButtonView.extend({
        layout: { width: 90, bottom: 2, right: 110 },
        title: Ember.computed.alias('parentView.cancelButtonTitle'),
        isVisible: Ember.computed.alias('parentView.isCancelVisible'),
        isDisabled: Ember.computed.alias('parentView.isCancelDisabled'),
        action: function() {
            this.get('parentView.alertPanelView').onCancel();
        }
    }),

    confirmButtonView: Flame.ButtonView.extend({
        layout: { width: 90, bottom: 2, right: 2 },
        title: Ember.computed.alias('parentView.confirmButtonTitle'),
        isVisible: Ember.computed.alias('parentView.isConfirmVisible'),
        isDisabled: Ember.computed.alias('parentView.isConfirmDisabled'),
        isDefault: true,
        action: function() {
            this.get('parentView.alertPanelView').onConfirm();
        }
    })
});

Flame.AlertPanelMessageView = Flame.View.extend({
    layout: { left: 10, right: 2, height: 'measuredHeight'},
    childViews: 'iconView messageView'.w(),
    messageViewWidth: 0,
    measuredHeight: function() {
        var width  = "width: %@px;".fmt(this.get('messageViewWidth'));
        var parentClasses = this.get('parentView.parentView.classNames').join(' ');
        var elementClasses = this.get('messageView.classNames').join(' ');
        var computedMessageViewHeight = Flame.measureString(this.get('message'), parentClasses, elementClasses, width).height;
        return Math.max(Math.min(computedMessageViewHeight, 600), 50);
    }.property('message', 'messageViewWidth'),
    message: null,

    iconView: Flame.ImageView.extend({
        layout: { left: 10 },
        value: Flame.computed.nearest('icon')
    }),

    messageView: Flame.LabelView.extend({
        layout: { left: 75, right: 2, height: null },
        didInsertElement: function() {
            this.set('parentView.messageViewWidth', this.$().width());
        },
        allowWrapping: true,
        value: Ember.computed.alias('parentView.message')
    })
});

Flame.AlertPanel.reopen({
    layout: { centerX: 0, centerY: -50, width: 400 },

    layoutManager: Flame.VerticalStackLayoutManager.create({}),
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
    confirmButtonTitle: 'OK',
    cancelButtonTitle: 'Cancel',

    contentView: Flame.View.extend({
        layout: { left: 15, right: 15, top: 36, bottom: 15 },
        layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 20, bottomMargin: 20, spacing: 10 }),
        childViews: 'messageView buttonView'.w(),

        messageView: Flame.AlertPanelMessageView.extend({
            message: Flame.computed.nearest('message'),
        }),
        buttonView: Flame.AlertPanelButtonView.extend({
            confirmButtonTitle: Flame.computed.nearest('confirmButtonTitle'),
            cancelButtonTitle: Flame.computed.nearest('cancelButtonTitle'),
            alertPanelView: Ember.computed.alias('parentView.parentView'),
            isCancelVisible: Flame.computed.nearest('isCancelVisible'),
            isConfirmVisible: Flame.computed.nearest('isConfirmVisible')
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
        return this.createWithMixins(config);
    },

    warn: function(config) {
        config = jQuery.extend(config || {}, {icon: Flame.AlertPanel.WARN_ICON});
        return this.createWithMixins(config);
    },

    error: function(config) {
        config = jQuery.extend(config || {}, {icon: Flame.AlertPanel.ERROR_ICON});
        return this.createWithMixins(config);
    }
});
