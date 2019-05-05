/**
 * The default options of SGE (check the CodeMirror documentation for even
 * more options, such as disabling line numbers, or changing keyboard shortcut
 * keys). Either change the default options by setting SGE.defaults, or by
 * passing your own options as second argument to the SGE constructor
 */
var $ = require("jquery"), SGE = require("./main.js");
SGE.defaults = $.extend(true, {}, SGE.defaults, {
  mode: "sparql11",
  /**
	 * Query string
	 */
  value: "PREFIX iter: <http://w3id.org/sparql-generate/iter/>\nPREFIX fun: <http://w3id.org/sparql-generate/fn/>\nPREFIX ex: <http://example.org/>\nPREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>\n\nSOURCE <venue.json> AS ?source\nITERATOR iter:JSONPath(?source, '$.*' ) AS ?venue\nWHERE {} \nLIMIT 10\nCONSTRUCT { \n  <http://loc.example.com/city/{ fun:JSONPath(?venue, '$.location.city' ) }> a ex:City ;\n     geo:lat  ?{ fun:JSONPath(?venue, '$.venue.latitude' ) } ;\n     geo:long ?{ fun:JSONPath(?venue, '$.venue.longitude' ) } ;\n     ex:countryCode 'The country code is { fun:JSONPath(?venue, '$.location.country' ) }'@en .\n}\n",
  highlightSelectionMatches: {
    showToken: /\w/
  },
  tabMode: "indent",
  lineNumbers: true,
  lineWrapping: true,
  backdrop: false,
  foldGutter: {
    rangeFinder: new SGE.fold.combine(SGE.fold.brace, SGE.fold.prefix)
  },
  collapsePrefixesOnLoad: false,
  gutters: ["gutterErrorBar", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  matchBrackets: true,
  fixedGutter: true,
  syntaxErrorCheck: true,
  onQuotaExceeded: function(e) {
    //fail silently
    console.warn("Could not store in localstorage. Skipping..", e);
  },
  /**
	 * Extra shortcut keys. Check the CodeMirror manual on how to add your own
	 *
	 * @property extraKeys
	 * @type object
	 */
  extraKeys: {
    //					"Ctrl-Space" : function(sge) {
    //						SGE.autoComplete(sge);
    //					},
    "Ctrl-Space": SGE.autoComplete,

    "Cmd-Space": SGE.autoComplete,
    "Ctrl-D": SGE.deleteLine,
    "Ctrl-K": SGE.deleteLine,
    "Shift-Ctrl-K": SGE.deleteLine,
    "Cmd-D": SGE.deleteLine,
    "Cmd-K": SGE.deleteLine,
    "Ctrl-/": SGE.commentLines,
    "Cmd-/": SGE.commentLines,
    "Ctrl-Alt-Down": SGE.copyLineDown,
    "Ctrl-Alt-Up": SGE.copyLineUp,
    "Cmd-Alt-Down": SGE.copyLineDown,
    "Cmd-Alt-Up": SGE.copyLineUp,
    "Shift-Ctrl-F": SGE.doAutoFormat,
    "Shift-Cmd-F": SGE.doAutoFormat,
    "Ctrl-]": SGE.indentMore,
    "Cmd-]": SGE.indentMore,
    "Ctrl-[": SGE.indentLess,
    "Cmd-[": SGE.indentLess,
    "Ctrl-S": SGE.storeQuery,
    "Cmd-S": SGE.storeQuery,
    "Ctrl-Enter": SGE.executeQuery,
    "Cmd-Enter": SGE.executeQuery,
    F11: function(sge) {
      sge.setOption("fullScreen", !sge.getOption("fullScreen"));
    },
    Esc: function(sge) {
      if (sge.getOption("fullScreen")) sge.setOption("fullScreen", false);
    }
  },
  cursorHeight: 0.9,

  /**
	 * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
	 * By default, this feature is enabled, and the only the query value is appended to the link.
	 * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
	 */
  createShareLink: SGE.createShareLink,

  createShortLink: null,

  /**
	 * Consume links shared by others, by checking the url for arguments coming from a query link. Defaults by only checking the 'query=' argument in the url
	 */
  consumeShareLink: SGE.consumeShareLink,

  /**
	 * Change persistency settings for the SGE query value. Setting the values
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated using the closest dom ID, to avoid collissions when using multiple SGE items on one
	 * page
	 *
	 * @type function|string
	 */
  persistent: function(sge) {
    return "yasqe_" + $(sge.getWrapperElement()).closest("[id]").attr("id") + "_queryVal";
  },

  /**
	 * Settings for querying sparql endpoints
	 */
  sparql: {
    queryName: function(sge) {
      return sge.getQueryMode();
    },
    showQueryButton: false,

    /**f
		 * Endpoint to query
		 *
		 * @property sparql.endpoint
		 * @type String|function
		 */
    endpoint: "http://dbpedia.org/sparql",
    /**
		 * Request method via which to access SPARQL endpoint
		 *
		 * @property sparql.requestMethod
		 * @type String|function
		 */
    requestMethod: "POST",

    /**
		 * @type String|function
		 */
    acceptHeaderGraph: "text/turtle,*/*;q=0.9",
    /**
		 * @type String|function
		 */
    acceptHeaderSelect: "application/sparql-results+json,*/*;q=0.9",
    /**
		 * @type String|function
		 */
    acceptHeaderUpdate: "text/plain,*/*;q=0.9",

    /**
		 * Named graphs to query.
		 */
    namedGraphs: [],
    /**
		 * Default graphs to query.
		 */
    defaultGraphs: [],

    /**
		 * Additional request arguments. Add them in the form: {name: "name", value: "value"}
		 */
    args: [],

    /**
		 * Additional request headers
		 */
    headers: {},

    getQueryForAjax: null,
    /**
		 * Set of ajax callbacks
		 */
    callbacks: {
      beforeSend: null,
      complete: null,
      error: null,
      success: null
    },
    handlers: {} //keep here for backwards compatability
  }
});
