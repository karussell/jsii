//@deprecated
describe("Doc", function() {

    it("should clone itself", function() {
        var doc = new Doc({
                test: "bla blu",
                id : 1
            });
        
        var cDoc = doc.clone();
        cDoc["test"] = "blip";
        cDoc.score = 1;
        expect(doc["test"]).toBe("bla blu");
        expect(doc.test).toBe("bla blu");
        expect(doc.id).toBe(1);
        expect(doc.score).toBe(0);
        expect(cDoc.score).toBe(1);
        expect(cDoc["test"]).toBe("blip");
        expect(cDoc["id"]).toBe(1);
    });
});