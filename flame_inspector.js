/*
  Some tools to help developing and debugging Ember/Flame apps. Quick start guide:

   - Hold down ALT and move your mouse around your app. Elements are highlighted to show their extents.
   - While holding ALT, click on an element. This will bind the element to window.e and the associated
     view (if any) to window.v (accessible in JS console as e and v), for your further inspection.
   - While holding ALT, double click on an element. If there's a view associated with that element,
     an inspector panel is opened, showing various information about the view. Click around to explore.
   - While the inspector is open, ALT + single click also opens the view in the inspector panel.
   - You can also launch the inspector on any object in console: FlameInspector.inspect(someObject)
*/
window.FlameInspector = Ember.Object.create({
    _magicKey: 18,  // alt, if changed also has to change the .altKey check below

    _debugPanel: undefined,

    inspect: function(object, openInspector) {
        if (!FlameInspector._debugPanel && openInspector !== false) FlameInspector._debugPanel = FlameInspector.DebugPanel.create();
        if (FlameInspector._debugPanel) {
            FlameInspector._debugPanel.popup();
            FlameInspector._debugPanel.inspect(object);
        }
    },

    logEvent: function(event, eventName, view) {
        if (this._debugPanel) this._debugPanel.get('inspectorController').logEvent(event, eventName, view);
    },

    setup: function() {
        var events = {
            mouseout    : 'mouseOut',
            mouseover   : 'mouseOver',
            mousedown   : 'mouseDown',
            mouseup     : 'mouseUp',
            dblclick    : 'doubleClick'
        }, event;

        for (event in events) {
            if (events.hasOwnProperty(event)) {
                this._setupHandler(event, events[event]);
            }
        }

        this._setupHandler('keydown', 'keyDown', null);
        this._setupHandler('keyup', 'keyUp', null);
    },

    _setupHandler: function(event, handlerName, filter) {
        Ember.$(document).delegate(filter || '.ember-view', event + '.flame-inspector', function(evt, triggeringManager) {
            //console.log('%s, keycode %s', event, evt.keyCode);
            // When releasing alt, on keyup event altKey is no longer set, have to check the keyCode instead
            if (evt.altKey || (event === 'keyup' && evt.keyCode === FlameInspector._magicKey)) {
                if (FlameInspector.eventManager[handlerName]) {
                    FlameInspector.eventManager[handlerName](evt);
                }
            }

            return true;
        });
    },

    eventManager: Ember.Object.create({
        _lastView: undefined,

        keyDown: function(event) {
            // TODO would be nice to set this here, but can't seem to get the element mouse is on - target is body
            //if (event.keyCode === FlameInspector._magicKey) this.set('highlighted', event.target);
        },

        keyUp: function(event) {
            if (event.keyCode === FlameInspector._magicKey) this.set('highlighted', null);
        },

        mouseOver: function(event) {
            this.set('highlighted', event.target);
        },

        mouseOut: function(event) {
            this.set('highlighted', null);
        },

        mouseDown: function(event) {
            var element = Ember.$(event.target);
            var tagName = event.target.nodeName.toUpperCase();
            var id = element.attr('id');
            var viewElement = this._resolveOwnerViewElement(element);
            if (element === viewElement) {
                view = Ember.View.views[id];
                console.log("Clicked on element %s that is Ember view %s --> assigning to variables e and v", tagName, id);
            } else if (viewElement) {
                view = Ember.View.views[viewElement.attr('id')];
                console.log("Clicked on element %s owned by Ember view %s --> assigning to variables e and v", tagName, viewElement.attr('id'));
            } else {
                console.log("Clicked on element which is not owned by any Ember view --> assigning to variable e", tagName);
            }
            window.e = element;
            this._lastView = window.v = view;

            if (view) FlameInspector.inspect(view, false);
        },

        doubleClick: function(event) {
            FlameInspector.inspect(this._lastView);
        },

        _removeHighlight: function() {
            var element = Ember.$(this.get('highlighted'));
            element.css({backgroundColor: element.data('oldBackgroundColor') || '', backgroundImage: element.data('oldBackgroundImage')});
        }.observesBefore('highlighted'),

        _addHighlight: function() {
            var element = Ember.$(this.get('highlighted'));
            if (!element.data('oldBackgroundColor')) element.data('oldBackgroundColor', element.css('backgroundColor'));
            if (!element.data('oldBackgroundImage')) element.data('oldBackgroundImage', element.css('backgroundImage'));
            element.css({backgroundColor: '#ef6', backgroundImage: 'none'});
        }.observes('highlighted'),

        _isViewElement: function(element) {
            var id = Ember.$(element).attr('id');
            return id && id.match(/^ember[0-9]+$/);
        },

        _resolveOwnerViewElement: function(element) {
            while (element && element.length > 0 && !this._isViewElement(element)) {
                element = element.parent();
            }
            return element;
        }
    })

});

