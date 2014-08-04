//= require_tree ./mixins
//= require ./layout_manager
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

/**
  Base class for Flame views. Can be used to hold child views or render a template. In Ember, you normally either use
  Ember.View for rendering a template or Ember.ContainerView to render child views. But we want to support both here, so
  that we can use e.g. Flame.ListItemView for items in list views, and the app can decide whether to use a template or not.
*/
Flame.View = Ember.ContainerView.extend(Flame.ViewSupport, Flame.LayoutSupport, Flame.EventManager, {
    isFocused: false, // Does this view currently have key focus?

    init: function() {
        // Adds support for conditionally rendering child views, e.g.:
        //   childViews: ['labelView', 'hasButton:buttonView']
        // will only render the buttonView if this.get('hasButton') is true.
        var childViews = this.get('childViews');
        if (!childViews) {
            this._super();
            return;
        }
        var length = childViews.length;
        var removedCount = 0;
        var childViewsToCreate;
        for (var i = 0; i < length; i++) {
            var childView = childViews[i];
            if (childView.indexOf(':') > -1) {
                childViewsToCreate = childViewsToCreate || childViews.slice(0);
                var split = childView.split(':');
                if (this.get(split[0])) {
                    childViewsToCreate[i - removedCount] = split[1];
                } else {
                    childViewsToCreate.splice(i - removedCount, 1);
                    removedCount++;
                }
            }
        }
        if (childViewsToCreate) this.set('childViews', childViewsToCreate);

        this._super();
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
