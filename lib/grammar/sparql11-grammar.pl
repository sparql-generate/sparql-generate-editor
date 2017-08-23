
/*

SPARQL 1.1 grammar rules based on the Last Call Working Draft of 24/07/2012:
  http://www.w3.org/TR/2012/WD-sparql11-query-20120724/#sparqlGrammar

Be careful with grammar notation - it is EBNF in prolog syntax!

[...] lists always represent sequence.
or can be used as binary operator or n-ary prefix term - do not put [...] 
inside unless you want sequence as a single disjunct.

*, +, ? - generally used as 1-ary terms 

stephen.cresswell@tso.co.uk
*/

% We need to be careful with end-of-input marker $
% Since we never actually receive this from Codemirror, 
% we can t have it appear on RHS of deployed rules.
% However, we do need it to check whether rules *could* precede 
% end-of-input, so use it with top-level

:-dynamic '==>'/2.


sparql11 ==> [generateUnit, $].


% [173]
generateUnit ==> [generate].

% [174]
generate ==> 
	[prologue,or(generateQuery1,generateQuery2)].

% [175a]
generateQuery1 ==> 
	['GENERATE',generateTemplate,*(datasetClause),*(iteratorOrSourceClause),?(whereClause),solutionModifier].
    
% [175b]
generateQuery2 ==> 
	[*(datasetClause),*(iteratorOrSourceClause),?(whereClause),solutionModifier,'CONSTRUCT',generateTemplate].
    
% [176]
generateTemplate ==>
	['{',generateTemplateSub,'}'].

% [177]
generateTemplateSub ==>
	[?(constructTriples),*([or(subGenerateQuery1,subGenerateQuery2),?(constructTriples)])].
	
% [178]
iteratorOrSourceClause ==>
	[or(iteratorClause,sourceClause,bind)].

% [179]
iteratorClause ==>
	[ ('ITERATOR' or 'ITERATE') ,functionCall,'AS',var].

% [180]
sourceClause ==>
	[('SOURCE' or 'LOOK UP'),varOrXIri,?(['ACCEPT',varOrXIri]),'AS',var].

% [181a]
subGenerateQuery1 ==>
	['GENERATE',(sourceSelector or generateTemplate),*(iteratorOrSourceClause),?(whereClause),solutionModifier,'.'].

% [181b]
subGenerateQuery2 ==>
	[*(iteratorOrSourceClause),?(whereClause),solutionModifier,'CONSTRUCT',(sourceSelector or generateTemplate),'.'].

prologue ==> 
	[*(baseDecl or prefixDecl)].

baseDecl ==> 
	['BASE','IRI_REF'].

prefixDecl ==> 
	['PREFIX','PNAME_NS','IRI_REF'].

subSelect ==>
        [selectClause,whereClause,solutionModifier,valuesClause].

% [9]
selectClause ==> 
	['SELECT',
	?('DISTINCT' or 'REDUCED'),
	(+(var or ['(',expression,'AS',var,')']) or '*')].

datasetClause ==> 
	['FROM',defaultGraphClause or namedGraphClause]. 

defaultGraphClause ==> 
	[sourceSelector].

namedGraphClause ==> 
	['NAMED',sourceSelector].

sourceSelector ==> 
	[iriRef].

whereClause ==> 
	[?('WHEREVER' or 'WHERE'),groupGraphPattern].

%[18]
solutionModifier ==> 
	[?(groupClause),?(havingClause),?(orderClause),?(limitOffsetClauses)].

%[19]
groupClause ==> 
	['GROUP','BY',+(groupCondition)].

%[20]
groupCondition ==>
	[builtInCall].
groupCondition ==>
	[functionCall].
groupCondition ==>
	['(',expression,?(['AS',var]),')'].
groupCondition ==>
	[var].

%[21]
havingClause ==>
	['HAVING',+(havingCondition)].
%[22]
havingCondition ==>
	[constraint].

