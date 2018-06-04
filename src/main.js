"use strict";
//make sure any console statements
window.console = window.console || {
  log: function() {}
};

/**
 * Load libraries
 */
var $ = require("jquery"),
  CodeMirror = require("codemirror"),
  utils = require("./utils.js"),
  yutils = require("yasgui-utils"),
  imgs = require("./imgs.js");

require("../lib/deparam.js");
require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");
require("./prefixFold.js");
require("codemirror/addon/hint/show-hint.js");
require("codemirror/addon/search/searchcursor.js");
require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/addon/runmode/runmode.js");
require("codemirror/addon/display/fullscreen.js");
require("../lib/grammar/tokenizer.js");

/**
 * Main SGE constructor. Pass a DOM element as argument to append the editor to, and (optionally) pass along config settings (see the SGE.defaults object below, as well as the regular CodeMirror documentation, for more information on configurability)
 *
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class SGE
 * @return {doc} SGE document
 */
var root = (module.exports = function(parent, config) {
  var rootEl = $("<div>", {
    class: "sge"
  }).appendTo($(parent));
  config = extendConfig(config);
  var sge = extendCmInstance(CodeMirror(rootEl[0], config));
  postProcessCmElement(sge);
  return sge;
});

/**
 * Extend config object, which we will pass on to the CM constructor later on.
 * Need this, to make sure our own 'onBlur' etc events do not get overwritten by
 * people who add their own onblur events to the config Additionally, need this
 * to include the CM defaults ourselves. CodeMirror has a method for including
 * defaults, but we can't rely on that one: it assumes flat config object, where
 * we have nested objects (e.g. the persistency option)
 *
 * @private
 */
var extendConfig = function(config) {
  var extendedConfig = $.extend(true, {}, root.defaults, config);

  // I know, codemirror deals with  default options as well.
  //However, it does not do this recursively (i.e. the persistency option)

  return extendedConfig;
};
/**
 * Add extra functions to the CM document (i.e. the codemirror instantiated
 * object)
 *
 * @private
 */
var extendCmInstance = function(sge) {
  //instantiate autocompleters
  sge.autocompleters = require("./autocompleters/autocompleterBase.js")(root, sge);
  if (sge.options.autocompleters) {
    sge.options.autocompleters.forEach(function(name) {
      if (root.Autocompleters[name]) sge.autocompleters.init(name, root.Autocompleters[name]);
    });
  }
  sge.lastQueryDuration = null;
  sge.getCompleteToken = function(token, cur) {
    return require("./tokenUtils.js").getCompleteToken(sge, token, cur);
  };
  sge.getPreviousNonWsToken = function(line, token) {
    return require("./tokenUtils.js").getPreviousNonWsToken(sge, line, token);
  };
  sge.getNextNonWsToken = function(lineNumber, charNumber) {
    return require("./tokenUtils.js").getNextNonWsToken(sge, lineNumber, charNumber);
  };
  sge.collapsePrefixes = function(collapse) {
    if (collapse === undefined) collapse = true;
    sge.foldCode(
      require("./prefixFold.js").findFirstPrefixLine(sge),
      root.fold.prefix,
      collapse ? "fold" : "unfold"
    );
  };
  var backdrop = null;
  var animateSpeed = null;
  sge.setBackdrop = function(show) {
    if (sge.options.backdrop || sge.options.backdrop === 0 || sge.options.backdrop === "0") {
      if (animateSpeed === null) {
        animateSpeed = +sge.options.backdrop;
        if (animateSpeed === 1) {
          //ah, sge.options.backdrop was 'true'. Set this to default animate speed 400
          animateSpeed = 400;
        }
      }

      if (!backdrop) {
        backdrop = $("<div>", {
          class: "backdrop"
        })
          .click(function() {
            $(this).hide();
          })
          .insertAfter($(sge.getWrapperElement()));
      }
      if (show) {
        backdrop.show(animateSpeed);
      } else {
        backdrop.hide(animateSpeed);
      }
    }
  };
  /**
   * Execute query. Pass a callback function, or a configuration object (see
   * default settings below for possible values) I.e., you can change the
   * query configuration by either changing the default settings, changing the
   * settings of this document, or by passing query settings to this function
   *
   * @method doc.query
   * @param function|object
   */
  sge.query = function(callbackOrConfig) {
    root.executeQuery(sge, callbackOrConfig);
  };

  sge.getUrlArguments = function(config) {
    return root.getUrlArguments(sge, config);
  };

  /**
   * Fetch defined prefixes from query string
   *
   * @method doc.getPrefixesFromQuery
   * @return object
   */
  sge.getPrefixesFromQuery = function() {
    return require("./prefixUtils.js").getPrefixesFromQuery(sge);
  };

  sge.addPrefixes = function(prefixes) {
    return require("./prefixUtils.js").addPrefixes(sge, prefixes);
  };
  sge.removePrefixes = function(prefixes) {
    return require("./prefixUtils.js").removePrefixes(sge, prefixes);
  };

  sge.getValueWithoutComments = function() {
    var cleanedQuery = "";
    root.runMode(sge.getValue(), "sparql11", function(stringVal, className) {
      if (className != "comment") {
        cleanedQuery += stringVal;
      }
    });
    return cleanedQuery;
  };
  /**
   * Fetch the query type (e.g., SELECT||DESCRIBE||INSERT||DELETE||ASK||CONSTRUCT)
   *
   * @method doc.getQueryType
   * @return string
   *
   */
  sge.getQueryType = function() {
    return sge.queryType;
  };
  /**
   * Fetch the query mode: 'query' or 'update'
   *
   * @method doc.getQueryMode
   * @return string
   *
   */
  sge.getQueryMode = function() {
    var type = sge.getQueryType();
    if (
      type == "INSERT" ||
      type == "DELETE" ||
      type == "LOAD" ||
      type == "CLEAR" ||
      type == "CREATE" ||
      type == "DROP" ||
      type == "COPY" ||
      type == "MOVE" ||
      type == "ADD"
    ) {
      return "update";
    } else {
      return "query";
    }
  };

  sge.setCheckSyntaxErrors = function(isEnabled) {
    sge.options.syntaxErrorCheck = isEnabled;
    checkSyntax(sge);
  };

  sge.enableCompleter = function(name) {
    addCompleterToSettings(sge.options, name);
    if (root.Autocompleters[name]) sge.autocompleters.init(name, root.Autocompleters[name]);
  };
  sge.disableCompleter = function(name) {
    removeCompleterFromSettings(sge.options, name);
  };
  return sge;
};

