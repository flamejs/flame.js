Flame.TabView = Flame.View.extend({
    classNames: ['flame-tab-view'],
    childViews: 'tabBarView contentView'.w(),
    tabs: null,
    previousTabs: null,
    nowShowing: null,
    tabsHeight: 23,
    initializeTabsLazily: true,

    init: function() {
        this._super();
        //if tabs not set via binding, we need to build the tabs here
        if (!Ember.none(this.get('tabs'))) {
            this._tabsDidChange();
        }
    },

    _tabsWillChange: function() {
        var tabs = this.get('tabs');
        if (!Ember.none(tabs)) {
            this.set('previousTabs', tabs.slice());
        }
    }.observesBefore('tabs.@each'),

    _tabsDidChange: function() {
        var tabs = this.get('tabs');
        if (Ember.none(tabs)) {
            return;
        }
        var previousTabs = this.get('previousTabs');

        if (!Ember.none(previousTabs)) {
            previousTabs.forEach(function(tab, i) {
                if (Ember.none(tabs.findProperty('value', tab.value))) {
                    var tabBarView = this.get('tabBarView');
                    tabBarView.get('childViews').forEach(function(tabView) {
                        if (tabView.get('value') === tab.value) tabBarView.removeChild(tabView);
                    });
                }
            }, this);
        }

        tabs.forEach(function(tab, i) {
            if (Ember.none(previousTabs) || Ember.none(previousTabs.findProperty('value', tab.value))) {
                this._addTab(tab, i);
            }
        }, this);
    }.observes('tabs.@each'),

    _addTab: function(tab, index) {
          var contentView = this.get('contentView');
          var contentViewChildren = contentView.get('childViews');
          var tabBarView = this.get('tabBarView');
          var tabBarViewChildren = tabBarView.get('childViews');
          var tabsHeight = this.get('tabsHeight');
          var self = this;
          tabBarViewChildren.insertAt(index, tabBarView.createChildView(Flame.ButtonView.create({
              acceptsKeyResponder: false,
              layout: { top: 0, bottom: 0, height: tabsHeight },
              title: tab.title,
              value: tab.value,
              isSelected: Flame.computed.equals('parentView.parentView.nowShowing', tab.value),
              action: function() {
                  self.set('nowShowing', tab.value);
              }
          })));
          var view = self.get(tab.value);
          Ember.assert('View for tab %@ not defined!'.fmt(tab.value), !!view);
          if (!self.get('initializeTabsLazily')) {
              if (!(view instanceof Ember.View)) {
                  view = contentView.createChildView(view);
              }
              view.set('isVisible', false);
              contentViewChildren.addObject(view);
              self.set(tab.value, view);
          }

          if (Ember.none(this.get('nowShowing'))) this.set('nowShowing', this.get('tabs').objectAt(0).value);
      },

    _tabWillChange: function() {
        if (this.get('nowShowing')) {
            this.get(this.get('nowShowing')).set('isVisible', false);
        }
    }.observesBefore('nowShowing'),

    _tabDidChange: function() {
        if (this.get('nowShowing')) {
            var nowShowing = this.get('nowShowing');
            var view = this.get(nowShowing);
            if (!(view instanceof Ember.View)) {
                var contentView = this.get('contentView');
                view = contentView.createChildView(view);
                contentView.get('childViews').addObject(view);
                this.set(nowShowing, view);
            }
            view.set('isVisible', true);
        }
    }.observes('nowShowing'),

    tabBarView: Flame.View.extend({
        classNames: ['flame-tab-view-tabs'],
        layout: { left: 0, top: 0, right: 0, height: 'parentView.tabsHeight' }
    }),

    contentView: Flame.View.extend({
        classNames: ['flame-tab-view-content'],
        layout: { left: 0, top: 'parentView.tabsHeight', right: 0, bottom: 0 }
    })

});