orderClause ==> 
	['ORDER','BY',+(orderCondition)].

orderCondition ==> 
	['ASC' or 'DESC',brackettedExpression].
orderCondition ==> 
	[constraint].
orderCondition ==> 
	[var].

%[25]
limitOffsetClauses ==> 
	[limitClause, ?(offsetClause)].
limitOffsetClauses ==> 
	[offsetClause, ?(limitClause)].

%[26]
limitClause ==> 
	['LIMIT','INTEGER'].

%[27]
offsetClause ==> 
	['OFFSET','INTEGER'].

%[28]
valuesClause ==> ['VALUES',dataBlock].
valuesClause ==> [].

%[53]
groupGraphPattern ==> 
	['{',subSelect or groupGraphPatternSub,'}'].


%[54]
groupGraphPatternSub ==>
	[?(triplesBlock),*([graphPatternNotTriples,?('.'),?(triplesBlock)])].
%[55]
triplesBlock ==>
	[triplesSameSubjectPath,?(['.',?(triplesBlock)])].
%[56]
graphPatternNotTriples ==> [groupOrUnionGraphPattern].
graphPatternNotTriples ==> [optionalGraphPattern].
graphPatternNotTriples ==> [minusGraphPattern].
graphPatternNotTriples ==> [graphGraphPattern].
graphPatternNotTriples ==> [serviceGraphPattern].
graphPatternNotTriples ==> [filter].
graphPatternNotTriples ==> [bind].
graphPatternNotTriples ==> [inlineData].
%[57]
optionalGraphPattern ==> ['OPTIONAL',groupGraphPattern].
%[58]
graphGraphPattern ==> 
	['GRAPH',varOrXIri,groupGraphPattern].
%[59]
serviceGraphPattern ==> 
	['SERVICE',?('SILENT'),varOrXIri,groupGraphPattern].
%[60]
bind ==> 
	['BIND','(',expression,'AS',var,')'].
%[61]
inlineData ==> ['VALUES',dataBlock].
%[62]
dataBlock ==> [inlineDataOneVar or inlineDataFull].
%[63]
inlineDataOneVar ==> [var,'{',*(dataBlockValue),'}'].
%[64]
inlineDataFull ==> [ 'NIL' or ['(',*(var),')'], 
                        '{',*(['(',*(dataBlockValue),')'] or 'NIL'),'}'].
%[65]
dataBlockValue ==> [iriRef].
dataBlockValue ==> [rdfLiteral].
dataBlockValue ==> [numericLiteral].
dataBlockValue ==> [booleanLiteral].
dataBlockValue ==> ['UNDEF'].

%[66]
minusGraphPattern ==> 
	['MINUS',groupGraphPattern].
%[67]
groupOrUnionGraphPattern ==> 
	[groupGraphPattern,*(['UNION',groupGraphPattern])].
%[68]
filter ==>
	['FILTER',constraint].
%[69]
constraint ==> 
	[brackettedExpression].
constraint ==> 
	[builtInCall].
constraint ==> 
	[functionCall].
%[70]
functionCall ==> 
	[iriRef,argList].
%[70]
argList ==> 
	['NIL'].
argList ==> 
	['(',?('DISTINCT'),expression,*([',',expression]),')'].
%[71]
expressionList ==> ['NIL'].
expressionList ==> ['(',expression,*([',',expression]),')'].

%[74]
constructTriples ==>
	[triplesSameSubject,?(['.',?(constructTriples)])].
%[75]
triplesSameSubject ==>
	[varOrXTerm,propertyListNotEmpty].
triplesSameSubject ==>
	[triplesNode,propertyList].
%[76]
propertyList ==> [propertyListNotEmpty].
propertyList ==> [].
%[77]
propertyListNotEmpty ==> 
	[verb,objectList,*([';',?([verb,objectList])])].