var addCompleterToSettings = function(settings, name) {
  if (!settings.autocompleters) settings.autocompleters = [];
  settings.autocompleters.push(name);
};
var removeCompleterFromSettings = function(settings, name) {
  if (typeof settings.autocompleters == "object") {
    var index = $.inArray(name, settings.autocompleters);
    if (index >= 0) {
      settings.autocompleters.splice(index, 1);
      removeCompleterFromSettings(settings, name); //just in case. suppose 1 completer is listed twice
    }
  }
};
var postProcessCmElement = function(sge) {
  /**
   * Set doc value
   */
  var storageId = utils.getPersistencyId(sge, sge.options.persistent);
  if (storageId) {
    var valueFromStorage = yutils.storage.get(storageId);
    if (valueFromStorage) sge.setValue(valueFromStorage);
  }

  root.drawButtons(sge);

  /**
   * Add event handlers
   */
  sge.on("blur", function(sge, eventInfo) {
    root.storeQuery(sge);
  });
  sge.on("change", function(sge, eventInfo) {
    checkSyntax(sge);
    root.updateQueryButton(sge);
    root.positionButtons(sge);
  });
  sge.on("changes", function() {
    //e.g. on paste
    checkSyntax(sge);
    root.updateQueryButton(sge);
    root.positionButtons(sge);
  });

  sge.on("cursorActivity", function(sge, eventInfo) {
    updateButtonsTransparency(sge);
  });
  sge.prevQueryValid = false;
  checkSyntax(sge); // on first load, check as well (our stored or default query might be incorrect)
  root.positionButtons(sge);

  $(sge.getWrapperElement())
    .on("mouseenter", ".cm-atom", function() {
      var matchText = $(this).text();
      $(sge.getWrapperElement())
        .find(".cm-atom")
        .filter(function() {
          return $(this).text() === matchText;
        })
        .addClass("matchingVar");
    })
    .on("mouseleave", ".cm-atom", function() {
      $(sge.getWrapperElement()).find(".matchingVar").removeClass("matchingVar");
    });
  /**
   * check url args and modify sge settings if needed
   */
  if (sge.options.consumeShareLink) {
    sge.options.consumeShareLink(sge, getUrlParams());
    //and: add a hash listener!
    window.addEventListener("hashchange", function() {
      sge.options.consumeShareLink(sge, getUrlParams());
    });
  }
  if (sge.options.collapsePrefixesOnLoad) sge.collapsePrefixes(true);
};

