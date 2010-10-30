/*
 * This software stands under the Apache 2 License
 */

// require statements are not hotupdateable!?
var http = require('http');
//var querystring = require('querystring');
var url = require('url');

require('./JSii');
require('./BitSet');
require('./json2');

// feed docs into our index
var engine = new JSii();
engine.feedDocs([{
    id:1,
    text : "blasenfrei blup"
}, {
    id:2,
    text : "blap blup"
}]);


// accept clients
http.createServer(function (request, response) {
    response.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    var params = url.parse(request.url, true).query;
    if(params == undefined || params.q == undefined)
        response.write('{info: "No q specified"}');
    else {
        var start = new Date().getTime();
        var result = engine.search(params.q);
        var time = (new Date().getTime() - start) / 1000.0;
        response.write('{\ninfo: {numFound:'+result.docs.length+', time: '+time+'}');
        response.write(',\nparams: ' + JSON.stringify(params));
        response.write(',\ndocs:');
        response.write(JSON.stringify(result.docs));
        response.write("\n}");
    }
    response.end();
}).listen(8124, "127.0.0.1");

console.log('Server running at http://127.0.0.1:8124/');

