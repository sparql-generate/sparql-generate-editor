"use strict";
var $ = require("jquery");
module.exports = function(sge, name) {
  return {
    isValidCompletionPosition: function() {
      return module.exports.isValidCompletionPosition(sge);
    },
    get: function(token, callback) {
      return require("./utils").fetchFromLov(sge, this, token, callback);
    },
    preProcessToken: function(token) {
      return module.exports.preProcessToken(sge, token);
    },
    postProcessToken: function(token, suggestedString) {
      return module.exports.postProcessToken(sge, token, suggestedString);
    },
    async: true,
    bulk: false,
    autoShow: false,
    persistent: name,
    callbacks: {
      validPosition: sge.autocompleters.notifications.show,
      invalidPosition: sge.autocompleters.notifications.hide
    }
  };
};

module.exports.isValidCompletionPosition = function(sge) {
  var token = sge.getCompleteToken();
  if (token.string.indexOf("?") == 0) return false;
  var cur = sge.getCursor();
  var previousToken = sge.getPreviousNonWsToken(cur.line, token);
  if (previousToken.string == "a") return true;
  if (previousToken.string == "rdf:type") return true;
  if (previousToken.string == "rdfs:domain") return true;
  if (previousToken.string == "rdfs:range") return true;
  return false;
};
module.exports.preProcessToken = function(sge, token) {
  return require("./utils.js").preprocessResourceTokenForCompletion(sge, token);
};
module.exports.postProcessToken = function(sge, token, suggestedString) {
  return require("./utils.js").postprocessResourceTokenForCompletion(sge, token, suggestedString);
};