FlameInspector.RefView = Flame.LabelView.extend({
    classNames: ['flame-inspector-ref-view'],
    classNameBindings: ['typeClass', 'currentState'],
    defaultWidth: 60,
    defaultHeight: 15,

    action: function() {
        var content = this.get('content');
        if (content) {
            // We want to open it in the current inspector view (can have many inspectors open), thus look up the controller in ancestors
            Flame._lookupValueOfProperty(this, 'inspectorController').inspect(content);
            this.mouseLeave();  // Remove highlight, otherwise might get stuck

            if (content instanceof Ember.View) {
                console.log('Assigning inspected view to variable v');
                window.v = content;
            } else {
                console.log('Assigning inspected object to variable o');
                window.o = content;
            }
        }
    },

    currentState: function() {
        return this.getPath('ownerObject.currentState') === this.get('content');
    }.property('ownerObject.currentState').cacheable(),

    typeClass: function() {
        return 'flame-inspector-ref-view-'+this.get('type');
    }.property('type').cacheable(),

    type: function() {
        var content = this.get('content');
        if (Ember.none(content)) return 'none';
        else if (content instanceof Ember.View) return 'view';
        else if (content instanceof Flame.State) return 'state';
        else return 'object';
    }.property('content').cacheable(),

    value: function() {
        var content = this.get('content');
        var type = this.get('type');
        return type === 'view' ? Ember.guidFor(content) : type;
    }.property('content'),

    mouseEnter: function(event) {
        if (this.get('type') === 'view') FlameInspector.eventManager.set('highlighted', this.get('content').$());
    },

    mouseLeave: function(event) {
        if (this.get('type') === 'view') FlameInspector.eventManager.set('highlighted', undefined);
    }
});

FlameInspector.PropertyInspectorView = Flame.View.extend({
    classNames: ['flame-inspector-inspector-container'],
    childViews: ['list'],
    content: null,

    list: Flame.TreeView.extend({
        //useAbsolutePosition: true,
        layout: { left: 0, right: 0 },
        //layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 0, spacing: 0, bottomMargin: 0 }),
        classNames: ['flame-inspector-inspector'],
        allowSelection: false,
        allowReordering: false,
        defaultIsExpanded: true,
        contentBinding: 'parentView.content',

        handlebarsForItem: function(content) {
            if (content instanceof FlameInspector.PropertyGroup) {
                return '<div class="flame-inspector-property-group">{{content.name}}</div>';
            } else {
                return '<div class="flame-inspector-key" {{bindAttr title="content.key"}}>{{content.key}}</div>{{#if content.refClass}}{{view content.refClass content=content.value ownerObject=content.ownerObject useAbsolutePosition=false}}{{else}}<div {{bindAttr class="content.cssClass"}} {{bindAttr title="content.stringValue"}}>{{content.value}}</div>{{/if}}';
            }
        },

        itemViewClass: Flame.TreeItemView.extend({
            //useAbsolutePosition: true,
            layout: { left: 0, right: 0, height: 20 },
            classNames: ['flame-inspector-item']
        })
    })
});

