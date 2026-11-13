(function(scope){
'use strict';

function F(arity, fun, wrapper) {
  wrapper.a = arity;
  wrapper.f = fun;
  return wrapper;
}

function F2(fun) {
  return F(2, fun, function(a) { return function(b) { return fun(a,b); }; })
}
function F3(fun) {
  return F(3, fun, function(a) {
    return function(b) { return function(c) { return fun(a, b, c); }; };
  });
}
function F4(fun) {
  return F(4, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return fun(a, b, c, d); }; }; };
  });
}
function F5(fun) {
  return F(5, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return fun(a, b, c, d, e); }; }; }; };
  });
}
function F6(fun) {
  return F(6, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return fun(a, b, c, d, e, f); }; }; }; }; };
  });
}
function F7(fun) {
  return F(7, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return function(g) { return fun(a, b, c, d, e, f, g); }; }; }; }; }; };
  });
}
function F8(fun) {
  return F(8, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return function(g) { return function(h) {
    return fun(a, b, c, d, e, f, g, h); }; }; }; }; }; }; };
  });
}
function F9(fun) {
  return F(9, fun, function(a) { return function(b) { return function(c) {
    return function(d) { return function(e) { return function(f) {
    return function(g) { return function(h) { return function(i) {
    return fun(a, b, c, d, e, f, g, h, i); }; }; }; }; }; }; }; };
  });
}

function A2(fun, a, b) {
  return fun.a === 2 ? fun.f(a, b) : fun(a)(b);
}
function A3(fun, a, b, c) {
  return fun.a === 3 ? fun.f(a, b, c) : fun(a)(b)(c);
}
function A4(fun, a, b, c, d) {
  return fun.a === 4 ? fun.f(a, b, c, d) : fun(a)(b)(c)(d);
}
function A5(fun, a, b, c, d, e) {
  return fun.a === 5 ? fun.f(a, b, c, d, e) : fun(a)(b)(c)(d)(e);
}
function A6(fun, a, b, c, d, e, f) {
  return fun.a === 6 ? fun.f(a, b, c, d, e, f) : fun(a)(b)(c)(d)(e)(f);
}
function A7(fun, a, b, c, d, e, f, g) {
  return fun.a === 7 ? fun.f(a, b, c, d, e, f, g) : fun(a)(b)(c)(d)(e)(f)(g);
}
function A8(fun, a, b, c, d, e, f, g, h) {
  return fun.a === 8 ? fun.f(a, b, c, d, e, f, g, h) : fun(a)(b)(c)(d)(e)(f)(g)(h);
}
function A9(fun, a, b, c, d, e, f, g, h, i) {
  return fun.a === 9 ? fun.f(a, b, c, d, e, f, g, h, i) : fun(a)(b)(c)(d)(e)(f)(g)(h)(i);
}




// EQUALITY

function _Utils_eq(x, y)
{
	for (
		var pair, stack = [], isEqual = _Utils_eqHelp(x, y, 0, stack);
		isEqual && (pair = stack.pop());
		isEqual = _Utils_eqHelp(pair.a, pair.b, 0, stack)
		)
	{}

	return isEqual;
}

function _Utils_eqHelp(x, y, depth, stack)
{
	if (x === y)
	{
		return true;
	}

	if (typeof x !== 'object' || x === null || y === null)
	{
		typeof x === 'function' && _Debug_crash(5);
		return false;
	}

	if (depth > 100)
	{
		stack.push(_Utils_Tuple2(x,y));
		return true;
	}

	/**_UNUSED/
	if (x.$ === 'Set_elm_builtin')
	{
		x = $elm$core$Set$toList(x);
		y = $elm$core$Set$toList(y);
	}
	if (x.$ === 'RBNode_elm_builtin' || x.$ === 'RBEmpty_elm_builtin')
	{
		x = $elm$core$Dict$toList(x);
		y = $elm$core$Dict$toList(y);
	}
	//*/

	/**/
	if (x.$ < 0)
	{
		x = $elm$core$Dict$toList(x);
		y = $elm$core$Dict$toList(y);
	}
	//*/

	for (var key in x)
	{
		if (!_Utils_eqHelp(x[key], y[key], depth + 1, stack))
		{
			return false;
		}
	}
	return true;
}

var _Utils_equal = F2(_Utils_eq);
var _Utils_notEqual = F2(function(a, b) { return !_Utils_eq(a,b); });



// COMPARISONS

// Code in Generate/JavaScript.hs, Basics.js, and List.js depends on
// the particular integer values assigned to LT, EQ, and GT.

function _Utils_cmp(x, y, ord)
{
	if (typeof x !== 'object')
	{
		return x === y ? /*EQ*/ 0 : x < y ? /*LT*/ -1 : /*GT*/ 1;
	}

	/**_UNUSED/
	if (x instanceof String)
	{
		var a = x.valueOf();
		var b = y.valueOf();
		return a === b ? 0 : a < b ? -1 : 1;
	}
	//*/

	/**/
	if (typeof x.$ === 'undefined')
	//*/
	/**_UNUSED/
	if (x.$[0] === '#')
	//*/
	{
		return (ord = _Utils_cmp(x.a, y.a))
			? ord
			: (ord = _Utils_cmp(x.b, y.b))
				? ord
				: _Utils_cmp(x.c, y.c);
	}

	// traverse conses until end of a list or a mismatch
	for (; x.b && y.b && !(ord = _Utils_cmp(x.a, y.a)); x = x.b, y = y.b) {} // WHILE_CONSES
	return ord || (x.b ? /*GT*/ 1 : y.b ? /*LT*/ -1 : /*EQ*/ 0);
}

var _Utils_lt = F2(function(a, b) { return _Utils_cmp(a, b) < 0; });
var _Utils_le = F2(function(a, b) { return _Utils_cmp(a, b) < 1; });
var _Utils_gt = F2(function(a, b) { return _Utils_cmp(a, b) > 0; });
var _Utils_ge = F2(function(a, b) { return _Utils_cmp(a, b) >= 0; });

var _Utils_compare = F2(function(x, y)
{
	var n = _Utils_cmp(x, y);
	return n < 0 ? $elm$core$Basics$LT : n ? $elm$core$Basics$GT : $elm$core$Basics$EQ;
});


// COMMON VALUES

var _Utils_Tuple0 = 0;
var _Utils_Tuple0_UNUSED = { $: '#0' };

function _Utils_Tuple2(a, b) { return { a: a, b: b }; }
function _Utils_Tuple2_UNUSED(a, b) { return { $: '#2', a: a, b: b }; }

function _Utils_Tuple3(a, b, c) { return { a: a, b: b, c: c }; }
function _Utils_Tuple3_UNUSED(a, b, c) { return { $: '#3', a: a, b: b, c: c }; }

function _Utils_chr(c) { return c; }
function _Utils_chr_UNUSED(c) { return new String(c); }


// RECORDS

function _Utils_update(oldRecord, updatedFields)
{
	var newRecord = {};

	for (var key in oldRecord)
	{
		newRecord[key] = oldRecord[key];
	}

	for (var key in updatedFields)
	{
		newRecord[key] = updatedFields[key];
	}

	return newRecord;
}


// APPEND

var _Utils_append = F2(_Utils_ap);

function _Utils_ap(xs, ys)
{
	// append Strings
	if (typeof xs === 'string')
	{
		return xs + ys;
	}

	// append Lists
	if (!xs.b)
	{
		return ys;
	}
	var root = _List_Cons(xs.a, ys);
	xs = xs.b
	for (var curr = root; xs.b; xs = xs.b) // WHILE_CONS
	{
		curr = curr.b = _List_Cons(xs.a, ys);
	}
	return root;
}



var _List_Nil = { $: 0 };
var _List_Nil_UNUSED = { $: '[]' };

function _List_Cons(hd, tl) { return { $: 1, a: hd, b: tl }; }
function _List_Cons_UNUSED(hd, tl) { return { $: '::', a: hd, b: tl }; }


var _List_cons = F2(_List_Cons);

function _List_fromArray(arr)
{
	var out = _List_Nil;
	for (var i = arr.length; i--; )
	{
		out = _List_Cons(arr[i], out);
	}
	return out;
}

function _List_toArray(xs)
{
	for (var out = []; xs.b; xs = xs.b) // WHILE_CONS
	{
		out.push(xs.a);
	}
	return out;
}

var _List_map2 = F3(function(f, xs, ys)
{
	for (var arr = []; xs.b && ys.b; xs = xs.b, ys = ys.b) // WHILE_CONSES
	{
		arr.push(A2(f, xs.a, ys.a));
	}
	return _List_fromArray(arr);
});

var _List_map3 = F4(function(f, xs, ys, zs)
{
	for (var arr = []; xs.b && ys.b && zs.b; xs = xs.b, ys = ys.b, zs = zs.b) // WHILE_CONSES
	{
		arr.push(A3(f, xs.a, ys.a, zs.a));
	}
	return _List_fromArray(arr);
});

var _List_map4 = F5(function(f, ws, xs, ys, zs)
{
	for (var arr = []; ws.b && xs.b && ys.b && zs.b; ws = ws.b, xs = xs.b, ys = ys.b, zs = zs.b) // WHILE_CONSES
	{
		arr.push(A4(f, ws.a, xs.a, ys.a, zs.a));
	}
	return _List_fromArray(arr);
});

var _List_map5 = F6(function(f, vs, ws, xs, ys, zs)
{
	for (var arr = []; vs.b && ws.b && xs.b && ys.b && zs.b; vs = vs.b, ws = ws.b, xs = xs.b, ys = ys.b, zs = zs.b) // WHILE_CONSES
	{
		arr.push(A5(f, vs.a, ws.a, xs.a, ys.a, zs.a));
	}
	return _List_fromArray(arr);
});

var _List_sortBy = F2(function(f, xs)
{
	return _List_fromArray(_List_toArray(xs).sort(function(a, b) {
		return _Utils_cmp(f(a), f(b));
	}));
});

var _List_sortWith = F2(function(f, xs)
{
	return _List_fromArray(_List_toArray(xs).sort(function(a, b) {
		var ord = A2(f, a, b);
		return ord === $elm$core$Basics$EQ ? 0 : ord === $elm$core$Basics$LT ? -1 : 1;
	}));
});



var _JsArray_empty = [];

function _JsArray_singleton(value)
{
    return [value];
}

function _JsArray_length(array)
{
    return array.length;
}

var _JsArray_initialize = F3(function(size, offset, func)
{
    var result = new Array(size);

    for (var i = 0; i < size; i++)
    {
        result[i] = func(offset + i);
    }

    return result;
});

var _JsArray_initializeFromList = F2(function (max, ls)
{
    var result = new Array(max);

    for (var i = 0; i < max && ls.b; i++)
    {
        result[i] = ls.a;
        ls = ls.b;
    }

    result.length = i;
    return _Utils_Tuple2(result, ls);
});

var _JsArray_unsafeGet = F2(function(index, array)
{
    return array[index];
});

var _JsArray_unsafeSet = F3(function(index, value, array)
{
    var length = array.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++)
    {
        result[i] = array[i];
    }

    result[index] = value;
    return result;
});

var _JsArray_push = F2(function(value, array)
{
    var length = array.length;
    var result = new Array(length + 1);

    for (var i = 0; i < length; i++)
    {
        result[i] = array[i];
    }

    result[length] = value;
    return result;
});

var _JsArray_foldl = F3(function(func, acc, array)
{
    var length = array.length;

    for (var i = 0; i < length; i++)
    {
        acc = A2(func, array[i], acc);
    }

    return acc;
});

var _JsArray_foldr = F3(function(func, acc, array)
{
    for (var i = array.length - 1; i >= 0; i--)
    {
        acc = A2(func, array[i], acc);
    }

    return acc;
});

var _JsArray_map = F2(function(func, array)
{
    var length = array.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++)
    {
        result[i] = func(array[i]);
    }

    return result;
});

var _JsArray_indexedMap = F3(function(func, offset, array)
{
    var length = array.length;
    var result = new Array(length);

    for (var i = 0; i < length; i++)
    {
        result[i] = A2(func, offset + i, array[i]);
    }

    return result;
});

var _JsArray_slice = F3(function(from, to, array)
{
    return array.slice(from, to);
});

var _JsArray_appendN = F3(function(n, dest, source)
{
    var destLen = dest.length;
    var itemsToCopy = n - destLen;

    if (itemsToCopy > source.length)
    {
        itemsToCopy = source.length;
    }

    var size = destLen + itemsToCopy;
    var result = new Array(size);

    for (var i = 0; i < destLen; i++)
    {
        result[i] = dest[i];
    }

    for (var i = 0; i < itemsToCopy; i++)
    {
        result[i + destLen] = source[i];
    }

    return result;
});



// LOG

var _Debug_log = F2(function(tag, value)
{
	return value;
});

var _Debug_log_UNUSED = F2(function(tag, value)
{
	console.log(tag + ': ' + _Debug_toString(value));
	return value;
});


// TODOS

function _Debug_todo(moduleName, region)
{
	return function(message) {
		_Debug_crash(8, moduleName, region, message);
	};
}

function _Debug_todoCase(moduleName, region, value)
{
	return function(message) {
		_Debug_crash(9, moduleName, region, value, message);
	};
}


// TO STRING

function _Debug_toString(value)
{
	return '<internals>';
}

function _Debug_toString_UNUSED(value)
{
	return _Debug_toAnsiString(false, value);
}

function _Debug_toAnsiString(ansi, value)
{
	if (typeof value === 'function')
	{
		return _Debug_internalColor(ansi, '<function>');
	}

	if (typeof value === 'boolean')
	{
		return _Debug_ctorColor(ansi, value ? 'True' : 'False');
	}

	if (typeof value === 'number')
	{
		return _Debug_numberColor(ansi, value + '');
	}

	if (value instanceof String)
	{
		return _Debug_charColor(ansi, "'" + _Debug_addSlashes(value, true) + "'");
	}

	if (typeof value === 'string')
	{
		return _Debug_stringColor(ansi, '"' + _Debug_addSlashes(value, false) + '"');
	}

	if (typeof value === 'object' && '$' in value)
	{
		var tag = value.$;

		if (typeof tag === 'number')
		{
			return _Debug_internalColor(ansi, '<internals>');
		}

		if (tag[0] === '#')
		{
			var output = [];
			for (var k in value)
			{
				if (k === '$') continue;
				output.push(_Debug_toAnsiString(ansi, value[k]));
			}
			return '(' + output.join(',') + ')';
		}

		if (tag === 'Set_elm_builtin')
		{
			return _Debug_ctorColor(ansi, 'Set')
				+ _Debug_fadeColor(ansi, '.fromList') + ' '
				+ _Debug_toAnsiString(ansi, $elm$core$Set$toList(value));
		}

		if (tag === 'RBNode_elm_builtin' || tag === 'RBEmpty_elm_builtin')
		{
			return _Debug_ctorColor(ansi, 'Dict')
				+ _Debug_fadeColor(ansi, '.fromList') + ' '
				+ _Debug_toAnsiString(ansi, $elm$core$Dict$toList(value));
		}

		if (tag === 'Array_elm_builtin')
		{
			return _Debug_ctorColor(ansi, 'Array')
				+ _Debug_fadeColor(ansi, '.fromList') + ' '
				+ _Debug_toAnsiString(ansi, $elm$core$Array$toList(value));
		}

		if (tag === '::' || tag === '[]')
		{
			var output = '[';

			value.b && (output += _Debug_toAnsiString(ansi, value.a), value = value.b)

			for (; value.b; value = value.b) // WHILE_CONS
			{
				output += ',' + _Debug_toAnsiString(ansi, value.a);
			}
			return output + ']';
		}

		var output = '';
		for (var i in value)
		{
			if (i === '$') continue;
			var str = _Debug_toAnsiString(ansi, value[i]);
			var c0 = str[0];
			var parenless = c0 === '{' || c0 === '(' || c0 === '[' || c0 === '<' || c0 === '"' || str.indexOf(' ') < 0;
			output += ' ' + (parenless ? str : '(' + str + ')');
		}
		return _Debug_ctorColor(ansi, tag) + output;
	}

	if (typeof DataView === 'function' && value instanceof DataView)
	{
		return _Debug_stringColor(ansi, '<' + value.byteLength + ' bytes>');
	}

	if (typeof File !== 'undefined' && value instanceof File)
	{
		return _Debug_internalColor(ansi, '<' + value.name + '>');
	}

	if (typeof value === 'object')
	{
		var output = [];
		for (var key in value)
		{
			var field = key[0] === '_' ? key.slice(1) : key;
			output.push(_Debug_fadeColor(ansi, field) + ' = ' + _Debug_toAnsiString(ansi, value[key]));
		}
		if (output.length === 0)
		{
			return '{}';
		}
		return '{ ' + output.join(', ') + ' }';
	}

	return _Debug_internalColor(ansi, '<internals>');
}

function _Debug_addSlashes(str, isChar)
{
	var s = str
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t')
		.replace(/\r/g, '\\r')
		.replace(/\v/g, '\\v')
		.replace(/\0/g, '\\0');

	if (isChar)
	{
		return s.replace(/\'/g, '\\\'');
	}
	else
	{
		return s.replace(/\"/g, '\\"');
	}
}

function _Debug_ctorColor(ansi, string)
{
	return ansi ? '\x1b[96m' + string + '\x1b[0m' : string;
}

function _Debug_numberColor(ansi, string)
{
	return ansi ? '\x1b[95m' + string + '\x1b[0m' : string;
}

function _Debug_stringColor(ansi, string)
{
	return ansi ? '\x1b[93m' + string + '\x1b[0m' : string;
}

function _Debug_charColor(ansi, string)
{
	return ansi ? '\x1b[92m' + string + '\x1b[0m' : string;
}

function _Debug_fadeColor(ansi, string)
{
	return ansi ? '\x1b[37m' + string + '\x1b[0m' : string;
}

function _Debug_internalColor(ansi, string)
{
	return ansi ? '\x1b[36m' + string + '\x1b[0m' : string;
}

function _Debug_toHexDigit(n)
{
	return String.fromCharCode(n < 10 ? 48 + n : 55 + n);
}


// CRASH


function _Debug_crash(identifier)
{
	throw new Error('https://github.com/elm/core/blob/1.0.0/hints/' + identifier + '.md');
}


function _Debug_crash_UNUSED(identifier, fact1, fact2, fact3, fact4)
{
	switch(identifier)
	{
		case 0:
			throw new Error('What node should I take over? In JavaScript I need something like:\n\n    Elm.Main.init({\n        node: document.getElementById("elm-node")\n    })\n\nYou need to do this with any Browser.sandbox or Browser.element program.');

		case 1:
			throw new Error('Browser.application programs cannot handle URLs like this:\n\n    ' + document.location.href + '\n\nWhat is the root? The root of your file system? Try looking at this program with `elm reactor` or some other server.');

		case 2:
			var jsonErrorString = fact1;
			throw new Error('Problem with the flags given to your Elm program on initialization.\n\n' + jsonErrorString);

		case 3:
			var portName = fact1;
			throw new Error('There can only be one port named `' + portName + '`, but your program has multiple.');

		case 4:
			var portName = fact1;
			var problem = fact2;
			throw new Error('Trying to send an unexpected type of value through port `' + portName + '`:\n' + problem);

		case 5:
			throw new Error('Trying to use `(==)` on functions.\nThere is no way to know if functions are "the same" in the Elm sense.\nRead more about this at https://package.elm-lang.org/packages/elm/core/latest/Basics#== which describes why it is this way and what the better version will look like.');

		case 6:
			var moduleName = fact1;
			throw new Error('Your page is loading multiple Elm scripts with a module named ' + moduleName + '. Maybe a duplicate script is getting loaded accidentally? If not, rename one of them so I know which is which!');

		case 8:
			var moduleName = fact1;
			var region = fact2;
			var message = fact3;
			throw new Error('TODO in module `' + moduleName + '` ' + _Debug_regionToString(region) + '\n\n' + message);

		case 9:
			var moduleName = fact1;
			var region = fact2;
			var value = fact3;
			var message = fact4;
			throw new Error(
				'TODO in module `' + moduleName + '` from the `case` expression '
				+ _Debug_regionToString(region) + '\n\nIt received the following value:\n\n    '
				+ _Debug_toString(value).replace('\n', '\n    ')
				+ '\n\nBut the branch that handles it says:\n\n    ' + message.replace('\n', '\n    ')
			);

		case 10:
			throw new Error('Bug in https://github.com/elm/virtual-dom/issues');

		case 11:
			throw new Error('Cannot perform mod 0. Division by zero error.');
	}
}

function _Debug_regionToString(region)
{
	if (region.aX.at === region.ba.at)
	{
		return 'on line ' + region.aX.at;
	}
	return 'on lines ' + region.aX.at + ' through ' + region.ba.at;
}



// MATH

var _Basics_add = F2(function(a, b) { return a + b; });
var _Basics_sub = F2(function(a, b) { return a - b; });
var _Basics_mul = F2(function(a, b) { return a * b; });
var _Basics_fdiv = F2(function(a, b) { return a / b; });
var _Basics_idiv = F2(function(a, b) { return (a / b) | 0; });
var _Basics_pow = F2(Math.pow);

var _Basics_remainderBy = F2(function(b, a) { return a % b; });

// https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/divmodnote-letter.pdf
var _Basics_modBy = F2(function(modulus, x)
{
	var answer = x % modulus;
	return modulus === 0
		? _Debug_crash(11)
		:
	((answer > 0 && modulus < 0) || (answer < 0 && modulus > 0))
		? answer + modulus
		: answer;
});


// TRIGONOMETRY

var _Basics_pi = Math.PI;
var _Basics_e = Math.E;
var _Basics_cos = Math.cos;
var _Basics_sin = Math.sin;
var _Basics_tan = Math.tan;
var _Basics_acos = Math.acos;
var _Basics_asin = Math.asin;
var _Basics_atan = Math.atan;
var _Basics_atan2 = F2(Math.atan2);


// MORE MATH

function _Basics_toFloat(x) { return x; }
function _Basics_truncate(n) { return n | 0; }
function _Basics_isInfinite(n) { return n === Infinity || n === -Infinity; }

var _Basics_ceiling = Math.ceil;
var _Basics_floor = Math.floor;
var _Basics_round = Math.round;
var _Basics_sqrt = Math.sqrt;
var _Basics_log = Math.log;
var _Basics_isNaN = isNaN;


// BOOLEANS

function _Basics_not(bool) { return !bool; }
var _Basics_and = F2(function(a, b) { return a && b; });
var _Basics_or  = F2(function(a, b) { return a || b; });
var _Basics_xor = F2(function(a, b) { return a !== b; });



var _String_cons = F2(function(chr, str)
{
	return chr + str;
});

function _String_uncons(string)
{
	var word = string.charCodeAt(0);
	return !isNaN(word)
		? $elm$core$Maybe$Just(
			0xD800 <= word && word <= 0xDBFF
				? _Utils_Tuple2(_Utils_chr(string[0] + string[1]), string.slice(2))
				: _Utils_Tuple2(_Utils_chr(string[0]), string.slice(1))
		)
		: $elm$core$Maybe$Nothing;
}

var _String_append = F2(function(a, b)
{
	return a + b;
});

function _String_length(str)
{
	return str.length;
}

var _String_map = F2(function(func, string)
{
	var len = string.length;
	var array = new Array(len);
	var i = 0;
	while (i < len)
	{
		var word = string.charCodeAt(i);
		if (0xD800 <= word && word <= 0xDBFF)
		{
			array[i] = func(_Utils_chr(string[i] + string[i+1]));
			i += 2;
			continue;
		}
		array[i] = func(_Utils_chr(string[i]));
		i++;
	}
	return array.join('');
});

var _String_filter = F2(function(isGood, str)
{
	var arr = [];
	var len = str.length;
	var i = 0;
	while (i < len)
	{
		var char = str[i];
		var word = str.charCodeAt(i);
		i++;
		if (0xD800 <= word && word <= 0xDBFF)
		{
			char += str[i];
			i++;
		}

		if (isGood(_Utils_chr(char)))
		{
			arr.push(char);
		}
	}
	return arr.join('');
});

function _String_reverse(str)
{
	var len = str.length;
	var arr = new Array(len);
	var i = 0;
	while (i < len)
	{
		var word = str.charCodeAt(i);
		if (0xD800 <= word && word <= 0xDBFF)
		{
			arr[len - i] = str[i + 1];
			i++;
			arr[len - i] = str[i - 1];
			i++;
		}
		else
		{
			arr[len - i] = str[i];
			i++;
		}
	}
	return arr.join('');
}

var _String_foldl = F3(function(func, state, string)
{
	var len = string.length;
	var i = 0;
	while (i < len)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		i++;
		if (0xD800 <= word && word <= 0xDBFF)
		{
			char += string[i];
			i++;
		}
		state = A2(func, _Utils_chr(char), state);
	}
	return state;
});

var _String_foldr = F3(function(func, state, string)
{
	var i = string.length;
	while (i--)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		if (0xDC00 <= word && word <= 0xDFFF)
		{
			i--;
			char = string[i] + char;
		}
		state = A2(func, _Utils_chr(char), state);
	}
	return state;
});

var _String_split = F2(function(sep, str)
{
	return str.split(sep);
});

var _String_join = F2(function(sep, strs)
{
	return strs.join(sep);
});

var _String_slice = F3(function(start, end, str) {
	return str.slice(start, end);
});

function _String_trim(str)
{
	return str.trim();
}

function _String_trimLeft(str)
{
	return str.replace(/^\s+/, '');
}

function _String_trimRight(str)
{
	return str.replace(/\s+$/, '');
}

function _String_words(str)
{
	return _List_fromArray(str.trim().split(/\s+/g));
}

function _String_lines(str)
{
	return _List_fromArray(str.split(/\r\n|\r|\n/g));
}

function _String_toUpper(str)
{
	return str.toUpperCase();
}

function _String_toLower(str)
{
	return str.toLowerCase();
}

var _String_any = F2(function(isGood, string)
{
	var i = string.length;
	while (i--)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		if (0xDC00 <= word && word <= 0xDFFF)
		{
			i--;
			char = string[i] + char;
		}
		if (isGood(_Utils_chr(char)))
		{
			return true;
		}
	}
	return false;
});

var _String_all = F2(function(isGood, string)
{
	var i = string.length;
	while (i--)
	{
		var char = string[i];
		var word = string.charCodeAt(i);
		if (0xDC00 <= word && word <= 0xDFFF)
		{
			i--;
			char = string[i] + char;
		}
		if (!isGood(_Utils_chr(char)))
		{
			return false;
		}
	}
	return true;
});

var _String_contains = F2(function(sub, str)
{
	return str.indexOf(sub) > -1;
});

var _String_startsWith = F2(function(sub, str)
{
	return str.indexOf(sub) === 0;
});

var _String_endsWith = F2(function(sub, str)
{
	return str.length >= sub.length &&
		str.lastIndexOf(sub) === str.length - sub.length;
});

var _String_indexes = F2(function(sub, str)
{
	var subLen = sub.length;

	if (subLen < 1)
	{
		return _List_Nil;
	}

	var i = 0;
	var is = [];

	while ((i = str.indexOf(sub, i)) > -1)
	{
		is.push(i);
		i = i + subLen;
	}

	return _List_fromArray(is);
});


// TO STRING

function _String_fromNumber(number)
{
	return number + '';
}


// INT CONVERSIONS

function _String_toInt(str)
{
	var total = 0;
	var code0 = str.charCodeAt(0);
	var start = code0 == 0x2B /* + */ || code0 == 0x2D /* - */ ? 1 : 0;

	for (var i = start; i < str.length; ++i)
	{
		var code = str.charCodeAt(i);
		if (code < 0x30 || 0x39 < code)
		{
			return $elm$core$Maybe$Nothing;
		}
		total = 10 * total + code - 0x30;
	}

	return i == start
		? $elm$core$Maybe$Nothing
		: $elm$core$Maybe$Just(code0 == 0x2D ? -total : total);
}


// FLOAT CONVERSIONS

function _String_toFloat(s)
{
	// check if it is a hex, octal, or binary number
	if (s.length === 0 || /[\sxbo]/.test(s))
	{
		return $elm$core$Maybe$Nothing;
	}
	var n = +s;
	// faster isNaN check
	return n === n ? $elm$core$Maybe$Just(n) : $elm$core$Maybe$Nothing;
}

function _String_fromList(chars)
{
	return _List_toArray(chars).join('');
}




function _Char_toCode(char)
{
	var code = char.charCodeAt(0);
	if (0xD800 <= code && code <= 0xDBFF)
	{
		return (code - 0xD800) * 0x400 + char.charCodeAt(1) - 0xDC00 + 0x10000
	}
	return code;
}

function _Char_fromCode(code)
{
	return _Utils_chr(
		(code < 0 || 0x10FFFF < code)
			? '\uFFFD'
			:
		(code <= 0xFFFF)
			? String.fromCharCode(code)
			:
		(code -= 0x10000,
			String.fromCharCode(Math.floor(code / 0x400) + 0xD800, code % 0x400 + 0xDC00)
		)
	);
}

function _Char_toUpper(char)
{
	return _Utils_chr(char.toUpperCase());
}

function _Char_toLower(char)
{
	return _Utils_chr(char.toLowerCase());
}

function _Char_toLocaleUpper(char)
{
	return _Utils_chr(char.toLocaleUpperCase());
}

function _Char_toLocaleLower(char)
{
	return _Utils_chr(char.toLocaleLowerCase());
}



/**_UNUSED/
function _Json_errorToString(error)
{
	return $elm$json$Json$Decode$errorToString(error);
}
//*/


// CORE DECODERS

function _Json_succeed(msg)
{
	return {
		$: 0,
		a: msg
	};
}

function _Json_fail(msg)
{
	return {
		$: 1,
		a: msg
	};
}

function _Json_decodePrim(decoder)
{
	return { $: 2, b: decoder };
}

var _Json_decodeInt = _Json_decodePrim(function(value) {
	return (typeof value !== 'number')
		? _Json_expecting('an INT', value)
		:
	(-2147483647 < value && value < 2147483647 && (value | 0) === value)
		? $elm$core$Result$Ok(value)
		:
	(isFinite(value) && !(value % 1))
		? $elm$core$Result$Ok(value)
		: _Json_expecting('an INT', value);
});

var _Json_decodeBool = _Json_decodePrim(function(value) {
	return (typeof value === 'boolean')
		? $elm$core$Result$Ok(value)
		: _Json_expecting('a BOOL', value);
});

var _Json_decodeFloat = _Json_decodePrim(function(value) {
	return (typeof value === 'number')
		? $elm$core$Result$Ok(value)
		: _Json_expecting('a FLOAT', value);
});

var _Json_decodeValue = _Json_decodePrim(function(value) {
	return $elm$core$Result$Ok(_Json_wrap(value));
});

var _Json_decodeString = _Json_decodePrim(function(value) {
	return (typeof value === 'string')
		? $elm$core$Result$Ok(value)
		: (value instanceof String)
			? $elm$core$Result$Ok(value + '')
			: _Json_expecting('a STRING', value);
});

function _Json_decodeList(decoder) { return { $: 3, b: decoder }; }
function _Json_decodeArray(decoder) { return { $: 4, b: decoder }; }

function _Json_decodeNull(value) { return { $: 5, c: value }; }

var _Json_decodeField = F2(function(field, decoder)
{
	return {
		$: 6,
		d: field,
		b: decoder
	};
});

var _Json_decodeIndex = F2(function(index, decoder)
{
	return {
		$: 7,
		e: index,
		b: decoder
	};
});

function _Json_decodeKeyValuePairs(decoder)
{
	return {
		$: 8,
		b: decoder
	};
}

function _Json_mapMany(f, decoders)
{
	return {
		$: 9,
		f: f,
		g: decoders
	};
}

var _Json_andThen = F2(function(callback, decoder)
{
	return {
		$: 10,
		b: decoder,
		h: callback
	};
});

function _Json_oneOf(decoders)
{
	return {
		$: 11,
		g: decoders
	};
}


// DECODING OBJECTS

var _Json_map1 = F2(function(f, d1)
{
	return _Json_mapMany(f, [d1]);
});

var _Json_map2 = F3(function(f, d1, d2)
{
	return _Json_mapMany(f, [d1, d2]);
});

var _Json_map3 = F4(function(f, d1, d2, d3)
{
	return _Json_mapMany(f, [d1, d2, d3]);
});

var _Json_map4 = F5(function(f, d1, d2, d3, d4)
{
	return _Json_mapMany(f, [d1, d2, d3, d4]);
});

var _Json_map5 = F6(function(f, d1, d2, d3, d4, d5)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5]);
});

var _Json_map6 = F7(function(f, d1, d2, d3, d4, d5, d6)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5, d6]);
});

var _Json_map7 = F8(function(f, d1, d2, d3, d4, d5, d6, d7)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5, d6, d7]);
});

var _Json_map8 = F9(function(f, d1, d2, d3, d4, d5, d6, d7, d8)
{
	return _Json_mapMany(f, [d1, d2, d3, d4, d5, d6, d7, d8]);
});


// DECODE

var _Json_runOnString = F2(function(decoder, string)
{
	try
	{
		var value = JSON.parse(string);
		return _Json_runHelp(decoder, value);
	}
	catch (e)
	{
		return $elm$core$Result$Err(A2($elm$json$Json$Decode$Failure, 'This is not valid JSON! ' + e.message, _Json_wrap(string)));
	}
});

var _Json_run = F2(function(decoder, value)
{
	return _Json_runHelp(decoder, _Json_unwrap(value));
});

function _Json_runHelp(decoder, value)
{
	switch (decoder.$)
	{
		case 2:
			return decoder.b(value);

		case 5:
			return (value === null)
				? $elm$core$Result$Ok(decoder.c)
				: _Json_expecting('null', value);

		case 3:
			if (!_Json_isArray(value))
			{
				return _Json_expecting('a LIST', value);
			}
			return _Json_runArrayDecoder(decoder.b, value, _List_fromArray);

		case 4:
			if (!_Json_isArray(value))
			{
				return _Json_expecting('an ARRAY', value);
			}
			return _Json_runArrayDecoder(decoder.b, value, _Json_toElmArray);

		case 6:
			var field = decoder.d;
			if (typeof value !== 'object' || value === null || !(field in value))
			{
				return _Json_expecting('an OBJECT with a field named `' + field + '`', value);
			}
			var result = _Json_runHelp(decoder.b, value[field]);
			return ($elm$core$Result$isOk(result)) ? result : $elm$core$Result$Err(A2($elm$json$Json$Decode$Field, field, result.a));

		case 7:
			var index = decoder.e;
			if (!_Json_isArray(value))
			{
				return _Json_expecting('an ARRAY', value);
			}
			if (index >= value.length)
			{
				return _Json_expecting('a LONGER array. Need index ' + index + ' but only see ' + value.length + ' entries', value);
			}
			var result = _Json_runHelp(decoder.b, value[index]);
			return ($elm$core$Result$isOk(result)) ? result : $elm$core$Result$Err(A2($elm$json$Json$Decode$Index, index, result.a));

		case 8:
			if (typeof value !== 'object' || value === null || _Json_isArray(value))
			{
				return _Json_expecting('an OBJECT', value);
			}

			var keyValuePairs = _List_Nil;
			// TODO test perf of Object.keys and switch when support is good enough
			for (var key in value)
			{
				if (value.hasOwnProperty(key))
				{
					var result = _Json_runHelp(decoder.b, value[key]);
					if (!$elm$core$Result$isOk(result))
					{
						return $elm$core$Result$Err(A2($elm$json$Json$Decode$Field, key, result.a));
					}
					keyValuePairs = _List_Cons(_Utils_Tuple2(key, result.a), keyValuePairs);
				}
			}
			return $elm$core$Result$Ok($elm$core$List$reverse(keyValuePairs));

		case 9:
			var answer = decoder.f;
			var decoders = decoder.g;
			for (var i = 0; i < decoders.length; i++)
			{
				var result = _Json_runHelp(decoders[i], value);
				if (!$elm$core$Result$isOk(result))
				{
					return result;
				}
				answer = answer(result.a);
			}
			return $elm$core$Result$Ok(answer);

		case 10:
			var result = _Json_runHelp(decoder.b, value);
			return (!$elm$core$Result$isOk(result))
				? result
				: _Json_runHelp(decoder.h(result.a), value);

		case 11:
			var errors = _List_Nil;
			for (var temp = decoder.g; temp.b; temp = temp.b) // WHILE_CONS
			{
				var result = _Json_runHelp(temp.a, value);
				if ($elm$core$Result$isOk(result))
				{
					return result;
				}
				errors = _List_Cons(result.a, errors);
			}
			return $elm$core$Result$Err($elm$json$Json$Decode$OneOf($elm$core$List$reverse(errors)));

		case 1:
			return $elm$core$Result$Err(A2($elm$json$Json$Decode$Failure, decoder.a, _Json_wrap(value)));

		case 0:
			return $elm$core$Result$Ok(decoder.a);
	}
}

function _Json_runArrayDecoder(decoder, value, toElmValue)
{
	var len = value.length;
	var array = new Array(len);
	for (var i = 0; i < len; i++)
	{
		var result = _Json_runHelp(decoder, value[i]);
		if (!$elm$core$Result$isOk(result))
		{
			return $elm$core$Result$Err(A2($elm$json$Json$Decode$Index, i, result.a));
		}
		array[i] = result.a;
	}
	return $elm$core$Result$Ok(toElmValue(array));
}

function _Json_isArray(value)
{
	return Array.isArray(value) || (typeof FileList !== 'undefined' && value instanceof FileList);
}

function _Json_toElmArray(array)
{
	return A2($elm$core$Array$initialize, array.length, function(i) { return array[i]; });
}

function _Json_expecting(type, value)
{
	return $elm$core$Result$Err(A2($elm$json$Json$Decode$Failure, 'Expecting ' + type, _Json_wrap(value)));
}


// EQUALITY

function _Json_equality(x, y)
{
	if (x === y)
	{
		return true;
	}

	if (x.$ !== y.$)
	{
		return false;
	}

	switch (x.$)
	{
		case 0:
		case 1:
			return x.a === y.a;

		case 2:
			return x.b === y.b;

		case 5:
			return x.c === y.c;

		case 3:
		case 4:
		case 8:
			return _Json_equality(x.b, y.b);

		case 6:
			return x.d === y.d && _Json_equality(x.b, y.b);

		case 7:
			return x.e === y.e && _Json_equality(x.b, y.b);

		case 9:
			return x.f === y.f && _Json_listEquality(x.g, y.g);

		case 10:
			return x.h === y.h && _Json_equality(x.b, y.b);

		case 11:
			return _Json_listEquality(x.g, y.g);
	}
}

function _Json_listEquality(aDecoders, bDecoders)
{
	var len = aDecoders.length;
	if (len !== bDecoders.length)
	{
		return false;
	}
	for (var i = 0; i < len; i++)
	{
		if (!_Json_equality(aDecoders[i], bDecoders[i]))
		{
			return false;
		}
	}
	return true;
}


// ENCODE

var _Json_encode = F2(function(indentLevel, value)
{
	return JSON.stringify(_Json_unwrap(value), null, indentLevel) + '';
});

function _Json_wrap_UNUSED(value) { return { $: 0, a: value }; }
function _Json_unwrap_UNUSED(value) { return value.a; }

function _Json_wrap(value) { return value; }
function _Json_unwrap(value) { return value; }

function _Json_emptyArray() { return []; }
function _Json_emptyObject() { return {}; }

var _Json_addField = F3(function(key, value, object)
{
	object[key] = _Json_unwrap(value);
	return object;
});

function _Json_addEntry(func)
{
	return F2(function(entry, array)
	{
		array.push(_Json_unwrap(func(entry)));
		return array;
	});
}

var _Json_encodeNull = _Json_wrap(null);



// TASKS

function _Scheduler_succeed(value)
{
	return {
		$: 0,
		a: value
	};
}

function _Scheduler_fail(error)
{
	return {
		$: 1,
		a: error
	};
}

function _Scheduler_binding(callback)
{
	return {
		$: 2,
		b: callback,
		c: null
	};
}

var _Scheduler_andThen = F2(function(callback, task)
{
	return {
		$: 3,
		b: callback,
		d: task
	};
});

var _Scheduler_onError = F2(function(callback, task)
{
	return {
		$: 4,
		b: callback,
		d: task
	};
});

function _Scheduler_receive(callback)
{
	return {
		$: 5,
		b: callback
	};
}


// PROCESSES

var _Scheduler_guid = 0;

function _Scheduler_rawSpawn(task)
{
	var proc = {
		$: 0,
		e: _Scheduler_guid++,
		f: task,
		g: null,
		h: []
	};

	_Scheduler_enqueue(proc);

	return proc;
}

function _Scheduler_spawn(task)
{
	return _Scheduler_binding(function(callback) {
		callback(_Scheduler_succeed(_Scheduler_rawSpawn(task)));
	});
}

function _Scheduler_rawSend(proc, msg)
{
	proc.h.push(msg);
	_Scheduler_enqueue(proc);
}

var _Scheduler_send = F2(function(proc, msg)
{
	return _Scheduler_binding(function(callback) {
		_Scheduler_rawSend(proc, msg);
		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
});

function _Scheduler_kill(proc)
{
	return _Scheduler_binding(function(callback) {
		var task = proc.f;
		if (task.$ === 2 && task.c)
		{
			task.c();
		}

		proc.f = null;

		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
}


/* STEP PROCESSES

type alias Process =
  { $ : tag
  , id : unique_id
  , root : Task
  , stack : null | { $: SUCCEED | FAIL, a: callback, b: stack }
  , mailbox : [msg]
  }

*/


var _Scheduler_working = false;
var _Scheduler_queue = [];


function _Scheduler_enqueue(proc)
{
	_Scheduler_queue.push(proc);
	if (_Scheduler_working)
	{
		return;
	}
	_Scheduler_working = true;
	while (proc = _Scheduler_queue.shift())
	{
		_Scheduler_step(proc);
	}
	_Scheduler_working = false;
}


function _Scheduler_step(proc)
{
	while (proc.f)
	{
		var rootTag = proc.f.$;
		if (rootTag === 0 || rootTag === 1)
		{
			while (proc.g && proc.g.$ !== rootTag)
			{
				proc.g = proc.g.i;
			}
			if (!proc.g)
			{
				return;
			}
			proc.f = proc.g.b(proc.f.a);
			proc.g = proc.g.i;
		}
		else if (rootTag === 2)
		{
			proc.f.c = proc.f.b(function(newRoot) {
				proc.f = newRoot;
				_Scheduler_enqueue(proc);
			});
			return;
		}
		else if (rootTag === 5)
		{
			if (proc.h.length === 0)
			{
				return;
			}
			proc.f = proc.f.b(proc.h.shift());
		}
		else // if (rootTag === 3 || rootTag === 4)
		{
			proc.g = {
				$: rootTag === 3 ? 0 : 1,
				b: proc.f.b,
				i: proc.g
			};
			proc.f = proc.f.d;
		}
	}
}



function _Process_sleep(time)
{
	return _Scheduler_binding(function(callback) {
		var id = setTimeout(function() {
			callback(_Scheduler_succeed(_Utils_Tuple0));
		}, time);

		return function() { clearTimeout(id); };
	});
}




// PROGRAMS


var _Platform_worker = F4(function(impl, flagDecoder, debugMetadata, args)
{
	return _Platform_initialize(
		flagDecoder,
		args,
		impl.cz,
		impl.$7,
		impl.dh,
		function() { return function() {} }
	);
});



// INITIALIZE A PROGRAM


function _Platform_initialize(flagDecoder, args, init, update, subscriptions, stepperBuilder)
{
	var result = A2(_Json_run, flagDecoder, _Json_wrap(args ? args['flags'] : undefined));
	$elm$core$Result$isOk(result) || _Debug_crash(2 /**_UNUSED/, _Json_errorToString(result.a) /**/);
	var managers = {};
	var initPair = init(result.a);
	var model = initPair.a;
	var stepper = stepperBuilder(sendToApp, model);
	var ports = _Platform_setupEffects(managers, sendToApp);

	function sendToApp(msg, viewMetadata)
	{
		var pair = A2(update, msg, model);
		stepper(model = pair.a, viewMetadata);
		_Platform_enqueueEffects(managers, pair.b, subscriptions(model));
	}

	_Platform_enqueueEffects(managers, initPair.b, subscriptions(model));

	return ports ? { ports: ports } : {};
}



// TRACK PRELOADS
//
// This is used by code in elm/browser and elm/http
// to register any HTTP requests that are triggered by init.
//


var _Platform_preload;


function _Platform_registerPreload(url)
{
	_Platform_preload.add(url);
}



// EFFECT MANAGERS


var _Platform_effectManagers = {};


function _Platform_setupEffects(managers, sendToApp)
{
	var ports;

	// setup all necessary effect managers
	for (var key in _Platform_effectManagers)
	{
		var manager = _Platform_effectManagers[key];

		if (manager.a)
		{
			ports = ports || {};
			ports[key] = manager.a(key, sendToApp);
		}

		managers[key] = _Platform_instantiateManager(manager, sendToApp);
	}

	return ports;
}


function _Platform_createManager(init, onEffects, onSelfMsg, cmdMap, subMap)
{
	return {
		b: init,
		c: onEffects,
		d: onSelfMsg,
		e: cmdMap,
		f: subMap
	};
}


function _Platform_instantiateManager(info, sendToApp)
{
	var router = {
		g: sendToApp,
		h: undefined
	};

	var onEffects = info.c;
	var onSelfMsg = info.d;
	var cmdMap = info.e;
	var subMap = info.f;

	function loop(state)
	{
		return A2(_Scheduler_andThen, loop, _Scheduler_receive(function(msg)
		{
			var value = msg.a;

			if (msg.$ === 0)
			{
				return A3(onSelfMsg, router, value, state);
			}

			return cmdMap && subMap
				? A4(onEffects, router, value.i, value.j, state)
				: A3(onEffects, router, cmdMap ? value.i : value.j, state);
		}));
	}

	return router.h = _Scheduler_rawSpawn(A2(_Scheduler_andThen, loop, info.b));
}



// ROUTING


var _Platform_sendToApp = F2(function(router, msg)
{
	return _Scheduler_binding(function(callback)
	{
		router.g(msg);
		callback(_Scheduler_succeed(_Utils_Tuple0));
	});
});


var _Platform_sendToSelf = F2(function(router, msg)
{
	return A2(_Scheduler_send, router.h, {
		$: 0,
		a: msg
	});
});



// BAGS


function _Platform_leaf(home)
{
	return function(value)
	{
		return {
			$: 1,
			k: home,
			l: value
		};
	};
}


function _Platform_batch(list)
{
	return {
		$: 2,
		m: list
	};
}


var _Platform_map = F2(function(tagger, bag)
{
	return {
		$: 3,
		n: tagger,
		o: bag
	}
});



// PIPE BAGS INTO EFFECT MANAGERS
//
// Effects must be queued!
//
// Say your init contains a synchronous command, like Time.now or Time.here
//
//   - This will produce a batch of effects (FX_1)
//   - The synchronous task triggers the subsequent `update` call
//   - This will produce a batch of effects (FX_2)
//
// If we just start dispatching FX_2, subscriptions from FX_2 can be processed
// before subscriptions from FX_1. No good! Earlier versions of this code had
// this problem, leading to these reports:
//
//   https://github.com/elm/core/issues/980
//   https://github.com/elm/core/pull/981
//   https://github.com/elm/compiler/issues/1776
//
// The queue is necessary to avoid ordering issues for synchronous commands.


// Why use true/false here? Why not just check the length of the queue?
// The goal is to detect "are we currently dispatching effects?" If we
// are, we need to bail and let the ongoing while loop handle things.
//
// Now say the queue has 1 element. When we dequeue the final element,
// the queue will be empty, but we are still actively dispatching effects.
// So you could get queue jumping in a really tricky category of cases.
//
var _Platform_effectsQueue = [];
var _Platform_effectsActive = false;


function _Platform_enqueueEffects(managers, cmdBag, subBag)
{
	_Platform_effectsQueue.push({ p: managers, q: cmdBag, r: subBag });

	if (_Platform_effectsActive) return;

	_Platform_effectsActive = true;
	for (var fx; fx = _Platform_effectsQueue.shift(); )
	{
		_Platform_dispatchEffects(fx.p, fx.q, fx.r);
	}
	_Platform_effectsActive = false;
}


function _Platform_dispatchEffects(managers, cmdBag, subBag)
{
	var effectsDict = {};
	_Platform_gatherEffects(true, cmdBag, effectsDict, null);
	_Platform_gatherEffects(false, subBag, effectsDict, null);

	for (var home in managers)
	{
		_Scheduler_rawSend(managers[home], {
			$: 'fx',
			a: effectsDict[home] || { i: _List_Nil, j: _List_Nil }
		});
	}
}


function _Platform_gatherEffects(isCmd, bag, effectsDict, taggers)
{
	switch (bag.$)
	{
		case 1:
			var home = bag.k;
			var effect = _Platform_toEffect(isCmd, home, taggers, bag.l);
			effectsDict[home] = _Platform_insert(isCmd, effect, effectsDict[home]);
			return;

		case 2:
			for (var list = bag.m; list.b; list = list.b) // WHILE_CONS
			{
				_Platform_gatherEffects(isCmd, list.a, effectsDict, taggers);
			}
			return;

		case 3:
			_Platform_gatherEffects(isCmd, bag.o, effectsDict, {
				s: bag.n,
				t: taggers
			});
			return;
	}
}


function _Platform_toEffect(isCmd, home, taggers, value)
{
	function applyTaggers(x)
	{
		for (var temp = taggers; temp; temp = temp.t)
		{
			x = temp.s(x);
		}
		return x;
	}

	var map = isCmd
		? _Platform_effectManagers[home].e
		: _Platform_effectManagers[home].f;

	return A2(map, applyTaggers, value)
}


function _Platform_insert(isCmd, newEffect, effects)
{
	effects = effects || { i: _List_Nil, j: _List_Nil };

	isCmd
		? (effects.i = _List_Cons(newEffect, effects.i))
		: (effects.j = _List_Cons(newEffect, effects.j));

	return effects;
}



// PORTS


function _Platform_checkPortName(name)
{
	if (_Platform_effectManagers[name])
	{
		_Debug_crash(3, name)
	}
}



// OUTGOING PORTS


function _Platform_outgoingPort(name, converter)
{
	_Platform_checkPortName(name);
	_Platform_effectManagers[name] = {
		e: _Platform_outgoingPortMap,
		u: converter,
		a: _Platform_setupOutgoingPort
	};
	return _Platform_leaf(name);
}


var _Platform_outgoingPortMap = F2(function(tagger, value) { return value; });


function _Platform_setupOutgoingPort(name)
{
	var subs = [];
	var converter = _Platform_effectManagers[name].u;

	// CREATE MANAGER

	var init = _Process_sleep(0);

	_Platform_effectManagers[name].b = init;
	_Platform_effectManagers[name].c = F3(function(router, cmdList, state)
	{
		for ( ; cmdList.b; cmdList = cmdList.b) // WHILE_CONS
		{
			// grab a separate reference to subs in case unsubscribe is called
			var currentSubs = subs;
			var value = _Json_unwrap(converter(cmdList.a));
			for (var i = 0; i < currentSubs.length; i++)
			{
				currentSubs[i](value);
			}
		}
		return init;
	});

	// PUBLIC API

	function subscribe(callback)
	{
		subs.push(callback);
	}

	function unsubscribe(callback)
	{
		// copy subs into a new array in case unsubscribe is called within a
		// subscribed callback
		subs = subs.slice();
		var index = subs.indexOf(callback);
		if (index >= 0)
		{
			subs.splice(index, 1);
		}
	}

	return {
		subscribe: subscribe,
		unsubscribe: unsubscribe
	};
}



// INCOMING PORTS


function _Platform_incomingPort(name, converter)
{
	_Platform_checkPortName(name);
	_Platform_effectManagers[name] = {
		f: _Platform_incomingPortMap,
		u: converter,
		a: _Platform_setupIncomingPort
	};
	return _Platform_leaf(name);
}


var _Platform_incomingPortMap = F2(function(tagger, finalTagger)
{
	return function(value)
	{
		return tagger(finalTagger(value));
	};
});


function _Platform_setupIncomingPort(name, sendToApp)
{
	var subs = _List_Nil;
	var converter = _Platform_effectManagers[name].u;

	// CREATE MANAGER

	var init = _Scheduler_succeed(null);

	_Platform_effectManagers[name].b = init;
	_Platform_effectManagers[name].c = F3(function(router, subList, state)
	{
		subs = subList;
		return init;
	});

	// PUBLIC API

	function send(incomingValue)
	{
		var result = A2(_Json_run, converter, _Json_wrap(incomingValue));

		$elm$core$Result$isOk(result) || _Debug_crash(4, name, result.a);

		var value = result.a;
		for (var temp = subs; temp.b; temp = temp.b) // WHILE_CONS
		{
			sendToApp(temp.a(value));
		}
	}

	return { send: send };
}



// EXPORT ELM MODULES
//
// Have DEBUG and PROD versions so that we can (1) give nicer errors in
// debug mode and (2) not pay for the bits needed for that in prod mode.
//


function _Platform_export(exports)
{
	scope['Elm']
		? _Platform_mergeExportsProd(scope['Elm'], exports)
		: scope['Elm'] = exports;
}


function _Platform_mergeExportsProd(obj, exports)
{
	for (var name in exports)
	{
		(name in obj)
			? (name == 'init')
				? _Debug_crash(6)
				: _Platform_mergeExportsProd(obj[name], exports[name])
			: (obj[name] = exports[name]);
	}
}


function _Platform_export_UNUSED(exports)
{
	scope['Elm']
		? _Platform_mergeExportsDebug('Elm', scope['Elm'], exports)
		: scope['Elm'] = exports;
}


function _Platform_mergeExportsDebug(moduleName, obj, exports)
{
	for (var name in exports)
	{
		(name in obj)
			? (name == 'init')
				? _Debug_crash(6, moduleName)
				: _Platform_mergeExportsDebug(moduleName + '.' + name, obj[name], exports[name])
			: (obj[name] = exports[name]);
	}
}




// HELPERS


var _VirtualDom_divertHrefToApp;

var _VirtualDom_doc = typeof document !== 'undefined' ? document : {};


function _VirtualDom_appendChild(parent, child)
{
	parent.appendChild(child);
}

var _VirtualDom_init = F4(function(virtualNode, flagDecoder, debugMetadata, args)
{
	// NOTE: this function needs _Platform_export available to work

	/**/
	var node = args['node'];
	//*/
	/**_UNUSED/
	var node = args && args['node'] ? args['node'] : _Debug_crash(0);
	//*/

	node.parentNode.replaceChild(
		_VirtualDom_render(virtualNode, function() {}),
		node
	);

	return {};
});



// TEXT


function _VirtualDom_text(string)
{
	return {
		$: 0,
		a: string
	};
}



// NODE


var _VirtualDom_nodeNS = F2(function(namespace, tag)
{
	return F2(function(factList, kidList)
	{
		for (var kids = [], descendantsCount = 0; kidList.b; kidList = kidList.b) // WHILE_CONS
		{
			var kid = kidList.a;
			descendantsCount += (kid.b || 0);
			kids.push(kid);
		}
		descendantsCount += kids.length;

		return {
			$: 1,
			c: tag,
			d: _VirtualDom_organizeFacts(factList),
			e: kids,
			f: namespace,
			b: descendantsCount
		};
	});
});


var _VirtualDom_node = _VirtualDom_nodeNS(undefined);



// KEYED NODE


var _VirtualDom_keyedNodeNS = F2(function(namespace, tag)
{
	return F2(function(factList, kidList)
	{
		for (var kids = [], descendantsCount = 0; kidList.b; kidList = kidList.b) // WHILE_CONS
		{
			var kid = kidList.a;
			descendantsCount += (kid.b.b || 0);
			kids.push(kid);
		}
		descendantsCount += kids.length;

		return {
			$: 2,
			c: tag,
			d: _VirtualDom_organizeFacts(factList),
			e: kids,
			f: namespace,
			b: descendantsCount
		};
	});
});


var _VirtualDom_keyedNode = _VirtualDom_keyedNodeNS(undefined);



// CUSTOM


function _VirtualDom_custom(factList, model, render, diff)
{
	return {
		$: 3,
		d: _VirtualDom_organizeFacts(factList),
		g: model,
		h: render,
		i: diff
	};
}



// MAP


var _VirtualDom_map = F2(function(tagger, node)
{
	return {
		$: 4,
		j: tagger,
		k: node,
		b: 1 + (node.b || 0)
	};
});



// LAZY


function _VirtualDom_thunk(refs, thunk)
{
	return {
		$: 5,
		l: refs,
		m: thunk,
		k: undefined
	};
}

var _VirtualDom_lazy = F2(function(func, a)
{
	return _VirtualDom_thunk([func, a], function() {
		return func(a);
	});
});

var _VirtualDom_lazy2 = F3(function(func, a, b)
{
	return _VirtualDom_thunk([func, a, b], function() {
		return A2(func, a, b);
	});
});

var _VirtualDom_lazy3 = F4(function(func, a, b, c)
{
	return _VirtualDom_thunk([func, a, b, c], function() {
		return A3(func, a, b, c);
	});
});

var _VirtualDom_lazy4 = F5(function(func, a, b, c, d)
{
	return _VirtualDom_thunk([func, a, b, c, d], function() {
		return A4(func, a, b, c, d);
	});
});

var _VirtualDom_lazy5 = F6(function(func, a, b, c, d, e)
{
	return _VirtualDom_thunk([func, a, b, c, d, e], function() {
		return A5(func, a, b, c, d, e);
	});
});

var _VirtualDom_lazy6 = F7(function(func, a, b, c, d, e, f)
{
	return _VirtualDom_thunk([func, a, b, c, d, e, f], function() {
		return A6(func, a, b, c, d, e, f);
	});
});

var _VirtualDom_lazy7 = F8(function(func, a, b, c, d, e, f, g)
{
	return _VirtualDom_thunk([func, a, b, c, d, e, f, g], function() {
		return A7(func, a, b, c, d, e, f, g);
	});
});

var _VirtualDom_lazy8 = F9(function(func, a, b, c, d, e, f, g, h)
{
	return _VirtualDom_thunk([func, a, b, c, d, e, f, g, h], function() {
		return A8(func, a, b, c, d, e, f, g, h);
	});
});



// FACTS


var _VirtualDom_on = F2(function(key, handler)
{
	return {
		$: 'a0',
		n: key,
		o: handler
	};
});
var _VirtualDom_style = F2(function(key, value)
{
	return {
		$: 'a1',
		n: key,
		o: value
	};
});
var _VirtualDom_property = F2(function(key, value)
{
	return {
		$: 'a2',
		n: key,
		o: value
	};
});
var _VirtualDom_attribute = F2(function(key, value)
{
	return {
		$: 'a3',
		n: key,
		o: value
	};
});
var _VirtualDom_attributeNS = F3(function(namespace, key, value)
{
	return {
		$: 'a4',
		n: key,
		o: { f: namespace, o: value }
	};
});



// XSS ATTACK VECTOR CHECKS
//
// For some reason, tabs can appear in href protocols and it still works.
// So '\tjava\tSCRIPT:alert("!!!")' and 'javascript:alert("!!!")' are the same
// in practice. That is why _VirtualDom_RE_js and _VirtualDom_RE_js_html look
// so freaky.
//
// Pulling the regular expressions out to the top level gives a slight speed
// boost in small benchmarks (4-10%) but hoisting values to reduce allocation
// can be unpredictable in large programs where JIT may have a harder time with
// functions are not fully self-contained. The benefit is more that the js and
// js_html ones are so weird that I prefer to see them near each other.


var _VirtualDom_RE_script = /^script$/i;
var _VirtualDom_RE_on_formAction = /^(on|formAction$)/i;
var _VirtualDom_RE_js = /^\s*j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i;
var _VirtualDom_RE_js_html = /^\s*(j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l\s*(,|;))/i;


function _VirtualDom_noScript(tag)
{
	return _VirtualDom_RE_script.test(tag) ? 'p' : tag;
}

function _VirtualDom_noOnOrFormAction(key)
{
	return _VirtualDom_RE_on_formAction.test(key) ? 'data-' + key : key;
}

function _VirtualDom_noInnerHtmlOrFormAction(key)
{
	return key == 'innerHTML' || key == 'formAction' ? 'data-' + key : key;
}

function _VirtualDom_noJavaScriptUri(value)
{
	return _VirtualDom_RE_js.test(value)
		? /**/''//*//**_UNUSED/'javascript:alert("This is an XSS vector. Please use ports or web components instead.")'//*/
		: value;
}

function _VirtualDom_noJavaScriptOrHtmlUri(value)
{
	return _VirtualDom_RE_js_html.test(value)
		? /**/''//*//**_UNUSED/'javascript:alert("This is an XSS vector. Please use ports or web components instead.")'//*/
		: value;
}

function _VirtualDom_noJavaScriptOrHtmlJson(value)
{
	return (typeof _Json_unwrap(value) === 'string' && _VirtualDom_RE_js_html.test(_Json_unwrap(value)))
		? _Json_wrap(
			/**/''//*//**_UNUSED/'javascript:alert("This is an XSS vector. Please use ports or web components instead.")'//*/
		) : value;
}



// MAP FACTS


var _VirtualDom_mapAttribute = F2(function(func, attr)
{
	return (attr.$ === 'a0')
		? A2(_VirtualDom_on, attr.n, _VirtualDom_mapHandler(func, attr.o))
		: attr;
});

function _VirtualDom_mapHandler(func, handler)
{
	var tag = $elm$virtual_dom$VirtualDom$toHandlerInt(handler);

	// 0 = Normal
	// 1 = MayStopPropagation
	// 2 = MayPreventDefault
	// 3 = Custom

	return {
		$: handler.$,
		a:
			!tag
				? A2($elm$json$Json$Decode$map, func, handler.a)
				:
			A3($elm$json$Json$Decode$map2,
				tag < 3
					? _VirtualDom_mapEventTuple
					: _VirtualDom_mapEventRecord,
				$elm$json$Json$Decode$succeed(func),
				handler.a
			)
	};
}

var _VirtualDom_mapEventTuple = F2(function(func, tuple)
{
	return _Utils_Tuple2(func(tuple.a), tuple.b);
});

var _VirtualDom_mapEventRecord = F2(function(func, record)
{
	return {
		Z: func(record.Z),
		aY: record.aY,
		aV: record.aV
	}
});



// ORGANIZE FACTS


function _VirtualDom_organizeFacts(factList)
{
	for (var facts = {}; factList.b; factList = factList.b) // WHILE_CONS
	{
		var entry = factList.a;

		var tag = entry.$;
		var key = entry.n;
		var value = entry.o;

		if (tag === 'a2')
		{
			(key === 'className')
				? _VirtualDom_addClass(facts, key, _Json_unwrap(value))
				: facts[key] = _Json_unwrap(value);

			continue;
		}

		var subFacts = facts[tag] || (facts[tag] = {});
		(tag === 'a3' && key === 'class')
			? _VirtualDom_addClass(subFacts, key, value)
			: subFacts[key] = value;
	}

	return facts;
}

function _VirtualDom_addClass(object, key, newClass)
{
	var classes = object[key];
	object[key] = classes ? classes + ' ' + newClass : newClass;
}



// RENDER


function _VirtualDom_render(vNode, eventNode)
{
	var tag = vNode.$;

	if (tag === 5)
	{
		return _VirtualDom_render(vNode.k || (vNode.k = vNode.m()), eventNode);
	}

	if (tag === 0)
	{
		return _VirtualDom_doc.createTextNode(vNode.a);
	}

	if (tag === 4)
	{
		var subNode = vNode.k;
		var tagger = vNode.j;

		while (subNode.$ === 4)
		{
			typeof tagger !== 'object'
				? tagger = [tagger, subNode.j]
				: tagger.push(subNode.j);

			subNode = subNode.k;
		}

		var subEventRoot = { j: tagger, p: eventNode };
		var domNode = _VirtualDom_render(subNode, subEventRoot);
		domNode.elm_event_node_ref = subEventRoot;
		return domNode;
	}

	if (tag === 3)
	{
		var domNode = vNode.h(vNode.g);
		_VirtualDom_applyFacts(domNode, eventNode, vNode.d);
		return domNode;
	}

	// at this point `tag` must be 1 or 2

	var domNode = vNode.f
		? _VirtualDom_doc.createElementNS(vNode.f, vNode.c)
		: _VirtualDom_doc.createElement(vNode.c);

	if (_VirtualDom_divertHrefToApp && vNode.c == 'a')
	{
		domNode.addEventListener('click', _VirtualDom_divertHrefToApp(domNode));
	}

	_VirtualDom_applyFacts(domNode, eventNode, vNode.d);

	for (var kids = vNode.e, i = 0; i < kids.length; i++)
	{
		_VirtualDom_appendChild(domNode, _VirtualDom_render(tag === 1 ? kids[i] : kids[i].b, eventNode));
	}

	return domNode;
}



// APPLY FACTS


function _VirtualDom_applyFacts(domNode, eventNode, facts)
{
	for (var key in facts)
	{
		var value = facts[key];

		key === 'a1'
			? _VirtualDom_applyStyles(domNode, value)
			:
		key === 'a0'
			? _VirtualDom_applyEvents(domNode, eventNode, value)
			:
		key === 'a3'
			? _VirtualDom_applyAttrs(domNode, value)
			:
		key === 'a4'
			? _VirtualDom_applyAttrsNS(domNode, value)
			:
		((key !== 'value' && key !== 'checked') || domNode[key] !== value) && (domNode[key] = value);
	}
}



// APPLY STYLES


function _VirtualDom_applyStyles(domNode, styles)
{
	var domNodeStyle = domNode.style;

	for (var key in styles)
	{
		domNodeStyle[key] = styles[key];
	}
}



// APPLY ATTRS


function _VirtualDom_applyAttrs(domNode, attrs)
{
	for (var key in attrs)
	{
		var value = attrs[key];
		typeof value !== 'undefined'
			? domNode.setAttribute(key, value)
			: domNode.removeAttribute(key);
	}
}



// APPLY NAMESPACED ATTRS


function _VirtualDom_applyAttrsNS(domNode, nsAttrs)
{
	for (var key in nsAttrs)
	{
		var pair = nsAttrs[key];
		var namespace = pair.f;
		var value = pair.o;

		typeof value !== 'undefined'
			? domNode.setAttributeNS(namespace, key, value)
			: domNode.removeAttributeNS(namespace, key);
	}
}



// APPLY EVENTS


function _VirtualDom_applyEvents(domNode, eventNode, events)
{
	var allCallbacks = domNode.elmFs || (domNode.elmFs = {});

	for (var key in events)
	{
		var newHandler = events[key];
		var oldCallback = allCallbacks[key];

		if (!newHandler)
		{
			domNode.removeEventListener(key, oldCallback);
			allCallbacks[key] = undefined;
			continue;
		}

		if (oldCallback)
		{
			var oldHandler = oldCallback.q;
			if (oldHandler.$ === newHandler.$)
			{
				oldCallback.q = newHandler;
				continue;
			}
			domNode.removeEventListener(key, oldCallback);
		}

		oldCallback = _VirtualDom_makeCallback(eventNode, newHandler);
		domNode.addEventListener(key, oldCallback,
			_VirtualDom_passiveSupported
			&& { passive: $elm$virtual_dom$VirtualDom$toHandlerInt(newHandler) < 2 }
		);
		allCallbacks[key] = oldCallback;
	}
}



// PASSIVE EVENTS


var _VirtualDom_passiveSupported;

try
{
	window.addEventListener('t', null, Object.defineProperty({}, 'passive', {
		get: function() { _VirtualDom_passiveSupported = true; }
	}));
}
catch(e) {}



// EVENT HANDLERS


function _VirtualDom_makeCallback(eventNode, initialHandler)
{
	function callback(event)
	{
		var handler = callback.q;
		var result = _Json_runHelp(handler.a, event);

		if (!$elm$core$Result$isOk(result))
		{
			return;
		}

		var tag = $elm$virtual_dom$VirtualDom$toHandlerInt(handler);

		// 0 = Normal
		// 1 = MayStopPropagation
		// 2 = MayPreventDefault
		// 3 = Custom

		var value = result.a;
		var message = !tag ? value : tag < 3 ? value.a : value.Z;
		var stopPropagation = tag == 1 ? value.b : tag == 3 && value.aY;
		var currentEventNode = (
			stopPropagation && event.stopPropagation(),
			(tag == 2 ? value.b : tag == 3 && value.aV) && event.preventDefault(),
			eventNode
		);
		var tagger;
		var i;
		while (tagger = currentEventNode.j)
		{
			if (typeof tagger == 'function')
			{
				message = tagger(message);
			}
			else
			{
				for (var i = tagger.length; i--; )
				{
					message = tagger[i](message);
				}
			}
			currentEventNode = currentEventNode.p;
		}
		currentEventNode(message, stopPropagation); // stopPropagation implies isSync
	}

	callback.q = initialHandler;

	return callback;
}

function _VirtualDom_equalEvents(x, y)
{
	return x.$ == y.$ && _Json_equality(x.a, y.a);
}



// DIFF


// TODO: Should we do patches like in iOS?
//
// type Patch
//   = At Int Patch
//   | Batch (List Patch)
//   | Change ...
//
// How could it not be better?
//
function _VirtualDom_diff(x, y)
{
	var patches = [];
	_VirtualDom_diffHelp(x, y, patches, 0);
	return patches;
}


function _VirtualDom_pushPatch(patches, type, index, data)
{
	var patch = {
		$: type,
		r: index,
		s: data,
		t: undefined,
		u: undefined
	};
	patches.push(patch);
	return patch;
}


function _VirtualDom_diffHelp(x, y, patches, index)
{
	if (x === y)
	{
		return;
	}

	var xType = x.$;
	var yType = y.$;

	// Bail if you run into different types of nodes. Implies that the
	// structure has changed significantly and it's not worth a diff.
	if (xType !== yType)
	{
		if (xType === 1 && yType === 2)
		{
			y = _VirtualDom_dekey(y);
			yType = 1;
		}
		else
		{
			_VirtualDom_pushPatch(patches, 0, index, y);
			return;
		}
	}

	// Now we know that both nodes are the same $.
	switch (yType)
	{
		case 5:
			var xRefs = x.l;
			var yRefs = y.l;
			var i = xRefs.length;
			var same = i === yRefs.length;
			while (same && i--)
			{
				same = xRefs[i] === yRefs[i];
			}
			if (same)
			{
				y.k = x.k;
				return;
			}
			y.k = y.m();
			var subPatches = [];
			_VirtualDom_diffHelp(x.k, y.k, subPatches, 0);
			subPatches.length > 0 && _VirtualDom_pushPatch(patches, 1, index, subPatches);
			return;

		case 4:
			// gather nested taggers
			var xTaggers = x.j;
			var yTaggers = y.j;
			var nesting = false;

			var xSubNode = x.k;
			while (xSubNode.$ === 4)
			{
				nesting = true;

				typeof xTaggers !== 'object'
					? xTaggers = [xTaggers, xSubNode.j]
					: xTaggers.push(xSubNode.j);

				xSubNode = xSubNode.k;
			}

			var ySubNode = y.k;
			while (ySubNode.$ === 4)
			{
				nesting = true;

				typeof yTaggers !== 'object'
					? yTaggers = [yTaggers, ySubNode.j]
					: yTaggers.push(ySubNode.j);

				ySubNode = ySubNode.k;
			}

			// Just bail if different numbers of taggers. This implies the
			// structure of the virtual DOM has changed.
			if (nesting && xTaggers.length !== yTaggers.length)
			{
				_VirtualDom_pushPatch(patches, 0, index, y);
				return;
			}

			// check if taggers are "the same"
			if (nesting ? !_VirtualDom_pairwiseRefEqual(xTaggers, yTaggers) : xTaggers !== yTaggers)
			{
				_VirtualDom_pushPatch(patches, 2, index, yTaggers);
			}

			// diff everything below the taggers
			_VirtualDom_diffHelp(xSubNode, ySubNode, patches, index + 1);
			return;

		case 0:
			if (x.a !== y.a)
			{
				_VirtualDom_pushPatch(patches, 3, index, y.a);
			}
			return;

		case 1:
			_VirtualDom_diffNodes(x, y, patches, index, _VirtualDom_diffKids);
			return;

		case 2:
			_VirtualDom_diffNodes(x, y, patches, index, _VirtualDom_diffKeyedKids);
			return;

		case 3:
			if (x.h !== y.h)
			{
				_VirtualDom_pushPatch(patches, 0, index, y);
				return;
			}

			var factsDiff = _VirtualDom_diffFacts(x.d, y.d);
			factsDiff && _VirtualDom_pushPatch(patches, 4, index, factsDiff);

			var patch = y.i(x.g, y.g);
			patch && _VirtualDom_pushPatch(patches, 5, index, patch);

			return;
	}
}

// assumes the incoming arrays are the same length
function _VirtualDom_pairwiseRefEqual(as, bs)
{
	for (var i = 0; i < as.length; i++)
	{
		if (as[i] !== bs[i])
		{
			return false;
		}
	}

	return true;
}

function _VirtualDom_diffNodes(x, y, patches, index, diffKids)
{
	// Bail if obvious indicators have changed. Implies more serious
	// structural changes such that it's not worth it to diff.
	if (x.c !== y.c || x.f !== y.f)
	{
		_VirtualDom_pushPatch(patches, 0, index, y);
		return;
	}

	var factsDiff = _VirtualDom_diffFacts(x.d, y.d);
	factsDiff && _VirtualDom_pushPatch(patches, 4, index, factsDiff);

	diffKids(x, y, patches, index);
}



// DIFF FACTS


// TODO Instead of creating a new diff object, it's possible to just test if
// there *is* a diff. During the actual patch, do the diff again and make the
// modifications directly. This way, there's no new allocations. Worth it?
function _VirtualDom_diffFacts(x, y, category)
{
	var diff;

	// look for changes and removals
	for (var xKey in x)
	{
		if (xKey === 'a1' || xKey === 'a0' || xKey === 'a3' || xKey === 'a4')
		{
			var subDiff = _VirtualDom_diffFacts(x[xKey], y[xKey] || {}, xKey);
			if (subDiff)
			{
				diff = diff || {};
				diff[xKey] = subDiff;
			}
			continue;
		}

		// remove if not in the new facts
		if (!(xKey in y))
		{
			diff = diff || {};
			diff[xKey] =
				!category
					? (typeof x[xKey] === 'string' ? '' : null)
					:
				(category === 'a1')
					? ''
					:
				(category === 'a0' || category === 'a3')
					? undefined
					:
				{ f: x[xKey].f, o: undefined };

			continue;
		}

		var xValue = x[xKey];
		var yValue = y[xKey];

		// reference equal, so don't worry about it
		if (xValue === yValue && xKey !== 'value' && xKey !== 'checked'
			|| category === 'a0' && _VirtualDom_equalEvents(xValue, yValue))
		{
			continue;
		}

		diff = diff || {};
		diff[xKey] = yValue;
	}

	// add new stuff
	for (var yKey in y)
	{
		if (!(yKey in x))
		{
			diff = diff || {};
			diff[yKey] = y[yKey];
		}
	}

	return diff;
}



// DIFF KIDS


function _VirtualDom_diffKids(xParent, yParent, patches, index)
{
	var xKids = xParent.e;
	var yKids = yParent.e;

	var xLen = xKids.length;
	var yLen = yKids.length;

	// FIGURE OUT IF THERE ARE INSERTS OR REMOVALS

	if (xLen > yLen)
	{
		_VirtualDom_pushPatch(patches, 6, index, {
			v: yLen,
			i: xLen - yLen
		});
	}
	else if (xLen < yLen)
	{
		_VirtualDom_pushPatch(patches, 7, index, {
			v: xLen,
			e: yKids
		});
	}

	// PAIRWISE DIFF EVERYTHING ELSE

	for (var minLen = xLen < yLen ? xLen : yLen, i = 0; i < minLen; i++)
	{
		var xKid = xKids[i];
		_VirtualDom_diffHelp(xKid, yKids[i], patches, ++index);
		index += xKid.b || 0;
	}
}



// KEYED DIFF


function _VirtualDom_diffKeyedKids(xParent, yParent, patches, rootIndex)
{
	var localPatches = [];

	var changes = {}; // Dict String Entry
	var inserts = []; // Array { index : Int, entry : Entry }
	// type Entry = { tag : String, vnode : VNode, index : Int, data : _ }

	var xKids = xParent.e;
	var yKids = yParent.e;
	var xLen = xKids.length;
	var yLen = yKids.length;
	var xIndex = 0;
	var yIndex = 0;

	var index = rootIndex;

	while (xIndex < xLen && yIndex < yLen)
	{
		var x = xKids[xIndex];
		var y = yKids[yIndex];

		var xKey = x.a;
		var yKey = y.a;
		var xNode = x.b;
		var yNode = y.b;

		var newMatch = undefined;
		var oldMatch = undefined;

		// check if keys match

		if (xKey === yKey)
		{
			index++;
			_VirtualDom_diffHelp(xNode, yNode, localPatches, index);
			index += xNode.b || 0;

			xIndex++;
			yIndex++;
			continue;
		}

		// look ahead 1 to detect insertions and removals.

		var xNext = xKids[xIndex + 1];
		var yNext = yKids[yIndex + 1];

		if (xNext)
		{
			var xNextKey = xNext.a;
			var xNextNode = xNext.b;
			oldMatch = yKey === xNextKey;
		}

		if (yNext)
		{
			var yNextKey = yNext.a;
			var yNextNode = yNext.b;
			newMatch = xKey === yNextKey;
		}


		// swap x and y
		if (newMatch && oldMatch)
		{
			index++;
			_VirtualDom_diffHelp(xNode, yNextNode, localPatches, index);
			_VirtualDom_insertNode(changes, localPatches, xKey, yNode, yIndex, inserts);
			index += xNode.b || 0;

			index++;
			_VirtualDom_removeNode(changes, localPatches, xKey, xNextNode, index);
			index += xNextNode.b || 0;

			xIndex += 2;
			yIndex += 2;
			continue;
		}

		// insert y
		if (newMatch)
		{
			index++;
			_VirtualDom_insertNode(changes, localPatches, yKey, yNode, yIndex, inserts);
			_VirtualDom_diffHelp(xNode, yNextNode, localPatches, index);
			index += xNode.b || 0;

			xIndex += 1;
			yIndex += 2;
			continue;
		}

		// remove x
		if (oldMatch)
		{
			index++;
			_VirtualDom_removeNode(changes, localPatches, xKey, xNode, index);
			index += xNode.b || 0;

			index++;
			_VirtualDom_diffHelp(xNextNode, yNode, localPatches, index);
			index += xNextNode.b || 0;

			xIndex += 2;
			yIndex += 1;
			continue;
		}

		// remove x, insert y
		if (xNext && xNextKey === yNextKey)
		{
			index++;
			_VirtualDom_removeNode(changes, localPatches, xKey, xNode, index);
			_VirtualDom_insertNode(changes, localPatches, yKey, yNode, yIndex, inserts);
			index += xNode.b || 0;

			index++;
			_VirtualDom_diffHelp(xNextNode, yNextNode, localPatches, index);
			index += xNextNode.b || 0;

			xIndex += 2;
			yIndex += 2;
			continue;
		}

		break;
	}

	// eat up any remaining nodes with removeNode and insertNode

	while (xIndex < xLen)
	{
		index++;
		var x = xKids[xIndex];
		var xNode = x.b;
		_VirtualDom_removeNode(changes, localPatches, x.a, xNode, index);
		index += xNode.b || 0;
		xIndex++;
	}

	while (yIndex < yLen)
	{
		var endInserts = endInserts || [];
		var y = yKids[yIndex];
		_VirtualDom_insertNode(changes, localPatches, y.a, y.b, undefined, endInserts);
		yIndex++;
	}

	if (localPatches.length > 0 || inserts.length > 0 || endInserts)
	{
		_VirtualDom_pushPatch(patches, 8, rootIndex, {
			w: localPatches,
			x: inserts,
			y: endInserts
		});
	}
}



// CHANGES FROM KEYED DIFF


var _VirtualDom_POSTFIX = '_elmW6BL';


function _VirtualDom_insertNode(changes, localPatches, key, vnode, yIndex, inserts)
{
	var entry = changes[key];

	// never seen this key before
	if (!entry)
	{
		entry = {
			c: 0,
			z: vnode,
			r: yIndex,
			s: undefined
		};

		inserts.push({ r: yIndex, A: entry });
		changes[key] = entry;

		return;
	}

	// this key was removed earlier, a match!
	if (entry.c === 1)
	{
		inserts.push({ r: yIndex, A: entry });

		entry.c = 2;
		var subPatches = [];
		_VirtualDom_diffHelp(entry.z, vnode, subPatches, entry.r);
		entry.r = yIndex;
		entry.s.s = {
			w: subPatches,
			A: entry
		};

		return;
	}

	// this key has already been inserted or moved, a duplicate!
	_VirtualDom_insertNode(changes, localPatches, key + _VirtualDom_POSTFIX, vnode, yIndex, inserts);
}


function _VirtualDom_removeNode(changes, localPatches, key, vnode, index)
{
	var entry = changes[key];

	// never seen this key before
	if (!entry)
	{
		var patch = _VirtualDom_pushPatch(localPatches, 9, index, undefined);

		changes[key] = {
			c: 1,
			z: vnode,
			r: index,
			s: patch
		};

		return;
	}

	// this key was inserted earlier, a match!
	if (entry.c === 0)
	{
		entry.c = 2;
		var subPatches = [];
		_VirtualDom_diffHelp(vnode, entry.z, subPatches, index);

		_VirtualDom_pushPatch(localPatches, 9, index, {
			w: subPatches,
			A: entry
		});

		return;
	}

	// this key has already been removed or moved, a duplicate!
	_VirtualDom_removeNode(changes, localPatches, key + _VirtualDom_POSTFIX, vnode, index);
}



// ADD DOM NODES
//
// Each DOM node has an "index" assigned in order of traversal. It is important
// to minimize our crawl over the actual DOM, so these indexes (along with the
// descendantsCount of virtual nodes) let us skip touching entire subtrees of
// the DOM if we know there are no patches there.


function _VirtualDom_addDomNodes(domNode, vNode, patches, eventNode)
{
	_VirtualDom_addDomNodesHelp(domNode, vNode, patches, 0, 0, vNode.b, eventNode);
}


// assumes `patches` is non-empty and indexes increase monotonically.
function _VirtualDom_addDomNodesHelp(domNode, vNode, patches, i, low, high, eventNode)
{
	var patch = patches[i];
	var index = patch.r;

	while (index === low)
	{
		var patchType = patch.$;

		if (patchType === 1)
		{
			_VirtualDom_addDomNodes(domNode, vNode.k, patch.s, eventNode);
		}
		else if (patchType === 8)
		{
			patch.t = domNode;
			patch.u = eventNode;

			var subPatches = patch.s.w;
			if (subPatches.length > 0)
			{
				_VirtualDom_addDomNodesHelp(domNode, vNode, subPatches, 0, low, high, eventNode);
			}
		}
		else if (patchType === 9)
		{
			patch.t = domNode;
			patch.u = eventNode;

			var data = patch.s;
			if (data)
			{
				data.A.s = domNode;
				var subPatches = data.w;
				if (subPatches.length > 0)
				{
					_VirtualDom_addDomNodesHelp(domNode, vNode, subPatches, 0, low, high, eventNode);
				}
			}
		}
		else
		{
			patch.t = domNode;
			patch.u = eventNode;
		}

		i++;

		if (!(patch = patches[i]) || (index = patch.r) > high)
		{
			return i;
		}
	}

	var tag = vNode.$;

	if (tag === 4)
	{
		var subNode = vNode.k;

		while (subNode.$ === 4)
		{
			subNode = subNode.k;
		}

		return _VirtualDom_addDomNodesHelp(domNode, subNode, patches, i, low + 1, high, domNode.elm_event_node_ref);
	}

	// tag must be 1 or 2 at this point

	var vKids = vNode.e;
	var childNodes = domNode.childNodes;
	for (var j = 0; j < vKids.length; j++)
	{
		low++;
		var vKid = tag === 1 ? vKids[j] : vKids[j].b;
		var nextLow = low + (vKid.b || 0);
		if (low <= index && index <= nextLow)
		{
			i = _VirtualDom_addDomNodesHelp(childNodes[j], vKid, patches, i, low, nextLow, eventNode);
			if (!(patch = patches[i]) || (index = patch.r) > high)
			{
				return i;
			}
		}
		low = nextLow;
	}
	return i;
}



// APPLY PATCHES


function _VirtualDom_applyPatches(rootDomNode, oldVirtualNode, patches, eventNode)
{
	if (patches.length === 0)
	{
		return rootDomNode;
	}

	_VirtualDom_addDomNodes(rootDomNode, oldVirtualNode, patches, eventNode);
	return _VirtualDom_applyPatchesHelp(rootDomNode, patches);
}

function _VirtualDom_applyPatchesHelp(rootDomNode, patches)
{
	for (var i = 0; i < patches.length; i++)
	{
		var patch = patches[i];
		var localDomNode = patch.t
		var newNode = _VirtualDom_applyPatch(localDomNode, patch);
		if (localDomNode === rootDomNode)
		{
			rootDomNode = newNode;
		}
	}
	return rootDomNode;
}

function _VirtualDom_applyPatch(domNode, patch)
{
	switch (patch.$)
	{
		case 0:
			return _VirtualDom_applyPatchRedraw(domNode, patch.s, patch.u);

		case 4:
			_VirtualDom_applyFacts(domNode, patch.u, patch.s);
			return domNode;

		case 3:
			domNode.replaceData(0, domNode.length, patch.s);
			return domNode;

		case 1:
			return _VirtualDom_applyPatchesHelp(domNode, patch.s);

		case 2:
			if (domNode.elm_event_node_ref)
			{
				domNode.elm_event_node_ref.j = patch.s;
			}
			else
			{
				domNode.elm_event_node_ref = { j: patch.s, p: patch.u };
			}
			return domNode;

		case 6:
			var data = patch.s;
			for (var i = 0; i < data.i; i++)
			{
				domNode.removeChild(domNode.childNodes[data.v]);
			}
			return domNode;

		case 7:
			var data = patch.s;
			var kids = data.e;
			var i = data.v;
			var theEnd = domNode.childNodes[i];
			for (; i < kids.length; i++)
			{
				domNode.insertBefore(_VirtualDom_render(kids[i], patch.u), theEnd);
			}
			return domNode;

		case 9:
			var data = patch.s;
			if (!data)
			{
				domNode.parentNode.removeChild(domNode);
				return domNode;
			}
			var entry = data.A;
			if (typeof entry.r !== 'undefined')
			{
				domNode.parentNode.removeChild(domNode);
			}
			entry.s = _VirtualDom_applyPatchesHelp(domNode, data.w);
			return domNode;

		case 8:
			return _VirtualDom_applyPatchReorder(domNode, patch);

		case 5:
			return patch.s(domNode);

		default:
			_Debug_crash(10); // 'Ran into an unknown patch!'
	}
}


function _VirtualDom_applyPatchRedraw(domNode, vNode, eventNode)
{
	var parentNode = domNode.parentNode;
	var newNode = _VirtualDom_render(vNode, eventNode);

	if (!newNode.elm_event_node_ref)
	{
		newNode.elm_event_node_ref = domNode.elm_event_node_ref;
	}

	if (parentNode && newNode !== domNode)
	{
		parentNode.replaceChild(newNode, domNode);
	}
	return newNode;
}


function _VirtualDom_applyPatchReorder(domNode, patch)
{
	var data = patch.s;

	// remove end inserts
	var frag = _VirtualDom_applyPatchReorderEndInsertsHelp(data.y, patch);

	// removals
	domNode = _VirtualDom_applyPatchesHelp(domNode, data.w);

	// inserts
	var inserts = data.x;
	for (var i = 0; i < inserts.length; i++)
	{
		var insert = inserts[i];
		var entry = insert.A;
		var node = entry.c === 2
			? entry.s
			: _VirtualDom_render(entry.z, patch.u);
		domNode.insertBefore(node, domNode.childNodes[insert.r]);
	}

	// add end inserts
	if (frag)
	{
		_VirtualDom_appendChild(domNode, frag);
	}

	return domNode;
}


function _VirtualDom_applyPatchReorderEndInsertsHelp(endInserts, patch)
{
	if (!endInserts)
	{
		return;
	}

	var frag = _VirtualDom_doc.createDocumentFragment();
	for (var i = 0; i < endInserts.length; i++)
	{
		var insert = endInserts[i];
		var entry = insert.A;
		_VirtualDom_appendChild(frag, entry.c === 2
			? entry.s
			: _VirtualDom_render(entry.z, patch.u)
		);
	}
	return frag;
}


function _VirtualDom_virtualize(node)
{
	// TEXT NODES

	if (node.nodeType === 3)
	{
		return _VirtualDom_text(node.textContent);
	}


	// WEIRD NODES

	if (node.nodeType !== 1)
	{
		return _VirtualDom_text('');
	}


	// ELEMENT NODES

	var attrList = _List_Nil;
	var attrs = node.attributes;
	for (var i = attrs.length; i--; )
	{
		var attr = attrs[i];
		var name = attr.name;
		var value = attr.value;
		attrList = _List_Cons( A2(_VirtualDom_attribute, name, value), attrList );
	}

	var tag = node.tagName.toLowerCase();
	var kidList = _List_Nil;
	var kids = node.childNodes;

	for (var i = kids.length; i--; )
	{
		kidList = _List_Cons(_VirtualDom_virtualize(kids[i]), kidList);
	}
	return A3(_VirtualDom_node, tag, attrList, kidList);
}

function _VirtualDom_dekey(keyedNode)
{
	var keyedKids = keyedNode.e;
	var len = keyedKids.length;
	var kids = new Array(len);
	for (var i = 0; i < len; i++)
	{
		kids[i] = keyedKids[i].b;
	}

	return {
		$: 1,
		c: keyedNode.c,
		d: keyedNode.d,
		e: kids,
		f: keyedNode.f,
		b: keyedNode.b
	};
}




// ELEMENT


var _Debugger_element;

var _Browser_element = _Debugger_element || F4(function(impl, flagDecoder, debugMetadata, args)
{
	return _Platform_initialize(
		flagDecoder,
		args,
		impl.cz,
		impl.$7,
		impl.dh,
		function(sendToApp, initialModel) {
			var view = impl.dq;
			/**/
			var domNode = args['node'];
			//*/
			/**_UNUSED/
			var domNode = args && args['node'] ? args['node'] : _Debug_crash(0);
			//*/
			var currNode = _VirtualDom_virtualize(domNode);

			return _Browser_makeAnimator(initialModel, function(model)
			{
				var nextNode = view(model);
				var patches = _VirtualDom_diff(currNode, nextNode);
				domNode = _VirtualDom_applyPatches(domNode, currNode, patches, sendToApp);
				currNode = nextNode;
			});
		}
	);
});



// DOCUMENT


var _Debugger_document;

var _Browser_document = _Debugger_document || F4(function(impl, flagDecoder, debugMetadata, args)
{
	return _Platform_initialize(
		flagDecoder,
		args,
		impl.cz,
		impl.$7,
		impl.dh,
		function(sendToApp, initialModel) {
			var divertHrefToApp = impl.aW && impl.aW(sendToApp)
			var view = impl.dq;
			var title = _VirtualDom_doc.title;
			var bodyNode = _VirtualDom_doc.body;
			var currNode = _VirtualDom_virtualize(bodyNode);
			return _Browser_makeAnimator(initialModel, function(model)
			{
				_VirtualDom_divertHrefToApp = divertHrefToApp;
				var doc = view(model);
				var nextNode = _VirtualDom_node('body')(_List_Nil)(doc.b3);
				var patches = _VirtualDom_diff(currNode, nextNode);
				bodyNode = _VirtualDom_applyPatches(bodyNode, currNode, patches, sendToApp);
				currNode = nextNode;
				_VirtualDom_divertHrefToApp = 0;
				(title !== doc.bP) && (_VirtualDom_doc.title = title = doc.bP);
			});
		}
	);
});



// ANIMATION


var _Browser_cancelAnimationFrame =
	typeof cancelAnimationFrame !== 'undefined'
		? cancelAnimationFrame
		: function(id) { clearTimeout(id); };

var _Browser_requestAnimationFrame =
	typeof requestAnimationFrame !== 'undefined'
		? requestAnimationFrame
		: function(callback) { return setTimeout(callback, 1000 / 60); };


function _Browser_makeAnimator(model, draw)
{
	draw(model);

	var state = 0;

	function updateIfNeeded()
	{
		state = state === 1
			? 0
			: ( _Browser_requestAnimationFrame(updateIfNeeded), draw(model), 1 );
	}

	return function(nextModel, isSync)
	{
		model = nextModel;

		isSync
			? ( draw(model),
				state === 2 && (state = 1)
				)
			: ( state === 0 && _Browser_requestAnimationFrame(updateIfNeeded),
				state = 2
				);
	};
}



// APPLICATION


function _Browser_application(impl)
{
	var onUrlChange = impl.cV;
	var onUrlRequest = impl.cW;
	var key = function() { key.a(onUrlChange(_Browser_getUrl())); };

	return _Browser_document({
		aW: function(sendToApp)
		{
			key.a = sendToApp;
			_Browser_window.addEventListener('popstate', key);
			_Browser_window.navigator.userAgent.indexOf('Trident') < 0 || _Browser_window.addEventListener('hashchange', key);

			return F2(function(domNode, event)
			{
				if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button < 1 && !domNode.target && !domNode.hasAttribute('download'))
				{
					event.preventDefault();
					var href = domNode.href;
					var curr = _Browser_getUrl();
					var next = $elm$url$Url$fromString(href).a;
					sendToApp(onUrlRequest(
						(next
							&& curr.bA === next.bA
							&& curr.bi === next.bi
							&& curr.bx.a === next.bx.a
						)
							? $elm$browser$Browser$Internal(next)
							: $elm$browser$Browser$External(href)
					));
				}
			});
		},
		cz: function(flags)
		{
			return A3(impl.cz, flags, _Browser_getUrl(), key);
		},
		dq: impl.dq,
		$7: impl.$7,
		dh: impl.dh
	});
}

function _Browser_getUrl()
{
	return $elm$url$Url$fromString(_VirtualDom_doc.location.href).a || _Debug_crash(1);
}

var _Browser_go = F2(function(key, n)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function() {
		n && history.go(n);
		key();
	}));
});

var _Browser_pushUrl = F2(function(key, url)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function() {
		history.pushState({}, '', url);
		key();
	}));
});

var _Browser_replaceUrl = F2(function(key, url)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function() {
		history.replaceState({}, '', url);
		key();
	}));
});



// GLOBAL EVENTS


var _Browser_fakeNode = { addEventListener: function() {}, removeEventListener: function() {} };
var _Browser_doc = typeof document !== 'undefined' ? document : _Browser_fakeNode;
var _Browser_window = typeof window !== 'undefined' ? window : _Browser_fakeNode;

var _Browser_on = F3(function(node, eventName, sendToSelf)
{
	return _Scheduler_spawn(_Scheduler_binding(function(callback)
	{
		function handler(event)	{ _Scheduler_rawSpawn(sendToSelf(event)); }
		node.addEventListener(eventName, handler, _VirtualDom_passiveSupported && { passive: true });
		return function() { node.removeEventListener(eventName, handler); };
	}));
});

var _Browser_decodeEvent = F2(function(decoder, event)
{
	var result = _Json_runHelp(decoder, event);
	return $elm$core$Result$isOk(result) ? $elm$core$Maybe$Just(result.a) : $elm$core$Maybe$Nothing;
});



// PAGE VISIBILITY


function _Browser_visibilityInfo()
{
	return (typeof _VirtualDom_doc.hidden !== 'undefined')
		? { cv: 'hidden', b7: 'visibilitychange' }
		:
	(typeof _VirtualDom_doc.mozHidden !== 'undefined')
		? { cv: 'mozHidden', b7: 'mozvisibilitychange' }
		:
	(typeof _VirtualDom_doc.msHidden !== 'undefined')
		? { cv: 'msHidden', b7: 'msvisibilitychange' }
		:
	(typeof _VirtualDom_doc.webkitHidden !== 'undefined')
		? { cv: 'webkitHidden', b7: 'webkitvisibilitychange' }
		: { cv: 'hidden', b7: 'visibilitychange' };
}



// ANIMATION FRAMES


function _Browser_rAF()
{
	return _Scheduler_binding(function(callback)
	{
		var id = _Browser_requestAnimationFrame(function() {
			callback(_Scheduler_succeed(Date.now()));
		});

		return function() {
			_Browser_cancelAnimationFrame(id);
		};
	});
}


function _Browser_now()
{
	return _Scheduler_binding(function(callback)
	{
		callback(_Scheduler_succeed(Date.now()));
	});
}



// DOM STUFF


function _Browser_withNode(id, doStuff)
{
	return _Scheduler_binding(function(callback)
	{
		_Browser_requestAnimationFrame(function() {
			var node = document.getElementById(id);
			callback(node
				? _Scheduler_succeed(doStuff(node))
				: _Scheduler_fail($elm$browser$Browser$Dom$NotFound(id))
			);
		});
	});
}


function _Browser_withWindow(doStuff)
{
	return _Scheduler_binding(function(callback)
	{
		_Browser_requestAnimationFrame(function() {
			callback(_Scheduler_succeed(doStuff()));
		});
	});
}


// FOCUS and BLUR


var _Browser_call = F2(function(functionName, id)
{
	return _Browser_withNode(id, function(node) {
		node[functionName]();
		return _Utils_Tuple0;
	});
});



// WINDOW VIEWPORT


function _Browser_getViewport()
{
	return {
		bG: _Browser_getScene(),
		bT: {
			bW: _Browser_window.pageXOffset,
			bX: _Browser_window.pageYOffset,
			bV: _Browser_doc.documentElement.clientWidth,
			bh: _Browser_doc.documentElement.clientHeight
		}
	};
}

function _Browser_getScene()
{
	var body = _Browser_doc.body;
	var elem = _Browser_doc.documentElement;
	return {
		bV: Math.max(body.scrollWidth, body.offsetWidth, elem.scrollWidth, elem.offsetWidth, elem.clientWidth),
		bh: Math.max(body.scrollHeight, body.offsetHeight, elem.scrollHeight, elem.offsetHeight, elem.clientHeight)
	};
}

var _Browser_setViewport = F2(function(x, y)
{
	return _Browser_withWindow(function()
	{
		_Browser_window.scroll(x, y);
		return _Utils_Tuple0;
	});
});



// ELEMENT VIEWPORT


function _Browser_getViewportOf(id)
{
	return _Browser_withNode(id, function(node)
	{
		return {
			bG: {
				bV: node.scrollWidth,
				bh: node.scrollHeight
			},
			bT: {
				bW: node.scrollLeft,
				bX: node.scrollTop,
				bV: node.clientWidth,
				bh: node.clientHeight
			}
		};
	});
}


var _Browser_setViewportOf = F3(function(id, x, y)
{
	return _Browser_withNode(id, function(node)
	{
		node.scrollLeft = x;
		node.scrollTop = y;
		return _Utils_Tuple0;
	});
});



// ELEMENT


function _Browser_getElement(id)
{
	return _Browser_withNode(id, function(node)
	{
		var rect = node.getBoundingClientRect();
		var x = _Browser_window.pageXOffset;
		var y = _Browser_window.pageYOffset;
		return {
			bG: _Browser_getScene(),
			bT: {
				bW: x,
				bX: y,
				bV: _Browser_doc.documentElement.clientWidth,
				bh: _Browser_doc.documentElement.clientHeight
			},
			ch: {
				bW: x + rect.left,
				bX: y + rect.top,
				bV: rect.width,
				bh: rect.height
			}
		};
	});
}



// LOAD and RELOAD


function _Browser_reload(skipCache)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function(callback)
	{
		_VirtualDom_doc.location.reload(skipCache);
	}));
}

function _Browser_load(url)
{
	return A2($elm$core$Task$perform, $elm$core$Basics$never, _Scheduler_binding(function(callback)
	{
		try
		{
			_Browser_window.location = url;
		}
		catch(err)
		{
			// Only Firefox can throw a NS_ERROR_MALFORMED_URI exception here.
			// Other browsers reload the page, so let's be consistent about that.
			_VirtualDom_doc.location.reload(false);
		}
	}));
}



var _Bitwise_and = F2(function(a, b)
{
	return a & b;
});

var _Bitwise_or = F2(function(a, b)
{
	return a | b;
});

var _Bitwise_xor = F2(function(a, b)
{
	return a ^ b;
});

function _Bitwise_complement(a)
{
	return ~a;
};

var _Bitwise_shiftLeftBy = F2(function(offset, a)
{
	return a << offset;
});

var _Bitwise_shiftRightBy = F2(function(offset, a)
{
	return a >> offset;
});

var _Bitwise_shiftRightZfBy = F2(function(offset, a)
{
	return a >>> offset;
});
var $elm$core$Basics$EQ = 1;
var $elm$core$Basics$GT = 2;
var $elm$core$Basics$LT = 0;
var $elm$core$List$cons = _List_cons;
var $elm$core$Dict$foldr = F3(
	function (func, acc, t) {
		foldr:
		while (true) {
			if (t.$ === -2) {
				return acc;
			} else {
				var key = t.b;
				var value = t.c;
				var left = t.d;
				var right = t.e;
				var $temp$func = func,
					$temp$acc = A3(
					func,
					key,
					value,
					A3($elm$core$Dict$foldr, func, acc, right)),
					$temp$t = left;
				func = $temp$func;
				acc = $temp$acc;
				t = $temp$t;
				continue foldr;
			}
		}
	});
var $elm$core$Dict$toList = function (dict) {
	return A3(
		$elm$core$Dict$foldr,
		F3(
			function (key, value, list) {
				return A2(
					$elm$core$List$cons,
					_Utils_Tuple2(key, value),
					list);
			}),
		_List_Nil,
		dict);
};
var $elm$core$Dict$keys = function (dict) {
	return A3(
		$elm$core$Dict$foldr,
		F3(
			function (key, value, keyList) {
				return A2($elm$core$List$cons, key, keyList);
			}),
		_List_Nil,
		dict);
};
var $elm$core$Set$toList = function (_v0) {
	var dict = _v0;
	return $elm$core$Dict$keys(dict);
};
var $elm$core$Elm$JsArray$foldr = _JsArray_foldr;
var $elm$core$Array$foldr = F3(
	function (func, baseCase, _v0) {
		var tree = _v0.c;
		var tail = _v0.d;
		var helper = F2(
			function (node, acc) {
				if (!node.$) {
					var subTree = node.a;
					return A3($elm$core$Elm$JsArray$foldr, helper, acc, subTree);
				} else {
					var values = node.a;
					return A3($elm$core$Elm$JsArray$foldr, func, acc, values);
				}
			});
		return A3(
			$elm$core$Elm$JsArray$foldr,
			helper,
			A3($elm$core$Elm$JsArray$foldr, func, baseCase, tail),
			tree);
	});
var $elm$core$Array$toList = function (array) {
	return A3($elm$core$Array$foldr, $elm$core$List$cons, _List_Nil, array);
};
var $elm$core$Result$Err = function (a) {
	return {$: 1, a: a};
};
var $elm$json$Json$Decode$Failure = F2(
	function (a, b) {
		return {$: 3, a: a, b: b};
	});
var $elm$json$Json$Decode$Field = F2(
	function (a, b) {
		return {$: 0, a: a, b: b};
	});
var $elm$json$Json$Decode$Index = F2(
	function (a, b) {
		return {$: 1, a: a, b: b};
	});
var $elm$core$Result$Ok = function (a) {
	return {$: 0, a: a};
};
var $elm$json$Json$Decode$OneOf = function (a) {
	return {$: 2, a: a};
};
var $elm$core$Basics$False = 1;
var $elm$core$Basics$add = _Basics_add;
var $elm$core$Maybe$Just = function (a) {
	return {$: 0, a: a};
};
var $elm$core$Maybe$Nothing = {$: 1};
var $elm$core$String$all = _String_all;
var $elm$core$Basics$and = _Basics_and;
var $elm$core$Basics$append = _Utils_append;
var $elm$json$Json$Encode$encode = _Json_encode;
var $elm$core$String$fromInt = _String_fromNumber;
var $elm$core$String$join = F2(
	function (sep, chunks) {
		return A2(
			_String_join,
			sep,
			_List_toArray(chunks));
	});
var $elm$core$String$split = F2(
	function (sep, string) {
		return _List_fromArray(
			A2(_String_split, sep, string));
	});
var $elm$json$Json$Decode$indent = function (str) {
	return A2(
		$elm$core$String$join,
		'\u000A    ',
		A2($elm$core$String$split, '\u000A', str));
};
var $elm$core$List$foldl = F3(
	function (func, acc, list) {
		foldl:
		while (true) {
			if (!list.b) {
				return acc;
			} else {
				var x = list.a;
				var xs = list.b;
				var $temp$func = func,
					$temp$acc = A2(func, x, acc),
					$temp$list = xs;
				func = $temp$func;
				acc = $temp$acc;
				list = $temp$list;
				continue foldl;
			}
		}
	});
var $elm$core$List$length = function (xs) {
	return A3(
		$elm$core$List$foldl,
		F2(
			function (_v0, i) {
				return i + 1;
			}),
		0,
		xs);
};
var $elm$core$List$map2 = _List_map2;
var $elm$core$Basics$le = _Utils_le;
var $elm$core$Basics$sub = _Basics_sub;
var $elm$core$List$rangeHelp = F3(
	function (lo, hi, list) {
		rangeHelp:
		while (true) {
			if (_Utils_cmp(lo, hi) < 1) {
				var $temp$lo = lo,
					$temp$hi = hi - 1,
					$temp$list = A2($elm$core$List$cons, hi, list);
				lo = $temp$lo;
				hi = $temp$hi;
				list = $temp$list;
				continue rangeHelp;
			} else {
				return list;
			}
		}
	});
var $elm$core$List$range = F2(
	function (lo, hi) {
		return A3($elm$core$List$rangeHelp, lo, hi, _List_Nil);
	});
var $elm$core$List$indexedMap = F2(
	function (f, xs) {
		return A3(
			$elm$core$List$map2,
			f,
			A2(
				$elm$core$List$range,
				0,
				$elm$core$List$length(xs) - 1),
			xs);
	});
var $elm$core$Char$toCode = _Char_toCode;
var $elm$core$Char$isLower = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return (97 <= code) && (code <= 122);
};
var $elm$core$Char$isUpper = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return (code <= 90) && (65 <= code);
};
var $elm$core$Basics$or = _Basics_or;
var $elm$core$Char$isAlpha = function (_char) {
	return $elm$core$Char$isLower(_char) || $elm$core$Char$isUpper(_char);
};
var $elm$core$Char$isDigit = function (_char) {
	var code = $elm$core$Char$toCode(_char);
	return (code <= 57) && (48 <= code);
};
var $elm$core$Char$isAlphaNum = function (_char) {
	return $elm$core$Char$isLower(_char) || ($elm$core$Char$isUpper(_char) || $elm$core$Char$isDigit(_char));
};
var $elm$core$List$reverse = function (list) {
	return A3($elm$core$List$foldl, $elm$core$List$cons, _List_Nil, list);
};
var $elm$core$String$uncons = _String_uncons;
var $elm$json$Json$Decode$errorOneOf = F2(
	function (i, error) {
		return '\u000A\u000A(' + ($elm$core$String$fromInt(i + 1) + (') ' + $elm$json$Json$Decode$indent(
			$elm$json$Json$Decode$errorToString(error))));
	});
var $elm$json$Json$Decode$errorToString = function (error) {
	return A2($elm$json$Json$Decode$errorToStringHelp, error, _List_Nil);
};
var $elm$json$Json$Decode$errorToStringHelp = F2(
	function (error, context) {
		errorToStringHelp:
		while (true) {
			switch (error.$) {
				case 0:
					var f = error.a;
					var err = error.b;
					var isSimple = function () {
						var _v1 = $elm$core$String$uncons(f);
						if (_v1.$ === 1) {
							return false;
						} else {
							var _v2 = _v1.a;
							var _char = _v2.a;
							var rest = _v2.b;
							return $elm$core$Char$isAlpha(_char) && A2($elm$core$String$all, $elm$core$Char$isAlphaNum, rest);
						}
					}();
					var fieldName = isSimple ? ('.' + f) : ('[\u0027' + (f + '\u0027]'));
					var $temp$error = err,
						$temp$context = A2($elm$core$List$cons, fieldName, context);
					error = $temp$error;
					context = $temp$context;
					continue errorToStringHelp;
				case 1:
					var i = error.a;
					var err = error.b;
					var indexName = '[' + ($elm$core$String$fromInt(i) + ']');
					var $temp$error = err,
						$temp$context = A2($elm$core$List$cons, indexName, context);
					error = $temp$error;
					context = $temp$context;
					continue errorToStringHelp;
				case 2:
					var errors = error.a;
					if (!errors.b) {
						return 'Ran into a Json.Decode.oneOf with no possibilities' + function () {
							if (!context.b) {
								return '!';
							} else {
								return ' at json' + A2(
									$elm$core$String$join,
									'',
									$elm$core$List$reverse(context));
							}
						}();
					} else {
						if (!errors.b.b) {
							var err = errors.a;
							var $temp$error = err,
								$temp$context = context;
							error = $temp$error;
							context = $temp$context;
							continue errorToStringHelp;
						} else {
							var starter = function () {
								if (!context.b) {
									return 'Json.Decode.oneOf';
								} else {
									return 'The Json.Decode.oneOf at json' + A2(
										$elm$core$String$join,
										'',
										$elm$core$List$reverse(context));
								}
							}();
							var introduction = starter + (' failed in the following ' + ($elm$core$String$fromInt(
								$elm$core$List$length(errors)) + ' ways:'));
							return A2(
								$elm$core$String$join,
								'\u000A\u000A',
								A2(
									$elm$core$List$cons,
									introduction,
									A2($elm$core$List$indexedMap, $elm$json$Json$Decode$errorOneOf, errors)));
						}
					}
				default:
					var msg = error.a;
					var json = error.b;
					var introduction = function () {
						if (!context.b) {
							return 'Problem with the given value:\u000A\u000A';
						} else {
							return 'Problem with the value at json' + (A2(
								$elm$core$String$join,
								'',
								$elm$core$List$reverse(context)) + ':\u000A\u000A    ');
						}
					}();
					return introduction + ($elm$json$Json$Decode$indent(
						A2($elm$json$Json$Encode$encode, 4, json)) + ('\u000A\u000A' + msg));
			}
		}
	});
var $elm$core$Array$branchFactor = 32;
var $elm$core$Array$Array_elm_builtin = F4(
	function (a, b, c, d) {
		return {$: 0, a: a, b: b, c: c, d: d};
	});
var $elm$core$Elm$JsArray$empty = _JsArray_empty;
var $elm$core$Basics$ceiling = _Basics_ceiling;
var $elm$core$Basics$fdiv = _Basics_fdiv;
var $elm$core$Basics$logBase = F2(
	function (base, number) {
		return _Basics_log(number) / _Basics_log(base);
	});
var $elm$core$Basics$toFloat = _Basics_toFloat;
var $elm$core$Array$shiftStep = $elm$core$Basics$ceiling(
	A2($elm$core$Basics$logBase, 2, $elm$core$Array$branchFactor));
var $elm$core$Array$empty = A4($elm$core$Array$Array_elm_builtin, 0, $elm$core$Array$shiftStep, $elm$core$Elm$JsArray$empty, $elm$core$Elm$JsArray$empty);
var $elm$core$Elm$JsArray$initialize = _JsArray_initialize;
var $elm$core$Array$Leaf = function (a) {
	return {$: 1, a: a};
};
var $elm$core$Basics$apL = F2(
	function (f, x) {
		return f(x);
	});
var $elm$core$Basics$apR = F2(
	function (x, f) {
		return f(x);
	});
var $elm$core$Basics$eq = _Utils_equal;
var $elm$core$Basics$floor = _Basics_floor;
var $elm$core$Elm$JsArray$length = _JsArray_length;
var $elm$core$Basics$gt = _Utils_gt;
var $elm$core$Basics$max = F2(
	function (x, y) {
		return (_Utils_cmp(x, y) > 0) ? x : y;
	});
var $elm$core$Basics$mul = _Basics_mul;
var $elm$core$Array$SubTree = function (a) {
	return {$: 0, a: a};
};
var $elm$core$Elm$JsArray$initializeFromList = _JsArray_initializeFromList;
var $elm$core$Array$compressNodes = F2(
	function (nodes, acc) {
		compressNodes:
		while (true) {
			var _v0 = A2($elm$core$Elm$JsArray$initializeFromList, $elm$core$Array$branchFactor, nodes);
			var node = _v0.a;
			var remainingNodes = _v0.b;
			var newAcc = A2(
				$elm$core$List$cons,
				$elm$core$Array$SubTree(node),
				acc);
			if (!remainingNodes.b) {
				return $elm$core$List$reverse(newAcc);
			} else {
				var $temp$nodes = remainingNodes,
					$temp$acc = newAcc;
				nodes = $temp$nodes;
				acc = $temp$acc;
				continue compressNodes;
			}
		}
	});
var $elm$core$Tuple$first = function (_v0) {
	var x = _v0.a;
	return x;
};
var $elm$core$Array$treeFromBuilder = F2(
	function (nodeList, nodeListSize) {
		treeFromBuilder:
		while (true) {
			var newNodeSize = $elm$core$Basics$ceiling(nodeListSize / $elm$core$Array$branchFactor);
			if (newNodeSize === 1) {
				return A2($elm$core$Elm$JsArray$initializeFromList, $elm$core$Array$branchFactor, nodeList).a;
			} else {
				var $temp$nodeList = A2($elm$core$Array$compressNodes, nodeList, _List_Nil),
					$temp$nodeListSize = newNodeSize;
				nodeList = $temp$nodeList;
				nodeListSize = $temp$nodeListSize;
				continue treeFromBuilder;
			}
		}
	});
var $elm$core$Array$builderToArray = F2(
	function (reverseNodeList, builder) {
		if (!builder.i) {
			return A4(
				$elm$core$Array$Array_elm_builtin,
				$elm$core$Elm$JsArray$length(builder.l),
				$elm$core$Array$shiftStep,
				$elm$core$Elm$JsArray$empty,
				builder.l);
		} else {
			var treeLen = builder.i * $elm$core$Array$branchFactor;
			var depth = $elm$core$Basics$floor(
				A2($elm$core$Basics$logBase, $elm$core$Array$branchFactor, treeLen - 1));
			var correctNodeList = reverseNodeList ? $elm$core$List$reverse(builder.m) : builder.m;
			var tree = A2($elm$core$Array$treeFromBuilder, correctNodeList, builder.i);
			return A4(
				$elm$core$Array$Array_elm_builtin,
				$elm$core$Elm$JsArray$length(builder.l) + treeLen,
				A2($elm$core$Basics$max, 5, depth * $elm$core$Array$shiftStep),
				tree,
				builder.l);
		}
	});
var $elm$core$Basics$idiv = _Basics_idiv;
var $elm$core$Basics$lt = _Utils_lt;
var $elm$core$Array$initializeHelp = F5(
	function (fn, fromIndex, len, nodeList, tail) {
		initializeHelp:
		while (true) {
			if (fromIndex < 0) {
				return A2(
					$elm$core$Array$builderToArray,
					false,
					{m: nodeList, i: (len / $elm$core$Array$branchFactor) | 0, l: tail});
			} else {
				var leaf = $elm$core$Array$Leaf(
					A3($elm$core$Elm$JsArray$initialize, $elm$core$Array$branchFactor, fromIndex, fn));
				var $temp$fn = fn,
					$temp$fromIndex = fromIndex - $elm$core$Array$branchFactor,
					$temp$len = len,
					$temp$nodeList = A2($elm$core$List$cons, leaf, nodeList),
					$temp$tail = tail;
				fn = $temp$fn;
				fromIndex = $temp$fromIndex;
				len = $temp$len;
				nodeList = $temp$nodeList;
				tail = $temp$tail;
				continue initializeHelp;
			}
		}
	});
var $elm$core$Basics$remainderBy = _Basics_remainderBy;
var $elm$core$Array$initialize = F2(
	function (len, fn) {
		if (len <= 0) {
			return $elm$core$Array$empty;
		} else {
			var tailLen = len % $elm$core$Array$branchFactor;
			var tail = A3($elm$core$Elm$JsArray$initialize, tailLen, len - tailLen, fn);
			var initialFromIndex = (len - tailLen) - $elm$core$Array$branchFactor;
			return A5($elm$core$Array$initializeHelp, fn, initialFromIndex, len, _List_Nil, tail);
		}
	});
var $elm$core$Basics$True = 0;
var $elm$core$Result$isOk = function (result) {
	if (!result.$) {
		return true;
	} else {
		return false;
	}
};
var $elm$json$Json$Decode$map = _Json_map1;
var $elm$json$Json$Decode$map2 = _Json_map2;
var $elm$json$Json$Decode$succeed = _Json_succeed;
var $elm$virtual_dom$VirtualDom$toHandlerInt = function (handler) {
	switch (handler.$) {
		case 0:
			return 0;
		case 1:
			return 1;
		case 2:
			return 2;
		default:
			return 3;
	}
};
var $elm$browser$Browser$External = function (a) {
	return {$: 1, a: a};
};
var $elm$browser$Browser$Internal = function (a) {
	return {$: 0, a: a};
};
var $elm$core$Basics$identity = function (x) {
	return x;
};
var $elm$browser$Browser$Dom$NotFound = $elm$core$Basics$identity;
var $elm$url$Url$Http = 0;
var $elm$url$Url$Https = 1;
var $elm$url$Url$Url = F6(
	function (protocol, host, port_, path, query, fragment) {
		return {bd: fragment, bi: host, bv: path, bx: port_, bA: protocol, bB: query};
	});
var $elm$core$String$contains = _String_contains;
var $elm$core$String$length = _String_length;
var $elm$core$String$slice = _String_slice;
var $elm$core$String$dropLeft = F2(
	function (n, string) {
		return (n < 1) ? string : A3(
			$elm$core$String$slice,
			n,
			$elm$core$String$length(string),
			string);
	});
var $elm$core$String$indexes = _String_indexes;
var $elm$core$String$isEmpty = function (string) {
	return string === '';
};
var $elm$core$String$left = F2(
	function (n, string) {
		return (n < 1) ? '' : A3($elm$core$String$slice, 0, n, string);
	});
var $elm$core$String$toInt = _String_toInt;
var $elm$url$Url$chompBeforePath = F5(
	function (protocol, path, params, frag, str) {
		if ($elm$core$String$isEmpty(str) || A2($elm$core$String$contains, '@', str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, ':', str);
			if (!_v0.b) {
				return $elm$core$Maybe$Just(
					A6($elm$url$Url$Url, protocol, str, $elm$core$Maybe$Nothing, path, params, frag));
			} else {
				if (!_v0.b.b) {
					var i = _v0.a;
					var _v1 = $elm$core$String$toInt(
						A2($elm$core$String$dropLeft, i + 1, str));
					if (_v1.$ === 1) {
						return $elm$core$Maybe$Nothing;
					} else {
						var port_ = _v1;
						return $elm$core$Maybe$Just(
							A6(
								$elm$url$Url$Url,
								protocol,
								A2($elm$core$String$left, i, str),
								port_,
								path,
								params,
								frag));
					}
				} else {
					return $elm$core$Maybe$Nothing;
				}
			}
		}
	});
var $elm$url$Url$chompBeforeQuery = F4(
	function (protocol, params, frag, str) {
		if ($elm$core$String$isEmpty(str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, '/', str);
			if (!_v0.b) {
				return A5($elm$url$Url$chompBeforePath, protocol, '/', params, frag, str);
			} else {
				var i = _v0.a;
				return A5(
					$elm$url$Url$chompBeforePath,
					protocol,
					A2($elm$core$String$dropLeft, i, str),
					params,
					frag,
					A2($elm$core$String$left, i, str));
			}
		}
	});
var $elm$url$Url$chompBeforeFragment = F3(
	function (protocol, frag, str) {
		if ($elm$core$String$isEmpty(str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, '?', str);
			if (!_v0.b) {
				return A4($elm$url$Url$chompBeforeQuery, protocol, $elm$core$Maybe$Nothing, frag, str);
			} else {
				var i = _v0.a;
				return A4(
					$elm$url$Url$chompBeforeQuery,
					protocol,
					$elm$core$Maybe$Just(
						A2($elm$core$String$dropLeft, i + 1, str)),
					frag,
					A2($elm$core$String$left, i, str));
			}
		}
	});
var $elm$url$Url$chompAfterProtocol = F2(
	function (protocol, str) {
		if ($elm$core$String$isEmpty(str)) {
			return $elm$core$Maybe$Nothing;
		} else {
			var _v0 = A2($elm$core$String$indexes, '#', str);
			if (!_v0.b) {
				return A3($elm$url$Url$chompBeforeFragment, protocol, $elm$core$Maybe$Nothing, str);
			} else {
				var i = _v0.a;
				return A3(
					$elm$url$Url$chompBeforeFragment,
					protocol,
					$elm$core$Maybe$Just(
						A2($elm$core$String$dropLeft, i + 1, str)),
					A2($elm$core$String$left, i, str));
			}
		}
	});
var $elm$core$String$startsWith = _String_startsWith;
var $elm$url$Url$fromString = function (str) {
	return A2($elm$core$String$startsWith, 'http://', str) ? A2(
		$elm$url$Url$chompAfterProtocol,
		0,
		A2($elm$core$String$dropLeft, 7, str)) : (A2($elm$core$String$startsWith, 'https://', str) ? A2(
		$elm$url$Url$chompAfterProtocol,
		1,
		A2($elm$core$String$dropLeft, 8, str)) : $elm$core$Maybe$Nothing);
};
var $elm$core$Basics$never = function (_v0) {
	never:
	while (true) {
		var nvr = _v0;
		var $temp$_v0 = nvr;
		_v0 = $temp$_v0;
		continue never;
	}
};
var $elm$core$Task$Perform = $elm$core$Basics$identity;
var $elm$core$Task$succeed = _Scheduler_succeed;
var $elm$core$Task$init = $elm$core$Task$succeed(0);
var $elm$core$List$foldrHelper = F4(
	function (fn, acc, ctr, ls) {
		if (!ls.b) {
			return acc;
		} else {
			var a = ls.a;
			var r1 = ls.b;
			if (!r1.b) {
				return A2(fn, a, acc);
			} else {
				var b = r1.a;
				var r2 = r1.b;
				if (!r2.b) {
					return A2(
						fn,
						a,
						A2(fn, b, acc));
				} else {
					var c = r2.a;
					var r3 = r2.b;
					if (!r3.b) {
						return A2(
							fn,
							a,
							A2(
								fn,
								b,
								A2(fn, c, acc)));
					} else {
						var d = r3.a;
						var r4 = r3.b;
						var res = (ctr > 500) ? A3(
							$elm$core$List$foldl,
							fn,
							acc,
							$elm$core$List$reverse(r4)) : A4($elm$core$List$foldrHelper, fn, acc, ctr + 1, r4);
						return A2(
							fn,
							a,
							A2(
								fn,
								b,
								A2(
									fn,
									c,
									A2(fn, d, res))));
					}
				}
			}
		}
	});
var $elm$core$List$foldr = F3(
	function (fn, acc, ls) {
		return A4($elm$core$List$foldrHelper, fn, acc, 0, ls);
	});
var $elm$core$List$map = F2(
	function (f, xs) {
		return A3(
			$elm$core$List$foldr,
			F2(
				function (x, acc) {
					return A2(
						$elm$core$List$cons,
						f(x),
						acc);
				}),
			_List_Nil,
			xs);
	});
var $elm$core$Task$andThen = _Scheduler_andThen;
var $elm$core$Task$map = F2(
	function (func, taskA) {
		return A2(
			$elm$core$Task$andThen,
			function (a) {
				return $elm$core$Task$succeed(
					func(a));
			},
			taskA);
	});
var $elm$core$Task$map2 = F3(
	function (func, taskA, taskB) {
		return A2(
			$elm$core$Task$andThen,
			function (a) {
				return A2(
					$elm$core$Task$andThen,
					function (b) {
						return $elm$core$Task$succeed(
							A2(func, a, b));
					},
					taskB);
			},
			taskA);
	});
var $elm$core$Task$sequence = function (tasks) {
	return A3(
		$elm$core$List$foldr,
		$elm$core$Task$map2($elm$core$List$cons),
		$elm$core$Task$succeed(_List_Nil),
		tasks);
};
var $elm$core$Platform$sendToApp = _Platform_sendToApp;
var $elm$core$Task$spawnCmd = F2(
	function (router, _v0) {
		var task = _v0;
		return _Scheduler_spawn(
			A2(
				$elm$core$Task$andThen,
				$elm$core$Platform$sendToApp(router),
				task));
	});
var $elm$core$Task$onEffects = F3(
	function (router, commands, state) {
		return A2(
			$elm$core$Task$map,
			function (_v0) {
				return 0;
			},
			$elm$core$Task$sequence(
				A2(
					$elm$core$List$map,
					$elm$core$Task$spawnCmd(router),
					commands)));
	});
var $elm$core$Task$onSelfMsg = F3(
	function (_v0, _v1, _v2) {
		return $elm$core$Task$succeed(0);
	});
var $elm$core$Task$cmdMap = F2(
	function (tagger, _v0) {
		var task = _v0;
		return A2($elm$core$Task$map, tagger, task);
	});
_Platform_effectManagers['Task'] = _Platform_createManager($elm$core$Task$init, $elm$core$Task$onEffects, $elm$core$Task$onSelfMsg, $elm$core$Task$cmdMap);
var $elm$core$Task$command = _Platform_leaf('Task');
var $elm$core$Task$perform = F2(
	function (toMessage, task) {
		return $elm$core$Task$command(
			A2($elm$core$Task$map, toMessage, task));
	});
var $elm$browser$Browser$element = _Browser_element;
var $elm$core$Maybe$andThen = F2(
	function (callback, maybeValue) {
		if (!maybeValue.$) {
			var value = maybeValue.a;
			return callback(value);
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $author$project$St$Class = F5(
	function (name, _super, ivars, methods, builtin) {
		return {R: builtin, X: ivars, I: methods, aF: name, D: _super};
	});
var $author$project$St$VSys = function (a) {
	return {$: 9, a: a};
};
var $author$project$St$budget = 2000000;
var $author$project$St$builtinClasses = _List_fromArray(
	[
		_Utils_Tuple2('Object', $elm$core$Maybe$Nothing),
		_Utils_Tuple2(
		'UndefinedObject',
		$elm$core$Maybe$Just('Object')),
		_Utils_Tuple2(
		'Boolean',
		$elm$core$Maybe$Just('Object')),
		_Utils_Tuple2(
		'True',
		$elm$core$Maybe$Just('Boolean')),
		_Utils_Tuple2(
		'False',
		$elm$core$Maybe$Just('Boolean')),
		_Utils_Tuple2(
		'Magnitude',
		$elm$core$Maybe$Just('Object')),
		_Utils_Tuple2(
		'Number',
		$elm$core$Maybe$Just('Magnitude')),
		_Utils_Tuple2(
		'Integer',
		$elm$core$Maybe$Just('Number')),
		_Utils_Tuple2(
		'SmallInteger',
		$elm$core$Maybe$Just('Integer')),
		_Utils_Tuple2(
		'Float',
		$elm$core$Maybe$Just('Number')),
		_Utils_Tuple2(
		'Character',
		$elm$core$Maybe$Just('Magnitude')),
		_Utils_Tuple2(
		'Collection',
		$elm$core$Maybe$Just('Object')),
		_Utils_Tuple2(
		'ArrayedCollection',
		$elm$core$Maybe$Just('Collection')),
		_Utils_Tuple2(
		'Array',
		$elm$core$Maybe$Just('ArrayedCollection')),
		_Utils_Tuple2(
		'String',
		$elm$core$Maybe$Just('ArrayedCollection')),
		_Utils_Tuple2(
		'Symbol',
		$elm$core$Maybe$Just('String')),
		_Utils_Tuple2(
		'BlockClosure',
		$elm$core$Maybe$Just('Object')),
		_Utils_Tuple2(
		'TranscriptStream',
		$elm$core$Maybe$Just('Object')),
		_Utils_Tuple2(
		'SystemDictionary',
		$elm$core$Maybe$Just('Object'))
	]);
var $elm$core$Dict$RBEmpty_elm_builtin = {$: -2};
var $elm$core$Dict$empty = $elm$core$Dict$RBEmpty_elm_builtin;
var $elm$core$Dict$Black = 1;
var $elm$core$Dict$RBNode_elm_builtin = F5(
	function (a, b, c, d, e) {
		return {$: -1, a: a, b: b, c: c, d: d, e: e};
	});
var $elm$core$Dict$Red = 0;
var $elm$core$Dict$balance = F5(
	function (color, key, value, left, right) {
		if ((right.$ === -1) && (!right.a)) {
			var _v1 = right.a;
			var rK = right.b;
			var rV = right.c;
			var rLeft = right.d;
			var rRight = right.e;
			if ((left.$ === -1) && (!left.a)) {
				var _v3 = left.a;
				var lK = left.b;
				var lV = left.c;
				var lLeft = left.d;
				var lRight = left.e;
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					0,
					key,
					value,
					A5($elm$core$Dict$RBNode_elm_builtin, 1, lK, lV, lLeft, lRight),
					A5($elm$core$Dict$RBNode_elm_builtin, 1, rK, rV, rLeft, rRight));
			} else {
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					color,
					rK,
					rV,
					A5($elm$core$Dict$RBNode_elm_builtin, 0, key, value, left, rLeft),
					rRight);
			}
		} else {
			if ((((left.$ === -1) && (!left.a)) && (left.d.$ === -1)) && (!left.d.a)) {
				var _v5 = left.a;
				var lK = left.b;
				var lV = left.c;
				var _v6 = left.d;
				var _v7 = _v6.a;
				var llK = _v6.b;
				var llV = _v6.c;
				var llLeft = _v6.d;
				var llRight = _v6.e;
				var lRight = left.e;
				return A5(
					$elm$core$Dict$RBNode_elm_builtin,
					0,
					lK,
					lV,
					A5($elm$core$Dict$RBNode_elm_builtin, 1, llK, llV, llLeft, llRight),
					A5($elm$core$Dict$RBNode_elm_builtin, 1, key, value, lRight, right));
			} else {
				return A5($elm$core$Dict$RBNode_elm_builtin, color, key, value, left, right);
			}
		}
	});
var $elm$core$Basics$compare = _Utils_compare;
var $elm$core$Dict$insertHelp = F3(
	function (key, value, dict) {
		if (dict.$ === -2) {
			return A5($elm$core$Dict$RBNode_elm_builtin, 0, key, value, $elm$core$Dict$RBEmpty_elm_builtin, $elm$core$Dict$RBEmpty_elm_builtin);
		} else {
			var nColor = dict.a;
			var nKey = dict.b;
			var nValue = dict.c;
			var nLeft = dict.d;
			var nRight = dict.e;
			var _v1 = A2($elm$core$Basics$compare, key, nKey);
			switch (_v1) {
				case 0:
					return A5(
						$elm$core$Dict$balance,
						nColor,
						nKey,
						nValue,
						A3($elm$core$Dict$insertHelp, key, value, nLeft),
						nRight);
				case 1:
					return A5($elm$core$Dict$RBNode_elm_builtin, nColor, nKey, value, nLeft, nRight);
				default:
					return A5(
						$elm$core$Dict$balance,
						nColor,
						nKey,
						nValue,
						nLeft,
						A3($elm$core$Dict$insertHelp, key, value, nRight));
			}
		}
	});
var $elm$core$Dict$insert = F3(
	function (key, value, dict) {
		var _v0 = A3($elm$core$Dict$insertHelp, key, value, dict);
		if ((_v0.$ === -1) && (!_v0.a)) {
			var _v1 = _v0.a;
			var k = _v0.b;
			var v = _v0.c;
			var l = _v0.d;
			var r = _v0.e;
			return A5($elm$core$Dict$RBNode_elm_builtin, 1, k, v, l, r);
		} else {
			var x = _v0;
			return x;
		}
	});
var $elm$core$Dict$fromList = function (assocs) {
	return A3(
		$elm$core$List$foldl,
		F2(
			function (_v0, dict) {
				var key = _v0.a;
				var value = _v0.b;
				return A3($elm$core$Dict$insert, key, value, dict);
			}),
		$elm$core$Dict$empty,
		assocs);
};
var $author$project$St$boot = {
	c: $elm$core$Dict$fromList(
		A2(
			$elm$core$List$map,
			function (_v0) {
				var n = _v0.a;
				var s = _v0.b;
				return _Utils_Tuple2(
					n,
					A5($author$project$St$Class, n, s, _List_Nil, $elm$core$Dict$empty, true));
			},
			$author$project$St$builtinClasses)),
	K: $elm$core$Dict$empty,
	B: 0,
	C: $elm$core$Dict$fromList(
		_List_fromArray(
			[
				_Utils_Tuple2(
				'Transcript',
				$author$project$St$VSys('Transcript')),
				_Utils_Tuple2(
				'Smalltalk',
				$author$project$St$VSys('Smalltalk'))
			])),
	g: $elm$core$Dict$empty,
	aD: $author$project$St$budget,
	M: 1,
	bS: ''
};
var $elm$core$Basics$composeR = F3(
	function (f, g, x) {
		return g(
			f(x));
	});
var $elm$json$Json$Decode$bool = _Json_decodeBool;
var $elm$core$Dict$get = F2(
	function (targetKey, dict) {
		get:
		while (true) {
			if (dict.$ === -2) {
				return $elm$core$Maybe$Nothing;
			} else {
				var key = dict.b;
				var value = dict.c;
				var left = dict.d;
				var right = dict.e;
				var _v1 = A2($elm$core$Basics$compare, targetKey, key);
				switch (_v1) {
					case 0:
						var $temp$targetKey = targetKey,
							$temp$dict = left;
						targetKey = $temp$targetKey;
						dict = $temp$dict;
						continue get;
					case 1:
						return $elm$core$Maybe$Just(value);
					default:
						var $temp$targetKey = targetKey,
							$temp$dict = right;
						targetKey = $temp$targetKey;
						dict = $temp$dict;
						continue get;
				}
			}
		}
	});
var $elm$core$Result$map = F2(
	function (func, ra) {
		if (!ra.$) {
			var a = ra.a;
			return $elm$core$Result$Ok(
				func(a));
		} else {
			var e = ra.a;
			return $elm$core$Result$Err(e);
		}
	});
var $elm$core$Result$mapError = F2(
	function (f, result) {
		if (!result.$) {
			var v = result.a;
			return $elm$core$Result$Ok(v);
		} else {
			var e = result.a;
			return $elm$core$Result$Err(
				f(e));
		}
	});
var $author$project$St$Method = F5(
	function (selector, params, temps, body, source) {
		return {b3: body, P: params, aK: selector, dc: source, aL: temps};
	});
var $elm$core$Result$andThen = F2(
	function (callback, result) {
		if (!result.$) {
			var value = result.a;
			return callback(value);
		} else {
			var msg = result.a;
			return $elm$core$Result$Err(msg);
		}
	});
var $elm$core$String$concat = function (strings) {
	return A2($elm$core$String$join, '', strings);
};
var $author$project$St$tokText = function (t) {
	switch (t.$) {
		case 0:
			var s = t.a;
			return s;
		case 1:
			var s = t.a;
			return s;
		case 2:
			var s = t.a;
			return s;
		case 3:
			var n = t.a;
			return $elm$core$String$fromInt(n);
		case 5:
			var s = t.a;
			return '\u0027' + (s + '\u0027');
		case 6:
			var s = t.a;
			return '#' + s;
		default:
			return 'this';
	}
};
var $author$project$St$end = F2(
	function (rest, a) {
		if (!rest.b) {
			return $elm$core$Result$Ok(a);
		} else {
			var t = rest.a;
			return $elm$core$Result$Err(
				'unexpected ' + $author$project$St$tokText(t));
		}
	});
var $author$project$St$Assign = F2(
	function (a, b) {
		return {$: 4, a: a, b: b};
	});
var $author$project$St$BlockE = F3(
	function (a, b, c) {
		return {$: 7, a: a, b: b, c: c};
	});
var $author$project$St$Brace = function (a) {
	return {$: 2, a: a};
};
var $author$project$St$Cascade = F2(
	function (a, b) {
		return {$: 6, a: a, b: b};
	});
var $author$project$St$Do = function (a) {
	return {$: 0, a: a};
};
var $author$project$St$Lit = function (a) {
	return {$: 0, a: a};
};
var $author$project$St$Return = function (a) {
	return {$: 1, a: a};
};
var $author$project$St$Send = F3(
	function (a, b, c) {
		return {$: 5, a: a, b: b, c: c};
	});
var $author$project$St$VChar = function (a) {
	return {$: 7, a: a};
};
var $author$project$St$VFalse = {$: 2};
var $author$project$St$VFloat = function (a) {
	return {$: 4, a: a};
};
var $author$project$St$VInt = function (a) {
	return {$: 3, a: a};
};
var $author$project$St$VNil = {$: 0};
var $author$project$St$VStr = function (a) {
	return {$: 5, a: a};
};
var $author$project$St$VSym = function (a) {
	return {$: 6, a: a};
};
var $author$project$St$VTrue = {$: 1};
var $author$project$St$Var = function (a) {
	return {$: 3, a: a};
};
var $author$project$St$checkEnd = F2(
	function (after, res) {
		if (!after.b) {
			return $elm$core$Result$Ok(res);
		} else {
			switch (after.a.$) {
				case 15:
					var _v1 = after.a;
					return $elm$core$Result$Ok(res);
				case 17:
					var _v2 = after.a;
					return $elm$core$Result$Ok(res);
				default:
					var t = after.a;
					return $elm$core$Result$Err(
						'expected a period before ' + $author$project$St$tokText(t));
			}
		}
	});
var $elm$core$List$isEmpty = function (xs) {
	if (!xs.b) {
		return true;
	} else {
		return false;
	}
};
var $author$project$St$LitArray = function (a) {
	return {$: 1, a: a};
};
var $elm$core$Basics$negate = function (n) {
	return -n;
};
var $author$project$St$literalArray = F2(
	function (acc, ts) {
		var lit = F2(
			function (v, rest) {
				return A2(
					$author$project$St$literalArray,
					A2(
						$elm$core$List$cons,
						$author$project$St$Lit(v),
						acc),
					rest);
			});
		_v0$15:
		while (true) {
			if (ts.b) {
				switch (ts.a.$) {
					case 13:
						var _v1 = ts.a;
						var rest = ts.b;
						return $elm$core$Result$Ok(
							_Utils_Tuple2(
								$author$project$St$LitArray(
									$elm$core$List$reverse(acc)),
								rest));
					case 3:
						var n = ts.a.a;
						var rest = ts.b;
						return A2(
							lit,
							$author$project$St$VInt(n),
							rest);
					case 4:
						var f = ts.a.a;
						var rest = ts.b;
						return A2(
							lit,
							$author$project$St$VFloat(f),
							rest);
					case 5:
						var s = ts.a.a;
						var rest = ts.b;
						return A2(
							lit,
							$author$project$St$VStr(s),
							rest);
					case 6:
						var s = ts.a.a;
						var rest = ts.b;
						return A2(
							lit,
							$author$project$St$VSym(s),
							rest);
					case 7:
						var c = ts.a.a;
						var rest = ts.b;
						return A2(
							lit,
							$author$project$St$VChar(c),
							rest);
					case 0:
						switch (ts.a.a) {
							case 'nil':
								var rest = ts.b;
								return A2(lit, $author$project$St$VNil, rest);
							case 'true':
								var rest = ts.b;
								return A2(lit, $author$project$St$VTrue, rest);
							case 'false':
								var rest = ts.b;
								return A2(lit, $author$project$St$VFalse, rest);
							default:
								var s = ts.a.a;
								var rest = ts.b;
								return A2(
									lit,
									$author$project$St$VSym(s),
									rest);
						}
					case 1:
						var s = ts.a.a;
						var rest = ts.b;
						return A2(
							lit,
							$author$project$St$VSym(s),
							rest);
					case 2:
						if (((ts.a.a === '-') && ts.b.b) && (ts.b.a.$ === 3)) {
							var _v2 = ts.b;
							var n = _v2.a.a;
							var rest = _v2.b;
							return A2(
								lit,
								$author$project$St$VInt(-n),
								rest);
						} else {
							var s = ts.a.a;
							var rest = ts.b;
							return A2(
								lit,
								$author$project$St$VSym(s),
								rest);
						}
					case 12:
						var _v3 = ts.a;
						var rest = ts.b;
						return A2(
							$elm$core$Result$andThen,
							function (_v4) {
								var inner = _v4.a;
								var r = _v4.b;
								return A2(
									$author$project$St$literalArray,
									A2($elm$core$List$cons, inner, acc),
									r);
							},
							A2($author$project$St$literalArray, _List_Nil, rest));
					case 18:
						var _v5 = ts.a;
						var rest = ts.b;
						return A2(
							$elm$core$Result$andThen,
							function (_v6) {
								var inner = _v6.a;
								var r = _v6.b;
								return A2(
									$author$project$St$literalArray,
									A2($elm$core$List$cons, inner, acc),
									r);
							},
							A2($author$project$St$literalArray, _List_Nil, rest));
					default:
						break _v0$15;
				}
			} else {
				break _v0$15;
			}
		}
		return $elm$core$Result$Err('bad literal array');
	});
var $elm$core$Tuple$mapFirst = F2(
	function (func, _v0) {
		var x = _v0.a;
		var y = _v0.b;
		return _Utils_Tuple2(
			func(x),
			y);
	});
var $author$project$St$stmtExpr = function (s) {
	if (!s.$) {
		var e = s.a;
		return e;
	} else {
		var e = s.a;
		return e;
	}
};
var $author$project$St$temps = function (ts) {
	if (ts.b && (ts.a.$ === 19)) {
		var _v1 = ts.a;
		var rest = ts.b;
		var go = F2(
			function (names, r) {
				go:
				while (true) {
					_v2$2:
					while (true) {
						if (r.b) {
							switch (r.a.$) {
								case 0:
									var n = r.a.a;
									var more = r.b;
									var $temp$names = A2($elm$core$List$cons, n, names),
										$temp$r = more;
									names = $temp$names;
									r = $temp$r;
									continue go;
								case 19:
									var _v3 = r.a;
									var more = r.b;
									return $elm$core$Result$Ok(
										_Utils_Tuple2(
											$elm$core$List$reverse(names),
											more));
								default:
									break _v2$2;
							}
						} else {
							break _v2$2;
						}
					}
					return $elm$core$Result$Err('temporaries end with |');
				}
			});
		return A2(go, _List_Nil, rest);
	} else {
		return $elm$core$Result$Ok(
			_Utils_Tuple2(_List_Nil, ts));
	}
};
var $author$project$St$binaryExpr = function (ts) {
	var go = F2(
		function (recv, r) {
			_v58$2:
			while (true) {
				if (r.b) {
					switch (r.a.$) {
						case 2:
							var op = r.a.a;
							var more = r.b;
							return A2(
								$elm$core$Result$andThen,
								function (_v59) {
									var arg = _v59.a;
									var after = _v59.b;
									return A2(
										go,
										A3(
											$author$project$St$Send,
											recv,
											op,
											_List_fromArray(
												[arg])),
										after);
								},
								$author$project$St$unaryExpr(more));
						case 19:
							var _v60 = r.a;
							var more = r.b;
							return A2(
								$elm$core$Result$andThen,
								function (_v61) {
									var arg = _v61.a;
									var after = _v61.b;
									return A2(
										go,
										A3(
											$author$project$St$Send,
											recv,
											'|',
											_List_fromArray(
												[arg])),
										after);
								},
								$author$project$St$unaryExpr(more));
						default:
							break _v58$2;
					}
				} else {
					break _v58$2;
				}
			}
			return $elm$core$Result$Ok(
				_Utils_Tuple2(recv, r));
		});
	return A2(
		$elm$core$Result$andThen,
		function (_v62) {
			var e = _v62.a;
			var r = _v62.b;
			return A2(go, e, r);
		},
		$author$project$St$unaryExpr(ts));
};
var $author$project$St$block = function (ts) {
	var params = F2(
		function (acc, r) {
			params:
			while (true) {
				_v48$3:
				while (true) {
					if (r.b) {
						switch (r.a.$) {
							case 20:
								if (r.b.b && (!r.b.a.$)) {
									var _v49 = r.a;
									var _v50 = r.b;
									var p = _v50.a.a;
									var more = _v50.b;
									var $temp$acc = A2($elm$core$List$cons, p, acc),
										$temp$r = more;
									acc = $temp$acc;
									r = $temp$r;
									continue params;
								} else {
									break _v48$3;
								}
							case 19:
								var _v51 = r.a;
								var more = r.b;
								return $elm$core$Result$Ok(
									_Utils_Tuple2(
										$elm$core$List$reverse(acc),
										more));
							case 15:
								var _v52 = r.a;
								return $elm$core$List$isEmpty(acc) ? $elm$core$Result$Ok(
									_Utils_Tuple2(_List_Nil, r)) : $elm$core$Result$Err('block parameters end with |');
							default:
								break _v48$3;
						}
					} else {
						break _v48$3;
					}
				}
				return $elm$core$List$isEmpty(acc) ? $elm$core$Result$Ok(
					_Utils_Tuple2(_List_Nil, r)) : $elm$core$Result$Err('block parameters end with |');
			}
		});
	return A2(
		$elm$core$Result$andThen,
		function (_v53) {
			var ps = _v53.a;
			var r = _v53.b;
			return A2(
				$elm$core$Result$andThen,
				function (_v54) {
					var tmp = _v54.a;
					var r2 = _v54.b;
					return A2(
						$elm$core$Result$andThen,
						function (_v55) {
							var body = _v55.a;
							var r3 = _v55.b;
							if (r3.b && (r3.a.$ === 15)) {
								var _v57 = r3.a;
								var more = r3.b;
								return $elm$core$Result$Ok(
									_Utils_Tuple2(
										A3($author$project$St$BlockE, ps, tmp, body),
										more));
							} else {
								return $elm$core$Result$Err('expected ]');
							}
						},
						$author$project$St$statements(r2));
				},
				$author$project$St$temps(r));
		},
		A2(params, _List_Nil, ts));
};
var $author$project$St$cascade = F3(
	function (recv, msgs, ts) {
		if (ts.b && (ts.a.$ === 11)) {
			var _v46 = ts.a;
			var rest = ts.b;
			return A2(
				$elm$core$Result$andThen,
				function (_v47) {
					var m = _v47.a;
					var after = _v47.b;
					return A3(
						$author$project$St$cascade,
						recv,
						A2($elm$core$List$cons, m, msgs),
						after);
				},
				$author$project$St$message(rest));
		} else {
			return $elm$core$Result$Ok(
				_Utils_Tuple2(
					A2(
						$author$project$St$Cascade,
						recv,
						$elm$core$List$reverse(msgs)),
					ts));
		}
	});
var $author$project$St$expr = function (ts) {
	if (((ts.b && (!ts.a.$)) && ts.b.b) && (ts.b.a.$ === 8)) {
		var n = ts.a.a;
		var _v36 = ts.b;
		var _v37 = _v36.a;
		var rest = _v36.b;
		return A2(
			$elm$core$Result$map,
			$elm$core$Tuple$mapFirst(
				$author$project$St$Assign(n)),
			$author$project$St$expr(rest));
	} else {
		return A2(
			$elm$core$Result$andThen,
			function (_v38) {
				var e = _v38.a;
				var rest = _v38.b;
				var _v39 = _Utils_Tuple2(rest, e);
				if (_v39.a.b && (_v39.a.a.$ === 11)) {
					if (_v39.b.$ === 5) {
						var _v40 = _v39.a;
						var _v41 = _v40.a;
						var _v42 = _v39.b;
						var recv = _v42.a;
						var sel = _v42.b;
						var args = _v42.c;
						return A3(
							$author$project$St$cascade,
							recv,
							_List_fromArray(
								[
									_Utils_Tuple2(sel, args)
								]),
							rest);
					} else {
						var _v43 = _v39.a;
						var _v44 = _v43.a;
						return $elm$core$Result$Err('a cascade needs a message before ;');
					}
				} else {
					return $elm$core$Result$Ok(
						_Utils_Tuple2(e, rest));
				}
			},
			$author$project$St$keywordExpr(ts));
	}
};
var $author$project$St$keywordExpr = function (ts) {
	return A2(
		$elm$core$Result$andThen,
		function (_v31) {
			var recv = _v31.a;
			var rest = _v31.b;
			if (rest.b && (rest.a.$ === 1)) {
				return A2(
					$elm$core$Result$map,
					function (_v33) {
						var _v34 = _v33.a;
						var sel = _v34.a;
						var args = _v34.b;
						var r = _v33.b;
						return _Utils_Tuple2(
							A3($author$project$St$Send, recv, sel, args),
							r);
					},
					A3($author$project$St$keywordParts, _List_Nil, _List_Nil, rest));
			} else {
				return $elm$core$Result$Ok(
					_Utils_Tuple2(recv, rest));
			}
		},
		$author$project$St$binaryExpr(ts));
};
var $author$project$St$keywordParts = F3(
	function (kws, args, ts) {
		if (ts.b && (ts.a.$ === 1)) {
			var k = ts.a.a;
			var rest = ts.b;
			return A2(
				$elm$core$Result$andThen,
				function (_v30) {
					var a = _v30.a;
					var r = _v30.b;
					return A3(
						$author$project$St$keywordParts,
						A2($elm$core$List$cons, k, kws),
						A2($elm$core$List$cons, a, args),
						r);
				},
				$author$project$St$binaryExpr(rest));
		} else {
			return $elm$core$Result$Ok(
				_Utils_Tuple2(
					_Utils_Tuple2(
						$elm$core$String$concat(
							$elm$core$List$reverse(kws)),
						$elm$core$List$reverse(args)),
					ts));
		}
	});
var $author$project$St$message = function (ts) {
	_v25$3:
	while (true) {
		if (ts.b) {
			switch (ts.a.$) {
				case 0:
					var sel = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							_Utils_Tuple2(sel, _List_Nil),
							rest));
				case 2:
					var op = ts.a.a;
					var rest = ts.b;
					return A2(
						$elm$core$Result$map,
						function (_v26) {
							var arg = _v26.a;
							var r = _v26.b;
							return _Utils_Tuple2(
								_Utils_Tuple2(
									op,
									_List_fromArray(
										[arg])),
								r);
						},
						$author$project$St$unaryExpr(rest));
				case 1:
					return A2(
						$elm$core$Result$map,
						function (_v27) {
							var _v28 = _v27.a;
							var sel = _v28.a;
							var args = _v28.b;
							var r = _v27.b;
							return _Utils_Tuple2(
								_Utils_Tuple2(sel, args),
								r);
						},
						A3($author$project$St$keywordParts, _List_Nil, _List_Nil, ts));
				default:
					break _v25$3;
			}
		} else {
			break _v25$3;
		}
	}
	return $elm$core$Result$Err('expected a message after ;');
};
var $author$project$St$primary = function (ts) {
	_v11$12:
	while (true) {
		if (ts.b) {
			switch (ts.a.$) {
				case 0:
					var n = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							function () {
								switch (n) {
									case 'nil':
										return $author$project$St$Lit($author$project$St$VNil);
									case 'true':
										return $author$project$St$Lit($author$project$St$VTrue);
									case 'false':
										return $author$project$St$Lit($author$project$St$VFalse);
									default:
										return $author$project$St$Var(n);
								}
							}(),
							rest));
				case 3:
					var n = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							$author$project$St$Lit(
								$author$project$St$VInt(n)),
							rest));
				case 4:
					var f = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							$author$project$St$Lit(
								$author$project$St$VFloat(f)),
							rest));
				case 2:
					if ((ts.a.a === '-') && ts.b.b) {
						switch (ts.b.a.$) {
							case 3:
								var _v13 = ts.b;
								var n = _v13.a.a;
								var rest = _v13.b;
								return $elm$core$Result$Ok(
									_Utils_Tuple2(
										$author$project$St$Lit(
											$author$project$St$VInt(-n)),
										rest));
							case 4:
								var _v14 = ts.b;
								var f = _v14.a.a;
								var rest = _v14.b;
								return $elm$core$Result$Ok(
									_Utils_Tuple2(
										$author$project$St$Lit(
											$author$project$St$VFloat(-f)),
										rest));
							default:
								break _v11$12;
						}
					} else {
						break _v11$12;
					}
				case 5:
					var s = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							$author$project$St$Lit(
								$author$project$St$VStr(s)),
							rest));
				case 6:
					var s = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							$author$project$St$Lit(
								$author$project$St$VSym(s)),
							rest));
				case 7:
					var c = ts.a.a;
					var rest = ts.b;
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							$author$project$St$Lit(
								$author$project$St$VChar(c)),
							rest));
				case 12:
					var _v15 = ts.a;
					var rest = ts.b;
					return A2(
						$elm$core$Result$andThen,
						function (_v16) {
							var e = _v16.a;
							var r = _v16.b;
							if (r.b && (r.a.$ === 13)) {
								var _v18 = r.a;
								var more = r.b;
								return $elm$core$Result$Ok(
									_Utils_Tuple2(e, more));
							} else {
								return $elm$core$Result$Err('expected )');
							}
						},
						$author$project$St$expr(rest));
				case 14:
					var _v19 = ts.a;
					var rest = ts.b;
					return $author$project$St$block(rest);
				case 18:
					var _v20 = ts.a;
					var rest = ts.b;
					return A2($author$project$St$literalArray, _List_Nil, rest);
				case 16:
					var _v21 = ts.a;
					var rest = ts.b;
					return A2(
						$elm$core$Result$andThen,
						function (_v22) {
							var stmts = _v22.a;
							var r = _v22.b;
							if (r.b && (r.a.$ === 17)) {
								var _v24 = r.a;
								var more = r.b;
								return $elm$core$Result$Ok(
									_Utils_Tuple2(
										$author$project$St$Brace(
											A2($elm$core$List$map, $author$project$St$stmtExpr, stmts)),
										more));
							} else {
								return $elm$core$Result$Err('expected }');
							}
						},
						$author$project$St$statements(rest));
				default:
					break _v11$12;
			}
		} else {
			return $elm$core$Result$Err('unexpected end');
		}
	}
	var t = ts.a;
	return $elm$core$Result$Err(
		'unexpected ' + $author$project$St$tokText(t));
};
var $author$project$St$statements = function (ts) {
	var go = F2(
		function (acc, r) {
			go:
			while (true) {
				if (!r.b) {
					return $elm$core$Result$Ok(
						_Utils_Tuple2(
							$elm$core$List$reverse(acc),
							_List_Nil));
				} else {
					switch (r.a.$) {
						case 15:
							var _v3 = r.a;
							return $elm$core$Result$Ok(
								_Utils_Tuple2(
									$elm$core$List$reverse(acc),
									r));
						case 17:
							var _v4 = r.a;
							return $elm$core$Result$Ok(
								_Utils_Tuple2(
									$elm$core$List$reverse(acc),
									r));
						case 10:
							var _v5 = r.a;
							var more = r.b;
							var $temp$acc = acc,
								$temp$r = more;
							acc = $temp$acc;
							r = $temp$r;
							continue go;
						case 9:
							var _v6 = r.a;
							var more = r.b;
							return A2(
								$elm$core$Result$andThen,
								function (_v7) {
									var e = _v7.a;
									var after = _v7.b;
									return A2(
										go,
										A2(
											$elm$core$List$cons,
											$author$project$St$Return(e),
											acc),
										after);
								},
								$author$project$St$expr(more));
						default:
							return A2(
								$elm$core$Result$andThen,
								function (_v8) {
									var e = _v8.a;
									var after = _v8.b;
									if (after.b && (after.a.$ === 10)) {
										var _v10 = after.a;
										var more = after.b;
										return A2(
											go,
											A2(
												$elm$core$List$cons,
												$author$project$St$Do(e),
												acc),
											more);
									} else {
										return A2(
											$elm$core$Result$andThen,
											$author$project$St$checkEnd(after),
											A2(
												go,
												A2(
													$elm$core$List$cons,
													$author$project$St$Do(e),
													acc),
												after));
									}
								},
								$author$project$St$expr(r));
					}
				}
			}
		});
	return A2(go, _List_Nil, ts);
};
var $author$project$St$unaryExpr = function (ts) {
	var go = F2(
		function (recv, r) {
			go:
			while (true) {
				if (r.b && (!r.a.$)) {
					var sel = r.a.a;
					var more = r.b;
					var $temp$recv = A3($author$project$St$Send, recv, sel, _List_Nil),
						$temp$r = more;
					recv = $temp$recv;
					r = $temp$r;
					continue go;
				} else {
					return $elm$core$Result$Ok(
						_Utils_Tuple2(recv, r));
				}
			}
		});
	return A2(
		$elm$core$Result$andThen,
		function (_v1) {
			var e = _v1.a;
			var r = _v1.b;
			return A2(go, e, r);
		},
		$author$project$St$primary(ts));
};
var $elm$core$String$foldr = _String_foldr;
var $elm$core$String$toList = function (string) {
	return A3($elm$core$String$foldr, $elm$core$List$cons, _List_Nil, string);
};
var $author$project$St$TAssign = {$: 8};
var $author$project$St$TBar = {$: 19};
var $author$project$St$TBin = function (a) {
	return {$: 2, a: a};
};
var $author$project$St$TCaret = {$: 9};
var $author$project$St$TChar = function (a) {
	return {$: 7, a: a};
};
var $author$project$St$TColon = {$: 20};
var $author$project$St$TDot = {$: 10};
var $author$project$St$TFloat = function (a) {
	return {$: 4, a: a};
};
var $author$project$St$THashParen = {$: 18};
var $author$project$St$TId = function (a) {
	return {$: 0, a: a};
};
var $author$project$St$TInt = function (a) {
	return {$: 3, a: a};
};
var $author$project$St$TKw = function (a) {
	return {$: 1, a: a};
};
var $author$project$St$TLBrace = {$: 16};
var $author$project$St$TLBrack = {$: 14};
var $author$project$St$TLParen = {$: 12};
var $author$project$St$TRBrace = {$: 17};
var $author$project$St$TRBrack = {$: 15};
var $author$project$St$TRParen = {$: 13};
var $author$project$St$TSemi = {$: 11};
var $author$project$St$TStr = function (a) {
	return {$: 5, a: a};
};
var $author$project$St$TSym = function (a) {
	return {$: 6, a: a};
};
var $author$project$St$binChars = '+-*/\u005C<>=~,@%&?!';
var $author$project$St$dropUntil = F2(
	function (stop, cs) {
		dropUntil:
		while (true) {
			if (cs.b) {
				var c = cs.a;
				var rest = cs.b;
				if (_Utils_eq(c, stop)) {
					return $elm$core$Maybe$Just(rest);
				} else {
					var $temp$stop = stop,
						$temp$cs = rest;
					stop = $temp$stop;
					cs = $temp$cs;
					continue dropUntil;
				}
			} else {
				return $elm$core$Maybe$Nothing;
			}
		}
	});
var $elm$core$String$cons = _String_cons;
var $elm$core$String$fromChar = function (_char) {
	return A2($elm$core$String$cons, _char, '');
};
var $elm$core$String$fromList = _String_fromList;
var $author$project$St$spanHelp = F3(
	function (p, cs, acc) {
		spanHelp:
		while (true) {
			if (cs.b) {
				var c = cs.a;
				var rest = cs.b;
				if (p(c)) {
					var $temp$p = p,
						$temp$cs = rest,
						$temp$acc = A2($elm$core$List$cons, c, acc);
					p = $temp$p;
					cs = $temp$cs;
					acc = $temp$acc;
					continue spanHelp;
				} else {
					return _Utils_Tuple2(
						$elm$core$List$reverse(acc),
						cs);
				}
			} else {
				return _Utils_Tuple2(
					$elm$core$List$reverse(acc),
					_List_Nil);
			}
		}
	});
var $author$project$St$span = F2(
	function (p, cs) {
		return A3($author$project$St$spanHelp, p, cs, _List_Nil);
	});
var $author$project$St$stringLit = F2(
	function (cs, acc) {
		stringLit:
		while (true) {
			if (cs.b) {
				if ('\'' === cs.a) {
					if (cs.b.b && ('\'' === cs.b.a)) {
						var _v1 = cs.b;
						var rest = _v1.b;
						var $temp$cs = rest,
							$temp$acc = A2($elm$core$List$cons, '\'', acc);
						cs = $temp$cs;
						acc = $temp$acc;
						continue stringLit;
					} else {
						var rest = cs.b;
						return $elm$core$Result$Ok(
							_Utils_Tuple2(
								$elm$core$String$fromList(
									$elm$core$List$reverse(acc)),
								rest));
					}
				} else {
					var c = cs.a;
					var rest = cs.b;
					var $temp$cs = rest,
						$temp$acc = A2($elm$core$List$cons, c, acc);
					cs = $temp$cs;
					acc = $temp$acc;
					continue stringLit;
				}
			} else {
				return $elm$core$Result$Err('a string has no closing \u0027');
			}
		}
	});
var $elm$core$String$toFloat = _String_toFloat;
var $author$project$St$intTok = F3(
	function (ds, after, acc) {
		var _v19 = $elm$core$String$toInt(
			$elm$core$String$fromList(ds));
		if (!_v19.$) {
			var n = _v19.a;
			return A2(
				$author$project$St$tokenize,
				after,
				A2(
					$elm$core$List$cons,
					$author$project$St$TInt(n),
					acc));
		} else {
			return $elm$core$Result$Err('bad number');
		}
	});
var $author$project$St$tokenize = F2(
	function (cs, acc) {
		tokenize:
		while (true) {
			if (!cs.b) {
				return $elm$core$Result$Ok(
					$elm$core$List$reverse(acc));
			} else {
				var c = cs.a;
				var rest = cs.b;
				if ((c === ' ') || ((c === '\n') || ((c === '\t') || (c === '\r')))) {
					var $temp$cs = rest,
						$temp$acc = acc;
					cs = $temp$cs;
					acc = $temp$acc;
					continue tokenize;
				} else {
					if (c === '"') {
						var _v1 = A2($author$project$St$dropUntil, '"', rest);
						if (!_v1.$) {
							var after = _v1.a;
							var $temp$cs = after,
								$temp$acc = acc;
							cs = $temp$cs;
							acc = $temp$acc;
							continue tokenize;
						} else {
							return $elm$core$Result$Err('a comment has no closing \u0022');
						}
					} else {
						if (c === '\'') {
							return A2(
								$elm$core$Result$andThen,
								function (_v2) {
									var s = _v2.a;
									var after = _v2.b;
									return A2(
										$author$project$St$tokenize,
										after,
										A2(
											$elm$core$List$cons,
											$author$project$St$TStr(s),
											acc));
								},
								A2($author$project$St$stringLit, rest, _List_Nil));
						} else {
							if (c === '$') {
								if (rest.b) {
									var ch = rest.a;
									var after = rest.b;
									var $temp$cs = after,
										$temp$acc = A2(
										$elm$core$List$cons,
										$author$project$St$TChar(ch),
										acc);
									cs = $temp$cs;
									acc = $temp$acc;
									continue tokenize;
								} else {
									return $elm$core$Result$Err('$ needs a character');
								}
							} else {
								if (c === '#') {
									_v4$2:
									while (true) {
										if (rest.b) {
											switch (rest.a) {
												case '(':
													var after = rest.b;
													var $temp$cs = after,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$THashParen, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '\'':
													var after = rest.b;
													return A2(
														$elm$core$Result$andThen,
														function (_v5) {
															var s = _v5.a;
															var more = _v5.b;
															return A2(
																$author$project$St$tokenize,
																more,
																A2(
																	$elm$core$List$cons,
																	$author$project$St$TSym(s),
																	acc));
														},
														A2($author$project$St$stringLit, after, _List_Nil));
												default:
													break _v4$2;
											}
										} else {
											break _v4$2;
										}
									}
									var _v6 = A2(
										$author$project$St$span,
										function (x) {
											return $elm$core$Char$isAlphaNum(x) || ((x === ':') || (x === '_'));
										},
										rest);
									var w = _v6.a;
									var after = _v6.b;
									if ($elm$core$List$isEmpty(w)) {
										var _v7 = A2(
											$author$project$St$span,
											function (x) {
												return A2(
													$elm$core$String$contains,
													$elm$core$String$fromChar(x),
													$author$project$St$binChars);
											},
											rest);
										var op = _v7.a;
										var more = _v7.b;
										if ($elm$core$List$isEmpty(op)) {
											return $elm$core$Result$Err('# needs a symbol');
										} else {
											var $temp$cs = more,
												$temp$acc = A2(
												$elm$core$List$cons,
												$author$project$St$TSym(
													$elm$core$String$fromList(op)),
												acc);
											cs = $temp$cs;
											acc = $temp$acc;
											continue tokenize;
										}
									} else {
										var $temp$cs = after,
											$temp$acc = A2(
											$elm$core$List$cons,
											$author$project$St$TSym(
												$elm$core$String$fromList(w)),
											acc);
										cs = $temp$cs;
										acc = $temp$acc;
										continue tokenize;
									}
								} else {
									if ($elm$core$Char$isDigit(c)) {
										var _v8 = A2($author$project$St$span, $elm$core$Char$isDigit, rest);
										var ds = _v8.a;
										var after = _v8.b;
										if ((after.b && ('.' === after.a)) && after.b.b) {
											var _v10 = after.b;
											var d = _v10.a;
											var more = _v10.b;
											if ($elm$core$Char$isDigit(d)) {
												var _v11 = A2(
													$author$project$St$span,
													$elm$core$Char$isDigit,
													A2($elm$core$List$cons, d, more));
												var fs = _v11.a;
												var after2 = _v11.b;
												var _v12 = $elm$core$String$toFloat(
													$elm$core$String$fromList(
														A2(
															$elm$core$List$cons,
															c,
															_Utils_ap(
																ds,
																A2($elm$core$List$cons, '.', fs)))));
												if (!_v12.$) {
													var f = _v12.a;
													var $temp$cs = after2,
														$temp$acc = A2(
														$elm$core$List$cons,
														$author$project$St$TFloat(f),
														acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												} else {
													return $elm$core$Result$Err('bad number');
												}
											} else {
												return A3(
													$author$project$St$intTok,
													A2($elm$core$List$cons, c, ds),
													after,
													acc);
											}
										} else {
											return A3(
												$author$project$St$intTok,
												A2($elm$core$List$cons, c, ds),
												after,
												acc);
										}
									} else {
										if ($elm$core$Char$isAlpha(c) || (c === '_')) {
											var _v13 = A2(
												$author$project$St$span,
												function (x) {
													return $elm$core$Char$isAlphaNum(x) || (x === '_');
												},
												rest);
											var w = _v13.a;
											var after = _v13.b;
											var word = $elm$core$String$fromList(
												A2($elm$core$List$cons, c, w));
											if (after.b && (':' === after.a)) {
												if (after.b.b && ('=' === after.b.a)) {
													var _v15 = after.b;
													var $temp$cs = after,
														$temp$acc = A2(
														$elm$core$List$cons,
														$author$project$St$TId(word),
														acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												} else {
													var more = after.b;
													var $temp$cs = more,
														$temp$acc = A2(
														$elm$core$List$cons,
														$author$project$St$TKw(word + ':'),
														acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												}
											} else {
												var $temp$cs = after,
													$temp$acc = A2(
													$elm$core$List$cons,
													$author$project$St$TId(word),
													acc);
												cs = $temp$cs;
												acc = $temp$acc;
												continue tokenize;
											}
										} else {
											var _v16 = _Utils_Tuple2(c, rest);
											switch (_v16.a) {
												case ':':
													if (_v16.b.b && ('=' === _v16.b.a)) {
														var _v17 = _v16.b;
														var more = _v17.b;
														var $temp$cs = more,
															$temp$acc = A2($elm$core$List$cons, $author$project$St$TAssign, acc);
														cs = $temp$cs;
														acc = $temp$acc;
														continue tokenize;
													} else {
														var $temp$cs = rest,
															$temp$acc = A2($elm$core$List$cons, $author$project$St$TColon, acc);
														cs = $temp$cs;
														acc = $temp$acc;
														continue tokenize;
													}
												case '^':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TCaret, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '.':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TDot, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case ';':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TSemi, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '(':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TLParen, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case ')':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TRParen, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '[':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TLBrack, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case ']':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TRBrack, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '{':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TLBrace, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '}':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TRBrace, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												case '|':
													var $temp$cs = rest,
														$temp$acc = A2($elm$core$List$cons, $author$project$St$TBar, acc);
													cs = $temp$cs;
													acc = $temp$acc;
													continue tokenize;
												default:
													if (A2(
														$elm$core$String$contains,
														$elm$core$String$fromChar(c),
														$author$project$St$binChars)) {
														var _v18 = A2(
															$author$project$St$span,
															function (x) {
																return A2(
																	$elm$core$String$contains,
																	$elm$core$String$fromChar(x),
																	$author$project$St$binChars);
															},
															rest);
														var op = _v18.a;
														var more = _v18.b;
														var $temp$cs = more,
															$temp$acc = A2(
															$elm$core$List$cons,
															$author$project$St$TBin(
																$elm$core$String$fromList(
																	A2($elm$core$List$cons, c, op))),
															acc);
														cs = $temp$cs;
														acc = $temp$acc;
														continue tokenize;
													} else {
														return $elm$core$Result$Err(
															'unexpected character ' + $elm$core$String$fromChar(c));
													}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	});
var $author$project$St$parseMethod = function (src) {
	return A2(
		$elm$core$Result$andThen,
		function (ts) {
			return A2(
				$elm$core$Result$andThen,
				function (_v6) {
					var sel = _v6.a;
					var params = _v6.b;
					var rest = _v6.c;
					return A2(
						$elm$core$Result$andThen,
						function (_v7) {
							var tmp = _v7.a;
							var r = _v7.b;
							return A2(
								$elm$core$Result$andThen,
								function (_v8) {
									var body = _v8.a;
									var r2 = _v8.b;
									return A2(
										$author$project$St$end,
										r2,
										A5($author$project$St$Method, sel, params, tmp, body, src));
								},
								$author$project$St$statements(r));
						},
						$author$project$St$temps(rest));
				},
				function () {
					_v0$4:
					while (true) {
						if (ts.b) {
							switch (ts.a.$) {
								case 0:
									var sel = ts.a.a;
									var rest = ts.b;
									return $elm$core$Result$Ok(
										_Utils_Tuple3(sel, _List_Nil, rest));
								case 2:
									if (ts.b.b && (!ts.b.a.$)) {
										var op = ts.a.a;
										var _v1 = ts.b;
										var arg = _v1.a.a;
										var rest = _v1.b;
										return $elm$core$Result$Ok(
											_Utils_Tuple3(
												op,
												_List_fromArray(
													[arg]),
												rest));
									} else {
										break _v0$4;
									}
								case 19:
									if (ts.b.b && (!ts.b.a.$)) {
										var _v2 = ts.a;
										var _v3 = ts.b;
										var arg = _v3.a.a;
										var rest = _v3.b;
										return $elm$core$Result$Ok(
											_Utils_Tuple3(
												'|',
												_List_fromArray(
													[arg]),
												rest));
									} else {
										break _v0$4;
									}
								case 1:
									var go = F3(
										function (kws, args, r) {
											go:
											while (true) {
												if (((r.b && (r.a.$ === 1)) && r.b.b) && (!r.b.a.$)) {
													var k = r.a.a;
													var _v5 = r.b;
													var a = _v5.a.a;
													var more = _v5.b;
													var $temp$kws = A2($elm$core$List$cons, k, kws),
														$temp$args = A2($elm$core$List$cons, a, args),
														$temp$r = more;
													kws = $temp$kws;
													args = $temp$args;
													r = $temp$r;
													continue go;
												} else {
													return $elm$core$Result$Ok(
														_Utils_Tuple3(
															$elm$core$String$concat(
																$elm$core$List$reverse(kws)),
															$elm$core$List$reverse(args),
															r));
												}
											}
										});
									return A3(go, _List_Nil, _List_Nil, ts);
								default:
									break _v0$4;
							}
						} else {
							break _v0$4;
						}
					}
					return $elm$core$Result$Err('a method starts with its selector, such as  foo  or  at: i put: v');
				}());
		},
		A2(
			$author$project$St$tokenize,
			$elm$core$String$toList(src),
			_List_Nil));
};
var $elm$core$String$trim = _String_trim;
var $author$project$St$compile = F3(
	function (cls, src, m) {
		var _v0 = A2($elm$core$Dict$get, cls, m.c);
		if (_v0.$ === 1) {
			return $elm$core$Result$Err('no class ' + cls);
		} else {
			var c = _v0.a;
			return A2(
				$elm$core$Result$map,
				function (meth) {
					return _Utils_Tuple2(
						meth.aK,
						_Utils_update(
							m,
							{
								c: A3(
									$elm$core$Dict$insert,
									cls,
									_Utils_update(
										c,
										{
											I: A3($elm$core$Dict$insert, meth.aK, meth, c.I)
										}),
									m.c)
							}));
				},
				A2(
					$elm$core$Result$mapError,
					function (e) {
						return 'syntax: ' + e;
					},
					$author$project$St$parseMethod(
						$elm$core$String$trim(src))));
		}
	});
var $elm$json$Json$Decode$decodeString = _Json_runOnString;
var $elm$json$Json$Decode$field = _Json_decodeField;
var $elm$json$Json$Decode$list = _Json_decodeList;
var $elm$json$Json$Decode$map3 = _Json_map3;
var $elm$json$Json$Decode$map5 = _Json_map5;
var $elm$json$Json$Decode$null = _Json_decodeNull;
var $elm$json$Json$Decode$oneOf = _Json_oneOf;
var $elm$json$Json$Decode$nullable = function (decoder) {
	return $elm$json$Json$Decode$oneOf(
		_List_fromArray(
			[
				$elm$json$Json$Decode$null($elm$core$Maybe$Nothing),
				A2($elm$json$Json$Decode$map, $elm$core$Maybe$Just, decoder)
			]));
};
var $elm$core$Tuple$second = function (_v0) {
	var y = _v0.b;
	return y;
};
var $elm$json$Json$Decode$string = _Json_decodeString;
var $elm$core$Result$withDefault = F2(
	function (def, result) {
		if (!result.$) {
			var a = result.a;
			return a;
		} else {
			return def;
		}
	});
var $author$project$St$decodeImage = function (json) {
	var cls = A6(
		$elm$json$Json$Decode$map5,
		F5(
			function (n, s, iv, b, ms) {
				return {R: b, X: iv, I: ms, aF: n, D: s};
			}),
		A2($elm$json$Json$Decode$field, 'name', $elm$json$Json$Decode$string),
		A2(
			$elm$json$Json$Decode$field,
			'super',
			$elm$json$Json$Decode$nullable($elm$json$Json$Decode$string)),
		A2(
			$elm$json$Json$Decode$field,
			'ivars',
			$elm$json$Json$Decode$list($elm$json$Json$Decode$string)),
		A2($elm$json$Json$Decode$field, 'builtin', $elm$json$Json$Decode$bool),
		A2(
			$elm$json$Json$Decode$field,
			'methods',
			$elm$json$Json$Decode$list($elm$json$Json$Decode$string)));
	return A2(
		$elm$core$Result$map,
		function (_v0) {
			var w = _v0.a;
			var t = _v0.b;
			var cs = _v0.c;
			var m = A3(
				$elm$core$List$foldl,
				F2(
					function (c, mm) {
						var withClass = c.R ? mm : _Utils_update(
							mm,
							{
								c: A3(
									$elm$core$Dict$insert,
									c.aF,
									A5($author$project$St$Class, c.aF, c.D, c.X, $elm$core$Dict$empty, false),
									mm.c)
							});
						return A3(
							$elm$core$List$foldl,
							F2(
								function (src, m2) {
									return A2(
										$elm$core$Result$withDefault,
										m2,
										A2(
											$elm$core$Result$map,
											$elm$core$Tuple$second,
											A3($author$project$St$compile, c.aF, src, m2)));
								}),
							withClass,
							c.I);
					}),
				$author$project$St$boot,
				cs);
			return {
				e: _Utils_update(
					m,
					{bS: t}),
				bS: t,
				u: w
			};
		},
		A2(
			$elm$core$Result$mapError,
			$elm$json$Json$Decode$errorToString,
			A2(
				$elm$json$Json$Decode$decodeString,
				A4(
					$elm$json$Json$Decode$map3,
					F3(
						function (w, t, cs) {
							return _Utils_Tuple3(w, t, cs);
						}),
					A2($elm$json$Json$Decode$field, 'workspace', $elm$json$Json$Decode$string),
					A2($elm$json$Json$Decode$field, 'transcript', $elm$json$Json$Decode$string),
					A2(
						$elm$json$Json$Decode$field,
						'classes',
						$elm$json$Json$Decode$list(cls))),
				json)));
};
var $elm$json$Json$Decode$decodeValue = _Json_run;
var $author$project$Common$Flags = F3(
	function (scheme, sites, hash) {
		return {ct: hash, c9: scheme, bJ: sites};
	});
var $elm$json$Json$Decode$keyValuePairs = _Json_decodeKeyValuePairs;
var $elm$json$Json$Decode$dict = function (decoder) {
	return A2(
		$elm$json$Json$Decode$map,
		$elm$core$Dict$fromList,
		$elm$json$Json$Decode$keyValuePairs(decoder));
};
var $author$project$Common$flagsDecoder = A4(
	$elm$json$Json$Decode$map3,
	$author$project$Common$Flags,
	A2($elm$json$Json$Decode$field, 'scheme', $elm$json$Json$Decode$string),
	A2(
		$elm$json$Json$Decode$field,
		'sites',
		$elm$json$Json$Decode$dict($elm$json$Json$Decode$string)),
	$elm$json$Json$Decode$oneOf(
		_List_fromArray(
			[
				A2($elm$json$Json$Decode$field, 'hash', $elm$json$Json$Decode$string),
				$elm$json$Json$Decode$succeed('')
			])));
var $elm$core$Maybe$map = F2(
	function (f, maybe) {
		if (!maybe.$) {
			var value = maybe.a;
			return $elm$core$Maybe$Just(
				f(value));
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $elm$core$Platform$Cmd$batch = _Platform_batch;
var $elm$core$Platform$Cmd$none = $elm$core$Platform$Cmd$batch(_List_Nil);
var $elm$core$Result$toMaybe = function (result) {
	if (!result.$) {
		var v = result.a;
		return $elm$core$Maybe$Just(v);
	} else {
		return $elm$core$Maybe$Nothing;
	}
};
var $author$project$Smalltalk$welcome = '\u0022Welcome to Smalltalk in your browser.\u000APut the cursor on a line (or select some code) and press\u000ACtrl+D to do it or Ctrl+P to print it. Everything you make\u000Ais saved in this browser, so it is still here tomorrow.\u0022\u000A\u000A3 + 4 * 2.\u000A(1 to: 10) collect: [:i | i * i].\u000ATranscript show: \u0027Hello from oeiuwq!\u0027; cr.\u000A#(3 1 2) asSortedCollection.\u000A\u000A\u0022Teach numbers a new trick:\u0022\u000AInteger compile: \u0027fib ^self < 2 ifTrue: [self] ifFalse: [(self - 1) fib + (self - 2) fib]\u0027.\u000A15 fib.\u000A\u000A\u0022Make a class, then look at it in the System Browser:\u0022\u000AObject subclass: #Counter instanceVariableNames: \u0027n\u0027.\u000ACounter compile: \u0027increment n := (n ifNil: [0]) + 1. ^n\u0027.\u000Acounter := Counter new.\u000Acounter increment; increment; increment.\u000A';
var $elm$core$Maybe$withDefault = F2(
	function (_default, maybe) {
		if (!maybe.$) {
			var value = maybe.a;
			return value;
		} else {
			return _default;
		}
	});
var $author$project$Smalltalk$init = function (v) {
	var image = A2(
		$elm$core$Maybe$andThen,
		A2($elm$core$Basics$composeR, $author$project$St$decodeImage, $elm$core$Result$toMaybe),
		A2(
			$elm$core$Maybe$andThen,
			$elm$core$Basics$identity,
			$elm$core$Result$toMaybe(
				A2(
					$elm$json$Json$Decode$decodeValue,
					A2(
						$elm$json$Json$Decode$field,
						'stored',
						$elm$json$Json$Decode$nullable($elm$json$Json$Decode$string)),
					v))));
	var flags = A2(
		$elm$core$Result$withDefault,
		{ct: '', c9: '', bJ: $elm$core$Dict$empty},
		A2($elm$json$Json$Decode$decodeValue, $author$project$Common$flagsDecoder, v));
	return _Utils_Tuple2(
		{
			E: $elm$core$Maybe$Nothing,
			y: '',
			ah: false,
			aP: flags,
			e: A2(
				$elm$core$Maybe$withDefault,
				$author$project$St$boot,
				A2(
					$elm$core$Maybe$map,
					function ($) {
						return $.e;
					},
					image)),
			H: $elm$core$Maybe$Nothing,
			aw: _Utils_Tuple2(0, 0),
			o: _Utils_eq(image, $elm$core$Maybe$Nothing) ? 'A fresh image.' : 'Image restored from this browser.',
			u: A2(
				$elm$core$Maybe$withDefault,
				$author$project$Smalltalk$welcome,
				A2(
					$elm$core$Maybe$map,
					function ($) {
						return $.u;
					},
					image)),
			aB: false
		},
		$elm$core$Platform$Cmd$none);
};
var $elm$core$Platform$Sub$batch = _Platform_batch;
var $elm$core$Platform$Sub$none = $elm$core$Platform$Sub$batch(_List_Nil);
var $author$project$Smalltalk$DoIt = {$: 2};
var $author$project$Smalltalk$PrintIt = {$: 3};
var $elm$core$List$append = F2(
	function (xs, ys) {
		if (!ys.b) {
			return xs;
		} else {
			return A3($elm$core$List$foldr, $elm$core$List$cons, ys, xs);
		}
	});
var $elm$core$List$concat = function (lists) {
	return A3($elm$core$List$foldr, $elm$core$List$append, _List_Nil, lists);
};
var $elm$core$List$concatMap = F2(
	function (f, list) {
		return $elm$core$List$concat(
			A2($elm$core$List$map, f, list));
	});
var $elm$core$Dict$member = F2(
	function (key, dict) {
		var _v0 = A2($elm$core$Dict$get, key, dict);
		if (!_v0.$) {
			return true;
		} else {
			return false;
		}
	});
var $elm$core$Tuple$pair = F2(
	function (a, b) {
		return _Utils_Tuple2(a, b);
	});
var $elm$core$Dict$values = function (dict) {
	return A3(
		$elm$core$Dict$foldr,
		F3(
			function (key, value, valueList) {
				return A2($elm$core$List$cons, value, valueList);
			}),
		_List_Nil,
		dict);
};
var $author$project$St$collect = F2(
	function (keep, m) {
		var refs = function (v) {
			if (v.$ === 10) {
				var r = v.a;
				return _List_fromArray(
					[r]);
			} else {
				return _List_Nil;
			}
		};
		var mark = F2(
			function (_v0, work) {
				mark:
				while (true) {
					var objs = _v0.a;
					var envs = _v0.b;
					if (!work.b) {
						return _Utils_Tuple2(objs, envs);
					} else {
						var _v2 = work.a;
						var isEnv = _v2.a;
						var id = _v2.b;
						var rest = work.b;
						if (isEnv) {
							if (A2($elm$core$Dict$member, id, envs)) {
								var $temp$_v0 = _Utils_Tuple2(objs, envs),
									$temp$work = rest;
								_v0 = $temp$_v0;
								work = $temp$work;
								continue mark;
							} else {
								var _v3 = A2($elm$core$Dict$get, id, m.K);
								if (!_v3.$) {
									var e = _v3.a;
									var $temp$_v0 = _Utils_Tuple2(
										objs,
										A3($elm$core$Dict$insert, id, e, envs)),
										$temp$work = _Utils_ap(
										A2(
											$elm$core$List$map,
											$elm$core$Tuple$pair(false),
											A2(
												$elm$core$List$concatMap,
												refs,
												$elm$core$Dict$values(e.al))),
										_Utils_ap(
											A2(
												$elm$core$Maybe$withDefault,
												_List_Nil,
												A2(
													$elm$core$Maybe$map,
													function (p) {
														return _List_fromArray(
															[
																_Utils_Tuple2(true, p)
															]);
													},
													e.aG)),
											rest));
									_v0 = $temp$_v0;
									work = $temp$work;
									continue mark;
								} else {
									var $temp$_v0 = _Utils_Tuple2(objs, envs),
										$temp$work = rest;
									_v0 = $temp$_v0;
									work = $temp$work;
									continue mark;
								}
							}
						} else {
							if (A2($elm$core$Dict$member, id, objs)) {
								var $temp$_v0 = _Utils_Tuple2(objs, envs),
									$temp$work = rest;
								_v0 = $temp$_v0;
								work = $temp$work;
								continue mark;
							} else {
								var _v4 = A2($elm$core$Dict$get, id, m.g);
								if (!_v4.$) {
									var o = _v4.a;
									var $temp$_v0 = _Utils_Tuple2(
										A3($elm$core$Dict$insert, id, o, objs),
										envs),
										$temp$work = _Utils_ap(
										function () {
											switch (o.$) {
												case 0:
													var a = o.a;
													return A2(
														$elm$core$List$map,
														$elm$core$Tuple$pair(false),
														A2(
															$elm$core$List$concatMap,
															refs,
															$elm$core$Array$toList(a)));
												case 1:
													var fields = o.b;
													return A2(
														$elm$core$List$map,
														$elm$core$Tuple$pair(false),
														A2(
															$elm$core$List$concatMap,
															refs,
															$elm$core$Dict$values(fields)));
												default:
													var b = o.a;
													return A2(
														$elm$core$List$cons,
														_Utils_Tuple2(true, b.F),
														A2(
															$elm$core$List$map,
															$elm$core$Tuple$pair(false),
															refs(b.s)));
											}
										}(),
										rest);
									_v0 = $temp$_v0;
									work = $temp$work;
									continue mark;
								} else {
									var $temp$_v0 = _Utils_Tuple2(objs, envs),
										$temp$work = rest;
									_v0 = $temp$_v0;
									work = $temp$work;
									continue mark;
								}
							}
						}
					}
				}
			});
		var _v6 = A2(
			mark,
			_Utils_Tuple2($elm$core$Dict$empty, $elm$core$Dict$empty),
			A2(
				$elm$core$List$map,
				$elm$core$Tuple$pair(false),
				A2(
					$elm$core$List$concatMap,
					refs,
					_Utils_ap(
						keep,
						$elm$core$Dict$values(m.C)))));
		var heap = _v6.a;
		var envs2 = _v6.b;
		return _Utils_update(
			m,
			{K: envs2, g: heap});
	});
var $author$project$St$Block = F7(
	function (params, temps, body, env, home, self, cls) {
		return {b3: body, E: cls, F: env, S: home, P: params, s: self, aL: temps};
	});
var $author$project$St$Fail = function (a) {
	return {$: 2, a: a};
};
var $author$project$St$OArray = function (a) {
	return {$: 0, a: a};
};
var $author$project$St$OBlock = function (a) {
	return {$: 2, a: a};
};
var $author$project$St$Ret = F2(
	function (a, b) {
		return {$: 1, a: a, b: b};
	});
var $author$project$St$VClass = function (a) {
	return {$: 8, a: a};
};
var $author$project$St$VRef = function (a) {
	return {$: 10, a: a};
};
var $author$project$St$Value = function (a) {
	return {$: 0, a: a};
};
var $elm$core$Basics$abs = function (n) {
	return (n < 0) ? (-n) : n;
};
var $elm$core$List$any = F2(
	function (isOkay, list) {
		any:
		while (true) {
			if (!list.b) {
				return false;
			} else {
				var x = list.a;
				var xs = list.b;
				if (isOkay(x)) {
					return true;
				} else {
					var $temp$isOkay = isOkay,
						$temp$list = xs;
					isOkay = $temp$isOkay;
					list = $temp$list;
					continue any;
				}
			}
		}
	});
var $elm$core$Basics$composeL = F3(
	function (g, f, x) {
		return g(
			f(x));
	});
var $elm$core$Basics$not = _Basics_not;
var $elm$core$List$all = F2(
	function (isOkay, list) {
		return !A2(
			$elm$core$List$any,
			A2($elm$core$Basics$composeL, $elm$core$Basics$not, isOkay),
			list);
	});
var $author$project$St$alloc = F2(
	function (o, m) {
		return _Utils_Tuple2(
			$author$project$St$VRef(m.M),
			_Utils_update(
				m,
				{
					g: A3($elm$core$Dict$insert, m.M, o, m.g),
					M: m.M + 1
				}));
	});
var $author$project$St$andFlow = F3(
	function (flow, f, m) {
		if (!flow.$) {
			var v = flow.a;
			return f(v);
		} else {
			return _Utils_Tuple2(flow, m);
		}
	});
var $author$project$St$andThenVals = F2(
	function (f, _v0) {
		var r = _v0.a;
		var m = _v0.b;
		if (!r.$) {
			var vs = r.a;
			return A2(f, vs, m);
		} else {
			var flow = r.a;
			return _Utils_Tuple2(flow, m);
		}
	});
var $author$project$St$OInst = F2(
	function (a, b) {
		return {$: 1, a: a, b: b};
	});
var $author$project$St$classOf = F2(
	function (m, v) {
		switch (v.$) {
			case 0:
				return 'UndefinedObject';
			case 1:
				return 'True';
			case 2:
				return 'False';
			case 3:
				return 'SmallInteger';
			case 4:
				return 'Float';
			case 5:
				return 'String';
			case 6:
				return 'Symbol';
			case 7:
				return 'Character';
			case 8:
				return 'Class';
			case 9:
				if (v.a === 'Transcript') {
					return 'TranscriptStream';
				} else {
					return 'SystemDictionary';
				}
			default:
				var r = v.a;
				var _v1 = A2($elm$core$Dict$get, r, m.g);
				if (!_v1.$) {
					switch (_v1.a.$) {
						case 0:
							return 'Array';
						case 1:
							var _v2 = _v1.a;
							var c = _v2.a;
							return c;
						default:
							return 'BlockClosure';
					}
				} else {
					return 'Object';
				}
		}
	});
var $author$project$St$ivar = F2(
	function (ctx, m) {
		var _v0 = ctx.s;
		if (_v0.$ === 10) {
			var r = _v0.a;
			var _v1 = A2($elm$core$Dict$get, r, m.g);
			if ((!_v1.$) && (_v1.a.$ === 1)) {
				var _v2 = _v1.a;
				var fields = _v2.b;
				return $elm$core$Maybe$Just(fields);
			} else {
				return $elm$core$Maybe$Nothing;
			}
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $author$project$St$assign = F4(
	function (ctx, name, v, m) {
		var owner = function (id) {
			var _v0 = A2($elm$core$Dict$get, id, m.K);
			if (!_v0.$) {
				var e = _v0.a;
				return A2($elm$core$Dict$member, name, e.al) ? $elm$core$Maybe$Just(
					_Utils_Tuple2(id, e)) : A2($elm$core$Maybe$andThen, owner, e.aG);
			} else {
				return $elm$core$Maybe$Nothing;
			}
		};
		var _v1 = owner(ctx.F);
		if (!_v1.$) {
			var _v2 = _v1.a;
			var id = _v2.a;
			var e = _v2.b;
			return _Utils_update(
				m,
				{
					K: A3(
						$elm$core$Dict$insert,
						id,
						_Utils_update(
							e,
							{
								al: A3($elm$core$Dict$insert, name, v, e.al)
							}),
						m.K)
				});
		} else {
			var _v3 = _Utils_Tuple2(
				ctx.s,
				A2($author$project$St$ivar, ctx, m));
			if ((_v3.a.$ === 10) && (!_v3.b.$)) {
				var r = _v3.a.a;
				var fields = _v3.b.a;
				return A2($elm$core$Dict$member, name, fields) ? _Utils_update(
					m,
					{
						g: A3(
							$elm$core$Dict$insert,
							r,
							A2(
								$author$project$St$OInst,
								A2($author$project$St$classOf, m, ctx.s),
								A3($elm$core$Dict$insert, name, v, fields)),
							m.g)
					}) : _Utils_update(
					m,
					{
						C: A3($elm$core$Dict$insert, name, v, m.C)
					});
			} else {
				return _Utils_update(
					m,
					{
						C: A3($elm$core$Dict$insert, name, v, m.C)
					});
			}
		}
	});
var $elm$core$List$takeReverse = F3(
	function (n, list, kept) {
		takeReverse:
		while (true) {
			if (n <= 0) {
				return kept;
			} else {
				if (!list.b) {
					return kept;
				} else {
					var x = list.a;
					var xs = list.b;
					var $temp$n = n - 1,
						$temp$list = xs,
						$temp$kept = A2($elm$core$List$cons, x, kept);
					n = $temp$n;
					list = $temp$list;
					kept = $temp$kept;
					continue takeReverse;
				}
			}
		}
	});
var $elm$core$List$takeTailRec = F2(
	function (n, list) {
		return $elm$core$List$reverse(
			A3($elm$core$List$takeReverse, n, list, _List_Nil));
	});
var $elm$core$List$takeFast = F3(
	function (ctr, n, list) {
		if (n <= 0) {
			return _List_Nil;
		} else {
			var _v0 = _Utils_Tuple2(n, list);
			_v0$1:
			while (true) {
				_v0$5:
				while (true) {
					if (!_v0.b.b) {
						return list;
					} else {
						if (_v0.b.b.b) {
							switch (_v0.a) {
								case 1:
									break _v0$1;
								case 2:
									var _v2 = _v0.b;
									var x = _v2.a;
									var _v3 = _v2.b;
									var y = _v3.a;
									return _List_fromArray(
										[x, y]);
								case 3:
									if (_v0.b.b.b.b) {
										var _v4 = _v0.b;
										var x = _v4.a;
										var _v5 = _v4.b;
										var y = _v5.a;
										var _v6 = _v5.b;
										var z = _v6.a;
										return _List_fromArray(
											[x, y, z]);
									} else {
										break _v0$5;
									}
								default:
									if (_v0.b.b.b.b && _v0.b.b.b.b.b) {
										var _v7 = _v0.b;
										var x = _v7.a;
										var _v8 = _v7.b;
										var y = _v8.a;
										var _v9 = _v8.b;
										var z = _v9.a;
										var _v10 = _v9.b;
										var w = _v10.a;
										var tl = _v10.b;
										return (ctr > 1000) ? A2(
											$elm$core$List$cons,
											x,
											A2(
												$elm$core$List$cons,
												y,
												A2(
													$elm$core$List$cons,
													z,
													A2(
														$elm$core$List$cons,
														w,
														A2($elm$core$List$takeTailRec, n - 4, tl))))) : A2(
											$elm$core$List$cons,
											x,
											A2(
												$elm$core$List$cons,
												y,
												A2(
													$elm$core$List$cons,
													z,
													A2(
														$elm$core$List$cons,
														w,
														A3($elm$core$List$takeFast, ctr + 1, n - 4, tl)))));
									} else {
										break _v0$5;
									}
							}
						} else {
							if (_v0.a === 1) {
								break _v0$1;
							} else {
								break _v0$5;
							}
						}
					}
				}
				return list;
			}
			var _v1 = _v0.b;
			var x = _v1.a;
			return _List_fromArray(
				[x]);
		}
	});
var $elm$core$List$take = F2(
	function (n, list) {
		return A3($elm$core$List$takeFast, 0, n, list);
	});
var $author$project$St$blockArgs = F3(
	function (m, b, vals) {
		if (b.$ === 10) {
			var r = b.a;
			var _v1 = A2($elm$core$Dict$get, r, m.g);
			if ((!_v1.$) && (_v1.a.$ === 2)) {
				var blk = _v1.a.a;
				return A2(
					$elm$core$List$take,
					$elm$core$List$length(blk.P),
					vals);
			} else {
				return vals;
			}
		} else {
			return vals;
		}
	});
var $author$project$St$bool = function (b) {
	return b ? $author$project$St$VTrue : $author$project$St$VFalse;
};
var $author$project$St$article = function (c) {
	return A2(
		$elm$core$String$contains,
		A2($elm$core$String$left, 1, c),
		'AEIOU') ? 'an' : 'a';
};
var $elm$core$String$fromFloat = _String_fromNumber;
var $elm$core$String$replace = F3(
	function (before, after, string) {
		return A2(
			$elm$core$String$join,
			after,
			A2($elm$core$String$split, before, string));
	});
var $author$project$St$displayString = F2(
	function (m, v) {
		switch (v.$) {
			case 0:
				return 'nil';
			case 1:
				return 'true';
			case 2:
				return 'false';
			case 3:
				var n = v.a;
				return $elm$core$String$fromInt(n);
			case 4:
				var f = v.a;
				var s = $elm$core$String$fromFloat(f);
				return (A2($elm$core$String$contains, '.', s) || (A2($elm$core$String$contains, 'e', s) || (A2($elm$core$String$contains, 'N', s) || A2($elm$core$String$contains, 'I', s)))) ? s : (s + '.0');
			case 5:
				var s = v.a;
				return s;
			case 6:
				var s = v.a;
				return s;
			case 7:
				var c = v.a;
				return $elm$core$String$fromChar(c);
			case 8:
				var c = v.a;
				return c;
			case 9:
				var s = v.a;
				return (s === 'Transcript') ? 'a TranscriptStream' : 'Smalltalk';
			default:
				var r = v.a;
				var _v2 = A2($elm$core$Dict$get, r, m.g);
				if (!_v2.$) {
					switch (_v2.a.$) {
						case 0:
							var a = _v2.a.a;
							return '#(' + (A2(
								$elm$core$String$join,
								' ',
								A2(
									$elm$core$List$map,
									$author$project$St$printString(m),
									$elm$core$Array$toList(a))) + ')');
						case 1:
							var _v3 = _v2.a;
							var c = _v3.a;
							return $author$project$St$article(c) + (' ' + c);
						default:
							return 'a BlockClosure';
					}
				} else {
					return 'an Object';
				}
		}
	});
var $author$project$St$printString = F2(
	function (m, v) {
		switch (v.$) {
			case 5:
				var s = v.a;
				return '\u0027' + (A3($elm$core$String$replace, '\u0027', '\u0027\u0027', s) + '\u0027');
			case 6:
				var s = v.a;
				return '#' + s;
			case 7:
				var c = v.a;
				return '$' + $elm$core$String$fromChar(c);
			default:
				return A2($author$project$St$displayString, m, v);
		}
	});
var $author$project$St$dnu = F3(
	function (m, recv, sel) {
		return _Utils_Tuple2(
			$author$project$St$Fail(
				A2($author$project$St$printString, m, recv) + (' doesNotUnderstand: #' + sel)),
			m);
	});
var $author$project$St$ok = F2(
	function (v, m) {
		return _Utils_Tuple2(
			$author$project$St$Value(v),
			m);
	});
var $elm$core$Char$toLower = _Char_toLower;
var $elm$core$Char$toUpper = _Char_toUpper;
var $author$project$St$character = F4(
	function (c, sel, args, m) {
		var _v0 = _Utils_Tuple2(sel, args);
		_v0$10:
		while (true) {
			if (!_v0.b.b) {
				switch (_v0.a) {
					case 'asInteger':
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(
								$elm$core$Char$toCode(c)),
							m);
					case 'value':
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(
								$elm$core$Char$toCode(c)),
							m);
					case 'asUppercase':
						return A2(
							$author$project$St$ok,
							$author$project$St$VChar(
								$elm$core$Char$toUpper(c)),
							m);
					case 'asLowercase':
						return A2(
							$author$project$St$ok,
							$author$project$St$VChar(
								$elm$core$Char$toLower(c)),
							m);
					case 'isVowel':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(
								A2(
									$elm$core$String$contains,
									$elm$core$String$fromChar(
										$elm$core$Char$toLower(c)),
									'aeiou')),
							m);
					case 'isLetter':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(
								$elm$core$Char$isAlpha(c)),
							m);
					case 'isDigit':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(
								$elm$core$Char$isDigit(c)),
							m);
					case 'asString':
						return A2(
							$author$project$St$ok,
							$author$project$St$VStr(
								$elm$core$String$fromChar(c)),
							m);
					default:
						break _v0$10;
				}
			} else {
				if ((_v0.b.a.$ === 7) && (!_v0.b.b.b)) {
					switch (_v0.a) {
						case '<':
							var _v1 = _v0.b;
							var d = _v1.a.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									_Utils_cmp(c, d) < 0),
								m);
						case '>':
							var _v2 = _v0.b;
							var d = _v2.a.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									_Utils_cmp(c, d) > 0),
								m);
						default:
							break _v0$10;
					}
				} else {
					break _v0$10;
				}
			}
		}
		return A3(
			$author$project$St$dnu,
			m,
			$author$project$St$VChar(c),
			sel);
	});
var $author$project$St$allIvars = F2(
	function (m, c) {
		var _v0 = A2($elm$core$Dict$get, c, m.c);
		if (!_v0.$) {
			var cls = _v0.a;
			return _Utils_ap(
				A2(
					$elm$core$Maybe$withDefault,
					_List_Nil,
					A2(
						$elm$core$Maybe$map,
						$author$project$St$allIvars(m),
						cls.D)),
				cls.X);
		} else {
			return _List_Nil;
		}
	});
var $elm$core$Array$fromListHelp = F3(
	function (list, nodeList, nodeListSize) {
		fromListHelp:
		while (true) {
			var _v0 = A2($elm$core$Elm$JsArray$initializeFromList, $elm$core$Array$branchFactor, list);
			var jsArray = _v0.a;
			var remainingItems = _v0.b;
			if (_Utils_cmp(
				$elm$core$Elm$JsArray$length(jsArray),
				$elm$core$Array$branchFactor) < 0) {
				return A2(
					$elm$core$Array$builderToArray,
					true,
					{m: nodeList, i: nodeListSize, l: jsArray});
			} else {
				var $temp$list = remainingItems,
					$temp$nodeList = A2(
					$elm$core$List$cons,
					$elm$core$Array$Leaf(jsArray),
					nodeList),
					$temp$nodeListSize = nodeListSize + 1;
				list = $temp$list;
				nodeList = $temp$nodeList;
				nodeListSize = $temp$nodeListSize;
				continue fromListHelp;
			}
		}
	});
var $elm$core$Array$fromList = function (list) {
	if (!list.b) {
		return $elm$core$Array$empty;
	} else {
		return A3($elm$core$Array$fromListHelp, list, _List_Nil, 0);
	}
};
var $author$project$St$newArray = F2(
	function (vs, m) {
		return A2(
			$elm$core$Tuple$mapFirst,
			$author$project$St$Value,
			A2(
				$author$project$St$alloc,
				$author$project$St$OArray(
					$elm$core$Array$fromList(vs)),
				m));
	});
var $author$project$St$arrayWith = F4(
	function (c, args, m, sel) {
		return (c === 'Array') ? A2($author$project$St$newArray, args, m) : A3(
			$author$project$St$dnu,
			m,
			$author$project$St$VClass(c),
			sel);
	});
var $elm$core$Basics$neq = _Utils_notEqual;
var $elm$core$String$toUpper = _String_toUpper;
var $elm$core$String$words = _String_words;
var $author$project$St$define = F4(
	function (_super, name, ivars, m) {
		var _v0 = A2($elm$core$Dict$get, name, m.c);
		if (!_v0.$) {
			var existing = _v0.a;
			return existing.R ? _Utils_Tuple2(
				$author$project$St$Fail(name + ' is a built-in class'),
				m) : A2(
				$author$project$St$ok,
				$author$project$St$VClass(name),
				_Utils_update(
					m,
					{
						c: A3(
							$elm$core$Dict$insert,
							name,
							_Utils_update(
								existing,
								{
									X: $elm$core$String$words(ivars),
									D: $elm$core$Maybe$Just(_super)
								}),
							m.c)
					}));
		} else {
			return ((!_Utils_eq(
				A2($elm$core$String$left, 1, name),
				$elm$core$String$toUpper(
					A2($elm$core$String$left, 1, name)))) || (name === '')) ? _Utils_Tuple2(
				$author$project$St$Fail('class names start with an upper-case letter'),
				m) : A2(
				$author$project$St$ok,
				$author$project$St$VClass(name),
				_Utils_update(
					m,
					{
						c: A3(
							$elm$core$Dict$insert,
							name,
							A5(
								$author$project$St$Class,
								name,
								$elm$core$Maybe$Just(_super),
								$elm$core$String$words(ivars),
								$elm$core$Dict$empty,
								false),
							m.c)
					}));
		}
	});
var $elm$core$List$repeatHelp = F3(
	function (result, n, value) {
		repeatHelp:
		while (true) {
			if (n <= 0) {
				return result;
			} else {
				var $temp$result = A2($elm$core$List$cons, value, result),
					$temp$n = n - 1,
					$temp$value = value;
				result = $temp$result;
				n = $temp$n;
				value = $temp$value;
				continue repeatHelp;
			}
		}
	});
var $elm$core$List$repeat = F2(
	function (n, value) {
		return A3($elm$core$List$repeatHelp, _List_Nil, n, value);
	});
var $author$project$St$selectors = F2(
	function (m, cls) {
		return A2(
			$elm$core$Maybe$withDefault,
			_List_Nil,
			A2(
				$elm$core$Maybe$map,
				A2(
					$elm$core$Basics$composeR,
					function ($) {
						return $.I;
					},
					$elm$core$Dict$keys),
				A2($elm$core$Dict$get, cls, m.c)));
	});
var $author$project$St$classMsg = F4(
	function (c, sel, args, m) {
		var _v0 = _Utils_Tuple2(sel, args);
		_v0$14:
		while (true) {
			switch (_v0.a) {
				case 'new':
					if (!_v0.b.b) {
						return (c === 'Array') ? A2($author$project$St$newArray, _List_Nil, m) : (A2(
							$elm$core$Maybe$withDefault,
							true,
							A2(
								$elm$core$Maybe$map,
								function ($) {
									return $.R;
								},
								A2($elm$core$Dict$get, c, m.c))) ? _Utils_Tuple2(
							$author$project$St$Fail('cannot make a new ' + (c + ': use a literal')),
							m) : A2(
							$elm$core$Tuple$mapFirst,
							$author$project$St$Value,
							A2(
								$author$project$St$alloc,
								A2(
									$author$project$St$OInst,
									c,
									$elm$core$Dict$fromList(
										A2(
											$elm$core$List$map,
											function (v) {
												return _Utils_Tuple2(v, $author$project$St$VNil);
											},
											A2($author$project$St$allIvars, m, c)))),
								m)));
					} else {
						break _v0$14;
					}
				case 'new:':
					if ((_v0.b.b && (_v0.b.a.$ === 3)) && (!_v0.b.b.b)) {
						var _v1 = _v0.b;
						var n = _v1.a.a;
						return (c === 'Array') ? A2(
							$author$project$St$newArray,
							A2($elm$core$List$repeat, n, $author$project$St$VNil),
							m) : A3(
							$author$project$St$dnu,
							m,
							$author$project$St$VClass(c),
							sel);
					} else {
						break _v0$14;
					}
				case 'with:':
					return A4($author$project$St$arrayWith, c, args, m, sel);
				case 'with:with:':
					return A4($author$project$St$arrayWith, c, args, m, sel);
				case 'with:with:with:':
					return A4($author$project$St$arrayWith, c, args, m, sel);
				case 'name':
					if (!_v0.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VStr(c),
							m);
					} else {
						break _v0$14;
					}
				case 'superclass':
					if (!_v0.b.b) {
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VNil,
								A2(
									$elm$core$Maybe$map,
									$author$project$St$VClass,
									A2(
										$elm$core$Maybe$andThen,
										function ($) {
											return $.D;
										},
										A2($elm$core$Dict$get, c, m.c)))),
							m);
					} else {
						break _v0$14;
					}
				case 'selectors':
					if (!_v0.b.b) {
						return A2(
							$author$project$St$newArray,
							A2(
								$elm$core$List$map,
								$author$project$St$VSym,
								A2($author$project$St$selectors, m, c)),
							m);
					} else {
						break _v0$14;
					}
				case 'instanceVariableNames':
					if (!_v0.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VStr(
								A2(
									$elm$core$Maybe$withDefault,
									'',
									A2(
										$elm$core$Maybe$map,
										A2(
											$elm$core$Basics$composeR,
											function ($) {
												return $.X;
											},
											$elm$core$String$join(' ')),
										A2($elm$core$Dict$get, c, m.c)))),
							m);
					} else {
						break _v0$14;
					}
				case 'subclass:':
					if ((_v0.b.b && (_v0.b.a.$ === 6)) && (!_v0.b.b.b)) {
						var _v2 = _v0.b;
						var name = _v2.a.a;
						return A4($author$project$St$define, c, name, '', m);
					} else {
						break _v0$14;
					}
				case 'subclass:instanceVariableNames:':
					if ((((_v0.b.b && (_v0.b.a.$ === 6)) && _v0.b.b.b) && (_v0.b.b.a.$ === 5)) && (!_v0.b.b.b.b)) {
						var _v3 = _v0.b;
						var name = _v3.a.a;
						var _v4 = _v3.b;
						var iv = _v4.a.a;
						return A4($author$project$St$define, c, name, iv, m);
					} else {
						break _v0$14;
					}
				case 'subclass:instanceVariableNames:classVariableNames:package:':
					if ((((((_v0.b.b && (_v0.b.a.$ === 6)) && _v0.b.b.b) && (_v0.b.b.a.$ === 5)) && _v0.b.b.b.b) && _v0.b.b.b.b.b) && (!_v0.b.b.b.b.b.b)) {
						var _v5 = _v0.b;
						var name = _v5.a.a;
						var _v6 = _v5.b;
						var iv = _v6.a.a;
						var _v7 = _v6.b;
						var _v8 = _v7.b;
						return A4($author$project$St$define, c, name, iv, m);
					} else {
						break _v0$14;
					}
				case 'subclass:instanceVariableNames:classVariableNames:category:':
					if ((((((_v0.b.b && (_v0.b.a.$ === 6)) && _v0.b.b.b) && (_v0.b.b.a.$ === 5)) && _v0.b.b.b.b) && _v0.b.b.b.b.b) && (!_v0.b.b.b.b.b.b)) {
						var _v9 = _v0.b;
						var name = _v9.a.a;
						var _v10 = _v9.b;
						var iv = _v10.a.a;
						var _v11 = _v10.b;
						var _v12 = _v11.b;
						return A4($author$project$St$define, c, name, iv, m);
					} else {
						break _v0$14;
					}
				case 'compile:':
					if ((_v0.b.b && (_v0.b.a.$ === 5)) && (!_v0.b.b.b)) {
						var _v13 = _v0.b;
						var src = _v13.a.a;
						var _v14 = A3($author$project$St$compile, c, src, m);
						if (!_v14.$) {
							var _v15 = _v14.a;
							var sel2 = _v15.a;
							var m2 = _v15.b;
							return A2(
								$author$project$St$ok,
								$author$project$St$VSym(sel2),
								m2);
						} else {
							var e = _v14.a;
							return _Utils_Tuple2(
								$author$project$St$Fail(e),
								m);
						}
					} else {
						break _v0$14;
					}
				default:
					break _v0$14;
			}
		}
		return A3(
			$author$project$St$dnu,
			m,
			$author$project$St$VClass(c),
			sel);
	});
var $elm$core$List$drop = F2(
	function (n, list) {
		drop:
		while (true) {
			if (n <= 0) {
				return list;
			} else {
				if (!list.b) {
					return list;
				} else {
					var x = list.a;
					var xs = list.b;
					var $temp$n = n - 1,
						$temp$list = xs;
					n = $temp$n;
					list = $temp$list;
					continue drop;
				}
			}
		}
	});
var $elm$core$Array$length = function (_v0) {
	var len = _v0.a;
	return len;
};
var $author$project$St$equal = F3(
	function (m, a, b) {
		var _v0 = _Utils_Tuple2(a, b);
		_v0$3:
		while (true) {
			switch (_v0.a.$) {
				case 3:
					if (_v0.b.$ === 4) {
						var x = _v0.a.a;
						var y = _v0.b.a;
						return _Utils_eq(x, y);
					} else {
						break _v0$3;
					}
				case 4:
					if (_v0.b.$ === 3) {
						var x = _v0.a.a;
						var y = _v0.b.a;
						return _Utils_eq(x, y);
					} else {
						break _v0$3;
					}
				case 10:
					if (_v0.b.$ === 10) {
						var x = _v0.a.a;
						var y = _v0.b.a;
						var _v1 = _Utils_Tuple2(
							A2($elm$core$Dict$get, x, m.g),
							A2($elm$core$Dict$get, y, m.g));
						if ((((!_v1.a.$) && (!_v1.a.a.$)) && (!_v1.b.$)) && (!_v1.b.a.$)) {
							var p = _v1.a.a.a;
							var q = _v1.b.a.a;
							return _Utils_eq(
								$elm$core$Array$length(p),
								$elm$core$Array$length(q)) && A2(
								$elm$core$List$all,
								$elm$core$Basics$identity,
								A3(
									$elm$core$List$map2,
									$author$project$St$equal(m),
									$elm$core$Array$toList(p),
									$elm$core$Array$toList(q)));
						} else {
							return _Utils_eq(x, y);
						}
					} else {
						break _v0$3;
					}
				default:
					break _v0$3;
			}
		}
		return _Utils_eq(a, b);
	});
var $elm$core$List$filter = F2(
	function (isGood, list) {
		return A3(
			$elm$core$List$foldr,
			F2(
				function (x, xs) {
					return isGood(x) ? A2($elm$core$List$cons, x, xs) : xs;
				}),
			_List_Nil,
			list);
	});
var $elm$core$Char$fromCode = _Char_fromCode;
var $elm$core$Basics$modBy = _Basics_modBy;
var $author$project$St$gcd = F2(
	function (a, b) {
		gcd:
		while (true) {
			if (!b) {
				return a;
			} else {
				var $temp$a = b,
					$temp$b = A2($elm$core$Basics$modBy, b, a);
				a = $temp$a;
				b = $temp$b;
				continue gcd;
			}
		}
	});
var $elm$core$Basics$ge = _Utils_ge;
var $elm$core$Bitwise$and = _Bitwise_and;
var $elm$core$Bitwise$shiftRightZfBy = _Bitwise_shiftRightZfBy;
var $elm$core$Array$bitMask = 4294967295 >>> (32 - $elm$core$Array$shiftStep);
var $elm$core$Elm$JsArray$unsafeGet = _JsArray_unsafeGet;
var $elm$core$Array$getHelp = F3(
	function (shift, index, tree) {
		getHelp:
		while (true) {
			var pos = $elm$core$Array$bitMask & (index >>> shift);
			var _v0 = A2($elm$core$Elm$JsArray$unsafeGet, pos, tree);
			if (!_v0.$) {
				var subTree = _v0.a;
				var $temp$shift = shift - $elm$core$Array$shiftStep,
					$temp$index = index,
					$temp$tree = subTree;
				shift = $temp$shift;
				index = $temp$index;
				tree = $temp$tree;
				continue getHelp;
			} else {
				var values = _v0.a;
				return A2($elm$core$Elm$JsArray$unsafeGet, $elm$core$Array$bitMask & index, values);
			}
		}
	});
var $elm$core$Bitwise$shiftLeftBy = _Bitwise_shiftLeftBy;
var $elm$core$Array$tailIndex = function (len) {
	return (len >>> 5) << 5;
};
var $elm$core$Array$get = F2(
	function (index, _v0) {
		var len = _v0.a;
		var startShift = _v0.b;
		var tree = _v0.c;
		var tail = _v0.d;
		return ((index < 0) || (_Utils_cmp(index, len) > -1)) ? $elm$core$Maybe$Nothing : ((_Utils_cmp(
			index,
			$elm$core$Array$tailIndex(len)) > -1) ? $elm$core$Maybe$Just(
			A2($elm$core$Elm$JsArray$unsafeGet, $elm$core$Array$bitMask & index, tail)) : $elm$core$Maybe$Just(
			A3($elm$core$Array$getHelp, startShift, index, tree)));
	});
var $elm$core$List$head = function (list) {
	if (list.b) {
		var x = list.a;
		var xs = list.b;
		return $elm$core$Maybe$Just(x);
	} else {
		return $elm$core$Maybe$Nothing;
	}
};
var $author$project$St$inherits = F3(
	function (m, cls, ancestor) {
		return _Utils_eq(cls, ancestor) || A2(
			$elm$core$Maybe$withDefault,
			false,
			A2(
				$elm$core$Maybe$map,
				function (s) {
					return A3($author$project$St$inherits, m, s, ancestor);
				},
				A2(
					$elm$core$Maybe$andThen,
					function ($) {
						return $.D;
					},
					A2($elm$core$Dict$get, cls, m.c))));
	});
var $elm$core$Array$isEmpty = function (_v0) {
	var len = _v0.a;
	return !len;
};
var $elm$core$String$lines = _String_lines;
var $author$project$St$lookup = F3(
	function (m, cls, sel) {
		var _v0 = A2($elm$core$Dict$get, cls, m.c);
		if (!_v0.$) {
			var c = _v0.a;
			var _v1 = A2($elm$core$Dict$get, sel, c.I);
			if (!_v1.$) {
				var meth = _v1.a;
				return $elm$core$Maybe$Just(
					_Utils_Tuple2(cls, meth));
			} else {
				return A2(
					$elm$core$Maybe$andThen,
					function (s) {
						return A3($author$project$St$lookup, m, s, sel);
					},
					c.D);
			}
		} else {
			return $elm$core$Maybe$Nothing;
		}
	});
var $author$project$St$lookupVar = F3(
	function (ctx, name, m) {
		var inEnv = function (id) {
			var _v0 = A2($elm$core$Dict$get, id, m.K);
			if (!_v0.$) {
				var e = _v0.a;
				var _v1 = A2($elm$core$Dict$get, name, e.al);
				if (!_v1.$) {
					var v = _v1.a;
					return $elm$core$Maybe$Just(v);
				} else {
					return A2($elm$core$Maybe$andThen, inEnv, e.aG);
				}
			} else {
				return $elm$core$Maybe$Nothing;
			}
		};
		var _v2 = _Utils_Tuple2(
			name,
			inEnv(ctx.F));
		switch (_v2.a) {
			case 'self':
				return $elm$core$Result$Ok(ctx.s);
			case 'super':
				return $elm$core$Result$Ok(ctx.s);
			case 'thisContext':
				return $elm$core$Result$Ok($author$project$St$VNil);
			default:
				if (!_v2.b.$) {
					var v = _v2.b.a;
					return $elm$core$Result$Ok(v);
				} else {
					var _v3 = A2(
						$elm$core$Maybe$andThen,
						$elm$core$Dict$get(name),
						A2($author$project$St$ivar, ctx, m));
					if (!_v3.$) {
						var v = _v3.a;
						return $elm$core$Result$Ok(v);
					} else {
						var _v4 = A2($elm$core$Dict$get, name, m.C);
						if (!_v4.$) {
							var v = _v4.a;
							return $elm$core$Result$Ok(v);
						} else {
							return A2($elm$core$Dict$member, name, m.c) ? $elm$core$Result$Ok(
								$author$project$St$VClass(name)) : $elm$core$Result$Err(name + ' is not defined');
						}
					}
				}
		}
	});
var $author$project$St$maxDepth = 400;
var $elm$core$List$member = F2(
	function (x, xs) {
		return A2(
			$elm$core$List$any,
			function (a) {
				return _Utils_eq(a, x);
			},
			xs);
	});
var $elm$core$Basics$min = F2(
	function (x, y) {
		return (_Utils_cmp(x, y) < 0) ? x : y;
	});
var $author$project$St$Env = F2(
	function (vars, parent) {
		return {aG: parent, al: vars};
	});
var $author$project$St$newEnv = F3(
	function (vars, parent, m) {
		return _Utils_Tuple2(
			m.M,
			_Utils_update(
				m,
				{
					K: A3(
						$elm$core$Dict$insert,
						m.M,
						A2($author$project$St$Env, vars, parent),
						m.K),
					M: m.M + 1
				}));
	});
var $author$project$St$num = F6(
	function (ia, ib, fi, ff, a, b) {
		var _v0 = _Utils_Tuple2(ia, ib);
		if ((!_v0.a.$) && (!_v0.b.$)) {
			var x = _v0.a.a;
			var y = _v0.b.a;
			return $author$project$St$VInt(
				A2(fi, x, y));
		} else {
			return $author$project$St$VFloat(
				A2(ff, a, b));
		}
	});
var $author$project$St$numVal = function (v) {
	switch (v.$) {
		case 3:
			var n = v.a;
			return $elm$core$Maybe$Just(
				_Utils_Tuple2(
					n,
					$elm$core$Maybe$Just(n)));
		case 4:
			var f = v.a;
			return $elm$core$Maybe$Just(
				_Utils_Tuple2(f, $elm$core$Maybe$Nothing));
		default:
			return $elm$core$Maybe$Nothing;
	}
};
var $author$project$St$numF = function (v) {
	return A2(
		$elm$core$Maybe$withDefault,
		0,
		A2(
			$elm$core$Maybe$map,
			$elm$core$Tuple$first,
			$author$project$St$numVal(v)));
};
var $author$project$St$numI = function (v) {
	if (v.$ === 3) {
		var n = v.a;
		return $elm$core$Maybe$Just(n);
	} else {
		return $elm$core$Maybe$Nothing;
	}
};
var $author$project$St$order = F3(
	function (m, a, b) {
		var _v0 = _Utils_Tuple2(
			$author$project$St$numVal(a),
			$author$project$St$numVal(b));
		if ((!_v0.a.$) && (!_v0.b.$)) {
			var _v1 = _v0.a.a;
			var x = _v1.a;
			var _v2 = _v0.b.a;
			var y = _v2.a;
			return A2($elm$core$Basics$compare, x, y);
		} else {
			return A2(
				$elm$core$Basics$compare,
				A2($author$project$St$displayString, m, a),
				A2($author$project$St$displayString, m, b));
		}
	});
var $author$project$St$primitiveSelectors = F2(
	function (_v0, _v1) {
		return _List_fromArray(
			['printString', 'displayString', 'class', '=', '==']);
	});
var $elm$core$List$product = function (numbers) {
	return A3($elm$core$List$foldl, $elm$core$Basics$mul, 1, numbers);
};
var $author$project$St$radix = F2(
	function (base, n) {
		return ((base < 2) || (base > 36)) ? $elm$core$String$fromInt(n) : ((n < 0) ? ('-' + A2($author$project$St$radix, base, -n)) : ((_Utils_cmp(n, base) < 0) ? A3($elm$core$String$slice, n, n + 1, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') : _Utils_ap(
			A2($author$project$St$radix, base, (n / base) | 0),
			A2(
				$author$project$St$radix,
				base,
				A2($elm$core$Basics$modBy, base, n)))));
	});
var $elm$core$String$reverse = _String_reverse;
var $elm$core$Basics$round = _Basics_round;
var $elm$core$Elm$JsArray$unsafeSet = _JsArray_unsafeSet;
var $elm$core$Array$setHelp = F4(
	function (shift, index, value, tree) {
		var pos = $elm$core$Array$bitMask & (index >>> shift);
		var _v0 = A2($elm$core$Elm$JsArray$unsafeGet, pos, tree);
		if (!_v0.$) {
			var subTree = _v0.a;
			var newSub = A4($elm$core$Array$setHelp, shift - $elm$core$Array$shiftStep, index, value, subTree);
			return A3(
				$elm$core$Elm$JsArray$unsafeSet,
				pos,
				$elm$core$Array$SubTree(newSub),
				tree);
		} else {
			var values = _v0.a;
			var newLeaf = A3($elm$core$Elm$JsArray$unsafeSet, $elm$core$Array$bitMask & index, value, values);
			return A3(
				$elm$core$Elm$JsArray$unsafeSet,
				pos,
				$elm$core$Array$Leaf(newLeaf),
				tree);
		}
	});
var $elm$core$Array$set = F3(
	function (index, value, array) {
		var len = array.a;
		var startShift = array.b;
		var tree = array.c;
		var tail = array.d;
		return ((index < 0) || (_Utils_cmp(index, len) > -1)) ? array : ((_Utils_cmp(
			index,
			$elm$core$Array$tailIndex(len)) > -1) ? A4(
			$elm$core$Array$Array_elm_builtin,
			len,
			startShift,
			tree,
			A3($elm$core$Elm$JsArray$unsafeSet, $elm$core$Array$bitMask & index, value, tail)) : A4(
			$elm$core$Array$Array_elm_builtin,
			len,
			startShift,
			A4($elm$core$Array$setHelp, startShift, index, value, tree),
			tail));
	});
var $elm$core$List$singleton = function (value) {
	return _List_fromArray(
		[value]);
};
var $author$project$St$smalltalk = F4(
	function (s, sel, args, m) {
		var _v0 = _Utils_Tuple2(sel, args);
		_v0$3:
		while (true) {
			if (_v0.b.b && (_v0.b.a.$ === 6)) {
				if (_v0.b.b.b) {
					if ((_v0.a === 'at:put:') && (!_v0.b.b.b.b)) {
						var _v1 = _v0.b;
						var k = _v1.a.a;
						var _v2 = _v1.b;
						var v = _v2.a;
						return A2(
							$author$project$St$ok,
							v,
							_Utils_update(
								m,
								{
									C: A3($elm$core$Dict$insert, k, v, m.C)
								}));
					} else {
						break _v0$3;
					}
				} else {
					switch (_v0.a) {
						case 'at:':
							var _v3 = _v0.b;
							var k = _v3.a.a;
							var _v4 = A2($elm$core$Dict$get, k, m.C);
							if (!_v4.$) {
								var v = _v4.a;
								return A2($author$project$St$ok, v, m);
							} else {
								return _Utils_Tuple2(
									$author$project$St$Fail(k + ' is not defined'),
									m);
							}
						case 'includesKey:':
							var _v5 = _v0.b;
							var k = _v5.a.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									A2($elm$core$Dict$member, k, m.C) || A2($elm$core$Dict$member, k, m.c)),
								m);
						default:
							break _v0$3;
					}
				}
			} else {
				break _v0$3;
			}
		}
		return A3($author$project$St$dnu, m, s, sel);
	});
var $elm$core$List$sortWith = _List_sortWith;
var $elm$core$Basics$sqrt = _Basics_sqrt;
var $elm$core$String$toLower = _String_toLower;
var $author$project$St$transcript = F4(
	function (t, sel, args, m) {
		var _v0 = _Utils_Tuple2(sel, args);
		_v0$7:
		while (true) {
			if (_v0.b.b) {
				if (!_v0.b.b.b) {
					switch (_v0.a) {
						case 'show:':
							var _v1 = _v0.b;
							var x = _v1.a;
							return A2(
								$author$project$St$ok,
								t,
								_Utils_update(
									m,
									{
										bS: _Utils_ap(
											m.bS,
											A2($author$project$St$displayString, m, x))
									}));
						case 'print:':
							var _v2 = _v0.b;
							var x = _v2.a;
							return A2(
								$author$project$St$ok,
								t,
								_Utils_update(
									m,
									{
										bS: _Utils_ap(
											m.bS,
											A2($author$project$St$printString, m, x))
									}));
						case 'display:':
							var _v3 = _v0.b;
							var x = _v3.a;
							return A2(
								$author$project$St$ok,
								t,
								_Utils_update(
									m,
									{
										bS: _Utils_ap(
											m.bS,
											A2($author$project$St$displayString, m, x))
									}));
						default:
							break _v0$7;
					}
				} else {
					break _v0$7;
				}
			} else {
				switch (_v0.a) {
					case 'cr':
						return A2(
							$author$project$St$ok,
							t,
							_Utils_update(
								m,
								{bS: m.bS + '\u000A'}));
					case 'tab':
						return A2(
							$author$project$St$ok,
							t,
							_Utils_update(
								m,
								{bS: m.bS + '\u0009'}));
					case 'space':
						return A2(
							$author$project$St$ok,
							t,
							_Utils_update(
								m,
								{bS: m.bS + ' '}));
					case 'clear':
						return A2(
							$author$project$St$ok,
							t,
							_Utils_update(
								m,
								{bS: ''}));
					default:
						break _v0$7;
				}
			}
		}
		return A3($author$project$St$dnu, m, t, sel);
	});
var $elm$core$Basics$truncate = _Basics_truncate;
var $author$project$St$array = F6(
	function (ctx, r, a, sel, args, m) {
		var self = $author$project$St$VRef(r);
		var items = $elm$core$Array$toList(a);
		var mapped = F2(
			function (blk, f) {
				return A2(
					$author$project$St$andThenVals,
					f,
					A4(
						$author$project$St$mapVals,
						ctx,
						blk,
						A2($elm$core$List$map, $elm$core$List$singleton, items),
						m));
			});
		var truthy = function (vs) {
			return A3($elm$core$List$map2, $elm$core$Tuple$pair, items, vs);
		};
		var bounds = F2(
			function (i, f) {
				return ((i >= 1) && (_Utils_cmp(
					i,
					$elm$core$Array$length(a)) < 1)) ? f(i - 1) : _Utils_Tuple2(
					$author$project$St$Fail(
						'index ' + ($elm$core$String$fromInt(i) + ' is out of bounds')),
					m);
			});
		var _v110 = _Utils_Tuple2(sel, args);
		_v110$24:
		while (true) {
			if (!_v110.b.b) {
				switch (_v110.a) {
					case 'size':
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(
								$elm$core$Array$length(a)),
							m);
					case 'first':
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VNil,
								A2($elm$core$Array$get, 0, a)),
							m);
					case 'last':
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VNil,
								A2(
									$elm$core$Array$get,
									$elm$core$Array$length(a) - 1,
									a)),
							m);
					case 'isEmpty':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(
								$elm$core$Array$isEmpty(a)),
							m);
					case 'notEmpty':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(
								!$elm$core$Array$isEmpty(a)),
							m);
					case 'reversed':
						return A2(
							$author$project$St$newArray,
							$elm$core$List$reverse(items),
							m);
					case 'sum':
						return A3(
							$elm$core$List$foldl,
							F2(
								function (v, _v136) {
									var flow = _v136.a;
									var mm = _v136.b;
									return A3(
										$author$project$St$andFlow,
										flow,
										function (accV) {
											return A6(
												$author$project$St$number,
												ctx,
												$author$project$St$numF(accV),
												$author$project$St$numI(accV),
												'+',
												_List_fromArray(
													[v]),
												mm);
										},
										mm);
								}),
							_Utils_Tuple2(
								$author$project$St$Value(
									$author$project$St$VInt(0)),
								m),
							items);
					case 'max':
						return A3(
							$elm$core$List$foldl,
							F2(
								function (v, _v137) {
									var flow = _v137.a;
									var mm = _v137.b;
									return A3(
										$author$project$St$andFlow,
										flow,
										function (accV) {
											return A6(
												$author$project$St$number,
												ctx,
												$author$project$St$numF(accV),
												$author$project$St$numI(accV),
												'max:',
												_List_fromArray(
													[v]),
												mm);
										},
										mm);
								}),
							_Utils_Tuple2(
								$author$project$St$Value(
									A2(
										$elm$core$Maybe$withDefault,
										$author$project$St$VNil,
										$elm$core$List$head(items))),
								m),
							A2($elm$core$List$drop, 1, items));
					case 'asSortedCollection':
						return A2(
							$author$project$St$newArray,
							A2(
								$elm$core$List$sortWith,
								$author$project$St$order(m),
								items),
							m);
					case 'sorted':
						return A2(
							$author$project$St$newArray,
							A2(
								$elm$core$List$sortWith,
								$author$project$St$order(m),
								items),
							m);
					case 'asArray':
						return A2($author$project$St$newArray, items, m);
					default:
						break _v110$24;
				}
			} else {
				if (_v110.b.b.b) {
					if (!_v110.b.b.b.b) {
						switch (_v110.a) {
							case 'at:put:':
								if (_v110.b.a.$ === 3) {
									var _v112 = _v110.b;
									var i = _v112.a.a;
									var _v113 = _v112.b;
									var v = _v113.a;
									return A2(
										bounds,
										i,
										function (j) {
											return A2(
												$author$project$St$ok,
												v,
												_Utils_update(
													m,
													{
														g: A3(
															$elm$core$Dict$insert,
															r,
															$author$project$St$OArray(
																A3($elm$core$Array$set, j, v, a)),
															m.g)
													}));
										});
								} else {
									break _v110$24;
								}
							case 'detect:ifNone:':
								var _v125 = _v110.b;
								var blk = _v125.a;
								var _v126 = _v125.b;
								var none = _v126.a;
								return A2(
									mapped,
									blk,
									F2(
										function (vs, mm) {
											var _v127 = $elm$core$List$head(
												A2(
													$elm$core$List$filter,
													function (_v128) {
														var t = _v128.b;
														return _Utils_eq(t, $author$project$St$VTrue);
													},
													truthy(vs)));
											if (!_v127.$) {
												var _v129 = _v127.a;
												var v = _v129.a;
												return A2($author$project$St$ok, v, mm);
											} else {
												return A4($author$project$St$callBlock, ctx, none, _List_Nil, mm);
											}
										}));
							case 'inject:into:':
								var _v130 = _v110.b;
								var start = _v130.a;
								var _v131 = _v130.b;
								var blk = _v131.a;
								return A3(
									$elm$core$List$foldl,
									F2(
										function (v, _v132) {
											var flow = _v132.a;
											var mm = _v132.b;
											if (!flow.$) {
												var accV = flow.a;
												return A4(
													$author$project$St$callBlock,
													ctx,
													blk,
													_List_fromArray(
														[accV, v]),
													mm);
											} else {
												return _Utils_Tuple2(flow, mm);
											}
										}),
									_Utils_Tuple2(
										$author$project$St$Value(start),
										m),
									items);
							default:
								break _v110$24;
						}
					} else {
						break _v110$24;
					}
				} else {
					switch (_v110.a) {
						case 'at:':
							if (_v110.b.a.$ === 3) {
								var _v111 = _v110.b;
								var i = _v111.a.a;
								return A2(
									bounds,
									i,
									function (j) {
										return A2(
											$author$project$St$ok,
											A2(
												$elm$core$Maybe$withDefault,
												$author$project$St$VNil,
												A2($elm$core$Array$get, j, a)),
											m);
									});
							} else {
								break _v110$24;
							}
						case 'includes:':
							var _v114 = _v110.b;
							var x = _v114.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									A2(
										$elm$core$List$any,
										A2($author$project$St$equal, m, x),
										items)),
								m);
						case 'do:':
							var _v115 = _v110.b;
							var blk = _v115.a;
							return A5($author$project$St$each, ctx, blk, items, self, m);
						case 'doWithIndex:':
							var _v116 = _v110.b;
							var blk = _v116.a;
							return A2(
								$author$project$St$andThenVals,
								F2(
									function (_v117, mm) {
										return A2($author$project$St$ok, self, mm);
									}),
								A4(
									$author$project$St$mapVals,
									ctx,
									blk,
									A2(
										$elm$core$List$indexedMap,
										F2(
											function (i, v) {
												return _List_fromArray(
													[
														v,
														$author$project$St$VInt(i + 1)
													]);
											}),
										items),
									m));
						case 'keysAndValuesDo:':
							var _v118 = _v110.b;
							var blk = _v118.a;
							return A2(
								$author$project$St$andThenVals,
								F2(
									function (_v119, mm) {
										return A2($author$project$St$ok, self, mm);
									}),
								A4(
									$author$project$St$mapVals,
									ctx,
									blk,
									A2(
										$elm$core$List$indexedMap,
										F2(
											function (i, v) {
												return _List_fromArray(
													[
														$author$project$St$VInt(i + 1),
														v
													]);
											}),
										items),
									m));
						case 'collect:':
							var _v120 = _v110.b;
							var blk = _v120.a;
							return A2(mapped, blk, $author$project$St$newArray);
						case 'select:':
							var _v121 = _v110.b;
							var blk = _v121.a;
							return A2(
								mapped,
								blk,
								function (vs) {
									return $author$project$St$newArray(
										A2(
											$elm$core$List$map,
											$elm$core$Tuple$first,
											A2(
												$elm$core$List$filter,
												function (_v122) {
													var t = _v122.b;
													return _Utils_eq(t, $author$project$St$VTrue);
												},
												truthy(vs))));
								});
						case 'reject:':
							var _v123 = _v110.b;
							var blk = _v123.a;
							return A2(
								mapped,
								blk,
								function (vs) {
									return $author$project$St$newArray(
										A2(
											$elm$core$List$map,
											$elm$core$Tuple$first,
											A2(
												$elm$core$List$filter,
												function (_v124) {
													var t = _v124.b;
													return !_Utils_eq(t, $author$project$St$VTrue);
												},
												truthy(vs))));
								});
						case ',':
							if (_v110.b.a.$ === 10) {
								var _v134 = _v110.b;
								var o = _v134.a.a;
								var _v135 = A2($elm$core$Dict$get, o, m.g);
								if ((!_v135.$) && (!_v135.a.$)) {
									var b = _v135.a.a;
									return A2(
										$author$project$St$newArray,
										_Utils_ap(
											items,
											$elm$core$Array$toList(b)),
										m);
								} else {
									return A3($author$project$St$dnu, m, self, sel);
								}
							} else {
								break _v110$24;
							}
						case 'copyWith:':
							var _v138 = _v110.b;
							var x = _v138.a;
							return A2(
								$author$project$St$newArray,
								_Utils_ap(
									items,
									_List_fromArray(
										[x])),
								m);
						default:
							break _v110$24;
					}
				}
			}
		}
		return A3($author$project$St$dnu, m, self, sel);
	});
var $author$project$St$blockMsg = F5(
	function (ctx, b, sel, args, m) {
		var _while = F3(
			function (want, body, mm) {
				_while:
				while (true) {
					var _v100 = A4($author$project$St$callBlock, ctx, b, _List_Nil, mm);
					if (!_v100.a.$) {
						var v = _v100.a.a;
						var m2 = _v100.b;
						if (_Utils_eq(v, want)) {
							if (!body.$) {
								var blk = body.a;
								var _v102 = A4($author$project$St$callBlock, ctx, blk, _List_Nil, m2);
								if (!_v102.a.$) {
									var m3 = _v102.b;
									var $temp$want = want,
										$temp$body = body,
										$temp$mm = m3;
									want = $temp$want;
									body = $temp$body;
									mm = $temp$mm;
									continue _while;
								} else {
									var other = _v102;
									return other;
								}
							} else {
								var $temp$want = want,
									$temp$body = body,
									$temp$mm = m2;
								want = $temp$want;
								body = $temp$body;
								mm = $temp$mm;
								continue _while;
							}
						} else {
							return _Utils_Tuple2(
								$author$project$St$Value($author$project$St$VNil),
								m2);
						}
					} else {
						var other = _v100;
						return other;
					}
				}
			});
		var _v103 = _Utils_Tuple2(sel, args);
		_v103$10:
		while (true) {
			switch (_v103.a) {
				case 'value':
					if (!_v103.b.b) {
						return A4($author$project$St$callBlock, ctx, b, _List_Nil, m);
					} else {
						break _v103$10;
					}
				case 'value:':
					return A4($author$project$St$callBlock, ctx, b, args, m);
				case 'value:value:':
					return A4($author$project$St$callBlock, ctx, b, args, m);
				case 'value:value:value:':
					return A4($author$project$St$callBlock, ctx, b, args, m);
				case 'valueWithArguments:':
					if ((_v103.b.b && (_v103.b.a.$ === 10)) && (!_v103.b.b.b)) {
						var _v104 = _v103.b;
						var r = _v104.a.a;
						var _v105 = A2($elm$core$Dict$get, r, m.g);
						if ((!_v105.$) && (!_v105.a.$)) {
							var a = _v105.a.a;
							return A4(
								$author$project$St$callBlock,
								ctx,
								b,
								$elm$core$Array$toList(a),
								m);
						} else {
							return A3($author$project$St$dnu, m, b, sel);
						}
					} else {
						break _v103$10;
					}
				case 'whileTrue:':
					if (_v103.b.b && (!_v103.b.b.b)) {
						var _v106 = _v103.b;
						var body = _v106.a;
						return A3(
							_while,
							$author$project$St$VTrue,
							$elm$core$Maybe$Just(body),
							m);
					} else {
						break _v103$10;
					}
				case 'whileFalse:':
					if (_v103.b.b && (!_v103.b.b.b)) {
						var _v107 = _v103.b;
						var body = _v107.a;
						return A3(
							_while,
							$author$project$St$VFalse,
							$elm$core$Maybe$Just(body),
							m);
					} else {
						break _v103$10;
					}
				case 'whileTrue':
					if (!_v103.b.b) {
						return A3(_while, $author$project$St$VTrue, $elm$core$Maybe$Nothing, m);
					} else {
						break _v103$10;
					}
				case 'whileFalse':
					if (!_v103.b.b) {
						return A3(_while, $author$project$St$VFalse, $elm$core$Maybe$Nothing, m);
					} else {
						break _v103$10;
					}
				case 'numArgs':
					if (!_v103.b.b) {
						if (b.$ === 10) {
							var r = b.a;
							var _v109 = A2($elm$core$Dict$get, r, m.g);
							if ((!_v109.$) && (_v109.a.$ === 2)) {
								var blk = _v109.a.a;
								return A2(
									$author$project$St$ok,
									$author$project$St$VInt(
										$elm$core$List$length(blk.P)),
									m);
							} else {
								return A3($author$project$St$dnu, m, b, sel);
							}
						} else {
							return A3($author$project$St$dnu, m, b, sel);
						}
					} else {
						break _v103$10;
					}
				default:
					break _v103$10;
			}
		}
		return A3($author$project$St$dnu, m, b, sel);
	});
var $author$project$St$boolean = F5(
	function (ctx, b, sel, args, m) {
		var _v89 = _Utils_Tuple2(sel, args);
		_v89$9:
		while (true) {
			if (!_v89.b.b) {
				if (_v89.a === 'not') {
					return A2(
						$author$project$St$ok,
						$author$project$St$bool(!b),
						m);
				} else {
					break _v89$9;
				}
			} else {
				if (_v89.b.b.b) {
					if (!_v89.b.b.b.b) {
						switch (_v89.a) {
							case 'ifTrue:ifFalse:':
								var _v92 = _v89.b;
								var t = _v92.a;
								var _v93 = _v92.b;
								var f = _v93.a;
								return A4(
									$author$project$St$callBlock,
									ctx,
									b ? t : f,
									_List_Nil,
									m);
							case 'ifFalse:ifTrue:':
								var _v94 = _v89.b;
								var f = _v94.a;
								var _v95 = _v94.b;
								var t = _v95.a;
								return A4(
									$author$project$St$callBlock,
									ctx,
									b ? t : f,
									_List_Nil,
									m);
							default:
								break _v89$9;
						}
					} else {
						break _v89$9;
					}
				} else {
					switch (_v89.a) {
						case 'ifTrue:':
							var _v90 = _v89.b;
							var t = _v90.a;
							return b ? A4($author$project$St$callBlock, ctx, t, _List_Nil, m) : A2($author$project$St$ok, $author$project$St$VNil, m);
						case 'ifFalse:':
							var _v91 = _v89.b;
							var f = _v91.a;
							return b ? A2($author$project$St$ok, $author$project$St$VNil, m) : A4($author$project$St$callBlock, ctx, f, _List_Nil, m);
						case '&':
							var _v96 = _v89.b;
							var x = _v96.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									b && _Utils_eq(x, $author$project$St$VTrue)),
								m);
						case '|':
							var _v97 = _v89.b;
							var x = _v97.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									b || _Utils_eq(x, $author$project$St$VTrue)),
								m);
						case 'and:':
							var _v98 = _v89.b;
							var x = _v98.a;
							return b ? A4($author$project$St$callBlock, ctx, x, _List_Nil, m) : A2($author$project$St$ok, $author$project$St$VFalse, m);
						case 'or:':
							var _v99 = _v89.b;
							var x = _v99.a;
							return b ? A2($author$project$St$ok, $author$project$St$VTrue, m) : A4($author$project$St$callBlock, ctx, x, _List_Nil, m);
						default:
							break _v89$9;
					}
				}
			}
		}
		return A3(
			$author$project$St$dnu,
			m,
			$author$project$St$bool(b),
			sel);
	});
var $author$project$St$callBlock = F4(
	function (ctx, bv, args, m) {
		if (bv.$ === 10) {
			var r = bv.a;
			var _v87 = A2($elm$core$Dict$get, r, m.g);
			if ((!_v87.$) && (_v87.a.$ === 2)) {
				var b = _v87.a.a;
				if (!_Utils_eq(
					$elm$core$List$length(args),
					$elm$core$List$length(b.P))) {
					return _Utils_Tuple2(
						$author$project$St$Fail(
							'this block takes ' + ($elm$core$String$fromInt(
								$elm$core$List$length(b.P)) + (' arguments, not ' + $elm$core$String$fromInt(
								$elm$core$List$length(args))))),
						m);
				} else {
					if (m.B <= 0) {
						return _Utils_Tuple2(
							$author$project$St$Fail('out of steps: the code ran too long'),
							m);
					} else {
						var _v88 = A3(
							$author$project$St$newEnv,
							$elm$core$Dict$fromList(
								_Utils_ap(
									A3($elm$core$List$map2, $elm$core$Tuple$pair, b.P, args),
									A2(
										$elm$core$List$map,
										function (t) {
											return _Utils_Tuple2(t, $author$project$St$VNil);
										},
										b.aL))),
							$elm$core$Maybe$Just(b.F),
							_Utils_update(
								m,
								{B: m.B - 1}));
						var env = _v88.a;
						var m2 = _v88.b;
						return A3(
							$author$project$St$evalStmts,
							{E: b.E, W: ctx.W + 1, F: env, S: b.S, s: b.s},
							b.b3,
							m2);
					}
				}
			} else {
				return _Utils_Tuple2(
					$author$project$St$Fail('not a block'),
					m);
			}
		} else {
			return _Utils_Tuple2(
				$author$project$St$Fail('not a block'),
				m);
		}
	});
var $author$project$St$each = F5(
	function (ctx, blk, vals, result, m) {
		each:
		while (true) {
			if (!vals.b) {
				return _Utils_Tuple2(
					$author$project$St$Value(result),
					m);
			} else {
				var v = vals.a;
				var rest = vals.b;
				var _v85 = A4(
					$author$project$St$callBlock,
					ctx,
					blk,
					_List_fromArray(
						[v]),
					m);
				if (!_v85.a.$) {
					var m2 = _v85.b;
					var $temp$ctx = ctx,
						$temp$blk = blk,
						$temp$vals = rest,
						$temp$result = result,
						$temp$m = m2;
					ctx = $temp$ctx;
					blk = $temp$blk;
					vals = $temp$vals;
					result = $temp$result;
					m = $temp$m;
					continue each;
				} else {
					var other = _v85;
					return other;
				}
			}
		}
	});
var $author$project$St$eval = F3(
	function (ctx, e, m) {
		switch (e.$) {
			case 0:
				var v = e.a;
				return _Utils_Tuple2(
					$author$project$St$Value(v),
					m);
			case 3:
				var n = e.a;
				var _v77 = A3($author$project$St$lookupVar, ctx, n, m);
				if (!_v77.$) {
					var v = _v77.a;
					return _Utils_Tuple2(
						$author$project$St$Value(v),
						m);
				} else {
					var msg = _v77.a;
					return _Utils_Tuple2(
						$author$project$St$Fail(msg),
						m);
				}
			case 4:
				var n = e.a;
				var x = e.b;
				var _v78 = A3($author$project$St$eval, ctx, x, m);
				if (!_v78.a.$) {
					var v = _v78.a.a;
					var m2 = _v78.b;
					return _Utils_Tuple2(
						$author$project$St$Value(v),
						A4($author$project$St$assign, ctx, n, v, m2));
				} else {
					var other = _v78;
					return other;
				}
			case 1:
				var items = e.a;
				return A2(
					$author$project$St$andThenVals,
					F2(
						function (vs, m2) {
							return A2(
								$elm$core$Tuple$mapFirst,
								$author$project$St$Value,
								A2(
									$author$project$St$alloc,
									$author$project$St$OArray(
										$elm$core$Array$fromList(vs)),
									m2));
						}),
					A3($author$project$St$evalList, ctx, items, m));
			case 2:
				var items = e.a;
				return A2(
					$author$project$St$andThenVals,
					F2(
						function (vs, m2) {
							return A2(
								$elm$core$Tuple$mapFirst,
								$author$project$St$Value,
								A2(
									$author$project$St$alloc,
									$author$project$St$OArray(
										$elm$core$Array$fromList(vs)),
									m2));
						}),
					A3($author$project$St$evalList, ctx, items, m));
			case 7:
				var ps = e.a;
				var tmp = e.b;
				var body = e.c;
				return A2(
					$elm$core$Tuple$mapFirst,
					$author$project$St$Value,
					A2(
						$author$project$St$alloc,
						$author$project$St$OBlock(
							A7($author$project$St$Block, ps, tmp, body, ctx.F, ctx.S, ctx.s, ctx.E)),
						m));
			case 5:
				var recvE = e.a;
				var sel = e.b;
				var argEs = e.c;
				var _v79 = A3($author$project$St$eval, ctx, recvE, m);
				if (!_v79.a.$) {
					var recv = _v79.a.a;
					var m2 = _v79.b;
					return A2(
						$author$project$St$andThenVals,
						F2(
							function (args, m3) {
								return _Utils_eq(
									recvE,
									$author$project$St$Var('super')) ? A5($author$project$St$sendSuper, ctx, recv, sel, args, m3) : A5($author$project$St$send, ctx, recv, sel, args, m3);
							}),
						A3($author$project$St$evalList, ctx, argEs, m2));
				} else {
					var other = _v79;
					return other;
				}
			default:
				var recvE = e.a;
				var msgs = e.b;
				var _v80 = A3($author$project$St$eval, ctx, recvE, m);
				if (!_v80.a.$) {
					var recv = _v80.a.a;
					var m2 = _v80.b;
					return A3(
						$elm$core$List$foldl,
						F2(
							function (_v81, _v82) {
								var sel = _v81.a;
								var argEs = _v81.b;
								var flow = _v82.a;
								var mm = _v82.b;
								if (!flow.$) {
									return A2(
										$author$project$St$andThenVals,
										F2(
											function (args, m3) {
												return A5($author$project$St$send, ctx, recv, sel, args, m3);
											}),
										A3($author$project$St$evalList, ctx, argEs, mm));
								} else {
									return _Utils_Tuple2(flow, mm);
								}
							}),
						_Utils_Tuple2(
							$author$project$St$Value($author$project$St$VNil),
							m2),
						msgs);
				} else {
					var other = _v80;
					return other;
				}
		}
	});
var $author$project$St$evalList = F3(
	function (ctx, es, m) {
		return A2(
			$elm$core$Tuple$mapFirst,
			$elm$core$Result$map($elm$core$List$reverse),
			A3(
				$elm$core$List$foldl,
				F2(
					function (e, _v73) {
						var acc = _v73.a;
						var mm = _v73.b;
						if (!acc.$) {
							var vs = acc.a;
							var _v75 = A3($author$project$St$eval, ctx, e, mm);
							if (!_v75.a.$) {
								var v = _v75.a.a;
								var m2 = _v75.b;
								return _Utils_Tuple2(
									$elm$core$Result$Ok(
										A2($elm$core$List$cons, v, vs)),
									m2);
							} else {
								var flow = _v75.a;
								var m2 = _v75.b;
								return _Utils_Tuple2(
									$elm$core$Result$Err(flow),
									m2);
							}
						} else {
							return _Utils_Tuple2(acc, mm);
						}
					}),
				_Utils_Tuple2(
					$elm$core$Result$Ok(_List_Nil),
					m),
				es));
	});
var $author$project$St$evalStmts = F3(
	function (ctx, stmts, m) {
		evalStmts:
		while (true) {
			if (!stmts.b) {
				return _Utils_Tuple2(
					$author$project$St$Value($author$project$St$VNil),
					m);
			} else {
				if (!stmts.a.$) {
					if (!stmts.b.b) {
						var e = stmts.a.a;
						return A3($author$project$St$eval, ctx, e, m);
					} else {
						var e = stmts.a.a;
						var rest = stmts.b;
						var _v71 = A3($author$project$St$eval, ctx, e, m);
						if (!_v71.a.$) {
							var m2 = _v71.b;
							var $temp$ctx = ctx,
								$temp$stmts = rest,
								$temp$m = m2;
							ctx = $temp$ctx;
							stmts = $temp$stmts;
							m = $temp$m;
							continue evalStmts;
						} else {
							var other = _v71;
							return other;
						}
					}
				} else {
					var e = stmts.a.a;
					var _v72 = A3($author$project$St$eval, ctx, e, m);
					if (!_v72.a.$) {
						var v = _v72.a.a;
						var m2 = _v72.b;
						return _Utils_Tuple2(
							A2($author$project$St$Ret, ctx.S, v),
							m2);
					} else {
						var other = _v72;
						return other;
					}
				}
			}
		}
	});
var $author$project$St$invoke = F6(
	function (ctx, defining, meth, recv, args, m) {
		if (!_Utils_eq(
			$elm$core$List$length(args),
			$elm$core$List$length(meth.P))) {
			return _Utils_Tuple2(
				$author$project$St$Fail(
					'#' + (meth.aK + (' takes ' + ($elm$core$String$fromInt(
						$elm$core$List$length(meth.P)) + ' arguments')))),
				m);
		} else {
			var _v67 = A3(
				$author$project$St$newEnv,
				$elm$core$Dict$fromList(
					_Utils_ap(
						A3($elm$core$List$map2, $elm$core$Tuple$pair, meth.P, args),
						A2(
							$elm$core$List$map,
							function (t) {
								return _Utils_Tuple2(t, $author$project$St$VNil);
							},
							meth.aL))),
				$elm$core$Maybe$Nothing,
				m);
			var env = _v67.a;
			var m2 = _v67.b;
			var inner = {E: defining, W: ctx.W + 1, F: env, S: env, s: recv};
			var _v68 = A3($author$project$St$evalStmts, inner, meth.b3, m2);
			switch (_v68.a.$) {
				case 1:
					var _v69 = _v68.a;
					var h = _v69.a;
					var v = _v69.b;
					var m3 = _v68.b;
					return _Utils_eq(h, env) ? _Utils_Tuple2(
						$author$project$St$Value(v),
						m3) : _Utils_Tuple2(
						A2($author$project$St$Ret, h, v),
						m3);
				case 0:
					var m3 = _v68.b;
					return _Utils_Tuple2(
						$author$project$St$Value(recv),
						m3);
				default:
					var other = _v68;
					return other;
			}
		}
	});
var $author$project$St$mapVals = F4(
	function (ctx, blk, argLists, m) {
		return A2(
			$elm$core$Tuple$mapFirst,
			$elm$core$Result$map($elm$core$List$reverse),
			A3(
				$elm$core$List$foldl,
				F2(
					function (vs, _v64) {
						var acc = _v64.a;
						var mm = _v64.b;
						if (!acc.$) {
							var out = acc.a;
							var _v66 = A4($author$project$St$callBlock, ctx, blk, vs, mm);
							if (!_v66.a.$) {
								var v = _v66.a.a;
								var m2 = _v66.b;
								return _Utils_Tuple2(
									$elm$core$Result$Ok(
										A2($elm$core$List$cons, v, out)),
									m2);
							} else {
								var flow = _v66.a;
								var m2 = _v66.b;
								return _Utils_Tuple2(
									$elm$core$Result$Err(flow),
									m2);
							}
						} else {
							return _Utils_Tuple2(acc, mm);
						}
					}),
				_Utils_Tuple2(
					$elm$core$Result$Ok(_List_Nil),
					m),
				argLists));
	});
var $author$project$St$number = F6(
	function (ctx, a, ia, sel, args, m) {
		var self = A2(
			$elm$core$Maybe$withDefault,
			$author$project$St$VFloat(a),
			A2($elm$core$Maybe$map, $author$project$St$VInt, ia));
		var loop = F5(
			function (from, to, by, blk, mm) {
				loop:
				while (true) {
					if (((by > 0) && (_Utils_cmp(from, to) > 0)) || ((by < 0) && (_Utils_cmp(from, to) < 0))) {
						return _Utils_Tuple2(
							$author$project$St$Value(self),
							mm);
					} else {
						var _v36 = A4(
							$author$project$St$callBlock,
							ctx,
							blk,
							_List_fromArray(
								[
									$author$project$St$VInt(from)
								]),
							mm);
						if (!_v36.a.$) {
							var m2 = _v36.b;
							var $temp$from = from + by,
								$temp$to = to,
								$temp$by = by,
								$temp$blk = blk,
								$temp$mm = m2;
							from = $temp$from;
							to = $temp$to;
							by = $temp$by;
							blk = $temp$blk;
							mm = $temp$mm;
							continue loop;
						} else {
							var other = _v36;
							return other;
						}
					}
				}
			});
		var _int = function (f) {
			if (!ia.$) {
				var n = ia.a;
				return f(n);
			} else {
				return A3($author$project$St$dnu, m, self, sel);
			}
		};
		var cmp = function (f) {
			if (args.b && (!args.b.b)) {
				var x = args.a;
				var _v61 = $author$project$St$numVal(x);
				if (!_v61.$) {
					var _v62 = _v61.a;
					var b = _v62.a;
					return A2(
						$author$project$St$ok,
						$author$project$St$bool(
							A2(f, a, b)),
						m);
				} else {
					return _Utils_Tuple2(
						$author$project$St$Fail(
							A2($author$project$St$printString, m, x) + ' is not a number'),
						m);
				}
			} else {
				return A3($author$project$St$dnu, m, self, sel);
			}
		};
		var arith = F2(
			function (fi, ff) {
				if (args.b && (!args.b.b)) {
					var x = args.a;
					var _v58 = $author$project$St$numVal(x);
					if (!_v58.$) {
						var _v59 = _v58.a;
						var b = _v59.a;
						var ib = _v59.b;
						return A2(
							$author$project$St$ok,
							A6($author$project$St$num, ia, ib, fi, ff, a, b),
							m);
					} else {
						return _Utils_Tuple2(
							$author$project$St$Fail(
								A2($author$project$St$printString, m, x) + ' is not a number'),
							m);
					}
				} else {
					return A3($author$project$St$dnu, m, self, sel);
				}
			});
		var _v37 = _Utils_Tuple2(sel, args);
		_v37$36:
		while (true) {
			switch (_v37.a) {
				case '+':
					return A2(arith, $elm$core$Basics$add, $elm$core$Basics$add);
				case '-':
					return A2(arith, $elm$core$Basics$sub, $elm$core$Basics$sub);
				case '*':
					return A2(arith, $elm$core$Basics$mul, $elm$core$Basics$mul);
				case '/':
					if (_v37.b.b && (!_v37.b.b.b)) {
						var _v38 = _v37.b;
						var x = _v38.a;
						var _v39 = _Utils_Tuple2(ia, x);
						_v39$2:
						while (true) {
							if (_v39.b.$ === 3) {
								if (!_v39.b.a) {
									return _Utils_Tuple2(
										$author$project$St$Fail('ZeroDivide'),
										m);
								} else {
									if (!_v39.a.$) {
										var p = _v39.a.a;
										var q = _v39.b.a;
										return (!A2($elm$core$Basics$modBy, q, p)) ? A2(
											$author$project$St$ok,
											$author$project$St$VInt((p / q) | 0),
											m) : A2(
											$author$project$St$ok,
											$author$project$St$VFloat(p / q),
											m);
									} else {
										break _v39$2;
									}
								}
							} else {
								break _v39$2;
							}
						}
						return A2(arith, $elm$core$Basics$idiv, $elm$core$Basics$fdiv);
					} else {
						break _v37$36;
					}
				case '//':
					if (((_v37.b.b && (_v37.b.a.$ === 3)) && (!_v37.b.a.a)) && (!_v37.b.b.b)) {
						var _v40 = _v37.b;
						return _Utils_Tuple2(
							$author$project$St$Fail('ZeroDivide'),
							m);
					} else {
						return A2(
							arith,
							$elm$core$Basics$idiv,
							F2(
								function (p, q) {
									return $elm$core$Basics$floor(p / q);
								}));
					}
				case '\u005C\u005C':
					if (((_v37.b.b && (_v37.b.a.$ === 3)) && (!_v37.b.a.a)) && (!_v37.b.b.b)) {
						var _v41 = _v37.b;
						return _Utils_Tuple2(
							$author$project$St$Fail('ZeroDivide'),
							m);
					} else {
						return A2(
							arith,
							F2(
								function (p, q) {
									return A2($elm$core$Basics$modBy, q, p);
								}),
							F2(
								function (p, q) {
									return p - (q * $elm$core$Basics$floor(p / q));
								}));
					}
				case '<':
					return cmp($elm$core$Basics$lt);
				case '>':
					return cmp($elm$core$Basics$gt);
				case '<=':
					return cmp($elm$core$Basics$le);
				case '>=':
					return cmp($elm$core$Basics$ge);
				case 'max:':
					return A2(arith, $elm$core$Basics$max, $elm$core$Basics$max);
				case 'min:':
					return A2(arith, $elm$core$Basics$min, $elm$core$Basics$min);
				case 'between:and:':
					if ((_v37.b.b && _v37.b.b.b) && (!_v37.b.b.b.b)) {
						var _v42 = _v37.b;
						var lo = _v42.a;
						var _v43 = _v42.b;
						var hi = _v43.a;
						var _v44 = _Utils_Tuple2(
							$author$project$St$numVal(lo),
							$author$project$St$numVal(hi));
						if ((!_v44.a.$) && (!_v44.b.$)) {
							var _v45 = _v44.a.a;
							var l = _v45.a;
							var _v46 = _v44.b.a;
							var h = _v46.a;
							return A2(
								$author$project$St$ok,
								$author$project$St$bool(
									(_Utils_cmp(l, a) < 1) && (_Utils_cmp(a, h) < 1)),
								m);
						} else {
							return _Utils_Tuple2(
								$author$project$St$Fail('between:and: needs numbers'),
								m);
						}
					} else {
						break _v37$36;
					}
				case 'abs':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VFloat(
									$elm$core$Basics$abs(a)),
								A2(
									$elm$core$Maybe$map,
									A2($elm$core$Basics$composeR, $elm$core$Basics$abs, $author$project$St$VInt),
									ia)),
							m);
					} else {
						break _v37$36;
					}
				case 'negated':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VFloat(-a),
								A2(
									$elm$core$Maybe$map,
									A2($elm$core$Basics$composeR, $elm$core$Basics$negate, $author$project$St$VInt),
									ia)),
							m);
					} else {
						break _v37$36;
					}
				case 'squared':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VFloat(a * a),
								A2(
									$elm$core$Maybe$map,
									function (n) {
										return $author$project$St$VInt(n * n);
									},
									ia)),
							m);
					} else {
						break _v37$36;
					}
				case 'sqrt':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VFloat(
								$elm$core$Basics$sqrt(a)),
							m);
					} else {
						break _v37$36;
					}
				case 'asFloat':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VFloat(a),
							m);
					} else {
						break _v37$36;
					}
				case 'asInteger':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(a | 0),
							m);
					} else {
						break _v37$36;
					}
				case 'truncated':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(a | 0),
							m);
					} else {
						break _v37$36;
					}
				case 'rounded':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(
								$elm$core$Basics$round(a)),
							m);
					} else {
						break _v37$36;
					}
				case 'isZero':
					if (!_v37.b.b) {
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(!a),
							m);
					} else {
						break _v37$36;
					}
				case 'even':
					if (!_v37.b.b) {
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$bool(
										!A2($elm$core$Basics$modBy, 2, n)),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'odd':
					if (!_v37.b.b) {
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$bool(
										A2($elm$core$Basics$modBy, 2, n) === 1),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'isPrime':
					if (!_v37.b.b) {
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$bool(
										(n > 1) && A2(
											$elm$core$List$all,
											function (d) {
												return !(!A2($elm$core$Basics$modBy, d, n));
											},
											A2(
												$elm$core$List$range,
												2,
												$elm$core$Basics$floor(
													$elm$core$Basics$sqrt(n))))),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'factorial':
					if (!_v37.b.b) {
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$VInt(
										$elm$core$List$product(
											A2($elm$core$List$range, 1, n))),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'gcd:':
					if ((_v37.b.b && (_v37.b.a.$ === 3)) && (!_v37.b.b.b)) {
						var _v47 = _v37.b;
						var b = _v47.a.a;
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$VInt(
										A2(
											$author$project$St$gcd,
											$elm$core$Basics$abs(n),
											$elm$core$Basics$abs(b))),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'asCharacter':
					if (!_v37.b.b) {
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$VChar(
										$elm$core$Char$fromCode(n)),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'printString:':
					if ((_v37.b.b && (_v37.b.a.$ === 3)) && (!_v37.b.b.b)) {
						var _v48 = _v37.b;
						var base = _v48.a.a;
						return _int(
							function (n) {
								return A2(
									$author$project$St$ok,
									$author$project$St$VStr(
										A2($author$project$St$radix, base, n)),
									m);
							});
					} else {
						break _v37$36;
					}
				case 'timesRepeat:':
					if (_v37.b.b && (!_v37.b.b.b)) {
						var _v49 = _v37.b;
						var blk = _v49.a;
						return _int(
							function (n) {
								return A5(loop, 1, n, 1, blk, m);
							});
					} else {
						break _v37$36;
					}
				case 'to:do:':
					if (((_v37.b.b && (_v37.b.a.$ === 3)) && _v37.b.b.b) && (!_v37.b.b.b.b)) {
						var _v50 = _v37.b;
						var to = _v50.a.a;
						var _v51 = _v50.b;
						var blk = _v51.a;
						return _int(
							function (n) {
								return A5(loop, n, to, 1, blk, m);
							});
					} else {
						break _v37$36;
					}
				case 'to:by:do:':
					if (((((_v37.b.b && (_v37.b.a.$ === 3)) && _v37.b.b.b) && (_v37.b.b.a.$ === 3)) && _v37.b.b.b.b) && (!_v37.b.b.b.b.b)) {
						var _v52 = _v37.b;
						var to = _v52.a.a;
						var _v53 = _v52.b;
						var by = _v53.a.a;
						var _v54 = _v53.b;
						var blk = _v54.a;
						return (!by) ? _Utils_Tuple2(
							$author$project$St$Fail('to:by:do: needs a step other than 0'),
							m) : _int(
							function (n) {
								return A5(loop, n, to, by, blk, m);
							});
					} else {
						break _v37$36;
					}
				case 'to:':
					if ((_v37.b.b && (_v37.b.a.$ === 3)) && (!_v37.b.b.b)) {
						var _v55 = _v37.b;
						var to = _v55.a.a;
						return _int(
							function (n) {
								return A2(
									$elm$core$Tuple$mapFirst,
									$author$project$St$Value,
									A2(
										$author$project$St$alloc,
										$author$project$St$OArray(
											$elm$core$Array$fromList(
												A2(
													$elm$core$List$map,
													$author$project$St$VInt,
													A2($elm$core$List$range, n, to)))),
										m));
							});
					} else {
						break _v37$36;
					}
				case '@':
					if (_v37.b.b && (!_v37.b.b.b)) {
						var _v56 = _v37.b;
						var y = _v56.a;
						return A2(
							$elm$core$Tuple$mapFirst,
							$author$project$St$Value,
							A2(
								$author$project$St$alloc,
								$author$project$St$OArray(
									$elm$core$Array$fromList(
										_List_fromArray(
											[self, y]))),
								m));
					} else {
						break _v37$36;
					}
				default:
					break _v37$36;
			}
		}
		return A3($author$project$St$dnu, m, self, sel);
	});
var $author$project$St$primitive = F5(
	function (ctx, recv, sel, args, m) {
		var _v14 = _Utils_Tuple3(recv, sel, args);
		_v14$0:
		while (true) {
			_v14$1:
			while (true) {
				_v14$2:
				while (true) {
					_v14$3:
					while (true) {
						_v14$4:
						while (true) {
							_v14$5:
							while (true) {
								_v14$6:
								while (true) {
									_v14$7:
									while (true) {
										_v14$8:
										while (true) {
											_v14$9:
											while (true) {
												_v14$10:
												while (true) {
													_v14$11:
													while (true) {
														_v14$13:
														while (true) {
															_v14$15:
															while (true) {
																_v14$17:
																while (true) {
																	_v14$18:
																	while (true) {
																		_v14$19:
																		while (true) {
																			_v14$20:
																			while (true) {
																				_v14$21:
																				while (true) {
																					_v14$22:
																					while (true) {
																						_v14$23:
																						while (true) {
																							_v14$24:
																							while (true) {
																								_v14$25:
																								while (true) {
																									_v14$26:
																									while (true) {
																										_v14$27:
																										while (true) {
																											_v14$28:
																											while (true) {
																												_v14$29:
																												while (true) {
																													_v14$30:
																													while (true) {
																														_v14$31:
																														while (true) {
																															_v14$32:
																															while (true) {
																																if (!_v14.c.b) {
																																	switch (_v14.a.$) {
																																		case 1:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$21;
																																			}
																																		case 2:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$22;
																																			}
																																		case 3:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$23;
																																			}
																																		case 4:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$24;
																																			}
																																		case 5:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$25;
																																			}
																																		case 6:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$26;
																																			}
																																		case 7:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$27;
																																			}
																																		case 8:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$28;
																																			}
																																		case 9:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					if (_v14.a.a === 'Transcript') {
																																						break _v14$29;
																																					} else {
																																						break _v14$30;
																																					}
																																			}
																																		case 10:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$31;
																																			}
																																		default:
																																			switch (_v14.b) {
																																				case 'class':
																																					break _v14$4;
																																				case 'printString':
																																					break _v14$5;
																																				case 'displayString':
																																					break _v14$6;
																																				case 'printNl':
																																					break _v14$7;
																																				case 'displayNl':
																																					break _v14$8;
																																				case 'yourself':
																																					break _v14$9;
																																				case 'isNil':
																																					break _v14$10;
																																				case 'notNil':
																																					break _v14$11;
																																				default:
																																					break _v14$32;
																																			}
																																	}
																																} else {
																																	switch (_v14.a.$) {
																																		case 0:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					var _v25 = _v14.a;
																																					var _v26 = _v14.c;
																																					var b = _v26.a;
																																					var _v27 = _v26.b;
																																					return A4($author$project$St$callBlock, ctx, b, _List_Nil, m);
																																				} else {
																																					break _v14$32;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						var _v19 = _v14.a;
																																						var _v20 = _v14.c;
																																						var b = _v20.a;
																																						return A4($author$project$St$callBlock, ctx, b, _List_Nil, m);
																																					case 'ifNotNil:':
																																						var _v22 = _v14.a;
																																						var _v23 = _v14.c;
																																						return A2($author$project$St$ok, $author$project$St$VNil, m);
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$32;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$32;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$32;
																																				}
																																			}
																																		case 1:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$21;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$21;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$21;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$21;
																																				}
																																			}
																																		case 2:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$22;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$22;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$22;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$22;
																																				}
																																			}
																																		case 3:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$23;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$23;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$23;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$23;
																																				}
																																			}
																																		case 4:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$24;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$24;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$24;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$24;
																																				}
																																			}
																																		case 5:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$25;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$25;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$25;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$25;
																																				}
																																			}
																																		case 6:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$26;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$26;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$26;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$26;
																																				}
																																			}
																																		case 7:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$27;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$27;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$27;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$27;
																																				}
																																			}
																																		case 8:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$28;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$28;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$28;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$28;
																																				}
																																			}
																																		case 9:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					if (_v14.a.a === 'Transcript') {
																																						break _v14$29;
																																					} else {
																																						break _v14$30;
																																					}
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							if (_v14.a.a === 'Transcript') {
																																								break _v14$29;
																																							} else {
																																								break _v14$30;
																																							}
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							if (_v14.a.a === 'Transcript') {
																																								break _v14$29;
																																							} else {
																																								break _v14$30;
																																							}
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						if (_v14.a.a === 'Transcript') {
																																							break _v14$29;
																																						} else {
																																							break _v14$30;
																																						}
																																				}
																																			}
																																		default:
																																			if (_v14.c.b.b) {
																																				if ((_v14.b === 'ifNil:ifNotNil:') && (!_v14.c.b.b.b)) {
																																					break _v14$17;
																																				} else {
																																					break _v14$31;
																																				}
																																			} else {
																																				switch (_v14.b) {
																																					case '==':
																																						break _v14$0;
																																					case '~~':
																																						break _v14$1;
																																					case '=':
																																						break _v14$2;
																																					case '~=':
																																						break _v14$3;
																																					case 'ifNil:':
																																						break _v14$13;
																																					case 'ifNotNil:':
																																						break _v14$15;
																																					case 'respondsTo:':
																																						if (_v14.c.a.$ === 6) {
																																							break _v14$18;
																																						} else {
																																							break _v14$31;
																																						}
																																					case 'isKindOf:':
																																						if (_v14.c.a.$ === 8) {
																																							break _v14$19;
																																						} else {
																																							break _v14$31;
																																						}
																																					case '->':
																																						break _v14$20;
																																					default:
																																						break _v14$31;
																																				}
																																			}
																																	}
																																}
																															}
																															return A3($author$project$St$dnu, m, recv, sel);
																														}
																														var r = _v14.a.a;
																														var _v35 = A2($elm$core$Dict$get, r, m.g);
																														_v35$2:
																														while (true) {
																															if (!_v35.$) {
																																switch (_v35.a.$) {
																																	case 0:
																																		var a = _v35.a.a;
																																		return A6($author$project$St$array, ctx, r, a, sel, args, m);
																																	case 2:
																																		return A5($author$project$St$blockMsg, ctx, recv, sel, args, m);
																																	default:
																																		break _v35$2;
																																}
																															} else {
																																break _v35$2;
																															}
																														}
																														return A3($author$project$St$dnu, m, recv, sel);
																													}
																													return A4($author$project$St$smalltalk, recv, sel, args, m);
																												}
																												return A4($author$project$St$transcript, recv, sel, args, m);
																											}
																											var c = _v14.a.a;
																											return A4($author$project$St$classMsg, c, sel, args, m);
																										}
																										var c = _v14.a.a;
																										return A4($author$project$St$character, c, sel, args, m);
																									}
																									var s = _v14.a.a;
																									return A6($author$project$St$string, ctx, $author$project$St$VSym, s, sel, args, m);
																								}
																								var s = _v14.a.a;
																								return A6($author$project$St$string, ctx, $author$project$St$VStr, s, sel, args, m);
																							}
																							var a = _v14.a.a;
																							return A6($author$project$St$number, ctx, a, $elm$core$Maybe$Nothing, sel, args, m);
																						}
																						var a = _v14.a.a;
																						return A6(
																							$author$project$St$number,
																							ctx,
																							a,
																							$elm$core$Maybe$Just(a),
																							sel,
																							args,
																							m);
																					}
																					var _v34 = _v14.a;
																					return A5($author$project$St$boolean, ctx, false, sel, args, m);
																				}
																				var _v33 = _v14.a;
																				return A5($author$project$St$boolean, ctx, true, sel, args, m);
																			}
																			var _v32 = _v14.c;
																			var x = _v32.a;
																			return A2(
																				$elm$core$Tuple$mapFirst,
																				$author$project$St$Value,
																				A2(
																					$author$project$St$alloc,
																					$author$project$St$OArray(
																						$elm$core$Array$fromList(
																							_List_fromArray(
																								[recv, x]))),
																					m));
																		}
																		var _v31 = _v14.c;
																		var c = _v31.a.a;
																		return A2(
																			$author$project$St$ok,
																			$author$project$St$bool(
																				A3(
																					$author$project$St$inherits,
																					m,
																					A2($author$project$St$classOf, m, recv),
																					c)),
																			m);
																	}
																	var _v30 = _v14.c;
																	var s = _v30.a.a;
																	return A2(
																		$author$project$St$ok,
																		$author$project$St$bool(
																			(!_Utils_eq(
																				A3(
																					$author$project$St$lookup,
																					m,
																					A2($author$project$St$classOf, m, recv),
																					s),
																				$elm$core$Maybe$Nothing)) || A2(
																				$elm$core$List$member,
																				s,
																				A2($author$project$St$primitiveSelectors, m, recv))),
																		m);
																}
																var _v28 = _v14.c;
																var _v29 = _v28.b;
																var b = _v29.a;
																return A4(
																	$author$project$St$callBlock,
																	ctx,
																	b,
																	A3(
																		$author$project$St$blockArgs,
																		m,
																		b,
																		_List_fromArray(
																			[recv])),
																	m);
															}
															var _v24 = _v14.c;
															var b = _v24.a;
															return A4(
																$author$project$St$callBlock,
																ctx,
																b,
																A3(
																	$author$project$St$blockArgs,
																	m,
																	b,
																	_List_fromArray(
																		[recv])),
																m);
														}
														var _v21 = _v14.c;
														return A2($author$project$St$ok, recv, m);
													}
													return A2(
														$author$project$St$ok,
														$author$project$St$bool(
															!_Utils_eq(recv, $author$project$St$VNil)),
														m);
												}
												return A2(
													$author$project$St$ok,
													$author$project$St$bool(
														_Utils_eq(recv, $author$project$St$VNil)),
													m);
											}
											return A2($author$project$St$ok, recv, m);
										}
										return A2(
											$author$project$St$ok,
											recv,
											_Utils_update(
												m,
												{
													bS: m.bS + (A2($author$project$St$displayString, m, recv) + '\u000A')
												}));
									}
									return A2(
										$author$project$St$ok,
										recv,
										_Utils_update(
											m,
											{
												bS: m.bS + (A2($author$project$St$printString, m, recv) + '\u000A')
											}));
								}
								return A2(
									$author$project$St$ok,
									$author$project$St$VStr(
										A2($author$project$St$displayString, m, recv)),
									m);
							}
							return A2(
								$author$project$St$ok,
								$author$project$St$VStr(
									A2($author$project$St$printString, m, recv)),
								m);
						}
						return A2(
							$author$project$St$ok,
							$author$project$St$VClass(
								A2($author$project$St$classOf, m, recv)),
							m);
					}
					var _v18 = _v14.c;
					var x = _v18.a;
					return A2(
						$author$project$St$ok,
						$author$project$St$bool(
							!A3($author$project$St$equal, m, recv, x)),
						m);
				}
				var _v17 = _v14.c;
				var x = _v17.a;
				return A2(
					$author$project$St$ok,
					$author$project$St$bool(
						A3($author$project$St$equal, m, recv, x)),
					m);
			}
			var _v16 = _v14.c;
			var x = _v16.a;
			return A2(
				$author$project$St$ok,
				$author$project$St$bool(
					!_Utils_eq(recv, x)),
				m);
		}
		var _v15 = _v14.c;
		var x = _v15.a;
		return A2(
			$author$project$St$ok,
			$author$project$St$bool(
				_Utils_eq(recv, x)),
			m);
	});
var $author$project$St$send = F5(
	function (ctx, recv, sel, args, m) {
		if (m.B <= 0) {
			return _Utils_Tuple2(
				$author$project$St$Fail('out of steps: the code ran too long'),
				m);
		} else {
			if (_Utils_cmp(ctx.W, $author$project$St$maxDepth) > 0) {
				return _Utils_Tuple2(
					$author$project$St$Fail('stack overflow: too many nested sends'),
					m);
			} else {
				var m1 = _Utils_update(
					m,
					{B: m.B - 1});
				var _v12 = A3(
					$author$project$St$lookup,
					m1,
					A2($author$project$St$classOf, m1, recv),
					sel);
				if (!_v12.$) {
					var _v13 = _v12.a;
					var defining = _v13.a;
					var meth = _v13.b;
					return A6($author$project$St$invoke, ctx, defining, meth, recv, args, m1);
				} else {
					return A5($author$project$St$primitive, ctx, recv, sel, args, m1);
				}
			}
		}
	});
var $author$project$St$sendSuper = F5(
	function (ctx, recv, sel, args, m) {
		var _v10 = A2(
			$elm$core$Maybe$andThen,
			function (s) {
				return A3($author$project$St$lookup, m, s, sel);
			},
			A2(
				$elm$core$Maybe$andThen,
				function ($) {
					return $.D;
				},
				A2($elm$core$Dict$get, ctx.E, m.c)));
		if (!_v10.$) {
			var _v11 = _v10.a;
			var defining = _v11.a;
			var meth = _v11.b;
			return A6(
				$author$project$St$invoke,
				ctx,
				defining,
				meth,
				recv,
				args,
				_Utils_update(
					m,
					{B: m.B - 1}));
		} else {
			return A5($author$project$St$primitive, ctx, recv, sel, args, m);
		}
	});
var $author$project$St$string = F6(
	function (ctx, wrap, s, sel, args, m) {
		var chars = $elm$core$String$toList(s);
		var _v0 = _Utils_Tuple2(sel, args);
		_v0$21:
		while (true) {
			if (_v0.b.b) {
				if (!_v0.b.b.b) {
					switch (_v0.a) {
						case ',':
							var _v1 = _v0.b;
							var x = _v1.a;
							switch (x.$) {
								case 5:
									var t = x.a;
									return A2(
										$author$project$St$ok,
										$author$project$St$VStr(
											_Utils_ap(s, t)),
										m);
								case 6:
									var t = x.a;
									return A2(
										$author$project$St$ok,
										$author$project$St$VStr(
											_Utils_ap(s, t)),
										m);
								default:
									return _Utils_Tuple2(
										$author$project$St$Fail(
											'cannot concatenate ' + (A2($author$project$St$printString, m, x) + ' to a string: send it displayString first')),
										m);
							}
						case 'at:':
							if (_v0.b.a.$ === 3) {
								var _v3 = _v0.b;
								var i = _v3.a.a;
								var _v4 = $elm$core$List$head(
									A2($elm$core$List$drop, i - 1, chars));
								if (!_v4.$) {
									var c = _v4.a;
									return (i >= 1) ? A2(
										$author$project$St$ok,
										$author$project$St$VChar(c),
										m) : _Utils_Tuple2(
										$author$project$St$Fail(
											'index ' + ($elm$core$String$fromInt(i) + ' is out of bounds')),
										m);
								} else {
									return _Utils_Tuple2(
										$author$project$St$Fail(
											'index ' + ($elm$core$String$fromInt(i) + ' is out of bounds')),
										m);
								}
							} else {
								break _v0$21;
							}
						case 'includesSubstring:':
							if (_v0.b.a.$ === 5) {
								var _v5 = _v0.b;
								var t = _v5.a.a;
								return A2(
									$author$project$St$ok,
									$author$project$St$bool(
										A2($elm$core$String$contains, t, s)),
									m);
							} else {
								break _v0$21;
							}
						case 'occurrencesOf:':
							if (_v0.b.a.$ === 7) {
								var _v6 = _v0.b;
								var c = _v6.a.a;
								return A2(
									$author$project$St$ok,
									$author$project$St$VInt(
										$elm$core$List$length(
											A2(
												$elm$core$List$filter,
												$elm$core$Basics$eq(c),
												chars))),
									m);
							} else {
								break _v0$21;
							}
						case '<':
							if (_v0.b.a.$ === 5) {
								var _v7 = _v0.b;
								var t = _v7.a.a;
								return A2(
									$author$project$St$ok,
									$author$project$St$bool(
										_Utils_cmp(s, t) < 0),
									m);
							} else {
								break _v0$21;
							}
						case '>':
							if (_v0.b.a.$ === 5) {
								var _v8 = _v0.b;
								var t = _v8.a.a;
								return A2(
									$author$project$St$ok,
									$author$project$St$bool(
										_Utils_cmp(s, t) > 0),
									m);
							} else {
								break _v0$21;
							}
						case 'do:':
							var _v9 = _v0.b;
							var blk = _v9.a;
							return A5(
								$author$project$St$each,
								ctx,
								blk,
								A2($elm$core$List$map, $author$project$St$VChar, chars),
								$author$project$St$VStr(s),
								m);
						default:
							break _v0$21;
					}
				} else {
					break _v0$21;
				}
			} else {
				switch (_v0.a) {
					case 'size':
						return A2(
							$author$project$St$ok,
							$author$project$St$VInt(
								$elm$core$String$length(s)),
							m);
					case 'reversed':
						return A2(
							$author$project$St$ok,
							wrap(
								$elm$core$String$reverse(s)),
							m);
					case 'reverse':
						return A2(
							$author$project$St$ok,
							wrap(
								$elm$core$String$reverse(s)),
							m);
					case 'asUppercase':
						return A2(
							$author$project$St$ok,
							wrap(
								$elm$core$String$toUpper(s)),
							m);
					case 'asLowercase':
						return A2(
							$author$project$St$ok,
							wrap(
								$elm$core$String$toLower(s)),
							m);
					case 'asSymbol':
						return A2(
							$author$project$St$ok,
							$author$project$St$VSym(s),
							m);
					case 'asString':
						return A2(
							$author$project$St$ok,
							$author$project$St$VStr(s),
							m);
					case 'asNumber':
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								A2(
									$elm$core$Maybe$withDefault,
									$author$project$St$VNil,
									A2(
										$elm$core$Maybe$map,
										$author$project$St$VFloat,
										$elm$core$String$toFloat(s))),
								A2(
									$elm$core$Maybe$map,
									$author$project$St$VInt,
									$elm$core$String$toInt(s))),
							m);
					case 'asInteger':
						return A2(
							$author$project$St$ok,
							A2(
								$elm$core$Maybe$withDefault,
								$author$project$St$VNil,
								A2(
									$elm$core$Maybe$map,
									$author$project$St$VInt,
									$elm$core$String$toInt(s))),
							m);
					case 'isEmpty':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(s === ''),
							m);
					case 'notEmpty':
						return A2(
							$author$project$St$ok,
							$author$project$St$bool(s !== ''),
							m);
					case 'asArray':
						return A2(
							$elm$core$Tuple$mapFirst,
							$author$project$St$Value,
							A2(
								$author$project$St$alloc,
								$author$project$St$OArray(
									$elm$core$Array$fromList(
										A2($elm$core$List$map, $author$project$St$VChar, chars))),
								m));
					case 'substrings':
						return A2(
							$elm$core$Tuple$mapFirst,
							$author$project$St$Value,
							A2(
								$author$project$St$alloc,
								$author$project$St$OArray(
									$elm$core$Array$fromList(
										A2(
											$elm$core$List$map,
											$author$project$St$VStr,
											$elm$core$String$words(s)))),
								m));
					case 'lines':
						return A2(
							$elm$core$Tuple$mapFirst,
							$author$project$St$Value,
							A2(
								$author$project$St$alloc,
								$author$project$St$OArray(
									$elm$core$Array$fromList(
										A2(
											$elm$core$List$map,
											$author$project$St$VStr,
											$elm$core$String$lines(s)))),
								m));
					default:
						break _v0$21;
				}
			}
		}
		return A3(
			$author$project$St$dnu,
			m,
			wrap(s),
			sel);
	});
var $author$project$St$parseDoIt = function (src) {
	return A2(
		$elm$core$Result$andThen,
		function (_v0) {
			var tmp = _v0.a;
			var rest = _v0.b;
			return A2(
				$elm$core$Result$andThen,
				function (_v1) {
					var body = _v1.a;
					var r = _v1.b;
					return A2(
						$author$project$St$end,
						r,
						_Utils_Tuple2(tmp, body));
				},
				$author$project$St$statements(rest));
		},
		A2(
			$elm$core$Result$andThen,
			$author$project$St$temps,
			A2(
				$author$project$St$tokenize,
				$elm$core$String$toList(src),
				_List_Nil)));
};
var $author$project$St$doIt = F2(
	function (src, m0) {
		var _v0 = $author$project$St$parseDoIt(src);
		if (_v0.$ === 1) {
			var e = _v0.a;
			return _Utils_Tuple2(
				$elm$core$Result$Err('syntax: ' + e),
				m0);
		} else {
			var _v1 = _v0.a;
			var tmp = _v1.a;
			var body = _v1.b;
			var _v2 = A3(
				$author$project$St$newEnv,
				$elm$core$Dict$fromList(
					A2(
						$elm$core$List$map,
						function (t) {
							return _Utils_Tuple2(t, $author$project$St$VNil);
						},
						tmp)),
				$elm$core$Maybe$Nothing,
				_Utils_update(
					m0,
					{B: m0.aD}));
			var env = _v2.a;
			var m1 = _v2.b;
			var _v3 = A3(
				$author$project$St$evalStmts,
				{E: 'UndefinedObject', W: 0, F: env, S: env, s: $author$project$St$VNil},
				body,
				m1);
			var flow = _v3.a;
			var m2 = _v3.b;
			switch (flow.$) {
				case 0:
					var v = flow.a;
					return _Utils_Tuple2(
						$elm$core$Result$Ok(v),
						A2(
							$author$project$St$collect,
							_List_fromArray(
								[v]),
							m2));
				case 1:
					var v = flow.b;
					return _Utils_Tuple2(
						$elm$core$Result$Ok(v),
						A2(
							$author$project$St$collect,
							_List_fromArray(
								[v]),
							m2));
				default:
					var e = flow.a;
					return _Utils_Tuple2(
						$elm$core$Result$Err(e),
						A2($author$project$St$collect, _List_Nil, m2));
			}
		}
	});
var $elm$json$Json$Encode$bool = _Json_wrap;
var $elm$json$Json$Encode$int = _Json_wrap;
var $elm$core$Dict$isEmpty = function (dict) {
	if (dict.$ === -2) {
		return true;
	} else {
		return false;
	}
};
var $elm$json$Json$Encode$list = F2(
	function (func, entries) {
		return _Json_wrap(
			A3(
				$elm$core$List$foldl,
				_Json_addEntry(func),
				_Json_emptyArray(0),
				entries));
	});
var $elm$json$Json$Encode$null = _Json_encodeNull;
var $elm$json$Json$Encode$object = function (pairs) {
	return _Json_wrap(
		A3(
			$elm$core$List$foldl,
			F2(
				function (_v0, obj) {
					var k = _v0.a;
					var v = _v0.b;
					return A3(_Json_addField, k, v, obj);
				}),
			_Json_emptyObject(0),
			pairs));
};
var $elm$core$List$sortBy = _List_sortBy;
var $author$project$St$ordered = function (m) {
	var depth = function (c) {
		var _v0 = A2(
			$elm$core$Maybe$andThen,
			function (s) {
				return A2($elm$core$Dict$get, s, m.c);
			},
			c.D);
		if (!_v0.$) {
			var p = _v0.a;
			return 1 + depth(p);
		} else {
			return 0;
		}
	};
	return A2(
		$elm$core$List$sortBy,
		depth,
		$elm$core$Dict$values(m.c));
};
var $elm$core$String$right = F2(
	function (n, string) {
		return (n < 1) ? '' : A3(
			$elm$core$String$slice,
			-n,
			$elm$core$String$length(string),
			string);
	});
var $elm$json$Json$Encode$string = _Json_wrap;
var $author$project$St$encodeImage = F2(
	function (workspace, m) {
		return A2(
			$elm$json$Json$Encode$encode,
			0,
			$elm$json$Json$Encode$object(
				_List_fromArray(
					[
						_Utils_Tuple2(
						'version',
						$elm$json$Json$Encode$int(1)),
						_Utils_Tuple2(
						'workspace',
						$elm$json$Json$Encode$string(workspace)),
						_Utils_Tuple2(
						'transcript',
						$elm$json$Json$Encode$string(
							A2($elm$core$String$right, 20000, m.bS))),
						_Utils_Tuple2(
						'classes',
						A2(
							$elm$json$Json$Encode$list,
							function (c) {
								return $elm$json$Json$Encode$object(
									_List_fromArray(
										[
											_Utils_Tuple2(
											'name',
											$elm$json$Json$Encode$string(c.aF)),
											_Utils_Tuple2(
											'super',
											A2(
												$elm$core$Maybe$withDefault,
												$elm$json$Json$Encode$null,
												A2($elm$core$Maybe$map, $elm$json$Json$Encode$string, c.D))),
											_Utils_Tuple2(
											'ivars',
											A2($elm$json$Json$Encode$list, $elm$json$Json$Encode$string, c.X)),
											_Utils_Tuple2(
											'builtin',
											$elm$json$Json$Encode$bool(c.R)),
											_Utils_Tuple2(
											'methods',
											A2(
												$elm$json$Json$Encode$list,
												A2(
													$elm$core$Basics$composeR,
													function ($) {
														return $.dc;
													},
													$elm$json$Json$Encode$string),
												$elm$core$Dict$values(c.I)))
										]));
							},
							A2(
								$elm$core$List$filter,
								function (c) {
									return (!c.R) || (!$elm$core$Dict$isEmpty(c.I));
								},
								$author$project$St$ordered(m))))
					])));
	});
var $elm$core$Maybe$destruct = F3(
	function (_default, func, maybe) {
		if (!maybe.$) {
			var a = maybe.a;
			return func(a);
		} else {
			return _default;
		}
	});
var $author$project$Smalltalk$store = _Platform_outgoingPort(
	'store',
	function ($) {
		return A3($elm$core$Maybe$destruct, $elm$json$Json$Encode$null, $elm$json$Json$Encode$string, $);
	});
var $author$project$Smalltalk$save = function (m) {
	return _Utils_Tuple2(
		m,
		$author$project$Smalltalk$store(
			$elm$core$Maybe$Just(
				A2($author$project$St$encodeImage, m.u, m.e))));
};
var $author$project$Smalltalk$accept = function (m) {
	var _v0 = _Utils_Tuple2(
		m.E,
		(!_Utils_eq(m.H, $elm$core$Maybe$Nothing)) || (!A2($elm$core$String$contains, 'subclass:', m.y)));
	if ((!_v0.a.$) && _v0.b) {
		var c = _v0.a.a;
		var _v1 = A3($author$project$St$compile, c, m.y, m.e);
		if (!_v1.$) {
			var _v2 = _v1.a;
			var sel = _v2.a;
			var mach = _v2.b;
			return $author$project$Smalltalk$save(
				_Utils_update(
					m,
					{
						e: mach,
						H: $elm$core$Maybe$Just(sel),
						o: 'Accepted ' + (c + ('>>' + (sel + '.')))
					}));
		} else {
			var e = _v1.a;
			return _Utils_Tuple2(
				_Utils_update(
					m,
					{o: e}),
				$elm$core$Platform$Cmd$none);
		}
	} else {
		var _v3 = A2($author$project$St$doIt, m.y, m.e);
		var r = _v3.a;
		var mach = _v3.b;
		if (!r.$) {
			if (r.a.$ === 8) {
				var c = r.a.a;
				return $author$project$Smalltalk$save(
					_Utils_update(
						m,
						{
							E: $elm$core$Maybe$Just(c),
							e: mach,
							H: $elm$core$Maybe$Nothing,
							o: 'Defined ' + (c + '.')
						}));
			} else {
				return $author$project$Smalltalk$save(
					_Utils_update(
						m,
						{e: mach, o: 'Done.'}));
			}
		} else {
			var e = r.a;
			return _Utils_Tuple2(
				_Utils_update(
					m,
					{o: e}),
				$elm$core$Platform$Cmd$none);
		}
	}
};
var $elm$core$Basics$always = F2(
	function (a, _v0) {
		return a;
	});
var $author$project$St$classDefinition = F2(
	function (m, cls) {
		var _v0 = A2($elm$core$Dict$get, cls, m.c);
		if (!_v0.$) {
			var c = _v0.a;
			return A2($elm$core$Maybe$withDefault, 'nil', c.D) + (' subclass: #' + (c.aF + ('\u000A    instanceVariableNames: \u0027' + (A2($elm$core$String$join, ' ', c.X) + '\u0027'))));
		} else {
			return 'Object subclass: #NameOfClass\u000A    instanceVariableNames: \u0027one two\u0027';
		}
	});
var $elm$browser$Browser$Navigation$load = _Browser_load;
var $author$project$St$methodSource = F3(
	function (m, cls, sel) {
		return A2(
			$elm$core$Maybe$withDefault,
			'',
			A2(
				$elm$core$Maybe$map,
				function ($) {
					return $.dc;
				},
				A2(
					$elm$core$Maybe$andThen,
					A2(
						$elm$core$Basics$composeR,
						function ($) {
							return $.I;
						},
						$elm$core$Dict$get(sel)),
					A2($elm$core$Dict$get, cls, m.c))));
	});
var $author$project$St$printIt = F2(
	function (src, m) {
		var _v0 = A2($author$project$St$doIt, src, m);
		if (!_v0.a.$) {
			var v = _v0.a.a;
			var m2 = _v0.b;
			var _v1 = A3(
				$author$project$St$newEnv,
				$elm$core$Dict$empty,
				$elm$core$Maybe$Nothing,
				_Utils_update(
					m2,
					{B: m2.aD}));
			var env = _v1.a;
			var m3 = _v1.b;
			var _v2 = A5(
				$author$project$St$send,
				{E: 'UndefinedObject', W: 0, F: env, S: env, s: $author$project$St$VNil},
				v,
				'printString',
				_List_Nil,
				m3);
			if ((!_v2.a.$) && (_v2.a.a.$ === 5)) {
				var s = _v2.a.a.a;
				var m4 = _v2.b;
				return _Utils_Tuple2(
					$elm$core$Result$Ok(s),
					A2($author$project$St$collect, _List_Nil, m4));
			} else {
				var m4 = _v2.b;
				return _Utils_Tuple2(
					$elm$core$Result$Ok(
						A2($author$project$St$printString, m4, v)),
					A2($author$project$St$collect, _List_Nil, m4));
			}
		} else {
			var e = _v0.a.a;
			var m2 = _v0.b;
			return _Utils_Tuple2(
				$elm$core$Result$Err(e),
				m2);
		}
	});
var $author$project$Smalltalk$resultText = F2(
	function (r, f) {
		if (!r.$) {
			var v = r.a;
			return f(v);
		} else {
			var e = r.a;
			return e;
		}
	});
var $author$project$Smalltalk$target = function (m) {
	var _v0 = m.aw;
	var a = _v0.a;
	var b = _v0.b;
	if (!_Utils_eq(a, b)) {
		return _Utils_Tuple2(
			A3(
				$elm$core$String$slice,
				A2($elm$core$Basics$min, a, b),
				A2($elm$core$Basics$max, a, b),
				m.u),
			A2($elm$core$Basics$max, a, b));
	} else {
		var start = A2(
			$elm$core$Maybe$withDefault,
			0,
			A2(
				$elm$core$Maybe$map,
				$elm$core$Basics$add(1),
				$elm$core$List$head(
					$elm$core$List$reverse(
						A2(
							$elm$core$String$indexes,
							'\u000A',
							A2($elm$core$String$left, a, m.u))))));
		var rest = A2($elm$core$String$dropLeft, a, m.u);
		var stop = a + A2(
			$elm$core$Maybe$withDefault,
			$elm$core$String$length(rest),
			$elm$core$List$head(
				A2($elm$core$String$indexes, '\u000A', rest)));
		return _Utils_Tuple2(
			A3($elm$core$String$slice, start, stop, m.u),
			stop);
	}
};
var $author$project$Smalltalk$update = F2(
	function (msg, m) {
		update:
		while (true) {
			switch (msg.$) {
				case 0:
					var s = msg.a;
					return $author$project$Smalltalk$save(
						_Utils_update(
							m,
							{u: s}));
				case 1:
					var s = msg.a;
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{aw: s}),
						$elm$core$Platform$Cmd$none);
				case 4:
					var k = msg.a;
					var s = msg.b;
					var $temp$msg = (k === 'p') ? $author$project$Smalltalk$PrintIt : $author$project$Smalltalk$DoIt,
						$temp$m = _Utils_update(
						m,
						{aw: s});
					msg = $temp$msg;
					m = $temp$m;
					continue update;
				case 2:
					var _v1 = $author$project$Smalltalk$target(m);
					var src = _v1.a;
					var _v2 = A2($author$project$St$doIt, src, m.e);
					var r = _v2.a;
					var mach = _v2.b;
					return $author$project$Smalltalk$save(
						_Utils_update(
							m,
							{
								e: mach,
								o: A2(
									$author$project$Smalltalk$resultText,
									r,
									$elm$core$Basics$always('Done.'))
							}));
				case 3:
					var _v3 = $author$project$Smalltalk$target(m);
					var src = _v3.a;
					var at = _v3.b;
					var _v4 = A2($author$project$St$printIt, src, m.e);
					var r = _v4.a;
					var mach = _v4.b;
					if (!r.$) {
						var s = r.a;
						return $author$project$Smalltalk$save(
							_Utils_update(
								m,
								{
									e: mach,
									o: 'Printed.',
									u: A2($elm$core$String$left, at, m.u) + (' ' + (s + A2($elm$core$String$dropLeft, at, m.u)))
								}));
					} else {
						var e = r.a;
						return $author$project$Smalltalk$save(
							_Utils_update(
								m,
								{e: mach, o: e}));
					}
				case 5:
					var c = msg.a;
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{
								E: $elm$core$Maybe$Just(c),
								y: A2($author$project$St$classDefinition, m.e, c),
								H: $elm$core$Maybe$Nothing,
								o: 'Edit the definition and accept, or pick a method.'
							}),
						$elm$core$Platform$Cmd$none);
				case 6:
					var s = msg.a;
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{
								y: A2(
									$elm$core$Maybe$withDefault,
									'',
									A2(
										$elm$core$Maybe$map,
										function (c) {
											return A3($author$project$St$methodSource, m.e, c, s);
										},
										m.E)),
								H: $elm$core$Maybe$Just(s)
							}),
						$elm$core$Platform$Cmd$none);
				case 7:
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{y: 'messageSelector: argument\u000A    \u0022comment stating purpose of message\u0022\u000A    ^argument', H: $elm$core$Maybe$Nothing, o: 'Write the method, then accept.'}),
						$elm$core$Platform$Cmd$none);
				case 8:
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{
								E: $elm$core$Maybe$Nothing,
								y: A2($author$project$St$classDefinition, m.e, ''),
								H: $elm$core$Maybe$Nothing,
								o: 'Name the class, then accept.'
							}),
						$elm$core$Platform$Cmd$none);
				case 9:
					var s = msg.a;
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{y: s}),
						$elm$core$Platform$Cmd$none);
				case 10:
					return $author$project$Smalltalk$accept(m);
				case 11:
					var mach = m.e;
					return $author$project$Smalltalk$save(
						_Utils_update(
							m,
							{
								e: _Utils_update(
									mach,
									{bS: ''})
							}));
				case 12:
					return m.ah ? _Utils_Tuple2(
						_Utils_update(
							m,
							{E: $elm$core$Maybe$Nothing, y: '', ah: false, e: $author$project$St$boot, H: $elm$core$Maybe$Nothing, o: 'A fresh image.', u: $author$project$Smalltalk$welcome}),
						$author$project$Smalltalk$store($elm$core$Maybe$Nothing)) : _Utils_Tuple2(
						_Utils_update(
							m,
							{ah: true, o: 'Press Reset again to throw this image away.'}),
						$elm$core$Platform$Cmd$none);
				case 14:
					return _Utils_Tuple2(
						_Utils_update(
							m,
							{aB: !m.aB}),
						$elm$core$Platform$Cmd$none);
				default:
					var url = msg.a;
					return _Utils_Tuple2(
						m,
						$elm$browser$Browser$Navigation$load(url));
			}
		}
	});
var $elm$json$Json$Decode$value = _Json_decodeValue;
var $author$project$Smalltalk$Accept = {$: 10};
var $author$project$Smalltalk$ClearTranscript = {$: 11};
var $author$project$Smalltalk$Code = function (a) {
	return {$: 9, a: a};
};
var $author$project$Smalltalk$Edit = function (a) {
	return {$: 0, a: a};
};
var $author$project$Smalltalk$NewClass = {$: 8};
var $author$project$Smalltalk$NewMethod = {$: 7};
var $author$project$Smalltalk$PickClass = function (a) {
	return {$: 5, a: a};
};
var $author$project$Smalltalk$PickMethod = function (a) {
	return {$: 6, a: a};
};
var $author$project$Smalltalk$Reset = {$: 12};
var $author$project$Smalltalk$Selected = function (a) {
	return {$: 1, a: a};
};
var $author$project$Smalltalk$World = {$: 14};
var $elm$html$Html$a = _VirtualDom_node('a');
var $elm$json$Json$Decode$andThen = _Json_andThen;
var $elm$json$Json$Decode$fail = _Json_fail;
var $author$project$Smalltalk$acceptKey = A2(
	$elm$json$Json$Decode$andThen,
	function (_v0) {
		var k = _v0.a;
		var ctrl = _v0.b;
		return (ctrl && (k === 's')) ? $elm$json$Json$Decode$succeed(
			_Utils_Tuple2($author$project$Smalltalk$Accept, true)) : $elm$json$Json$Decode$fail('not accept');
	},
	A3(
		$elm$json$Json$Decode$map2,
		$elm$core$Tuple$pair,
		A2($elm$json$Json$Decode$field, 'key', $elm$json$Json$Decode$string),
		A3(
			$elm$json$Json$Decode$map2,
			$elm$core$Basics$or,
			A2($elm$json$Json$Decode$field, 'ctrlKey', $elm$json$Json$Decode$bool),
			A2($elm$json$Json$Decode$field, 'metaKey', $elm$json$Json$Decode$bool))));
var $elm$virtual_dom$VirtualDom$attribute = F2(
	function (key, value) {
		return A2(
			_VirtualDom_attribute,
			_VirtualDom_noOnOrFormAction(key),
			_VirtualDom_noJavaScriptOrHtmlUri(value));
	});
var $elm$html$Html$Attributes$attribute = $elm$virtual_dom$VirtualDom$attribute;
var $elm$html$Html$button = _VirtualDom_node('button');
var $elm$html$Html$Attributes$stringProperty = F2(
	function (key, string) {
		return A2(
			_VirtualDom_property,
			key,
			$elm$json$Json$Encode$string(string));
	});
var $elm$html$Html$Attributes$class = $elm$html$Html$Attributes$stringProperty('className');
var $elm$html$Html$Attributes$classList = function (classes) {
	return $elm$html$Html$Attributes$class(
		A2(
			$elm$core$String$join,
			' ',
			A2(
				$elm$core$List$map,
				$elm$core$Tuple$first,
				A2($elm$core$List$filter, $elm$core$Tuple$second, classes))));
};
var $elm$html$Html$Attributes$boolProperty = F2(
	function (key, bool) {
		return A2(
			_VirtualDom_property,
			key,
			$elm$json$Json$Encode$bool(bool));
	});
var $elm$html$Html$Attributes$disabled = $elm$html$Html$Attributes$boolProperty('disabled');
var $elm$html$Html$div = _VirtualDom_node('div');
var $elm$html$Html$footer = _VirtualDom_node('footer');
var $author$project$Common$fundUrl = 'https://github.com/sponsors/vic';
var $elm$html$Html$Attributes$href = function (url) {
	return A2(
		$elm$html$Html$Attributes$stringProperty,
		'href',
		_VirtualDom_noJavaScriptUri(url));
};
var $elm$html$Html$li = _VirtualDom_node('li');
var $elm$html$Html$nav = _VirtualDom_node('nav');
var $elm$virtual_dom$VirtualDom$Normal = function (a) {
	return {$: 0, a: a};
};
var $elm$virtual_dom$VirtualDom$on = _VirtualDom_on;
var $elm$html$Html$Events$on = F2(
	function (event, decoder) {
		return A2(
			$elm$virtual_dom$VirtualDom$on,
			event,
			$elm$virtual_dom$VirtualDom$Normal(decoder));
	});
var $elm$html$Html$Events$onClick = function (msg) {
	return A2(
		$elm$html$Html$Events$on,
		'click',
		$elm$json$Json$Decode$succeed(msg));
};
var $elm$html$Html$Events$alwaysStop = function (x) {
	return _Utils_Tuple2(x, true);
};
var $elm$virtual_dom$VirtualDom$MayStopPropagation = function (a) {
	return {$: 1, a: a};
};
var $elm$html$Html$Events$stopPropagationOn = F2(
	function (event, decoder) {
		return A2(
			$elm$virtual_dom$VirtualDom$on,
			event,
			$elm$virtual_dom$VirtualDom$MayStopPropagation(decoder));
	});
var $elm$json$Json$Decode$at = F2(
	function (fields, decoder) {
		return A3($elm$core$List$foldr, $elm$json$Json$Decode$field, decoder, fields);
	});
var $elm$html$Html$Events$targetValue = A2(
	$elm$json$Json$Decode$at,
	_List_fromArray(
		['target', 'value']),
	$elm$json$Json$Decode$string);
var $elm$html$Html$Events$onInput = function (tagger) {
	return A2(
		$elm$html$Html$Events$stopPropagationOn,
		'input',
		A2(
			$elm$json$Json$Decode$map,
			$elm$html$Html$Events$alwaysStop,
			A2($elm$json$Json$Decode$map, tagger, $elm$html$Html$Events$targetValue)));
};
var $author$project$Common$Place = F4(
	function (name, title, glyph, blurb) {
		return {b2: blurb, cs: glyph, aF: name, bP: title};
	});
var $author$project$Common$places = _List_fromArray(
	[
		A4($author$project$Common$Place, 'home', 'oeiuwq.com', '⏻', 'Boot menu. DEL picks the colors of every page'),
		A4($author$project$Common$Place, 'codes', 'Codes', '▤', 'Mac OS 9: every repo on a timeline, Datalog and μKanren'),
		A4($author$project$Common$Place, 'projects', 'Projects', '▦', 'Turbo IDE: open any of my projects as a file'),
		A4($author$project$Common$Place, 'stars', 'Stars', '★', 'GNOME 1: search the README of 4500 repos'),
		A4($author$project$Common$Place, 'blog', 'Blog', '✎', 'A BBS with posts on what I make and why'),
		A4($author$project$Common$Place, 'portfolio', 'Portfolio', '◆', 'NeXTSTEP: my CV and track record'),
		A4($author$project$Common$Place, 'smalltalk', 'Smalltalk', '◎', 'A Smalltalk-80 that lives in your browser'),
		A4($author$project$Common$Place, 'nes', 'NEON VIGIL', '▲', '8-bit run and lash game, with a stage editor'),
		A4($author$project$Common$Place, 'adventure', 'The Lost Commit', '›', 'Text adventure on a 64, write your own story'),
		A4($author$project$Common$Place, 'sponsor', 'Arcade', '$', 'BUG HUNT, a game nobody loses. Fund the fun'),
		A4($author$project$Common$Place, 'faith', 'Faith', '✝', 'A HyperCard stack about faith and berean.faith'),
		A4($author$project$Common$Place, 'love', 'Love', '♥', 'A love letter in DOS EDIT. Write one back')
	]);
var $author$project$Common$placesBut = function (name) {
	return A2(
		$elm$core$List$filter,
		function (p) {
			return !_Utils_eq(p.aF, name);
		},
		$author$project$Common$places);
};
var $elm$html$Html$pre = _VirtualDom_node('pre');
var $elm$virtual_dom$VirtualDom$MayPreventDefault = function (a) {
	return {$: 2, a: a};
};
var $elm$html$Html$Events$preventDefaultOn = F2(
	function (event, decoder) {
		return A2(
			$elm$virtual_dom$VirtualDom$on,
			event,
			$elm$virtual_dom$VirtualDom$MayPreventDefault(decoder));
	});
var $elm$json$Json$Decode$int = _Json_decodeInt;
var $author$project$Smalltalk$selection = A3(
	$elm$json$Json$Decode$map2,
	$elm$core$Tuple$pair,
	A2(
		$elm$json$Json$Decode$at,
		_List_fromArray(
			['target', 'selectionStart']),
		$elm$json$Json$Decode$int),
	A2(
		$elm$json$Json$Decode$at,
		_List_fromArray(
			['target', 'selectionEnd']),
		$elm$json$Json$Decode$int));
var $author$project$Smalltalk$Shortcut = F2(
	function (a, b) {
		return {$: 4, a: a, b: b};
	});
var $author$project$Smalltalk$shortcuts = A2(
	$elm$json$Json$Decode$andThen,
	function (_v0) {
		var k = _v0.a;
		var ctrl = _v0.b;
		var s = _v0.c;
		return (ctrl && ((k === 'd') || (k === 'p'))) ? $elm$json$Json$Decode$succeed(
			_Utils_Tuple2(
				A2($author$project$Smalltalk$Shortcut, k, s),
				true)) : $elm$json$Json$Decode$fail('not a shortcut');
	},
	A4(
		$elm$json$Json$Decode$map3,
		F3(
			function (k, ctrl, s) {
				return _Utils_Tuple3(k, ctrl, s);
			}),
		A2($elm$json$Json$Decode$field, 'key', $elm$json$Json$Decode$string),
		A3(
			$elm$json$Json$Decode$map2,
			$elm$core$Basics$or,
			A2($elm$json$Json$Decode$field, 'ctrlKey', $elm$json$Json$Decode$bool),
			A2($elm$json$Json$Decode$field, 'metaKey', $elm$json$Json$Decode$bool)),
		$author$project$Smalltalk$selection));
var $author$project$Common$site = F2(
	function (flags, name) {
		return A2(
			$elm$core$Maybe$withDefault,
			'/',
			A2($elm$core$Dict$get, name, flags.bJ));
	});
var $elm$html$Html$span = _VirtualDom_node('span');
var $elm$html$Html$Attributes$spellcheck = $elm$html$Html$Attributes$boolProperty('spellcheck');
var $elm$virtual_dom$VirtualDom$text = _VirtualDom_text;
var $elm$html$Html$text = $elm$virtual_dom$VirtualDom$text;
var $elm$html$Html$textarea = _VirtualDom_node('textarea');
var $elm$html$Html$ul = _VirtualDom_node('ul');
var $author$project$St$userClasses = function (m) {
	var cs = $elm$core$Dict$values(m.c);
	return _Utils_ap(
		A2(
			$elm$core$List$map,
			function ($) {
				return $.aF;
			},
			A2(
				$elm$core$List$filter,
				A2(
					$elm$core$Basics$composeL,
					$elm$core$Basics$not,
					function ($) {
						return $.R;
					}),
				cs)),
		A2(
			$elm$core$List$map,
			function ($) {
				return $.aF;
			},
			A2(
				$elm$core$List$filter,
				function (c) {
					return c.R && (!$elm$core$Dict$isEmpty(c.I));
				},
				cs)));
};
var $elm$html$Html$Attributes$value = $elm$html$Html$Attributes$stringProperty('value');
var $elm$html$Html$header = _VirtualDom_node('header');
var $elm$html$Html$section = _VirtualDom_node('section');
var $author$project$Smalltalk$window = F3(
	function (cls, title_, body) {
		return A2(
			$elm$html$Html$section,
			_List_fromArray(
				[
					$elm$html$Html$Attributes$class('st-win ' + cls)
				]),
			_List_fromArray(
				[
					A2(
					$elm$html$Html$header,
					_List_fromArray(
						[
							$elm$html$Html$Attributes$class('st-tab')
						]),
					_List_fromArray(
						[
							$elm$html$Html$text(title_)
						])),
					A2(
					$elm$html$Html$div,
					_List_fromArray(
						[
							$elm$html$Html$Attributes$class('st-body')
						]),
					body)
				]));
	});
var $author$project$Smalltalk$view = function (m) {
	var go = $author$project$Common$site(m.aP);
	var classes = $author$project$St$userClasses(m.e);
	var classItem = function (c) {
		return A2(
			$elm$html$Html$li,
			_List_fromArray(
				[
					$elm$html$Html$Attributes$classList(
					_List_fromArray(
						[
							_Utils_Tuple2(
							'on',
							_Utils_eq(
								m.E,
								$elm$core$Maybe$Just(c)))
						])),
					$elm$html$Html$Events$onClick(
					$author$project$Smalltalk$PickClass(c))
				]),
			_List_fromArray(
				[
					$elm$html$Html$text(c)
				]));
	};
	var builtins = _List_fromArray(
		['Object', 'Integer', 'Number', 'String', 'Array', 'BlockClosure', 'Boolean']);
	return A2(
		$elm$html$Html$div,
		_List_fromArray(
			[
				$elm$html$Html$Attributes$class('st')
			]),
		_List_fromArray(
			[
				A2(
				$elm$html$Html$nav,
				_List_fromArray(
					[
						$elm$html$Html$Attributes$class('st-bar')
					]),
				_List_fromArray(
					[
						A2(
						$elm$html$Html$span,
						_List_fromArray(
							[
								$elm$html$Html$Attributes$class('st-logo')
							]),
						_List_fromArray(
							[
								$elm$html$Html$text('Smalltalk-80')
							])),
						A2(
						$elm$html$Html$button,
						_List_fromArray(
							[
								$elm$html$Html$Events$onClick($author$project$Smalltalk$ClearTranscript)
							]),
						_List_fromArray(
							[
								$elm$html$Html$text('Clear transcript')
							])),
						A2(
						$elm$html$Html$button,
						_List_fromArray(
							[
								$elm$html$Html$Events$onClick($author$project$Smalltalk$Reset),
								$elm$html$Html$Attributes$classList(
								_List_fromArray(
									[
										_Utils_Tuple2('warn', m.ah)
									]))
							]),
						_List_fromArray(
							[
								$elm$html$Html$text('Reset image')
							])),
						A2(
						$elm$html$Html$span,
						_List_fromArray(
							[
								$elm$html$Html$Attributes$class('st-grow')
							]),
						_List_Nil),
						A2(
						$elm$html$Html$div,
						_List_fromArray(
							[
								$elm$html$Html$Attributes$class('st-world')
							]),
						_List_fromArray(
							[
								A2(
								$elm$html$Html$button,
								_List_fromArray(
									[
										$elm$html$Html$Events$onClick($author$project$Smalltalk$World)
									]),
								_List_fromArray(
									[
										$elm$html$Html$text('World ▾')
									])),
								m.aB ? A2(
								$elm$html$Html$ul,
								_List_fromArray(
									[
										$elm$html$Html$Attributes$class('st-worldmenu')
									]),
								A2(
									$elm$core$List$map,
									function (pl) {
										return A2(
											$elm$html$Html$li,
											_List_Nil,
											_List_fromArray(
												[
													A2(
													$elm$html$Html$a,
													_List_fromArray(
														[
															$elm$html$Html$Attributes$href(
															go(pl.aF))
														]),
													_List_fromArray(
														[
															$elm$html$Html$text(pl.bP + ' '),
															A2(
															$elm$html$Html$span,
															_List_Nil,
															_List_fromArray(
																[
																	$elm$html$Html$text(pl.b2)
																]))
														]))
												]));
									},
									$author$project$Common$placesBut('smalltalk'))) : $elm$html$Html$text('')
							])),
						A2(
						$elm$html$Html$a,
						_List_fromArray(
							[
								$elm$html$Html$Attributes$href($author$project$Common$fundUrl)
							]),
						_List_fromArray(
							[
								$elm$html$Html$text('♥ sponsor')
							]))
					])),
				A2(
				$elm$html$Html$div,
				_List_fromArray(
					[
						$elm$html$Html$Attributes$class('st-desk')
					]),
				_List_fromArray(
					[
						A3(
						$author$project$Smalltalk$window,
						'st-work',
						'Workspace',
						_List_fromArray(
							[
								A2(
								$elm$html$Html$textarea,
								_List_fromArray(
									[
										$elm$html$Html$Attributes$value(m.u),
										$elm$html$Html$Events$onInput($author$project$Smalltalk$Edit),
										$elm$html$Html$Attributes$spellcheck(false),
										A2(
										$elm$html$Html$Events$on,
										'select',
										A2($elm$json$Json$Decode$map, $author$project$Smalltalk$Selected, $author$project$Smalltalk$selection)),
										A2(
										$elm$html$Html$Events$on,
										'keyup',
										A2($elm$json$Json$Decode$map, $author$project$Smalltalk$Selected, $author$project$Smalltalk$selection)),
										A2(
										$elm$html$Html$Events$on,
										'mouseup',
										A2($elm$json$Json$Decode$map, $author$project$Smalltalk$Selected, $author$project$Smalltalk$selection)),
										A2($elm$html$Html$Events$preventDefaultOn, 'keydown', $author$project$Smalltalk$shortcuts),
										A2($elm$html$Html$Attributes$attribute, 'aria-label', 'Workspace')
									]),
								_List_Nil),
								A2(
								$elm$html$Html$div,
								_List_fromArray(
									[
										$elm$html$Html$Attributes$class('st-buttons')
									]),
								_List_fromArray(
									[
										A2(
										$elm$html$Html$button,
										_List_fromArray(
											[
												$elm$html$Html$Events$onClick($author$project$Smalltalk$DoIt)
											]),
										_List_fromArray(
											[
												$elm$html$Html$text('do it (Ctrl+D)')
											])),
										A2(
										$elm$html$Html$button,
										_List_fromArray(
											[
												$elm$html$Html$Events$onClick($author$project$Smalltalk$PrintIt)
											]),
										_List_fromArray(
											[
												$elm$html$Html$text('print it (Ctrl+P)')
											]))
									]))
							])),
						A3(
						$author$project$Smalltalk$window,
						'st-trans',
						'Transcript',
						_List_fromArray(
							[
								A2(
								$elm$html$Html$pre,
								_List_Nil,
								_List_fromArray(
									[
										$elm$html$Html$text(m.e.bS)
									]))
							])),
						A3(
						$author$project$Smalltalk$window,
						'st-browser',
						'System Browser',
						_List_fromArray(
							[
								A2(
								$elm$html$Html$div,
								_List_fromArray(
									[
										$elm$html$Html$Attributes$class('st-panes')
									]),
								_List_fromArray(
									[
										A2(
										$elm$html$Html$ul,
										_List_fromArray(
											[
												$elm$html$Html$Attributes$class('st-pane')
											]),
										_Utils_ap(
											A2($elm$core$List$map, classItem, classes),
											A2(
												$elm$core$List$cons,
												A2(
													$elm$html$Html$li,
													_List_fromArray(
														[
															$elm$html$Html$Attributes$class('st-sep')
														]),
													_List_fromArray(
														[
															$elm$html$Html$text('built in')
														])),
												A2(
													$elm$core$List$map,
													classItem,
													A2(
														$elm$core$List$filter,
														function (c) {
															return !A2($elm$core$List$member, c, classes);
														},
														builtins))))),
										A2(
										$elm$html$Html$ul,
										_List_fromArray(
											[
												$elm$html$Html$Attributes$class('st-pane')
											]),
										function () {
											var _v0 = m.E;
											if (!_v0.$) {
												var c = _v0.a;
												return A2(
													$elm$core$List$map,
													function (s) {
														return A2(
															$elm$html$Html$li,
															_List_fromArray(
																[
																	$elm$html$Html$Attributes$classList(
																	_List_fromArray(
																		[
																			_Utils_Tuple2(
																			'on',
																			_Utils_eq(
																				m.H,
																				$elm$core$Maybe$Just(s)))
																		])),
																	$elm$html$Html$Events$onClick(
																	$author$project$Smalltalk$PickMethod(s))
																]),
															_List_fromArray(
																[
																	$elm$html$Html$text(s)
																]));
													},
													A2($author$project$St$selectors, m.e, c));
											} else {
												return _List_Nil;
											}
										}())
									])),
								A2(
								$elm$html$Html$textarea,
								_List_fromArray(
									[
										$elm$html$Html$Attributes$class('st-code'),
										$elm$html$Html$Attributes$value(m.y),
										$elm$html$Html$Events$onInput($author$project$Smalltalk$Code),
										$elm$html$Html$Attributes$spellcheck(false),
										A2($elm$html$Html$Events$preventDefaultOn, 'keydown', $author$project$Smalltalk$acceptKey),
										A2($elm$html$Html$Attributes$attribute, 'aria-label', 'Code')
									]),
								_List_Nil),
								A2(
								$elm$html$Html$div,
								_List_fromArray(
									[
										$elm$html$Html$Attributes$class('st-buttons')
									]),
								_List_fromArray(
									[
										A2(
										$elm$html$Html$button,
										_List_fromArray(
											[
												$elm$html$Html$Events$onClick($author$project$Smalltalk$Accept)
											]),
										_List_fromArray(
											[
												$elm$html$Html$text('accept (Ctrl+S)')
											])),
										A2(
										$elm$html$Html$button,
										_List_fromArray(
											[
												$elm$html$Html$Events$onClick($author$project$Smalltalk$NewMethod),
												$elm$html$Html$Attributes$disabled(
												_Utils_eq(m.E, $elm$core$Maybe$Nothing))
											]),
										_List_fromArray(
											[
												$elm$html$Html$text('new method')
											])),
										A2(
										$elm$html$Html$button,
										_List_fromArray(
											[
												$elm$html$Html$Events$onClick($author$project$Smalltalk$NewClass)
											]),
										_List_fromArray(
											[
												$elm$html$Html$text('new class')
											]))
									]))
							]))
					])),
				A2(
				$elm$html$Html$footer,
				_List_fromArray(
					[
						$elm$html$Html$Attributes$class('st-status')
					]),
				_List_fromArray(
					[
						$elm$html$Html$text(m.o)
					]))
			]));
};
var $author$project$Smalltalk$main = $elm$browser$Browser$element(
	{
		cz: $author$project$Smalltalk$init,
		dh: function (_v0) {
			return $elm$core$Platform$Sub$none;
		},
		$7: $author$project$Smalltalk$update,
		dq: $author$project$Smalltalk$view
	});
_Platform_export({'Smalltalk':{'init':$author$project$Smalltalk$main($elm$json$Json$Decode$value)(0)}});}(this));