/*
	アスキーアートの表示を調整します (非同期)
	例: processAA('.aa');

	processAA(selectors: string, callback?: function(number)): number
	processAA.abort(id: number): void
*/

var processAA = (function (h,b) { // h: ハフマンテーブル, b: Base64 文字列

// 文字幅テーブル
var _ = {};
// cwtable.js:1
for(var i=0,x,t=0,l=0,v,u=0,s=String.fromCharCode;x=b.charCodeAt(i++);){x=x&64?x&32?x-71:x-65:x&16?x+4:x>>2|62;for(var j=5;j>=0;j--){t=t<<1|x>>j&1;var g=h[l++];if(t in g){t=g[t];if(v)if(v<0){if(t)_[s(u)]=t;u++,v++}else{if(t)while(v--)_[s(u++)]=t;else u+=v;v=0}else v=t<0?t-1:t+1;t=l=0}}}

var isAA = '__isAA'; // 完了フラグプロパティ名
var reS = /\S/;

var px = 'px';
function createSpan() {
	return document.createElement('span');
}
function getWidth(span) {
	return span.getBoundingClientRect().width;
}

function Diff(ch, width, expect) {
	this.ch = ch;
	this.width = width;
	this.value = expect - width;
}
// 続くと縮むか (Android 対応のため)
function isMutable() {
	return this.mutable;
}
Diff.prototype.isMutable = function() {
	this.isMutable = isMutable;
	var ch = this.ch;
	return this.mutable = this.measure.widthOf(ch + ch) < this.width * 2;
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

measure.span = null;

function widthOf(str) {
	this.text.data = str;
	return getWidth(this.span);
}
measure.widthOf = function (str) {
	this.widthOf = widthOf;
	var span = createSpan();
	span.style.whiteSpace = 'pre';
	this.text = span.appendChild(document.createTextNode(str));
	this.span = this.element.appendChild(span);
	return getWidth(span);
};

function diffOf(ch) {
	var c = this.cache;
	var diff = ch in c ? c[ch] :
	           ch in _ ? c[ch] =
		new Diff(ch, this.widthOf(ch), _[ch] * c.em)
		: noDiff;
	diff.measure = this;
	return diff;
}
measure.diffOf = function (ch) {
	this.diffOf = diffOf;
	var s = getComputedStyle(this.element);
	var size = s.fontSize;
	var font = s.fontVariant + s.fontWeight + size + s.fontFamily;
	this.cache = font in caches ? caches[font] :
		caches[font] = new Cache(size);
	return this.diffOf(ch);
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
	var node = document.createTextNode(str);
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
	var fragment = document.createDocumentFragment();
	var prev = noDiff;
	var h = 0, i = 0;
	var ch = str.charAt(0);
	if (ch) {
		prev = measure.diffOf(ch);
		while (ch = str.charAt(++i)) {
			var diff = measure.diffOf(ch);
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
		case 1: this.defer(node); break;
		case 3:
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
	var elements = document.querySelectorAll(selectors);
	var l = elements.length;
	for (var i = 0; i < l; i++) find.defer(elements[i]);
	return find.id;
}
process.abort = abort;
return process;

// Windows XP, Firefox ESR 52 による cwtable の出力
})([{},{},{1:11,2:1,4:8},{10:9,12:10,14:16,15:0},{1:12,2:4,3:3,12:-1,13:5,14:2,15:6,27:7},{0:-3,44:13,46:14,47:15},{107:-2},{6:-7,7:-4,183:-5},{361:-6,362:34,363:30,365:-10,416:-13,417:-9},{16:288,17:35,18:59,19:46,20:118,21:98,22:48129,23:2341,720:177,721:210,728:1021,729:31,836:23,837:28,838:49,839:63,840:-8,841:20,842:48},{1686:32,1687:-20,1688:-14,1689:-35,1690:17,1691:57,1692:79,1693:149,1694:-16,1695:-29,1696:6533,1697:107,1698:267,1699:40,1700:84,1701:-12,1702:25,1703:21,1704:24,1705:317,1706:138,1707:73,1708:19,1709:144,1710:27,1711:2112}],'tn2NEOMwaaprHB5EN0ZsrGHFVtOCrKDhwrPpYwOKrdsbtuxQGbuDFsYRzW/b1AM3NuF+9LfoGihlC6F5z0VyE6IaF5dP23ER0ms21YIs4jx1NnkUTWbe+f25oMmQwwwwx2KtLypUqVDs7OzvJkW09bcK3GX1vFvTFCoVNptNyZMUBqhhhiOmcfj83m83m83T6fT8mTJkyZDlRVb7rdbmmv/NN/f2if/D9mRx+ac9sZWKeVsAx+On46axPG5/44rFPKpP+J62p+1jKxP+lNdGKv2+Ldvk3H4o06L62z32ezY0Jk3p300f+J3+MX6Fr8Hh359H293+/rS+puPnd9P4HfNzNG9nRUBgm0iDzPrNH4D+j1vxpqpT/U8rGUVmnoaMNZDhhhjiDQ4cMoPrYFTIjpFbyZDRWafo0cNGVMrKyjWTJkNGhIsyL2Gl7MjvAyZEbepUqI6Ct1MrKMMMXgxhhmRew5qD7c4cOah9lTUX22dOaIeNcheyNUAPeVENRj9qaxiGu8W/ZxXA5bDtQDn7aiBC2J+o/9rvjUP3hah9/4j9POpPcQOqFYw7cVAKw7RA41jj+OIP1ZUWalp+ccp8NHai3qbwy1cHx8wvh1vL3FjyntIpRQkUJhrCD11dWyngF5eiKtJ9nRcp5XKfzoBU4tjB8oPhxnRvMnCi58/qn7k/gxcOLlF2p4uUXaLP7VE/tGl//gf15/B9HVP6q7SfH2z/IrkVyK5F3I/yLuR/kVyK5FciuRXI/yP9s/2qzXrtxC8ii5sZuLmxm4udP5RduLZni3P6/9Wc37Xzq+WrkdeHHHXz+R18/tW+Pv8fL9Xd/2rtf94+d7O9/L39Z9r536J3/Z2r/cRdUXKZ1376foQ32X4Q3WXrlcDVZf1lwbkH73cO9XfYr1d4Vd97edfO+53W2y7ruDdYG7lc7td19jfUYEr7aG7LA3husvsdf9jr2WXLnXK8DrLguvtIbr7r8Kv12Xl3eFXfYrm36C48G6zrL8DYHlcwN67XZdegjvZL0EEPBHgS/Suu88PwT7/BTh+CvL7XwLetgv/9aH/2lfbPWj63bHv5RcAePUVBd5cFhxB0gWBy8NhsQQMCedjJymh6VlZTaxC14K8eW76bkCOa+nLxb11NijNxZ9Oy01lZRpYqdn7WW9ZMlOzQ7Mw5KhHSFo/t5e+A');