FlameInspector.EventLogView = Flame.View.extend({
    layoutManager: Flame.VerticalStackLayoutManager.create({spacing: 1}),
    classNames: ['flame-inspector-inspector-container'],
    childViews: ['toolbar', 'list'],
    content: null,

    toolbar: Flame.View.extend({
        layout: { left: 0, right: 0, height: 20 },
        classNames: ['flame-inspector-toolbar'],
        childViews: ['clearButton', 'filterButton'],

        clearButton: Flame.ButtonView.extend({
            layout: { right: 0, width: 50, height: 20 },
            classNames: ['flame-inspector-toolbar-button'],
            title: 'Clear',
            targetBinding: '^inspectorController',
            action: 'clearEventLog'
        }),

        filterButton: Flame.ButtonView.extend({
            layout: { right: 50, width: 70, height: 20 },
            classNames: ['flame-inspector-toolbar-button'],
            title: 'Filter...',
            action: function() {
                var filterItems = Flame._lookupValueOfProperty(this, 'inspectorController').get('filterItems');
                // XXX define subclass elsewhere
                var menu = Flame.Panel.create({
                    layout: { width: 150 },
                    layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 0, spacing: 0, bottomMargin: 14 }),
                    classNames: ['flame-inspector-filter-menu', 'flame-inspector-panel'],
                    dimBackground: false,
                    acceptsKeyResponder: false,
                    contentView: Flame.StackView.extend({
                        classNames: ['flame-inspector-filter-list'],
                        content: filterItems,
                        itemViewClass: Flame.StackItemView.extend({
                            classNames: ['flame-inspector-filter-list-item'],
                            layout: { left: 0, right: 0, height: 22 },
                            childViews: ['checkboxView'],
                            checkboxView: Flame.CheckboxView.extend({
                                isSelectedBinding: 'parentView.content.isIncluded',
                                titleBinding: 'parentView.content.type'
                            })
                        })
                    })
                });
                menu.popup(this);
            }
        })
    }),

    list: Flame.ListView.extend({
        layout: { left: 0, right: 0, bottom: 0 },
        classNames: ['flame-inspector-event-log'],
        allowSelection: false,
        allowReordering: false,
        contentBinding: 'parentView.content',

        itemViewClass: Flame.ListItemView.extend({
            classNames: ['flame-inspector-event'],
            render: function(buffer) {
                this._super(buffer);
                var html = '<div style="background-color: %@"><div class="flame-inspector-event-name">%@</div><div class="flame-inspector-event-info">%@</div></div>'.fmt(
                    this.getPath('content.color'),
                    this.getPath('content.eventName'),
                    this.getPath('content.info')
                );
                buffer.push(html);
            }
        }),

        // XXX sometimes causes a weird error when switching inspected view
        /*
        emptyView: Flame.LabelView.create({
            classNames: ['flame-inspector-no-events'],
            layout: { centerX: 0, centerY: 0, width: 120 },
            textAlign: Flame.ALIGN_CENTER,
            value: 'No events logged'
        }),
        */

        childViewsDidChange: function(views, start, removed, added) {
            this._super.apply(this, arguments);

            if (added > 0) {
                // Scroll to the bottom when new events arrive, but let the display get updated first
                var element = this.$();
                Ember.run.next(function() {
                    var scrollHeight = element[0].scrollHeight;
                    element.scrollTo((scrollHeight+100)+'px');
                });
            }
        }
    })
});

FlameInspector.inspectorViewMap = Ember.Object.create({

    view: Flame.View.extend({
        layout: { left: 0, right: 0, bottom: 0 },
        childViews: ['tabView'],
        target: null,

        tabView: Flame.TabView.extend({
            tabsHeight: 20,
            tabs: [
                {title: 'Properties', value: 'properties'},
                {title: 'Event Log', value: 'events'}
            ],
            properties: FlameInspector.PropertyInspectorView.extend({
                contentBinding: 'parentView.parentView.parentView.target.inspectedObjectProperties'
            }),
            events: FlameInspector.EventLogView.extend({
                contentBinding: 'parentView.parentView.parentView.target.inspectedObjectEvents'
            })
        })
    }),

    object: Flame.View.extend({
        layout: { left: 0, right: 0, bottom: 0 },
        childViews: ['properties'],
        target: null,

        properties: FlameInspector.PropertyInspectorView.extend({
            contentBinding: 'parentView.target.inspectedObjectProperties'
        })
    })

});

FlameInspector.getObjectType = function(object) {
    if (Ember.none(object)) return undefined;
    else if (typeof object === 'string') return 'string';
    else if (typeof object === 'number') return 'number';
    else if (object instanceof Ember.View) return 'view';
    else return 'object';
};

FlameInspector.ErrorValue = Ember.Object.extend();

