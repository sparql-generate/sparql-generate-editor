"use strict";
var CodeMirror = require("codemirror");
CodeMirror.defineMode("sparql11", function(config, parserConfig) {
  var indentUnit = config.indentUnit;

  var grammar = require("./_tokenizer-table.js");
  var ll1_table = grammar.table;

  var IRI_REF = '<[^<>"`\|\{\}\^\\\x00-\x20]*>';
  var IRI_REF_START = '<[^<>"`\|\{\}\^\\\x00-\x20]*\\{';
  var IRI_REF_SUB = '}[^<>"`\|\{\}\^\\\x00-\x20]*\\{';
  var IRI_REF_END = '}[^<>"`\|\{\}\^\\\x00-\x20]*>';
  /*
   * PN_CHARS_BASE =
   * '[A-Z]|[a-z]|[\\u00C0-\\u00D6]|[\\u00D8-\\u00F6]|[\\u00F8-\\u02FF]|[\\u0370-\\u037D]|[\\u037F-\\u1FFF]|[\\u200C-\\u200D]|[\\u2070-\\u218F]|[\\u2C00-\\u2FEF]|[\\u3001-\\uD7FF]|[\\uF900-\\uFDCF]|[\\uFDF0-\\uFFFD]|[\\u10000-\\uEFFFF]';
   */

  var PN_CHARS_BASE = "[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]";
  var PN_CHARS_U = PN_CHARS_BASE + "|_";

  var PN_CHARS = "(" + PN_CHARS_U + "|-|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])";
  var VARNAME = "(" + PN_CHARS_U + "|[0-9])" + "(" + PN_CHARS_U + "|[0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040])*";
  var VAR1 = "\\?" + VARNAME;
  var VAR2 = "\\$" + VARNAME;

  var START_XEXPR = "(\\$|\\?)\\{";

  var PN_PREFIX = "(" + PN_CHARS_BASE + ")(((" + PN_CHARS + ")|\\.)*(" + PN_CHARS + "))?";

  var HEX = "[0-9A-Fa-f]";
  var PERCENT = "(%" + HEX + HEX + ")";
  var PN_LOCAL_ESC = "(\\\\[_~\\.\\-!\\$&'\\(\\)\\*\\+,;=/\\?#@%])";
  var PLX = "(" + PERCENT + "|" + PN_LOCAL_ESC + ")";
  var PN_LOCAL = "(" +
    PN_CHARS_U +
    "|:|[0-9]|" +
    PLX +
    ")((" +
    PN_CHARS +
    "|\\.|:|" +
    PLX +
    ")*(" +
    PN_CHARS +
    "|:|" +
    PLX +
    "))?";
  var BLANK_NODE_LABEL = "_:(" + PN_CHARS_U + "|[0-9])((" + PN_CHARS + "|\\.)*" + PN_CHARS + ")?";
  var PNAME_NS = "(" + PN_PREFIX + ")?:";
  var PNAME_LN = PNAME_NS + PN_LOCAL;
  var LANGTAG = "@[a-zA-Z]+(-[a-zA-Z0-9]+)*";

  var EXPONENT = "[eE][\\+-]?[0-9]+";
  var INTEGER = "[0-9]+";
  var DECIMAL = "(([0-9]+\\.[0-9]*)|(\\.[0-9]+))";
  var DOUBLE = "(([0-9]+\\.[0-9]*" + EXPONENT + ")|" + "(\\.[0-9]+" + EXPONENT + ")|" + "([0-9]+" + EXPONENT + "))";

  var INTEGER_POSITIVE = "\\+" + INTEGER;
  var DECIMAL_POSITIVE = "\\+" + DECIMAL;
  var DOUBLE_POSITIVE = "\\+" + DOUBLE;
  var INTEGER_NEGATIVE = "-" + INTEGER;
  var DECIMAL_NEGATIVE = "-" + DECIMAL;
  var DOUBLE_NEGATIVE = "-" + DOUBLE;

  var ECHAR = "\\\\[tbnrf\\\\\"'\\{}]";

  //IMPORTANT: this unicode rule is not in the official grammar.
  //Reason: https://github.com/YASGUI/YASQE/issues/49
  //unicode escape sequences (which the sparql spec considers part of the pre-processing of sparql queries)
  //are marked as invalid. We have little choice (other than adding a layer of complixity) than to modify the grammar accordingly
  //however, for now only allow these escape sequences in literals (where actually, this should be allows in e.g. prefixes as well)
  var hex4 = HEX + "{4}";
  var unicode = "(\\\\u" + hex4 + "|\\\\U00(10|0" + HEX + ")" + hex4 + ")";
  var LINE_BREAK = "\n";

  var OPEN_EXPR = "\\{";
  var CLOSE_EXPR = "\\}";

  var STRING_LITERAL1 = "'(([^\\x27\\x5C\\x0A\\x0D\\{])|" + ECHAR + "|" + unicode + ")*'";
  var STRING_LITERAL1_START = "'(([^\\x27\\x5C\\x0A\\x0D\\{])|" + ECHAR + "|" + unicode + ")*" + OPEN_EXPR;
  var STRING_LITERAL1_END = CLOSE_EXPR + "(([^\\x27\\x5C\\x0A\\x0D\\{])|" + ECHAR + "|" + unicode + ")*'";
  var STRING_LITERAL1_SUB = CLOSE_EXPR + "(([^\\x27\\x5C\\x0A\\x0D\\{])|" + ECHAR + "|" + unicode + ")*" + OPEN_EXPR;

  var STRING_LITERAL2 = '"(([^\\x22\\x5C\\x0A\\x0D\\{])|' + ECHAR + "|" + unicode + ')*"';
  var STRING_LITERAL2_START = '"(([^\\x22\\x5C\\x0A\\x0D\\{])|' + ECHAR + "|" + unicode + ')*' + OPEN_EXPR;
  var STRING_LITERAL2_END = CLOSE_EXPR + '(([^\\x22\\x5C\\x0A\\x0D\\{])|' + ECHAR + "|" + unicode + ')*"';
  var STRING_LITERAL2_SUB = CLOSE_EXPR + '(([^\\x22\\x5C\\x0A\\x0D\\{])|' + ECHAR + "|" + unicode + ')*' + OPEN_EXPR;

  var STRING_LITERAL_LONG1_QUOTES = "'''";
  var STRING_LITERAL_LONG1_CONTENT = "(('|'')?([^'\\\\\\{]|" + ECHAR + "|" + unicode + "))*";

  var STRING_LITERAL_LONG2_QUOTES = '"""';
  var STRING_LITERAL_LONG2_CONTENT = '(("|"")?([^"\\\\\\{]|' + ECHAR + "|" + unicode + "))*";


  var WS = "[\\x20\\x09\\x0D\\x0A]";
  // Careful! Code mirror feeds one line at a time with no \n
  // ... but otherwise comment is terminated by \n
  var COMMENT = "#([^\\n\\r]*[\\n\\r]|[^\\n\\r]*$)";
  var WS_OR_COMMENT_STAR = "(" + WS + "|(" + COMMENT + "))*";
  var NIL = "\\(" + WS_OR_COMMENT_STAR + "\\)";
  var ANON = "\\[" + WS_OR_COMMENT_STAR + "\\]";

  var terminals = { 
    "default" : [
    {
      name: "WS",
      regex: new RegExp("^" + WS + "+"),
      style: "ws"
    },
    {
      name: "COMMENT",
      regex: new RegExp("^" + COMMENT),
      style: "comment"
    },
    {
      name: "IRI_REF",
      regex: new RegExp("^" + IRI_REF),
      style: "variable-3"
    },
    {
      name: "IRI_REF_START",
      regex: new RegExp("^" + IRI_REF_START),
      style: "variable-3"
    },
    {
      name: "VAR1",
      regex: new RegExp("^" + VAR1),
      style: "atom"
    },
    {
      name: "VAR2",
      regex: new RegExp("^" + VAR2),
      style: "atom"
    },
    {
      name: "START_XEXPR",
      regex: new RegExp("^" + START_XEXPR),
      style: "atom"
    },
    {
      name: "LANGTAG",
      regex: new RegExp("^" + LANGTAG),
      style: "meta"
    },
    {
      name: "DOUBLE",
      regex: new RegExp("^" + DOUBLE),
      style: "number"
    },
    {
      name: "DECIMAL",
      regex: new RegExp("^" + DECIMAL),
      style: "number"
    },
    {
      name: "INTEGER",
      regex: new RegExp("^" + INTEGER),
      style: "number"
    },
    {
      name: "DOUBLE_POSITIVE",
      regex: new RegExp("^" + DOUBLE_POSITIVE),
      style: "number"
    },
    {
      name: "DECIMAL_POSITIVE",
      regex: new RegExp("^" + DECIMAL_POSITIVE),
      style: "number"
    },
    {
      name: "INTEGER_POSITIVE",
      regex: new RegExp("^" + INTEGER_POSITIVE),
      style: "number"
    },
    {
      name: "DOUBLE_NEGATIVE",
      regex: new RegExp("^" + DOUBLE_NEGATIVE),
      style: "number"
    },
    {
      name: "DECIMAL_NEGATIVE",
      regex: new RegExp("^" + DECIMAL_NEGATIVE),
      style: "number"
    },
    {
      name: "INTEGER_NEGATIVE",
      regex: new RegExp("^" + INTEGER_NEGATIVE),
      style: "number"
    },
    {
      name: "STRING_LITERAL_LONG1",
      regex: new RegExp("^" + STRING_LITERAL_LONG1_QUOTES + STRING_LITERAL_LONG1_CONTENT + STRING_LITERAL_LONG1_QUOTES),
      style: "string"
    },
    {
      name: "STRING_LITERAL_LONG1_START",
      regex: new RegExp("^" + STRING_LITERAL_LONG1_QUOTES + STRING_LITERAL_LONG1_CONTENT + "('|'')?" + OPEN_EXPR),
      style: "string"
    },
    {
      name: "STRING_LITERAL_LONG1_START_TRUNC", 
      regex: new RegExp("^" + STRING_LITERAL_LONG1_QUOTES + STRING_LITERAL_LONG1_CONTENT + "('|'')?$"),
      style: "string",
      switchTo: "trunc_l1"
    },
    {
      name: "STRING_LITERAL_LONG2",
      regex: new RegExp("^" + STRING_LITERAL_LONG2_QUOTES + STRING_LITERAL_LONG2_CONTENT + STRING_LITERAL_LONG2_QUOTES),
      style: "string"
    },
    {
      name: "STRING_LITERAL_LONG2_START", 
      regex: new RegExp("^" + STRING_LITERAL_LONG2_QUOTES + STRING_LITERAL_LONG2_CONTENT + '("|"")?' + OPEN_EXPR),
      style: "string"
    },
    {
      name: "STRING_LITERAL_LONG2_START_TRUNC",
      regex: new RegExp("^" + STRING_LITERAL_LONG2_QUOTES + STRING_LITERAL_LONG2_CONTENT + '("|"")?$'),
      style: "string",
      switchTo: "trunc_l2"
    },
    {
      name: "STRING_LITERAL1",
      regex: new RegExp("^" + STRING_LITERAL1),
      style: "string"
    },
    {
      name: "STRING_LITERAL1_START",
      regex: new RegExp("^" + STRING_LITERAL1_START),
      style: "string"
    },
    {
      name: "STRING_LITERAL2",
      regex: new RegExp("^" + STRING_LITERAL2),
      style: "string"
    },
    {
      name: "STRING_LITERAL2_START",
      regex: new RegExp("^" + STRING_LITERAL2_START),
      style: "string"
    },
    // Enclosed comments won't be highlighted
    {
      name: "NIL",
      regex: new RegExp("^" + NIL),
      style: "punc"
    },
    // Enclosed comments won't be highlighted
    {
      name: "ANON",
      regex: new RegExp("^" + ANON),
      style: "punc"
    },
    {
      name: "PNAME_LN",
      regex: new RegExp("^" + PNAME_LN),
      style: "string-2"
    },
    {
      name: "PNAME_NS",
      regex: new RegExp("^" + PNAME_NS),
      style: "string-2"
    },
    {
      name: "BLANK_NODE_LABEL",
      regex: new RegExp("^" + BLANK_NODE_LABEL),
      style: "string-2"
    }
  ] ,
  "xiri" : [
    {
      name: "IRI_REF_END",
      regex: new RegExp("^" + IRI_REF_END),
      style: "variable-3",
      switchTo: "default"
    },
    {
      name: "IRI_REF_SUB",
      regex: new RegExp("^" + IRI_REF_SUB),
      style: "variable-3"
    }
  ] ,
  "xs1" : [
    {
      name: "STRING_LITERAL1_END",
      regex: new RegExp("^" + STRING_LITERAL1_END),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL1_SUB",
      regex: new RegExp("^" + STRING_LITERAL1_SUB),
      style: "string",
      switchTo: "default"
    }
  ] ,
  "xs2" : [
    {
      name: "STRING_LITERAL2_SUB",
      regex: new RegExp("^" + STRING_LITERAL2_SUB),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL2_END",
      regex: new RegExp("^" + STRING_LITERAL2_END),
      style: "string",
      switchTo: "default"
    }
  ]  ,
  "trunc_l1" : [
    {
      name: "STRING_LITERAL_LONG1_TRUNC_END", 
      regex: new RegExp("^" + STRING_LITERAL_LONG1_CONTENT + STRING_LITERAL_LONG1_QUOTES),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG1_TRUNC_OPEN", 
      regex: new RegExp("^" + STRING_LITERAL_LONG1_CONTENT + "('|'')?" + OPEN_EXPR),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG1_TRUNC_TRUNC",
      regex: new RegExp("^" + STRING_LITERAL_LONG1_CONTENT + "('|'')?$"),
      style: "string"
    }
  ] ,
  "trunc_l2" : [
    {
      name: "STRING_LITERAL_LONG2_TRUNC_END",
      regex: new RegExp("^" + STRING_LITERAL_LONG2_CONTENT + STRING_LITERAL_LONG2_QUOTES),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG2_TRUNC_OPEN",
      regex: new RegExp("^" + STRING_LITERAL_LONG2_CONTENT + '("|"")?' + OPEN_EXPR),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG2_TRUNC_TRUNC",
      regex: new RegExp("^" + STRING_LITERAL_LONG2_CONTENT + '("|"")?$'),
      style: "string"
    }
  ] ,
  "xl1" : [
    {
      name: "STRING_LITERAL_LONG1_END",
      regex: new RegExp("^" + CLOSE_EXPR + STRING_LITERAL_LONG1_CONTENT + STRING_LITERAL_LONG1_QUOTES),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG1_SUB",
      regex: new RegExp("^" + CLOSE_EXPR + STRING_LITERAL_LONG1_CONTENT + "('|'')?" + OPEN_EXPR),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG1_CLOSE_TRUNC", // switch to trunc_l1
      regex: new RegExp("^" + CLOSE_EXPR + STRING_LITERAL_LONG1_CONTENT + "('|'')?$"),
      style: "string",
      switchTo: "trunc_l2"      
    }
  ] ,
  "xl2" : [
    {
      name: "STRING_LITERAL_LONG2_END",
      regex: new RegExp("^" + CLOSE_EXPR + STRING_LITERAL_LONG2_CONTENT + STRING_LITERAL_LONG2_QUOTES),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG2_SUB",
      regex: new RegExp("^" + CLOSE_EXPR + STRING_LITERAL_LONG2_CONTENT + '("|"")?' + OPEN_EXPR),
      style: "string",
      switchTo: "default"
    },
    {
      name: "STRING_LITERAL_LONG2_CLOSE_TRUNC",
      regex: new RegExp("^" + CLOSE_EXPR + STRING_LITERAL_LONG2_CONTENT + '("|"")?$'),
      style: "string",
      switchTo: "trunc_l2"
    }
  ] } ;

  function getPossibles(symbol) {
    var possibles = [], possiblesOb = ll1_table[symbol];
    if (possiblesOb != undefined) {
      for (var property in possiblesOb) {
        possibles.push(property.toString());
      }
    } else {
      possibles.push(symbol);
    }
    return possibles;
  }

  function tokenBase(stream, state) {
    // console.log("called with stream ", stream)

    function nextToken(consume) {
      var consumed = null;

      // Tokens defined by individual regular expressions in the current lexical state
      var termls = terminals[state.lexicalState];
      for (var i = 0; i < termls.length; ++i) {
        consumed = stream.match(termls[i].regex, consume, false);
        if (consumed) {
          var result = {
            cat: termls[i].name,
            style: termls[i].style,
            text: consumed[0],
            start: stream.start,
            switchTo: termls[i].switchTo
          };
          return result;
        }
      }

      // Keywords
      consumed = stream.match(grammar.keywords, consume, false);
      if (consumed) {
        return {
          cat: consumed[0].toUpperCase(),
          style: "keyword",
          text: consumed[0].toUpperCase(),
          start: stream.start
        };
      }

      // Punctuation
      consumed = stream.match(grammar.punct, consume, false);
      if (consumed)
        return {
          cat: consumed[0],
          style: "punc",
          text: consumed[0],
          start: stream.start
        };

      // Token is invalid
      // better consume something anyway, or else we're stuck
      consumed = stream.match(/^.[A-Za-z0-9]*/, consume, false);
      return {
        cat: "<invalid_token>",
        style: "error",
        text: consumed ? consumed[0] : "$",
        start: stream.start
      };
    }

    function recordFailurePos(tokenOb) {
      var col = stream.column();
      state.errorStartPos = col;
      if(tokenOb && tokenOb.text) {
        state.errorEndPos = col + tokenOb.text.length;
      }
    }

    function setQueryType(s) {
      if (state.queryType == null) {
        if (
          s == "GENERATE" ||
          s == "SELECT" ||
          s == "CONSTRUCT" ||
          s == "ASK" ||
          s == "DESCRIBE" ||
          s == "INSERT" ||
          s == "DELETE" ||
          s == "LOAD" ||
          s == "CLEAR" ||
          s == "CREATE" ||
          s == "DROP" ||
          s == "COPY" ||
          s == "MOVE" ||
          s == "ADD"
        )
          state.queryType = s;
      }
    }

    // Some fake non-terminals are just there to have side-effect on state
    // - i.e. allow or disallow variables and bnodes in certain non-nesting
    // contexts
    function setSideConditions(topSymbol) {
      if (topSymbol === "prefixDecl") {
        state.inPrefixDecl = true;
      } else {
        state.inPrefixDecl = false;
      }
      switch (topSymbol) {
        case "disallowVars":
          state.allowVars = false;
          break;
        case "allowVars":
          state.allowVars = true;
          break;
        case "disallowBnodes":
          state.allowBnodes = false;
          break;
        case "allowBnodes":
          state.allowBnodes = true;
          break;
        case "storeProperty":
          state.storeProperty = true;
          break;
      }
    }

    function checkSideConditions(topSymbol) {
      return (state.allowVars || topSymbol != "var") &&
        (state.allowBnodes ||
          (topSymbol != "blankNode" &&
            topSymbol != "blankNodePropertyList" &&
            topSymbol != "blankNodePropertyListPath"));
    }

    function changeLexicalState(topSymbol) {
      switch (topSymbol) {
        case "switchToParsingXIRI":
          state.lexicalState = "xiri";
          break;
        case "switchToParsingXS1":
          state.lexicalState = "xs1";
          break;
        case "switchToParsingXS2":
          state.lexicalState = "xs2";
          break;
        case "switchToParsingXL1":
          state.lexicalState = "xl1";
          break;
        case "switchToParsingXL2":
          state.lexicalState = "xl2";
          break;
      }
    }

    function checkinLiteral(tokenOb) {
      switch (tokenOb.cat) {
        case "STRING_LITERAL_LONG1_START_TRUNC":
          state.inLiteral = JSON.parse(JSON.stringify(tokenOb));
          state.inLiteral.cat = "STRING_LITERAL_LONG1_START";
          break;
        case "STRING_LITERAL_LONG1_TRUNC_END":
          switch (state.inLiteral.cat) {
            case "STRING_LITERAL_LONG1_START":
              tokenOb.cat = "STRING_LITERAL_LONG1";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            case "STRING_LITERAL_LONG1_CLOSE":
              tokenOb.cat = "STRING_LITERAL_LONG1_END";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            default:
              console.error(" in token ", state.inLiteral);
          }
          break;
        case "STRING_LITERAL_LONG1_TRUNC_OPEN":
          switch (state.inLiteral.cat) {
            case "STRING_LITERAL_LONG1_START":
              tokenOb.cat = "STRING_LITERAL_LONG1_START";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            case "STRING_LITERAL_LONG1_CLOSE":
              tokenOb.cat = "STRING_LITERAL_LONG1_SUB";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            default:
              console.error(" in token ", state.inLiteral);
          }
          break;
        case "STRING_LITERAL_LONG1_TRUNC_TRUNC":
          state.inLiteral.text += ".";
          break;
        case "STRING_LITERAL_LONG1_CLOSE_TRUNC":
          state.inLiteral = JSON.parse(JSON.stringify(tokenOb));
          state.inLiteral.cat = "STRING_LITERAL_LONG1_CLOSE";
          break;
        case "STRING_LITERAL_LONG2_START_TRUNC":
          state.inLiteral = JSON.parse(JSON.stringify(tokenOb));
          state.inLiteral.cat = "STRING_LITERAL_LONG2_START";
          break;
        case "STRING_LITERAL_LONG2_TRUNC_END":
          switch (state.inLiteral.cat) {
            case "STRING_LITERAL_LONG2_START":
              tokenOb.cat = "STRING_LITERAL_LONG2";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            case "STRING_LITERAL_LONG2_CLOSE":
              tokenOb.cat = "STRING_LITERAL_LONG2_END";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            default:
              console.error(" in token ", state.inLiteral);
          }
          break;
        case "STRING_LITERAL_LONG2_TRUNC_OPEN":
          switch (state.inLiteral.cat) {
            case "STRING_LITERAL_LONG2_START":
              tokenOb.cat = "STRING_LITERAL_LONG2_START";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            case "STRING_LITERAL_LONG2_CLOSE":
              tokenOb.cat = "STRING_LITERAL_LONG2_SUB";
              tokenOb.text = state.inLiteral.text + "\n" + tokenOb.text;
              state.inLiteral = null;
              break;
            default:
              console.error(" in token ", state.inLiteral);
          }
          break;
        case "STRING_LITERAL_LONG2_TRUNC_TRUNC":
          state.inLiteral.text += ".";
          break;
        case "STRING_LITERAL_LONG2_CLOSE_TRUNC":
          state.inLiteral = JSON.parse(JSON.stringify(tokenOb));
          state.inLiteral.cat = "STRING_LITERAL_LONG2_CLOSE";
          break;
      }
      if(tokenOb.switchTo) {
        state.lexicalState = tokenOb.switchTo;
      }
    }

    function attemptConsume() {
      var consumed = false;

      if (stream.pos == 0) {
        state.possibleCurrent = state.possibleNext;
      }

      var tokenOb = nextToken(false);
      if (tokenOb.cat == "<invalid_token>") {
        nextToken(true);
        consumed = true;
        if (state.OK==true) {
          state.OK=false;
          state.lexicalState = "default";
          recordFailurePos(tokenOb);
        }
        state.complete=false;
        return tokenOb.style;
      }

      if (tokenOb.cat == "WS" || tokenOb.cat == "COMMENT") {
        state.possibleCurrent = state.possibleNext;
        nextToken(true);
        consumed = true;
        return tokenOb.style;
      }

      if(tokenOb.cat.includes("TRUNC")) {
        nextToken(true);
        consumed = true;
        checkinLiteral(tokenOb);
      }  

      if(state.inLiteral) {
        state.complete = false;
        state.possibleCurrent = state.possibleNext;
        return state.inLiteral.style;
      }

      // Run the parser until the token is digested or failure
      var finished = false;
      var token = tokenOb.cat;
      var topSymbol;

      // Incremental LL1 parse
      while (state.stack.length > 0 && token && state.OK && !finished) {
        // console.log("----------------" + topSymbol);
        topSymbol = state.stack.pop();

        if (!ll1_table[topSymbol]) {
          // Top symbol is a terminal
          if (topSymbol == token) {
            if (state.inPrefixDecl) {
              if (topSymbol === "PNAME_NS" && tokenOb.text.length > 0) {
                state.currentPnameNs = tokenOb.text.slice(0, -1);
              } else if (state.currentPnameNs !== undefined && tokenOb.text.length > 2) {
                state.prefixes[state.currentPnameNs] = tokenOb.text.slice(1, -1);
                //reset current pname ns
                state.currentPnameNs = undefined;
              }
            }
            // Matching terminals
            // - ensure token is consumed from input stream
            finished = true;

            // console.log("consumed" + token);
            setQueryType(topSymbol);
            // Check whether $ (end of input token) is poss next
            // for everything on stack
            var allNillable = true;
            for (var sp = state.stack.length; sp > 0; --sp) {
              var item = ll1_table[state.stack[sp - 1]];
              if (state.stack[sp - 1] != '$' && ( !item || !item["$"]))  {
                allNillable = false;
              }
            }
            state.complete = allNillable;
            if (state.storeProperty && token.cat != "punc") {
              state.lastProperty = tokenOb.text;
              state.storeProperty = false;
            }

            //check whether a used prefix is actually defined
            if (!state.inPrefixDecl && (token === "PNAME_NS" || token === "PNAME_LN")) {
              var colonIndex = tokenOb.text.indexOf(":");
              if (colonIndex >= 0) {
                var prefNs = tokenOb.text.slice(0, colonIndex);
                //avoid warnings for missing bif prefixes (yuck, virtuoso-specific)
                if (!state.prefixes[prefNs] && ["bif", "xsd", "sql"].indexOf(prefNs) < 0) {
                  state.OK = false;
                  state.lexicalState = "default";
                  recordFailurePos(tokenOb);
                  state.errorMsg = "Prefix '" + prefNs + "' is not defined";
                }
              }
            }
          } else {
            state.OK = false;
            state.lexicalState = "default";
            state.complete = false;
            recordFailurePos(tokenOb);
          }
        } else {
          // topSymbol is nonterminal
          // - see if there is an entry for topSymbol
          // and nextToken in table
          var nextSymbols = ll1_table[topSymbol][token];
          if (nextSymbols != undefined && checkSideConditions(topSymbol)) {
            // Match - copy RHS of rule to stack
            for (var i = nextSymbols.length - 1; i >= 0; --i) {
              state.stack.push(nextSymbols[i]);
            }
            // Peform any non-grammatical side-effects
            setSideConditions(topSymbol);
          } else if(topSymbol.startsWith("switchTo")) {
            // Attempt with a chage of the lexical state
            changeLexicalState(topSymbol);
            return attemptConsume();
          } else {
            // No match in table - fail
            state.OK = false;
            state.complete = false;
            state.lexicalState = "default";
            recordFailurePos(tokenOb);
            state.stack.push(topSymbol); // Shove topSymbol back on stack
          }
        }
      }
      if (!finished && state.OK) {
        state.OK = false;
        state.lexicalState = "default";
        state.complete = false;
        recordFailurePos(tokenOb);
      }

      if(!consumed) {
        nextToken(true);
      }
      if(tokenOb.switchTo) {
        state.lexicalState = tokenOb.switchTo;
      }

      if (state.possibleCurrent.indexOf("a") >= 0) {
        state.lastPredicateOffset = tokenOb.start;
      }
      state.possibleCurrent = state.possibleNext;
      state.possibleNext = getPossibles(state.stack[state.stack.length - 1]);

      return tokenOb.style;
    }

    // CodeMirror works with one line at a time,
    // but newline should behave like whitespace
    // - i.e. a definite break between tokens (for autocompleter)
    return attemptConsume();
  }

  var indentTop = {
    "*[,, object]": 3,
    "*[(,),object]": 3,
    "*[(,),objectPath]": 3,
    "*[/,pathEltOrInverse]": 2,
    object: 2,
    objectPath: 2,
    objectList: 2,
    objectListPath: 2,
    storeProperty: 2,
    pathMod: 2,
    "?pathMod": 2,
    propertyListNotEmpty: 1,
    propertyList: 1,
    propertyListPath: 1,
    propertyListPathNotEmpty: 1,
    "?[verb,objectList]": 1
    //    "?[or([verbPath, verbSimple]),objectList]": 1,
  };

  var indentTable = {
    "}": 1,
    "]": 1,
    ")": 1,
    "{": -1,
    "(": -1,
    "[": -1
    //    "*[;,?[or([verbPath,verbSimple]),objectList]]": 1,
  };

  function indent(state, textAfter) {
    //just avoid we don't indent multi-line  literals
    if (state.inLiteral) return 0;
    if (state.stack.length && state.stack[state.stack.length - 1] == "?[or([verbPath,verbSimple]),objectList]") {
      //we are after a semi-colon. I.e., nicely align this line with predicate position of previous line
      return state.lastPredicateOffset;
    } else {
      var n = 0; // indent level
      var i = state.stack.length - 1;
      if (/^[\}\]\)]/.test(textAfter)) {
        // Skip stack items until after matching bracket
        var closeBracket = textAfter.substr(0, 1);
        for (; i >= 0; --i) {
          if (state.stack[i] == closeBracket) {
            --i;
            break;
          }
        }
      } else {
        // Consider nullable non-terminals if at top of stack
        var dn = indentTop[state.stack[i]];
        if (dn) {
          n += dn;
          --i;
        }
      }
      for (; i >= 0; --i) {
        var dn = indentTable[state.stack[i]];
        if (dn) {
          n += dn;
        }
      }
      return n * config.indentUnit;
    }
  }

  return {
    token: tokenBase,
    startState: function(base) {
      return {
        tokenize: tokenBase,
        OK: true,
        complete: grammar.acceptEmpty,
        errorStartPos: null,
        errorEndPos: null,
        queryType: null,
        possibleCurrent: getPossibles(grammar.startSymbol),
        possibleNext: getPossibles(grammar.startSymbol),
        allowVars: true,
        allowBnodes: true,
        storeProperty: false,
        lastProperty: "",
        lexicalState: "default",
        inLiteral: null,
        stack: [grammar.startSymbol],
        lastPredicateOffset: config.indentUnit,
        prefixes: {}
      };
    },
    indent: indent,
    electricChars: "])"
  };
});
CodeMirror.defineMIME("application/vnd.sparql-generate", "sparql11");