% storeProperty is a dummy for side-effect of remembering property
storeProperty==>[].
%[78]
verb ==> [storeProperty,varOrXTerm].
verb ==> [storeProperty,'a'].
%[79]
objectList ==> 
	[object,*([',',object])].
%[80]
object ==> 
	[graphNode].
%[81]
triplesSameSubjectPath ==> [varOrXTerm,propertyListPathNotEmpty].
triplesSameSubjectPath ==> [triplesNodePath,propertyListPath].
%[82]
propertyListPath ==> [propertyListNotEmpty].
propertyListPath ==> [].
%[83]
propertyListPathNotEmpty ==>
	[verbPath or verbSimple,
	objectListPath,
	*([';',?([verbPath or verbSimple,objectList])])].
%[84]
verbPath ==> [path].
%[85]
verbSimple ==> [varOrXExpr].
%[86]
objectListPath ==> 
	[objectPath,*([',',objectPath])].
%[87]
objectPath ==> [graphNodePath].
%[88]
path ==> [pathAlternative].
%[89].
pathAlternative ==>
	[pathSequence,*(['|',pathSequence])].
%[90]
pathSequence ==>
	[pathEltOrInverse,*(['/',pathEltOrInverse])].
%[91]
pathElt ==>
	[pathPrimary,?(pathMod)].
%[92]
pathEltOrInverse ==> [pathElt].
pathEltOrInverse ==> ['^',pathElt].
%[93]  - last case below looks weird because 
%        {0} and {0,1} and {0,} and {,1} are allowed
pathMod ==> ['*'].
pathMod ==> ['?'].
pathMod ==> ['+'].
pathMod ==> 
	['{',
          [integer,
	     ([',', '}' or [integer,'}']])
             or
             '}'
          ]
          or
          [',',integer,'}']
        ].

% Original expression from SPARQL1.1 spec:
%'{' ( Integer 
%        ( ',' 
%            ( '}' | Integer '}' ) 
%        | '}' ) 
%    | ',' Integer '}' ) 

%[94]
pathPrimary ==> [storeProperty,xiri].
pathPrimary ==> [storeProperty,'a'].
pathPrimary ==> ['!',pathNegatedPropertySet].
pathPrimary ==> ['(',path,')'].

%[95]
pathNegatedPropertySet ==> 
	[pathOneInPropertySet].
pathNegatedPropertySet ==> 
	['(',
	 ?([pathOneInPropertySet,
	    *(['|',pathOneInPropertySet]) ]),
         ')'].
%[96]
pathOneInPropertySet ==> [xiri].
pathOneInPropertySet ==> ['a'].
pathOneInPropertySet ==> ['^',xiri or 'a'].
%[97]
integer ==> ['INTEGER'].
%[98]
triplesNode ==> [collection].
triplesNode ==> [blankNodePropertyList].
%[99]
blankNodePropertyList ==> ['[',propertyListNotEmpty,']'].
%[100]
triplesNodePath ==> [collectionPath].
triplesNodePath ==> [blankNodePropertyListPath].
%[101]
blankNodePropertyListPath ==> ['[',propertyListPathNotEmpty,']'].
%[102]
collection ==> ['(',+(graphNode),')'].
%[103]
collectionPath ==> ['(',+(graphNodePath),')'].
%[104]
graphNode ==> [varOrXTerm].
graphNode ==> [triplesNode].
%[105]
graphNodePath ==> [varOrXTerm].
graphNodePath ==> [triplesNodePath].
%[106x]
varOrXTerm ==> [var].
varOrXTerm ==> [xTerm].
%[107x]
varOrXIri ==> [varOrXExpr].
varOrXIri ==> [xiri].
%[108]
var ==> ['VAR1'].
var ==> ['VAR2'].
%[108]
varOrXExpr ==> [var or xExpr].

