// @deprecated
function Doc(hash) {    
    for(var prop in hash)
        this[prop] = hash[prop];

    // TODO make sure no property is named 'score''
    this.score = 0;
}

// Doc extends Array
//Doc.prototype = new Array();
// but call Doc constructor ...
//Doc.prototype.constructor = Doc
// call ancestor methods using Function.call()
// Doc.prototype.mymethod=function(){
//    Array.prototype.mymethod.call(this);
// }

Doc.prototype.clone = function() {
    return clone(this);
}