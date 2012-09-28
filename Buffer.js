/**
 * @fileOverview Client-side версия модуля <a href="http://nodejs.org/docs/latest/api/buffers.html">Buffer</a> из <a href="http://nodejs.org/">NodeJS</a> c поддержкой <a href="https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer">ArrayBuffer</a>.
 * @author <a href="mailto:b-vladi@cs-console.ru">Влад Куркин</a>
 * @version 1.0
 */

(function (window) {
	var
		push = Array.prototype.push,
		slice = Array.prototype.slice,
		splice = Array.prototype.splice,
		hasNativeBuffer = window.DataView && window.ArrayBuffer,
		i2a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split(''),
		a2i = [],
		i = 0;

	// init a2i
	for (i; i < i2a.length; i++) {
		a2i[i2a[i].charCodeAt(0)] = i;
	}

	function getA2i (c) {
		var result = a2i[c];

		if (typeof result != 'number') {
			throw 'illegal character ' + c;
		}

		return result;
	}

	function verifyInt (value, max, min) {
		if (typeof (value) != 'number') {
			throw 'cannot write a non-number as a number';
		}

		if (min === undefined) {
			if (value < 0) {
				throw 'specified a negative value for writing an unsigned value';
			}

			if (value > max) {
				throw 'value is larger than maximum value for type';
			}
		} else {
			if (value < min) {
				throw 'value smaller than minimum allowed value';
			}

			if (value > max) {
				throw 'value larger than maximum allowed value';
			}
		}

		if (Math.floor(value) !== value) {
			throw 'value has a fractional component';
		}
	}

	function verifyIEEE754 (value, max, min) {
		if (typeof (value) != 'number') {
			throw 'cannot write a non-number as a number';
		}

		if (value > max) {
			throw 'value larger than maximum allowed value';
		}

		if (value < min) {
			throw 'value smaller than minimum allowed value';
		}
	}

	function readIEEE754 (buffer, offset, isBE, mLen, nBytes) {
		var
			m,
			eLen = nBytes * 8 - mLen - 1,
			eMax = (1 << eLen) - 1,
			eBias = eMax >> 1,
			nBits = -7,
			i = isBE ? 0 : (nBytes - 1),
			d = isBE ? 1 : -1,
			s = buffer[offset + i],
			e = s & ((1 << (-nBits)) - 1);

		i += d;
		s >>= (-nBits);
		nBits += eLen;

		while (nBits > 0) {
			e = e * 256 + buffer[offset + i];
			i += d;
			nBits -= 8;
		}

		m = e & ((1 << (-nBits)) - 1);
		e >>= (-nBits);
		nBits += mLen;

		while (nBits > 0) {
			m = m * 256 + buffer[offset + i];
			i += d;
			nBits -= 8;
		}

		if (e === 0) {
			e = 1 - eBias;
		} else if (e === eMax) {
			return m ? NaN : ((s ? -1 : 1) * Infinity);
		} else {
			m = m + Math.pow(2, mLen);
			e = e - eBias;
		}

		return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
	}

	function writeIEEE754 (buffer, value, offset, isBE, mLen, nBytes) {
		var
			e,
			m,
			c,
			eLen = nBytes * 8 - mLen - 1,
			eMax = (1 << eLen) - 1,
			eBias = eMax >> 1,
			rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
			i = isBE ? (nBytes - 1) : 0,
			d = isBE ? -1 : 1,
			s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

		value = Math.abs(value);

		if (isNaN(value) || value === Infinity) {
			m = isNaN(value) ? 1 : 0;
			e = eMax;
		} else {
			e = Math.floor(Math.log(value) / Math.LN2);

			if (value * (c = Math.pow(2, -e)) < 1) {
				e--;
				c *= 2;
			}

			if (e + eBias >= 1) {
				value += rt / c;
			} else {
				value += rt * Math.pow(2, 1 - eBias);
			}

			if (value * c >= 2) {
				e++;
				c /= 2;
			}

			if (e + eBias >= eMax) {
				m = 0;
				e = eMax;
			} else if (e + eBias >= 1) {
				m = (value * c - 1) * Math.pow(2, mLen);
				e = e + eBias;
			} else {
				m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
				e = 0;
			}
		}

		while (mLen >= 8) {
			buffer[offset + i] = m & 255;
			i += d;
			m /= 256;
			mLen -= 8;
		}

		e = (e << mLen) | m;
		eLen += mLen;

		while (eLen > 0) {
			buffer[offset + i] = e & 255;
			i += d;
			e /= 256;
			eLen -= 8;
		}

		buffer[offset + i - d] |= s * 128;
	}

	/**
	 * @name Buffer
	 * @constructor
	 * @description Конструктор создания буфера. В настоящий момент поддерживаются кодировки base64, hex и utf8.
	 * @param {number|string|Array|ArrayBuffer|DataView|Buffer} data Данные, помещаемые в буфер, или число, соответствующее размеру создаваемого буфера.
	 * @param {string} [encoding="utf8"] Кодировка данных, если в <i>data</i> передана строка.
	 * @property {number} length Размер буфера в байтах.
	 */
	function Buffer (data, encoding) {
		var
			index = 0,
			length;

		switch (typeof data) {
			case 'number':
				this.length = data;
				break;
			case 'string':
				length = data.length;
				encoding = String(encoding || 'utf8').toLowerCase();

				switch (encoding) {
					case 'base64':
						var
							groupCount = Math.floor(length / 4),
							c0,
							c1,
							c2,
							c3,
							missing = 0,
							indexIn = 0,
							len;

						if (4 * groupCount != length) {
							throw 'string length must be a multiple of four';
						}

						if (length !== 0) {
							if (data.charAt(length - 1) == '=') {
								missing++;
								groupCount--;
							}

							if (data.charAt(length - 2) == '=') {
								missing++;
							}
						}

						len = (3 * groupCount - missing);
						if (len < 0) {
							len = 0;
						}

						while (index++ < groupCount) {
							c0 = getA2i(data.charCodeAt(indexIn++));
							c1 = getA2i(data.charCodeAt(indexIn++));
							c2 = getA2i(data.charCodeAt(indexIn++));
							c3 = getA2i(data.charCodeAt(indexIn++));

							push.call(this, 255 & ((c0 << 2) | (c1 >> 4)), 255 & ((c1 << 4) | (c2 >> 2)), 255 & ((c2 << 6) | c3));
						}

						switch (missing) {
							case 0:
								break;
							case 1:
								c0 = getA2i(data.charCodeAt(indexIn++));
								c1 = getA2i(data.charCodeAt(indexIn++));
								c2 = getA2i(data.charCodeAt(indexIn++));

								push.call(this, 255 & ((c0 << 2) | (c1 >> 4)), 255 & ((c1 << 4) | (c2 >> 2)));
								break;
							case 2:
								c0 = getA2i(data.charCodeAt(indexIn++));
								c1 = getA2i(data.charCodeAt(indexIn++));

								push.call(this, 255 & ((c0 << 2) | (c1 >> 4)));
								break;
							default:
								throw 'never happen';
						}
						break;
					case 'hex':
						while (index < length) {
							push.call(this, parseInt(data.substr(index, 2), 16));
							index += 2;
						}
						break;
					case 'utf8':
						var code;

						while (index < length) {
							code = data.charCodeAt(index);

							if (code <= 127) {
								push.call(this, code);
							} else if (code <= 2047) {
								push.call(this, code >>> 6 | 192, code & 63 | 128);
							} else if (code <= 65535) {
								push.call(this, code >>> 12 | 224, code >>> 6 & 63 | 128, code & 63 | 128);
							} else if (code <= 2097151) {
								push.call(this, code >>> 18 | 240, code >>> 12 & 63 | 128, code >>> 6 & 63 | 128, code & 63 | 128);
							} else if (code <= 67108863) {
								push.call(this, code >>> 24 | 248, code >>> 18 & 63 | 128, code >>> 12 & 63 | 128, code >>> 6 & 63 | 128, code & 63 | 128);
							} else if (code <= 2147483647) {
								push.call(this, code >>> 30 | 252, code >>> 24 & 63 | 128, code >>> 18 & 63 | 128, code >>> 12 & 63 | 128, code >>> 6 & 63 | 128, code & 63 | 128);
							}

							index++;
						}
						break;
					default:
						throw 'unknown encoding';
				}
				break;
			default:
				if (data instanceof Buffer || Object.prototype.toString.call(data) === '[object Array]') {
					push.apply(this, data);
				} else if (hasNativeBuffer) {
					if (data instanceof ArrayBuffer) {
						data = new DataView(data);
					} else if (!(data instanceof DataView)) {
						throw 'first argument needs to be a number, array, buffer, arrayBuffer, dataView or string';
					}

					length = data.byteLength;

					while (index < length) {
						this[index] = data.getUint8(index);
						index++;
					}

					this.length = index;
				} else {
					throw 'first argument needs to be a number, array, buffer or string';
				}
		}
	}

	/**
	 * Проверяет, является ли переданный объект экземпляром конструктора {@link Buffer}.
	 * @static
	 * @param {Object} object Проверяемый объект.
	 * @return {boolean} Результат проверки.
	 */
	Buffer.isBuffer = function (object) {
		return (object instanceof Buffer);
	};

	/**
	 * Вычисляет количество байт переданных данных. Параметры аналогичны {@link Buffer}.
	 * @static
	 * @param {number|string|Array|ArrayBuffer|DataView|Buffer} data Данные, размер которых необходимо вычислить.
	 * @param {string} [encoding="utf8"] Кодировка переданных данных.
	 * @return {number} Размер в байтах.
	 */
	Buffer.byteLength = function (data, encoding) {
		return new Buffer(data, encoding).length;
	};

	/**
	 * Копирует данные в буфер <i>targetBuffer</i>.
	 * @param {Buffer} targetBuffer Буфер, в который необходимо скопировать данные.
	 * @param {number} [targetStart=0] Позиция, с которой вставляются копируемые данные.
	 * @param {number} [sourceStart=0] Начальная позиция копируемых данных в буфере.
	 * @param {number} [sourceEnd=this.length] Конечная позиция копируемых данных в буфере.
	 * @return {number} Новая длина буфера <i>targetBuffer</i>.
	 * @function
	 */
	Buffer.prototype.copy = function (targetBuffer, targetStart, sourceStart, sourceEnd) {
		var
			sourceLength = this.length,
			targetLength = targetBuffer.length,
			data;

		sourceStart = sourceStart || 0;
		sourceEnd = sourceEnd || sourceLength;
		targetStart = targetStart || 0;

		if (sourceEnd < sourceStart) {
			throw 'sourceEnd < sourceStart';
		}

		if (sourceEnd === sourceStart || targetBuffer.length === 0 || sourceLength === 0) {
			return 0;
		}

		if (targetStart < 0 || targetStart >= targetLength) {
			throw 'targetStart out of bounds';
		}

		if (sourceStart < 0 || sourceStart >= sourceLength) {
			throw 'sourceStart out of bounds';
		}

		if (sourceEnd < 0 || sourceEnd > sourceLength) {
			throw 'sourceEnd out of bounds';
		}

		if (targetLength - targetStart < sourceEnd - sourceStart) {
			sourceEnd = targetLength - targetStart + sourceStart;
		}

		data = slice.call(this, sourceStart, sourceEnd);
		data.unshift(targetStart, sourceEnd - sourceStart);
		splice.apply(targetBuffer, data);

		return targetBuffer.length;
	};

	/**
	 * Преобразует буфер в строку.
	 * @param {string} [encoding=utf8] Кодировка, в которую необходимо преобразовать буфер.
	 * @param {number} [start=0] Начальная позиция кодируемых данных.
	 * @param {number} [end=this.length] Конечная позиция кодируемых данных.
	 * @return {string} Результат кодирования.
	 * @function
	 */
	Buffer.prototype.toString = function (encoding, start, end) {
		var
			result = '',
			index,
			number,
			length = this.length;

		if (start === undefined || start < 0) {
			start = 0;
		} else if (start > length) {
			start = length;
		}

		if (end === undefined || end > length) {
			end = length;
		} else if (end < 0) {
			end = 0;
		}

		if (start == end) {
			return result;
		}

		encoding = String(encoding || 'utf8').toLowerCase();
		index = start;
		length = end - start;

		switch (encoding) {
			case 'hex':
				while (index < end) {
					number = this[index++];
					result += (number < 16 ? '0' : '') + number.toString(16);
				}
				break;
			case 'base64':
				var
					groupCount = Math.floor(length / 3),
					remaining = length - 3 * groupCount,
					b0,
					b1,
					b2,
					i = 0;

				while (i++ < groupCount) {
					b0 = this[index++] & 255;
					b1 = this[index++] & 255;
					b2 = this[index++] & 255;

					result += i2a[b0 >> 2];
					result += i2a[(b0 << 4) & 63 | (b1 >> 4)];
					result += i2a[(b1 << 2) & 63 | (b2 >> 6)];
					result += i2a[b2 & 63];
				}

				switch (remaining) {
					case 0:
						break;
					case 1:
						b0 = this[index++] & 255;

						result += i2a[b0 >> 2];
						result += i2a[(b0 << 4) & 63];
						result += '==';
						break;
					case 2:
						b0 = this[index++] & 255;
						b1 = this[index++] & 255;

						result += i2a[b0 >> 2];
						result += i2a[(b0 << 4) & 63 | (b1 >> 4)];
						result += i2a[(b1 << 2) & 63];
						result += '=';
						break;
					default:
						throw 'never happen';
				}
				break;
			case 'utf8':
				while (index < end) {
					number = this[index++];

					if (number < 128) {
						result += String.fromCharCode(number);
					} else if (number < 224) {
						result += String.fromCharCode(((31 & number) << 6) | ((63 & this[index++]) << 0));
					} else if (number < 240) {
						result += String.fromCharCode(((15 & number) << 12) | ((63 & this[index++]) << 6) | ((63 & this[index++]) << 0));
					} else if (number < 248) {
						result += String.fromCharCode(((7 & number) << 18) | ((63 & this[index++]) << 12) | ((63 & this[index++]) << 6) | ((63 & this[index++]) << 0));
					} else if (number < 252) {
						result += String.fromCharCode(((3 & number) << 24) | ((63 & this[index++]) << 18) | ((63 & this[index++]) << 12) | ((63 & this[index++]) << 6) | ((63 & this[index++]) << 0));
					} else if (number < 254) {
						result += String.fromCharCode(((1 & number) << 30) | ((63 & this[index++]) << 24) | ((63 & this[index++]) << 18) | ((63 & this[index++]) << 12) | ((63 & this[index++]) << 6) | ((63 & this[index++]) << 0));
					}
				}
				break;
			default:
				throw 'unknown encoding';
		}

		return result;
	};

	/**
	 * Преобразует буфер в массив.
	 * @param {number} [start=0] Начальная позиция преобразуемых данных.
	 * @param {number} [end=this.length] Конечная позиция преобразуемых данных.
	 * @return {Array} Результат преобразования.
	 * @function
	 */
	Buffer.prototype.toArray = function (start, end) {
		var length = this.length;

		start = start || 0;
		end = end || length;

		if (end < start) {
			throw 'end < start';
		}

		if (end === start || length === 0) {
			return [];
		}

		if (start < 0 || start >= length) {
			throw 'start out of bounds';
		}

		if (end < 0 || end > length) {
			throw 'end out of bounds';
		}

		return slice.call(this, start, end);
	};

	if (hasNativeBuffer) {
		/**
		 * Преобразует буфер в DataView, если этот тип поддерживается браузером.
		 * @param {number} [start=0] Начальная позиция данных буфера.
		 * @param {number} [end=this.length] Конечная позиция данных буфера.
		 * @return {DataView} Новый буфер.
		 * @function
		 */
		Buffer.prototype.toDataView = function (start, end) {
			var
				dataView,
				byteLength,
				index = 0,
				length = this.length;

			start = start || 0;
			end = end || length;

			if (end < start) {
				throw 'end < start';
			}

			if (end === start || length === 0) {
				return new ArrayBuffer(0);
			}

			if (start < 0 || start >= length) {
				throw 'start out of bounds';
			}

			if (end < 0 || end > length) {
				throw 'end out of bounds';
			}

			byteLength = end - start;
			dataView = new DataView(new ArrayBuffer(byteLength));

			while (start < end) {
				dataView.setUint8(index++, this[start++]);
			}

			return dataView;
		};

		/**
		 * Преобразует буфер в ArrayBuffer, если этот тип поддерживается браузером.
		 * @param {number} [start=0] Начальная позиция данных буфера.
		 * @param {number} [end=this.length] Конечная позиция данных буфера.
		 * @return {ArrayBuffer} Новый буфер.
		 * @function
		 */
		Buffer.prototype.toArrayBuffer = function (start, end) {
			return this.toDataView(start, end).buffer;
		};
	}

	/**
	 * Копирует данные с позиции start до позиции end в новый буфер и возвращает его в качестве результата.
	 * @param {number} [start=0] Начальная позиция.
	 * @param {number} [end=this.length] Конечная позиция.
	 * @return {Buffer} Новый буфер.
	 * @function
	 */
	Buffer.prototype.slice = function (start, end) {
		return new Buffer(slice.call(this, start, end));
	};

	/**
	 * Записывает данные в кодировке encoding с позиции offset длинной length.
	 * @param {number|string|Array|ArrayBuffer|DataView|Buffer} data
	 * @param {number} [offset=0]
	 * @param {number} [length=this.length-offset]
	 * @param {string} [encoding="utf8"]
	 * @return {number} Число записанных байт
	 * @function
	 */
	Buffer.prototype.write = function (data, offset, length, encoding) {
		var
			remaining,
			buffer,
			byteLength;

		offset = +offset || 0;

		remaining = this.length - offset;

		if (!length) {
			length = remaining;
		} else {
			length = +length;
			if (length > remaining) {
				length = remaining;
			}
		}

		encoding = (String(encoding) || 'utf8').toLowerCase();

		buffer = new Buffer(data, encoding);
		byteLength = buffer.length;

		buffer = slice.call(buffer);
		buffer.unshift(offset, length);
		splice.apply(this, buffer);

		return byteLength < length ? byteLength : length;
	};

	/**
	 * Заполняет буфер значением value с позиции start до позиции end.
	 * @param {number|string} [value=0] Число или текстовый символ, код которого будет использован для заполнения.
	 * @param {number} [start=0] Начальная позиция.
	 * @param {number} [end=buffer.length] Конечная позиция.
	 * @function
	 */
	Buffer.prototype.fill = function (value, start, end) {
		var length = this.length;

		value = value || 0;
		start = start || 0;
		end = end || length;

		if (typeof value === 'string') {
			value = value.charCodeAt(0);
		}

		if (typeof value !== 'number' || isNaN(value)) {
			throw 'value is not a number';
		}

		if (end < start) {
			throw 'end < start';
		}

		if (end === start || length === 0) {
			return 0;
		}

		if (start < 0 || start >= length) {
			throw 'start out of bounds';
		}

		if (end < 0 || end > length) {
			throw 'end out of bounds';
		}

		while (start < end) {
			this[start++] = value;
		}
	};

	/**
	 * @param list
	 * @param length
	 * @return {buffer}
	 */
	Buffer.prototype.concat = function (list, length) {
		if (Object.prototype.toString.call(list) !== '[object Array]') {
			throw 'Usage: Buffer.concat(list, [length])';
		}

		var
			index,
			buffer,
			pos = 0;

		if (list.length === 0) {
			return new Buffer(0);
		} else if (list.length === 1) {
			return list[0];
		}

		if (typeof length !== 'number') {
			length = 0;

			for (index = 0; index < list.length; index++) {
				length += list[index].length;
			}
		}

		buffer = new Buffer(length);

		for (index = 0; index < list.length; index++) {
			var buf = list[index];

			buf.copy(buffer, pos);
			pos += buf.length;
		}

		return buffer;
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readUInt8 = function (offset, noAssert) {
		if (noAssert === true) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (offset >= this.length) {
				throw 'trying to read beyond buffer length';
			}
		}

		return this[offset];
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt8 = function (offset, noAssert) {
		if (noAssert === true) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (offset >= this.length) {
				throw 'trying to read beyond buffer length';
			}
		}

		return !(this[offset] & 128) ? this[offset] : ((255 - this[offset] + 1) * -1);
	};

	/**
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readUInt16 = function (offset, isBigEndian, noAssert) {
		var result;

		if (noAssert === true) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 1 >= this.length) {
				throw 'Trying to read beyond buffer length';
			}
		}

		if (isBigEndian) {
			result = this[offset] << 8;
			result |= this[offset + 1];
		} else {
			result = this[offset];
			result |= this[offset + 1] << 8;
		}

		return result;
	};

	Buffer.prototype.readUInt16LE = function (offset, noAssert) {
		return this.readUInt16(offset, false, noAssert);
	};

	Buffer.prototype.readUInt16BE = function (offset, noAssert) {
		return this.readUInt16(offset, true, noAssert);
	};

	/**
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt16 = function (offset, isBigEndian, noAssert) {
		var value = this.readUInt16(offset, isBigEndian, noAssert);

		return value & 32768 ? (65535 - value + 1) * -1 : value;
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt16LE = function (offset, noAssert) {
		return this.readInt16(offset, false, noAssert);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt16BE = function (offset, noAssert) {
		return this.readInt16(offset, true, noAssert);
	};

	/**
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readUInt32 = function (offset, isBigEndian, noAssert) {
		var result;

		if (noAssert === true) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 3 >= this.length) {
				throw 'Trying to read beyond this length';
			}
		}

		if (isBigEndian) {
			result = this[offset + 1] << 16;
			result |= this[offset + 2] << 8;
			result |= this[offset + 3];
			result += (this[offset] << 24 >>> 0);
		} else {
			result = this[offset + 2] << 16;
			result |= this[offset + 1] << 8;
			result |= this[offset];
			result += (this[offset + 3] << 24 >>> 0);
		}

		return result;
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readUInt32LE = function (offset, noAssert) {
		return this.readUInt32(offset, false, noAssert);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readUInt32BE = function (offset, noAssert) {
		return this.readUInt32(offset, true, noAssert);
	};

	/**
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt32 = function (offset, isBigEndian, noAssert) {
		var value = this.readUInt32(offset, isBigEndian, noAssert);

		return value & 2147483648 ? (4294967295 - value + 1) * -1 : value;
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt32LE = function (offset, noAssert) {
		return this.readInt32(offset, false, noAssert);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readInt32BE = function (offset, noAssert) {
		return this.readInt32(offset, true, noAssert);
	};

	/**
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readFloat = function (offset, isBigEndian, noAssert) {
		if (noAssert === true) {
			if (offset !== undefined && offset !== null) {
				throw 'missing offset';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 3 < this.length) {
				throw 'Trying to read beyond buffer length';
			}
		}

		return readIEEE754(this, offset, isBigEndian, 23, 4);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readFloatLE = function (offset, noAssert) {
		return this.readFloat(offset, false, noAssert);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readFloatBE = function (offset, noAssert) {
		return this.readFloat(offset, true, noAssert);
	};

	/**
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readDouble = function (offset, isBigEndian, noAssert) {
		if (noAssert === true) {
			if (offset !== undefined && offset !== null) {
				throw 'missing offset';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 7 < this.length) {
				throw 'Trying to read beyond buffer length';
			}
		}

		return readIEEE754(this, offset, isBigEndian, 52, 8);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readDoubleLE = function (offset, noAssert) {
		return this.readDouble(offset, false, noAssert);
	};

	/**
	 * @param offset
	 * @param noAssert
	 * @return {number}
	 */
	Buffer.prototype.readDoubleBE = function (offset, noAssert) {
		return this.readDouble(offset, true, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
		if (!noAssert) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (value === undefined || value === null) {
				throw 'missing value';
			}

			if (offset >= this.length) {
				throw 'trying to write beyond buffer length';
			}

			verifyInt(value, 255, undefined);
		}

		this[offset] = value;
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
		if (!noAssert) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (value === undefined || value === null) {
				throw 'missing value';
			}

			if (offset >= this.length) {
				throw 'trying to write beyond buffer length';
			}

			verifyInt(value, 127, -128);
		}

		if (value >= 0) {
			this.writeUInt8(value, offset, noAssert);
		} else {
			this.writeUInt8(255 + value + 1, offset, noAssert);
		}
	};

	/**
	 * @param value
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt16 = function (value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (value === undefined || value === null) {
				throw 'missing value';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 1 >= this.length) {
				throw 'trying to write beyond this length';
			}

			verifyInt(value, 65535, undefined);
		}

		if (isBigEndian) {
			this[offset] = (value & 65280) >>> 8;
			this[offset + 1] = value & 255;
		} else {
			this[offset + 1] = (value & 65280) >>> 8;
			this[offset] = value & 255;
		}
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
		this.writeUInt16(value, offset, false, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
		this.writeUInt16(value, offset, true, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 */
	Buffer.prototype.writeInt16 = function (value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			verifyInt(value, 32767, -32768);
		}

		this.writeUInt16(value < 0 ? 65535 + value + 1 : value, offset, isBigEndian, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
		this.writeInt16(value, offset, false, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
		this.writeUInt16(value, offset, true, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt32 = function (value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (value === undefined || value === null) {
				throw 'missing value';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 3 >= this.length) {
				throw 'trying to write beyond this length';
			}

			verifyInt(value, 4294967295, undefined);
		}

		if (isBigEndian) {
			this[offset] = (value >>> 24) & 255;
			this[offset + 1] = (value >>> 16) & 255;
			this[offset + 2] = (value >>> 8) & 255;
			this[offset + 3] = value & 255;
		} else {
			this[offset + 3] = (value >>> 24) & 255;
			this[offset + 2] = (value >>> 16) & 255;
			this[offset + 1] = (value >>> 8) & 255;
			this[offset] = value & 255;
		}
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
		this.writeUInt32(value, offset, false, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
		this.writeUInt32(value, offset, true, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 */
	Buffer.prototype.writeInt32 = function (value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			verifyInt(value, 2147483647, -2147483648);
		}

		this.writeUInt32(value < 0 ? 4294967295 + value + 1 : value, offset, isBigEndian, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
		this.writeInt32(value, offset, false, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
		this.writeInt32(value, offset, true, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 */
	Buffer.prototype.writeFloat = function (value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (value === undefined || value === null) {
				throw 'missing value';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 3 >= this.length) {
				throw 'trying to write beyond this length';
			}

			verifyIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
		}

		writeIEEE754(this, value, offset, isBigEndian, 23, 4);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
		this.writeFloat(value, offset, false, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
		this.writeFloat(value, offset, true, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param isBigEndian
	 * @param noAssert
	 */
	Buffer.prototype.writeDouble = function (value, offset, isBigEndian, noAssert) {
		if (!noAssert) {
			if (offset === undefined || offset === null) {
				throw 'missing offset';
			}

			if (value === undefined || value === null) {
				throw 'missing value';
			}

			if (typeof (isBigEndian) !== 'boolean') {
				throw 'missing or invalid endian';
			}

			if (offset + 7 >= this.length) {
				throw 'trying to write beyond this length';
			}

			verifyIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
		}

		writeIEEE754(this, value, offset, isBigEndian, 52, 8);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
		this.writeDouble(value, offset, false, noAssert);
	};

	/**
	 * @param value
	 * @param offset
	 * @param noAssert
	 */
	Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
		this.writeDouble(value, offset, true, noAssert);
	};

	window.Buffer = Buffer;
}(window));