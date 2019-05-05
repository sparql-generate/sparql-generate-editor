"use strict";
var $ = require("jquery"),
  utils = require("./utils.js"),
  SGE = require("./main.js");

SGE.getAjaxConfig = function(sge, callbackOrConfig) {
  var callback = typeof callbackOrConfig == "function" ? callbackOrConfig : null;
  var config = typeof callbackOrConfig == "object" ? callbackOrConfig : {};

  if (sge.options.sparql) config = $.extend({}, sge.options.sparql, config);

  //for backwards compatability, make sure we copy sparql handlers to sparql callbacks
  if (config.handlers) $.extend(true, config.callbacks, config.handlers);

  if (!config.endpoint || config.endpoint.length == 0) return; // nothing to query!
  var queryMode = sge.getQueryMode();
  /**
	 * initialize ajax config
	 */
  var ajaxConfig = {
    url: typeof config.endpoint == "function" ? config.endpoint(sge) : config.endpoint,
    type: queryMode == "update"
      ? "POST"
      : typeof config.requestMethod == "function" ? config.requestMethod(sge) : config.requestMethod,
    headers: {
      Accept: getAcceptHeader(sge, config)
    }
  };
  if (config.xhrFields) ajaxConfig.xhrFields = config.xhrFields;
  /**
	 * add complete, beforesend, etc callbacks (if specified)
	 */
  var handlerDefined = false;
  if (config.callbacks) {
    for (var handler in config.callbacks) {
      if (config.callbacks[handler]) {
        handlerDefined = true;
        ajaxConfig[handler] = config.callbacks[handler];
      }
    }
  }
  if (ajaxConfig.type === "GET") {
    //we need to do encoding ourselve, as jquery does not properly encode the url string
    //https://github.com/OpenTriply/YASGUI/issues/75
    var first = true;
    $.each(sge.getUrlArguments(config), function(key, val) {
      ajaxConfig.url += (first ? "?" : "&") + val.name + "=" + encodeURIComponent(val.value);
      first = false;
    });
  } else {
    ajaxConfig.data = sge.getUrlArguments(config);
  }
  if (!handlerDefined && !callback) return; // ok, we can query, but have no callbacks. just stop now

  // if only callback is passed as arg, add that on as 'onComplete' callback
  if (callback) ajaxConfig.complete = callback;

  /**
	 * merge additional request headers
	 */
  if (config.headers && !$.isEmptyObject(config.headers)) $.extend(ajaxConfig.headers, config.headers);

  var queryStart = new Date();
  var updateYasqe = function() {
    sge.lastQueryDuration = new Date() - queryStart;
    SGE.updateQueryButton(sge);
    sge.setBackdrop(false);
  };
  //Make sure the query button is updated again on complete
  var completeCallbacks = [
    function() {
      require("./main.js").signal(sge, "queryFinish", arguments);
    },
    updateYasqe
  ];

  if (ajaxConfig.complete) {
    completeCallbacks.push(ajaxConfig.complete);
  }
  ajaxConfig.complete = completeCallbacks;
  return ajaxConfig;
};

SGE.executeQuery = function(sge, callbackOrConfig) {
  SGE.signal(sge, "query", sge, callbackOrConfig);
  SGE.updateQueryButton(sge, "busy");
  sge.setBackdrop(true);
  sge.xhr = $.ajax(SGE.getAjaxConfig(sge, callbackOrConfig));
};

SGE.getUrlArguments = function(sge, config) {
  var queryMode = sge.getQueryMode();
  var data = [
    {
      name: utils.getString(sge, sge.options.sparql.queryName),
      value: config.getQueryForAjax ? config.getQueryForAjax(sge) : sge.getValue()
    }
  ];

  /**
	 * add named graphs to ajax config
	 */
  if (config.namedGraphs && config.namedGraphs.length > 0) {
    var argName = queryMode == "query" ? "named-graph-uri" : "using-named-graph-uri ";
    for (var i = 0; i < config.namedGraphs.length; i++)
      data.push({
        name: argName,
        value: config.namedGraphs[i]
      });
  }
  /**
	 * add default graphs to ajax config
	 */
  if (config.defaultGraphs && config.defaultGraphs.length > 0) {
    var argName = queryMode == "query" ? "default-graph-uri" : "using-graph-uri ";
    for (var i = 0; i < config.defaultGraphs.length; i++)
      data.push({
        name: argName,
        value: config.defaultGraphs[i]
      });
  }

  /**
	 * add additional request args
	 */
  if (config.args && config.args.length > 0) $.merge(data, config.args);

  return data;
};
var getAcceptHeader = function(sge, config) {
  var acceptHeader = null;
  if (config.acceptHeader && !config.acceptHeaderGraph && !config.acceptHeaderSelect && !config.acceptHeaderUpdate) {
    //this is the old config. For backwards compatability, keep supporting it
    if (typeof config.acceptHeader == "function") {
      acceptHeader = config.acceptHeader(sge);
    } else {
      acceptHeader = config.acceptHeader;
    }
  } else {
    if (sge.getQueryMode() == "update") {
      acceptHeader = typeof config.acceptHeader == "function"
        ? config.acceptHeaderUpdate(sge)
        : config.acceptHeaderUpdate;
    } else {
      var qType = sge.getQueryType();
      if (qType == "DESCRIBE" || qType == "CONSTRUCT") {
        acceptHeader = typeof config.acceptHeaderGraph == "function"
          ? config.acceptHeaderGraph(sge)
          : config.acceptHeaderGraph;
      } else {
        acceptHeader = typeof config.acceptHeaderSelect == "function"
          ? config.acceptHeaderSelect(sge)
          : config.acceptHeaderSelect;
      }
    }
  }
  return acceptHeader;
};

module.exports = {
  getAjaxConfig: SGE.getAjaxConfig
};
