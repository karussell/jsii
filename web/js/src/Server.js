/*
 * This software stands under the Apache 2 License
 *
 * Using node.js v0.2.4
 */

// require statements are not hotupdateable!?
var http = require('http');
//var querystring = require('querystring');
var url = require('url');
var fs = require('fs');
var util = require('util');
// process is a global variable
require('./JSii');
require('./BitSet');
require('./json2');
require("./Solr");
require("./XmlHandler");

// feed docs from solr into our index
var engine = new JSii();
engine.defaultSearchField = 'tw';
    
var querySolr = function(webapp, login, pw) {
    // var client = new SolrClient("localhost", "8082", "solr");
    var client = new SolrClient("pannous.info", "80", webapp, login, pw);
    var queryStr = "";
    var feedingInProcess = false;

    var feedDocsCallBack = function (err, response) {
        var responseObj = JSON.parse(response);
        if(responseObj == null) {
            console.log("Something goes wrong. response was null");
            return;
        }
        
        var start = new Date().getTime();
        engine.feedDocs(responseObj.response.docs);
        var time = (new Date().getTime() - start) / 1000.0;
        console.log(new Date() + "| " + JSON.stringify(responseObj.responseHeader.params) + " returned " + responseObj.response.docs.length + " documents. "+
            "feeding time:"+time+" total:" + responseObj.response.numFound + ' RAM:' + process.memoryUsage().heapUsed / 1024 / 1024 + ' MB');
        feedingInProcess = false;
    };
    
    var options = {};
    options.start = 0;
    options.rows = 1000;
    //options.fq = "lang:en";
    setInterval(function() {        
        if(feedingInProcess)
            return;
        
        feedingInProcess = true;
        client.query(queryStr, options, feedDocsCallBack);
        options.start += options.rows;
    }, 60 * 1000);
}

fs.open("src/pw.txt", "r", 0666, function(err, fd){
    if (err) throw err;
    fs.read(fd, 10000, null, 'utf8', function(err,str,count) {
        if (err) throw err;
        var pwLine = str.split(" ");
        var webapp = pwLine[0];
        var login = pwLine[1];
        var pw = pwLine[2];

        querySolr(webapp, login, pw);
        fs.close(fd);
    });
});


// static mini example feeding
//engine.feedDocs([{
//    id:1,
//    text : "blasenfrei blup"
//}, {
//    id:2,
//    text : "blap blup"
//}]);

// accept clients
http.createServer(function (request, response) {
    if(request.url == undefined)
        show404(request, response);
    else {
        var path = url.parse(request.url, true).pathname;
        switch (path) {
            case '/select/':
            case '/select':
                query(request, response);
                break;          
            default:
                show404(request, response);
                break;
        }
    }
}).listen(8124, "127.0.0.1");

console.log('Server running at http://127.0.0.1:8124/');

var errorMessage = "Use select?q=query to query the in-memory index or use update/ to feed it!";

function query(request, response) {   
    var params = url.parse(request.url, true).query;
    if(params == undefined) {
        response.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        response.write('{"responseHeader": {"status": 1, "QTime": 0, "error": "'+errorMessage+'"}, "response":{"numFound":0}}');
    } else {        
        params.q = params.q || "";        
        params.start = params.start || 0;
        var start = new Date().getTime();
        var sortMethod = engine.createSortMethod(params.sort);
        var result = engine.search(params.q, params.start, params.rows, sortMethod);        
        var time = new Date().getTime() - start;
        console.log(new Date() + "| new query:" + JSON.stringify(params));
        if(params.wt == "json") {
            writeJson({
                response: response,
                time : time,
                params : params
            }, result);
        } else {
            writeXml({
                response: response,
                time : time,
                params : params
            }, result);
        }
    }
    response.end();
}

function show404(req, res) {
    res.writeHead(404, {
        'Content-Type': 'text/plain'
    });    
    res.write('{"responseHeader": {"status": 1, "QTime": 0, "error": "'+errorMessage+'"}, "response":{"numFound":0}}');
    res.end();
}

function writeXml(arg, result) {
    var time = arg.time;
    var response = arg.response;
    var params = arg.params;
    var xml = new XmlHandler();
    xml.prettyPrint = true;
    xml.header().start('response');
    xml.startLst("responseHeader").
    createInt("status", 0).
    createInt("QTime", time);

    xml.startLst("params");
    // TODO params
    xml.end();
    xml.end();

    xml.start('result', {
        name:"response",
        numFound: result.total,
        start: params.start
    }).writeDocs(result.docs).end();
    xml.end();
    response.writeHead(200, {
        'Content-Type': 'text/xml'
    });
    response.write(xml.toXml());
}

function writeJson(arg, result) {
    var time = arg.time;
    var response = arg.response;
    var params = arg.params;
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });
    response.write('{"responseHeader": {"status":0, "QTime": '+time);
    response.write(',"params": ' + JSON.stringify(params));

    // jsii 'extension'
    response.write(',"jsii": ' + JSON.stringify({
        date: new Date()
    }));

    response.write('},\n"response":{"numFound":'+result.total+', "start":' + params.start + ',\n');
    response.write('"docs":[');

    for(var i = 0; i < result.docs.length; i++) {
        if( i > 0)
            response.write(",\n");
        response.write(JSON.stringify(result.docs[i]));
    }

    response.write("\n]}}");
}