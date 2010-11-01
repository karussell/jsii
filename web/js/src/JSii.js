/*
 * This software stands under the Apache 2 License
 */

/**
 * Javascript inverted index.
 *
 * fast (?), in-memory, simple
 */
JSii = function () {
    // inverted index ala {fieldX: {"test": bitSet1}, {"pest": bitSet2},
    //                     fieldY: {"test": bitSet3}, ...
    this.iindex = {};

    // in-memory document array ala [{id: 1, text: "test"}, {id: 2, text: "pest"}]
    this.docs = [];
    this.caseInsensitive = true;

    // string = lowercase
    // text   = whitespace tokenization + lowercase
    this.fields = {
        id : 'string',
        text : 'text',
        tw : 'text',
        user : 'string'
    };
    this.defaultSearchField = 'text';

    // TODO when feeding docs do not add but overwrite existing!
    this.idField = 'id';
    
    var result = " &-+\\/,;:.!?_~#'=(){}[]<>|%$§\"@";
    this.splitOnChar = {};
    for(var ii = 0; ii < result.length; ii++) {
        this.splitOnChar[result.charAt(ii)] = true;
    }
}

JSii.prototype.trim = function (str) {
    return str.replace(/^\s*/, "").replace(/\s*$/, "");
}

/**
 * In newdocs the documents to be fed are specified. An array of simple property objects:
 * [{id : 1, field1 : "Test this"}, {id : 2, field1 : "Test now!"}]
 */
JSii.prototype.feedDocs = function(newdocs) {    
    for(var i=0; i < newdocs.length; i++) {
        this.docs.push(newdocs[i]);
        var docNo = this.docs.length - 1;

        // index properties of documents which are defined in fieldtype hash!
        for(var prop in newdocs[i]) {
            var terms;
            var fieldType = this.fields[prop];
            var value = newdocs[i][prop];
            if(fieldType == 'string')
                terms = [this.stringFilter(value)];
            else if(fieldType == 'text')
                terms = this.textTokenizer(value);
            else
                continue;

            var fieldSpecificIndex = this.iindex[prop];
            if(fieldSpecificIndex == undefined) {
                fieldSpecificIndex = {};
                this.iindex[prop] = fieldSpecificIndex;
            }

            for(var jj = 0; jj < terms.length; jj++) {
                var bitSet = fieldSpecificIndex[terms[jj]];
            
                if(bitSet === undefined) {
                    bitSet = new BitSet();
                    fieldSpecificIndex[terms[jj]] = bitSet;
                }
                
                bitSet.set(docNo);
            }
        }
    }
}
// From http://www.mail-archive.com/lucene-user@jakarta.apache.org/msg11118.html
// 
// More recent theoretical justifications of tf*idf provide intuitive explanations of why idf should only be included linearly.
// It's easy to correct for idf^2 by using a customer Similarity that takes a final square root.
//
// Read section 6 to 6.4 of http://www.csee.umbc.edu/cadip/readings/IR.report.120600.book.pdf
// Read section 1 of http://www.cs.utexas.edu/users/inderjit/courses/dm2004/lecture5.ps
//
// Equivalent to:
//                    sum_t( weight_t_d * weight_t_q)
//  score_d(d, q)=  --------------------------------- (**)
//                           norm_d * norm_q

/**
 * @return an object ala
 * { total : totalDocs,
 *   docs: [doc1, doc2]
 * }
 */
JSii.prototype.search = function(query, start, rows, sortFunction) {
    if(sortFunction == undefined)
        sortFunction = this.sort;
    
    if(start === undefined)
        start = 0;
    if(rows == undefined)
        rows = 10;

    if(start < 0)
        throw "Start should be >= 0";
    if(rows < 0)
        throw "Rows should be >= 0";

    var resDocs = [];
    if(query == "*" || this.trim(query).length == 0) {
        resDocs = this.docs;
    } else {    
        // extract elements from query ala field:"terma termb"^boost ...
        var elements = this.queryParser(query);
        var resBs;
        // allTerms [ {frequency, boost, term1}, ...]
        var allTerms = [];
        for(var ii = 0; ii < elements.length; ii++) {
            var fieldSpecificIndex = this.iindex[elements[ii].field];
            if(fieldSpecificIndex === undefined)
                return this.createEmptyResult();
            
            // create bitset of terms and perform 'AND'
            var terms = this.textTokenizer(elements[ii].terms);
            if(terms.length == 0)
                return this.createEmptyResult();                       
            
            for(var i = 0, j = terms.length; i < j; i++) {
                var bs = fieldSpecificIndex[terms[i]];

                // AND operator
                if(bs === undefined)
                    return this.createEmptyResult();

                if(resBs == undefined)
                    resBs = bs;
                else
                    // AND operator
                    resBs.and(bs);

                allTerms.push({
                    frequency: bs.cardinality(),
                    boost: elements[i].boost,
                    term: terms[i]
                });
            }
    
            if(resBs.length() == 0)
                return this.createEmptyResult();               
        }
        
        // collect the docs from the resulting bitset
        for(var bsIndex = resBs.nextSetBit(0);
            bsIndex < resBs.length() && bsIndex != -1;
            bsIndex = resBs.nextSetBit(bsIndex+1)) {

            resDocs.push(this.docs[bsIndex]);
        }
        this.setScore(resDocs, allTerms);
    }

    resDocs.sort(sortFunction);
    var totalDocs = resDocs.length;
    // for pagination
    var end = Math.min(start + rows, totalDocs);
    return { 
        total : totalDocs,        
        docs: resDocs.slice(start, end)
    };
}