%[new]
xNode ==> [xExpr].
xNode ==> [xRDFLiteral].
xNode ==> [xiri].
%[new]
xExpr ==> ['START_XEXPR',expression,'}'].
%[109x]
xTerm ==> [xNode].
xTerm ==> [numericLiteral].
xTerm ==> [booleanLiteral].
xTerm ==> [blankNode].
xTerm ==> ['NIL'].
%[110]
expression ==> [conditionalOrExpression].
%[111]
conditionalOrExpression ==> 
	[conditionalAndExpression,*(['||',conditionalAndExpression])].
%[112]
conditionalAndExpression ==> 
	[valueLogical,*(['&&',valueLogical])].
%[113]
valueLogical ==> [relationalExpression].
%[114]
relationalExpression ==> 
	[numericExpression, 
	 ?(or(['=',numericExpression],
	      ['!=',numericExpression],
	      ['<',numericExpression],
	      ['>',numericExpression],
	      ['<=',numericExpression],
	      ['>=',numericExpression],
	      ['IN',expressionList],
	      ['NOT','IN',expressionList]))].
%[115]
numericExpression ==> [additiveExpression].
%[116]
additiveExpression ==> 
	[multiplicativeExpression, 
	 *(or(['+',multiplicativeExpression],
	      ['-',multiplicativeExpression],
              [numericLiteralPositive or numericLiteralNegative,
	       ?(['*',unaryExpression] or ['/',unaryExpression]) ]))].
%[117]
multiplicativeExpression ==> 
	[unaryExpression,*(['*',unaryExpression] or ['/',unaryExpression])].
%[118]
unaryExpression ==> ['!',primaryExpression].
unaryExpression ==> ['+',primaryExpression].
unaryExpression ==> ['-',primaryExpression].
unaryExpression ==> [primaryExpression].
%[119]
primaryExpression ==> [brackettedExpression].
primaryExpression ==> [builtInCall].
primaryExpression ==> [xiriOrFunction].
primaryExpression ==> [xRDFLiteral].
primaryExpression ==> [numericLiteral].
primaryExpression ==> [booleanLiteral].
primaryExpression ==> [var].
primaryExpression ==> [aggregate].
%[120]
brackettedExpression ==> ['(',expression,')'].
%[121]
builtInCall ==> ['STR','(',expression,')'].
builtInCall ==> ['LANG','(',expression,')'].
builtInCall ==> ['LANGMATCHES','(',expression,',',expression,')'].
builtInCall ==> ['DATATYPE','(',expression,')'].
builtInCall ==> ['BOUND','(',var,')'].
builtInCall ==> ['IRI','(',expression,')'].
builtInCall ==> ['URI','(',expression,')'].
%builtInCall ==> ['BNODE','(',?(expression),')'].  % Avoided use of NIL
%builtInCall ==> ['RAND','(',')'].                 % Avoided use of NIL
builtInCall ==> ['BNODE',['(',expression,')'] or 'NIL'].
builtInCall ==> ['RAND','NIL'].
builtInCall ==> ['ABS','(',expression,')'].
builtInCall ==> ['CEIL','(',expression,')'].
builtInCall ==> ['FLOOR','(',expression,')'].
builtInCall ==> ['ROUND','(',expression,')'].
builtInCall ==> ['CONCAT',expressionList].
builtInCall ==> [substringExpression].
builtInCall ==> ['STRLEN','(',expression,')'].
builtInCall ==> [strReplaceExpression].
builtInCall ==> ['UCASE','(',expression,')'].
builtInCall ==> ['LCASE','(',expression,')'].
builtInCall ==> ['ENCODE_FOR_URI','(',expression,')'].
builtInCall ==> ['CONTAINS','(',expression,',',expression,')'].
builtInCall ==> ['STRSTARTS','(',expression,',',expression,')'].
builtInCall ==> ['STRENDS','(',expression,',',expression,')'].
builtInCall ==> ['STRBEFORE','(',expression,',',expression,')'].
builtInCall ==> ['STRAFTER','(',expression,',',expression,')'].
builtInCall ==> ['YEAR','(',expression,')'].
builtInCall ==> ['MONTH','(',expression,')'].
builtInCall ==> ['DAY','(',expression,')'].
builtInCall ==> ['HOURS','(',expression,')'].
builtInCall ==> ['MINUTES','(',expression,')'].
builtInCall ==> ['SECONDS','(',expression,')'].
builtInCall ==> ['TIMEZONE','(',expression,')'].
builtInCall ==> ['TZ','(',expression,')'].
%builtInCall ==> ['NOW','(',')'].            % Avoided NIL
builtInCall ==> ['NOW','NIL'].
builtInCall ==> ['UUID','NIL'].
builtInCall ==> ['STRUUID','NIL'].
builtInCall ==> ['MD5','(',expression,')'].
builtInCall ==> ['SHA1','(',expression,')'].
builtInCall ==> ['SHA256','(',expression,')'].
builtInCall ==> ['SHA384','(',expression,')'].
builtInCall ==> ['SHA512','(',expression,')'].
builtInCall ==> ['COALESCE',expressionList].
builtInCall ==> ['IF','(',expression,',',expression,',',expression,')'].
builtInCall ==> ['STRLANG','(',expression,',',expression,')'].
builtInCall ==> ['STRDT','(',expression,',',expression,')'].
builtInCall ==> ['SAMETERM','(',expression,',',expression,')'].
builtInCall ==> ['ISIRI','(',expression,')'].
builtInCall ==> ['ISURI','(',expression,')'].
builtInCall ==> ['ISBLANK','(',expression,')'].
builtInCall ==> ['ISLITERAL','(',expression,')'].
builtInCall ==> ['ISNUMERIC','(',expression,')'].
builtInCall ==> [regexExpression].
builtInCall ==> [existsFunc].
builtInCall ==> [notExistsFunc].
%[122]
regexExpression ==> 
	['REGEX','(',expression,',',expression,?([',',expression]),')'].
