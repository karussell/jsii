/*
 * This software stands under the Apache 2 License
 */

/**
 * A sparse array holding chunks of 32bit
 *
 * Taken from "apache 2 license":
 * http://code.google.com/p/google-web-toolkit/issues/detail?id=3279
 *
 * Bit operations in javascript:
 * http://docstore.mik.ua/orelly/webprog/jscript/ch05_08.htm
 *
 * a common operation is 'x >>> 5' which converts the bitSetIndex into
 * the index necessary to retrieve one of the 32 bit chunk.
 */

BitSet = function() {
    this.arr = [];
}

if (typeof module !== "undefined") module.exports = BitSet

BitSet.prototype.and = function(set) {
    // a & a is just a    
    if (this === set)
        return;    

    // store arrays for easy access
    var thisArray = this.arr;
    // trim the second set to avoid extra work
    set.trimToSize();

    var otherArray = set.arr;        

    // if length is longer than otherLength, that ANDs those bits to false
    var otherLength = otherArray.length;
    if (thisArray.length > otherLength) {
        // shrink the array
        thisArray.length = otherLength;
    }

    // truth table
    //
    // case | a     | b     | a & b | change?
    // 1    | false | false | false | a is already false
    // 2    | false | true  | false | a is already false
    // 3    | true  | false | false | set a to false
    // 4    | true  | true  | true  | a is already true
    //
    // we only need to change something in case 3, so iterate over set a
    for (var property in thisArray) {
        var number = property >>> 0;
        if (String(number) == property && number !== 0xffffffff) {
            // check length to avoid an extra array lookup
            if (number < otherLength) {
                var bits = otherArray[number];
                if (bits === undefined) {
                    delete thisArray[number];
                } else {
                    var packed = thisArray[number];
                    packed &= bits;
                    // keep 0s out of the array
                    if (packed === 0) {
                        delete thisArray[number];
                    } else {
                        thisArray[number] = packed;
                    }
                }
            }
        }
    }
    this.cardinalityNum = undefined;
};

BitSet.prototype.set = function(index) {   
    this.arr[index >>> 5] |= (1 << (index & 0x1f));
    this.cardinalityNum = undefined;
};

BitSet.prototype.setRange = function(fromIndex, toIndex) {
    this.checkRange(fromIndex, toIndex);
    var first = fromIndex >>> 5;
    var last = toIndex >>> 5;
    var startBit = fromIndex & 0x1f;
    var endBit = toIndex & 0x1f;

    if (first == last) {
        // clear the bits in between first and last
        this.rawMaskIn(first, startBit, endBit);

    } else {
        // clear the bits from fromIndex to the next 32 bit boundary
        if (startBit != 0)
            this.rawMaskIn(first++, startBit, 32);

        // clear the bits from the last 32 bit boundary to the toIndex
        if (endBit != 0)
            this.rawMaskIn(last, 0, endBit);

        // delete everything in between
        for (var i = first; i < last; i++) {
            this.arr[i] = 0xffffffff;
        }
    }
    this.cardinalityNum = undefined;
}

// helper method of setRange
BitSet.prototype.rawMaskIn = function(index, from, to) {
    // shifting by 32 is the same as shifting by 0, this check prevents that
    // from happening in addition to the obvious prevention of extra work
    if (from !== to) {
        // adjust "to" so it will shift out those bits
        to = 32 - to;
        // create a mask and OR it in
        this.arr[index] |= ((0xffffffff >>> from) << (from + to)) >>> to;
    }
}

BitSet.prototype.clear =  function(bitIndex) {
    var index = bitIndex >>> 5;
    var packed = this.arr[index];
    if (packed !== undefined) {
        // mask the correct bit out
        packed &= ~(1 << (bitIndex & 0x1f));
        // keep 0s out of the array
        if (packed === 0) {
            delete this.arr[index];
        } else {
            this.arr[index] = packed;
        }
    }
    this.cardinalityNum = undefined;
}

BitSet.prototype.clear = function() {
    this.arr = [];
    this.cardinalityNum = undefined;
}

BitSet.prototype.get = function(bitIndex) {
    // pull out the bits for the given index
    var packed = this.arr[bitIndex >>> 5];
    if (packed === undefined)
        return false;

    // shift and mask the bit out
    return ((packed >>> (bitIndex & 0x1f)) & 1) == 1;
};


BitSet.prototype.join = function(separator) {
    return this.arr.join(separator);
}

BitSet.prototype.clone = function() {
    var bs = new BitSet();
    bs.arr = this.arr.slice(0);
    return bs;
}

BitSet.prototype.rawLength = function () {
    return this.arr.length;
}

BitSet.prototype.length = function() {
    var last = this.trimToSize();
    if (last == -1)
        return 0;

    // log2 will give the highest bit
    // use ">>> 0" to make it unsigned, and again to get it back to an int
    return (last << 5) + ((Math.log(this.arr[last] >>> 0) / Math.LN2) >>> 0) + 1;
}

BitSet.prototype.isEmpty = function() {
    return this.length() == 0;
}