/**
 * Sets the score of every doc specified in resDocs.
 *
 * In its end version this should works like:
 * http://lucene.apache.org/java/3_0_2/api/all/org/apache/lucene/search/Similarity.html
 *
 * Neglected some parts because for searching tweets I don't need it:
 *   lengthNorm is 1
 *   term frequency is 1
 *   coord(q,d) = number of terms of q that are in d = 1 at the moment
 *   field boost must be handled via query boost
 */
JSii.prototype.setScore = function(resDocs, terms) {
    var bs;
    var totalDocs = resDocs.length;
    for(var doc in resDocs) {
        var x = 0;
        var sum = 0;
        var norm = 1 /* lengthNorm(field(t)) * multiplyForAllFields(boost(field(t))) <- precalculated */;
        for(var k = 0, l = terms.length; k < l; k++) {
            // for tweets we should use var tf = Math.min(4, tf) but tf is expensive to calc so avoid it at all:
            var tf = 1 /* Math.sqrt(tf) */;
            var idf = Math.log(totalDocs / (terms[k].frequency + 1.0)) + 1.0;
            sum += tf * idf * idf * terms[k].boost * norm;
            x += idf * idf * terms[k].boost;
        }

        var queryNorm = 1/Math.sqrt(x);
        resDocs[doc].score = queryNorm * sum;
    }
}

JSii.prototype.sort = function(doc1, doc2) {
    if(doc1.score > doc2.score)
        return 1;
    else if(doc1.score < doc2.score)
        return -1;
    return 0;
};

JSii.prototype.createSortMethod = function(sortString) {
    if(sortString == undefined)
        return this.sort;

    var field = sortString.split(' ')[0];
    var asc_desc= sortString.split(' ')[1];

    if(asc_desc == "asc") {
        return function(doc1, doc2) {
            var v1 = doc1[field];
            var v2 = doc2[field];
            if(v1 > v2)
                return 1;
            else if(v1 < v2)
                return -1;
            return 0;
        };
    } else {
        return function(doc1, doc2) {
            var v1 = doc1[field];
            var v2 = doc2[field];
            if(v1 > v2)
                return -1;
            else if(v1 < v2)
                return 1;
            return 0;
        };
    }
}

JSii.prototype.createEmptyResult = function() {
    return  {
        total : 0,
        docs: []
    };
}

JSii.prototype.stringFilter = function(str) {
    if(str instanceof String)
        return str.toLowerCase();

    return str + '';    
}

// whitespace tokenizer
JSii.prototype.textTokenizer = function(text) {
    var res = [];
    // TODO PERFORMANCE: use an associative array instead!?    
    var currStr = "";    
    var currChar;

    // go through the text to split (/create terms) on some characters
    for(var i=0; i < text.length; i++) {
        currChar = text.charAt(i);
        if(this.caseInsensitive)
            currChar = text.charAt(i).toLowerCase();

        if(this.splitOnChar[currChar]) {
            if(currStr.length > 0) {
                res.push(currStr);
                currStr = "";
            }
            continue;
        } else if(i + 1 == text.length) {            
            currStr += currChar;
            res.push(currStr);
            currStr = "";
        } else {           
            currStr += currChar;
        }
    }
    return res;
}

/**
 * Input field:"terms"^boost field2:"terms ..."^bost2
 * 
 * All attributes are optional: field:, quotation marks and ^boost
 *
 * @return array of {field: "name", terms: string, boost: number}
 */
JSii.prototype.queryParser = function(query) {
    var res = new Array();   
    var currChar;
    var withinQuotation = false;
    var currElement = {};
    var currString = "";
    var isBoostString = false;
    for(var i=0; i < query.length; i++) {
        currChar = query.charAt(i);
        if(currChar == '"')
            withinQuotation = !withinQuotation;                
        
        if(withinQuotation) {
            if(currChar != '"')
                currString += currChar;
        } else {

            if(i + 1 == query.length){
                if(currChar != '"')
                    currString += currChar;
                currChar = ' ';
            }

            if(currChar == ' ') {
                if(currString.length > 0) {
                    if(isBoostString)
                        currElement.boost = parseFloat(currString);
                    else
                        currElement.terms = currString;
                }
                isBoostString = false;
                currString = "";
                currElement.field = currElement.field || this.defaultSearchField;
                currElement.boost = currElement.boost || 1;                
                res.push(currElement);
                currElement = {};
            } else if(currChar == ':') {
                currElement.field = currString;
                currString = "";
            } else if(currChar == '^') {
                isBoostString = true;
                currElement.terms = currString;
                currString = "";
            } else if(currChar != '"')
                currString += currChar;
        }
            
    }

    return res;
}