"use strict";
/**
 * Append prefix declaration to list of prefixes in query window.
 *
 * @param sge
 * @param prefix
 */
var addPrefixes = function(sge, prefixes) {
  var existingPrefixes = sge.getPrefixesFromQuery();
  //for backwards compatability, we stil support prefixes value as string (e.g. 'rdf: <http://fbfgfgf>'
  if (typeof prefixes == "string") {
    addPrefixAsString(sge, prefixes);
  } else {
    for (var pref in prefixes) {
      if (!(pref in existingPrefixes)) addPrefixAsString(sge, pref + ": <" + prefixes[pref] + ">");
    }
  }
  sge.collapsePrefixes(false);
};

var addPrefixAsString = function(sge, prefixString) {
  var lastPrefix = null;
  var lastPrefixLine = 0;
  var numLines = sge.lineCount();
  for (var i = 0; i < numLines; i++) {
    var firstToken = sge.getNextNonWsToken(i);
    if (firstToken != null && (firstToken.string == "PREFIX" || firstToken.string == "BASE")) {
      lastPrefix = firstToken;
      lastPrefixLine = i;
    }
  }

  if (lastPrefix == null) {
    sge.replaceRange("PREFIX " + prefixString + "\n", {
      line: 0,
      ch: 0
    });
  } else {
    var previousIndent = getIndentFromLine(sge, lastPrefixLine);
    sge.replaceRange("\n" + previousIndent + "PREFIX " + prefixString, {
      line: lastPrefixLine
    });
  }
  sge.collapsePrefixes(false);
};
var removePrefixes = function(sge, prefixes) {
  var escapeRegex = function(string) {
    //taken from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  };
  for (var pref in prefixes) {
    sge.setValue(
      sge
        .getValue()
        .replace(new RegExp("PREFIX\\s*" + pref + ":\\s*" + escapeRegex("<" + prefixes[pref] + ">") + "\\s*", "ig"), "")
    );
  }
  sge.collapsePrefixes(false);
};

/**
 * Get defined prefixes from query as array, in format {"prefix:" "uri"}
 *
 * @param cm
 * @returns {Array}
 */
var getPrefixesFromQuery = function(sge) {
  //Use precise here. We want to be sure we use the most up to date state. If we're
  //not, we might get outdated prefixes from the current query (creating loops such
  //as https://github.com/OpenTriply/YASGUI/issues/84)
  return sge.getTokenAt({ line: sge.lastLine(), ch: sge.getLine(sge.lastLine()).length }, true).state.prefixes;
};

/**
 * Get the used indentation for a certain line
 *
 * @param sge
 * @param line
 * @param charNumber
 * @returns
 */
var getIndentFromLine = function(sge, line, charNumber) {
  if (charNumber == undefined) charNumber = 1;
  var token = sge.getTokenAt({
    line: line,
    ch: charNumber
  });
  if (token == null || token == undefined || token.type != "ws") {
    return "";
  } else {
    return token.string + getIndentFromLine(sge, line, token.end + 1);
  }
};

module.exports = {
  addPrefixes: addPrefixes,
  getPrefixesFromQuery: getPrefixesFromQuery,
  removePrefixes: removePrefixes
};
