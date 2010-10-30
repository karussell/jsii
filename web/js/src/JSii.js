/*
 * This software stands under the Apache 2 License
 */

/**
 * Javascript inverted index.
 *
 * fast (?), in-memory, simple
 */
JSii = function () {
    // inverted index ala [{"test": bitSet1}, {"pest": bitSet2}]
    this.iindex = [];

    // in-memory document array ala [{id: 1, text: "test"}, {id: 2, text: "pest"}]
    this.docs = [];
    this.caseInsensitive = true;

    // string = lowercase
    // text   = whitespace tokenization + lowercase
    this.fields = {
        id : 'string',
        text : 'text'
    };

    // TODO
    // this.fieldBoost = { id: 1, text: 7.5, ...};

    var result = " &-+\\/,;:.!?_~#'=(){}[]<>|%$§\"@";
    this.splitOnChar = {};
    for(var ii = 0; ii < result.length; ii++) {
        this.splitOnChar[result.charAt(ii)] = true;
    }
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

            for(var jj = 0; jj < terms.length; jj++) {
                var bitSet = this.iindex[terms[jj]];
            
                if(bitSet === undefined) {
                    bitSet = new BitSet();
                    this.iindex[terms[jj]] = bitSet;
                }
                
                bitSet.set(docNo);

                // store for which fieldType we created the term to enable boost when searching
                if(bitSet.fieldTypes === undefined)
                    bitSet.fieldTypes = {}
                bitSet.fieldTypes[fieldType] = true;
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

JSii.prototype.search = function(query, start, rows) {
    if(start === undefined)
        start = 0;
    if(rows == undefined)
        rows = 10;

    if(start < 0)
        throw "Start should be >=0";
    if(rows <= 0)
        throw "Rows should be >0";
    
    // create bitset of terms and perform 'AND'
    var terms = this.textTokenizer(query);
    if(terms.length == 0)
        return this.createEmptyResult();

    // TODO filter e.g. date:[NOW-8HOUR TO *]
    // create a filter cache. keys als "date:[mySpecialFilter]" values ala DocBitSet (docs that fullfill the query)
    // -> range query
    
    var resBs;
    for(var i = 0, j = terms.length; i < j; i++) {
        var bs = this.iindex[terms[i]];

        // AND operator
        if(bs === undefined)
            return this.createEmptyResult();

        if(i == 0)
            resBs = bs;
        else
            // AND operator
            resBs.and(bs);
    }
    
    if(resBs.length() == 0)
        return this.createEmptyResult();    
    
    // collect the docs from the resulting bitset
    var resDocs = [];    
    for(var bsIndex = resBs.nextSetBit(0);
        bsIndex < resBs.length() && bsIndex != -1;
        bsIndex = resBs.nextSetBit(bsIndex+1)) {
        
        resDocs.push(this.docs[bsIndex]);
    }
    
    this.setScore(resDocs, terms);
    resDocs.sort(this.sort);

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
 * TODO
 *   field boosts
 *   query time boosts => boost(t) = 1 at the moment
 *
 * Neglected some parts because for searching tweets I don't need it:
 *   lengthNorm is 1
 *   term frequency is 1
 *   coord(q,d) = number of terms of q that are in d = 1 at the moment
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
            bs = this.iindex[terms[k]];
            var tf = 1 /* Math.sqrt(tf) */;
            var idf = Math.log(totalDocs / (bs.cardinality() + 1.0)) + 1.0;

            // TODO field boosts
            //        for(var ft in bs.fieldTypes) {
            //        }
            sum += tf * idf * idf /* term.queryTimeBoost */ * norm;
            x += idf * idf /* term.queryTimeBoost */;
        }

        var queryNorm = 1/Math.sqrt(x);
        doc.score = queryNorm * sum;
    }
}

JSii.prototype.sort = function(doc1, doc2) {
    if(doc1.score > doc2.score)
        return 1;
    else if(doc1.score < doc2.score)
        return -1;
    return 0;
};

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