/*
	アスキーアートの表示を調整します (非同期)
	例: processAA('.aa');

	processAA(selectors: string, callback?: function(number)): number
	processAA.abort(id: number): void
*/

var processAA = (function (h,b) { // h: ハフマンテーブル, b: Base64 文字列

// 文字幅テーブル
var _ = {};
// cwtable.html:28
for(var i=0,x,t=0,l=0,v,u=0,s=String.fromCharCode;x=b.charCodeAt(i++);){x=x&64?x&32?x-71:x-65:x&16?x+4:x>>2|62;for(var j=5;j>=0;j--){t=t<<1|x>>j&1;var g=h[l++];if(t in g){t=g[t];if(v)if(v<0){if(t)_[s(u)]=t;u++,v++}else{if(t)while(v--)_[s(u++)]=t;else u+=v;v=0}else v=t<0?t-1:t+1;t=l=0}}}

var isAA = '__isAA'; // 完了フラグプロパティ名
var reS = /\S/;

var $ = document;
var px = 'px';
function createSpan() {
	return $.createElement('span');
}
function getWidth(span) {
	return span.getBoundingClientRect().width;
}

function Diff(char, width, expect) {
	this.char = char;
	this.width = width;
	this.value = expect - width;
}
// 続くと縮むか (Android 対応のため)
function isMutable() {
	return this.mutable;
}
Diff.prototype.isMutable = function() {
	this.isMutable = isMutable;
	var char = this.char;
	return this.mutable = this.measure.widthOf(char + char) < this.width * 2;
};

var noDiff = new Diff('', 0, 0);
noDiff.mutable = false;
noDiff.isMutable = isMutable;

// 文字に対する Diff を保持
function Cache(fontSize) {
	// ※ プロパティ名は二文字以上
	this.em = parseFloat(fontSize) / 16;
}
var caches = {}; // フォントに対する Cache を保持

function Measure(element) {
	this.element = element;
}
var measure = Measure.prototype;

function widthOf(str) {
	this.text.data = str;
	return getWidth(this.span);
}
measure.widthOf = function (str) {
	this.widthOf = widthOf;
	var span = createSpan();
	span.style.whiteSpace = 'pre';
	this.text = span.appendChild($.createTextNode(str));
	this.span = this.element.appendChild(span);
	return getWidth(span);
};

function diffOf(char) {
	var c = this.cache;
	var diff = char in c ? c[char] :
	           char in _ ? c[char] =
		new Diff(char, this.widthOf(char), _[char] * c.em)
		: noDiff;
	diff.measure = this;
	return diff;
}
measure.diffOf = function (char) {
	this.diffOf = diffOf;
	var s = getComputedStyle(this.element);
	var size = s.fontSize;
	var font = s.fontVariant + s.fontWeight + size + s.fontFamily;
	this.cache = font in caches ? caches[font] :
		caches[font] = new Cache(size);
	return this.diffOf(char);
};

// 描画されていない要素か
function isInvalid() {
	return this.invalid;
}
measure.isInvalid = function () {
	this.isInvalid = isInvalid;
	var e = this.element;
	return this.invalid = !(e.offsetWidth && e.offsetHeight);
};

measure.dispose = function () {
	var span = this.span;
	if (span) this.element.removeChild(span);
};

function part(str, diff) {
	var value = diff.value;
	var node = $.createTextNode(str);
	if (value || diff.isMutable()) {
		var span = createSpan();
		if (value) {
			var style = span.style;
			var ns = reS.test(str), a = ns && str.length == 1;
			if (!a) style.letterSpacing = value + px;
			if (ns) {
				value /= 2;
				var margin = value + px;
				style.marginRight = a ? margin : -value + px;
				style.marginLeft = margin;
			}
		}
		span.appendChild(node);
		node = span;
	}
	node[isAA] = true;
	return node;
}
function create(str, measure) {
	var fragment = $.createDocumentFragment();
	var prev = noDiff;
	var h = 0, i = 0;
	var char = str.charAt(0);
	if (char) {
		prev = measure.diffOf(char);
		while (char = str.charAt(++i)) {
			var diff = measure.diffOf(char);
			if (diff.value != prev.value || prev.isMutable() || diff.isMutable()) {
				fragment.appendChild(part(str.substring(h, i), prev));
				prev = diff;
				h = i;
			}
		}
	}
	fragment.appendChild(part(str.substring(h, i), prev));
	return fragment;
}

var intIds = [];
// 指定された id の処理を中断
function abort(id) {
	clearInterval(intIds[id - 1]);
}

// setInterval による非同期処理
function Find(callback) {
	var self = this;
	var queue = this.queue = [];
	var id = this.id = intIds.push(setInterval(function () {
		var sync; do {
			var element = queue.shift();
			if (element) sync = self.exec(element);
			else {
				abort(id);
				if (callback) callback(id);
				break;
			}
		} while (sync);
	}, 0));
}
var find = Find.prototype;
find.defer = function (element) {
	if (element[isAA]) return;
	this.queue.push(element);
};
find.exec = function (element) { // 幅優先探索
	var sync = true;
	var measure = new Measure(element);
	for (var node = element.firstChild; node; ) {
		var next = node.nextSibling;
		switch (node.nodeType) {
		case Node.ELEMENT_NODE: this.defer(node); break;
		case Node.TEXT_NODE:
			if (measure.isInvalid() || node[isAA]) break;
			element.replaceChild(create(node.data, measure), node);
			if (sync) sync = false;
		}
		node = next;
	}
	measure.dispose();
	return sync;
};

// 指定されたセレクタの示す要素を処理　戻り値は処理の id
function process(selectors, callback) {
	var find = new Find(typeof callback == 'function' ? callback : null);
	var elements = $.querySelectorAll(selectors);
	var l = elements.length;
	for (var i = 0; i < l; i++) find.defer(elements[i]);
	return find.id;
}
process.abort = abort;
return process;

// KB927490 を適用した Windows 7, IE8 による cwtable の出力から padding を省略したもの
})([{},{0:0},{5:16},{4:9,7:10,9:11,13:8,14:1},{11:6,17:7},{20:13,32:15,33:14,49:12,50:-1,51:5,60:4,62:3,63:2},{96:-3,123:-2},{86:-5},{168:30,169:27,170:56,171:52,174:-10,175:-7,192:-13,193:-9,194:-6,195:21,196:35,197:18,198:22,388:-4,389:34,390:31,391:25},{398:32,399:79,400:49,401:24,402:155,403:83,404:73,405:19,406:144,407:57,408:36,409:33,410:50,411:151,412:47,413:53,414:96,415:48,416:58,976:17,977:45,978:23,979:28,980:63,981:-8,982:29,983:20},{834:-20,835:-14,836:-35,837:137,838:-16,839:-29,840:1271,841:1098,842:2458,843:1633,844:107,845:123,846:139,847:77,848:-12,849:59,850:158,851:372,852:78,853:55,854:1539,855:239,856:75,857:46,858:118,859:98,860:38,861:66,862:60,863:54,864:67,865:69,866:26,867:253,868:97,869:61,870:68,871:193,872:112,873:65,874:37,875:84,876:39,877:169,878:88,879:43,880:91,881:86,882:44,883:101,884:249,885:145,886:125,887:133,888:162,889:110,890:43940,891:94,892:149,893:760,894:71,895:185}],'wxln59uT/dn2+/t+fe+/3KM8+UvyK6X8R0xeXnnE58sX5FbPc45x81X5x37yP2P2+1xX24Hjsf/CLHDAz82dTy7K5c6evef733vxc/6Rzfp+Ts8o58/k5Wfn/TPSfN7PKK16WOsB9fZ2dnZ2d/fkaFqampqbMZjMZi+vvR5fR/8VvpWkX6LQ08TxM0zTN9fX7Ve+zs7O9LRHW63i8Xi8Xii0Wi319fX19fZdN5FaKRSO+gZPPohFCC+kF4wPr7/JrHme5I/aT0cE6t/9H/334v79Y/88/aTycs3l9HtI8+SPyxO32k7yEV70VZ9jq37c59M6OXy+D787zMyj93nvY7meS0U7P4PPw+8GDmt/nmJJ0mdoLrCWmx1e2iLuEXsddkDK7yYH8zTpwmuI/qXAXV9E+7Pk7Q7SefJJ52jbKTso+y87Ozv8+rsvLzqb/HTo4E196fVSL6+yk87R0lJeUnU10dHSUfX19lJTzpyfeMpTjJ9/MD6+9Ksmpqb0sBIpro6Ts7O8K+dnZ194yl2kHS0kHaUGtLOx9QVpeXl2mGSa007ei04V23bn58+f/eH2k9Se3vu3Jce339591PImVnrhJz2Y9uCrjn04NnPeWY8iwvrBn+bn3wvHPvqD9Ii5YWy6TrtPP5wVNnnymP89uBHmPTgso/8j/zhKjpvO1BFvZdF7KTHt6OHMdwtxPrlK9n2uV/zkueXnPmpPedPeZSjzhEqVIzy8ErlfT4nrmV3r2k9e0v+4E2znuX17fr9uV3O5bfN6r0qaR3S471+3r29WHvXt6+npWR0rIbAD8cmnty+BVnSyRDcismFaiNSofWMl6evT16evT/ekvT/ekvT16evT16evT16S9JYyVlJQ6x3vCfN657lHeue5R3r/pe3rHejOnkdLAMreOvCov6G4W9Pt5f+fdXen3V1lj6h9eFTQwt9lPr+ZUXeF1QVF/PSoKVqZ2tUO1qoVlzkasfz5U3r2vYSN/P7+MHGBSB5xhUg69Cr0UgqkOMPYkH9+g6EU6DoTHoSDO/wbSH+q5SGw3GFTGG9D/coYP1OOvbljPVXYwupjBjCpAp/AKfwZKQ9f4egwVSHH+BhYwwQwPPQe1IJ/pj0Ip0OcDAhm4wqVSB8VMb0OWMHX2pDB2P0GWwdiVq4T2PtJh6f1Pcup2OGGJcSG4YaxfhrNBrV+Gt3hUX8L+FZg90qqPdK1wKzIXML8F8CsUK10K146/BUCtfPdKqQrKhWRCwBWwBWwhfgvBVWFZY6xOsQrGCs0FwwXwK4WIXgvohcwuhWxBfgrNhVSF4KyYVsYX4K2Q6+gFwoVz3S+BWUC6FhOvwVhhaFkLoVmQvrBWGFZIKoFbKFkK2YKqwrMBWKFZwKqguGC+Hulw4WAK2cLhwvHulZ0LhwuIVngvrBWXCtoCtpC5hWKFY8KgVtQVYX4KxQuYVtYVngsIXMKxArbArGCttPdKxgqgX4L4FZwKsLhwv4VhhWOCoF9cKzQX4KxgvphW3BcOFbeF+CsQKz4XChWgC4hW4BW4hWbC+kFbkF0K3MK3QKzoX0AuhWIFbqFbsFbuFWFWF9cL6IWIVvAWQqrCt5Ct6CodZCqoK3sK4VnzDXhoK3w6LfQrfjtb+Lvb1wTZqT2+Un/HKX7H1fHxeDFSVOxwPjN/fLb2sG6jo6Zo/ee38g+dWWmb7j9vu7e3yPtNj5uUd5xP3YSOjpKc/J+5HnVkfX1P3YMZ15fU2fk7z1BdBew');
