Flame.Repeater = Ember.Object.extend(Flame.ActionSupport, {
    init: function() {
        this._super();
        this._scheduleNext();
    },

    stop: function() {
        Ember.run.cancel(this._timer);
    },

    reschedule: function() {
        this.stop();
        this._scheduleNext();
    },

    _scheduleNext: function() {
        //Use (new Date()).getTime() instead of Date.now() for IE-support.
        var wait;

        if (this.get('interval') === 0) {
            wait = 0;
        } else {
            var lastInvocation = this.get('lastInvoke');
            if (Ember.none(lastInvocation)) {
                wait = this.get('interval');
            } else {
                wait = (new Date()).getTime() - lastInvocation + this.get('interval');
            }

            if (wait < 0) {
                wait = 0;
            }
        }

        this._timer = Ember.run.later(this, function() {
            this.set('lastInvoke', (new Date()).getTime());
            this.fireAction();
            this._scheduleNext();
        }, wait);
    }
});
