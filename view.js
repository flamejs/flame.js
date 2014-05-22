//= require_tree ./mixins
//= require ./layout_manager
//= require ./view_support
//= require_self
//= require_tree ./views

Ember.View.reopen({
    // Finds the first descendant view for which given property evaluates to true. Proceeds depth-first.
    firstDescendantWithProperty: function(property) {
        var result;
        this.forEachChildView(function(childView) {
            if (!(childView instanceof Ember.View)) return;
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

    FOCUS_RING_MARGIN: 3
});

// Base class for Flame views. Can be used to hold child views or render a template. In Ember, you normally either use
// Ember.View for rendering a template or Ember.ContainerView to render child views. But we want to support both here, so
// that we can use e.g. Flame.ListItemView for items in list views, and the app can decide whether to use a template or not.
Flame.View = Ember.ContainerView.extend(Flame.ViewSupport, Flame.LayoutSupport, Flame.EventManager, {
    displayProperties: [],
    isFocused: false, // Does this view currently have key focus?

    init: function() {
        this._super();

        // Remove classNames up to FlameView to make it easier to define custom
        // styles for buttons, checkboxes etc..
        // We only want to do this in the init of class that sets the flag
        if (Object.getPrototypeOf && Object.getPrototypeOf(this).resetClassNames) {
            var superClassNames = this._collectSuperClassNames();
            var classNames = this.get('classNames').removeObjects(superClassNames);
            this.set('classNames', classNames);
        }
    },

    // Collects the classNames that were defined in super classes, but not
    // classNames in Flame.View or superclasses that are above it in the
    // class hierarchy
    _collectSuperClassNames: function() {
        var superClassNames = [];
        var superClass = Object.getPrototypeOf(Object.getPrototypeOf(this))
        while (superClass && superClass.constructor !== Flame.View) {
            superClassNames.pushObjects(superClass.classNames || []);
            superClass = Object.getPrototypeOf(superClass);
        }
        // Add back the classNames from Flame.View and deeper
        if (superClass.constructor === Flame.View) {
            superClassNames.removeObjects(superClass.classNames);
        }
        return superClassNames;
    },

    render: function(buffer) {
        // If a template is defined, render that, otherwise use ContainerView's rendering (render childViews)
        var get = Ember.get;
        var template = this.get('template');
        if (template) {
            // TODO should just call Ember.View.prototype.render.call(this, buffer) here (for that we need to rename `layout` to something else first)
            var context = get(this, 'context');
            var keywords = this.cloneKeywords();
            var output;

            var data = {
                view: this,
                buffer: buffer,
                isRenderData: true,
                keywords: keywords,
                insideGroup: get(this, 'templateData.insideGroup')
            };

            // Invoke the template with the provided template context, which
            // is the view's controller by default. A hash of data is also passed that provides
            // the template with access to the view and render buffer.

            Ember.assert('template must be a function. Did you mean to call Ember.Handlebars.compile("...") or specify templateName instead?', typeof template === 'function');
            // The template should write directly to the render buffer instead
            // of returning a string.
            output = template(context, { data: data });

            // If the template returned a string instead of writing to the buffer,
            // push the string onto the buffer.
            if (output !== undefined) { buffer.push(output); }
        } else {
            this._super(buffer);
        }
    },

    // For Ember 1.0, removeChild on ContainerViews expects there not to be any SimpleHandlebarsView children
    // Flame.View extends ContainerView, but it allows templates, so there will be SimpleHandlebarsViews children.
    // This is the Ember.View implementation of removeChild for when there is a template.
    removeChild: function(view) {
        if (this.get('template')) {
            // there is a template - use Ember.View's `removeChild`
            var set = Ember.set;
            return Ember.View.prototype.removeChild.call(this, view);
        } else {
            // no template - use Ember.ContainerView's `removeChild`
            return this._super(view);
        }
    },

    template: function() {
        var handlebarsStr = this.get('handlebars');
        if (handlebarsStr) return this._compileTemplate(handlebarsStr);

        var templateName = this.get('templateName'),
            template = this.templateForName(templateName, 'template');
        return template || null;
    }.property('templateName', 'handlebars'),

    // Compiles given handlebars template, with caching to make it perform better. (Called repetitively e.g.
    // when rendering a list view whose item views use a template.)
    _compileTemplate: function(template) {
        var compiled = Flame._templateCache[template];
        if (!compiled) {
            Flame._templateCache[template] = compiled = Ember.Handlebars.compile(template);
        }
        return compiled;
    }
});

Flame._templateCache = {};
