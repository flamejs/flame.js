//= require_tree ./mixins
//= require ./layout_manager
//= require_self
//= require_tree ./views

Ember.View.reopen({
    // Finds the first descendant view for which given property evaluates to true. Proceeds depth-first.
    firstDescendantWithProperty: function(property) {
        var result;
        this.forEachChildView(function(childView) {
            if (result === undefined) {
                if (childView.get(property)) {
                    result = childView;
                } else {
                    result = childView.firstDescendantWithProperty(property);
                }
            }
        });
        return result;
    }
});

Flame.reopen({
    ALIGN_LEFT: 'align-left',
    ALIGN_RIGHT: 'align-right',
    ALIGN_CENTER: 'align-center',

    POSITION_BELOW: 1 << 0,
    POSITION_RIGHT: 1 << 1,
    POSITION_LEFT: 1 << 2,
    POSITION_ABOVE: 1 << 3,
    POSITION_MIDDLE: 1 << 4,

    FOCUS_RING_MARGIN: 3
});

// Base class for Flame views. Can be used to hold child views or render a template. In Ember, you normally either use
// Ember.View for rendering a template or Ember.ContainerView to render child views. But we want to support both here, so
// that we can use e.g. Flame.ListItemView for items in list views, and the app can decide whether to use a template or not.
Flame.View = Ember.ContainerView.extend(Flame.LayoutSupport, Flame.EventManager, {
    displayProperties: [],
    isFocused: false,  // Does this view currently have key focus?

    init: function() {
        this._super();

        // There's a 'gotcha' in Ember that we need to work around here: an Ember.View does not have child views in the sense
        // that you cannot define them yourself. But when used with a handlebars template, Ember.View uses child views
        // internally to keep track of dynamic portions in the template so that they can be updated in-place in the DOM.
        // The template rendering process adds this kind of child views on the fly. The problem is that we need to extend
        // Ember.ContainerView here (see above), and that observes the child views to trigger a re-render, which then happens
        // when we're already in the middle of a render, crashing with error 'assertion failed: You need to provide an
        // object and key to `get`' (happens because parent buffer in a render buffer is null).
        if (this.get('template')) {
            this.set('states', Ember.View.states);  // Use states from Ember.View to remedy the problem
        }

        // Add observers for displayProperties so that the view gets rerendered if any of them changes
        var properties = this.get('displayProperties') || [];
        for (var i = 0; i < properties.length; i++) {
            var property = properties[i];
            this.addObserver(property, this, this.rerender);
        }

    },

    render: function(buffer) {
        this._renderElementAttributes(buffer);
        // If a template is defined, render that, otherwise use ContainerView's rendering (render childViews)
        var template = this.get('template');
        if (template) {
            // Copied from Ember.View for now
            var output = template(this.get('templateContext'), { data: { view: this, buffer: buffer, isRenderData: true, keywords: {} } });
            if (output !== undefined) { buffer.push(output); }
        } else {
            return this._super(buffer);
        }
    },

    template: function(propertyName, value) {
        if (propertyName === "template" && value !== undefined) return value;
        var str = this.get('handlebars');
        return str ? this._compileTemplate(str) : null;
    }.property('templateName', 'handlebars').cacheable(),

    // Compiles given handlebars template, with caching to make it perform better. (Called repetitively e.g.
    // when rendering a list view whose item views use a template.)
    _compileTemplate: function(template) {
        var compiled = Flame._templateCache[template];
        if (!compiled) {
            //console.log('Compiling template: %s', template);
            Flame._templateCache[template] = compiled = Ember.Handlebars.compile(template);
        }
        return compiled;
    }
});

Flame._templateCache = {};
