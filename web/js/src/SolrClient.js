/*
 * http://github.com/gsf/node-solr/blob/master/LICENSE
 * 
 * Taken from http://github.com/gsf/node-solr/blob/master/solr.js
 *
 * HTTP basic Authentication via
 * http://github.com/ther/http-basic-auth/
 */
var http = require("http");
var querystring = require("querystring");
var base64 = require('./base64');

SolrClient = function(host, port, webapp, login, pw) {
    this.host = host || "127.0.0.1";
    this.port = port || "8983";
    this.fullHost = this.host + ":" + this.port;
    this.webapp = webapp || "solr";
    console.log(host + " " + port + " " + webapp + " " + login + " " + pw);    
    this.httpClient = http.createClient(port, host);
    this.login = login;
    this.pw = pw;
};

if (typeof module !== "undefined") module.exports = SolrClient

SolrClient.prototype.query = function (query, options, callback) {
    var queryParams = options || {};
    queryParams.q = query;
    queryParams.wt = "json";
    queryParams = querystring.stringify(queryParams);
    this.rawQuery(queryParams, callback);
};

SolrClient.prototype.rawQuery = function (queryParams, callback) {
    var queryPath, requestOptions;    
    queryPath = "/"+this.webapp+"/select?";
    
    requestOptions = {
        method: "GET",
        path: queryPath + queryParams,
        headers: {
            "Host": this.fullHost
        }
    };

    if(this.login != undefined)
        requestOptions.headers['Authorization'] = 'Basic ' + base64.encode(this.login + ':' + this.pw);
    
    this.sendRequest(requestOptions, callback || noop);
};

SolrClient.prototype.getStatus = function (statusMessage) {
    if (!statusMessage) {
        return 1;
    }
    var statusTag = '<int name="status">';
    return statusMessage.charAt(statusMessage.indexOf(statusTag) +
        statusTag.length);
};

SolrClient.prototype.getError = function (errorMessage) {
    return errorMessage;
//    return errorMessage.match(/<pre>(.+)<\/pre>/)[1];
};

SolrClient.prototype.sendRequest = function(options, callback) {
    //console.log(options);
    var self = this;
    var request = this.httpClient.request(options.method.toUpperCase(),
        options.path, options.headers);
    var buffer = '';
    request.addListener("response", function (response) {
        response.addListener("data", function (chunk) {
            buffer += chunk;
        });
        response.addListener("end", function () {
            if (response.statusCode !== 200) {
                var err = self.getError(buffer);
                callback(err, null);
            } else {
                callback(null, buffer);
            }
        });
    });
    if (options.data)
        request.write(options.data, options.requestEncoding || 'utf8');
    
    request.end();
}
