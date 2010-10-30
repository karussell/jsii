/*
 * This software stands under the Apache 2 License
 */

describe("JSii", function() {
    
    it("should do simple search", function() {        
        var jsii = new JSii();        
        jsii.feedDocs([{
            id : 1,
            text : "blup"
        },{
            id : 2,
            text : "blup blap"
        }]);

        var resp = jsii.search('blup');
        expect(resp.total).toBe(2);
        expect(resp.docs.length).toBe(2);
        expect(resp.docs[0].id).toBe(1);
        expect(resp.docs[1].id).toBe(2);

        resp = jsii.search('Blap');
        expect(resp.total).toBe(1);
        expect(resp.docs.length).toBe(1);
        expect(resp.docs[0].id).toBe(2);

        // search for an id!
        resp = jsii.search('1');
        expect(resp.total).toBe(1);
        expect(resp.docs[0].id).toBe(1);

        // you cannot get documents with id=1 AND 2
        resp = jsii.search('1 2');
        expect(resp.total).toBe(0);        
    });

    it("should do pagination", function() {
        var jsii = new JSii();
        jsii.feedDocs([{
            id : 1,
            text : "blup"
        },{
            id : 2,
            text : "blup blap"
        },{
            id : 3,
            text : "blup blap three"
        },{
            id : 4,
            text : "blup blap five"
        }]);
        
        var resp = jsii.search('blup', 0, 2);
        expect(resp.total).toBe(4);
        expect(resp.docs.length).toBe(2);
        expect(resp.docs[0].id).toBe(1);

        // identical results now first doc has id == 2
        resp = jsii.search('blup', 1, 2);
        expect(resp.total).toBe(4);
        expect(resp.docs.length).toBe(2);
        expect(resp.docs[0].id).toBe(2);
    });

    describe("text tokenizer", function() {

        it("should do tokenization", function() {
            var jsii = new JSii();
            var res = jsii.textTokenizer("text is here");
            expect(res[0]).toBe('text');
            expect(res[1]).toBe('is');
            expect(res[2]).toBe('here');

            res = jsii.textTokenizer("  text  is here");
            expect(res[0]).toBe('text');
            expect(res[1]).toBe('is');
            expect(res[2]).toBe('here');

            res = jsii.textTokenizer(" &text--is Here");
            expect(res[0]).toBe('text');
            expect(res[1]).toBe('is');
            expect(res[2]).toBe('here');

            res = jsii.textTokenizer("1");
            expect(res[0]).toBe('1');
            res = jsii.textTokenizer("1 3");
            expect(res[0]).toBe('1');
            expect(res[1]).toBe('3');
        });
    });

    it("get all docs via * and paging", function() {
        var jsii = new JSii();
        jsii.feedDocs([{
            id : 1,
            text : "test blap"
        },{
            id : 2,
            text : "test blap blup"
        }]);

        var res = jsii.search("*");
        expect(res.total).toBe(2);

        res = jsii.search("*", 1, 2);
        expect(res.total).toBe(2);
        expect(res.docs.length).toBe(1);
    });

    it("should do a phrase search with correct score", function() {
        var jsii = new JSii();
        jsii.feedDocs([{
            id : 1,
            text : "test blap"
        },{
            id : 2,
            text : "test blap blup"
        }]);

        var res = jsii.search("test blap");
        expect(res.total).toBe(2);
        var score1 = res.docs[0].score;
        var score2 = res.docs[1].score;
        expect(score1).toBeGreaterThan(0.5);

        res = jsii.search("blup test");
        expect(res.total).toBe(1);        
        expect(score1).toBeGreaterThan(res.docs[0].score);
    });

});