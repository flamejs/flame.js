import View from '../view';
import VerticalStackLayoutManager from '../layout_managers/vertical_stack_layout_manager';
import ButtonView from './button_view';
import MultiselectionButtonView from './multiselection_button_view';
import AutocompleteTextFieldView from './autocomplete_text_field_view';
import SelectButtonView from './select_button_view';
import LabelView, { ALIGN_RIGHT } from './label_view';
import TextFieldView from './text_field_view';
import TextAreaView from './text_area_view';
import CheckboxView from './checkbox_view';
import ComboBoxView from './combo_box_view';
import ErrorMessageView from './error_message_view';
import { zIndexCounter } from './panel';
import { keyResponderStack } from '../mixins/event_manager';
import { nearest } from '../utils/computed_nearest';
import { notEqual } from '../utils/computed';

// You must set on object to 'object' that the form manipulates (or use a binding)
// Optionally you can set a defaultTarget, that will be used to set the default target for any actions
// triggered from the form (button clicks and default submit via hitting enter)
export default View.extend({
    classNames: ['form-view'],
    tagName: 'form',

    defaultTarget: null,
    object: null,

    leftMargin: 20,
    rightMargin: 20,
    topMargin: 20,
    bottomMargin: 20,
    rowSpacing: 10,
    columnSpacing: 10,
    buttonSpacing: 15,
    labelWidth: 150,
    labelAlign: ALIGN_RIGHT,
    buttonWidth: 90,
    controlWidth: null,// set this if you want to force a set control width
    defaultFocus: null,
    _focusRingMargin: 3,

    init: function() {
        this._super();

        if (!this.get('layoutManager')) {
            this.set('layoutManager', VerticalStackLayoutManager.create({
                topMargin: this.get('topMargin'),
                spacing: this.get('rowSpacing'),
                bottomMargin: this.get('bottomMargin')
            }));
        }

        this.set('_errorViews', []);
        this.set('controls', []);

        this._propertiesDidChange();
    },

    _propertiesDidChange: function() {
        this.destroyAllChildren();

        this.get('properties').forEach(function(descriptor) {
            var view = this._createLabelAndControl(descriptor);
            this.pushObject(this.createChildView(view));
        }, this);

        var buttons = this.get('buttons');
        if (buttons && buttons.get('length') > 0) {
            this.pushObject(this.createChildView(this._buildButtons(buttons)));
        }
    }.observes('properties.[]'),

    _createLabelAndControl: function(desc) {
        var descriptor = Ember.Object.createWithMixins(desc);
        var control = descriptor.view || this._buildControl(descriptor);
        var formView = this;

        var view;
        if (Ember.isNone(descriptor.label)) {
            view = this._createChildViewWithLayout(control, this, this.get('leftMargin') + this._focusRingMargin, this.get('rightMargin') + this._focusRingMargin);
        }
        if (descriptor.type === 'checkbox') {
            view = this._createChildViewWithLayout(control, this, this.get('leftMargin') + this.labelWidth + this.columnSpacing - 4, this._focusRingMargin);
        }
        if (view) {
            // The FormView expects all controls to be within another view
            return View.extend({
                layoutManager: VerticalStackLayoutManager.create({ topMargin: this._focusRingMargin, spacing: 0, bottomMargin: this._focusRingMargin }),
                childViews: ['control'],
                control: view,
                isVisible: desc.isVisible === undefined ? true : desc.isVisible
            });
        }

        view = {
            layout: { left: this.get('leftMargin'), right: this.get('rightMargin') },
            layoutManager: VerticalStackLayoutManager.create({ topMargin: this._focusRingMargin, spacing: 0, bottomMargin: this._focusRingMargin }),
            childViews: ['label', 'control'],

            isVisible: desc.isVisible === undefined ? true : desc.isVisible,

            label: this._buildLabel(descriptor),
            control: function() {
                return formView._createChildViewWithLayout(control, this, formView.labelWidth + formView.columnSpacing, formView._focusRingMargin);
            }.property()
        };
        if (descriptor.get('isVisibleBinding')) {
            delete view.isVisible;
            view.isVisibleBinding = descriptor.get('isVisibleBinding');
        }

        return View.extend(view);
    },

    _createChildViewWithLayout: function(view, parent, leftMargin, rightMargin) {
        var childView = parent.createChildView(view);
        if (!childView.get('layout')) childView.set('layout', {});
        childView.set('layout.left', leftMargin);
        childView.set('layout.right', rightMargin);
        return childView;
    },

    _buildLabel: function(descriptor) {
        return LabelView.extend({
            layout: { left: 0, width: this.get('labelWidth'), top: this._focusRingMargin },
            ignoreLayoutManager: true,
            textAlign: this.get('labelAlign'),
            value: descriptor.get('label') + ':',
            attributeBindings: ['title'],
            title: descriptor.get('tooltip') || descriptor.get('label')
        });
    },

    _buildButtons: function(buttons) {
        var formView = this;
        return View.extend({
            layout: { left: this.get('leftMargin'), right: this.get('rightMargin'), topMargin: this.get('buttonSpacing'), height: 30 },
            init: function() {
                this._super();
                var right = formView._focusRingMargin;
                (buttons || []).forEach(function(descriptor) {
                    var buttonView = this.createChildView(formView._buildButton(descriptor, right));
                    right += (buttonView.get('layout.width') || 0) + 15;
                    this.pushObject(buttonView);
                }, this);
            }
        });
    },

    _buildButton: function(descriptor, right) {
        if (!descriptor.target) {
            descriptor.target = nearest('defaultTarget');
        }

        if (!descriptor.layout) {
            descriptor.layout = { width: this.get('buttonWidth'), right: right };
        }
        descriptor.layout.top = this._focusRingMargin;

        return ButtonView.extend(descriptor);
    },

    _buildValidationObservers: function(validationMessage) {
        if (Ember.isNone(validationMessage)) return {};

        var self = this;
        return {
            didInsertElement: function() {
                this._super();
                this.isValidDidChange(); // In case the field is initially invalid
            },

            isValidWillChange: function() {
                var errorView = this.get('_errorView');
                // We change from being invalid to valid and have an error view.
                if (errorView && !this.get('isValid')) {
                    errorView.remove();
                    this.set('_errorView', null);
                    self.set('_errorViews', self.get('_errorViews').without(errorView));
                }
            }.observesBefore('isValid'),

            isValidDidChange: function() {
                if (!this.get('isValid') && !this.get('_errorView')) {
                    var element = this.$();
                    var offset = element.offset();

                    // This is strictly not necessary, but currently you can save invalid form with enter, which then fails here
                    if (Ember.isNone(offset)) return;

                    var zIndex = zIndexCounter.value;
                    var errorMessage = validationMessage;
                    if (jQuery.isFunction(validationMessage)) {
                        // XXX This will only work with controls with the value in the 'value' property
                        errorMessage = validationMessage(this.get('value'));
                    }
                    var errorView = ErrorMessageView.create({
                        layout: { top: offset.top - 7, left: offset.left + element.outerWidth() - 4, width: null, height: null, zIndex: zIndex },
                        value: errorMessage,
                        parentView: self,
                        isVisibleBinding: 'parentView.isVisible'
                    }).append();

                    this.set('_errorView', errorView);
                    self.get('_errorViews').pushObject(errorView);
                }
            }.observes("isValid")
        };
    },

    _performTab: function(direction) {
        var view = keyResponderStack.current();
        // Text fields and text areas wrap around their Ember equivalent (which have the actual keyResponder status)
        if (view instanceof Ember.TextField || view instanceof Ember.TextArea) {
            view = view.get('parentView');
        }
        // Collect all controls that can have keyResponder status
        var controls = this.toArray().mapBy('childViews')
            .reduce(function(a, b) { return a.concat(b); }).filter(function(view) {
            return view.get('acceptsKeyResponder') && view.get('isVisible');
        });
        if (Ember.isEmpty(controls)) return;

        // Pick out the next or previous control
        var index = controls.indexOf(view);
        index += direction;
        if (index < 0) {
            controls.objectAt(controls.get('length') - 1).becomeKeyResponder();
        } else if (index === controls.get('length')) {
            controls.objectAt(0).becomeKeyResponder();
        } else {
            controls.objectAt(index).becomeKeyResponder();
        }
    },

    insertTab: function() {
        this._performTab(1);
        return true;
    },

    insertBacktab: function() {
        this._performTab(-1);
        return true;
    },

    _buildControl: function(descriptor) {
        var property = descriptor.get('property');
        var object = this.get('object');
        var layout = { topPadding: 1, bottomPadding: 1, width: this.get('controlWidth') };
        if (descriptor.controlLayout) jQuery.extend(layout, descriptor.controlLayout);
        var settings = {
            layout: layout,
            value: Ember.computed.alias('parentView.parentView.object.%@'.fmt(property)),
            isValid: notEqual('parentView.parentView.object.%@IsValid'.fmt(property), false),
            isDisabled: descriptor.isDisabled ? descriptor.isDisabled : Ember.computed.equal('parentView.parentView.object.%@IsDisabled'.fmt(property), true)
        };

        if (this.get('defaultFocus') === property) {
            settings.isDefaultFocus = true;
        }

        var validator = descriptor.get('validate');
        if (validator) {
            // Set up on-the-fly validation here.
            if (!object.get('validations')) { object.set('validations', {}); }
            object.setValidationFor(property, validator);
        }
        jQuery.extend(settings, this._buildValidationObservers(descriptor.get('validation')));
        var type = descriptor.get('type') || 'text';

        if (descriptor.options || descriptor.optionsBinding) type = 'select';

        // If a text field (or similar), emulate good old html forms that submit when hitting return by
        // clicking on the default button. This also prevents submitting of disabled forms.
        if (Ember.isNone(settings.action) && (type === 'text' || type === 'textarea' || type === 'password')) {
            var form = this;
            settings.fireAction = function() {
                var defaultButton = form.firstDescendantWithProperty('isDefault');
                if (defaultButton && defaultButton.simulateClick) {
                    defaultButton.simulateClick();
                }
            };
        }

        settings.classNames = settings.classNames || [];
        settings.classNames.push("form-view-" + type);

        return this._buildControlView(settings, type, descriptor);
    },

    _buildControlView: function(settings, type, descriptor) {
        switch (type) {
            case 'readonly':
                // readonly fields are selectable by default
                settings.isSelectable = descriptor.get('isSelectable') !== false;
                settings.attributeBindings = ['title'];
                settings.titleBinding = 'value';
                return LabelView.extend(settings);
            case 'text':
                settings.name = Ember.isNone(descriptor.name) ? descriptor.property : descriptor.name;
                if (descriptor.isAutocomplete) {
                    settings.autocompleteDelegate = descriptor.autocompleteDelegate;
                    return AutocompleteTextFieldView.extend(settings);
                }
                if (descriptor.setValueOnEachKeyUp === false) settings.setValueOnEachKeyUp = false;
                return TextFieldView.extend(settings);
            case 'textarea':
                settings.layout.height = descriptor.height || 70;
                return TextAreaView.extend(settings);
            case 'password':
                settings.isPassword = true;
                settings.name = Ember.isNone(descriptor.name) ? descriptor.property : descriptor.name;
                return TextFieldView.extend(settings);
            case 'html':
                return LabelView.extend(jQuery.extend(settings, {
                    escapeHTML: false,
                    formatter: function(val) {
                        return val === null ? '' : val;
                    }
                }));
            case 'checkbox':
                settings.title = descriptor.label;
                settings.isSelected = settings.value;
                delete settings.value;
                return CheckboxView.extend(settings);
            case 'select':
                settings.itemValueKey = descriptor.itemValueKey || 'value';
                settings.subMenuKey = descriptor.subMenuKey || 'subMenu';
                if (descriptor.isSelectable) settings.isSelectable = descriptor.isSelectable;
                if (descriptor.optionsBinding) {
                    settings.itemTitleKey = descriptor.itemTitleKey || 'name';
                    settings.itemsBinding = descriptor.optionsBinding;
                } else if (descriptor.options) {
                    settings.itemTitleKey = descriptor.itemTitleKey || 'title';
                    if (typeof descriptor.options === 'function') {
                        settings.items = descriptor.options.apply(this);
                    } else {
                        settings.items = descriptor.options;
                    }
                } else if (Ember.meta(descriptor).descs.options) {
                    settings.itemTitleKey = descriptor.itemTitleKey || 'title';
                    settings.items = Ember.meta(descriptor).descs.options;
                }

                if (descriptor.type === 'multiselect') {
                    if (descriptor.formatTitle) {
                        settings.formatTitle = descriptor.formatTitle;
                    }
                    return MultiselectionButtonView.extend(settings);
                } else if (descriptor.get('allowNew')) {
                    return ComboBoxView.extend(settings);
                } else {
                    return SelectButtonView.extend(settings);
                }
        }
        throw new Error('Invalid control type %@'.fmt(type));
    },

    willDestroyElement: function() {
        this.get('_errorViews').forEach(function(e) { e.remove(); });
    },

    isValid: function() {
        return this.get('_errorViews').length === 0;
    }.property('_errorViews.[]')
});
