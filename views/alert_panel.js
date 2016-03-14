import View from '../view';
import Panel from '../views/panel';
import ButtonView from '../views/button_view';
import LabelView from '../views/label_view';
import ImageView from '../views/image_view';
import VerticalStackLayoutManager from '../layout_managers/vertical_stack_layout_manager';
import { nearest } from '../utils/computed_nearest';
import { image } from '../utils/images';
import { measureString } from '../utils/string_measurement';

const { alias } = Ember.computed;

const AlertPanel = Panel.extend();

export const INFO_ICON = image('info_icon.svg');
export const WARN_ICON = image('warn_icon.svg');
export const ERROR_ICON = image('error_icon.svg');

export const AlertPanelButtonView = View.extend({
    layout: { width: '100%', right: 0, height: 30 },
    childViews: ['cancelButtonView', 'confirmButtonView'],
    cancelButtonTitle: 'Cancel',
    confirmButtonTitle: 'OK',
    isCancelVisible: true,
    isConfirmVisible: true,
    isCancelDisabled: false,
    isConfirmDisabled: false,
    alertPanelView: null,

    cancelButtonView: ButtonView.extend({
        layout: { width: 90, bottom: 2, right: 110 },
        title: alias('parentView.cancelButtonTitle'),
        isVisible: alias('parentView.isCancelVisible'),
        isDisabled: alias('parentView.isCancelDisabled'),
        action: function() {
            this.get('parentView.alertPanelView').onCancel();
        }
    }),

    confirmButtonView: ButtonView.extend({
        layout: { width: 90, bottom: 2, right: 2 },
        title: alias('parentView.confirmButtonTitle'),
        isVisible: alias('parentView.isConfirmVisible'),
        isDisabled: alias('parentView.isConfirmDisabled'),
        isDefault: true,
        action: function() {
            this.get('parentView.alertPanelView').onConfirm();
        }
    })
});

export const AlertPanelMessageView = View.extend({
    layout: { left: 10, right: 2, height: 'measuredHeight' },
    childViews: ['iconView', 'messageView'],
    messageViewWidth: 0,
    measuredHeight: function() {
        var width  = "width: %@px;".fmt(this.get('messageViewWidth'));
        var parentClasses = this.nearestOfType(AlertPanel).get('classNames').join(' ');
        var elementClasses = this.get('messageView.classNames').join(' ');
        var computedMessageViewHeight = measureString(this.get('message'), parentClasses, elementClasses, width).height;
        return Math.max(Math.min(computedMessageViewHeight, 600), 50);
    }.property('message', 'messageViewWidth'),
    message: null,

    iconView: ImageView.extend({
        layout: { left: 10 },
        value: nearest('icon')
    }),

    messageView: LabelView.extend({
        layout: { left: 75, right: 2, height: null },
        didInsertElement: function() {
            this.set('parentView.messageViewWidth', this.$().width());
        },
        allowWrapping: true,
        value: alias('parentView.message'),
        isSelectable: true
    })
});

AlertPanel.reopen({
    layout: { centerX: 0, centerY: -50, width: 400 },

    layoutManager: VerticalStackLayoutManager.create(),
    classNames: ['flame-alert-panel'],
    icon: INFO_ICON,
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

    contentView: View.extend({
        layout: { left: 15, right: 15, top: 36, bottom: 15 },
        layoutManager: VerticalStackLayoutManager.create({ topMargin: 20, bottomMargin: 17, spacing: 10 }),
        childViews: ['messageView', 'buttonView'],

        messageView: AlertPanelMessageView.extend({
            message: nearest('message')
        }),
        buttonView: AlertPanelButtonView.extend({
            confirmButtonTitle: nearest('confirmButtonTitle'),
            cancelButtonTitle: nearest('cancelButtonTitle'),
            alertPanelView: alias('parentView.parentView'),
            isCancelVisible: nearest('isCancelVisible'),
            isConfirmVisible: nearest('isConfirmVisible')
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

AlertPanel.reopenClass({
    info: function(config) {
        config = jQuery.extend(config || {}, { icon: INFO_ICON, isCancelVisible: false });
        return this.createWithMixins(config);
    },

    warn: function(config) {
        config = jQuery.extend(config || {}, { icon: WARN_ICON });
        return this.createWithMixins(config);
    },

    error: function(config) {
        config = jQuery.extend(config || {}, { icon: ERROR_ICON });
        return this.createWithMixins(config);
    }
});

export default AlertPanel;