BitSet.prototype.equals = function(other) {
    var count = 0;
    // TODO iterator throught the array with less properties
    for (var property in this.arr) {
        var number = property >>> 0;
        if (String(number) == property && number !== 0xffffffff) {
            if (other[number] !== this.arr[number])
                return false;
            
            count++;
        }
    }
    return other.rawLength === count;
}

BitSet.prototype.trimToSize = function() {
    var length = this.arr.length;
    if (length === 0)
        return -1;

    // check if the last bit is false
    var last = length - 1;
    if (this.arr[last] !== undefined)
        return last;

    // interleave property checks and linear index checks from the end
    var biggestSeen = -1;
    for (var property in this.arr) {
        // test the index first
        if (--last === -1)
            return -1;

        if (this.arr[last] !== undefined)
            return last;

        // now check the property
        var number = property >>> 0;
        if (String(number) == property && number !== 0xffffffff) {
            if (number > biggestSeen)
                biggestSeen = number;
        }
    }

    this.arr.length = biggestSeen + 1
    return biggestSeen;
};

BitSet.prototype.cardinality = function() {
    if(this.cardinalityNum != undefined)
        return this.cardinalityNum;

    // calculate cardinality once but after that access to cardinality is fast!
    var count = 0;
    for (var property in this.arr) {
        var number = property >>> 0;
        if (String(number) == property && number !== 0xffffffff) {
            // the code used is faster than the following:
            // count += @java.lang.Integer::bitCount(I)(array[number]);
            var bits = this.arr[number];
            bits = bits - ((bits >>> 1) & 0x55555555);
            bits = (bits & 0x33333333) + ((bits >>> 2) & 0x33333333);
            count += ((bits + (bits >>> 4) & 0xf0f0f0f) * 0x1010101) >>> 24;
        }
    }
    this.cardinalityNum = count;
    return count;
}

BitSet.prototype.checkIndex = function(bitIndex) {
    if (bitIndex < 0)
        throw "bitIndex < 0: " + bitIndex;
}

BitSet.prototype.checkRange = function(fromIndex, toIndex) {
    if (fromIndex < 0)
        throw "fromIndex < 0: " + fromIndex;

    if (toIndex < 0)
        throw "toIndex < 0: " + toIndex;

    if (fromIndex > toIndex)
        throw "fromIndex: " + fromIndex + " > toIndex: " + toIndex;
}


BitSet.prototype.nextSetBit = function(fromIndex) {
    this.checkIndex(fromIndex);

    var length = this.length();
    var array = this.arr;
    var index = fromIndex >>> 5;

    var packed = array[index];
    if (packed !== undefined) {
        for (var i = fromIndex & 0x1f; i < 32; i++) {
            if ((packed & (1 << i)) != 0) {
                return (index << 5) + i;
            }
        }
    }
    index++;

    // interleave property checks and linear "index" checks
    var localMinimum = Number.MAX_VALUE;
    for (var property in array) {

        // test the index first
        packed = array[index]
        if (packed !== undefined) {
            return (index << 5) + this.numberOfTrailingZeros(packed);
        }
        if (++index >= length) {
            return -1;
        }

        // now check the property
        var number = property >>> 0;
        if (String(number) == property && number !== 0xffffffff) {
            if (number >= index && number < localMinimum) {
                localMinimum = number;
            }
        }
    }

    // if local minimum is what we started at, we found nothing
    if (localMinimum === Number.MAX_VALUE) {
        return -1;
    }

    // return the local minimum
    packed = array[localMinimum];
    return (localMinimum << 5) + this.numberOfTrailingZeros(packed);
};

BitSet.prototype.toString = function() {
    // possibly faster if all numerical properties are put into an array and sorted!?
    var length = this.length();
    if (length == 0)
        return "{}";

    var sb = "{";

    var next = this.nextSetBit(0);
    sb += next;

    while ((next = this.nextSetBit(next + 1)) != -1) {
        sb += ", " + next;
    }

    sb += "}";
    return sb;
}

/**
 * Based on Henry S. Warren, Jr.'s <i>Hacker's Delight</i>, (Addison Wesley, 2002).
 * Figure 5-14
 * 
 * Returns the number of zero bits following the lowest-order ("rightmost")
 * one-bit in the two's complement binary representation of the specified
 * <tt>int</tt> value.  Returns 32 if the specified value has no
 * one-bits in its two's complement representation, in other words if it is
 * equal to zero.
 *
 * @return the number of zero bits following the lowest-order ("rightmost")
 *     one-bit in the two's complement binary representation of the
 *     specified <tt>int</tt> value, or 32 if the value is equal
 *     to zero.
 */
BitSet.prototype.numberOfTrailingZeros = function(i) {
    
    var y;
    if (i == 0) return 32;
    var n = 31;
    y = i <<16;
    if (y != 0) {
        n = n -16;
        i = y;
    }
    y = i << 8;
    if (y != 0) {
        n = n - 8;
        i = y;
    }
    y = i << 4;
    if (y != 0) {
        n = n - 4;
        i = y;
    }
    y = i << 2;
    if (y != 0) {
        n = n - 2;
        i = y;
    }
    return n - ((i << 1) >>> 31);
}
