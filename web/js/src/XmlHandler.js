XmlHandler = function() {
    this.str ="";
    this.prettyPrint = false;
    this.stack = [];
}

XmlHandler.prototype.header = function() {
    this.str = '<?xml version="1.0" encoding="UTF-8"?>';
    return this;
}

XmlHandler.prototype.create = function(el, attrs, text) {
    this.start(el, attrs).text(text).end();
    return this;
}

XmlHandler.prototype.start = function(el, attrs) {
    if(el == undefined || el.length == 0)
        throw new "element mustn't be empty!";
    
    this.str += "<"+el;
    for(var attr in attrs) {
        this.str += " " + attr + '="'+attrs[attr]+'"';
    }
    this.str += ">";
    this.stack.push(el);
    return this;
}

XmlHandler.prototype.text = function(str) {
    if(typeof str === "string")
        for(var i = 0; i < str.length; i++) {
            var tmp = str.charAt(i);
            switch(tmp) {
                case '"':
                    this.str += "&quot;";
                    break;
                case '\'':
                    this.str += "&apos;";
                    break;
                case '&':
                    this.str += "&amp;";
                    break;
                case '<':
                    this.str += "&lt;";
                    break;
                case '>':
                    this.str += "&gt;";
                    break;
                default:
                    this.str += tmp;
            }
        }
    else
        this.str += '' + str;
    return this;
}

XmlHandler.prototype.end = function() {
    if(this.stack.length == 0)
        throw "all element already closed";

    var el = this.stack.pop();
    this.str += "</"+el+">";
    if(this.prettyPrint)
        this.str += "\n";
    return this;
}

XmlHandler.prototype.toXml = function() {
    if(this.stack.length > 0)
        throw "element stack is not empty! " + this.stack;
    
    return this.str;
}

// Solr helper methods
XmlHandler.prototype.startLst = function(name, value) {
    return this.start('lst', {
        name : name
    });
}
XmlHandler.prototype.createInt = function(name, value) {
    return this.create('int', {
        name : name
    }, value);
}

XmlHandler.prototype.createStr = function(name, value) {
    return this.create('str', {
        name : name
    }, value);
}

XmlHandler.prototype.createBool = function(name, value) {
    return this.create('bool', {
        name : name
    }, value);
}

XmlHandler.prototype.createLong = function(name, value) {
    return this.create('long', {
        name : name
    }, value);
}

XmlHandler.prototype.createFloat = function(name, value) {
    return this.create('float', {
        name : name
    }, value);
}

XmlHandler.prototype.createDate = function(name, value) {
    return this.create('date', {
        name : name
    }, value.toString());
}

XmlHandler.prototype.createStringArr = function(name, value) {
    var el = this.start('arr', {
        name : name
    });
    for(var i = 0; i < value.length; i++) {
        el.create('str', {} ,value[i]);
    }
    el.end();
}

XmlHandler.prototype.writeDocs = function(docs) {
    for(var i = 0; i < docs.length; i++) {
        this.start('doc').writeDoc(docs[i]).end();
        if(this.prettyPrint)
            this.str += '\n';
    }

    return this;
}

XmlHandler.prototype.writeDoc = function(doc) {
    for(var prop in doc) {
        var val = doc[prop];
        if(val == undefined)
            continue;
        
        if(typeof val === "string")
            this.createStr(prop, val);
        else if(typeof val === "boolean")
            this.createBool(prop, val);
        //        else if(typeof val === "long")
        //            this.createLong(prop, val);
        else if(typeof val === "number"){
            if(val%1==0)
                this.createLong(prop, val);
            else
                this.createFloat(prop, val);
        }
        else if(val instanceof Date)
            this.createDate(prop, val);
    }
    return this;
}