/**
 * get url params. first try fetching using hash. If it fails, try the regular query parameters (for backwards compatability)
 */
var getUrlParams = function() {
  //first try hash
  var urlParams = null;
  if (window.location.hash.length > 1) {
    //firefox does some decoding if we're using window.location.hash (e.g. the + sign in contentType settings)
    //Don't want this. So simply get the hash string ourselves
    urlParams = $.deparam(location.href.split("#")[1]);
  }
  if ((!urlParams || !("query" in urlParams)) && window.location.search.length > 1) {
    //ok, then just try regular url params
    urlParams = $.deparam(window.location.search.substring(1));
  }
  return urlParams;
};

/**
 * Update transparency of buttons. Increase transparency when cursor is below buttons
 */

var updateButtonsTransparency = function(sge) {
  sge.cursor = $(".CodeMirror-cursor");
  if (sge.buttons && sge.buttons.is(":visible") && sge.cursor.length > 0) {
    if (utils.elementsOverlap(sge.cursor, sge.buttons)) {
      sge.buttons.find("svg").attr("opacity", "0.2");
    } else {
      sge.buttons.find("svg").attr("opacity", "1.0");
    }
  }
};

var clearError = null;
var checkSyntax = function(sge, deepcheck) {
  sge.queryValid = true;

  sge.clearGutter("gutterErrorBar");

  var state = null;
  for (var l = 0; l < sge.lineCount(); ++l) {
    var precise = false;
    if (!sge.prevQueryValid) {
      // we don't want cached information in this case, otherwise the
      // previous error sign might still show up,
      // even though the syntax error might be gone already
      precise = true;
    }

    var token = sge.getTokenAt(
      {
        line: l,
        ch: sge.getLine(l).length
      },
      precise
    );
    var state = token.state;
    sge.queryType = state.queryType;
    if(state.OK && l == sge.lineCount() - 1) {
      // console.log("is complete: " +  state.complete);
      if(!state.complete) {
        if(state.inLiteral) {
          state.errorMsg = "needs to close literal with " + (state.inLiteral.cat.includes("2")? '"""' : "'''");
        }
        state.OK = false;
      }
    }
    if (state.OK == false) {
      if (!sge.options.syntaxErrorCheck) {
        //the library we use already marks everything as being an error. Overwrite this class attribute.
        $(sge.getWrapperElement).find(".sp-error").css("color", "black");
        //we don't want to gutter error, so return
        return;
      }

      var warningEl = yutils.svg.getElement(imgs.warning);
      if (state.errorMsg) {
        require("./tooltip")(sge, warningEl, function() {
          return $("<div/>").text(token.state.errorMsg).html();
        });
      } else if (state.possibleCurrent && state.possibleCurrent.length > 0) {
        //        warningEl.style.zIndex = "99999999";
        require("./tooltip")(sge, warningEl, function() {
          var expectedEncoded = [];
          state.possibleCurrent.forEach(function(expected) {
            expectedEncoded.push(
              "<strong style='text-decoration:underline'>" + $("<div/>").text(expected).html() + "</strong>"
            );
          });
          return "This line is invalid. Expected: " + expectedEncoded.join(", ");
        });
      }
      warningEl.style.marginTop = "2px";
      warningEl.style.marginLeft = "2px";
      warningEl.className = "parseErrorIcon";
      sge.setGutterMarker(l, "gutterErrorBar", warningEl);

      sge.queryValid = false;
      break;
    }
  }
  sge.prevQueryValid = sge.queryValid;
  if (deepcheck) {
    if (state != null && state.stack != undefined) {
      var stack = state.stack, len = state.stack.length;
      // Because incremental parser doesn't receive end-of-input
      // it can't clear stack, so we have to check that whatever
      // is left on the stack is nillable
      if (len > 1) sge.queryValid = false;
      else if (len == 1) {
        if (stack[0] != "solutionModifier" && stack[0] != "?limitOffsetClauses" && stack[0] != "?offsetClause")
          sge.queryValid = false;
      }
    }
  }
};
/**
 * Static Utils
 */