FlameInspector.InspectorController = Ember.Object.extend({
    inspectedObjectEvents: [],
    filterItems: [
        {isIncluded: true, type: 'mouseDown'},
        {isIncluded: true, type: 'mouseMove'},
        {isIncluded: true, type: 'mouseUp'},
        {isIncluded: true, type: 'keyDown'},
        {isIncluded: true, type: 'keyUp'},
        {isIncluded: true, type: 'gotoState'},
        {isIncluded: true, type: 'propertyChange'}
    ],

    _inspectHistory: [],
    _historyIndex: -1,
    _currentObservers: [],

    inspect: function(object) {
        if (object === this.get('inspectedObject')) return;

        this.propertyWillChange('inspectedObject');
        var history = this.get('_inspectHistory');
        var index = this.get('_historyIndex') + 1;
        while (history.get('length') > index) {
            history.removeAt(index);
        }
        this._inspectHistory.push(object);
        this.set('_historyIndex', index);
        this.propertyDidChange('inspectedObject');
    },

    clearEventLog: function() {
        var events = this.get('inspectedObjectEvents');
        events.replace(0, events.get('length'), []);
    },

    logEvent: function(event, eventName, view) {
        if (view !== this.get('inspectedObject')) return;
        var filter = this.get('filterItems').find(function(filterDesc) {
            return filterDesc.type === eventName;
        });
        if (filter && !filter.isIncluded) return;

        var info;
        var color;

        if (eventName.match(/^mouse/)) {
            info = 'pageX %@, pageY %@'.fmt(event.pageX, event.pageY);
            color = {mouseMove: '#473', mouseDown: '#251', mouseUp: '#6a4'}[eventName];
        } else if (eventName.match(/^key/)) {
            info = 'which %@'.fmt(event.which);
            color = {keyDown: '#347', keyUp: '#569'}[eventName];
        } else if (eventName === 'gotoState') {
            info = '%@ &rarr; %@'.fmt(event.oldState, event.newState);
            color = '#728';
        } else if (eventName === 'propertyChange') {
            info = '%@: %@ &rarr; %@'.fmt(event.property, event.oldValue, event.newValue);
            color = 'darkred';
        } else {
            info = '';  // Unknown event type, shouldn't happen
            color = 'crimson';
        }

        var eventRow = Ember.Object.create({
            eventName: eventName,
            info: info,  //this._eventToString(event, eventName)
            color: color
        });

        var events = this.get('inspectedObjectEvents');
        if (events.get('length') > 200) events.removeAt(0);
        events.pushObject(eventRow);
    },

    _eventToString: function(event, eventName) {
        if (eventName.match(/^mouse/)) {
            return '%@: pageX %@, pageY %@'.fmt(eventName, event.pageX, event.pageY);
        } else if (eventName.match(/^key/)) {
            return '%@: which %@'.fmt(eventName, event.which);
        } else {
            return eventName;
        }
    },

    currentStateWillChange: function() {
        var object = this.get('inspectedObject');
        var oldState = object && object.get && object.get('currentState');
        if (oldState) {
            this._oldState = oldState;  // Sneakily store here, used in currentStateDidChange
        }
    },  //.observesBefore('inspectedObject.currentState'),

    currentStateDidChange: function() {
        var object = this.get('inspectedObject');
        var currentState = object && object.get && object.get('currentState');
        if (currentState) {
            var oldStateName = this._resolveStateName(object, this._oldState);
            var newStateName = this._resolveStateName(object, currentState);
            this.logEvent({oldState: oldStateName, newState: newStateName}, 'gotoState', object);
        }
    },  //.observes('inspectedObject.currentState'),

    _resolveStateName: function(view, state) {
        if (!Ember.none(state)) {
            for (var prop in view) {
                if (prop !== '_super' && view.hasOwnProperty(prop) && view.get(prop) === state) return prop;
            }
        }
        return '(unknown)';
    },

    prev: function() {
        if (this.get('allowPrev')) {
            this.propertyWillChange('inspectedObject');  // XXX ugly
            this.decrementProperty('_historyIndex');
            this.propertyDidChange('inspectedObject');
        }
    },

    allowPrev: function() {
        return this.get('_historyIndex') > 0;
    }.property('_historyIndex'),

    next: function() {
        if (this.get('allowNext')) {
            this.propertyWillChange('inspectedObject');  // XXX ugly
            this.incrementProperty('_historyIndex');
            this.propertyDidChange('inspectedObject');
        }
    },

    allowNext: function() {
        return this.get('_historyIndex') < this.getPath('_inspectHistory.length') - 1;
    }.property('_historyIndex'),

    inspectedObject: function() {
        return this._inspectHistory.objectAt(this.get('_historyIndex'));
    }.property().cacheable(),

    // Remove observers and flush event log when inspected object changes
    inspectedObjectWillChange: function() {
        this.get('_currentObservers').forEach(function(descriptor) {
            if (descriptor.type === 'before') {
                Ember.removeBeforeObserver(descriptor.object, descriptor.prop, descriptor.target, descriptor.observer);
            } else {
                Ember.removeObserver(descriptor.object, descriptor.prop, descriptor.target, descriptor.observer);
            }
        });
        this.set('_currentObservers', []);
        this.set('inspectedObjectEvents', []);
    }.observesBefore('inspectedObject'),

    inspectedObjectDidChange: function() {
        // If we just define observers for currentState with .observes(...), we end up adding 'currentState' property to all objects
        var object = this.get('inspectedObject');
        if (object && object.get && object.get('currentState')) {
            this._addObserverAndRegisterForRemoval(object, 'currentState', this, this.currentStateWillChange, 'before');
            this._addObserverAndRegisterForRemoval(object, 'currentState', this, this.currentStateDidChange);
        }
    }.observes('inspectedObject'),

    inspectedObjectGuid: function() {
        var cur = this.get('inspectedObject');
        return cur ? Ember.guidFor(cur) : '(none)';
    }.property('inspectedObject').cacheable(),

    inspectedObjectType: function() {
        var cur = this.get('inspectedObject');
        return cur ? FlameInspector.getObjectType(cur) : undefined;
    }.property('inspectedObject').cacheable(),

    inspectedObjectProperties: function() {
        var object = this.get('inspectedObject');
        var arr = [];
        if (!object) return arr;

        var childViews = object.get && object.get('childViews');
        var childViewArray = this._generateChildViewArray(object, childViews);
        if (childViewArray) {
            arr.push(FlameInspector.PropertyGroup.create({
                name: 'child views',
                treeItemChildren: childViewArray
            }));
        }

        var stateArray = this._generateStateArray(object);
        if (stateArray) {
            arr.push(FlameInspector.PropertyGroup.create({
                name: 'flame states',
                treeItemChildren: stateArray
            }));
        }

        arr.push(FlameInspector.PropertyGroup.create({
            name: 'public properties',
            treeItemChildren: this._generatePropertyArray(object, /^[^_]+/, ['childViews'], childViews, true)
        }));

        arr.push(FlameInspector.PropertyGroup.create({
            name: 'private properties',
            treeItemChildren: this._generatePropertyArray(object, /^_/)
        }));

        return arr;
    }.property('inspectedObject').cacheable(),

    _generateStateArray: function(object) {
        if (!object.get) return null;  // No getter, no states
        var arr = [];
        for (var prop in object) {
            if (prop !== '_super' && object.hasOwnProperty(prop) && prop !== 'currentState') {  // _super causes trouble
                var value = object.get(prop);
                if (value instanceof Flame.State) {
                    var item = Ember.Object.create({
                        key: prop,
                        value: value,
                        ownerObject: object,
                        refClass: FlameInspector.RefView,
                        cssClass: 'flame-inspector-value state'
                    });

                    arr.push(item);
                }
            }
        }

        return arr.get('length') > 0 ? arr : null;
    },

    _generateChildViewArray: function(object, childViews) {
        var arr = [];
        if (Ember.none(childViews) || childViews.get('length') === 0) return null;

        var self = this;
        return childViews.map(function(childView) {
            return Ember.Object.create({
                key: self._resolveChildViewName(object, childView),
                value: childView,
                refClass: FlameInspector.RefView,
                cssClass: 'flame-inspector-value view'
            });
        });
    },

    _resolveChildViewName: function(view, childView) {
        for (var prop in view) {
            if (prop !== '_super' && view.hasOwnProperty(prop) && view.get(prop) === childView) return prop;
        }
        return '(anonymous)';
    },

    _generatePropertyArray: function(object, filter, excludeKeys, excludeValues, bind) {
        var arr = [];

        for (var prop in object) {
            if (prop !== '_super' &&
              (object.hasOwnProperty(prop) || object.constructor.prototype.hasOwnProperty(prop)) &&
              (!filter || prop.match(filter)) && (!excludeKeys || !excludeKeys.contains(prop))) {
                var value;
                try {
                    value = object.get ? object.get(prop) : object[prop];  // XXX was there some handy util method for this?
                } catch (e) {
                    value = FlameInspector.ErrorValue.create({msg: e.toString()});
                }
                if (excludeValues && excludeValues.contains(value)) continue;
                if (value instanceof Flame.State) continue;  // States handled as a separate group

                var item = Ember.Object.create({key: prop});
                this._updatePropertyItem(item, value);

                if (bind && !(value instanceof FlameInspector.ErrorValue)) {
                    var observer = this._constructObserver(object, item, prop);  // Easier to use a helper method to close over the relevant variables
                    this._addObserverAndRegisterForRemoval(object, prop, null, observer);
                }

                arr.push(item);
            }
        }

        arr.sort(function(o1, o2) { return Ember.compare(o1.key, o2.key); });
        return arr;
    },

    _addObserverAndRegisterForRemoval: function(object, prop, target, observer, type) {
        if (type === 'before') {
            Ember.addBeforeObserver(object, prop, target, observer);
        } else {
            Ember.addObserver(object, prop, target, observer);
        }
        this.get('_currentObservers').push({object: object, prop: prop, target: target, observer: observer, type: type});
    },

    _updatePropertyItem: function(item, value) {
        var refValue = value;
        var cssClass = value === null ? 'null' : typeof value;
        var refClass = null;  // This initialization is seems to be needed, otherwise the handlebars 'if' always evaluates to true
        if (value === undefined) refValue = 'undefined';
        else if (value === null) refValue = 'null';
        else if (value === true || value === false || typeof value === 'number') refValue = value.toString();
        else if (typeof value === 'function') refValue = '(function)';
        else if (typeof value === 'string') refValue = '"'+value+'"';
        else if (value instanceof FlameInspector.ErrorValue) {
            refValue = '(%@)'.fmt(value.msg);
            cssClass = 'error';
        } else if (value instanceof Ember.View) {
            refClass = FlameInspector.RefView;
        } else if (value instanceof Array) {
            cssClass = 'array';
            refValue = '['+value.join(', ')+']';
        } else {
            refClass = FlameInspector.RefView;
        }

        item.set('refClass', refClass);
        item.set('value', refValue);
        // String-safe value to be shown as tooltip (refValue may change type while we're still using the literal presentation)
        item.set('stringValue', refValue.toString());
        item.set('cssClass', 'flame-inspector-value '+cssClass);
    },

    _constructObserver: function(object, item, prop) {
        var self = this;
        return function() {
            //console.log('Property changed: %s = %s', prop, object.get(prop));
            //item.set('value', object.get(prop));
            var oldStringValue = item.get('value');
            var newValue = object.get ? object.get(prop) : object[prop];
            self._updatePropertyItem(item, newValue);
            self.logEvent({property: prop, oldValue: oldStringValue, newValue: item.get('value')}, 'propertyChange', object);
        };
    }

});

