
/*
  A proxy that views the source array as sorted by given sort key and updates the sort key if the
  order of the items in the proxied array is changed. You can use this proxy in combination with
  a list view or tree view - that way, the concern of how to persist the order of the items is
  separated from the view. (Another reason for the existence of this class is that directly using
  sorted arrays backed by sproutcore-datastore is a bit problematic in that updating the sort index
  for any item results in the entire array being emptied and then re-populated.) Usage:

    array = [{index: 4, name: 'foo'}, {index: 1, name: 'bar'}]
    sortedArray = Flame.SortingArrayProxy.create({sortKey: 'index', source: array})

  Now if you reorder the proxy (with removeAt+insertAt pair), the index property will be updated
  on each item. If new items are added to the source, they appear in the proxy array in the correct
  position, and removing an item in the source results in it being removed from the proxy array.
  Similarly, insertions and removals in the proxy are reflected in the source array.

  Note that we don't keep the indexes stricly sequential, we only care about their relative order
  (in other words, there may be gaps after removal). This is to prevent unnecessary datastore
  updates.

  (Why give the source as 'source', not 'content', as is customary? Because it seems that then would
  need to re-implement all methods needed for array proxying, whereas with this approach we can just
  let Ember.ArrayProxy do the heavy lifting (we set 'content' as the sorted array). Or maybe I just can't
  figure out how to do it easily... Note that ArrayProxy does not keep a copy of the proxied array,
  but instead proxies all method calls directly. Here we really need to have a sorted copy, because
  sorting obviously changes the item indexes, and rewriting all operations and observers on the fly
  sounds like too difficult to implement.)
 */