%[123]
substringExpression ==> 
	['SUBSTR','(',expression,',',expression,?([',',expression]),')'].
%[124]
strReplaceExpression ==> 
	['REPLACE','(',expression,',',expression,',',expression,?([',',expression]),')'].
%[125]
existsFunc ==>
	['EXISTS',groupGraphPattern].
%[126]
notExistsFunc ==>
	['NOT','EXISTS',groupGraphPattern].
%[127]
aggregate ==> ['COUNT','(',?('DISTINCT'),'*' or expression,')'].
aggregate ==> ['SUM','(',?('DISTINCT'),expression,')'].
aggregate ==> ['MIN','(',?('DISTINCT'),expression,')'].
aggregate ==> ['MAX','(',?('DISTINCT'),expression,')'].
aggregate ==> ['AVG','(',?('DISTINCT'),expression,')'].
aggregate ==> ['SAMPLE','(',?('DISTINCT'),expression,')'].
aggregate ==> 
	['GROUP_CONCAT','(',
	 ?('DISTINCT'),
	 expression,
	 ?([';','SEPARATOR','=',string]),
	 ')'].
%[128]
xiriOrFunction ==> [xiri,?(argList)].
%[129]
rdfLiteral ==> [string,?('LANGTAG' or ['^^',iriRef])].

%[new]
xRDFLiteral ==> [xString,?('LANGTAG' or ['^^',xiri])].

%[130]
numericLiteral ==> [numericLiteralUnsigned].
numericLiteral ==> [numericLiteralPositive].
numericLiteral ==> [numericLiteralNegative].
%[131]
numericLiteralUnsigned ==> ['INTEGER'].
numericLiteralUnsigned ==> ['DECIMAL'].
numericLiteralUnsigned ==> ['DOUBLE'].
%[132]
numericLiteralPositive ==> ['INTEGER_POSITIVE'].
numericLiteralPositive ==> ['DECIMAL_POSITIVE'].
numericLiteralPositive ==> ['DOUBLE_POSITIVE'].
%[133]
numericLiteralNegative ==> ['INTEGER_NEGATIVE'].
numericLiteralNegative ==> ['DECIMAL_NEGATIVE'].
numericLiteralNegative ==> ['DOUBLE_NEGATIVE'].
%[134]
booleanLiteral ==> ['TRUE'].
booleanLiteral ==> ['FALSE'].
%[135]
string ==> ['STRING_LITERAL1'].
string ==> ['STRING_LITERAL2'].
string ==> ['STRING_LITERAL_LONG1'].
string ==> ['STRING_LITERAL_LONG2'].

