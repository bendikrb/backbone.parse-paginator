/*
 backbone.parse-paginator 1.0.0
 */

(function (factory) {

  // CommonJS
  if (typeof exports == 'object') {
    module.exports = factory(require('underscore'),
                             require('backbone.paginator'),
                             require('parse'));
  }
  // AMD
  else if (typeof define == 'function' && define.amd) {
    define(['underscore', 'backbone.paginator', 'parse'], factory);
  }
  // Browser
  else if (typeof _ !== 'undefined' && typeof Backbone !== 'undefined' && typeof Parse !== 'undefined') {

    factory(_, Backbone.PageableCollection, Parse);
  }
}(function (_, PageableCollection, Parse) {

  var ParseColProto = Parse.Collection.prototype,
      BBPColProto = PageableCollection.prototype;

  /**
   * @constructor
   * @class {Parse.PageableCollection}
   * @mixes {Backbone.PageableCollection}
   * @extends {Parse.Collection}
   */
  var ParsePageableCollection = Parse.PageableCollection = Parse.Collection.extend(/** @lends {Parse.Collection.prototype} */ {
    constructor: function(models, options) {
      this.url = 'notEmpty';
      this.mode = 'server';
      this.query = (this.query || new Parse.Query(this.model));
      BBPColProto.constructor.apply(this, arguments);
    },

    /**
     * @override {Parse.Collection.fetch}
     */
    fetch: function(options) {
      var self = this;
      return this.query.count().then(function(count) {
        self.state = self._checkState(_.extend({}, self.state, {
          totalRecords: count
        }));

        return ParseColProto.fetch.apply(self, options).then(function(result) {
          return Parse.Promise.as.apply(Parse.Promise, arguments);
        });
      });
    },

    /**
     * @override {Backbone.PageableCollection._makeFullCollection}
     */
    _makeFullCollection: function (models, options) {
      var properties = ['model', 'sync', 'comparator', 'query'];
      var thisProto = this.constructor.prototype;
      var i, length, prop;

      var proto = {};
      for (i = 0, length = properties.length; i < length; i++) {
        prop = properties[i];
        if (!_.isUndefined(thisProto[prop])) {
          proto[prop] = thisProto[prop];
        }
      }

      var fullCollection = new (Parse.Collection.extend(proto))(models, options);

      for (i = 0, length = properties.length; i < length; i++) {
        prop = properties[i];
        if (this[prop] !== thisProto[prop]) {
          fullCollection[prop] = this[prop];
        }
      }

      return fullCollection;
    },

    /**
     * @override {Backbone.PageableCollection._makeCollectionEventHandler}
     */
    _makeCollectionEventHandler: function (pageCol, fullCol) {

      _.each([pageCol, fullCol], function(col) {
        col._events = {};
        var callbacks = col._callbacks || {},
          events = col._events;

        _.each(_.keys(callbacks), function(event) {
          var node = callbacks[event];
          if (node) {
            events[event] = [];
            var tail = node.tail;
            while ((node = node.next) !== tail) {
              node.ctx = node.context;
              events[event].push(node);
            }
          }
        });
      });

      return BBPColProto._makeCollectionEventHandler.call(this, pageCol, fullCol);
    },

    /**
     * @override {Backbone.PageableCollection._checkState}
     */
    _checkState: function(state) {
      state = BBPColProto._checkState.apply(this, arguments);

      var query = this.query;

      query.limit(state.pageSize);
      query.skip(state.pageSize * (state.currentPage-1));

      var sortKey = state.sortKey || this._initState.sortKey,
          order = state.sortKey ? state.order : this._initState.order;

      order > 0 ?
        query.ascending(sortKey) : query.descending(sortKey);

      state.sortKey = sortKey;
      state.order = order;

      return state;
    },

    /**
     * @deprecated
     */
    hasPrevious: function() {
      return this.hasPreviousPage();
    },

    /**
     * @deprecated
     */
    hasNext: function() {
      return this.hasNextPage();
    }
  });

  var ParsePageableProto = ParsePageableCollection.prototype;

  var methods = [
    '_makeComparator',
    'mode', 'state', 'queryParams', 'switchMode',
    'setPageSize', 'setSorting', 'getPageByOffset',
    'getPage', 'getFirstPage', 'getPreviousPage', 'getNextPage', 'getLastPage',
    'hasPreviousPage', 'hasNextPage'
  ];
  _.each(methods, function(method) {
    ParsePageableProto[method] = function() {
      return BBPColProto[method].apply(this, arguments);
    };
  });

  return ParsePageableCollection;
}));