// first take all CodeMirror references and store them in the SGE object
$.extend(root, CodeMirror);

//add registrar for autocompleters
root.Autocompleters = {};
root.registerAutocompleter = function(name, constructor) {
  root.Autocompleters[name] = constructor;
  addCompleterToSettings(root.defaults, name);
};

root.autoComplete = function(sge) {
  //this function gets called when pressing the keyboard shortcut. I.e., autoShow = false
  sge.autocompleters.autoComplete(false);
};
//include the autocompleters we provide out-of-the-box
root.registerAutocompleter("prefixes", require("./autocompleters/prefixes.js"));
root.registerAutocompleter("properties", require("./autocompleters/properties.js"));
root.registerAutocompleter("classes", require("./autocompleters/classes.js"));
root.registerAutocompleter("variables", require("./autocompleters/variables.js"));

root.positionButtons = function(sge) {
  var scrollBar = $(sge.getWrapperElement()).find(".CodeMirror-vscrollbar");
  var offset = 0;
  if (scrollBar.is(":visible")) {
    offset = scrollBar.outerWidth();
  }
  if (sge.buttons.is(":visible")) sge.buttons.css("right", offset + 4);
};

/**
 * Create a share link
 *
 * @method SGE.createShareLink
 * @param {doc} SGE document
 * @default {query: doc.getValue()}
 * @return object
 */
root.createShareLink = function(sge) {
  //extend existing link, so first fetch current arguments
  var urlParams = {};
  if (window.location.hash.length > 1) urlParams = $.deparam(window.location.hash.substring(1));
  urlParams["query"] = sge.getValue();
  return urlParams;
};
root.getAsCurl = function(sge, ajaxConfig) {
  var curl = require("./curl.js");
  return curl.createCurlString(sge, ajaxConfig);
};
/**
 * Consume the share link, by parsing the document URL for possible sge arguments, and setting the appropriate values in the SGE doc
 *
 * @method SGE.consumeShareLink
 * @param {doc} SGE document
 */
root.consumeShareLink = function(sge, urlParams) {
  if (urlParams && urlParams.query) {
    sge.setValue(urlParams.query);
  }
};
root.drawButtons = function(sge) {
  sge.buttons = $("<div class='yasqe_buttons'></div>").appendTo($(sge.getWrapperElement()));

  /**
   * draw share link button
   */
  if (sge.options.createShareLink) {
    var svgShare = $(yutils.svg.getElement(imgs.share));
    svgShare
      .click(function(event) {
        event.stopPropagation();
        var popup = $("<div class='yasqe_sharePopup'></div>").appendTo(sge.buttons);
        $("html").click(function() {
          if (popup) popup.remove();
        });

        popup.click(function(event) {
          event.stopPropagation();
        });
        var $input = $("<input>").val(
          location.protocol +
            "//" +
            location.host +
            location.pathname +
            location.search +
            "#" +
            $.param(sge.options.createShareLink(sge))
        );

        $input.focus(function() {
          var $this = $(this);
          $this.select();

          // Work around Chrome's little problem
          $this.mouseup(function() {
            // Prevent further mouseup intervention
            $this.unbind("mouseup");
            return false;
          });
        });

        popup.empty().append($("<div>", { class: "inputWrapper" }).append($input));
        if (sge.options.createShortLink) {
          popup.addClass("enableShort");
          $("<button>Shorten</button>")
            .addClass("yasqe_btn yasqe_btn-sm yasqe_btn-primary")
            .click(function() {
              $(this).parent().find("button").attr("disabled", "disabled");
              sge.options.createShortLink($input.val(), function(errString, shortLink) {
                if (errString) {
                  $input.remove();
                  popup.find(".inputWrapper").append($("<span>", { class: "shortlinkErr" }).text(errString));
                } else {
                  $input.val(shortLink).focus();
                }
              });
            })
            .appendTo(popup);
        }
        $("<button>CURL</button>")
          .addClass("yasqe_btn yasqe_btn-sm yasqe_btn-primary")
          .click(function() {
            $(this).parent().find("button").attr("disabled", "disabled");
            $input.val(root.getAsCurl(sge)).focus();
          })
          .appendTo(popup);
        var positions = svgShare.position();
        popup
          .css("top", positions.top + svgShare.outerHeight() + parseInt(popup.css("padding-top")) + "px")
          .css("left", positions.left + svgShare.outerWidth() - popup.outerWidth() + "px");
        $input.focus();
      })
      .addClass("yasqe_share")
      .attr("title", "Share your query")
      .appendTo(sge.buttons);
  }

  /**
   * draw fullscreen button
   */

  var toggleFullscreen = $("<div>", {
    class: "fullscreenToggleBtns"
  })
    .append(
      $(yutils.svg.getElement(imgs.fullscreen))
        .addClass("yasqe_fullscreenBtn")
        .attr("title", "Set editor full screen")
        .click(function() {
          sge.setOption("fullScreen", true);
        })
    )
    .append(
      $(yutils.svg.getElement(imgs.smallscreen))
        .addClass("yasqe_smallscreenBtn")
        .attr("title", "Set editor to normal size")
        .click(function() {
          sge.setOption("fullScreen", false);
        })
    );
  sge.buttons.append(toggleFullscreen);

  if (sge.options.sparql.showQueryButton) {
    $("<div>", {
      class: "yasqe_queryButton"
    })
      .click(function() {
        if ($(this).hasClass("query_busy")) {
          if (sge.xhr) sge.xhr.abort();
          root.updateQueryButton(sge);
        } else {
          sge.query();
        }
      })
      .appendTo(sge.buttons);
    root.updateQueryButton(sge);
  }
};

