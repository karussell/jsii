/*
 * This software stands under the Apache 2 License
 */
describe("BitSet", function() {    

    var TEST_SIZE = 207;
    var BIG_NUMBER = (TEST_SIZE) * 10 + 101;

    //    beforeEach(function() {
    //        });

    it("should do AND correctly", function() {
        // setA will contain all multiples of 2
        var setA = new BitSet();
        for (i = 0; i < TEST_SIZE; i += 2) {
            setA.set(i);
        }

        // setB will contain all multiples of 3
        var setB = new BitSet();
        for (i = 0; i < TEST_SIZE; i += 3) {
            setB.set(i);
        }
        
        // and()ing the sets should give multiples of 6
        setA.and(setB);

        // verify by checking multiples of 6
        for (i = 0; i < TEST_SIZE; i++) {
            if (i % 6 == 0) {
                expect(setA.get(i)).toBeTruthy();
            } else {
                expect(setA.get(i)).toBeFalsy();
            }
        }

        // and()ing a set to itself should do nothing                
        setA.and(setA);

        // verify by checking multiples of 6
        for (i = 0; i < TEST_SIZE; i++) {
            if (i % 6 == 0) {
                expect(setA.get(i)).toBeTruthy();
            } else {
                expect(setA.get(i)).toBeFalsy();
            }
        }

        // and()ing with a set identical to itself should do nothing
        setA.and(setA.clone());

        // verify by checking multiples of 6
        for (i = 0; i < TEST_SIZE; i++) {
            if (i % 6 == 0) {
                expect(setA.get(i)).toBeTruthy();
            } else {
                expect(setA.get(i)).toBeFalsy();
            }
        }
    });

    it("should set ranges correctly", function() {
        var setA = new BitSet();
        for (i = 0; i < TEST_SIZE; i += 2) {
            setA.set(i);
        }
        var setB = new BitSet();
        for (i = 0; i < TEST_SIZE; i += 3) {
            setB.set(i);
        }
        // and()ing the sets should give multiples of 6
        setA.and(setB);
        
        // and()ing with all trues should do nothing
        var trueSet = new BitSet();
        trueSet.setRange(0, TEST_SIZE);
        setA.and(trueSet);

        // verify by checking multiples of 6
        for (i = 0; i < TEST_SIZE; i++) {
            if (i % 6 == 0) {
                expect(setA.get(i)).toBeTruthy();
            } else {
                expect(setA.get(i)).toBeFalsy();
            }
        }

        // and()ing with all trues in a larger set should do nothing
        trueSet.setRange(TEST_SIZE, TEST_SIZE * 2);
        setA.and(trueSet);

        // verify by checking multiples of 6
        for (i = 0; i < TEST_SIZE; i++) {
            if (i % 6 == 0) {
                expect(setA.get(i)).toBeTruthy();
            } else {
                expect(setA.get(i)).toBeFalsy();
            }
        }
        // there were "TEST_SIZE" extra trues, so lets verify those came out false
        for (i = TEST_SIZE; i < TEST_SIZE * 2; i++) {
            expect(setA.get(i)).toBeFalsy();
        }

        // and()ing with an empty set should result in an empty set
        setA.and(new BitSet());
        expect(setA.length()).toBe(0);

        // these close bits should not intersect
        setB = new BitSet();
        setA.set(0);
        setB.set(1);
        setA.and(setB);
        expect(setA.isEmpty()).toBeTruthy();

        // these far apart bits should not intersect
        setB = new BitSet();
        setA.set(0);
        setB.set(BIG_NUMBER);
        setA.and(setB);
        expect(setA.isEmpty()).toBeTruthy();
        setA.set(0);
        setB.and(setA);
        expect(setB.isEmpty()).toBeTruthy();
    });

    it("should do cardinality", function() {
        var set = new BitSet(TEST_SIZE);

        // test the empty count
        expect(set.cardinality()).toBe(0);

        // test a count of 1
        set.set(0);
        expect(set.cardinality()).toBe(1);

        // test a count of 2
        set.set(BIG_NUMBER);
        expect(set.cardinality()).toBe(2);

        // clear them both and test again
        set.clear(0);
        set.clear(BIG_NUMBER);
        expect(set.cardinality()).toBe(0);

        // test different multiples
        for (multiple = 1; multiple < 33; multiple++) {
            set = new BitSet();
            set.set(BIG_NUMBER + multiple);
            for (i = 1; i < 33; i++) {
                set.set(i * multiple);
                expect(set.cardinality()).toBe(i + 1);
            }
        }

        // test powers of 2
        set = new BitSet();
        count = 0;
        for (i = 1; i < TEST_SIZE; i += i) {
            set.set(i);
            count++;
        }
        expect(set.cardinality()).toBe(count);

        // test a long run
        set = new BitSet();
        for (i = 0; i < TEST_SIZE; i++) {
            set.set(i);
            expect(set.cardinality()).toBe(i + 1);
        }
    });

    it("should do nextSetBit", function() {
        var set = new BitSet();

        expect(set.nextSetBit(0)).toBe(-1);
        set.set(0);
        set.set(1);
        expect(set.nextSetBit(0)).toBe(0);

        set = new BitSet();
        set.set(BIG_NUMBER);
        expect(set.nextSetBit(0)).toBe(BIG_NUMBER);
        expect(set.nextSetBit(BIG_NUMBER)).toBe(BIG_NUMBER);
        expect(set.nextSetBit(BIG_NUMBER + 1)).toBe(-1);

        for (i = 0; i < TEST_SIZE; i++) {
            set.set(BIG_NUMBER + i);
        }
        var tmp = Math.floor(TEST_SIZE / 2);
        set.set(tmp);
        expect(set.nextSetBit(0)).toBe(tmp);

        // test exceptions
        var threwException = false;
        try {
            set.nextSetBit(-1);
        } catch (e) {
            threwException = true;
        }
        expect(threwException).toBeTruthy();

        threwException = false;
        try {
            expect(new BitSet().nextSetBit(BIG_NUMBER)).toBe(-1);
        } catch (e) {
            threwException = true;
        }
        expect(threwException).toBeFalsy();
    });
});