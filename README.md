Buffer.js 1.0
=========

Client-side версия модуля <a href="http://nodejs.org/docs/latest/api/buffer.html">Buffer</a> из <a href="http://nodejs.org/">NodeJS</a> c поддержкой <a href="https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer">ArrayBuffer</a>.

Отличия от NodeJS модуля:

* Поддерживает ArrayBuffer и dataView
* Поддерживает следующие кодировки: `base64`, `hex`, `utf-8`
* Не реализована поддержка свойства `INSPECT_MAX_BYTES`
* Добавлены методы: `toArray` и `toArrayBuffer`, если он поддерживается браузером



