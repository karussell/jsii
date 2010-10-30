/*
 * This software stands under the Apache 2 License
 */

describe("Helper", function() {

    it("should clone a document", function() {
        var doc = {
            test: "bla blu",
            id : 1
        }
        var cDoc = clone(doc);
        cDoc["test"] = "blip";
        expect(doc["test"]).toBe("bla blu");
        expect(doc["id"]).toBe(1);
        expect(cDoc["test"]).toBe("blip");
        expect(cDoc["id"]).toBe(1);
    });
});