FlameInspector.PropertyGroup = Ember.Object.extend({
    name: null,
    treeItemChildren: null
});

FlameInspector.DebugPanel = Flame.Panel.extend({
    //layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 10, spacing: 10, bottomMargin: 4 }),
    layout: { right: 30, width: 300, top: 30, height: 600 },
    classNames: ['flame-inspector-panel'],
    isModal: false,
    destroyOnClose: false,
    title: 'Flame Inspector',

    inspectorController: FlameInspector.InspectorController.create(),
    currentInspectorView: null,

    inspectedObjectWillChange: function() {
        this.getPath('contentView.inspector').removeFromParent();
        if (this.get('currentInspectorView')) {
            this.get('currentInspectorView').destroy();
            this.set('currentInspectorView', null);
        }
    }.observesBefore('inspectorController.inspectedObject'),

    inspectedObjectDidChange: function() {
        var contentView = this.get('contentView');
        var type = this.getPath('inspectorController.inspectedObjectType');
        var newInspectorViewClass = FlameInspector.inspectorViewMap[type];
        if (!newInspectorViewClass) newInspectorViewClass = FlameInspector.inspectorViewMap.object;  // Default to object inspector
        var newInspectorView = contentView.createChildView(newInspectorViewClass.extend({targetBinding: 'parentView.parentView.inspectorController'}));

        contentView.get('childViews').addObject(newInspectorView);
        contentView.adjustLayout('height', '');  // Annoyingly, the layout manager sets a fixed height for us when the previous inspector is removed
        this.set('currentInspectorView', newInspectorView);
    }.observes('inspectorController.inspectedObject'),

    currentKeyResponder: function() {
        return Flame.keyResponderStack.current() || null;
    }.property('Flame.keyResponderStack.currentKeyResponder'),

    currentMouseResponder: function() {
        return Flame.get('mouseResponderView') || null;
    }.property('Flame.mouseResponderView'),

    keyResponderStack: function() {
        return Ember.copy(Flame.keyResponderStack._stack).reverse();
    }.property('Flame.keyResponderStack.currentKeyResponder').cacheable(),

    inspect: function(view) {
        this.inspectorController.inspect(view);
    },

    contentView: Flame.View.extend({
        layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 5, spacing: 10, bottomMargin: 5 }),
        layout: { left: 6, right: 6, top: 30, bottom: 6 },
        childViews: 'curMouse curKey inspectorHeader inspector'.w(),

        curMouse: Flame.View.extend({
            layout: { left: 4, right: 4, height: 22 },
            childViews: 'curMouseLabel curMouseView'.w(),
            curMouseLabel: Flame.LabelView.label('Current mouse responder:', 0, 3, 180),
            curMouseView: FlameInspector.RefView.extend({
                layout: { right: 0, top: 0, width: 60, height: 15 },
                contentBinding: '^currentMouseResponder'
            })
        }),

        curKey: Flame.View.extend({
            layoutManager: Flame.VerticalStackLayoutManager.create(),
            layout: { left: 4, right: 4, height: 22 },
            childViews: 'curKeyLabel stackView'.w(),
            curKeyLabel: Flame.LabelView.extend({
                layout: { left: 0, top: 3, width: 180 },
                ignoreLayoutManager: true,
                value: 'Key responder stack:'
            }),
            stackView: Flame.StackView.extend({
                layout: { right: 0, width: 66, top: 0 },
                contentBinding: '^keyResponderStack',
                itemViewClass: Flame.StackItemView.extend({
                    layout: { left: 0, right: 0, height: 22 },
                    childViews: ['ref'],
                    ref: FlameInspector.RefView.extend({
                        layout: { left: 0, right: 0, height: 15 },
                        contentBinding: 'parentView.content'
                    })
                })
            })
        }),

        inspectorHeader: Flame.View.extend({
            layout: { left: 4, right: 4, height: 22 },
            childViews: 'labelView prevView nextView curView'.w(),

            labelView: Flame.LabelView.label('Inspector', 0, 3, 180),
            prevView: Flame.ButtonView.extend({
                layout: { right: 95, top: 0, width: 19, height: 19 },
                classNames: ['flame-inspector-hist', 'flame-inspector-prev'],
                handlebars: '<label>&#9664;</label>',
                isDisabled: Flame.computed.not('target.allowPrev'),
                targetBinding: '^inspectorController',
                action: 'prev'
            }),
            nextView: Flame.ButtonView.extend({
                layout: { right: 72, top: 0, width: 19, height: 19 },
                classNames: ['flame-inspector-hist', 'flame-inspector-next'],
                handlebars: '<label>&#9654;</label>',
                isDisabled: Flame.computed.not('target.allowNext'),
                targetBinding: '^inspectorController',
                action: 'next'
            }),
            curView: FlameInspector.RefView.extend({
                layout: { right: 0, top: 0, width: 60, height: 15 },
                contentBinding: '^inspectorController.inspectedObject'
            })
        }),

        inspector: Flame.View.extend({
            layout: { left: 0, right: 0, bottom: 0 }
        })
    })

});

FlameInspector.setup();