var queryButtonIds = {
  busy: "loader",
  valid: "query",
  error: "queryInvalid"
};

/**
 * Update the query button depending on current query status. If no query status is passed via the parameter, it auto-detects the current query status
 *
 * @param {doc} SGE document
 * @param status {string|null, "busy"|"valid"|"error"}
 */
root.updateQueryButton = function(sge, status) {
  var queryButton = $(sge.getWrapperElement()).find(".yasqe_queryButton");
  if (queryButton.length == 0) return; //no query button drawn

  //detect status
  if (!status) {
    status = "valid";
    if (sge.queryValid === false) status = "error";
  }

  if (status != sge.queryStatus) {
    queryButton.empty().removeClass(function(index, classNames) {
      return classNames
        .split(" ")
        .filter(function(c) {
          //remove classname from previous status
          return c.indexOf("query_") == 0;
        })
        .join(" ");
    });

    if (status == "busy") {
      queryButton.append(
        $("<div>", {
          class: "loader"
        })
      );
      sge.queryStatus = status;
    } else if (status == "valid" || status == "error") {
      queryButton.addClass("query_" + status);
      yutils.svg.draw(queryButton, imgs[queryButtonIds[status]]);
      sge.queryStatus = status;
    }
  }
};
/**
 * Initialize SGE from an existing text area (see http://codemirror.net/doc/manual.html#fromTextArea for more info)
 *
 * @method SGE.fromTextArea
 * @param textArea {DOM element}
 * @param config {object}
 * @returns {doc} SGE document
 */
root.fromTextArea = function(textAreaEl, config) {
  config = extendConfig(config);
  //add sge div as parent (needed for styles to be manageable and scoped).
  //In this case, I -also- put it as parent el of the text area. This is wrapped in a div now
  var rootEl = $("<div>", {
    class: "sge"
  })
    .insertBefore($(textAreaEl))
    .append($(textAreaEl));
  var sge = extendCmInstance(CodeMirror.fromTextArea(textAreaEl, config));
  postProcessCmElement(sge);
  return sge;
};

root.storeQuery = function(sge) {
  var storageId = utils.getPersistencyId(sge, sge.options.persistent);
  if (storageId) {
    yutils.storage.set(storageId, sge.getValue(), "month", sge.options.onQuotaExceeded);
  }
};
root.commentLines = function(sge) {
  var startLine = sge.getCursor(true).line;
  var endLine = sge.getCursor(false).line;
  var min = Math.min(startLine, endLine);
  var max = Math.max(startLine, endLine);

  // if all lines start with #, remove this char. Otherwise add this char
  var linesAreCommented = true;
  for (var i = min; i <= max; i++) {
    var line = sge.getLine(i);
    if (line.length == 0 || line.substring(0, 1) != "#") {
      linesAreCommented = false;
      break;
    }
  }
  for (var i = min; i <= max; i++) {
    if (linesAreCommented) {
      // lines are commented, so remove comments
      sge.replaceRange(
        "",
        {
          line: i,
          ch: 0
        },
        {
          line: i,
          ch: 1
        }
      );
    } else {
      // Not all lines are commented, so add comments
      sge.replaceRange("#", {
        line: i,
        ch: 0
      });
    }
  }
};

