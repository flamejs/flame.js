/*
 Converts height, width, left, right,top, bottom, centerX and centerY
 to a layout hash used in Flame.View
*/
function handleLayoutHash(hash) {
    var layout = null;
    if (hash.width > 0 || hash.height > 0 || hash.top > 0 || hash.bottom > 0 || hash.left > 0 || hash.right > 0 || hash.centerX !== null || hash.centerY !== null) {
        layout = { width: hash.width, height: hash.height, bottom: hash.bottom, top: hash.top, left: hash.left, right: hash.right, centerX: hash.centerX, centerY: hash.centerY };
    }
    return layout;
}

/*
 Usage:
   {{flameView Flame.ButtonView top=10 bottom=20 title="Save"}}
*/
Ember.Handlebars.registerHelper('flameView', function(path, options) {
    Ember.assert("The view helper only takes a single argument", arguments.length <= 2);
    // If no path is provided, treat path param as options.
    if (path && path.data && path.data.isRenderData) {
        options = path;
        path = "Flame.View";
    }
    var hash = options.hash;

    hash.layout = handleLayoutHash(hash);

    Ember.Handlebars.ViewHelper.helper(this, path, options);
});

/*
  Usage:
   {{#tabView height="300" width="300"}}
      {{#tab title="One" value="one"}}
        Content tab One
      {{/tab}}
      {{#tab title="Two" value="two"}}
        Content tab Two
      {{/tab}}
    {{/tabView}}
*/
Ember.Handlebars.registerHelper("tabView", function(path) {
    var options = path;
    var hash = options.hash;

    hash.layout = handleLayoutHash(hash);

    var tab_view = Flame.TabView.create(hash);

    var template = path.fn;

    if (template) {
        var context = tab_view.get('templateContext'),
            data = { buffer: [], view: tab_view };

        template(context, { data: data });
    }

    path.data.view.appendChild(tab_view);
});

Ember.Handlebars.registerHelper('tab', function(path) {
    var tabView = path.data.view;
    var hash = path.hash;
    var tab = hash;
    var options = path;

    tabView.set(hash.value, Flame.View.extend({
        template: options.fn
    }));


    if (tabView.get('tabs') === null) {
        tabView.set('tabs', Ember.A([]));
    }

    tabView.get('tabs').pushObject (hash);
});

/*
  Usage:
   {{#panelView height="200" width="300" title="Nice" allowMoving="true" centerX=0 centerY=-50 isModal=true allowClosingByClickingOutside=true}}
        content
   {{/panelView}}
*/
Ember.Handlebars.registerHelper("panelView", function(path){
    var options = path;
    var hash = options.hash;

    hash.layout = handleLayoutHash(hash);

    var template = path.fn;
    if (template) {
        hash.contentView = Flame.View.create({layout: { top: 26, bottom: 0, left: 0, right: 0}, "template" : template});
    }

    var view = Flame.Panel.create(hash);

    view.appendTo('body');
});

/*
  Usage:
    {{#table height="200" width="300" headerProperty="firstName" contentBinding="App.tableArray.content" controller="Flame.ArrayTableController"}}
      {{column label="First Name" property="firstName"}}
      {{column label="Second" property="lastName"}}
    {{/table}}
*/
Ember.Handlebars.registerHelper("tableView", function(path){
    var options = path;
    var hash = options.hash;

    hash.layout = handleLayoutHash(hash);

    var template = path.fn;

    if (template) {
        var data = { buffer: [], columns: Ember.A() };

        template(null, { data: data });
        hash.columns = data.columns;
    }

    hash.content = Ember.getPath(hash.controller).create({
        headerProperty: hash.headerProperty,
        columns: hash.columns,
        contentBinding: hash.contentBinding
    });

    var view = Flame.TableView.create({
        content: hash.content,
        layout: hash.layout
    });

    path.data.view.appendChild(view);
});

Ember.Handlebars.registerHelper('column', function(path) {
    var columns = path.data.columns;
    var hash = path.hash;
    var options = path;

    columns.pushObject(hash);
});

