/*
 * This software stands under the Apache 2 License
 */

function Helper() {
};

var clone = function(doc) {
    var newdoc = {};
    for(var prop in doc) {
        newdoc[prop] = doc[prop];
    }
    return newdoc;
};