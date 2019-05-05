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
  if (token.string.length == 0) return false; //we want -something- to autocomplete
  if (token.string.indexOf("?") == 0) return false; // we are typing a var
  if ($.inArray("a", token.state.possibleCurrent) >= 0) return true; // predicate pos
  var cur = sge.getCursor();
  var previousToken = sge.getPreviousNonWsToken(cur.line, token);
  if (previousToken.string == "rdfs:subPropertyOf") return true;

  // hmm, we would like -better- checks here, e.g. checking whether we are
  // in a subject, and whether next item is a rdfs:subpropertyof.
  // difficult though... the grammar we use is unreliable when the query
  // is invalid (i.e. during typing), and often the predicate is not typed
  // yet, when we are busy writing the subject...
  return false;
};
module.exports.preProcessToken = function(sge, token) {
  return require("./utils.js").preprocessResourceTokenForCompletion(sge, token);
};
module.exports.postProcessToken = function(sge, token, suggestedString) {
  return require("./utils.js").postprocessResourceTokenForCompletion(sge, token, suggestedString);
};