%[new]
xString ==> [xString_Literal1].
xString ==> [xString_Literal2].
xString ==> [xString_Literal_Long1].
xString ==> [xString_Literal_Long2].

% switches are dummies to switch to various lexical state
switchToDefault==>[].
switchToParsingXS1==>[].
switchToParsingXS2==>[].
switchToParsingXL1==>[].
switchToParsingXL2==>[].
switchToParsingXIRI==>[].

%[new]
xString_Literal1 ==> 
['STRING_LITERAL1' or ['STRING_LITERAL1_START',xString_Literal1_Sub] ].
%[new]
xString_Literal1_Sub ==> 
[expression,switchToParsingXS1,(['STRING_LITERAL1_SUB',xString_Literal1_Sub] or 'STRING_LITERAL1_END')].
%[new]
xString_Literal2 ==> ['STRING_LITERAL2' or ['STRING_LITERAL2_START',xString_Literal2_Sub] ].
%[new]
xString_Literal2_Sub ==> 
[expression,switchToParsingXS2,(['STRING_LITERAL2_SUB',xString_Literal2_Sub] or 'STRING_LITERAL2_END')].
%[new]
xString_Literal_Long1 ==> 
['STRING_LITERAL_LONG1' or ['STRING_LITERAL_LONG1_START',xString_Literal_Long1_Sub] ].
%[new]
xString_Literal_Long1_Sub ==> 
[expression,switchToParsingXL1,(['STRING_LITERAL_LONG1_SUB',xString_Literal_Long1_Sub] or 'STRING_LITERAL_LONG1_END')].
%[new]
xString_Literal_Long2 ==> 
['STRING_LITERAL_LONG2' or ['STRING_LITERAL_LONG2_START',xString_Literal_Long2_Sub] ].
%[new]
xString_Literal_Long2_Sub ==> 
[expression,switchToParsingXL2,(['STRING_LITERAL_LONG2_SUB',xString_Literal_Long2_Sub] or 'STRING_LITERAL_LONG2_END')].

%[136]
iriRef ==> ['IRI_REF'].
iriRef ==> [prefixedName].
%[137]
prefixedName ==> ['PNAME_LN'].
prefixedName ==> ['PNAME_NS'].
%[138]
blankNode ==> ['BLANK_NODE_LABEL'].
blankNode ==> ['ANON'].

%[new]
xiri ==> [iriRef or ['IRI_REF_START',xiri_Sub]].
%[new]
xiri_Sub ==> [expression,switchToParsingXIRI, ['IRI_REF_SUB',xiri_Sub] or 'IRI_REF_END'].

% tokens defined by regular expressions elsewhere
tm_regex([

'IRI_REF_START',
'IRI_REF_END',
'IRI_REF_SUB',
'IRI_REF',

'VAR1',
'VAR2',
'START_XEXPR',

'LANGTAG',

'DOUBLE',
'DECIMAL',
'INTEGER',
'DOUBLE_POSITIVE',
'DECIMAL_POSITIVE',
'INTEGER_POSITIVE',
'INTEGER_NEGATIVE',
'DECIMAL_NEGATIVE',
'DOUBLE_NEGATIVE',

'STRING_LITERAL_LONG1',
'STRING_LITERAL_LONG1_START',
'STRING_LITERAL_LONG1_END',
'STRING_LITERAL_LONG1_SUB',

'STRING_LITERAL_LONG2',
'STRING_LITERAL_LONG2_START',
'STRING_LITERAL_LONG2_END',
'STRING_LITERAL_LONG2_SUB',

'STRING_LITERAL1',
'STRING_LITERAL1_START',
'STRING_LITERAL1_END',
'STRING_LITERAL1_SUB',

'STRING_LITERAL2',
'STRING_LITERAL2_START',
'STRING_LITERAL2_END',
'STRING_LITERAL2_SUB',

'NIL',
'ANON',
'PNAME_LN',
'PNAME_NS',
'BLANK_NODE_LABEL'
]).


