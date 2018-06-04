"use strict";
var $ = require("jquery");
//this is a mapping from the class names (generic ones, for compatability with codemirror themes), to what they -actually- represent
var tokenTypes = {
  "string-2": "prefixed",
  atom: "var"
};

module.exports = function(sge, completerName) {
  //this autocompleter also fires on-change!
  sge.on("change", function() {
    module.exports.appendPrefixIfNeeded(sge, completerName);
  });

  return {
    isValidCompletionPosition: function() {
      return module.exports.isValidCompletionPosition(sge);
    },
    get: function(token, callback) {
      $.get(module.exports.fetchFrom, function(data) {
        var prefixArray = [];
        for (var prefix in data) {
          if (prefix == "bif") continue; // skip this one! see #231
          var completeString = prefix + ": <" + data[prefix] + ">";
          prefixArray.push(completeString); // the array we want to store in localstorage
        }

        prefixArray.sort();
        callback(prefixArray);
      });
    },
    preProcessToken: function(token) {
      return module.exports.preprocessPrefixTokenForCompletion(sge, token);
    },
    async: true,
    bulk: true,
    autoShow: true,
    persistent: completerName,
    callbacks: {
      pick: function() {
        sge.collapsePrefixes(false);
      }
    }
  };
};
module.exports.isValidCompletionPosition = function(sge) {
  var cur = sge.getCursor(), token = sge.getTokenAt(cur);

  // not at end of line
  if (sge.getLine(cur.line).length > cur.ch) return false;

  if (token.type != "ws") {
    // we want to complete token, e.g. when the prefix starts with an a
    // (treated as a token in itself..)
    // but we to avoid including the PREFIX tag. So when we have just
    // typed a space after the prefix tag, don't get the complete token
    token = sge.getCompleteToken();
  }

  // we shouldnt be at the uri part the prefix declaration
  // also check whether current token isnt 'a' (that makes codemirror
  // thing a namespace is a possiblecurrent
  if (!token.string.indexOf("a") == 0 && $.inArray("PNAME_NS", token.state.possibleCurrent) == -1) return false;

  // First token of line needs to be PREFIX,
  // there should be no trailing text (otherwise, text is wrongly inserted
  // in between)
  var previousToken = sge.getPreviousNonWsToken(cur.line, token);
  if (!previousToken || previousToken.string.toUpperCase() != "PREFIX") return false;
  return true;
};
module.exports.preprocessPrefixTokenForCompletion = function(sge, token) {
  var previousToken = sge.getPreviousNonWsToken(sge.getCursor().line, token);
  if (previousToken && previousToken.string && previousToken.string.slice(-1) == ":") {
    //combine both tokens! In this case we have the cursor at the end of line "PREFIX bla: <".
    //we want the token to be "bla: <", en not "<"
    token = {
      start: previousToken.start,
      end: token.end,
      string: previousToken.string + " " + token.string,
      state: token.state
    };
  }
  return token;
};
/**
 * Check whether typed prefix is declared. If not, automatically add declaration
 * using list from prefix.cc
 *
 * @param sge
 */
module.exports.appendPrefixIfNeeded = function(sge, completerName) {
  if (!sge.autocompleters.getTrie(completerName)) return; // no prefixed defined. just stop
  if (!sge.options.autocompleters || sge.options.autocompleters.indexOf(completerName) == -1) return; //this autocompleter is disabled
  var cur = sge.getCursor();

  var token = sge.getTokenAt(cur);
  if (tokenTypes[token.type] == "prefixed") {
    var colonIndex = token.string.indexOf(":");
    if (colonIndex !== -1) {
      // check previous token isnt PREFIX, or a '<'(which would mean we are in a uri)
      //			var firstTokenString = sge.getNextNonWsToken(cur.line).string.toUpperCase();
      var lastNonWsTokenString = sge.getPreviousNonWsToken(cur.line, token).string.toUpperCase();
      var previousToken = sge.getTokenAt({
        line: cur.line,
        ch: token.start
      }); // needs to be null (beginning of line), or whitespace
      if (lastNonWsTokenString != "PREFIX" && (previousToken.type == "ws" || previousToken.type == null)) {
        // check whether it isnt defined already (saves us from looping
        // through the array)
        var currentPrefix = token.string.substring(0, colonIndex + 1);
        var queryPrefixes = sge.getPrefixesFromQuery();
        if (queryPrefixes[currentPrefix.slice(0, -1)] == null) {
          // ok, so it isnt added yet!
          var completions = sge.autocompleters.getTrie(completerName).autoComplete(currentPrefix);
          if (completions.length > 0) {
            sge.addPrefixes(completions[0]);
          }
        }
      }
    }
  }
};

module.exports.fetchFrom = (window.location.protocol.indexOf("http") === 0 ? "//" : "http://") +
  "prefix.cc/popular/all.file.json";
