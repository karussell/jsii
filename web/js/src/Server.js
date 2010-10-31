/*
 * This software stands under the Apache 2 License
 */

// require statements are not hotupdateable!?
var http = require('http');
//var querystring = require('querystring');
var url = require('url');
var fs = require('fs');
var util = require('util');
require('./JSii');
require('./BitSet');
require('./json2');
require("./Solr");

// feed docs from solr into our index
var engine = new JSii();
engine.defaultSearchField = 'tw';
fs.open("src/pw.txt", "r", 0666, function(err, fd){
    if (err) throw err;
    fs.read(fd, 10000, null, 'utf8', function(err,str,count) {
        if (err) throw err;
        var pwLine = str.split(" ");
        var webapp = pwLine[0];
        var login = pwLine[1];
        var pw = pwLine[2];
        
        //        var client = new SolrClient("localhost", "8082", "solr");
        var client = new SolrClient("pannous.info", "80", webapp, login, pw);
        var queryStr = "";
        
        var callback = function (err, response) {
            var responseObj = JSON.parse(response);
            if(responseObj == null) {
                console.log("Something goes wrong. response was null");
                return;
            }            
            
            // console.log("First doc: " + responseObj.response.docs[0].tw);            
            var start = new Date().getTime();
            engine.feedDocs(responseObj.response.docs);
            var time = (new Date().getTime() - start) / 1000.0;
            console.log("query \"" + queryStr + "\" returned " + responseObj.response.docs.length + " documents. \n"+
                "feeding time:"+time+" total:" + responseObj.response.numFound);
        };
        
        var options = {};
        options.rows = 1000;
        options.fq = "lang:en";
        for(var i = 0; i < 10000; i+=options.rows) {
            options.start = i;
            client.query(queryStr, options, callback);
        }

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

function query(request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    var params = url.parse(request.url, true).query;
    if(params == undefined || params.q == undefined)
        response.write('{info: "No q specified"}');
    else {
        if(params.start == undefined)
            params.start = 0;
        var start = new Date().getTime();
        var result = engine.search(params.q, params.start, params.rows);
        console.log('RAM:' + process.memoryUsage().heapUsed / 1024 / 1024 + ' MB');
        var time = new Date().getTime() - start;
        response.write('{"responseHeader": {"status":0, "QTime": '+time);
        response.write(',"params": ' + JSON.stringify(params));

        // jsii 'extension'
        response.write(',"jsii": ' + JSON.stringify({
            date: new Date()
        }));

        response.write('},\n"response":{"numFound":'+result.docs.length+', "start":' + params.start + ',\n');
        response.write('"docs":[');

        for(var i = 0; i < result.docs.length; i++) {
            if( i > 0)
                response.write(",\n");
            response.write(JSON.stringify(result.docs[i]));
        }

        response.write("\n]}}");
    }
    response.end();
}

function show404(req, res) {
    res.writeHead(404, {
        'Content-Type': 'text/plain'
    });
    res.write('Use select?q=query to query the in-memory index or use update/ to feed it!');
    res.end();
}