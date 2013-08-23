//= require ./button_view

// A checkbox. The state of the checkbox is indicated by the isSelected property (in SC1.x it was value).
Flame.CheckboxView = Flame.ButtonView.extend({
    classNames: ['flame-checkbox-view'],
    isSticky: true,
    //Overwrite the parent handlebars as we're using render all the way!
    handlebars: null,

    render: function(context) {
        this._super(context);
        context.push("<div class='flame-checkbox-box'></div>");
        this.renderCheckMark(context);
        var title = Ember.isNone(this.get("title")) ? "" : this.get("title");
        context.push("<label class='flame-checkbox-label'>" + title + "</label>");
    },

    renderCheckMark: function(context) {
        var imgUrl = Flame.image('checkmark.png');
        context.push("<div class='flame-view flame-checkbox-checkmark' style='left:6px; top:-2px;'><img src='"+ imgUrl + "'></div>");
    }
});
