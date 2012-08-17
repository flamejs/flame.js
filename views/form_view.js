//
// You must set on object to 'object' that the form manipulates (or use a binding)
// Optionally you can set a defaultTarget, that will be used to set the default target for any actions
// triggered from the form (button clicks and default submit via hitting enter)
//
Flame.FormView = Flame.View.extend({
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
    labelAlign: Flame.ALIGN_RIGHT,
    buttonWidth: 90,
    controlWidth: null,// set this if you want to force a set control width
    defaultFocus: null,
    _focusRingMargin: 3,

    init: function() {
        this._super();

        this.set('layoutManager', Flame.VerticalStackLayoutManager.create({
            topMargin: this.get('topMargin'),
            spacing: this.get('rowSpacing'),
            bottomMargin: this.get('bottomMargin')
        }));

        this.set('_errorViews', []);
        this.set('controls', []);

        this._propertiesDidChange();
    },

    _propertiesDidChange: function() {
        this.destroyAllChildren();

        var self = this;
        var childViews = this.get('childViews');
        this.get('properties').forEach(function(descriptor) {
            var view = self._createLabelAndControl(descriptor);
            childViews.push(self.createChildView(view));
        });

        var buttons = this.get('buttons');
        if (buttons && buttons.get('length') > 0) {
            childViews.push(this.createChildView(this._buildButtons(buttons)));
        }
    }.observes('properties.@each'),

    _createLabelAndControl: function(descriptor) {
        descriptor = Ember.Object.create(descriptor);
        var control = descriptor.view || this._buildControl(descriptor);
        var formView = this;

        if (Ember.none(descriptor.label)) {
            return this._createChildViewWithLayout(control, this, this.get('leftMargin') + this._focusRingMargin, this.get('rightMargin') + this._focusRingMargin);
        }
        if (descriptor.type === 'checkbox') {
            return this._createChildViewWithLayout(control, this, this.get('leftMargin') + this.labelWidth + this.columnSpacing - 4, this._focusRingMargin);
        }

        var view = {
            layout: { left: this.get('leftMargin'), right: this.get('rightMargin') },
            layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: this._focusRingMargin, spacing: 0, bottomMargin: this._focusRingMargin }),
            childViews: ['label', 'control'],

            isVisible: descriptor.get('isVisible') === undefined ? true : descriptor.get('isVisible'),

            label: this._buildLabel(descriptor),
            control: function () {
                return formView._createChildViewWithLayout(control, this, formView.labelWidth + formView.columnSpacing, formView._focusRingMargin);
            }.property().cacheable()
        };
        if (descriptor.get('isVisibleBinding')) view.isVisibleBinding = descriptor.get('isVisibleBinding');

        return Flame.View.extend(view);
    },

    _createChildViewWithLayout: function(view, parent, leftMargin, rightMargin) {
        var childView = parent.createChildView(view);
        if (!childView.get('layout')) childView.set('layout', {});
        childView.setPath('layout.left', leftMargin);
        childView.setPath('layout.right', rightMargin);
        return childView;
    },

    _buildLabel: function(descriptor) {
        return Flame.LabelView.extend({
            layout: { left: 0, width: this.get('labelWidth'), top: this._focusRingMargin },
            ignoreLayoutManager: true,
            textAlign: this.get('labelAlign'),
            value: descriptor.get('label') + ':'
        });
    },

    _buildButtons: function(buttons) {
        var formView = this;
        return Flame.View.extend({
            layout: { left: this.get('leftMargin'), right: this.get('rightMargin'), topMargin: this.get('buttonSpacing'), height: 30 },
            init: function() {
                this._super();
                var childViews = this.get('childViews');
                var right = formView._focusRingMargin;
                var self = this;
                (buttons || []).forEach(function(descriptor) {
                    var buttonView = self.createChildView(formView._buildButton(descriptor, right));
                    right += (buttonView.getPath('layout.width') || 0) + 15;
                    childViews.push(buttonView);
                });
            }
        });
    },

    _buildButton: function(descriptor, right) {
        var properties = jQuery.extend({
            targetBinding: '^defaultTarget'
        }, descriptor);

        if (!properties.layout) {
            properties.layout = { width: this.get('buttonWidth'), right: right };
        }
        properties.layout.top = this._focusRingMargin;

        //if an explicit target is set, we don't want the default targetBinding to be used
        if (descriptor.target) {
            delete properties.targetBinding;
        }

        return Flame.ButtonView.extend(properties);
    },

    _buildValidationObservers: function(validationMessage) {
        if (Ember.none(validationMessage)) return {};

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
                    self._errorViews = self._errorViews.without(errorView);
                }
            }.observesBefore('isValid'),

            isValidDidChange: function() {
                if (!this.get('isValid') && !this.get('_errorView')) {
                    var element = this.$();
                    var offset = element.offset();

                    // This is strictly not necessary, but currently you can save invalid form with enter, which then fails here
                    if (Ember.none(offset)) return;

                    var zIndex = Flame._zIndexCounter;
                    var errorMessage = validationMessage;
                    if (jQuery.isFunction(validationMessage)) {
                        // XXX This will only work with controls with the value in the 'value' property
                        errorMessage = validationMessage(this.get('value'));
                    }
                    var errorView = Flame.LabelView.extend({
                        classNames: 'flame-form-view-validation-error'.w(),
                        textAlign: Flame.ALIGN_LEFT,
                        layout: { top: offset.top - 7, left: offset.left + element.outerWidth() - 4, width: null, height: null, zIndex: zIndex },
                        value: errorMessage,
                        handlebars: '<div class="error-triangle"></div><div class="error-box">{{value}}</div>'
                    }).create().append();

                    this.set("_errorView", errorView);
                    self._errorViews.push(errorView);
                }
            }.observes("isValid")
        };
    },

    _performTab: function(direction) {
        var view = Flame.keyResponderStack.current();
        // Text fields and text areas wrap around their Ember equivalent (which have the actual keyResponder status)
        if (view instanceof Ember.TextField || view instanceof Ember.TextArea) {
            view = view.get('parentView');
        }
        // XXX it would be better to cache this, but since it's only a temporary solution and because it's fast
        // enough even in IE8, it's not worth the effort.
        // Collect all controls that can have keyResponder status
        var controls = this.get('childViews').mapProperty('childViews').flatten().filter(function(view) {
            return view.get('acceptsKeyResponder') && view.get('isVisible');
        });
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
        var settings = {
            layout: { topPadding: 1, bottomPadding: 1, width: this.get('controlWidth') },
            valueBinding: '^object.%@'.fmt(property),
            isValid: Flame.computed.notEquals('parentView.parentView.object.%@IsValid'.fmt(property), false)
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
        if (Ember.none(settings.action) && (type === 'text' || type === 'textarea' || type === 'password')) {
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
                settings.isSelectable = descriptor.get('isSelectable') === false ? false : true;
                settings.attributeBindings = ['title'];
                settings.titleBinding = 'value';
                return Flame.LabelView.extend(settings);
            case 'text':
                return Flame.TextFieldView.extend(settings);
            case 'textarea':
                settings.layout.height = descriptor.height || 70;
                return Flame.TextAreaView.extend(settings);
            case 'password':
                settings.isPassword = true;
                return Flame.TextFieldView.extend(settings);
            case 'html':
                return Flame.LabelView.extend(jQuery.extend(settings, {escapeHTML: false, formatter: function(val) {
                    return val === null ? '' : val;
                }}));
            case 'checkbox':
                settings.title = descriptor.label;
                settings.isSelectedBinding = settings.valueBinding;
                delete settings.valueBinding;
                return Flame.CheckboxView.extend(settings);
            case 'select':
                settings.itemValueKey = descriptor.itemValueKey || "value";
                settings.subMenuKey = descriptor.subMenuKey || "subMenu";
                if (descriptor.optionsBinding) {
                    settings.itemTitleKey = descriptor.itemTitleKey || "name";
                    settings.itemsBinding = descriptor.optionsBinding;
                } else if (descriptor.options) {
                    settings.itemTitleKey = descriptor.itemTitleKey || "title";
                    settings.items = descriptor.options;
                }
                return Flame.SelectButtonView.extend(settings);
        }
        throw 'Invalid control type %@'.fmt(type);
    },

    willDestroyElement: function() {
        this._errorViews.forEach(function(e) { e.remove(); });
    }
});
