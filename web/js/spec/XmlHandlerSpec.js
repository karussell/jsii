/*
 * This software stands under the Apache 2 License
 */

describe("XmlHandler", function() {
    
    it("should create simple docs", function() {
        var xml = new XmlHandler();
        xml.start('test', {
            xy: "hi",
            tmp:"is great"
        });
        xml.text("wow&now<>").end();

        expect(xml.toXml()).toBe('<test xy="hi" tmp="is great">wow&amp;now&lt;&gt;</test>');
    });

    it("should support solr", function() {
        var xml = new XmlHandler();
        xml.start('test');
        xml.createInt("xy", 1);
        xml.createStringArr("test", ['1', "hi"]);
        xml.end();

        expect(xml.toXml()).toBe('<test><int name="xy">1</int><arr name="test"><str>1</str><str>hi</str></arr></test>');

        xml = new XmlHandler();
        xml.start('test');
        xml.start('result').writeDocs([{
            id:1,
            prop:"text"
        }]).end();
        xml.end();
        expect(xml.toXml()).toBe('<test><result><doc><long name="id">1</long><str name="prop">text</str></doc></result></test>');
    });

    it("should create solr response", function() {
        var xml = new XmlHandler();
        xml.prettyPrint = true;
        xml.start('response');
        xml.startLst("responseHeader").
        createInt("status", 0).
        createInt("QTime", 123);

        xml.start('lst',"params");
        // TODO params
        xml.end();

        xml.end();

        xml.start('result').writeDocs([{
            id:1,
            prop:"text"
        }]).end();
        xml.end();
//        alert(xml.toXml());
    });
});