root.copyLineUp = function(sge) {
  var cursor = sge.getCursor();
  var lineCount = sge.lineCount();
  // First create new empty line at end of text
  sge.replaceRange("\n", {
    line: lineCount - 1,
    ch: sge.getLine(lineCount - 1).length
  });
  // Copy all lines to their next line
  for (var i = lineCount; i > cursor.line; i--) {
    var line = sge.getLine(i - 1);
    sge.replaceRange(
      line,
      {
        line: i,
        ch: 0
      },
      {
        line: i,
        ch: sge.getLine(i).length
      }
    );
  }
};
root.copyLineDown = function(sge) {
  root.copyLineUp(sge);
  // Make sure cursor goes one down (we are copying downwards)
  var cursor = sge.getCursor();
  cursor.line++;
  sge.setCursor(cursor);
};
root.doAutoFormat = function(sge) {
  if (!sge.somethingSelected()) sge.execCommand("selectAll");
  var to = {
    line: sge.getCursor(false).line,
    ch: sge.getSelection().length
  };
  autoFormatRange(sge, sge.getCursor(true), to);
};

var autoFormatRange = function(sge, from, to) {
  var absStart = sge.indexFromPos(from);
  var absEnd = sge.indexFromPos(to);
  // Insert additional line breaks where necessary according to the
  // mode's syntax
  var res = autoFormatLineBreaks(sge.getValue(), absStart, absEnd);

  // Replace and auto-indent the range
  sge.operation(function() {
    sge.replaceRange(res, from, to);
    var startLine = sge.posFromIndex(absStart).line;
    var endLine = sge.posFromIndex(absStart + res.length).line;
    for (var i = startLine; i <= endLine; i++) {
      sge.indentLine(i, "smart");
    }
  });
};

var autoFormatLineBreaks = function(text, start, end) {
  text = text.substring(start, end);
  var breakAfterArray = [
    ["keyword", "ws", "prefixed", "ws", "uri"], // i.e. prefix declaration
    ["keyword", "ws", "uri"] // i.e. base
  ];
  var breakAfterCharacters = ["{", ".", ";"];
  var breakBeforeCharacters = ["}"];
  var getBreakType = function(stringVal, type) {
    for (var i = 0; i < breakAfterArray.length; i++) {
      if (stackTrace.valueOf().toString() == breakAfterArray[i].valueOf().toString()) {
        return 1;
      }
    }
    for (var i = 0; i < breakAfterCharacters.length; i++) {
      if (stringVal == breakAfterCharacters[i]) {
        return 1;
      }
    }
    for (var i = 0; i < breakBeforeCharacters.length; i++) {
      // don't want to issue 'breakbefore' AND 'breakafter', so check
      // current line
      if ($.trim(currentLine) != "" && stringVal == breakBeforeCharacters[i]) {
        return -1;
      }
    }
    return 0;
  };
  var formattedQuery = "";
  var currentLine = "";
  var stackTrace = [];
  CodeMirror.runMode(text, "sparql11", function(stringVal, type) {
    stackTrace.push(type);
    var breakType = getBreakType(stringVal, type);
    if (breakType != 0) {
      if (breakType == 1) {
        formattedQuery += stringVal + "\n";
        currentLine = "";
      } else {
        // (-1)
        formattedQuery += "\n" + stringVal;
        currentLine = stringVal;
      }
      stackTrace = [];
    } else {
      currentLine += stringVal;
      formattedQuery += stringVal;
    }
    if (stackTrace.length == 1 && stackTrace[0] == "sp-ws") stackTrace = [];
  });
  return $.trim(formattedQuery.replace(/\n\s*\n/g, "\n"));
};

require("./sparql.js"), require("./defaults.js");
root.$ = $;
root.version = {
  CodeMirror: CodeMirror.version,
  SGE: require("../package.json").version,
  jquery: $.fn.jquery,
  "yasgui-utils": yutils.version
};
