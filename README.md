## Introduction

Flame.js is a widget/UI library for Ember.js. It's aimed at implementing desktop-style applications using Ember.js. It contains a host of widgets (such as list, tree and tab views), a layouting mechanism for positioning widgets, and some other supporting functionality on top of Ember.js.

Flame.js is designed to bring some of the features of SproutCore 1.x to Ember world, and in fact originally came to be as a byproduct of porting a large SC 1.x application to Ember. While it's not 1:1 compatible with SproutCore 1.x, porting an existing SC1 app to Ember+Flame should be fairly straightforward.

Flame.js has been tested & works on Chrome, Safari, Firefox 8+ and IE8+.


## Getting Started

A [starter kit](https://github.com/flamejs/flame-starter-kit/zipball/master) is provided for quickly getting started on writing an application with Flame.

The starter kit is a simple static application that you can start hacking with. In most real projects, you're probably going to need some build tools and a backend server, but Flame.js is agnostic to all those. The starter kit also includes all of Flame’s dependencies.

You can play around with Flame in your browser with this [jsFiddle](http://jsfiddle.net/nv25J/1/).

We've given a presentation about Ember and Flame at frontend.fi on April
11th 2012, slides can be found [here](https://github.com/downloads/flamejs/flame.js/ember_flame_final.pdf).

For a bit more extensive example, see the [address book application](https://github.com/flamejs/flame-address-book).


## Widgets

All Flame.js widgets have been designed to be binding-friendly. If you’re familiar with Ember.js, using the widgets to build your application should feel very natural.

The most notable widgets are (we've provided jsfiddle examples for some of them to illustrate what they do and how you can use them):

 * Button view
 * Label view
 * Text field view
 * Checkbox view
 * Radio button view
 * Select button view ([jsfiddle](http://jsfiddle.net/2UDGa/))
 * Menu view ([jsfiddle](http://jsfiddle.net/k6AT4/))
 * Progress view
 * Tab view ([jsfiddle](http://jsfiddle.net/ZpenK/))
 * List view ([jsfiddle](http://jsfiddle.net/ptsDD/))
 * Tree view ([jsfiddle](http://jsfiddle.net/u8xdC/))
 * Table view ([jsfiddle](http://jsfiddle.net/6wLr7/))
 * Panel ([jsfiddle](http://jsfiddle.net/qUBQg/))
 * Popover ([jsfiddle](http://jsfiddle.net/qUBQg/))
 * FormView ([jsfiddle](http://jsfiddle.net/NeqX4/))


## Layouting

Flame views work very much like regular Ember views. The biggest practical differences are that mostly you don't use any handlebars templates with Flame views (although it’s possible and very useful in some cases), and they are typically laid out with absolute positioning. The views are usually defined with some JS code, like this:

```javascript
Flame.View.extend({
    layout: { width: 500, height: 300, centerX: 0, centerY: 0 },
    childViews: ['labelView', 'fieldView'],

    labelView: Flame.LabelView.extend({
        layout: { left: 20, top: 20, width: 200 },
        value: 'Please enter your name:'
    }),

    fieldView: Flame.TextFieldView.extend({
        layout: { left: 240, top: 20, right: 20 }
    })
})
```

The layout can include properties ‘left’, ‘right’, ‘top’, ‘bottom’, ‘width’, ‘height’, ‘centerX’, ‘centerY’. Only some combinations of these are valid - for example, if you define left and right, you shouldn’t define width. Each of these should either be an integer, which is interpreted as a pixel value, or a string like ‘50%’. It can also be a property path, in which case a binding to that property will be used as the coordinate. (Contrary to normal practices, you should not use a ‘Binding’ suffix in this case, but just the normal coordinate name, e.g. left: ‘leftProperty’.)

If you don’t define a layout for a view at all, it defaults to { left: 0, top: 0, bottom: 0, right: 0 }. If you define a layout, but no height or bottom, a default height of 24 is used for ButtonViews, 22 for LabelViews and TextFieldViews. Similarly, a default width of 200 is used for LabelViews, TextFieldViews and TextAreaViews.

## Using Layout Managers

It can be tedious to define the layout coordinates manually, and sometimes you end up with undesirable repetition in the coordinates. For example, if you want to position a number of child views so that they appear vertically stacked, the height of each view affects the top coordinate of all the child views coming after it. Now changing any of the heights may require changing several other values, too.

To ease this kind of problems, Flame.js includes the concept of a layout manager. A layout manager is a class that can control the positioning of views inside a parent view. Flame.js currently includes one implementation, called VerticalStackLayoutManager. It stacks views on top of each other, based on their heights. It also takes care of repositioning the views, should any of the views become hidden or visible. For example:

```javascript
Flame.View.extend({
    layout: { width: 500, centerX: 0, centerY: 0 },
    layoutManager: Flame.VerticalStackLayoutManager.create({ topMargin: 5, spacing: 10, bottomMargin: 5 }),
    childViews: ['view1', 'view2', 'view3'],

    view1: Flame.LabelView.extend({value: 'Label1'}),
    view2: Flame.LabelView.extend({value: 'Label2'}),
    view3: Flame.LabelView.extend({value: 'Label3'})
})
```

There’s a few things to note about the example above:

 * The child views don’t define any height or width. In the case of LabelViews, this means they’ll use their default height and width.
 * The child views don’t define a top or left, either. This means that left defaults to 0. Top will be set by the layout manager so that the views appear stacked.
 * The layout manager is configured so that it will leave a margin of 5 pixels at the top and bottom, and a margin of 10 pixels between the child views.
 * The parent view layout is also missing the height. The height will also be controlled by the layout manager, setting it to the total height of the child views, plus the margins.

With this setup, if you need to change the height of any of the child views, or if you add, remove or hide views, all the dependent coordinates will be updated on the fly, including the height of the parent view. If its parent is also using a layout manager, the change would be propagated to that as well.

## Using Handlebars Templates

Using inline handlebars templates can be very handy in some cases. Especially for producing text on the page, it can save you from creating many small LabelViews. For example:

```javascript
someView: Flame.View.extend({
    layout: { left: 20, top: 20, width: 400 },
    handlebars: 'Player {{player.name}} has {{player.points}} points'
})
```

The rule is that if a Flame view has handlebars property defined, then that is used as the content of the view, and possible childViews array is ignored. If there’s no handlebars property defined, then the childViews array is consulted instead.

## Validations

You can mix in `Flame.Validatable` into any object to enable on-the-fly
validation. Validations are specified with the `validations`
property. The object will then have the `isValid` property which you can
observe or bind to.

```javascript
App.Person = Ember.Object.extend(Flame.Validatable, {
    firstName: '',
    lastName: '',
    age: 0,

    validations: {
        firstName: Flame.Validator.notBlank,
        lastName: Flame.Validator.notBlank,
        age: Flame.Validator.number
    }
});

App.Person.create({ firstName: 'John', lastName: '' }).get('isValid'); // => false
```

The FormView can use validations to indicate validity of form elements as shown [here](http://jsfiddle.net/NeqX4/).

### Built-in validations

Flame comes with a few often used validators ready for you to use:

 * Flame.Validator.notBlank
 * Flame.Validator.email
 * Flame.Validator.number
 * Flame.Validator.association

You can also use validators to validate a single value:

```javascript
Flame.Validator.email.validateValue('john.doe@example.com');
```

### Creating your own Validator

You can create your own validator by creating a new `Flame.Validator`
instance which needs to override the `validate` method.
The `validate` method takes two arguments, the first is an Ember Object,
the second is the name of the property on the given Ember Object that
needs to be validated.

```javascript
App.positiveNumberValidator = Flame.Validator.create({
    validate: function(target, key) {
        var number = target.get(key);
        return number > 0;
    }
});
```

### Using a function as a validation

Instead of creating a `Flame.Validator`, you can also provide a
function that validates the value right in the `validations` property.

```javascript
App.Person = Ember.Object.extend(Flame.Validatable, {
    validations: {
        age: function(value) {
            return value > 0;
        }
    }
});
```

## Event Manager

### Key events

For a view to able to listen to key events, it needs to have the ```acceptsKeyResponder``` property set to ```true```.
To listen for key events, you can implement the following methods:

 * deleteBackward
 * insertTab
 * insertNewline
 * cancel
 * insertSpace
 * moveLeft
 * moveUp
 * moveRight
 * moveDown
 * deleteForward
 * insertBacktab
 * moveLeftAndModifySelection
 * moveUpAndModifySelection
 * moveRightAndModifySelection
 * moveDownAndModifySelection

If you want to listen for key events in general you can implement ```keyDown```, if you want to use the character of the key that was pressed you should use ```keyPress``` instead.

```javascript
Flame.View.extend({
    acceptsKeyResponder: true,
    insertNewline: function(event) {
        alert('Enter key was pressed');
        return true; // We handled the key event here, don’t pass it up to the parent view
    }
})
```
Returning false from an event handler will pass on the event to the parent view.

### Mouse events

Flame will ensure that every view that received a ```mouseDown``` will also receive the corresponding ``mouseUp``` event. This means that for example when reordering items in a list view, the reordering operation will continue smoothly even if user’s mouse pointer wanders off the list view.

## Mixing Flame views with plain Ember views

Mixing Flame views into an existing Ember application is currently not going to produce a smooth result. The biggest problem is Flame’s event manager, which is needed to guarantee that whichever view received the mouseDown event will also receive the subsequent mouseMove events and the final mouseUp event. For this to work, all views on the page must use the Flame event manager, which “redirects” events to make this happen.

You might be able to work around this by making all your Ember views use the Flame event manager. In any case, we hope to come up with a solution to this problem in the future, to eventually allow using Flame views as part of any JS application.

## Performance

On modern browsers, like Chrome, a recent Firefox version and IE9+, you mostly shouldn’t have any problems with performance. The most problematic area is currently list views and tree views with hundreds of items, for which the initial rendering might take a few seconds. On IE8, even less than hundred items may give you trouble.

Based on our profiling, most of the time seems to be taken by rendering the item views. For simple views, you can speed it up somewhat by scrapping child views and handlebars templates in favor of a custom render method that produces the HTML as a string.

In the future, we hope to implement lazy rendering for list and tree views, so that only the items currently visible would be initially rendered.

## Migrating from SC1.x to Ember+Flame

Flame.js is not meant to be 1:1 compatible with SproutCore 1.x, but migrating an existing SC1.x application should still be fairly straightforward. You can get a long way by just replacing ‘SC.’ with ‘Flame.’. More complicated views, like lists and trees, are gonna need some more tweaking. You could probably use array and object proxies as before, although those are not really necessary with Ember. The SproutCore data store should also work with Ember+Flame.

## Building Flame from source

Building Flame from source requires Ruby. To install the dependencies, run ```bundle install``` in the flame.js directory. After that run ```rake``` to build Flame. This will create a build directory in which you find the javascript sources (both plain and minified), stylesheets and images. Flame also requires jQuery 1.7+ and Ember 0.9.4+.

### Specifying image_path

By default, the generated javascript and CSS files will expect images to be found in an ```images``` directory and uses a relative path to find them. If you wish to have your images in a different location, you can specify the optional ```image_path``` when building flame, e.g.:
``` rake image_path=/assets/images ```

## Testing

```rake jshint``` will run the javascript sources through to JSHint, which will require JSHint and node.js to be installed.
First install node.js …

```brew install node```

… and then JSHint

```npm -g install jshint```

Make sure your changes pass JSHint cleanly before submitting a pull request.

## Flame Inspector
The build process will also have created ```flame_inspector.js``` and ```flame_inspector.css``` which you can include while debugging.

 * Holding down the ALT key while moving around the mouse around in your Flame application will highlight the views to show their extents.
 * While holding ALT, click on an element. This will bind the element to window.e and the associated view (if any) to window.v (accessible in JS console as e and v), for your further inspection.
 * While holding ALT, double click on an element. If there's a view associated with that element, an inspector panel is opened, showing various information about the view. Click around to explore.
 * While the inspector is open, ALT + single click also opens the view in the inspector panel.
 * You can also launch the inspector on any object in console: ```FlameInspector.inspect(someObject)```

It’s recommended to not include the Flame Inspector in production.

## Contributing

Fork flamejs/flame.js on GitHub, fix a bug or add a feature, push it to a branch in your fork named for the topic and send a pull request. You can also file a bug or feature request as an issue under the flame.js project on GitHub. If you’d like to chat, drop by #flamejs on Freenode IRC. (Also #emberjs is a good place for less Flame.js-specific discussion.)

For inspiration, you could have a look at the current [issues](https://github.com/flamejs/flame.js/issues).
