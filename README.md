Buffer.js 2.0
=========

Client-side version of the <a href="http://nodejs.org/docs/latest/api/buffer.html">Buffer</a> from <a href="http://nodejs.org/">NodeJS</a> with support <a href="https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer">ArrayBuffer</a>.

Differences from NodeJS module:

* Support ArrayBuffer and dataView
* Supports the following encoding: `base64`, `hex`, `utf-8`
* Not implemented support for the property `INSPECT_MAX_BYTES`
* Added methods:
    * `toArray` ([start, end])
    * `toDataView` ([start, end]) - if supported by the browser
    * `toArrayBuffer` ([start, end]) - if supported by the browser
    * `readUInt16` (offset, [isBigEndian, noAssert])
    * `readInt16` (offset, [isBigEndian, noAssert])
    * `readUInt32` (offset, [isBigEndian, noAssert])
    * `readInt32` (offset, [isBigEndian, noAssert])
    * `readFloat` (offset, [isBigEndian, noAssert])
    * `readDouble` (offset, [isBigEndian, noAssert])
    * `writeUInt16` (value, offset, [isBigEndian, noAssert])
    * `writeInt16` (value, offset, [isBigEndian, noAssert])
    * `writeUInt32` (value, offset, [isBigEndian, noAssert])
    * `writeInt32` (value, offset, [isBigEndian, noAssert])
    * `writeFloat` (value, offset, [isBigEndian, noAssert])
    * `writeDouble` (value, offset, [isBigEndian, noAssert])