Flame.SortingArrayProxy = Ember.ArrayProxy.extend({
    sortKey: 'position',
    parent: null,
    _suppressObservers: false,

    init: function() {
        this._sourceDidChange();
        this._super();

        this.get('content').addArrayObserver(this, {
            willChange: '_contentArrayWillChange',
            didChange: '_contentArrayDidChange'
        });
    },

    // This is a hack go work around a weird problem... We need to initialize content to [], but if
    // we do that in init(), it will in some cases fire an observer in ArrayProxy *after* the runloop
    // ends, which causes very bad things to happen. Don't really know why that happens... Anyway
    // with this hack we can avoid firing any observers on the content property.
    content: function(key, value) {
        if (value !== undefined) {
            this.set('_content', value);
        }

        var content = this.get('_content');
        if (content === undefined) {
            this.set('_content', content = []);
        }
        return content;
    }.property(),

    // When moving an item, use this sequence of calls:
    //  * startMoving()
    //  * removeAt(...)
    //  * insertAt(...)
    //  * endMoving()
    // This way the source array is not modified at all, only the sort keys are updated in
    // endMoving. This is needed in case the source array is not be modifiable (as is the
    // case with arrays returned by sproutcore-datastore queries).
    startMoving: function() {
        this._suppressObservers = true;
    },

    endMoving: function() {
        this._suppressObservers = false;

        var content = this.get('content');
        var sortKey = this.get('sortKey');
        this._withObserversSuppressed(function() {
            content.forEach(function(item, i) {
                Ember.setPath(item, sortKey, i);
            });
        });
    },

    _sourceWillChange: function() {
        var source = this.get('source');
        if (source) {
            var self = this;
            source.forEach(function(item) {
                self._removeSortIndexObserverFor(item);
            });

            source.removeArrayObserver(this, {
                willChange: '_sourceArrayWillChange',
                didChange: '_sourceArrayDidChange'
            });
        }
    }.observesBefore('source'),

    _sourceDidChange: function() {
        var source = this.get('source');
        if (source) {
            var sourceCopy = source.slice();  // sort mutates the array, have to make a copy
            this._sort(sourceCopy);

            var content = this.get('content');
            content.replace(0, content.get('length'), sourceCopy);

            var self = this;
            content.forEach(function(item) {
                self._addSortIndexObserverAndRegisterForRemoval(item);
            });

            source.addArrayObserver(this, {
                willChange: '_sourceArrayWillChange',
                didChange: '_sourceArrayDidChange'
            });
        }
    }.observes('source'),

    _addSortIndexObserverAndRegisterForRemoval: function(item) {
        var sortKey = this.get('sortKey');
        // Unfortunately the data store triggers a property change for all properties in a couple of fairly common
        // situations (reloading, and setting child values), so we check if the sort key really changed, so
        // we don't do unnecessary work
        item.lastPosition = item.get(sortKey);
        var observer = function() { 
            this._indexChanged(item);
        };
        Ember.addObserver(item, sortKey, this, observer);

        // The challenge here is that to be able to remove an observer, we need the observer function, and
        // that is created dynamically, so we need to store it somewhere... easiest on the item itself.
        item[this.get('observerKey')] = observer;
    },

    // Removes the observer from the item
    _removeSortIndexObserverFor: function(item) {
        var observer = item[this.get('observerKey')];
        if (observer) {
            Ember.removeObserver(item, this.get('sortKey'), this, observer);
            delete item[this.get('observerKey')];
        }
    },

    _getObserverKey: function() {
        return '__observer_'+Ember.guidFor(this);
    }.property().cacheable(),

    // Observes changes on the sortKey for each item in the source array. When changes, we simply
    // replace the items in our content array with a newly sorted copy. This means that from the
    // point of view of whoever's using this proxy (and observing changes), all items get replaced.
    // We could write something more sophisticated and just remove/insert the moved item, but this
    // should be fine at least for now (changes originating from sortKey updates indicate changes
    // in the backend by some other user, which is rare).
    _indexChanged: function(contentItem) {
        // Don't do anything if sort index didnt change
        if (contentItem.lastPosition === contentItem.get(this.get('sortKey')) || this._suppressObservers) return;  // Originating from us?
        this._sortAndReplaceContent(this.get('content').slice());
    },

    // When items are removed from the source array, we have to remove the sort index observer on them
    // and remove them from the content array.
    _sourceArrayWillChange: function(source, start, removeCount, addCount) {
        var content = this.get('content');
        var self = this;
        this._withObserversSuppressed(function() {

            if (start === 0 && removeCount === content.get("length")) { // Optimize for mass changes.
                // Assumes that source and content arrays contain the same stuff
                content.replace(0, removeCount);
                content.forEach(function(item) { self._removeSortIndexObserverFor(item); });
            } else {
                for (var i = start; i < start + removeCount; i++) {
                    var removedItem = source.objectAt(i);
                    content.removeObject(removedItem);
                    self._removeSortIndexObserverFor(removedItem);
                }
            }
        });
        // No need to sort here, removal doesn't affect sort order
    },

    // When new items are added to the source array, we have to register sort index observer on them
    // and add them to the content array, maintaining correct sort order.
    _sourceArrayDidChange: function(source, start, removeCount, addCount) {
        var contentCopy = this.get('content').slice();

        if (addCount > 0) {
            for (var i = start; i < start + addCount; i++) {
                var addedItem = source.objectAt(i);
                this._addSortIndexObserverAndRegisterForRemoval(addedItem);
                contentCopy.push(addedItem);
            }
            this._sortAndReplaceContent(contentCopy);  // Only sort if there was additions
        }
    },

    _contentArrayWillChange: function(content, start, removeCount, addCount) {
        var source = this.get('source');
        var self = this;
        this._withObserversSuppressed(function() {
            for (var i = start; i < start + removeCount; i++) {
                var removedItem = content.objectAt(i);
                source.removeObject(removedItem);
                self._removeSortIndexObserverFor(removedItem);
            }
        });
    },

    _contentArrayDidChange: function(content, start, removeCount, addCount) {
    // var time = new Date().getTime();
        if (addCount > 0) {
            var sortKey = this.get('sortKey');
            var source = this.get('source');
            var self = this;
            this._withObserversSuppressed(function() {
                content.forEach(function(item, i) {
                    Ember.setPath(item, sortKey, i);
                });

                for (var i = start; i < start + addCount; i++) {
                    var addedItem = content.objectAt(i);
                    self._addSortIndexObserverAndRegisterForRemoval(addedItem);
                    source.pushObject(addedItem);
                }
            });
        }
    },

    // TODO might be useful to make the replacing more fine-grained?
    _sortAndReplaceContent: function(newContent) {
        var content = this.get('content');
        Ember.assert('Must pass a copy of content, sorting the real content directly bypasses array observers!', content !== newContent);

        this._sort(newContent);
        this._withObserversSuppressed(function() {
            content.replace(0, content.get('length'), newContent);
        });
    },

    _sort: function(array) {
        var sortKey = this.get('sortKey');
        array.sort(function(o1, o2) {
            return Ember.compare(Ember.getPath(o1, sortKey), Ember.getPath(o2, sortKey));
        });
    },

    _withObserversSuppressed: function(func) {
        if (this._suppressObservers) return;  // If already suppressed, abort

        this._suppressObservers = true;
        try {
            func.call();
        } finally {
            this._suppressObservers = false;
        }
    }

});
