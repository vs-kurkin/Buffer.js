Buffer.js 1.0
=========

Client-side version of the <a href="http://nodejs.org/docs/latest/api/buffer.html">Buffer</a> from <a href="http://nodejs.org/">NodeJS</a> with support <a href="https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer">ArrayBuffer</a>.

Differences from NodeJS module:

* Support ArrayBuffer and dataView
* Supports the following encoding: `base64`, `hex`, `utf-8`
* Not implemented support for the property `INSPECT_MAX_BYTES`
* Added methods: `toArray` and `toArrayBuffer` (if supported by the browser)