% Terminals where name of terminal is uppercased token content
tm_keywords([

'GROUP_CONCAT', % Must appear before GROUP
'DATATYPE',     % Must appear before DATA

'BASE',
'PREFIX',

'GENERATE',
'ITERATOR',
'ITERATE',
'SOURCE',
'LOOK UP',
'ACCEPT',
'WHEREVER',

'SELECT',
'CONSTRUCT',
'DESCRIBE',
'ASK',
'FROM',
'NAMED',
'ORDER',
'BY',
'LIMIT',
'ASC',
'DESC',
'OFFSET',
'DISTINCT',
'REDUCED',
'WHERE',
'GRAPH',
'OPTIONAL',
'UNION',
'FILTER',
'GROUP',
'HAVING',
'AS',
'VALUES',
'LOAD',
'CLEAR',
'DROP',
'CREATE',
'MOVE',
'COPY',
'SILENT',
'INSERT',
'DELETE',
'DATA',
'WITH',
'TO',
'USING',
'NAMED',
'MINUS',
'BIND',

'LANGMATCHES',
'LANG',
'BOUND',
'SAMETERM',
'ISIRI',
'ISURI',
'ISBLANK',
'ISLITERAL',
'REGEX',
'TRUE',
'FALSE',

'UNDEF',
'ADD',
'DEFAULT',
'ALL',
'SERVICE',
'INTO',
'IN',
'NOT',
'IRI',
'URI',
'BNODE',
'RAND',
'ABS',
'CEIL',
'FLOOR',
'ROUND',
'CONCAT',
'STRLEN',
'UCASE',
'LCASE',
'ENCODE_FOR_URI',
'CONTAINS',
'STRSTARTS',
'STRENDS',
'STRBEFORE',
'STRAFTER',
'YEAR',
'MONTH',
'DAY',
'HOURS',
'MINUTES',
'SECONDS',
'TIMEZONE',
'TZ',
'NOW',
'UUID',
'STRUUID',
'MD5',
'SHA1',
'SHA256',
'SHA384',
'SHA512',
'COALESCE',
'IF',
'STRLANG',
'STRDT',
'ISNUMERIC',
'SUBSTR',
'REPLACE',
'EXISTS',
'COUNT',
'SUM',
'MIN',
'MAX',
'AVG',
'SAMPLE',
'SEPARATOR',

'STR'
]).

% Other tokens representing fixed, case sensitive, strings
% Care! order longer tokens first - e.g. IRI_REF, <=, <
% e.g. >=, >
% e.g. NIL, '('
% e.g. ANON, [
% e.g. DOUBLE, DECIMAL, INTEGER
% e.g. INTEGER_POSITIVE, PLUS
tm_punct([
'*'= '\\*',
'a'= 'a',
'.'= '\\.',
'{'= '\\{',
'}'= '\\}',
','= ',',
'('= '\\(',
')'= '\\)',
';'= ';',
'['= '\\[',
']'= '\\]',
'||'= '\\|\\|',
'&&'= '&&',
'='= '=',
'!='= '!=',
'!'= '!',
'<='= '<=',
'>='= '>=',
'<'= '<',
'>'= '>',
'+'= '\\+',
'-'= '-',
'/'= '\\/',
'^^'= '\\^\\^',
'?' = '\\?',
'|' = '\\|',
'^'= '\\^'
]).
