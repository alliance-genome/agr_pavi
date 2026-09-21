function vn(t, e) {
  return t == null || e == null ? NaN : t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
}
function _o(t, e) {
  return t == null || e == null ? NaN : e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN;
}
function Ra(t) {
  let e, n, i;
  t.length !== 2 ? (e = vn, n = (o, c) => vn(t(o), c), i = (o, c) => t(o) - c) : (e = t === vn || t === _o ? t : go, n = t, i = t);
  function r(o, c, f = 0, u = o.length) {
    if (f < u) {
      if (e(c, c) !== 0) return u;
      do {
        const _ = f + u >>> 1;
        n(o[_], c) < 0 ? f = _ + 1 : u = _;
      } while (f < u);
    }
    return f;
  }
  function a(o, c, f = 0, u = o.length) {
    if (f < u) {
      if (e(c, c) !== 0) return u;
      do {
        const _ = f + u >>> 1;
        n(o[_], c) <= 0 ? f = _ + 1 : u = _;
      } while (f < u);
    }
    return f;
  }
  function s(o, c, f = 0, u = o.length) {
    const _ = r(o, c, f, u - 1);
    return _ > f && i(o[_ - 1], c) > -i(o[_], c) ? _ - 1 : _;
  }
  return { left: r, center: s, right: a };
}
function go() {
  return 0;
}
function mo(t) {
  return t === null ? NaN : +t;
}
const vo = Ra(vn), wo = vo.right;
Ra(mo).center;
const yo = Math.sqrt(50), xo = Math.sqrt(10), bo = Math.sqrt(2);
function En(t, e, n) {
  const i = (e - t) / Math.max(0, n), r = Math.floor(Math.log10(i)), a = i / Math.pow(10, r), s = a >= yo ? 10 : a >= xo ? 5 : a >= bo ? 2 : 1;
  let o, c, f;
  return r < 0 ? (f = Math.pow(10, -r) / s, o = Math.round(t * f), c = Math.round(e * f), o / f < t && ++o, c / f > e && --c, f = -f) : (f = Math.pow(10, r) * s, o = Math.round(t / f), c = Math.round(e / f), o * f < t && ++o, c * f > e && --c), c < o && 0.5 <= n && n < 2 ? En(t, e, n * 2) : [o, c, f];
}
function ko(t, e, n) {
  if (e = +e, t = +t, n = +n, !(n > 0)) return [];
  if (t === e) return [t];
  const i = e < t, [r, a, s] = i ? En(e, t, n) : En(t, e, n);
  if (!(a >= r)) return [];
  const o = a - r + 1, c = new Array(o);
  if (i)
    if (s < 0) for (let f = 0; f < o; ++f) c[f] = (a - f) / -s;
    else for (let f = 0; f < o; ++f) c[f] = (a - f) * s;
  else if (s < 0) for (let f = 0; f < o; ++f) c[f] = (r + f) / -s;
  else for (let f = 0; f < o; ++f) c[f] = (r + f) * s;
  return c;
}
function mi(t, e, n) {
  return e = +e, t = +t, n = +n, En(t, e, n)[2];
}
function To(t, e, n) {
  e = +e, t = +t, n = +n;
  const i = e < t, r = i ? mi(e, t, n) : mi(t, e, n);
  return (i ? -1 : 1) * (r < 0 ? 1 / -r : r);
}
function Eo(t) {
  return t;
}
var wn = 1, Wn = 2, vi = 3, an = 4, ar = 1e-6;
function So(t) {
  return "translate(" + t + ",0)";
}
function Ao(t) {
  return "translate(0," + t + ")";
}
function $o(t) {
  return (e) => +t(e);
}
function No(t, e) {
  return e = Math.max(0, t.bandwidth() - e * 2) / 2, t.round() && (e = Math.round(e)), (n) => +t(n) + e;
}
function Io() {
  return !this.__axis;
}
function Ma(t, e) {
  var n = [], i = null, r = null, a = 6, s = 6, o = 3, c = typeof window < "u" && window.devicePixelRatio > 1 ? 0 : 0.5, f = t === wn || t === an ? -1 : 1, u = t === an || t === Wn ? "x" : "y", _ = t === wn || t === vi ? So : Ao;
  function p(g) {
    var T = i ?? (e.ticks ? e.ticks.apply(e, n) : e.domain()), z = r ?? (e.tickFormat ? e.tickFormat.apply(e, n) : Eo), R = Math.max(a, 0) + o, $ = e.range(), E = +$[0] + c, k = +$[$.length - 1] + c, x = (e.bandwidth ? No : $o)(e.copy(), c), A = g.selection ? g.selection() : g, N = A.selectAll(".domain").data([null]), S = A.selectAll(".tick").data(T, e).order(), B = S.exit(), P = S.enter().append("g").attr("class", "tick"), F = S.select("line"), w = S.select("text");
    N = N.merge(N.enter().insert("path", ".tick").attr("class", "domain").attr("stroke", "currentColor")), S = S.merge(P), F = F.merge(P.append("line").attr("stroke", "currentColor").attr(u + "2", f * a)), w = w.merge(P.append("text").attr("fill", "currentColor").attr(u, f * R).attr("dy", t === wn ? "0em" : t === vi ? "0.71em" : "0.32em")), g !== A && (N = N.transition(g), S = S.transition(g), F = F.transition(g), w = w.transition(g), B = B.transition(g).attr("opacity", ar).attr("transform", function(U) {
      return isFinite(U = x(U)) ? _(U + c) : this.getAttribute("transform");
    }), P.attr("opacity", ar).attr("transform", function(U) {
      var V = this.parentNode.__axis;
      return _((V && isFinite(V = V(U)) ? V : x(U)) + c);
    })), B.remove(), N.attr("d", t === an || t === Wn ? s ? "M" + f * s + "," + E + "H" + c + "V" + k + "H" + f * s : "M" + c + "," + E + "V" + k : s ? "M" + E + "," + f * s + "V" + c + "H" + k + "V" + f * s : "M" + E + "," + c + "H" + k), S.attr("opacity", 1).attr("transform", function(U) {
      return _(x(U) + c);
    }), F.attr(u + "2", f * a), w.attr(u, f * R).text(z), A.filter(Io).attr("fill", "none").attr("font-size", 10).attr("font-family", "sans-serif").attr("text-anchor", t === Wn ? "start" : t === an ? "end" : "middle"), A.each(function() {
      this.__axis = x;
    });
  }
  return p.scale = function(g) {
    return arguments.length ? (e = g, p) : e;
  }, p.ticks = function() {
    return n = Array.from(arguments), p;
  }, p.tickArguments = function(g) {
    return arguments.length ? (n = g == null ? [] : Array.from(g), p) : n.slice();
  }, p.tickValues = function(g) {
    return arguments.length ? (i = g == null ? null : Array.from(g), p) : i && i.slice();
  }, p.tickFormat = function(g) {
    return arguments.length ? (r = g, p) : r;
  }, p.tickSize = function(g) {
    return arguments.length ? (a = s = +g, p) : a;
  }, p.tickSizeInner = function(g) {
    return arguments.length ? (a = +g, p) : a;
  }, p.tickSizeOuter = function(g) {
    return arguments.length ? (s = +g, p) : s;
  }, p.tickPadding = function(g) {
    return arguments.length ? (o = +g, p) : o;
  }, p.offset = function(g) {
    return arguments.length ? (c = +g, p) : c;
  }, p;
}
function sr(t) {
  return Ma(wn, t);
}
function Do(t) {
  return Ma(vi, t);
}
var Ro = { value: () => {
} };
function La() {
  for (var t = 0, e = arguments.length, n = {}, i; t < e; ++t) {
    if (!(i = arguments[t] + "") || i in n || /[\s.]/.test(i)) throw new Error("illegal type: " + i);
    n[i] = [];
  }
  return new yn(n);
}
function yn(t) {
  this._ = t;
}
function Mo(t, e) {
  return t.trim().split(/^|\s+/).map(function(n) {
    var i = "", r = n.indexOf(".");
    if (r >= 0 && (i = n.slice(r + 1), n = n.slice(0, r)), n && !e.hasOwnProperty(n)) throw new Error("unknown type: " + n);
    return { type: n, name: i };
  });
}
yn.prototype = La.prototype = {
  constructor: yn,
  on: function(t, e) {
    var n = this._, i = Mo(t + "", n), r, a = -1, s = i.length;
    if (arguments.length < 2) {
      for (; ++a < s; ) if ((r = (t = i[a]).type) && (r = Lo(n[r], t.name))) return r;
      return;
    }
    if (e != null && typeof e != "function") throw new Error("invalid callback: " + e);
    for (; ++a < s; )
      if (r = (t = i[a]).type) n[r] = or(n[r], t.name, e);
      else if (e == null) for (r in n) n[r] = or(n[r], t.name, null);
    return this;
  },
  copy: function() {
    var t = {}, e = this._;
    for (var n in e) t[n] = e[n].slice();
    return new yn(t);
  },
  call: function(t, e) {
    if ((r = arguments.length - 2) > 0) for (var n = new Array(r), i = 0, r, a; i < r; ++i) n[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    for (a = this._[t], i = 0, r = a.length; i < r; ++i) a[i].value.apply(e, n);
  },
  apply: function(t, e, n) {
    if (!this._.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    for (var i = this._[t], r = 0, a = i.length; r < a; ++r) i[r].value.apply(e, n);
  }
};
function Lo(t, e) {
  for (var n = 0, i = t.length, r; n < i; ++n)
    if ((r = t[n]).name === e)
      return r.value;
}
function or(t, e, n) {
  for (var i = 0, r = t.length; i < r; ++i)
    if (t[i].name === e) {
      t[i] = Ro, t = t.slice(0, i).concat(t.slice(i + 1));
      break;
    }
  return n != null && t.push({ name: e, value: n }), t;
}
var wi = "http://www.w3.org/1999/xhtml";
const lr = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: wi,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function Pn(t) {
  var e = t += "", n = e.indexOf(":");
  return n >= 0 && (e = t.slice(0, n)) !== "xmlns" && (t = t.slice(n + 1)), lr.hasOwnProperty(e) ? { space: lr[e], local: t } : t;
}
function Oo(t) {
  return function() {
    var e = this.ownerDocument, n = this.namespaceURI;
    return n === wi && e.documentElement.namespaceURI === wi ? e.createElement(t) : e.createElementNS(n, t);
  };
}
function Co(t) {
  return function() {
    return this.ownerDocument.createElementNS(t.space, t.local);
  };
}
function Oa(t) {
  var e = Pn(t);
  return (e.local ? Co : Oo)(e);
}
function Fo() {
}
function Ci(t) {
  return t == null ? Fo : function() {
    return this.querySelector(t);
  };
}
function zo(t) {
  typeof t != "function" && (t = Ci(t));
  for (var e = this._groups, n = e.length, i = new Array(n), r = 0; r < n; ++r)
    for (var a = e[r], s = a.length, o = i[r] = new Array(s), c, f, u = 0; u < s; ++u)
      (c = a[u]) && (f = t.call(c, c.__data__, u, a)) && ("__data__" in c && (f.__data__ = c.__data__), o[u] = f);
  return new Pt(i, this._parents);
}
function Ca(t) {
  return t == null ? [] : Array.isArray(t) ? t : Array.from(t);
}
function Bo() {
  return [];
}
function Fa(t) {
  return t == null ? Bo : function() {
    return this.querySelectorAll(t);
  };
}
function Po(t) {
  return function() {
    return Ca(t.apply(this, arguments));
  };
}
function Ho(t) {
  typeof t == "function" ? t = Po(t) : t = Fa(t);
  for (var e = this._groups, n = e.length, i = [], r = [], a = 0; a < n; ++a)
    for (var s = e[a], o = s.length, c, f = 0; f < o; ++f)
      (c = s[f]) && (i.push(t.call(c, c.__data__, f, s)), r.push(c));
  return new Pt(i, r);
}
function za(t) {
  return function() {
    return this.matches(t);
  };
}
function Ba(t) {
  return function(e) {
    return e.matches(t);
  };
}
var Vo = Array.prototype.find;
function Uo(t) {
  return function() {
    return Vo.call(this.children, t);
  };
}
function Go() {
  return this.firstElementChild;
}
function Zo(t) {
  return this.select(t == null ? Go : Uo(typeof t == "function" ? t : Ba(t)));
}
var qo = Array.prototype.filter;
function Wo() {
  return Array.from(this.children);
}
function Xo(t) {
  return function() {
    return qo.call(this.children, t);
  };
}
function Ko(t) {
  return this.selectAll(t == null ? Wo : Xo(typeof t == "function" ? t : Ba(t)));
}
function Yo(t) {
  typeof t != "function" && (t = za(t));
  for (var e = this._groups, n = e.length, i = new Array(n), r = 0; r < n; ++r)
    for (var a = e[r], s = a.length, o = i[r] = [], c, f = 0; f < s; ++f)
      (c = a[f]) && t.call(c, c.__data__, f, a) && o.push(c);
  return new Pt(i, this._parents);
}
function Pa(t) {
  return new Array(t.length);
}
function Jo() {
  return new Pt(this._enter || this._groups.map(Pa), this._parents);
}
function Sn(t, e) {
  this.ownerDocument = t.ownerDocument, this.namespaceURI = t.namespaceURI, this._next = null, this._parent = t, this.__data__ = e;
}
Sn.prototype = {
  constructor: Sn,
  appendChild: function(t) {
    return this._parent.insertBefore(t, this._next);
  },
  insertBefore: function(t, e) {
    return this._parent.insertBefore(t, e);
  },
  querySelector: function(t) {
    return this._parent.querySelector(t);
  },
  querySelectorAll: function(t) {
    return this._parent.querySelectorAll(t);
  }
};
function Qo(t) {
  return function() {
    return t;
  };
}
function jo(t, e, n, i, r, a) {
  for (var s = 0, o, c = e.length, f = a.length; s < f; ++s)
    (o = e[s]) ? (o.__data__ = a[s], i[s] = o) : n[s] = new Sn(t, a[s]);
  for (; s < c; ++s)
    (o = e[s]) && (r[s] = o);
}
function tl(t, e, n, i, r, a, s) {
  var o, c, f = /* @__PURE__ */ new Map(), u = e.length, _ = a.length, p = new Array(u), g;
  for (o = 0; o < u; ++o)
    (c = e[o]) && (p[o] = g = s.call(c, c.__data__, o, e) + "", f.has(g) ? r[o] = c : f.set(g, c));
  for (o = 0; o < _; ++o)
    g = s.call(t, a[o], o, a) + "", (c = f.get(g)) ? (i[o] = c, c.__data__ = a[o], f.delete(g)) : n[o] = new Sn(t, a[o]);
  for (o = 0; o < u; ++o)
    (c = e[o]) && f.get(p[o]) === c && (r[o] = c);
}
function el(t) {
  return t.__data__;
}
function nl(t, e) {
  if (!arguments.length) return Array.from(this, el);
  var n = e ? tl : jo, i = this._parents, r = this._groups;
  typeof t != "function" && (t = Qo(t));
  for (var a = r.length, s = new Array(a), o = new Array(a), c = new Array(a), f = 0; f < a; ++f) {
    var u = i[f], _ = r[f], p = _.length, g = il(t.call(u, u && u.__data__, f, i)), T = g.length, z = o[f] = new Array(T), R = s[f] = new Array(T), $ = c[f] = new Array(p);
    n(u, _, z, R, $, g, e);
    for (var E = 0, k = 0, x, A; E < T; ++E)
      if (x = z[E]) {
        for (E >= k && (k = E + 1); !(A = R[k]) && ++k < T; ) ;
        x._next = A || null;
      }
  }
  return s = new Pt(s, i), s._enter = o, s._exit = c, s;
}
function il(t) {
  return typeof t == "object" && "length" in t ? t : Array.from(t);
}
function rl() {
  return new Pt(this._exit || this._groups.map(Pa), this._parents);
}
function al(t, e, n) {
  var i = this.enter(), r = this, a = this.exit();
  return typeof t == "function" ? (i = t(i), i && (i = i.selection())) : i = i.append(t + ""), e != null && (r = e(r), r && (r = r.selection())), n == null ? a.remove() : n(a), i && r ? i.merge(r).order() : r;
}
function sl(t) {
  for (var e = t.selection ? t.selection() : t, n = this._groups, i = e._groups, r = n.length, a = i.length, s = Math.min(r, a), o = new Array(r), c = 0; c < s; ++c)
    for (var f = n[c], u = i[c], _ = f.length, p = o[c] = new Array(_), g, T = 0; T < _; ++T)
      (g = f[T] || u[T]) && (p[T] = g);
  for (; c < r; ++c)
    o[c] = n[c];
  return new Pt(o, this._parents);
}
function ol() {
  for (var t = this._groups, e = -1, n = t.length; ++e < n; )
    for (var i = t[e], r = i.length - 1, a = i[r], s; --r >= 0; )
      (s = i[r]) && (a && s.compareDocumentPosition(a) ^ 4 && a.parentNode.insertBefore(s, a), a = s);
  return this;
}
function ll(t) {
  t || (t = cl);
  function e(_, p) {
    return _ && p ? t(_.__data__, p.__data__) : !_ - !p;
  }
  for (var n = this._groups, i = n.length, r = new Array(i), a = 0; a < i; ++a) {
    for (var s = n[a], o = s.length, c = r[a] = new Array(o), f, u = 0; u < o; ++u)
      (f = s[u]) && (c[u] = f);
    c.sort(e);
  }
  return new Pt(r, this._parents).order();
}
function cl(t, e) {
  return t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
}
function fl() {
  var t = arguments[0];
  return arguments[0] = this, t.apply(null, arguments), this;
}
function ul() {
  return Array.from(this);
}
function hl() {
  for (var t = this._groups, e = 0, n = t.length; e < n; ++e)
    for (var i = t[e], r = 0, a = i.length; r < a; ++r) {
      var s = i[r];
      if (s) return s;
    }
  return null;
}
function dl() {
  let t = 0;
  for (const e of this) ++t;
  return t;
}
function pl() {
  return !this.node();
}
function _l(t) {
  for (var e = this._groups, n = 0, i = e.length; n < i; ++n)
    for (var r = e[n], a = 0, s = r.length, o; a < s; ++a)
      (o = r[a]) && t.call(o, o.__data__, a, r);
  return this;
}
function gl(t) {
  return function() {
    this.removeAttribute(t);
  };
}
function ml(t) {
  return function() {
    this.removeAttributeNS(t.space, t.local);
  };
}
function vl(t, e) {
  return function() {
    this.setAttribute(t, e);
  };
}
function wl(t, e) {
  return function() {
    this.setAttributeNS(t.space, t.local, e);
  };
}
function yl(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    n == null ? this.removeAttribute(t) : this.setAttribute(t, n);
  };
}
function xl(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    n == null ? this.removeAttributeNS(t.space, t.local) : this.setAttributeNS(t.space, t.local, n);
  };
}
function bl(t, e) {
  var n = Pn(t);
  if (arguments.length < 2) {
    var i = this.node();
    return n.local ? i.getAttributeNS(n.space, n.local) : i.getAttribute(n);
  }
  return this.each((e == null ? n.local ? ml : gl : typeof e == "function" ? n.local ? xl : yl : n.local ? wl : vl)(n, e));
}
function Ha(t) {
  return t.ownerDocument && t.ownerDocument.defaultView || t.document && t || t.defaultView;
}
function kl(t) {
  return function() {
    this.style.removeProperty(t);
  };
}
function Tl(t, e, n) {
  return function() {
    this.style.setProperty(t, e, n);
  };
}
function El(t, e, n) {
  return function() {
    var i = e.apply(this, arguments);
    i == null ? this.style.removeProperty(t) : this.style.setProperty(t, i, n);
  };
}
function Sl(t, e, n) {
  return arguments.length > 1 ? this.each((e == null ? kl : typeof e == "function" ? El : Tl)(t, e, n ?? "")) : Ce(this.node(), t);
}
function Ce(t, e) {
  return t.style.getPropertyValue(e) || Ha(t).getComputedStyle(t, null).getPropertyValue(e);
}
function Al(t) {
  return function() {
    delete this[t];
  };
}
function $l(t, e) {
  return function() {
    this[t] = e;
  };
}
function Nl(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    n == null ? delete this[t] : this[t] = n;
  };
}
function Il(t, e) {
  return arguments.length > 1 ? this.each((e == null ? Al : typeof e == "function" ? Nl : $l)(t, e)) : this.node()[t];
}
function Va(t) {
  return t.trim().split(/^|\s+/);
}
function Fi(t) {
  return t.classList || new Ua(t);
}
function Ua(t) {
  this._node = t, this._names = Va(t.getAttribute("class") || "");
}
Ua.prototype = {
  add: function(t) {
    var e = this._names.indexOf(t);
    e < 0 && (this._names.push(t), this._node.setAttribute("class", this._names.join(" ")));
  },
  remove: function(t) {
    var e = this._names.indexOf(t);
    e >= 0 && (this._names.splice(e, 1), this._node.setAttribute("class", this._names.join(" ")));
  },
  contains: function(t) {
    return this._names.indexOf(t) >= 0;
  }
};
function Ga(t, e) {
  for (var n = Fi(t), i = -1, r = e.length; ++i < r; ) n.add(e[i]);
}
function Za(t, e) {
  for (var n = Fi(t), i = -1, r = e.length; ++i < r; ) n.remove(e[i]);
}
function Dl(t) {
  return function() {
    Ga(this, t);
  };
}
function Rl(t) {
  return function() {
    Za(this, t);
  };
}
function Ml(t, e) {
  return function() {
    (e.apply(this, arguments) ? Ga : Za)(this, t);
  };
}
function Ll(t, e) {
  var n = Va(t + "");
  if (arguments.length < 2) {
    for (var i = Fi(this.node()), r = -1, a = n.length; ++r < a; ) if (!i.contains(n[r])) return !1;
    return !0;
  }
  return this.each((typeof e == "function" ? Ml : e ? Dl : Rl)(n, e));
}
function Ol() {
  this.textContent = "";
}
function Cl(t) {
  return function() {
    this.textContent = t;
  };
}
function Fl(t) {
  return function() {
    var e = t.apply(this, arguments);
    this.textContent = e ?? "";
  };
}
function zl(t) {
  return arguments.length ? this.each(t == null ? Ol : (typeof t == "function" ? Fl : Cl)(t)) : this.node().textContent;
}
function Bl() {
  this.innerHTML = "";
}
function Pl(t) {
  return function() {
    this.innerHTML = t;
  };
}
function Hl(t) {
  return function() {
    var e = t.apply(this, arguments);
    this.innerHTML = e ?? "";
  };
}
function Vl(t) {
  return arguments.length ? this.each(t == null ? Bl : (typeof t == "function" ? Hl : Pl)(t)) : this.node().innerHTML;
}
function Ul() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function Gl() {
  return this.each(Ul);
}
function Zl() {
  this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function ql() {
  return this.each(Zl);
}
function Wl(t) {
  var e = typeof t == "function" ? t : Oa(t);
  return this.select(function() {
    return this.appendChild(e.apply(this, arguments));
  });
}
function Xl() {
  return null;
}
function Kl(t, e) {
  var n = typeof t == "function" ? t : Oa(t), i = e == null ? Xl : typeof e == "function" ? e : Ci(e);
  return this.select(function() {
    return this.insertBefore(n.apply(this, arguments), i.apply(this, arguments) || null);
  });
}
function Yl() {
  var t = this.parentNode;
  t && t.removeChild(this);
}
function Jl() {
  return this.each(Yl);
}
function Ql() {
  var t = this.cloneNode(!1), e = this.parentNode;
  return e ? e.insertBefore(t, this.nextSibling) : t;
}
function jl() {
  var t = this.cloneNode(!0), e = this.parentNode;
  return e ? e.insertBefore(t, this.nextSibling) : t;
}
function tc(t) {
  return this.select(t ? jl : Ql);
}
function ec(t) {
  return arguments.length ? this.property("__data__", t) : this.node().__data__;
}
function nc(t) {
  return function(e) {
    t.call(this, e, this.__data__);
  };
}
function ic(t) {
  return t.trim().split(/^|\s+/).map(function(e) {
    var n = "", i = e.indexOf(".");
    return i >= 0 && (n = e.slice(i + 1), e = e.slice(0, i)), { type: e, name: n };
  });
}
function rc(t) {
  return function() {
    var e = this.__on;
    if (e) {
      for (var n = 0, i = -1, r = e.length, a; n < r; ++n)
        a = e[n], (!t.type || a.type === t.type) && a.name === t.name ? this.removeEventListener(a.type, a.listener, a.options) : e[++i] = a;
      ++i ? e.length = i : delete this.__on;
    }
  };
}
function ac(t, e, n) {
  return function() {
    var i = this.__on, r, a = nc(e);
    if (i) {
      for (var s = 0, o = i.length; s < o; ++s)
        if ((r = i[s]).type === t.type && r.name === t.name) {
          this.removeEventListener(r.type, r.listener, r.options), this.addEventListener(r.type, r.listener = a, r.options = n), r.value = e;
          return;
        }
    }
    this.addEventListener(t.type, a, n), r = { type: t.type, name: t.name, value: e, listener: a, options: n }, i ? i.push(r) : this.__on = [r];
  };
}
function sc(t, e, n) {
  var i = ic(t + ""), r, a = i.length, s;
  if (arguments.length < 2) {
    var o = this.node().__on;
    if (o) {
      for (var c = 0, f = o.length, u; c < f; ++c)
        for (r = 0, u = o[c]; r < a; ++r)
          if ((s = i[r]).type === u.type && s.name === u.name)
            return u.value;
    }
    return;
  }
  for (o = e ? ac : rc, r = 0; r < a; ++r) this.each(o(i[r], e, n));
  return this;
}
function qa(t, e, n) {
  var i = Ha(t), r = i.CustomEvent;
  typeof r == "function" ? r = new r(e, n) : (r = i.document.createEvent("Event"), n ? (r.initEvent(e, n.bubbles, n.cancelable), r.detail = n.detail) : r.initEvent(e, !1, !1)), t.dispatchEvent(r);
}
function oc(t, e) {
  return function() {
    return qa(this, t, e);
  };
}
function lc(t, e) {
  return function() {
    return qa(this, t, e.apply(this, arguments));
  };
}
function cc(t, e) {
  return this.each((typeof e == "function" ? lc : oc)(t, e));
}
function* fc() {
  for (var t = this._groups, e = 0, n = t.length; e < n; ++e)
    for (var i = t[e], r = 0, a = i.length, s; r < a; ++r)
      (s = i[r]) && (yield s);
}
var zi = [null];
function Pt(t, e) {
  this._groups = t, this._parents = e;
}
function Se() {
  return new Pt([[document.documentElement]], zi);
}
function uc() {
  return this;
}
Pt.prototype = Se.prototype = {
  constructor: Pt,
  select: zo,
  selectAll: Ho,
  selectChild: Zo,
  selectChildren: Ko,
  filter: Yo,
  data: nl,
  enter: Jo,
  exit: rl,
  join: al,
  merge: sl,
  selection: uc,
  order: ol,
  sort: ll,
  call: fl,
  nodes: ul,
  node: hl,
  size: dl,
  empty: pl,
  each: _l,
  attr: bl,
  style: Sl,
  property: Il,
  classed: Ll,
  text: zl,
  html: Vl,
  raise: Gl,
  lower: ql,
  append: Wl,
  insert: Kl,
  remove: Jl,
  clone: tc,
  datum: ec,
  on: sc,
  dispatch: cc,
  [Symbol.iterator]: fc
};
function ht(t) {
  return typeof t == "string" ? new Pt([[document.querySelector(t)]], [document.documentElement]) : new Pt([[t]], zi);
}
function yi(t) {
  return typeof t == "string" ? new Pt([document.querySelectorAll(t)], [document.documentElement]) : new Pt([Ca(t)], zi);
}
function Bi(t, e, n) {
  t.prototype = e.prototype = n, n.constructor = t;
}
function Wa(t, e) {
  var n = Object.create(t.prototype);
  for (var i in e) n[i] = e[i];
  return n;
}
function en() {
}
var Ye = 0.7, An = 1 / Ye, Le = "\\s*([+-]?\\d+)\\s*", Je = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*", ie = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*", hc = /^#([0-9a-f]{3,8})$/, dc = new RegExp(`^rgb\\(${Le},${Le},${Le}\\)$`), pc = new RegExp(`^rgb\\(${ie},${ie},${ie}\\)$`), _c = new RegExp(`^rgba\\(${Le},${Le},${Le},${Je}\\)$`), gc = new RegExp(`^rgba\\(${ie},${ie},${ie},${Je}\\)$`), mc = new RegExp(`^hsl\\(${Je},${ie},${ie}\\)$`), vc = new RegExp(`^hsla\\(${Je},${ie},${ie},${Je}\\)$`), cr = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
Bi(en, be, {
  copy(t) {
    return Object.assign(new this.constructor(), this, t);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: fr,
  // Deprecated! Use color.formatHex.
  formatHex: fr,
  formatHex8: wc,
  formatHsl: yc,
  formatRgb: ur,
  toString: ur
});
function fr() {
  return this.rgb().formatHex();
}
function wc() {
  return this.rgb().formatHex8();
}
function yc() {
  return Xa(this).formatHsl();
}
function ur() {
  return this.rgb().formatRgb();
}
function be(t) {
  var e, n;
  return t = (t + "").trim().toLowerCase(), (e = hc.exec(t)) ? (n = e[1].length, e = parseInt(e[1], 16), n === 6 ? hr(e) : n === 3 ? new Vt(e >> 8 & 15 | e >> 4 & 240, e >> 4 & 15 | e & 240, (e & 15) << 4 | e & 15, 1) : n === 8 ? sn(e >> 24 & 255, e >> 16 & 255, e >> 8 & 255, (e & 255) / 255) : n === 4 ? sn(e >> 12 & 15 | e >> 8 & 240, e >> 8 & 15 | e >> 4 & 240, e >> 4 & 15 | e & 240, ((e & 15) << 4 | e & 15) / 255) : null) : (e = dc.exec(t)) ? new Vt(e[1], e[2], e[3], 1) : (e = pc.exec(t)) ? new Vt(e[1] * 255 / 100, e[2] * 255 / 100, e[3] * 255 / 100, 1) : (e = _c.exec(t)) ? sn(e[1], e[2], e[3], e[4]) : (e = gc.exec(t)) ? sn(e[1] * 255 / 100, e[2] * 255 / 100, e[3] * 255 / 100, e[4]) : (e = mc.exec(t)) ? _r(e[1], e[2] / 100, e[3] / 100, 1) : (e = vc.exec(t)) ? _r(e[1], e[2] / 100, e[3] / 100, e[4]) : cr.hasOwnProperty(t) ? hr(cr[t]) : t === "transparent" ? new Vt(NaN, NaN, NaN, 0) : null;
}
function hr(t) {
  return new Vt(t >> 16 & 255, t >> 8 & 255, t & 255, 1);
}
function sn(t, e, n, i) {
  return i <= 0 && (t = e = n = NaN), new Vt(t, e, n, i);
}
function xc(t) {
  return t instanceof en || (t = be(t)), t ? (t = t.rgb(), new Vt(t.r, t.g, t.b, t.opacity)) : new Vt();
}
function xi(t, e, n, i) {
  return arguments.length === 1 ? xc(t) : new Vt(t, e, n, i ?? 1);
}
function Vt(t, e, n, i) {
  this.r = +t, this.g = +e, this.b = +n, this.opacity = +i;
}
Bi(Vt, xi, Wa(en, {
  brighter(t) {
    return t = t == null ? An : Math.pow(An, t), new Vt(this.r * t, this.g * t, this.b * t, this.opacity);
  },
  darker(t) {
    return t = t == null ? Ye : Math.pow(Ye, t), new Vt(this.r * t, this.g * t, this.b * t, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Vt(ye(this.r), ye(this.g), ye(this.b), $n(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && -0.5 <= this.g && this.g < 255.5 && -0.5 <= this.b && this.b < 255.5 && 0 <= this.opacity && this.opacity <= 1;
  },
  hex: dr,
  // Deprecated! Use color.formatHex.
  formatHex: dr,
  formatHex8: bc,
  formatRgb: pr,
  toString: pr
}));
function dr() {
  return `#${ve(this.r)}${ve(this.g)}${ve(this.b)}`;
}
function bc() {
  return `#${ve(this.r)}${ve(this.g)}${ve(this.b)}${ve((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function pr() {
  const t = $n(this.opacity);
  return `${t === 1 ? "rgb(" : "rgba("}${ye(this.r)}, ${ye(this.g)}, ${ye(this.b)}${t === 1 ? ")" : `, ${t})`}`;
}
function $n(t) {
  return isNaN(t) ? 1 : Math.max(0, Math.min(1, t));
}
function ye(t) {
  return Math.max(0, Math.min(255, Math.round(t) || 0));
}
function ve(t) {
  return t = ye(t), (t < 16 ? "0" : "") + t.toString(16);
}
function _r(t, e, n, i) {
  return i <= 0 ? t = e = n = NaN : n <= 0 || n >= 1 ? t = e = NaN : e <= 0 && (t = NaN), new jt(t, e, n, i);
}
function Xa(t) {
  if (t instanceof jt) return new jt(t.h, t.s, t.l, t.opacity);
  if (t instanceof en || (t = be(t)), !t) return new jt();
  if (t instanceof jt) return t;
  t = t.rgb();
  var e = t.r / 255, n = t.g / 255, i = t.b / 255, r = Math.min(e, n, i), a = Math.max(e, n, i), s = NaN, o = a - r, c = (a + r) / 2;
  return o ? (e === a ? s = (n - i) / o + (n < i) * 6 : n === a ? s = (i - e) / o + 2 : s = (e - n) / o + 4, o /= c < 0.5 ? a + r : 2 - a - r, s *= 60) : o = c > 0 && c < 1 ? 0 : s, new jt(s, o, c, t.opacity);
}
function kc(t, e, n, i) {
  return arguments.length === 1 ? Xa(t) : new jt(t, e, n, i ?? 1);
}
function jt(t, e, n, i) {
  this.h = +t, this.s = +e, this.l = +n, this.opacity = +i;
}
Bi(jt, kc, Wa(en, {
  brighter(t) {
    return t = t == null ? An : Math.pow(An, t), new jt(this.h, this.s, this.l * t, this.opacity);
  },
  darker(t) {
    return t = t == null ? Ye : Math.pow(Ye, t), new jt(this.h, this.s, this.l * t, this.opacity);
  },
  rgb() {
    var t = this.h % 360 + (this.h < 0) * 360, e = isNaN(t) || isNaN(this.s) ? 0 : this.s, n = this.l, i = n + (n < 0.5 ? n : 1 - n) * e, r = 2 * n - i;
    return new Vt(
      Xn(t >= 240 ? t - 240 : t + 120, r, i),
      Xn(t, r, i),
      Xn(t < 120 ? t + 240 : t - 120, r, i),
      this.opacity
    );
  },
  clamp() {
    return new jt(gr(this.h), on(this.s), on(this.l), $n(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && 0 <= this.l && this.l <= 1 && 0 <= this.opacity && this.opacity <= 1;
  },
  formatHsl() {
    const t = $n(this.opacity);
    return `${t === 1 ? "hsl(" : "hsla("}${gr(this.h)}, ${on(this.s) * 100}%, ${on(this.l) * 100}%${t === 1 ? ")" : `, ${t})`}`;
  }
}));
function gr(t) {
  return t = (t || 0) % 360, t < 0 ? t + 360 : t;
}
function on(t) {
  return Math.max(0, Math.min(1, t || 0));
}
function Xn(t, e, n) {
  return (t < 60 ? e + (n - e) * t / 60 : t < 180 ? n : t < 240 ? e + (n - e) * (240 - t) / 60 : e) * 255;
}
const Pi = (t) => () => t;
function Tc(t, e) {
  return function(n) {
    return t + n * e;
  };
}
function Ec(t, e, n) {
  return t = Math.pow(t, n), e = Math.pow(e, n) - t, n = 1 / n, function(i) {
    return Math.pow(t + i * e, n);
  };
}
function Sc(t) {
  return (t = +t) == 1 ? Ka : function(e, n) {
    return n - e ? Ec(e, n, t) : Pi(isNaN(e) ? n : e);
  };
}
function Ka(t, e) {
  var n = e - t;
  return n ? Tc(t, n) : Pi(isNaN(t) ? e : t);
}
const Nn = function t(e) {
  var n = Sc(e);
  function i(r, a) {
    var s = n((r = xi(r)).r, (a = xi(a)).r), o = n(r.g, a.g), c = n(r.b, a.b), f = Ka(r.opacity, a.opacity);
    return function(u) {
      return r.r = s(u), r.g = o(u), r.b = c(u), r.opacity = f(u), r + "";
    };
  }
  return i.gamma = t, i;
}(1);
function Ac(t, e) {
  e || (e = []);
  var n = t ? Math.min(e.length, t.length) : 0, i = e.slice(), r;
  return function(a) {
    for (r = 0; r < n; ++r) i[r] = t[r] * (1 - a) + e[r] * a;
    return i;
  };
}
function $c(t) {
  return ArrayBuffer.isView(t) && !(t instanceof DataView);
}
function Nc(t, e) {
  var n = e ? e.length : 0, i = t ? Math.min(n, t.length) : 0, r = new Array(i), a = new Array(n), s;
  for (s = 0; s < i; ++s) r[s] = Hi(t[s], e[s]);
  for (; s < n; ++s) a[s] = e[s];
  return function(o) {
    for (s = 0; s < i; ++s) a[s] = r[s](o);
    return a;
  };
}
function Ic(t, e) {
  var n = /* @__PURE__ */ new Date();
  return t = +t, e = +e, function(i) {
    return n.setTime(t * (1 - i) + e * i), n;
  };
}
function Qt(t, e) {
  return t = +t, e = +e, function(n) {
    return t * (1 - n) + e * n;
  };
}
function Dc(t, e) {
  var n = {}, i = {}, r;
  (t === null || typeof t != "object") && (t = {}), (e === null || typeof e != "object") && (e = {});
  for (r in e)
    r in t ? n[r] = Hi(t[r], e[r]) : i[r] = e[r];
  return function(a) {
    for (r in n) i[r] = n[r](a);
    return i;
  };
}
var bi = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g, Kn = new RegExp(bi.source, "g");
function Rc(t) {
  return function() {
    return t;
  };
}
function Mc(t) {
  return function(e) {
    return t(e) + "";
  };
}
function Ya(t, e) {
  var n = bi.lastIndex = Kn.lastIndex = 0, i, r, a, s = -1, o = [], c = [];
  for (t = t + "", e = e + ""; (i = bi.exec(t)) && (r = Kn.exec(e)); )
    (a = r.index) > n && (a = e.slice(n, a), o[s] ? o[s] += a : o[++s] = a), (i = i[0]) === (r = r[0]) ? o[s] ? o[s] += r : o[++s] = r : (o[++s] = null, c.push({ i: s, x: Qt(i, r) })), n = Kn.lastIndex;
  return n < e.length && (a = e.slice(n), o[s] ? o[s] += a : o[++s] = a), o.length < 2 ? c[0] ? Mc(c[0].x) : Rc(e) : (e = c.length, function(f) {
    for (var u = 0, _; u < e; ++u) o[(_ = c[u]).i] = _.x(f);
    return o.join("");
  });
}
function Hi(t, e) {
  var n = typeof e, i;
  return e == null || n === "boolean" ? Pi(e) : (n === "number" ? Qt : n === "string" ? (i = be(e)) ? (e = i, Nn) : Ya : e instanceof be ? Nn : e instanceof Date ? Ic : $c(e) ? Ac : Array.isArray(e) ? Nc : typeof e.valueOf != "function" && typeof e.toString != "function" || isNaN(e) ? Dc : Qt)(t, e);
}
function Lc(t, e) {
  return t = +t, e = +e, function(n) {
    return Math.round(t * (1 - n) + e * n);
  };
}
var mr = 180 / Math.PI, ki = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function Ja(t, e, n, i, r, a) {
  var s, o, c;
  return (s = Math.sqrt(t * t + e * e)) && (t /= s, e /= s), (c = t * n + e * i) && (n -= t * c, i -= e * c), (o = Math.sqrt(n * n + i * i)) && (n /= o, i /= o, c /= o), t * i < e * n && (t = -t, e = -e, c = -c, s = -s), {
    translateX: r,
    translateY: a,
    rotate: Math.atan2(e, t) * mr,
    skewX: Math.atan(c) * mr,
    scaleX: s,
    scaleY: o
  };
}
var ln;
function Oc(t) {
  const e = new (typeof DOMMatrix == "function" ? DOMMatrix : WebKitCSSMatrix)(t + "");
  return e.isIdentity ? ki : Ja(e.a, e.b, e.c, e.d, e.e, e.f);
}
function Cc(t) {
  return t == null || (ln || (ln = document.createElementNS("http://www.w3.org/2000/svg", "g")), ln.setAttribute("transform", t), !(t = ln.transform.baseVal.consolidate())) ? ki : (t = t.matrix, Ja(t.a, t.b, t.c, t.d, t.e, t.f));
}
function Qa(t, e, n, i) {
  function r(f) {
    return f.length ? f.pop() + " " : "";
  }
  function a(f, u, _, p, g, T) {
    if (f !== _ || u !== p) {
      var z = g.push("translate(", null, e, null, n);
      T.push({ i: z - 4, x: Qt(f, _) }, { i: z - 2, x: Qt(u, p) });
    } else (_ || p) && g.push("translate(" + _ + e + p + n);
  }
  function s(f, u, _, p) {
    f !== u ? (f - u > 180 ? u += 360 : u - f > 180 && (f += 360), p.push({ i: _.push(r(_) + "rotate(", null, i) - 2, x: Qt(f, u) })) : u && _.push(r(_) + "rotate(" + u + i);
  }
  function o(f, u, _, p) {
    f !== u ? p.push({ i: _.push(r(_) + "skewX(", null, i) - 2, x: Qt(f, u) }) : u && _.push(r(_) + "skewX(" + u + i);
  }
  function c(f, u, _, p, g, T) {
    if (f !== _ || u !== p) {
      var z = g.push(r(g) + "scale(", null, ",", null, ")");
      T.push({ i: z - 4, x: Qt(f, _) }, { i: z - 2, x: Qt(u, p) });
    } else (_ !== 1 || p !== 1) && g.push(r(g) + "scale(" + _ + "," + p + ")");
  }
  return function(f, u) {
    var _ = [], p = [];
    return f = t(f), u = t(u), a(f.translateX, f.translateY, u.translateX, u.translateY, _, p), s(f.rotate, u.rotate, _, p), o(f.skewX, u.skewX, _, p), c(f.scaleX, f.scaleY, u.scaleX, u.scaleY, _, p), f = u = null, function(g) {
      for (var T = -1, z = p.length, R; ++T < z; ) _[(R = p[T]).i] = R.x(g);
      return _.join("");
    };
  };
}
var Fc = Qa(Oc, "px, ", "px)", "deg)"), zc = Qa(Cc, ", ", ")", ")"), Fe = 0, Ge = 0, He = 0, ja = 1e3, In, Ze, Dn = 0, ke = 0, Hn = 0, Qe = typeof performance == "object" && performance.now ? performance : Date, ts = typeof window == "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(t) {
  setTimeout(t, 17);
};
function Vi() {
  return ke || (ts(Bc), ke = Qe.now() + Hn);
}
function Bc() {
  ke = 0;
}
function Rn() {
  this._call = this._time = this._next = null;
}
Rn.prototype = es.prototype = {
  constructor: Rn,
  restart: function(t, e, n) {
    if (typeof t != "function") throw new TypeError("callback is not a function");
    n = (n == null ? Vi() : +n) + (e == null ? 0 : +e), !this._next && Ze !== this && (Ze ? Ze._next = this : In = this, Ze = this), this._call = t, this._time = n, Ti();
  },
  stop: function() {
    this._call && (this._call = null, this._time = 1 / 0, Ti());
  }
};
function es(t, e, n) {
  var i = new Rn();
  return i.restart(t, e, n), i;
}
function Pc() {
  Vi(), ++Fe;
  for (var t = In, e; t; )
    (e = ke - t._time) >= 0 && t._call.call(void 0, e), t = t._next;
  --Fe;
}
function vr() {
  ke = (Dn = Qe.now()) + Hn, Fe = Ge = 0;
  try {
    Pc();
  } finally {
    Fe = 0, Vc(), ke = 0;
  }
}
function Hc() {
  var t = Qe.now(), e = t - Dn;
  e > ja && (Hn -= e, Dn = t);
}
function Vc() {
  for (var t, e = In, n, i = 1 / 0; e; )
    e._call ? (i > e._time && (i = e._time), t = e, e = e._next) : (n = e._next, e._next = null, e = t ? t._next = n : In = n);
  Ze = t, Ti(i);
}
function Ti(t) {
  if (!Fe) {
    Ge && (Ge = clearTimeout(Ge));
    var e = t - ke;
    e > 24 ? (t < 1 / 0 && (Ge = setTimeout(vr, t - Qe.now() - Hn)), He && (He = clearInterval(He))) : (He || (Dn = Qe.now(), He = setInterval(Hc, ja)), Fe = 1, ts(vr));
  }
}
function wr(t, e, n) {
  var i = new Rn();
  return e = e == null ? 0 : +e, i.restart((r) => {
    i.stop(), t(r + e);
  }, e, n), i;
}
var Uc = La("start", "end", "cancel", "interrupt"), Gc = [], ns = 0, yr = 1, Ei = 2, xn = 3, xr = 4, Si = 5, bn = 6;
function Vn(t, e, n, i, r, a) {
  var s = t.__transition;
  if (!s) t.__transition = {};
  else if (n in s) return;
  Zc(t, n, {
    name: e,
    index: i,
    // For context during callback.
    group: r,
    // For context during callback.
    on: Uc,
    tween: Gc,
    time: a.time,
    delay: a.delay,
    duration: a.duration,
    ease: a.ease,
    timer: null,
    state: ns
  });
}
function Ui(t, e) {
  var n = te(t, e);
  if (n.state > ns) throw new Error("too late; already scheduled");
  return n;
}
function re(t, e) {
  var n = te(t, e);
  if (n.state > xn) throw new Error("too late; already running");
  return n;
}
function te(t, e) {
  var n = t.__transition;
  if (!n || !(n = n[e])) throw new Error("transition not found");
  return n;
}
function Zc(t, e, n) {
  var i = t.__transition, r;
  i[e] = n, n.timer = es(a, 0, n.time);
  function a(f) {
    n.state = yr, n.timer.restart(s, n.delay, n.time), n.delay <= f && s(f - n.delay);
  }
  function s(f) {
    var u, _, p, g;
    if (n.state !== yr) return c();
    for (u in i)
      if (g = i[u], g.name === n.name) {
        if (g.state === xn) return wr(s);
        g.state === xr ? (g.state = bn, g.timer.stop(), g.on.call("interrupt", t, t.__data__, g.index, g.group), delete i[u]) : +u < e && (g.state = bn, g.timer.stop(), g.on.call("cancel", t, t.__data__, g.index, g.group), delete i[u]);
      }
    if (wr(function() {
      n.state === xn && (n.state = xr, n.timer.restart(o, n.delay, n.time), o(f));
    }), n.state = Ei, n.on.call("start", t, t.__data__, n.index, n.group), n.state === Ei) {
      for (n.state = xn, r = new Array(p = n.tween.length), u = 0, _ = -1; u < p; ++u)
        (g = n.tween[u].value.call(t, t.__data__, n.index, n.group)) && (r[++_] = g);
      r.length = _ + 1;
    }
  }
  function o(f) {
    for (var u = f < n.duration ? n.ease.call(null, f / n.duration) : (n.timer.restart(c), n.state = Si, 1), _ = -1, p = r.length; ++_ < p; )
      r[_].call(t, u);
    n.state === Si && (n.on.call("end", t, t.__data__, n.index, n.group), c());
  }
  function c() {
    n.state = bn, n.timer.stop(), delete i[e];
    for (var f in i) return;
    delete t.__transition;
  }
}
function qc(t, e) {
  var n = t.__transition, i, r, a = !0, s;
  if (n) {
    e = e == null ? null : e + "";
    for (s in n) {
      if ((i = n[s]).name !== e) {
        a = !1;
        continue;
      }
      r = i.state > Ei && i.state < Si, i.state = bn, i.timer.stop(), i.on.call(r ? "interrupt" : "cancel", t, t.__data__, i.index, i.group), delete n[s];
    }
    a && delete t.__transition;
  }
}
function Wc(t) {
  return this.each(function() {
    qc(this, t);
  });
}
function Xc(t, e) {
  var n, i;
  return function() {
    var r = re(this, t), a = r.tween;
    if (a !== n) {
      i = n = a;
      for (var s = 0, o = i.length; s < o; ++s)
        if (i[s].name === e) {
          i = i.slice(), i.splice(s, 1);
          break;
        }
    }
    r.tween = i;
  };
}
function Kc(t, e, n) {
  var i, r;
  if (typeof n != "function") throw new Error();
  return function() {
    var a = re(this, t), s = a.tween;
    if (s !== i) {
      r = (i = s).slice();
      for (var o = { name: e, value: n }, c = 0, f = r.length; c < f; ++c)
        if (r[c].name === e) {
          r[c] = o;
          break;
        }
      c === f && r.push(o);
    }
    a.tween = r;
  };
}
function Yc(t, e) {
  var n = this._id;
  if (t += "", arguments.length < 2) {
    for (var i = te(this.node(), n).tween, r = 0, a = i.length, s; r < a; ++r)
      if ((s = i[r]).name === t)
        return s.value;
    return null;
  }
  return this.each((e == null ? Xc : Kc)(n, t, e));
}
function Gi(t, e, n) {
  var i = t._id;
  return t.each(function() {
    var r = re(this, i);
    (r.value || (r.value = {}))[e] = n.apply(this, arguments);
  }), function(r) {
    return te(r, i).value[e];
  };
}
function is(t, e) {
  var n;
  return (typeof e == "number" ? Qt : e instanceof be ? Nn : (n = be(e)) ? (e = n, Nn) : Ya)(t, e);
}
function Jc(t) {
  return function() {
    this.removeAttribute(t);
  };
}
function Qc(t) {
  return function() {
    this.removeAttributeNS(t.space, t.local);
  };
}
function jc(t, e, n) {
  var i, r = n + "", a;
  return function() {
    var s = this.getAttribute(t);
    return s === r ? null : s === i ? a : a = e(i = s, n);
  };
}
function tf(t, e, n) {
  var i, r = n + "", a;
  return function() {
    var s = this.getAttributeNS(t.space, t.local);
    return s === r ? null : s === i ? a : a = e(i = s, n);
  };
}
function ef(t, e, n) {
  var i, r, a;
  return function() {
    var s, o = n(this), c;
    return o == null ? void this.removeAttribute(t) : (s = this.getAttribute(t), c = o + "", s === c ? null : s === i && c === r ? a : (r = c, a = e(i = s, o)));
  };
}
function nf(t, e, n) {
  var i, r, a;
  return function() {
    var s, o = n(this), c;
    return o == null ? void this.removeAttributeNS(t.space, t.local) : (s = this.getAttributeNS(t.space, t.local), c = o + "", s === c ? null : s === i && c === r ? a : (r = c, a = e(i = s, o)));
  };
}
function rf(t, e) {
  var n = Pn(t), i = n === "transform" ? zc : is;
  return this.attrTween(t, typeof e == "function" ? (n.local ? nf : ef)(n, i, Gi(this, "attr." + t, e)) : e == null ? (n.local ? Qc : Jc)(n) : (n.local ? tf : jc)(n, i, e));
}
function af(t, e) {
  return function(n) {
    this.setAttribute(t, e.call(this, n));
  };
}
function sf(t, e) {
  return function(n) {
    this.setAttributeNS(t.space, t.local, e.call(this, n));
  };
}
function of(t, e) {
  var n, i;
  function r() {
    var a = e.apply(this, arguments);
    return a !== i && (n = (i = a) && sf(t, a)), n;
  }
  return r._value = e, r;
}
function lf(t, e) {
  var n, i;
  function r() {
    var a = e.apply(this, arguments);
    return a !== i && (n = (i = a) && af(t, a)), n;
  }
  return r._value = e, r;
}
function cf(t, e) {
  var n = "attr." + t;
  if (arguments.length < 2) return (n = this.tween(n)) && n._value;
  if (e == null) return this.tween(n, null);
  if (typeof e != "function") throw new Error();
  var i = Pn(t);
  return this.tween(n, (i.local ? of : lf)(i, e));
}
function ff(t, e) {
  return function() {
    Ui(this, t).delay = +e.apply(this, arguments);
  };
}
function uf(t, e) {
  return e = +e, function() {
    Ui(this, t).delay = e;
  };
}
function hf(t) {
  var e = this._id;
  return arguments.length ? this.each((typeof t == "function" ? ff : uf)(e, t)) : te(this.node(), e).delay;
}
function df(t, e) {
  return function() {
    re(this, t).duration = +e.apply(this, arguments);
  };
}
function pf(t, e) {
  return e = +e, function() {
    re(this, t).duration = e;
  };
}
function _f(t) {
  var e = this._id;
  return arguments.length ? this.each((typeof t == "function" ? df : pf)(e, t)) : te(this.node(), e).duration;
}
function gf(t, e) {
  if (typeof e != "function") throw new Error();
  return function() {
    re(this, t).ease = e;
  };
}
function mf(t) {
  var e = this._id;
  return arguments.length ? this.each(gf(e, t)) : te(this.node(), e).ease;
}
function vf(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    if (typeof n != "function") throw new Error();
    re(this, t).ease = n;
  };
}
function wf(t) {
  if (typeof t != "function") throw new Error();
  return this.each(vf(this._id, t));
}
function yf(t) {
  typeof t != "function" && (t = za(t));
  for (var e = this._groups, n = e.length, i = new Array(n), r = 0; r < n; ++r)
    for (var a = e[r], s = a.length, o = i[r] = [], c, f = 0; f < s; ++f)
      (c = a[f]) && t.call(c, c.__data__, f, a) && o.push(c);
  return new ce(i, this._parents, this._name, this._id);
}
function xf(t) {
  if (t._id !== this._id) throw new Error();
  for (var e = this._groups, n = t._groups, i = e.length, r = n.length, a = Math.min(i, r), s = new Array(i), o = 0; o < a; ++o)
    for (var c = e[o], f = n[o], u = c.length, _ = s[o] = new Array(u), p, g = 0; g < u; ++g)
      (p = c[g] || f[g]) && (_[g] = p);
  for (; o < i; ++o)
    s[o] = e[o];
  return new ce(s, this._parents, this._name, this._id);
}
function bf(t) {
  return (t + "").trim().split(/^|\s+/).every(function(e) {
    var n = e.indexOf(".");
    return n >= 0 && (e = e.slice(0, n)), !e || e === "start";
  });
}
function kf(t, e, n) {
  var i, r, a = bf(e) ? Ui : re;
  return function() {
    var s = a(this, t), o = s.on;
    o !== i && (r = (i = o).copy()).on(e, n), s.on = r;
  };
}
function Tf(t, e) {
  var n = this._id;
  return arguments.length < 2 ? te(this.node(), n).on.on(t) : this.each(kf(n, t, e));
}
function Ef(t) {
  return function() {
    var e = this.parentNode;
    for (var n in this.__transition) if (+n !== t) return;
    e && e.removeChild(this);
  };
}
function Sf() {
  return this.on("end.remove", Ef(this._id));
}
function Af(t) {
  var e = this._name, n = this._id;
  typeof t != "function" && (t = Ci(t));
  for (var i = this._groups, r = i.length, a = new Array(r), s = 0; s < r; ++s)
    for (var o = i[s], c = o.length, f = a[s] = new Array(c), u, _, p = 0; p < c; ++p)
      (u = o[p]) && (_ = t.call(u, u.__data__, p, o)) && ("__data__" in u && (_.__data__ = u.__data__), f[p] = _, Vn(f[p], e, n, p, f, te(u, n)));
  return new ce(a, this._parents, e, n);
}
function $f(t) {
  var e = this._name, n = this._id;
  typeof t != "function" && (t = Fa(t));
  for (var i = this._groups, r = i.length, a = [], s = [], o = 0; o < r; ++o)
    for (var c = i[o], f = c.length, u, _ = 0; _ < f; ++_)
      if (u = c[_]) {
        for (var p = t.call(u, u.__data__, _, c), g, T = te(u, n), z = 0, R = p.length; z < R; ++z)
          (g = p[z]) && Vn(g, e, n, z, p, T);
        a.push(p), s.push(u);
      }
  return new ce(a, s, e, n);
}
var Nf = Se.prototype.constructor;
function If() {
  return new Nf(this._groups, this._parents);
}
function Df(t, e) {
  var n, i, r;
  return function() {
    var a = Ce(this, t), s = (this.style.removeProperty(t), Ce(this, t));
    return a === s ? null : a === n && s === i ? r : r = e(n = a, i = s);
  };
}
function rs(t) {
  return function() {
    this.style.removeProperty(t);
  };
}
function Rf(t, e, n) {
  var i, r = n + "", a;
  return function() {
    var s = Ce(this, t);
    return s === r ? null : s === i ? a : a = e(i = s, n);
  };
}
function Mf(t, e, n) {
  var i, r, a;
  return function() {
    var s = Ce(this, t), o = n(this), c = o + "";
    return o == null && (c = o = (this.style.removeProperty(t), Ce(this, t))), s === c ? null : s === i && c === r ? a : (r = c, a = e(i = s, o));
  };
}
function Lf(t, e) {
  var n, i, r, a = "style." + e, s = "end." + a, o;
  return function() {
    var c = re(this, t), f = c.on, u = c.value[a] == null ? o || (o = rs(e)) : void 0;
    (f !== n || r !== u) && (i = (n = f).copy()).on(s, r = u), c.on = i;
  };
}
function Of(t, e, n) {
  var i = (t += "") == "transform" ? Fc : is;
  return e == null ? this.styleTween(t, Df(t, i)).on("end.style." + t, rs(t)) : typeof e == "function" ? this.styleTween(t, Mf(t, i, Gi(this, "style." + t, e))).each(Lf(this._id, t)) : this.styleTween(t, Rf(t, i, e), n).on("end.style." + t, null);
}
function Cf(t, e, n) {
  return function(i) {
    this.style.setProperty(t, e.call(this, i), n);
  };
}
function Ff(t, e, n) {
  var i, r;
  function a() {
    var s = e.apply(this, arguments);
    return s !== r && (i = (r = s) && Cf(t, s, n)), i;
  }
  return a._value = e, a;
}
function zf(t, e, n) {
  var i = "style." + (t += "");
  if (arguments.length < 2) return (i = this.tween(i)) && i._value;
  if (e == null) return this.tween(i, null);
  if (typeof e != "function") throw new Error();
  return this.tween(i, Ff(t, e, n ?? ""));
}
function Bf(t) {
  return function() {
    this.textContent = t;
  };
}
function Pf(t) {
  return function() {
    var e = t(this);
    this.textContent = e ?? "";
  };
}
function Hf(t) {
  return this.tween("text", typeof t == "function" ? Pf(Gi(this, "text", t)) : Bf(t == null ? "" : t + ""));
}
function Vf(t) {
  return function(e) {
    this.textContent = t.call(this, e);
  };
}
function Uf(t) {
  var e, n;
  function i() {
    var r = t.apply(this, arguments);
    return r !== n && (e = (n = r) && Vf(r)), e;
  }
  return i._value = t, i;
}
function Gf(t) {
  var e = "text";
  if (arguments.length < 1) return (e = this.tween(e)) && e._value;
  if (t == null) return this.tween(e, null);
  if (typeof t != "function") throw new Error();
  return this.tween(e, Uf(t));
}
function Zf() {
  for (var t = this._name, e = this._id, n = as(), i = this._groups, r = i.length, a = 0; a < r; ++a)
    for (var s = i[a], o = s.length, c, f = 0; f < o; ++f)
      if (c = s[f]) {
        var u = te(c, e);
        Vn(c, t, n, f, s, {
          time: u.time + u.delay + u.duration,
          delay: 0,
          duration: u.duration,
          ease: u.ease
        });
      }
  return new ce(i, this._parents, t, n);
}
function qf() {
  var t, e, n = this, i = n._id, r = n.size();
  return new Promise(function(a, s) {
    var o = { value: s }, c = { value: function() {
      --r === 0 && a();
    } };
    n.each(function() {
      var f = re(this, i), u = f.on;
      u !== t && (e = (t = u).copy(), e._.cancel.push(o), e._.interrupt.push(o), e._.end.push(c)), f.on = e;
    }), r === 0 && a();
  });
}
var Wf = 0;
function ce(t, e, n, i) {
  this._groups = t, this._parents = e, this._name = n, this._id = i;
}
function as() {
  return ++Wf;
}
var se = Se.prototype;
ce.prototype = {
  constructor: ce,
  select: Af,
  selectAll: $f,
  selectChild: se.selectChild,
  selectChildren: se.selectChildren,
  filter: yf,
  merge: xf,
  selection: If,
  transition: Zf,
  call: se.call,
  nodes: se.nodes,
  node: se.node,
  size: se.size,
  empty: se.empty,
  each: se.each,
  on: Tf,
  attr: rf,
  attrTween: cf,
  style: Of,
  styleTween: zf,
  text: Hf,
  textTween: Gf,
  remove: Sf,
  tween: Yc,
  delay: hf,
  duration: _f,
  ease: mf,
  easeVarying: wf,
  end: qf,
  [Symbol.iterator]: se[Symbol.iterator]
};
function Xf(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}
var Kf = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: Xf
};
function Yf(t, e) {
  for (var n; !(n = t.__transition) || !(n = n[e]); )
    if (!(t = t.parentNode))
      throw new Error(`transition ${e} not found`);
  return n;
}
function Jf(t) {
  var e, n;
  t instanceof ce ? (e = t._id, t = t._name) : (e = as(), (n = Kf).time = Vi(), t = t == null ? null : t + "");
  for (var i = this._groups, r = i.length, a = 0; a < r; ++a)
    for (var s = i[a], o = s.length, c, f = 0; f < o; ++f)
      (c = s[f]) && Vn(c, t, e, f, s, n || Yf(c, e));
  return new ce(i, this._parents, t, e);
}
Se.prototype.interrupt = Wc;
Se.prototype.transition = Jf;
const Ai = Math.PI, $i = 2 * Ai, me = 1e-6, Qf = $i - me;
function ss(t) {
  this._ += t[0];
  for (let e = 1, n = t.length; e < n; ++e)
    this._ += arguments[e] + t[e];
}
function jf(t) {
  let e = Math.floor(t);
  if (!(e >= 0)) throw new Error(`invalid digits: ${t}`);
  if (e > 15) return ss;
  const n = 10 ** e;
  return function(i) {
    this._ += i[0];
    for (let r = 1, a = i.length; r < a; ++r)
      this._ += Math.round(arguments[r] * n) / n + i[r];
  };
}
class tu {
  constructor(e) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null, this._ = "", this._append = e == null ? ss : jf(e);
  }
  moveTo(e, n) {
    this._append`M${this._x0 = this._x1 = +e},${this._y0 = this._y1 = +n}`;
  }
  closePath() {
    this._x1 !== null && (this._x1 = this._x0, this._y1 = this._y0, this._append`Z`);
  }
  lineTo(e, n) {
    this._append`L${this._x1 = +e},${this._y1 = +n}`;
  }
  quadraticCurveTo(e, n, i, r) {
    this._append`Q${+e},${+n},${this._x1 = +i},${this._y1 = +r}`;
  }
  bezierCurveTo(e, n, i, r, a, s) {
    this._append`C${+e},${+n},${+i},${+r},${this._x1 = +a},${this._y1 = +s}`;
  }
  arcTo(e, n, i, r, a) {
    if (e = +e, n = +n, i = +i, r = +r, a = +a, a < 0) throw new Error(`negative radius: ${a}`);
    let s = this._x1, o = this._y1, c = i - e, f = r - n, u = s - e, _ = o - n, p = u * u + _ * _;
    if (this._x1 === null)
      this._append`M${this._x1 = e},${this._y1 = n}`;
    else if (p > me) if (!(Math.abs(_ * c - f * u) > me) || !a)
      this._append`L${this._x1 = e},${this._y1 = n}`;
    else {
      let g = i - s, T = r - o, z = c * c + f * f, R = g * g + T * T, $ = Math.sqrt(z), E = Math.sqrt(p), k = a * Math.tan((Ai - Math.acos((z + p - R) / (2 * $ * E))) / 2), x = k / E, A = k / $;
      Math.abs(x - 1) > me && this._append`L${e + x * u},${n + x * _}`, this._append`A${a},${a},0,0,${+(_ * g > u * T)},${this._x1 = e + A * c},${this._y1 = n + A * f}`;
    }
  }
  arc(e, n, i, r, a, s) {
    if (e = +e, n = +n, i = +i, s = !!s, i < 0) throw new Error(`negative radius: ${i}`);
    let o = i * Math.cos(r), c = i * Math.sin(r), f = e + o, u = n + c, _ = 1 ^ s, p = s ? r - a : a - r;
    this._x1 === null ? this._append`M${f},${u}` : (Math.abs(this._x1 - f) > me || Math.abs(this._y1 - u) > me) && this._append`L${f},${u}`, i && (p < 0 && (p = p % $i + $i), p > Qf ? this._append`A${i},${i},0,1,${_},${e - o},${n - c}A${i},${i},0,1,${_},${this._x1 = f},${this._y1 = u}` : p > me && this._append`A${i},${i},0,${+(p >= Ai)},${_},${this._x1 = e + i * Math.cos(a)},${this._y1 = n + i * Math.sin(a)}`);
  }
  rect(e, n, i, r) {
    this._append`M${this._x0 = this._x1 = +e},${this._y0 = this._y1 = +n}h${i = +i}v${+r}h${-i}Z`;
  }
  toString() {
    return this._;
  }
}
function eu(t) {
  return Math.abs(t = Math.round(t)) >= 1e21 ? t.toLocaleString("en").replace(/,/g, "") : t.toString(10);
}
function Mn(t, e) {
  if ((n = (t = e ? t.toExponential(e - 1) : t.toExponential()).indexOf("e")) < 0) return null;
  var n, i = t.slice(0, n);
  return [
    i.length > 1 ? i[0] + i.slice(2) : i,
    +t.slice(n + 1)
  ];
}
function ze(t) {
  return t = Mn(Math.abs(t)), t ? t[1] : NaN;
}
function nu(t, e) {
  return function(n, i) {
    for (var r = n.length, a = [], s = 0, o = t[0], c = 0; r > 0 && o > 0 && (c + o + 1 > i && (o = Math.max(1, i - c)), a.push(n.substring(r -= o, r + o)), !((c += o + 1) > i)); )
      o = t[s = (s + 1) % t.length];
    return a.reverse().join(e);
  };
}
function iu(t) {
  return function(e) {
    return e.replace(/[0-9]/g, function(n) {
      return t[+n];
    });
  };
}
var ru = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
function Ln(t) {
  if (!(e = ru.exec(t))) throw new Error("invalid format: " + t);
  var e;
  return new Zi({
    fill: e[1],
    align: e[2],
    sign: e[3],
    symbol: e[4],
    zero: e[5],
    width: e[6],
    comma: e[7],
    precision: e[8] && e[8].slice(1),
    trim: e[9],
    type: e[10]
  });
}
Ln.prototype = Zi.prototype;
function Zi(t) {
  this.fill = t.fill === void 0 ? " " : t.fill + "", this.align = t.align === void 0 ? ">" : t.align + "", this.sign = t.sign === void 0 ? "-" : t.sign + "", this.symbol = t.symbol === void 0 ? "" : t.symbol + "", this.zero = !!t.zero, this.width = t.width === void 0 ? void 0 : +t.width, this.comma = !!t.comma, this.precision = t.precision === void 0 ? void 0 : +t.precision, this.trim = !!t.trim, this.type = t.type === void 0 ? "" : t.type + "";
}
Zi.prototype.toString = function() {
  return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
};
function au(t) {
  t: for (var e = t.length, n = 1, i = -1, r; n < e; ++n)
    switch (t[n]) {
      case ".":
        i = r = n;
        break;
      case "0":
        i === 0 && (i = n), r = n;
        break;
      default:
        if (!+t[n]) break t;
        i > 0 && (i = 0);
        break;
    }
  return i > 0 ? t.slice(0, i) + t.slice(r + 1) : t;
}
var os;
function su(t, e) {
  var n = Mn(t, e);
  if (!n) return t + "";
  var i = n[0], r = n[1], a = r - (os = Math.max(-8, Math.min(8, Math.floor(r / 3))) * 3) + 1, s = i.length;
  return a === s ? i : a > s ? i + new Array(a - s + 1).join("0") : a > 0 ? i.slice(0, a) + "." + i.slice(a) : "0." + new Array(1 - a).join("0") + Mn(t, Math.max(0, e + a - 1))[0];
}
function br(t, e) {
  var n = Mn(t, e);
  if (!n) return t + "";
  var i = n[0], r = n[1];
  return r < 0 ? "0." + new Array(-r).join("0") + i : i.length > r + 1 ? i.slice(0, r + 1) + "." + i.slice(r + 1) : i + new Array(r - i.length + 2).join("0");
}
const kr = {
  "%": (t, e) => (t * 100).toFixed(e),
  b: (t) => Math.round(t).toString(2),
  c: (t) => t + "",
  d: eu,
  e: (t, e) => t.toExponential(e),
  f: (t, e) => t.toFixed(e),
  g: (t, e) => t.toPrecision(e),
  o: (t) => Math.round(t).toString(8),
  p: (t, e) => br(t * 100, e),
  r: br,
  s: su,
  X: (t) => Math.round(t).toString(16).toUpperCase(),
  x: (t) => Math.round(t).toString(16)
};
function Tr(t) {
  return t;
}
var Er = Array.prototype.map, Sr = ["y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];
function ou(t) {
  var e = t.grouping === void 0 || t.thousands === void 0 ? Tr : nu(Er.call(t.grouping, Number), t.thousands + ""), n = t.currency === void 0 ? "" : t.currency[0] + "", i = t.currency === void 0 ? "" : t.currency[1] + "", r = t.decimal === void 0 ? "." : t.decimal + "", a = t.numerals === void 0 ? Tr : iu(Er.call(t.numerals, String)), s = t.percent === void 0 ? "%" : t.percent + "", o = t.minus === void 0 ? "−" : t.minus + "", c = t.nan === void 0 ? "NaN" : t.nan + "";
  function f(_) {
    _ = Ln(_);
    var p = _.fill, g = _.align, T = _.sign, z = _.symbol, R = _.zero, $ = _.width, E = _.comma, k = _.precision, x = _.trim, A = _.type;
    A === "n" ? (E = !0, A = "g") : kr[A] || (k === void 0 && (k = 12), x = !0, A = "g"), (R || p === "0" && g === "=") && (R = !0, p = "0", g = "=");
    var N = z === "$" ? n : z === "#" && /[boxX]/.test(A) ? "0" + A.toLowerCase() : "", S = z === "$" ? i : /[%p]/.test(A) ? s : "", B = kr[A], P = /[defgprs%]/.test(A);
    k = k === void 0 ? 6 : /[gprs]/.test(A) ? Math.max(1, Math.min(21, k)) : Math.max(0, Math.min(20, k));
    function F(w) {
      var U = N, V = S, J, et, at;
      if (A === "c")
        V = B(w) + V, w = "";
      else {
        w = +w;
        var C = w < 0 || 1 / w < 0;
        if (w = isNaN(w) ? c : B(Math.abs(w), k), x && (w = au(w)), C && +w == 0 && T !== "+" && (C = !1), U = (C ? T === "(" ? T : o : T === "-" || T === "(" ? "" : T) + U, V = (A === "s" ? Sr[8 + os / 3] : "") + V + (C && T === "(" ? ")" : ""), P) {
          for (J = -1, et = w.length; ++J < et; )
            if (at = w.charCodeAt(J), 48 > at || at > 57) {
              V = (at === 46 ? r + w.slice(J + 1) : w.slice(J)) + V, w = w.slice(0, J);
              break;
            }
        }
      }
      E && !R && (w = e(w, 1 / 0));
      var tt = U.length + w.length + V.length, it = tt < $ ? new Array($ - tt + 1).join(p) : "";
      switch (E && R && (w = e(it + w, it.length ? $ - V.length : 1 / 0), it = ""), g) {
        case "<":
          w = U + w + V + it;
          break;
        case "=":
          w = U + it + w + V;
          break;
        case "^":
          w = it.slice(0, tt = it.length >> 1) + U + w + V + it.slice(tt);
          break;
        default:
          w = it + U + w + V;
          break;
      }
      return a(w);
    }
    return F.toString = function() {
      return _ + "";
    }, F;
  }
  function u(_, p) {
    var g = f((_ = Ln(_), _.type = "f", _)), T = Math.max(-8, Math.min(8, Math.floor(ze(p) / 3))) * 3, z = Math.pow(10, -T), R = Sr[8 + T / 3];
    return function($) {
      return g(z * $) + R;
    };
  }
  return {
    format: f,
    formatPrefix: u
  };
}
var cn, ls, cs;
lu({
  thousands: ",",
  grouping: [3],
  currency: ["$", ""]
});
function lu(t) {
  return cn = ou(t), ls = cn.format, cs = cn.formatPrefix, cn;
}
function cu(t) {
  return Math.max(0, -ze(Math.abs(t)));
}
function fu(t, e) {
  return Math.max(0, Math.max(-8, Math.min(8, Math.floor(ze(e) / 3))) * 3 - ze(Math.abs(t)));
}
function uu(t, e) {
  return t = Math.abs(t), e = Math.abs(e) - t, Math.max(0, ze(e) - ze(t)) + 1;
}
function hu(t, e) {
  switch (arguments.length) {
    case 0:
      break;
    case 1:
      this.range(t);
      break;
    default:
      this.range(e).domain(t);
      break;
  }
  return this;
}
function du(t) {
  return function() {
    return t;
  };
}
function pu(t) {
  return +t;
}
var Ar = [0, 1];
function Me(t) {
  return t;
}
function Ni(t, e) {
  return (e -= t = +t) ? function(n) {
    return (n - t) / e;
  } : du(isNaN(e) ? NaN : 0.5);
}
function _u(t, e) {
  var n;
  return t > e && (n = t, t = e, e = n), function(i) {
    return Math.max(t, Math.min(e, i));
  };
}
function gu(t, e, n) {
  var i = t[0], r = t[1], a = e[0], s = e[1];
  return r < i ? (i = Ni(r, i), a = n(s, a)) : (i = Ni(i, r), a = n(a, s)), function(o) {
    return a(i(o));
  };
}
function mu(t, e, n) {
  var i = Math.min(t.length, e.length) - 1, r = new Array(i), a = new Array(i), s = -1;
  for (t[i] < t[0] && (t = t.slice().reverse(), e = e.slice().reverse()); ++s < i; )
    r[s] = Ni(t[s], t[s + 1]), a[s] = n(e[s], e[s + 1]);
  return function(o) {
    var c = wo(t, o, 1, i) - 1;
    return a[c](r[c](o));
  };
}
function vu(t, e) {
  return e.domain(t.domain()).range(t.range()).interpolate(t.interpolate()).clamp(t.clamp()).unknown(t.unknown());
}
function wu() {
  var t = Ar, e = Ar, n = Hi, i, r, a, s = Me, o, c, f;
  function u() {
    var p = Math.min(t.length, e.length);
    return s !== Me && (s = _u(t[0], t[p - 1])), o = p > 2 ? mu : gu, c = f = null, _;
  }
  function _(p) {
    return p == null || isNaN(p = +p) ? a : (c || (c = o(t.map(i), e, n)))(i(s(p)));
  }
  return _.invert = function(p) {
    return s(r((f || (f = o(e, t.map(i), Qt)))(p)));
  }, _.domain = function(p) {
    return arguments.length ? (t = Array.from(p, pu), u()) : t.slice();
  }, _.range = function(p) {
    return arguments.length ? (e = Array.from(p), u()) : e.slice();
  }, _.rangeRound = function(p) {
    return e = Array.from(p), n = Lc, u();
  }, _.clamp = function(p) {
    return arguments.length ? (s = p ? !0 : Me, u()) : s !== Me;
  }, _.interpolate = function(p) {
    return arguments.length ? (n = p, u()) : n;
  }, _.unknown = function(p) {
    return arguments.length ? (a = p, _) : a;
  }, function(p, g) {
    return i = p, r = g, u();
  };
}
function yu() {
  return wu()(Me, Me);
}
function xu(t, e, n, i) {
  var r = To(t, e, n), a;
  switch (i = Ln(i ?? ",f"), i.type) {
    case "s": {
      var s = Math.max(Math.abs(t), Math.abs(e));
      return i.precision == null && !isNaN(a = fu(r, s)) && (i.precision = a), cs(i, s);
    }
    case "":
    case "e":
    case "g":
    case "p":
    case "r": {
      i.precision == null && !isNaN(a = uu(r, Math.max(Math.abs(t), Math.abs(e)))) && (i.precision = a - (i.type === "e"));
      break;
    }
    case "f":
    case "%": {
      i.precision == null && !isNaN(a = cu(r)) && (i.precision = a - (i.type === "%") * 2);
      break;
    }
  }
  return ls(i);
}
function bu(t) {
  var e = t.domain;
  return t.ticks = function(n) {
    var i = e();
    return ko(i[0], i[i.length - 1], n ?? 10);
  }, t.tickFormat = function(n, i) {
    var r = e();
    return xu(r[0], r[r.length - 1], n ?? 10, i);
  }, t.nice = function(n) {
    n == null && (n = 10);
    var i = e(), r = 0, a = i.length - 1, s = i[r], o = i[a], c, f, u = 10;
    for (o < s && (f = s, s = o, o = f, f = r, r = a, a = f); u-- > 0; ) {
      if (f = mi(s, o, n), f === c)
        return i[r] = s, i[a] = o, e(i);
      if (f > 0)
        s = Math.floor(s / f) * f, o = Math.ceil(o / f) * f;
      else if (f < 0)
        s = Math.ceil(s * f) / f, o = Math.floor(o * f) / f;
      else
        break;
      c = f;
    }
    return t;
  }, t;
}
function ue() {
  var t = yu();
  return t.copy = function() {
    return vu(t, ue());
  }, hu.apply(t, arguments), bu(t);
}
function fn(t) {
  return function() {
    return t;
  };
}
const qi = Math.sqrt, fs = Math.PI, ku = 2 * fs;
function Tu(t) {
  let e = 3;
  return t.digits = function(n) {
    if (!arguments.length) return e;
    if (n == null)
      e = null;
    else {
      const i = Math.floor(n);
      if (!(i >= 0)) throw new RangeError(`invalid digits: ${n}`);
      e = i;
    }
    return t;
  }, () => new tu(e);
}
const Eu = {
  draw(t, e) {
    const n = qi(e / fs);
    t.moveTo(n, 0), t.arc(0, 0, n, 0, ku);
  }
}, Yn = qi(3), us = {
  draw(t, e) {
    const n = -qi(e / (Yn * 3));
    t.moveTo(0, n * 2), t.lineTo(-Yn * n, -n), t.lineTo(Yn * n, -n), t.closePath();
  }
};
function hs(t, e) {
  let n = null, i = Tu(r);
  t = typeof t == "function" ? t : fn(t || Eu), e = typeof e == "function" ? e : fn(e === void 0 ? 64 : +e);
  function r() {
    let a;
    if (n || (n = a = i()), t.apply(this, arguments).draw(n, +e.apply(this, arguments)), a) return n = null, a + "" || null;
  }
  return r.type = function(a) {
    return arguments.length ? (t = typeof a == "function" ? a : fn(a), r) : t;
  }, r.size = function(a) {
    return arguments.length ? (e = typeof a == "function" ? a : fn(+a), r) : e;
  }, r.context = function(a) {
    return arguments.length ? (n = a ?? null, r) : n;
  }, r;
}
function qe(t, e, n) {
  this.k = t, this.x = e, this.y = n;
}
qe.prototype = {
  constructor: qe,
  scale: function(t) {
    return t === 1 ? this : new qe(this.k * t, this.x, this.y);
  },
  translate: function(t, e) {
    return t === 0 & e === 0 ? this : new qe(this.k, this.x + this.k * t, this.y + this.k * e);
  },
  apply: function(t) {
    return [t[0] * this.k + this.x, t[1] * this.k + this.y];
  },
  applyX: function(t) {
    return t * this.k + this.x;
  },
  applyY: function(t) {
    return t * this.k + this.y;
  },
  invert: function(t) {
    return [(t[0] - this.x) / this.k, (t[1] - this.y) / this.k];
  },
  invertX: function(t) {
    return (t - this.x) / this.k;
  },
  invertY: function(t) {
    return (t - this.y) / this.k;
  },
  rescaleX: function(t) {
    return t.copy().domain(t.range().map(this.invertX, this).map(t.invert, t));
  },
  rescaleY: function(t) {
    return t.copy().domain(t.range().map(this.invertY, this).map(t.invert, t));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};
qe.prototype;
function $e(t) {
  return t?.toLowerCase();
}
function Su(t) {
  return t ? (Array.isArray(t) ? t : [t]).map((n) => n.toLowerCase()) : void 0;
}
function de(t, e) {
  return !!(t && e && t.includes(e));
}
function Au(t, e, n) {
  if (!e && !n)
    return !0;
  const i = $e(e), r = $e(n), a = $e(t.name), s = $e(t.id), o = $e(t.curie), c = $e(t.gene_id), f = Su(t.alias), u = !!(i && (de(a, i) || f?.some((p) => de(p, i)))), _ = !!(r && (de(a, r) || de(s, r) || de(c, r) || de(o, r) || f?.some((p) => de(p, r))));
  return u || _;
}
function ds(t, e, n) {
  if (!e && !n)
    return t;
  const i = t.filter(
    (r) => Au(r, e, n)
  );
  return i.length > 0 ? i : t;
}
function Wi(t, e, n) {
  let i = 0, r, a;
  if (t.length == 0)
    i = 1;
  else {
    for (let s = 1; s < t.length; s++) {
      for (const o of t[s]) {
        const [c, f] = o.split(":");
        if (n < +c || e > +f)
          a = 1;
        else {
          a = 0;
          break;
        }
      }
      if (a) {
        r = 1, i = s;
        break;
      }
    }
    r || (i = t.length);
  }
  return i;
}
function ps(t, e, n, i, r) {
  let a = -1, s = -1;
  const o = [], c = ds(t, i, r);
  for (const f of c) {
    const u = f.children;
    u && u.forEach((_) => {
      if (e.includes(_.type)) {
        if (n) {
          const p = _.fmin < n.start, g = _.fmax > n.end;
          if (p && g)
            return;
        }
        (a < 0 || _.fmin < a) && (a = _.fmin), (s < 0 || _.fmax > s) && (s = _.fmax, o.push({
          name: _.name || "unnamed",
          type: _.type,
          fmin: _.fmin,
          fmax: _.fmax
        }));
      }
    });
  }
  return {
    fmin: a,
    fmax: s
  };
}
function Be(t) {
  const n = t.attr("class").split(" "), i = `.${n[0]}.${n[1]} .track`, r = yi(i).nodes();
  let a = 0;
  return r.forEach((s) => {
    a += s.getBoundingClientRect().height + 1;
  }), a;
}
function Xi(t, e) {
  const n = e.node()?.getBBox().height ?? 0;
  e.selectAll(
    ".variant-deletion,.variant-SNV,.variant-insertion,.variant-delins"
  ).filter((r) => {
    let a = !1;
    return r.alleles?.length && (r.alleles[0].replace(/"|\[|\]| /g, "").split(",").forEach((o) => {
      t.includes(o) && (a = !0);
    }), r.alleles.forEach((o) => {
      t.includes(o) && (a = !0);
    })), a;
  }).datum((r) => (r.selected = "true", r)).style("stroke", "black").each(function() {
    let r = ht(this).attr("x"), a = +ht(this).attr("width");
    (a === 0 || Number.isNaN(a)) && (a = 3, r = String(+r - a / 2));
    const s = e.select(".variants.track");
    (s.empty() ? e : s).append("rect").attr("class", "highlight").attr("x", r).attr("width", a).attr("height", n).attr("fill", "yellow").attr("opacity", 0.8).lower();
  });
}
const $u = [
  "transcript",
  "mRNA",
  "ncRNA",
  "piRNA",
  "lincRNA",
  "miRNA",
  "pre_miRNA",
  "snoRNA",
  "lnc_RNA",
  "tRNA",
  "snRNA",
  "rRNA",
  "ARS",
  "antisense_RNA",
  "C_gene_segment",
  "V_gene_segment",
  "pseudogene_attribute",
  "snoRNA_gene",
  "polypeptide_region",
  "mature_protein_region"
], Nu = [
  "point_mutation",
  "MNV",
  "Deletion",
  "Insertion",
  "Delins"
];
function We(t) {
  return t.replace(/\|/g, " ").replace(/"/g, "").replace(/^\[/, "").replace(/\]$/, "").trim();
}
const kn = {
  transcript_ablation: {
    impact: "HIGH",
    color: "#ff0000"
  },
  splice_acceptor_variant: {
    impact: "HIGH",
    color: "#ff581a"
  },
  splice_donor_variant: {
    impact: "HIGH",
    color: "#ff581a"
  },
  stop_gained: {
    impact: "HIGH",
    color: "#ff0000"
  },
  frameshift_variant: {
    impact: "HIGH",
    color: "#9400D3"
  },
  stop_lost: {
    impact: "HIGH",
    color: "#ff0000"
  },
  start_lost: {
    impact: "HIGH",
    color: "#ffd700"
  },
  transcript_amplification: {
    impact: "HIGH",
    color: "#ff69b4"
  },
  inframe_insertion: {
    impact: "MODERATE",
    color: "#ff69b4"
  },
  inframe_deletion: {
    impact: "MODERATE",
    color: "#ff69b4"
  },
  missense_variant: {
    impact: "MODERATE",
    color: "#ffd700"
  },
  protein_altering_variant: {
    impact: "MODERATE",
    color: "#ff0080"
  },
  splice_region_variant: {
    impact: "LOW",
    color: "#ff7f50"
  },
  incomplete_terminal_codon_variant: {
    impact: "LOW",
    color: "#ff00ff"
  },
  start_retained_variant: {
    impact: "LOW",
    color: "#76ee00"
  },
  stop_retained_variant: {
    impact: "LOW",
    color: "#76ee00"
  },
  synonymous_variant: {
    impact: "LOW",
    color: "#76ee00"
  },
  coding_sequence_variant: {
    impact: "MODIFIER",
    color: "#458b00"
  },
  mature_miRNA_variant: {
    impact: "MODIFIER",
    color: "#458b00"
  },
  five_prime_UTR_variant: {
    impact: "MODIFIER",
    color: "#7ac5cd"
  },
  three_prime_UTR_variant: {
    impact: "MODIFIER",
    color: "#7ac5cd"
  },
  non_coding_transcript_exon_variant: {
    impact: "MODIFIER",
    color: "#32cd32"
  },
  intron_variant: {
    impact: "MODIFIER",
    color: "#02599c"
  },
  NMD_transcript_variant: {
    impact: "MODIFIER",
    color: "#ff4500"
  },
  non_coding_transcript_variant: {
    impact: "MODIFIER",
    color: "#32cd32"
  },
  upstream_gene_variant: {
    impact: "MODIFIER",
    color: "#a2b5cd"
  },
  downstream_gene_variant: {
    impact: "MODIFIER",
    color: "#a2b5cd"
  },
  TFBS_ablation: {
    impact: "MODIFIER",
    color: "#a52a2a"
  },
  TFBS_amplification: {
    impact: "MODIFIER",
    color: "#a52a2a"
  },
  TF_binding_site_variant: {
    impact: "MODIFIER",
    color: "#a52a2a"
  },
  regulatory_region_ablation: {
    impact: "MODERATE",
    color: "#a52a2a"
  },
  regulatory_region_amplification: {
    impact: "MODIFIER",
    color: "#a52a2a"
  },
  feature_elongation: {
    impact: "MODIFIER",
    color: "#7f7f7f"
  },
  regulatory_region_variant: {
    impact: "MODIFIER",
    color: "#a52a2a"
  },
  feature_truncation: {
    impact: "MODIFIER",
    color: "#7f7f7f"
  },
  intergenic_variant: {
    impact: "MODIFIER",
    color: "#636363"
  }
};
function _s(t) {
  if (!t)
    return "black";
  const e = We(t);
  if (e.split(" ").length > 1 || e.split("|").length > 1) {
    const i = e.includes("|") ? e.split("|")[0].trim() : e.split(" ")[0].trim();
    return _s(i);
  }
  if (e === "UNKNOWN")
    return "gray";
  const n = kn[e];
  return n ? n.color : e === "5_prime_UTR_variant" ? kn.five_prime_UTR_variant.color : e === "3_prime_UTR_variant" ? kn.three_prime_UTR_variant.color : "#f0f";
}
const xe = 10, fe = 10;
function Ki(t) {
  return `${t},${xe} ${t + fe / 2},${xe / 2} ${t},0 ${t - fe / 2},${xe / 2}`;
}
function gs(t) {
  return `${t - fe / 2},${xe} ${t},0 ${t + fe / 2},${xe}`;
}
function ms(t) {
  return `${t - fe / 2},${xe} ${t + fe / 2},${xe} ${t - fe / 2},0 ${t + fe / 2},0`;
}
function Iu(t) {
  const e = Object.keys(t).length;
  return {
    descriptionWidth: Math.max(
      ...Object.entries(t).map((i) => i[1]?.length ?? 0)
    ),
    descriptionHeight: e
  };
}
function Du(t, e, n) {
  const { fmax: i, fmin: r, type: a } = e;
  return t.findIndex((s) => {
    const o = s.fmin + n, c = s.fmax - n;
    return a !== s.type ? !1 : o <= r && c >= r || c <= i && c >= i || o >= r && c <= i;
  });
}
function vs(t, e) {
  const n = [];
  return t.forEach((i) => {
    const r = ks(i), { type: a, fmax: s, fmin: o } = i, c = Du(
      n,
      i,
      e
    );
    if (c >= 0 && a != "deletion") {
      const f = n[c], u = f.variantSet ? f.variantSet.findIndex(
        (_) => _.type === a && _.consequence === r
      ) : -1;
      if (u >= 0) {
        const _ = Math.min(
          f.variantSet[u].fmin,
          o
        ), p = Math.max(
          f.variantSet[u].fmax,
          s
        );
        f.fmin = _, f.fmax = p, f.variantSet[u].fmin = _, f.variantSet[u].fmax = p, f.variantSet[u].variants?.push(
          i
        );
      } else {
        const _ = Math.min(f.fmin, o), p = Math.max(f.fmax, s);
        f.fmin = _, f.fmax = p, f.variantSet.push({
          variants: [i],
          type: a,
          consequence: r,
          fmin: o,
          fmax: s
        });
      }
      f.variants?.push(i), f.fmin = Math.min(o, f.fmin), f.fmax = Math.max(s, f.fmax), n[c] = f;
    } else
      n.push({
        fmin: o,
        fmax: s,
        type: a,
        consequence: r,
        variantSet: [
          // @ts-expect-error
          {
            variants: [i],
            type: a,
            consequence: r,
            fmin: o,
            fmax: s
          }
        ],
        variants: [i]
      });
  }), n;
}
function ws(t) {
  if (t.length === 1) {
    let e = '<div style="margin-top: 30px;">';
    return e += $r(t[0]), e += "</div>", e;
  } else if (t.length > 1) {
    let e = '<ul style="list-style-type: none; margin-top: 30px;">';
    for (const n of t)
      e += `<li style="border-bottom: solid 1px black;">${$r(n)}</li>`;
    return e += "</ul>", e;
  } else
    return "No data available";
}
function $r(t) {
  const { descriptionWidth: e } = Iu(t);
  let n = "";
  const i = t.location, [r, a] = i.split(":")[1].split("..");
  let s = t.alternative_alleles, o = t.reference_allele, c;
  if (t.type === "SNV")
    c = "1bp";
  else if (t.type === "deletion")
    c = `${o.length - 1}bp deleted`;
  else if (t.type === "insertion")
    s === "ALT_MISSING" ? (c = "unknown length inserted", s = "n+") : c = `${s.length - 1}bp inserted`;
  else if (t.type === "MNV")
    c = `${o.length}bp`;
  else if (t.type === "delins") {
    const u = `${o.length - 1}bp deleted`;
    let _;
    s === "ALT_MISSING" ? (_ = "unknown length inserted", s = "n+") : _ = `${s.length - 1}bp inserted`, c = `${u}; ${_}`;
  } else
    c = `${+a - +r}bp`;
  o = o.length > 20 ? `${o.slice(0, 1).toLowerCase() + o.slice(1, 8).toUpperCase()}...${o.slice(Math.max(0, o.length - 8)).toUpperCase()}` : o.slice(0, 1).toLowerCase() + o.slice(1).toUpperCase(), s = s.length > 20 ? `${s.slice(0, 1).toLowerCase() + s.slice(1, 8).toUpperCase()}...${s.slice(Math.max(0, s.length - 8)).toUpperCase()}` : s.slice(0, 1).toLowerCase() + s.slice(1).toUpperCase(), (t.type === "SNV" || t.type === "MNV") && (s = s.toUpperCase(), o = o.toUpperCase());
  let f = "";
  return t.type === "insertion" ? f = `ins: ${s}` : t.type === "deletion" ? f = `del: ${o}` : f = `${o}->${s}`, n += '<table class="tooltip-table"><tbody>', n += `<tr><th>Symbol</th><td style="word-break: break-all; max-width: 600px;">${t.symbolDetail}</td></tr>`, n += `<tr><th>Type</th><td>${t.type}</td></tr>`, n += `<tr><th>Consequence</th><td>${t.consequence}</td></tr>`, t.impact && (n += `<tr><th>Impact</th><td>${t.impact.length > e ? t.impact.slice(0, Math.max(0, e)) : t.impact}</td></tr>`), n += `<tr><th>Length</th><td>${c}</td></tr>`, t.name !== t.symbol && (n += `<tr><th>Name</th><td style="word-break: break-all; max-width: 600px;">${t.name}</td></tr>`), t.geneId && t.geneSymbol ? n += `<tr><th>Allele of Genes</th><td> ${t.geneSymbol.length > e ? t.geneSymbol.slice(0, Math.max(0, e)) : t.geneSymbol} (${t.geneId})</td></tr>` : t.allele_of_genes && (n += `<tr><th>Allele of Genes</th><td>${t.allele_of_genes.length > e ? t.allele_of_genes.slice(0, Math.max(0, e)) : t.allele_of_genes}</td></tr>`), t.alternative_alleles && (n += `<tr><th>Sequence Change</th><td>${f}</td></tr>`), n += "</tbody></table>", n;
}
function ys(t) {
  return (t.variants ?? []).map((n) => {
    const i = Ru(n);
    return {
      ...i,
      consequence: i.consequence || "UNKNOWN"
    };
  });
}
function xs(t) {
  return (t.variants ?? []).flatMap((e) => {
    const n = e.allele_ids?.values?.[0];
    if (!n)
      return [];
    if (n.startsWith("[") && n.endsWith("]"))
      try {
        const i = JSON.parse(n);
        return (Array.isArray(i) ? i : [i]).map(String);
      } catch {
      }
    return n.replace(/"/g, "").split(",").map((i) => i.replace(/\[|\]| /g, ""));
  }).filter((e) => !!e);
}
function bs(t) {
  return t.map((e) => _s(e.consequence));
}
function ks(t) {
  if (t.geneLevelConsequence?.values && t.geneLevelConsequence.values.length > 0)
    return We(t.geneLevelConsequence.values[0]);
  if (t.consequence && typeof t.consequence == "string")
    return We(t.consequence);
  if (Array.isArray(t.consequence) && t.consequence.length > 0)
    return We(t.consequence[0]);
  const e = t.variants ?? [];
  if (e.length > 0) {
    for (const n of e)
      if (n.consequence && typeof n.consequence == "string")
        return We(n.consequence);
  }
  return "UNKNOWN";
}
function un(t) {
  return (Array.isArray(t?.values) ? t.values.join(" ") : t?.values) ?? "";
}
function Ru(t) {
  return {
    symbol: Un(t),
    symbolDetail: Ts(t),
    location: `${t.seqId}:${t.fmin}..${t.fmax}`,
    consequence: ks(t),
    type: t.type,
    name: t.name,
    description: t.description,
    reference_allele: t.reference_allele,
    geneId: t.allele_of_gene_ids?.values[0].replace(/"/g, ""),
    geneSymbol: t.allele_of_gene_symbols?.values[0].replace(/"/g, ""),
    allele_of_genes: un(t.allele_of_genes),
    allele_ids: un(t.allele_ids),
    alternative_alleles: un(t.alternative_alleles),
    impact: un(t.impact)
  };
}
function Ts(t) {
  if (t.variants)
    return t.variants.length !== 1 ? `${t.variants.length}` : Ts(t.variants[0]);
  if (t.allele_symbols?.values)
    if (t.allele_symbols.values[0].split(",").length > 1)
      try {
        const e = [], n = t.allele_symbols.values[0].replace(
          /"|\[|\]/g,
          ""
        ), i = t.allele_ids?.values[0].replace(/"|\[|\]/g, "") ?? "", r = n.split(","), a = i.split(",");
        for (let s = 0; s < a.length; s++)
          e.push(
            `${r[s].trim()} (${a[s].trim()})`
          );
        return e.join(", ");
      } catch {
        return `${t.allele_symbols.values[0].split(",").length}`;
      }
    else
      return `${t.allele_symbols.values[0].replace(/"/g, "")}(${t.allele_ids?.values[0].replace(
        /"|\[|\]/g,
        ""
      )})`;
  return "";
}
function Un(t) {
  if (t.variants)
    return t.variants.length !== 1 ? `${t.variants.length}` : Un(t.variants[0]);
  if (t.allele_symbols_text?.values) {
    const e = t.allele_symbols_text.values[0].split(",");
    return e.length > 1 ? `${e.length}` : t.allele_symbols_text.values[0].replace(/"/g, "");
  }
  return "";
}
function Mu(t) {
  const e = [];
  for (const n of t)
    n.type.toLowerCase() === "deletion" || (n.type.toLowerCase() === "snv" || n.type.toLowerCase() === "point_mutation" ? e.push("snv") : n.type.toLowerCase() === "insertion" ? e.push("insertion") : (n.type.toLowerCase() === "delins" || n.type.toLowerCase() === "substitution" || n.type.toLowerCase() === "indel" || n.type.toLowerCase() === "mnv") && e.push("delins"));
  return [...new Set(e)].sort();
}
function Lu(t, e = 15) {
  const n = [], i = [...t].sort((a, s) => a.fmin - s.fmin), r = [];
  return i.forEach((a) => {
    let s = "";
    const o = a.type.toLowerCase();
    if (o === "snv" || o === "point_mutation" ? s = "snv" : o === "insertion" ? s = "insertion" : o === "delins" || o === "substitution" || o === "indel" || o === "mnv" ? s = "delins" : o === "deletion" && (s = "deletion"), !s) return;
    let c = !1, f = 0, u = a.pixelFmin !== void 0 ? a.pixelFmin : a.fmin, _ = a.pixelFmax !== void 0 ? a.pixelFmax : a.fmax;
    if (s === "snv") {
      const p = (u + _) / 2;
      u = p - 5, _ = p + 5;
    }
    if (s === "delins" && Math.abs(_ - u) < 10) {
      const p = (u + _) / 2;
      u = p - 5, _ = p + 5;
    }
    if (s === "deletion" && Math.abs(_ - u) < 5) {
      const p = (u + _) / 2;
      u = p - 2.5, _ = p + 2.5;
    }
    for (; !c; )
      r[f] || (r[f] = []), r[f].some((g) => {
        const T = g.pixelFmin - e, z = g.pixelFmax + e;
        return !(_ < T || u > z);
      }) ? f++ : (r[f].push({ pixelFmin: u, pixelFmax: _ }), n.push({ variant: a, row: f, type: s }), c = !0);
  }), n;
}
function Ii(t, e) {
  return `<svg width="15" top="3" viewBox="0 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><rect fill="${t}" stroke="none" height="10" width="10"></svg>${e}</polygons></svg>`;
}
function Rt(t) {
  return t == "unknown" ? Ii("grey", t.replace(/_/g, " ")) : Ii(
    kn[t].color,
    t.replace(/_/g, " ")
  );
}
function Ou() {
  let t = "<table><tbody>";
  return t += "<tr>", t += '<td align="center" valign="top"><u><b>Variant types</b></u></td>', t += '<td align="center" valign="top" colspan="2"><u><b>Molecular Consequences</b></u></td>', t += "</tr>", t += "<tr>", t += '<td valign="top" ><ul style="list-style-type:none;">', t += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${Ki(0)}"></svg>point mutation</polygons></svg></li>`, t += `<li>${Ii("black", "deletion")}</li>`, t += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${gs(0)}"></svg>insertion</polygons></svg></li>`, t += `<li><svg width="15" top="3" viewBox="-7 -2 15 15" style="display: inline;" xmlns="http://www.w3.org/2000/svg"><polygon stroke="black" fill="black" points="${ms(0)}"></svg>delins/MNV </polygons></svg></li>`, t += "</ul></td>", t += '<td valign="top" ><ul style="list-style-type:none;">', t += `<li>${Rt("transcript_ablation")}</li>`, t += `<li>${Rt("splice_acceptor_variant")}</li>`, t += `<li>${Rt("splice_donor_variant")}</li>`, t += `<li>${Rt("stop_gained")}</li>`, t += `<li>${Rt("frameshift_variant")}</li>`, t += `<li>${Rt("stop_lost")}</li>`, t += `<li>${Rt("start_lost")}</li>`, t += `<li>${Rt("inframe_insertion")}</li>`, t += `<li>${Rt("inframe_deletion")}</li>`, t += `<li>${Rt("missense_variant")}</li>`, t += "</ul></td>", t += '<td valign="top" ><ul style="list-style-type:none;">', t += `<li>${Rt("protein_altering_variant")}</li>`, t += `<li>${Rt("splice_region_variant")}</li>`, t += `<li>${Rt("start_retained_variant")}</li>`, t += `<li>${Rt("stop_retained_variant")}</li>`, t += `<li>${Rt("synonymous_variant")}</li>`, t += `<li>${Rt("coding_sequence_variant")}</li>`, t += `<li>${Rt("five_prime_UTR_variant")}</li>`, t += `<li>${Rt("three_prime_UTR_variant")}</li>`, t += `<li>${Rt("intron_variant")}</li>`, t += `<li>${Rt("non_coding_transcript_variant")}</li>`, t += `<li>${Rt("unknown")}</li>`, t += "</ul></td>", t += "</tr>", t += "<tr>", t += "<td></td>", t += '<td colspan="2"><a href="https://uswest.ensembl.org/info/genome/variation/prediction/predicted_data.html">Source: Ensembl</a></td>', t += "</tr>", t += "</tbody></table>", t;
}
function Cu(t) {
  return t === 1 ? "+" : t === -1 ? "-" : t;
}
function Ot(t) {
  let e = "";
  return e += '<table class="tooltip-table" style="margin-top: 30px;"><tbody>', e += t.id.includes("http") ? `<tr><th>Name</th><td>${t.name}</td></tr>` : `<tr><th>Name</th><td>${t.name} (${t.id})</td></tr>`, e += `<tr><th>Type</th><td>${t.type}</td></tr>`, e += `<tr><th>Source</th><td>${t.source}</td></tr>`, e += `<tr><th>Location</th><td>${t.seqId}:${t.fmin}..${t.fmax} (${Cu(t.strand)})</td></tr>`, e += "</tbody></table>", e;
}
function Es(t, e, n, i) {
  let r = "";
  if (t === "FlyBase")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FDrosophila%20melanogaster&tracks=Variants%2CAll%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else if (t === "MGI")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FMus%20musculus&tracks=Variants%2CAll%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else if (t === "WormBase")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FCaenorhabditis%20elegans&tracks=Variants%2CAll%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else if (t === "ZFIN")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FDanio%20rerio&tracks=Variants%2CAll%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else if (t === "SGD")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FSaccharomyces%20cerevisiae&tracks=Variants%2CAll%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else if (t === "RGD")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FRattus%20norvegicus&tracks=Variants%2CAll%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else if (t === "human")
    r = `https://alliancegenome.org/jbrowse/?data=data%2FHomo%20sapiens&tracks=All%20Genes&highlight=&loc=${e}%3A${n}..${i}`;
  else
    return console.warn("no source found", t), "Maximum features displayed.  See full view for more.";
  return `<a href="${r}">Maximum features displayed.  See full view for more.</a>`;
}
class Fu {
  constructor({
    viewer: e,
    height: n,
    width: i,
    transcriptTypes: r,
    variantTypes: a,
    showVariantLabel: s,
    variantFilter: o,
    binRatio: c,
    isoformFilter: f,
    initialHighlight: u,
    trackData: _,
    variantData: p,
    geneBounds: g,
    geneSymbol: T,
    geneId: z,
    speciesTaxonId: R
  }) {
    this.trackData = _ ?? [], this.variantData = p ?? [], this.viewer = e, this.width = i, this.variantFilter = o, this.isoformFilter = f, this.initialHighlight = u, this.height = n, this.transcriptTypes = r, this.variantTypes = a, this.binRatio = c, this.showVariantLabel = s ?? !0, this.geneBounds = g, this.geneSymbol = T, this.geneId = z, this.speciesTaxonId = R;
  }
  DrawTrack() {
    const e = this.isoformFilter;
    let n = this.trackData;
    const i = this.initialHighlight, r = this.filterVariantData(
      this.variantData,
      this.variantFilter
    ), a = this.viewer, s = this.width, o = this.binRatio;
    let f = Mu(r).length;
    if (!this.trackData || !Array.isArray(this.trackData) || this.trackData.length === 0)
      throw new Error("trackData must be a non-empty array");
    const u = this.trackData[0].source, _ = this.trackData[0].seqId, p = !e || e.length === 0 ? 9 : 30, g = ["UTR", "five_prime_UTR", "three_prime_UTR"], T = ["CDS"], z = ["exon"], R = this.transcriptTypes, $ = ps(n, R, this.geneBounds, this.geneSymbol, this.geneId);
    let E = $.fmin, k = $.fmax;
    this.geneBounds && (E = this.geneBounds.start, k = this.geneBounds.end, $.fmin < E && (E = $.fmin), $.fmax > k && (k = $.fmax));
    const x = 10, A = 10, N = 40, S = 20, B = 0, P = 10, F = 10, w = 5, U = 4, V = 20, J = 10, et = `0,0 0,${V} ${J},${J}`, at = 22.5, C = ue().domain([E, k]).range([0, s]), tt = a.append("g").attr("class", "label"), it = {};
    for (let K = 0, ct = g.length; K < ct; K++)
      it[g[K]] = 200;
    for (let K = 0, ct = T.length; K < ct; K++)
      it[T[K]] = 1e3;
    for (let K = 0, ct = z.length; K < ct; K++)
      it[z[K]] = 100;
    const nt = {};
    n = n.sort((K, ct) => {
      if (K.selected && !ct.selected)
        return -1;
      if (!K.selected && ct.selected)
        return 1;
      const ut = K.fmin || 0, m = ct.fmin || 0;
      return ut - m;
    });
    let Q = 0;
    const _t = ht("body").append("div").attr("class", "gfc-tooltip").style("visibility", "visible").style("opacity", 0), ot = () => {
      _t.transition().duration(100).style("opacity", 10).style("visibility", "hidden");
    }, yt = [...vs(
      r,
      (k - E) * o
    )], rt = Be(this.viewer), dt = !r || r.length === 0, st = this.speciesTaxonId === "NCBITaxon:9606", kt = this.speciesTaxonId === "NCBITaxon:559292";
    dt && !(st || kt) && a.append("g").attr("class", "variant-message track").attr("transform", `translate(0,${rt})`).append("text").attr("x", 10).attr("y", 15).attr("fill", "#d9534f").attr("opacity", 0.8).attr("font-size", "12px").text("No variant data available for this region. Please contact help@alliancegenome.org if this is unexpected.");
    const Et = a.append("g").attr("class", "variants track").attr("transform", `translate(0,${rt})`), lt = yt.map((K) => ({
      ...K,
      pixelFmin: C(K.fmin),
      pixelFmax: C(K.fmax)
    })), Y = Lu(lt, 15);
    let vt = 0;
    Y.forEach((K) => {
      K.row > vt && (vt = K.row);
    }), f = Math.max(vt + 1, 1);
    const pt = /* @__PURE__ */ new Map();
    Y.forEach((K) => {
      const ct = `${K.variant.fmin}-${K.type.toLowerCase()}`;
      pt.set(ct, K.row);
    });
    const mt = [];
    for (let K = 0; K < f; K++) {
      const ct = Et.append("g").attr("class", `variant-row-${K}`).attr("transform", `translate(0,${K * (F + w)})`).style("pointer-events", "all").style("isolation", "isolate");
      mt.push(ct);
    }
    for (let K = mt.length - 1; K >= 0; K--)
      mt[K].raise();
    [...yt].sort((K, ct) => {
      const ut = K.type.toLowerCase(), m = ct.type.toLowerCase(), M = `${K.fmin}-${ut === "snv" || ut === "point_mutation" ? "snv" : ut === "insertion" ? "insertion" : ut === "deletion" ? "deletion" : "delins"}`, I = `${ct.fmin}-${m === "snv" || m === "point_mutation" ? "snv" : m === "insertion" ? "insertion" : m === "deletion" ? "deletion" : "delins"}`, q = pt.get(M) || 0, y = pt.get(I) || 0;
      return q - y;
    }).forEach((K, ct) => {
      const { type: ut, fmax: m, fmin: M } = K;
      let I = !0, q = !1;
      const y = this.width, L = Un(K), h = ys(K), H = xs(K), j = ws(h), l = bs(h)[0];
      if (ut.toLowerCase() === "snv" || ut.toLowerCase() === "point_mutation") {
        q = !0;
        const D = pt.get(`${M}-snv`) || 0;
        (mt[D] || Et).append("polygon").attr("class", "variant-SNV").attr("id", `variant-${M}`).attr("points", Ki(C(M))).attr("fill", l).attr("x", C(M)).attr("z-index", 30).on("click", () => {
          Tt(_t, j, ot);
        }).on("mouseover", function(d) {
          const v = ht(this).datum();
          v && (ht(this).style("stroke", "black"), ht(".label").selectAll(".variantLabel,.variantLabelBackground").filter((b) => b && b.variant === v.variant).style("opacity", 1).style("pointer-events", "auto").raise());
        }).on("mouseout", function() {
          const d = ht(this).datum();
          (!d || d.selected !== "true") && ht(this).style("stroke", null), ht(".label").selectAll(".variantLabel,.variantLabelBackground").style("opacity", 0).style("pointer-events", "none");
        }).datum({
          fmin: M,
          fmax: m,
          variant: L + M,
          alleles: H
        });
      } else if (ut.toLowerCase() === "insertion") {
        q = !0;
        const D = pt.get(`${M}-insertion`) || 0;
        (mt[D] || Et).append("polygon").attr("class", "variant-insertion").attr("id", `variant-${M}`).attr("points", gs(C(M))).attr("fill", l).attr("x", C(M)).attr("z-index", 30).on("click", () => {
          Tt(_t, j, ot);
        }).on("mouseover", function(d) {
          const v = ht(this).datum();
          v && (ht(this).style("stroke", "black"), ht(".label").selectAll(".variantLabel,.variantLabelBackground").filter((b) => b && b.variant === v.variant).style("opacity", 1).style("pointer-events", "auto").raise());
        }).on("mouseout", function() {
          const d = ht(this).datum();
          (!d || d.selected !== "true") && ht(this).style("stroke", null), ht(".label").selectAll(".variantLabel,.variantLabelBackground").style("opacity", 0).style("pointer-events", "none");
        }).datum({
          fmin: M,
          fmax: m,
          variant: L + M,
          alleles: H
        });
      } else if (ut.toLowerCase() === "delins" || ut.toLowerCase() === "substitution" || ut.toLowerCase() === "indel" || ut.toLowerCase() === "mnv") {
        q = !0;
        const D = pt.get(`${M}-delins`) || 0;
        (mt[D] || Et).append("polygon").attr("class", "variant-delins").attr("id", `variant-${M}`).attr("points", ms(C(M))).attr("x", C(M)).attr("fill", l).attr("z-index", 30).on("click", () => {
          Tt(_t, j, ot);
        }).on("mouseover", function(d) {
          const v = ht(this).datum();
          v && (ht(this).style("stroke", "black"), ht(".label").selectAll(".variantLabel,.variantLabelBackground").filter((b) => b && b.variant === v.variant).style("opacity", 1).style("pointer-events", "auto").raise());
        }).on("mouseout", function() {
          const d = ht(this).datum();
          (!d || d.selected !== "true") && ht(this).style("stroke", null), ht(".label").selectAll(".variantLabel,.variantLabelBackground").style("opacity", 0).style("pointer-events", "none");
        }).datum({
          fmin: M,
          fmax: m,
          variant: L + M,
          alleles: H
        });
      } else if (ut.toLowerCase() === "deletion") {
        const D = pt.get(`${M}-deletion`) || 0, O = Math.max(Math.ceil(C(m) - C(M)), 5), d = {
          fmin: M,
          fmax: m,
          variant: L + M,
          alleles: H,
          selected: !1
        };
        (mt[D] || Et).append("rect").attr("class", "variant-deletion").attr("id", `variant-${M}`).attr("x", C(M)).attr("y", 0).attr("width", O).attr("height", F).attr("fill", l).attr("stroke-width", 2).style("cursor", "pointer").on("click", () => {
          Tt(_t, j, ot);
        }).on("mouseover", function(b) {
          const X = ht(this).datum();
          X && (ht(this).style("stroke", "black"), ht(".label").selectAll(".variantLabel,.variantLabelBackground").filter((Z) => Z && Z.variant === X.variant).style("opacity", 1).style("pointer-events", "auto").raise());
        }).on("mouseout", function() {
          const b = ht(this).datum();
          (!b || b.selected !== "true") && ht(this).style("stroke", null), ht(".label").selectAll(".variantLabel,.variantLabelBackground").style("opacity", 0).style("pointer-events", "none");
        }).datum(d);
      } else
        I = !1;
      if (I) {
        const D = ut.toLowerCase() === "deletion", O = C(D ? m : M), d = q ? 15 : 10;
        let v = O + d;
        const b = ut.toLowerCase();
        let X = 0;
        b === "deletion" ? X = pt.get(`${M}-deletion`) || 0 : b === "snv" || b === "point_mutation" ? X = pt.get(`${M}-snv`) || 0 : b === "insertion" ? X = pt.get(`${M}-insertion`) || 0 : (b === "delins" || b === "substitution" || b === "indel" || b === "mnv") && (X = pt.get(`${M}-delins`) || 0);
        const Z = (F + w) * X + at, W = tt.append("text").attr("class", "variantLabel").attr("fill", "black").attr("opacity", 0).attr("height", B).attr("transform", `translate(${v},${Z})`).text(L).style("pointer-events", "none").datum({ fmin: M, variant: L + M }), gt = W.node()?.getBBox().width ?? 0;
        v + gt > y - 5 && (v = (D ? C(M) : O) - gt - d, W.attr("transform", `translate(${v},${Z})`));
      }
    });
    const G = rt;
    tt.attr("transform", `translate(0,${G})`), tt.raise();
    const Mt = Be(this.viewer) + at, zt = a.append("g").attr("transform", `translate(0,${Mt})`).attr("class", "track");
    let $t = 0;
    const Nt = [];
    let Ut = -1, St = -1;
    const Tt = this.renderTooltipDescription, Zt = [];
    for (let K = 0; K < n.length && $t < p; K++) {
      const ct = n[K];
      let ut = ct.children;
      if (ut) {
        const m = ct.selected;
        ut = ut.sort((I, q) => {
          const y = I.name || "", L = q.name || "";
          return y.localeCompare(L);
        });
        let M = !1;
        ut.forEach((I) => {
          if (e && e.length !== 0 && !(e.includes(I.id) || e.includes(I.name)))
            return;
          if (this.geneBounds) {
            const y = I.fmin < this.geneBounds.start, L = I.fmax > this.geneBounds.end;
            if (y && L)
              return;
          }
          if (Zt.includes(I.id))
            return;
          Zt.push(I.id);
          const q = I.type;
          if (R.includes(q)) {
            let y = Wi(
              Nt,
              C(I.fmin),
              C(I.fmax)
            );
            if ($t < p) {
              let L = "", h, H = !1;
              const j = ct.name;
              Object.keys(nt).includes(j) || (Q += S, H = !0, nt[j] = "Green");
              const l = zt.append("g").attr("class", "isoform").attr(
                "transform",
                `translate(0,${$t * N + 10 + Q})`
              );
              H && (L = j, h = l.append("text").attr("class", "geneLabel").attr("fill", m ? "sandybrown" : "black").attr("height", B).attr(
                "transform",
                `translate(${C(I.fmin)},-${S})`
              ).text(L).on("click", () => {
                Tt(
                  _t,
                  Ot(ct),
                  ot
                );
              }).datum({
                fmin: I.fmin
              })), l.append("polygon").datum(() => ({
                fmin: I.fmin,
                fmax: I.fmax,
                strand: ct.strand
              })).attr("class", "transArrow").attr("points", et).attr(
                "transform",
                (b) => ct.strand > 0 ? `translate(${Number(C(b.fmax))},0)` : `translate(${Number(C(b.fmin))},${V}) rotate(180)`
              ).on("click", () => {
                Tt(
                  _t,
                  Ot(I),
                  ot
                );
              });
              const D = C(I.fmin), O = C(I.fmax) - C(I.fmin);
              l.append("rect").attr("class", "transcriptBackbone").attr("y", 10 + B).attr("height", U).attr("transform", `translate(${D},0)`).attr("width", O).on("click", () => {
                Tt(
                  _t,
                  Ot(I),
                  ot
                );
              }).datum({
                fmin: I.fmin,
                fmax: I.fmax
              }), L = I.name || "", h = l.append("text").attr("class", "transcriptLabel").attr("fill", m ? "sandybrown" : "gray").attr("opacity", m ? 1 : 0.5).attr("height", B).attr("transform", `translate(${C(I.fmin)},0)`).text(L).on("click", () => {
                Tt(
                  _t,
                  Ot(I),
                  ot
                );
              }).datum({
                fmin: I.fmin
              });
              let d = L.length * 2;
              try {
                d = h.node()?.getBBox().width ?? 0;
              } catch {
              }
              Number(d + C(I.fmin)) > s;
              const v = d > C(I.fmax) - C(I.fmin) ? C(I.fmin) + d : C(I.fmax);
              if (Nt[y]) {
                const b = Nt[y];
                b.push(`${C(I.fmin)}:${v}`), Nt[y] = b;
              } else
                Nt[y] = [
                  `${C(I.fmin)}:${v}`
                ];
              (Ut < 0 || Ut > I.fmin) && (Ut = I.fmin), (St < 0 || St < I.fmax) && (St = I.fmax), I.children && (I.children = I.children.sort((b, X) => {
                const Z = it[b.type], W = it[X.type];
                if (typeof Z == "number" && typeof W == "number")
                  return Z - W;
                if (typeof Z == "number" && typeof W != "number")
                  return -1;
                if (typeof Z != "number" && typeof W == "number")
                  return 1;
                const gt = b.type || "", qt = X.type || "";
                return gt.localeCompare(qt);
              }), I.children.forEach((b) => {
                const X = b.type;
                z.includes(X) ? l.append("rect").attr("class", "exon").attr("x", C(b.fmin)).attr(
                  "transform",
                  `translate(0,${x - U})`
                ).attr("height", x).attr("z-index", 10).attr("width", C(b.fmax) - C(b.fmin)).on("click", () => {
                  Tt(
                    _t,
                    Ot(I),
                    ot
                  );
                }).datum({ fmin: b.fmin, fmax: b.fmax }) : T.includes(X) ? l.append("rect").attr("class", "CDS").attr("x", C(b.fmin)).attr(
                  "transform",
                  `translate(0,${A - U})`
                ).attr("z-index", 20).attr("height", A).attr("width", C(b.fmax) - C(b.fmin)).on("click", () => {
                  Tt(
                    _t,
                    Ot(I),
                    ot
                  );
                }).datum({ fmin: b.fmin, fmax: b.fmax }) : g.includes(X) && l.append("rect").attr("class", "UTR").attr("x", C(b.fmin)).attr(
                  "transform",
                  `translate(0,${P - U})`
                ).attr("z-index", 20).attr("height", P).attr("width", C(b.fmax) - C(b.fmin)).on("click", () => {
                  Tt(
                    _t,
                    Ot(I),
                    ot
                  );
                }).datum({ fmin: b.fmin, fmax: b.fmax });
              })), $t += 1;
            }
            if ($t === p && !M) {
              const L = Es(u, _, E, k);
              ++y, M = !0, zt.append("a").attr("class", "transcriptLabel").attr("xlink:show", "new").append("text").attr("x", 10).attr("y", 10).attr(
                "transform",
                `translate(0,${$t * N + 20 + Q})`
              ).attr("fill", "red").attr("opacity", 1).attr("height", B).html(L);
            }
          }
        });
      }
    }
    i && Xi(i, a), $t === 0 && zt.append("text").attr("x", 30).attr("y", B + 10).attr("fill", "orange").attr("opacity", 0.6).text(
      "Overview of non-coding genome features unavailable at this time."
    );
    const ft = f * (F + w) + at;
    return $t * N + Q + ft;
  }
  filterVariantData(e, n) {
    return !n || n.length === 0 ? e : !e || !Array.isArray(e) ? [] : e.filter((i) => {
      let r = !1;
      return (n.includes(i.name) || i.allele_symbols?.values && n.includes(
        i.allele_symbols.values[0].replace(/"/g, "")
      ) || i.symbol?.values && n.includes(i.symbol.values[0].replace(/"/g, "")) || i.symbol_text?.values && n.includes(i.symbol_text.values[0].replace(/"/g, ""))) && (r = !0), (i.allele_ids?.values[0]?.replace(/"|\[|\]| /g, "").split(",") ?? []).forEach((s) => {
        n.includes(s) && (r = !0);
      }), r;
    });
  }
  renderTooltipDescription(e, n, i) {
    e.transition().duration(200).style("width", "auto").style("max-width", "700px").style("height", "auto").style("overflow-wrap", "break-word").style("word-break", "break-all").style("opacity", 1).style("visibility", "visible"), e.html(n).style("left", `${window.event.pageX + 10}px`).style("top", `${window.event.pageY + 10}px`).append("button").attr("type", "button").text("Close").on("click", () => {
      i();
    }), e.append("button").attr("type", "button").html("&times;").attr("class", "tooltipDivX").on("click", () => {
      i();
    });
  }
  setInitialHighlight(e, n) {
    const i = n.node()?.getBBox().height ?? 0;
    n.selectAll(
      ".variant-deletion,.variant-SNV,.variant-insertion,.variant-delins"
    ).filter((a) => {
      let s = !1;
      return a.alleles && (a.alleles[0].replace(/"|\[|\]| /g, "").split(",").forEach((c) => {
        e.includes(c) && (s = !0);
      }), a.alleles.forEach((c) => {
        e.includes(c) && (s = !0);
      })), s;
    }).datum((a) => (a.selected = "true", a)).style("stroke", "black").each(function() {
      const a = +(ht(this).attr("width") || 3), s = +ht(this).attr("x") - a / 2;
      n.select(".deletions.track").append("rect").attr("class", "highlight").attr("x", s).attr("width", a).attr("height", i).attr("fill", "yellow").attr("opacity", 0.8).lower();
    });
  }
}
class zu {
  constructor({
    viewer: e,
    height: n,
    width: i,
    transcriptTypes: r,
    variantTypes: a,
    showVariantLabel: s,
    variantFilter: o,
    initialHighlight: c,
    trackData: f,
    variantData: u
  }) {
    this.trackData = f ?? [], this.variantData = u ?? [], this.viewer = e, this.width = i, this.variantFilter = o, this.initialHighlight = c, this.height = n, this.transcriptTypes = r, this.variantTypes = a, this.showVariantLabel = s ?? !0;
  }
  DrawTrack() {
    const e = this.variantData;
    let i = this.trackData;
    const r = this.filterVariantData(
      e,
      this.variantFilter
    ), a = vs(
      r,
      1
      // Colin NOTE: made up value
    ), s = /* @__PURE__ */ new Map();
    a.forEach((Y) => {
      const vt = xs(Y);
      s.set(Y, vt);
    });
    const o = this.viewer, c = this.width, f = this.showVariantLabel, u = ["UTR", "five_prime_UTR", "three_prime_UTR"], _ = ["CDS"], p = ["exon"], g = this.transcriptTypes, T = ps(i, g), z = T.fmin, R = T.fmax, $ = 10, E = 10, k = 10, x = 40, A = 20, N = 2, S = 0, B = 10, P = 10, F = 20, w = 4, U = 20, V = 10, J = `0,0 0,${U} ${V},${V}`, et = 10, at = 10, C = (Y) => `${Y - at / 2},${et} ${Y},0 ${Y + at / 2},${et}`, tt = (Y) => `${Y - at / 2},${et} ${Y + at / 2},${et} ${Y - at / 2},0 ${Y + at / 2},0`, it = (Y) => `${Y},${et} ${Y + at / 2},${et / 2} ${Y},0 ${Y - at / 2},${et / 2}`, nt = ue().domain([z, R]).range([0, c]), Q = Be(this.viewer), _t = o.append("g").attr("transform", `translate(0,${Q})`).attr("class", "track"), ot = {};
    for (const Y of u)
      ot[Y] = 200;
    for (const Y of _)
      ot[Y] = 1e3;
    for (const Y of p)
      ot[Y] = 100;
    const xt = {};
    i = i.sort((Y, vt) => Y.selected && !vt.selected ? -1 : !Y.selected && vt.selected ? 1 : Y.name - vt.name);
    let yt = 0;
    const rt = ht("body").append("div").attr("class", "gfc-tooltip").style("visibility", "visible").style("opacity", 0), dt = () => {
      rt.transition().duration(100).style("opacity", 10).style("visibility", "hidden");
    };
    let st = 0;
    const kt = [];
    let Dt = -1, Et = -1;
    const lt = this.renderTooltipDescription;
    for (let Y = 0; Y < i.length && st < $; Y++) {
      const vt = i[Y];
      let pt = vt.children;
      if (pt) {
        const mt = vt.selected;
        pt = pt.sort((G, Mt) => G.name < Mt.name ? -1 : G.name > Mt.name ? 1 : G - Mt);
        let bt = !1;
        pt.forEach((G) => {
          const Mt = G.type;
          if (g.includes(Mt)) {
            let zt = Wi(
              kt,
              nt(G.fmin),
              nt(G.fmax)
            );
            if (st < $) {
              let $t, Nt, Ut = !1;
              Object.keys(xt).includes(vt.name) || (yt += A, Ut = !0, xt[vt.name] = "Green");
              const St = _t.append("g").attr("class", "isoform").attr(
                "transform",
                `translate(0,${st * x + 10 + yt})`
              );
              Ut && ($t = vt.name, Nt = St.append("text").attr("class", "geneLabel").attr("fill", mt ? "sandybrown" : "black").attr("height", S).attr(
                "transform",
                `translate(${nt(G.fmin)},-${A})`
              ).text($t).on("click", () => {
                lt(
                  rt,
                  Ot(vt),
                  dt
                );
              }).datum({ fmin: G.fmin })), St.append("polygon").datum(() => ({
                fmin: G.fmin,
                fmax: G.fmax,
                strand: vt.strand
              })).attr("class", "transArrow").attr("points", J).attr("transform", (ft) => vt.strand > 0 ? `translate(${Number(nt(ft.fmax))},0)` : `translate(${Number(nt(ft.fmin))},${U}) rotate(180)`).on("click", () => {
                lt(
                  rt,
                  Ot(G),
                  dt
                );
              }), St.append("rect").attr("class", "transcriptBackbone").attr("y", 10 + S).attr("height", w).attr("transform", `translate(${nt(G.fmin)},0)`).attr("width", nt(G.fmax) - nt(G.fmin)).on("click", () => {
                lt(
                  rt,
                  Ot(G),
                  dt
                );
              }).datum({ fmin: G.fmin, fmax: G.fmax }), $t = G.name, Nt = St.append("text").attr("class", "transcriptLabel").attr("fill", mt ? "sandybrown" : "gray").attr("opacity", mt ? 1 : 0.5).attr("height", S).attr("transform", `translate(${nt(G.fmin)},0)`).text($t).on("click", () => {
                lt(
                  rt,
                  Ot(G),
                  dt
                );
              }).datum({ fmin: G.fmin });
              let Tt = $t.length * 2;
              try {
                Tt = Nt.node().getBBox().width;
              } catch {
              }
              Number(Tt + nt(G.fmin)) > c;
              const Zt = Tt > nt(G.fmax) - nt(G.fmin) ? nt(G.fmin) + Tt : nt(G.fmax);
              if (kt[zt]) {
                const ft = kt[zt];
                ft.push(`${nt(G.fmin)}:${Zt}`), kt[zt] = ft;
              } else
                kt[zt] = [
                  `${nt(G.fmin)}:${Zt}`
                ];
              (Dt < 0 || Dt > G.fmin) && (Dt = G.fmin), (Et < 0 || Et < G.fmax) && (Et = G.fmax), G.children && (G.children = G.children.sort((ft, K) => {
                const ct = ot[ft.type], ut = ot[K.type];
                return typeof ct == "number" && typeof ut == "number" ? ct - ut : typeof ct == "number" && typeof ut != "number" ? -1 : typeof ct != "number" && typeof ut == "number" ? 1 : ft.type - K.type;
              }), G.children.forEach((ft) => {
                const K = ft.type;
                let ct = !1;
                p.includes(K) ? (ct = !0, St.append("rect").attr("class", "exon").attr("x", nt(ft.fmin)).attr(
                  "transform",
                  `translate(0,${E - w})`
                ).attr("height", E).attr("z-index", 10).attr("width", nt(ft.fmax) - nt(ft.fmin)).on("click", () => {
                  lt(
                    rt,
                    Ot(G),
                    dt
                  );
                }).datum({ fmin: ft.fmin, fmax: ft.fmax })) : _.includes(K) ? (ct = !0, St.append("rect").attr("class", "CDS").attr("x", nt(ft.fmin)).attr(
                  "transform",
                  `translate(0,${k - w})`
                ).attr("z-index", 20).attr("height", k).attr("width", nt(ft.fmax) - nt(ft.fmin)).on("click", () => {
                  lt(
                    rt,
                    Ot(G),
                    dt
                  );
                }).datum({ fmin: ft.fmin, fmax: ft.fmax })) : u.includes(K) && (ct = !0, St.append("rect").attr("class", "UTR").attr("x", nt(ft.fmin)).attr(
                  "transform",
                  `translate(0,${B - w})`
                ).attr("z-index", 20).attr("height", B).attr("width", nt(ft.fmax) - nt(ft.fmin)).on("click", () => {
                  lt(
                    rt,
                    Ot(G),
                    dt
                  );
                }).datum({ fmin: ft.fmin, fmax: ft.fmax })), ct && a.forEach((ut) => {
                  const { type: m, fmax: M, fmin: I } = ut;
                  if (I < ft.fmin && M > ft.fmin || M > ft.fmax && I < ft.fmax || M <= ft.fmax && I >= ft.fmin) {
                    let y = !0;
                    const L = ys(ut), h = bs(L)[0], H = ws(L), j = Math.max(
                      Math.ceil(nt(M) - nt(I)),
                      N
                    );
                    if (m.toLowerCase() === "deletion" || m.toLowerCase() === "mnv" ? St.append("rect").attr("class", "variant-deletion").attr("x", nt(I)).attr(
                      "transform",
                      `translate(0,${F - w})`
                    ).attr("z-index", 30).attr("fill", h).attr("height", P).attr("width", j).on("click", () => {
                      lt(
                        rt,
                        H,
                        dt
                      );
                    }).datum({
                      fmin: I,
                      fmax: M,
                      alleles: s.get(ut) ?? []
                    }) : m.toLowerCase() === "snv" || m.toLowerCase() === "point_mutation" ? St.append("polygon").attr("class", "variant-SNV").attr("points", it(nt(I))).attr("fill", h).attr("x", nt(I)).attr(
                      "transform",
                      `translate(0,${F - w})`
                    ).attr("z-index", 30).on("click", () => {
                      lt(
                        rt,
                        H,
                        dt
                      );
                    }).datum({
                      fmin: I,
                      fmax: M,
                      alleles: s.get(ut) ?? []
                    }) : m.toLowerCase() === "insertion" ? St.append("polygon").attr("class", "variant-insertion").attr("points", C(nt(I))).attr("fill", h).attr("x", nt(I)).attr(
                      "transform",
                      `translate(0,${F - w})`
                    ).attr("z-index", 30).on("click", () => {
                      lt(
                        rt,
                        H,
                        dt
                      );
                    }).datum({
                      fmin: I,
                      fmax: M,
                      alleles: s.get(ut) ?? []
                    }) : m.toLowerCase() === "delins" || m.toLowerCase() === "substitution" || m.toLowerCase() === "indel" ? St.append("polygon").attr("class", "variant-delins").attr("points", tt(nt(I))).attr("x", nt(I)).attr(
                      "transform",
                      `translate(0,${F - w})`
                    ).attr("fill", h).attr("z-index", 30).on("click", () => {
                      lt(
                        rt,
                        H,
                        dt
                      );
                    }).datum({
                      fmin: I,
                      fmax: M,
                      alleles: s.get(ut) ?? []
                    }) : y = !1, y && f) {
                      const l = Un(ut), D = l.length || 1;
                      St.append("text").attr("class", "variantLabel").attr("fill", "black").attr("opacity", mt ? 1 : 0.5).attr("height", S).attr(
                        "transform",
                        `translate(${nt(I - D / 2 * 100)},${F * 2.2 - w})`
                      ).html(l).on("click", () => {
                        lt(
                          rt,
                          H,
                          dt
                        );
                      }).datum({ fmin: G.fmin });
                    }
                  }
                });
              })), st += 1;
            }
            st === $ && !bt && (++zt, bt = !0, _t.append("a").attr("class", "transcriptLabel").attr("xlink:show", "new").append("text").attr("x", 10).attr("y", 10).attr(
              "transform",
              `translate(0,${st * x + 20 + yt})`
            ).attr("fill", "red").attr("opacity", 1).attr("height", S).text("Maximum features displayed.  See full view for more."));
          }
        });
      }
    }
    if (st === 0 && _t.append("text").attr("x", 30).attr("y", S + 10).attr("fill", "orange").attr("opacity", 0.6).text(
      "Overview of non-coding genome features unavailable at this time."
    ), this.initialHighlight)
      try {
        Xi(this.initialHighlight, this.viewer);
      } catch {
      }
    return st * x + yt;
  }
  filterVariantData(e, n) {
    if (!n || n.length === 0)
      return e;
    const i = new Set(n);
    return e.filter((a) => {
      let s = !1;
      try {
        if (i.has(a.name) && (s = !0), a.allele_symbols?.values) {
          const c = a.allele_symbols.values[0].replace(
            /"|\\[|\\]| /g,
            ""
          );
          i.has(c) && (s = !0);
        }
        if (a.symbol?.values) {
          const c = a.symbol.values[0].replace(/"|\\[|\\]| /g, "");
          i.has(c) && (s = !0);
        }
        if (a.symbol_text?.values) {
          const c = a.symbol_text.values[0].replace(
            /"|\\[|\\]| /g,
            ""
          );
          i.has(c) && (s = !0);
        }
        const o = a.allele_ids?.values?.[0];
        if (o) {
          let c = [];
          if (o.startsWith("[") && o.endsWith("]"))
            try {
              const f = JSON.parse(o);
              c = (Array.isArray(f) ? f : [f]).map(String);
            } catch {
              c = o.replace(/"|\\[|\\]| /g, "").split(",");
            }
          else
            c = o.replace(/"|\\[|\\]| /g, "").split(",");
          for (const f of c)
            if (i.has(f)) {
              s = !0;
              break;
            }
        }
      } catch {
        s = !0;
      }
      return s;
    });
  }
  renderTooltipDescription(e, n, i) {
    e.transition().duration(200).style("width", "auto").style("height", "auto").style("opacity", 1).style("visibility", "visible"), e.html(n).style("left", `${window.event.pageX + 10}px`).style("top", `${window.event.pageY + 10}px`).append("button").attr("type", "button").text("Close").on("click", () => {
      i();
    }), e.append("button").attr("type", "button").html("&times;").attr("class", "tooltipDivX").on("click", () => {
      i();
    });
  }
}
class Bu {
  constructor({
    viewer: e,
    height: n,
    width: i,
    transcriptTypes: r,
    htpVariant: a,
    trackData: s,
    region: o,
    genome: c,
    geneBounds: f,
    geneSymbol: u,
    geneId: _
  }) {
    this.trackData = s ?? [], this.viewer = e, this.width = i, this.height = n, this.transcriptTypes = r, this.htpVariant = a, this.region = o, this.genome = c, this.geneBounds = f, this.geneSymbol = u, this.geneId = _;
  }
  renderTooltipDescription(e, n, i) {
    e.transition().duration(200).style("width", "auto").style("height", "auto").style("opacity", 1).style("visibility", "visible"), e.html(n).style("left", `${window.event.pageX + 10}px`).style("top", `${window.event.pageY + 10}px`).append("button").attr("type", "button").text("Close").on("click", () => {
      i();
    }), e.append("button").attr("type", "button").html("&times;").attr("class", "tooltipDivX").on("click", () => {
      i();
    });
  }
  DrawTrack() {
    let e = ds(
      this.trackData,
      this.geneSymbol,
      this.geneId
    );
    const n = this.htpVariant, i = this.viewer, r = this.width, a = this.genome, s = e[0]?.seqId, o = 100, c = ["UTR", "five_prime_UTR", "three_prime_UTR"], f = ["CDS"], u = ["exon"], _ = this.transcriptTypes, p = 10, g = 10, T = 40, z = 0, R = 10, $ = 4, E = 20, k = 10, x = `0,0 0,${E} ${k},${k}`, A = this.renderTooltipDescription, N = ue().domain([this.region.start, this.region.end]).range([0, r]), S = {};
    for (let C = 0, tt = c.length; C < tt; C++)
      S[c[C]] = 200;
    for (let C = 0, tt = f.length; C < tt; C++)
      S[f[C]] = 1e3;
    for (let C = 0, tt = u.length; C < tt; C++)
      S[u[C]] = 100;
    e = e.sort((C, tt) => C.selected && !tt.selected ? -1 : !C.selected && tt.selected ? 1 : C.name - tt.name);
    const B = ht("body").append("div").attr("class", "gfc-tooltip").style("visibility", "visible").style("opacity", 0), P = () => {
      B.transition().duration(100).style("opacity", 10).style("visibility", "hidden");
    };
    if (n) {
      const C = i.append("g").attr("class", "variants track").attr("transform", "translate(0,22.5)"), [, tt] = n.split(":");
      C.append("polygon").attr("class", "variant-SNV").attr("points", Ki(N(+tt))).attr("fill", "red").attr("x", N(+tt)).attr("z-index", 30);
    }
    const F = Be(this.viewer), w = i.append("g").attr("transform", `translate(0,${F})`).attr("class", "track");
    let U = 0;
    const V = [];
    let J = -1, et = -1;
    const at = [];
    for (let C = 0; C < e.length && U < o; C++) {
      const tt = e[C];
      let it = tt.children;
      if (it) {
        const nt = tt.selected;
        it = it.sort((Q, _t) => Q.name < _t.name ? -1 : Q.name > _t.name ? 1 : 0), it.forEach((Q) => {
          const _t = Q.type;
          if (!at.includes(Q.id) && (at.push(Q.id), _.includes(_t))) {
            if (this.geneBounds) {
              const xt = Q.fmin < this.geneBounds.start, yt = Q.fmax > this.geneBounds.end;
              if (xt && yt)
                return;
            }
            let ot = Wi(
              V,
              N(Q.fmin),
              N(Q.fmax)
            );
            if (U < o) {
              const xt = w.append("g").attr("class", "isoform").attr(
                "transform",
                `translate(0,${U * T + 10})`
              ), yt = Math.max(N(Q.fmin), 0), rt = Math.min(N(Q.fmax), this.width);
              xt.append("polygon").datum(() => ({
                strand: tt.strand
              })).attr("class", "transArrow").attr("points", x).attr(
                "transform",
                () => tt.strand > 0 ? `translate(${rt},0)` : `translate(${yt},${E}) rotate(180)`
              ).on("click", () => {
                A(
                  B,
                  Ot(Q),
                  P
                );
              }), xt.append("rect").attr("class", "transcriptBackbone").attr("y", 10 + z).attr("height", $).attr("transform", `translate(${yt},0)`).attr("width", Math.max(0, rt - yt)).datum({
                fmin: Q.fmin,
                fmax: Q.fmax
              }).on("click", () => {
                A(
                  B,
                  Ot(Q),
                  P
                );
              });
              let dt = Q.name;
              tt.name !== Q.name && (dt += ` (${tt.name})`);
              let st = Math.max(N(Q.fmin), 0);
              const kt = xt.append("svg:text").attr("class", "transcriptLabel").attr("fill", nt ? "sandybrown" : "gray").attr("opacity", nt ? 1 : 0.5).attr("height", z).attr("transform", `translate(${st},0)`).text(dt).datum({
                fmin: Q.fmin
              }).on("click", () => {
                A(
                  B,
                  Ot(Q),
                  P
                );
              });
              let Dt = 100;
              try {
                Dt = kt.node()?.getBBox().width ?? 0;
              } catch {
              }
              if (Dt + st > this.width) {
                const Y = Dt + st - this.width;
                st -= Y, kt.attr("transform", `translate(${st},0)`);
              }
              let Et = dt.length * 2;
              try {
                Et = kt.node()?.getBBox().width ?? 0;
              } catch {
              }
              Number(Et + N(Q.fmin)) > r;
              const lt = Et > N(Q.fmax) - N(Q.fmin) ? N(Q.fmin) + Et : N(Q.fmax);
              if (V[ot]) {
                const Y = V[ot];
                Y.push(`${N(Q.fmin)}:${lt}`), V[ot] = Y;
              } else
                V[ot] = [`${N(Q.fmin)}:${lt}`];
              (J < 0 || J > Q.fmin) && (J = Q.fmin), (et < 0 || et < Q.fmax) && (et = Q.fmax), Q.children && (Q.children = Q.children.sort(
                function(Y, vt) {
                  const pt = S[Y.type], mt = S[vt.type];
                  if (typeof pt == "number" && typeof mt == "number")
                    return pt - mt;
                  if (typeof pt == "number" && typeof mt != "number")
                    return -1;
                  if (typeof pt != "number" && typeof mt == "number")
                    return 1;
                  const bt = Y.type || "", G = vt.type || "";
                  return bt.localeCompare(G);
                }
              ), Q.children.forEach((Y) => {
                const vt = Y.type;
                if (N(Y.fmin) > this.width || N(Y.fmax) < 0)
                  return;
                const pt = Math.max(N(Y.fmin), 0), mt = Math.min(N(Y.fmax), this.width);
                u.includes(vt) ? xt.append("rect").attr("class", "exon").attr("x", pt).attr(
                  "transform",
                  `translate(0,${p - $})`
                ).attr("height", p).attr("z-index", 10).attr("width", Math.max(0, mt - pt)).datum({
                  fmin: Y.fmin,
                  fmax: Y.fmax
                }).on("click", () => {
                  A(
                    B,
                    Ot(Q),
                    P
                  );
                }) : f.includes(vt) ? xt.append("rect").attr("class", "CDS").attr("x", pt).attr(
                  "transform",
                  `translate(0,${g - $})`
                ).attr("z-index", 20).attr("height", g).attr("width", Math.max(0, mt - pt)).datum({
                  fmin: Y.fmin,
                  fmax: Y.fmax
                }).on("click", () => {
                  A(
                    B,
                    Ot(Q),
                    P
                  );
                }) : c.includes(vt) && xt.append("rect").attr("class", "UTR").attr("x", pt).attr(
                  "transform",
                  `translate(0,${R - $})`
                ).attr("z-index", 20).attr("height", R).attr("width", Math.max(0, mt - pt)).datum({
                  fmin: Y.fmin,
                  fmax: Y.fmax
                }).on("click", () => {
                  A(
                    B,
                    Ot(Q),
                    P
                  );
                });
              })), U += 1;
            }
            if (U === o) {
              const xt = Es(
                a,
                s,
                this.region.start,
                this.region.end
              );
              ++ot, w.append("a").attr("class", "transcriptLabel").attr("xlink:show", "new").append("text").attr("x", 10).attr(
                "transform",
                `translate(0,${U * T + 10})`
              ).attr("fill", "red").attr("opacity", 1).attr("height", z).html(xt);
            }
          }
        });
      }
    }
    return U === 0 && w.append("text").attr("x", 30).attr("y", z + 10).attr("fill", "orange").attr("opacity", 0.6).text(
      "Overview of non-coding genome features unavailable at this time."
    ), U * T;
  }
}
class Pu {
  constructor({ viewer: e, track: n, height: i, width: r }) {
    this.refSeq = "", this.viewer = e, this.width = r, this.height = i, this.track = n;
  }
  DrawScrollableTrack() {
    const e = this.viewer, n = this.refSeq, i = ue().domain([this.track.start, this.track.end + 1]).range(this.track.range), r = Do(i).tickValues(this._getRefTick(this.track.start + 1, this.track.end)).tickFormat((c, f) => n[f]).tickSize(8).tickSizeInner(8).tickPadding(6), a = Math.floor(n.length / 10), s = sr(i).ticks(a).tickValues(this._getRefTick(this.track.start + 1, this.track.end, 10));
    e.append("g").attr("class", "axis x-local-axis track").attr("width", this.track.range[1]).attr("transform", "translate(0, 20)").call(r), e.append("g").attr("class", "axis x-local-numerical track").attr("width", this.track.range[1]).attr("transform", "translate(0, 20)").call(s);
    const o = yi(".x-local-numerical .tick text");
    o.first().attr("text-anchor", "start"), o.last().attr("text-anchor", "end"), yi(".x-local-axis .tick text").each(function() {
      const f = ht(this).text();
      let u = "nucleotide nt-a";
      f === "T" ? u = "nucleotide nt-t" : f === "C" ? u = "nucleotide nt-c" : f === "G" && (u = "nucleotide nt-g"), ht(this.parentNode).append("rect").attr("class", u).attr("transform", "translate(-8,8)");
    });
  }
  DrawOverviewTrack() {
    const e = this.viewer, n = this.track.start, i = this.track.end, r = this.width, a = ue().domain([n, i]).range(this.track.range), s = sr(a).ticks(8, "s").tickSize(8);
    e.append("g").attr("class", "axis track").attr("width", r).attr("height", 20).attr("transform", "translate(0,20)").call(s);
  }
  _getRefTick(e, n, i) {
    return i ? new Array(Math.ceil((n - e + 1) / 10)).fill(0).map((r, a) => e + a * 10) : new Array(n - e + 1).fill(0).map((r, a) => e + a);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getTrackData() {
  }
}
const Ve = {
  ISOFORM_EMBEDDED_VARIANT: "ISOFORM_EMBEDDED_VARIANT",
  ISOFORM_AND_VARIANT: "ISOFORM_AND_VARIANT",
  ISOFORM: "ISOFORM",
  VARIANT: "VARIANT",
  VARIANT_GLOBAL: "VARIANT_GLOBAL"
};
var Kt = "$";
function On() {
}
On.prototype = Yi.prototype = {
  constructor: On,
  has: function(t) {
    return Kt + t in this;
  },
  get: function(t) {
    return this[Kt + t];
  },
  set: function(t, e) {
    return this[Kt + t] = e, this;
  },
  remove: function(t) {
    var e = Kt + t;
    return e in this && delete this[e];
  },
  clear: function() {
    for (var t in this) t[0] === Kt && delete this[t];
  },
  keys: function() {
    var t = [];
    for (var e in this) e[0] === Kt && t.push(e.slice(1));
    return t;
  },
  values: function() {
    var t = [];
    for (var e in this) e[0] === Kt && t.push(this[e]);
    return t;
  },
  entries: function() {
    var t = [];
    for (var e in this) e[0] === Kt && t.push({ key: e.slice(1), value: this[e] });
    return t;
  },
  size: function() {
    var t = 0;
    for (var e in this) e[0] === Kt && ++t;
    return t;
  },
  empty: function() {
    for (var t in this) if (t[0] === Kt) return !1;
    return !0;
  },
  each: function(t) {
    for (var e in this) e[0] === Kt && t(this[e], e.slice(1), this);
  }
};
function Yi(t, e) {
  var n = new On();
  if (t instanceof On) t.each(function(o, c) {
    n.set(c, o);
  });
  else if (Array.isArray(t)) {
    var i = -1, r = t.length, a;
    if (e == null) for (; ++i < r; ) n.set(i, t[i]);
    else for (; ++i < r; ) n.set(e(a = t[i], i, t), a);
  } else if (t) for (var s in t) n.set(s, t[s]);
  return n;
}
function Nr() {
}
var pe = Yi.prototype;
Nr.prototype = {
  constructor: Nr,
  has: pe.has,
  add: function(t) {
    return t += "", this[Kt + t] = t, this;
  },
  remove: pe.remove,
  clear: pe.clear,
  values: pe.keys,
  size: pe.size,
  empty: pe.empty,
  each: pe.each
};
var Di = "http://www.w3.org/1999/xhtml";
const Ir = {
  svg: "http://www.w3.org/2000/svg",
  xhtml: Di,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function Ss(t) {
  var e = t += "", n = e.indexOf(":");
  return n >= 0 && (e = t.slice(0, n)) !== "xmlns" && (t = t.slice(n + 1)), Ir.hasOwnProperty(e) ? { space: Ir[e], local: t } : t;
}
function Hu(t) {
  return function() {
    var e = this.ownerDocument, n = this.namespaceURI;
    return n === Di && e.documentElement.namespaceURI === Di ? e.createElement(t) : e.createElementNS(n, t);
  };
}
function Vu(t) {
  return function() {
    return this.ownerDocument.createElementNS(t.space, t.local);
  };
}
function As(t) {
  var e = Ss(t);
  return (e.local ? Vu : Hu)(e);
}
function Uu() {
}
function $s(t) {
  return t == null ? Uu : function() {
    return this.querySelector(t);
  };
}
function Gu(t) {
  typeof t != "function" && (t = $s(t));
  for (var e = this._groups, n = e.length, i = new Array(n), r = 0; r < n; ++r)
    for (var a = e[r], s = a.length, o = i[r] = new Array(s), c, f, u = 0; u < s; ++u)
      (c = a[u]) && (f = t.call(c, c.__data__, u, a)) && ("__data__" in c && (f.__data__ = c.__data__), o[u] = f);
  return new Gt(i, this._parents);
}
function Zu() {
  return [];
}
function qu(t) {
  return t == null ? Zu : function() {
    return this.querySelectorAll(t);
  };
}
function Wu(t) {
  typeof t != "function" && (t = qu(t));
  for (var e = this._groups, n = e.length, i = [], r = [], a = 0; a < n; ++a)
    for (var s = e[a], o = s.length, c, f = 0; f < o; ++f)
      (c = s[f]) && (i.push(t.call(c, c.__data__, f, s)), r.push(c));
  return new Gt(i, r);
}
function Xu(t) {
  return function() {
    return this.matches(t);
  };
}
function Ku(t) {
  typeof t != "function" && (t = Xu(t));
  for (var e = this._groups, n = e.length, i = new Array(n), r = 0; r < n; ++r)
    for (var a = e[r], s = a.length, o = i[r] = [], c, f = 0; f < s; ++f)
      (c = a[f]) && t.call(c, c.__data__, f, a) && o.push(c);
  return new Gt(i, this._parents);
}
function Ns(t) {
  return new Array(t.length);
}
function Yu() {
  return new Gt(this._enter || this._groups.map(Ns), this._parents);
}
function Cn(t, e) {
  this.ownerDocument = t.ownerDocument, this.namespaceURI = t.namespaceURI, this._next = null, this._parent = t, this.__data__ = e;
}
Cn.prototype = {
  constructor: Cn,
  appendChild: function(t) {
    return this._parent.insertBefore(t, this._next);
  },
  insertBefore: function(t, e) {
    return this._parent.insertBefore(t, e);
  },
  querySelector: function(t) {
    return this._parent.querySelector(t);
  },
  querySelectorAll: function(t) {
    return this._parent.querySelectorAll(t);
  }
};
function Ju(t) {
  return function() {
    return t;
  };
}
var Dr = "$";
function Qu(t, e, n, i, r, a) {
  for (var s = 0, o, c = e.length, f = a.length; s < f; ++s)
    (o = e[s]) ? (o.__data__ = a[s], i[s] = o) : n[s] = new Cn(t, a[s]);
  for (; s < c; ++s)
    (o = e[s]) && (r[s] = o);
}
function ju(t, e, n, i, r, a, s) {
  var o, c, f = {}, u = e.length, _ = a.length, p = new Array(u), g;
  for (o = 0; o < u; ++o)
    (c = e[o]) && (p[o] = g = Dr + s.call(c, c.__data__, o, e), g in f ? r[o] = c : f[g] = c);
  for (o = 0; o < _; ++o)
    g = Dr + s.call(t, a[o], o, a), (c = f[g]) ? (i[o] = c, c.__data__ = a[o], f[g] = null) : n[o] = new Cn(t, a[o]);
  for (o = 0; o < u; ++o)
    (c = e[o]) && f[p[o]] === c && (r[o] = c);
}
function th(t, e) {
  if (!t)
    return g = new Array(this.size()), f = -1, this.each(function(N) {
      g[++f] = N;
    }), g;
  var n = e ? ju : Qu, i = this._parents, r = this._groups;
  typeof t != "function" && (t = Ju(t));
  for (var a = r.length, s = new Array(a), o = new Array(a), c = new Array(a), f = 0; f < a; ++f) {
    var u = i[f], _ = r[f], p = _.length, g = t.call(u, u && u.__data__, f, i), T = g.length, z = o[f] = new Array(T), R = s[f] = new Array(T), $ = c[f] = new Array(p);
    n(u, _, z, R, $, g, e);
    for (var E = 0, k = 0, x, A; E < T; ++E)
      if (x = z[E]) {
        for (E >= k && (k = E + 1); !(A = R[k]) && ++k < T; ) ;
        x._next = A || null;
      }
  }
  return s = new Gt(s, i), s._enter = o, s._exit = c, s;
}
function eh() {
  return new Gt(this._exit || this._groups.map(Ns), this._parents);
}
function nh(t, e, n) {
  var i = this.enter(), r = this, a = this.exit();
  return i = typeof t == "function" ? t(i) : i.append(t + ""), e != null && (r = e(r)), n == null ? a.remove() : n(a), i && r ? i.merge(r).order() : r;
}
function ih(t) {
  for (var e = this._groups, n = t._groups, i = e.length, r = n.length, a = Math.min(i, r), s = new Array(i), o = 0; o < a; ++o)
    for (var c = e[o], f = n[o], u = c.length, _ = s[o] = new Array(u), p, g = 0; g < u; ++g)
      (p = c[g] || f[g]) && (_[g] = p);
  for (; o < i; ++o)
    s[o] = e[o];
  return new Gt(s, this._parents);
}
function rh() {
  for (var t = this._groups, e = -1, n = t.length; ++e < n; )
    for (var i = t[e], r = i.length - 1, a = i[r], s; --r >= 0; )
      (s = i[r]) && (a && s.compareDocumentPosition(a) ^ 4 && a.parentNode.insertBefore(s, a), a = s);
  return this;
}
function ah(t) {
  t || (t = sh);
  function e(_, p) {
    return _ && p ? t(_.__data__, p.__data__) : !_ - !p;
  }
  for (var n = this._groups, i = n.length, r = new Array(i), a = 0; a < i; ++a) {
    for (var s = n[a], o = s.length, c = r[a] = new Array(o), f, u = 0; u < o; ++u)
      (f = s[u]) && (c[u] = f);
    c.sort(e);
  }
  return new Gt(r, this._parents).order();
}
function sh(t, e) {
  return t < e ? -1 : t > e ? 1 : t >= e ? 0 : NaN;
}
function oh() {
  var t = arguments[0];
  return arguments[0] = this, t.apply(null, arguments), this;
}
function lh() {
  var t = new Array(this.size()), e = -1;
  return this.each(function() {
    t[++e] = this;
  }), t;
}
function ch() {
  for (var t = this._groups, e = 0, n = t.length; e < n; ++e)
    for (var i = t[e], r = 0, a = i.length; r < a; ++r) {
      var s = i[r];
      if (s) return s;
    }
  return null;
}
function fh() {
  var t = 0;
  return this.each(function() {
    ++t;
  }), t;
}
function uh() {
  return !this.node();
}
function hh(t) {
  for (var e = this._groups, n = 0, i = e.length; n < i; ++n)
    for (var r = e[n], a = 0, s = r.length, o; a < s; ++a)
      (o = r[a]) && t.call(o, o.__data__, a, r);
  return this;
}
function dh(t) {
  return function() {
    this.removeAttribute(t);
  };
}
function ph(t) {
  return function() {
    this.removeAttributeNS(t.space, t.local);
  };
}
function _h(t, e) {
  return function() {
    this.setAttribute(t, e);
  };
}
function gh(t, e) {
  return function() {
    this.setAttributeNS(t.space, t.local, e);
  };
}
function mh(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    n == null ? this.removeAttribute(t) : this.setAttribute(t, n);
  };
}
function vh(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    n == null ? this.removeAttributeNS(t.space, t.local) : this.setAttributeNS(t.space, t.local, n);
  };
}
function wh(t, e) {
  var n = Ss(t);
  if (arguments.length < 2) {
    var i = this.node();
    return n.local ? i.getAttributeNS(n.space, n.local) : i.getAttribute(n);
  }
  return this.each((e == null ? n.local ? ph : dh : typeof e == "function" ? n.local ? vh : mh : n.local ? gh : _h)(n, e));
}
function Is(t) {
  return t.ownerDocument && t.ownerDocument.defaultView || t.document && t || t.defaultView;
}
function yh(t) {
  return function() {
    this.style.removeProperty(t);
  };
}
function xh(t, e, n) {
  return function() {
    this.style.setProperty(t, e, n);
  };
}
function bh(t, e, n) {
  return function() {
    var i = e.apply(this, arguments);
    i == null ? this.style.removeProperty(t) : this.style.setProperty(t, i, n);
  };
}
function kh(t, e, n) {
  return arguments.length > 1 ? this.each((e == null ? yh : typeof e == "function" ? bh : xh)(t, e, n ?? "")) : Th(this.node(), t);
}
function Th(t, e) {
  return t.style.getPropertyValue(e) || Is(t).getComputedStyle(t, null).getPropertyValue(e);
}
function Eh(t) {
  return function() {
    delete this[t];
  };
}
function Sh(t, e) {
  return function() {
    this[t] = e;
  };
}
function Ah(t, e) {
  return function() {
    var n = e.apply(this, arguments);
    n == null ? delete this[t] : this[t] = n;
  };
}
function $h(t, e) {
  return arguments.length > 1 ? this.each((e == null ? Eh : typeof e == "function" ? Ah : Sh)(t, e)) : this.node()[t];
}
function Ds(t) {
  return t.trim().split(/^|\s+/);
}
function Ji(t) {
  return t.classList || new Rs(t);
}
function Rs(t) {
  this._node = t, this._names = Ds(t.getAttribute("class") || "");
}
Rs.prototype = {
  add: function(t) {
    var e = this._names.indexOf(t);
    e < 0 && (this._names.push(t), this._node.setAttribute("class", this._names.join(" ")));
  },
  remove: function(t) {
    var e = this._names.indexOf(t);
    e >= 0 && (this._names.splice(e, 1), this._node.setAttribute("class", this._names.join(" ")));
  },
  contains: function(t) {
    return this._names.indexOf(t) >= 0;
  }
};
function Ms(t, e) {
  for (var n = Ji(t), i = -1, r = e.length; ++i < r; ) n.add(e[i]);
}
function Ls(t, e) {
  for (var n = Ji(t), i = -1, r = e.length; ++i < r; ) n.remove(e[i]);
}
function Nh(t) {
  return function() {
    Ms(this, t);
  };
}
function Ih(t) {
  return function() {
    Ls(this, t);
  };
}
function Dh(t, e) {
  return function() {
    (e.apply(this, arguments) ? Ms : Ls)(this, t);
  };
}
function Rh(t, e) {
  var n = Ds(t + "");
  if (arguments.length < 2) {
    for (var i = Ji(this.node()), r = -1, a = n.length; ++r < a; ) if (!i.contains(n[r])) return !1;
    return !0;
  }
  return this.each((typeof e == "function" ? Dh : e ? Nh : Ih)(n, e));
}
function Mh() {
  this.textContent = "";
}
function Lh(t) {
  return function() {
    this.textContent = t;
  };
}
function Oh(t) {
  return function() {
    var e = t.apply(this, arguments);
    this.textContent = e ?? "";
  };
}
function Ch(t) {
  return arguments.length ? this.each(t == null ? Mh : (typeof t == "function" ? Oh : Lh)(t)) : this.node().textContent;
}
function Fh() {
  this.innerHTML = "";
}
function zh(t) {
  return function() {
    this.innerHTML = t;
  };
}
function Bh(t) {
  return function() {
    var e = t.apply(this, arguments);
    this.innerHTML = e ?? "";
  };
}
function Ph(t) {
  return arguments.length ? this.each(t == null ? Fh : (typeof t == "function" ? Bh : zh)(t)) : this.node().innerHTML;
}
function Hh() {
  this.nextSibling && this.parentNode.appendChild(this);
}
function Vh() {
  return this.each(Hh);
}
function Uh() {
  this.previousSibling && this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function Gh() {
  return this.each(Uh);
}
function Zh(t) {
  var e = typeof t == "function" ? t : As(t);
  return this.select(function() {
    return this.appendChild(e.apply(this, arguments));
  });
}
function qh() {
  return null;
}
function Wh(t, e) {
  var n = typeof t == "function" ? t : As(t), i = e == null ? qh : typeof e == "function" ? e : $s(e);
  return this.select(function() {
    return this.insertBefore(n.apply(this, arguments), i.apply(this, arguments) || null);
  });
}
function Xh() {
  var t = this.parentNode;
  t && t.removeChild(this);
}
function Kh() {
  return this.each(Xh);
}
function Yh() {
  var t = this.cloneNode(!1), e = this.parentNode;
  return e ? e.insertBefore(t, this.nextSibling) : t;
}
function Jh() {
  var t = this.cloneNode(!0), e = this.parentNode;
  return e ? e.insertBefore(t, this.nextSibling) : t;
}
function Qh(t) {
  return this.select(t ? Jh : Yh);
}
function jh(t) {
  return arguments.length ? this.property("__data__", t) : this.node().__data__;
}
var Os = {};
if (typeof document < "u") {
  var td = document.documentElement;
  "onmouseenter" in td || (Os = { mouseenter: "mouseover", mouseleave: "mouseout" });
}
function ed(t, e, n) {
  return t = Cs(t, e, n), function(i) {
    var r = i.relatedTarget;
    (!r || r !== this && !(r.compareDocumentPosition(this) & 8)) && t.call(this, i);
  };
}
function Cs(t, e, n) {
  return function(i) {
    try {
      t.call(this, this.__data__, e, n);
    } finally {
    }
  };
}
function nd(t) {
  return t.trim().split(/^|\s+/).map(function(e) {
    var n = "", i = e.indexOf(".");
    return i >= 0 && (n = e.slice(i + 1), e = e.slice(0, i)), { type: e, name: n };
  });
}
function id(t) {
  return function() {
    var e = this.__on;
    if (e) {
      for (var n = 0, i = -1, r = e.length, a; n < r; ++n)
        a = e[n], (!t.type || a.type === t.type) && a.name === t.name ? this.removeEventListener(a.type, a.listener, a.capture) : e[++i] = a;
      ++i ? e.length = i : delete this.__on;
    }
  };
}
function rd(t, e, n) {
  var i = Os.hasOwnProperty(t.type) ? ed : Cs;
  return function(r, a, s) {
    var o = this.__on, c, f = i(e, a, s);
    if (o) {
      for (var u = 0, _ = o.length; u < _; ++u)
        if ((c = o[u]).type === t.type && c.name === t.name) {
          this.removeEventListener(c.type, c.listener, c.capture), this.addEventListener(c.type, c.listener = f, c.capture = n), c.value = e;
          return;
        }
    }
    this.addEventListener(t.type, f, n), c = { type: t.type, name: t.name, value: e, listener: f, capture: n }, o ? o.push(c) : this.__on = [c];
  };
}
function ad(t, e, n) {
  var i = nd(t + ""), r, a = i.length, s;
  if (arguments.length < 2) {
    var o = this.node().__on;
    if (o) {
      for (var c = 0, f = o.length, u; c < f; ++c)
        for (r = 0, u = o[c]; r < a; ++r)
          if ((s = i[r]).type === u.type && s.name === u.name)
            return u.value;
    }
    return;
  }
  for (o = e ? rd : id, n == null && (n = !1), r = 0; r < a; ++r) this.each(o(i[r], e, n));
  return this;
}
function Fs(t, e, n) {
  var i = Is(t), r = i.CustomEvent;
  typeof r == "function" ? r = new r(e, n) : (r = i.document.createEvent("Event"), n ? (r.initEvent(e, n.bubbles, n.cancelable), r.detail = n.detail) : r.initEvent(e, !1, !1)), t.dispatchEvent(r);
}
function sd(t, e) {
  return function() {
    return Fs(this, t, e);
  };
}
function od(t, e) {
  return function() {
    return Fs(this, t, e.apply(this, arguments));
  };
}
function ld(t, e) {
  return this.each((typeof e == "function" ? od : sd)(t, e));
}
var zs = [null];
function Gt(t, e) {
  this._groups = t, this._parents = e;
}
function Ri() {
  return new Gt([[document.documentElement]], zs);
}
Gt.prototype = Ri.prototype = {
  constructor: Gt,
  select: Gu,
  selectAll: Wu,
  filter: Ku,
  data: th,
  enter: Yu,
  exit: eh,
  join: nh,
  merge: ih,
  order: rh,
  sort: ah,
  call: oh,
  nodes: lh,
  node: ch,
  size: fh,
  empty: uh,
  each: hh,
  attr: wh,
  style: kh,
  property: $h,
  classed: Rh,
  text: Ch,
  html: Ph,
  raise: Vh,
  lower: Gh,
  append: Zh,
  insert: Wh,
  remove: Kh,
  clone: Qh,
  datum: jh,
  on: ad,
  dispatch: ld
};
function Rr(t) {
  return typeof t == "string" ? new Gt([[document.querySelector(t)]], [document.documentElement]) : new Gt([[t]], zs);
}
function cd() {
  var t = f, e = u, n = _, i = document.body, r = N(), a = null, s = null, o = null;
  function c(w) {
    a = S(w), a && (s = a.createSVGPoint(), i.appendChild(r));
  }
  c.show = function() {
    var w = Array.prototype.slice.call(arguments);
    w[w.length - 1] instanceof SVGElement && (o = w.pop());
    var U = n.apply(this, w), V = e.apply(this, w), J = t.apply(this, w), et = B(), at = g.length, C, tt = document.documentElement.scrollTop || i.scrollTop, it = document.documentElement.scrollLeft || i.scrollLeft;
    for (et.html(U).style("opacity", 1).style("pointer-events", "all"); at--; ) et.classed(g[at], !1);
    return C = p.get(J).apply(this), et.classed(J, !0).style("top", C.top + V[0] + tt + "px").style("left", C.left + V[1] + it + "px"), c;
  }, c.hide = function() {
    var w = B();
    return w.style("opacity", 0).style("pointer-events", "none"), c;
  }, c.attr = function(w, U) {
    if (arguments.length < 2 && typeof w == "string")
      return B().attr(w);
    var V = Array.prototype.slice.call(arguments);
    return Ri.prototype.attr.apply(B(), V), c;
  }, c.style = function(w, U) {
    if (arguments.length < 2 && typeof w == "string")
      return B().style(w);
    var V = Array.prototype.slice.call(arguments);
    return Ri.prototype.style.apply(B(), V), c;
  }, c.direction = function(w) {
    return arguments.length ? (t = w == null ? w : F(w), c) : t;
  }, c.offset = function(w) {
    return arguments.length ? (e = w == null ? w : F(w), c) : e;
  }, c.html = function(w) {
    return arguments.length ? (n = w == null ? w : F(w), c) : n;
  }, c.rootElement = function(w) {
    return arguments.length ? (i = w == null ? w : F(w), c) : i;
  }, c.destroy = function() {
    return r && (B().remove(), r = null), c;
  };
  function f() {
    return "n";
  }
  function u() {
    return [0, 0];
  }
  function _() {
    return " ";
  }
  var p = Yi({
    n: T,
    s: z,
    e: R,
    w: $,
    nw: E,
    ne: k,
    sw: x,
    se: A
  }), g = p.keys();
  function T() {
    var w = P(this);
    return {
      top: w.n.y - r.offsetHeight,
      left: w.n.x - r.offsetWidth / 2
    };
  }
  function z() {
    var w = P(this);
    return {
      top: w.s.y,
      left: w.s.x - r.offsetWidth / 2
    };
  }
  function R() {
    var w = P(this);
    return {
      top: w.e.y - r.offsetHeight / 2,
      left: w.e.x
    };
  }
  function $() {
    var w = P(this);
    return {
      top: w.w.y - r.offsetHeight / 2,
      left: w.w.x - r.offsetWidth
    };
  }
  function E() {
    var w = P(this);
    return {
      top: w.nw.y - r.offsetHeight,
      left: w.nw.x - r.offsetWidth
    };
  }
  function k() {
    var w = P(this);
    return {
      top: w.ne.y - r.offsetHeight,
      left: w.ne.x
    };
  }
  function x() {
    var w = P(this);
    return {
      top: w.sw.y,
      left: w.sw.x - r.offsetWidth
    };
  }
  function A() {
    var w = P(this);
    return {
      top: w.se.y,
      left: w.se.x
    };
  }
  function N() {
    var w = Rr(document.createElement("div"));
    return w.style("position", "absolute").style("top", 0).style("opacity", 0).style("pointer-events", "none").style("box-sizing", "border-box"), w.node();
  }
  function S(w) {
    var U = w.node();
    return U ? U.tagName.toLowerCase() === "svg" ? U : U.ownerSVGElement : null;
  }
  function B() {
    return r == null && (r = N(), i.appendChild(r)), Rr(r);
  }
  function P(w) {
    for (var U = o || w; U.getScreenCTM == null && U.parentNode != null; )
      U = U.parentNode;
    var V = {}, J = U.getScreenCTM(), et = U.getBBox(), at = et.width, C = et.height, tt = et.x, it = et.y;
    return s.x = tt, s.y = it, V.nw = s.matrixTransform(J), s.x += at, V.ne = s.matrixTransform(J), s.y += C, V.se = s.matrixTransform(J), s.x -= at, V.sw = s.matrixTransform(J), s.y -= C / 2, V.w = s.matrixTransform(J), s.x += at, V.e = s.matrixTransform(J), s.x -= at / 2, s.y -= C / 2, V.n = s.matrixTransform(J), s.y += C, V.s = s.matrixTransform(J), V;
  }
  function F(w) {
    return typeof w == "function" ? w : function() {
      return w;
    };
  }
  return c;
}
class fd {
  constructor({
    region: e,
    viewer: n,
    height: i,
    width: r,
    range: a
  }) {
    this.variants = [], this.viewer = n, this.width = r, this.height = i, this.region = e, this.range = a;
  }
  DrawTrack() {
    const e = this.viewer, n = this.variants, i = ue().domain([this.region.start, this.region.end + 1]).range(this.range), r = hs().type(us).size(20), a = cd();
    a.attr("class", "d3-tip").html(
      // @ts-expect-error
      (_) => `<table><th colspan="2">${"Case Variant".toUpperCase()}</th><tr><td>Position</td> <td>${_.position}</td></tr><tr><td>Mutation</td> <td>${_.ref} > ${_.mutant}</td></tr></table>`
    ).offset([10, 0]).direction("s"), e.call(a);
    const s = 20, o = Be(this.viewer), c = e.append("g").attr("transform", `translate(0,${o})`).attr("class", "track");
    c.append("rect").attr("height", s).attr("width", -this.range[0] + this.range[1]).attr("fill-opacity", 0.1).attr("fill", "rgb(148, 140, 140)").attr("stroke-width", 0).attr("stroke-opacity", 0).attr("transform", `translate(${this.range[0]},0)`), c.selectAll("path").data(n).enter().append("path").attr("d", r).attr("class", "case-variant").attr("stroke", "red").attr("fill", "red").attr("transform", (_) => `translate(${i(_.position)},10)`).on("mouseenter", a.show).on("mouseout", a.hide);
    const u = ht("#viewer2").append("g").attr("transform", `translate(25,${o})`).attr("class", "track-label");
    u.append("line").attr("x1", 75).attr("y1", 0).attr("x2", 75).attr("y2", s).attr("stroke-width", 3).attr("stroke", "#609C9C"), u.append("text").text(this.track.label.toUpperCase()).attr("y", 12);
  }
  /* Method to get reference label */
  async getTrackData() {
  }
}
class ud {
  constructor({
    viewer: e,
    track: n,
    height: i,
    width: r,
    region: a
  }) {
    this.variants = [], this.region = a, this.viewer = e, this.width = r, this.height = i, this.track = n;
  }
  DrawTrack() {
    const e = this.viewer, n = this.variants, i = ue().domain([this.region.start, this.region.end]).range(this.track.range), r = hs().type(us).size(20), a = 20, s = Be(this.viewer), o = e.append("g").attr("transform", `translate(0,${s})`).attr("class", "track");
    o.append("rect").attr("height", a).attr("width", -this.track.range[0] + this.track.range[1]).attr("fill-opacity", 0.1).attr("fill", "rgb(148, 140, 140)").attr("stroke-width", 0).attr("stroke-opacity", 0), o.selectAll("path").data(n).enter().append("path").attr("d", r).attr("class", "global-variant").attr("stroke", "red").attr("fill", "red").attr("transform", (c) => `translate(${i(c.position)},10)`);
  }
  async getTrackData() {
  }
}
function Qi(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
var Jn, Mr;
function hd() {
  if (Mr) return Jn;
  Mr = 1;
  class t {
    constructor(n = {}) {
      if (!(n.maxSize && n.maxSize > 0))
        throw new TypeError("`maxSize` must be a number greater than 0");
      this.maxSize = n.maxSize, this.cache = /* @__PURE__ */ new Map(), this.oldCache = /* @__PURE__ */ new Map(), this._size = 0;
    }
    _set(n, i) {
      this.cache.set(n, i), this._size++, this._size >= this.maxSize && (this._size = 0, this.oldCache = this.cache, this.cache = /* @__PURE__ */ new Map());
    }
    get(n) {
      if (this.cache.has(n))
        return this.cache.get(n);
      if (this.oldCache.has(n)) {
        const i = this.oldCache.get(n);
        return this.oldCache.delete(n), this._set(n, i), i;
      }
    }
    set(n, i) {
      return this.cache.has(n) ? this.cache.set(n, i) : this._set(n, i), this;
    }
    has(n) {
      return this.cache.has(n) || this.oldCache.has(n);
    }
    peek(n) {
      if (this.cache.has(n))
        return this.cache.get(n);
      if (this.oldCache.has(n))
        return this.oldCache.get(n);
    }
    delete(n) {
      const i = this.cache.delete(n);
      return i && this._size--, this.oldCache.delete(n) || i;
    }
    clear() {
      this.cache.clear(), this.oldCache.clear(), this._size = 0;
    }
    *keys() {
      for (const [n] of this)
        yield n;
    }
    *values() {
      for (const [, n] of this)
        yield n;
    }
    *[Symbol.iterator]() {
      for (const n of this.cache)
        yield n;
      for (const n of this.oldCache) {
        const [i] = n;
        this.cache.has(i) || (yield n);
      }
    }
    get size() {
      let n = 0;
      for (const i of this.oldCache.keys())
        this.cache.has(i) || n++;
      return this._size + n;
    }
  }
  return Jn = t, Jn;
}
var dd = hd();
const Gn = /* @__PURE__ */ Qi(dd);
class pd {
}
class _d {
  constructor() {
    this.signals = /* @__PURE__ */ new Set(), this.abortController = new AbortController();
  }
  /**
   * @param {AbortSignal} [signal] optional AbortSignal to add. if falsy,
   *  will be treated as a null-signal, and this abortcontroller will no
   *  longer be abortable.
   */
  //@ts-ignore
  addSignal(e = new pd()) {
    if (this.signal.aborted)
      throw new Error("cannot add a signal, already aborted!");
    this.signals.add(e), e.aborted ? this.handleAborted(e) : typeof e.addEventListener == "function" && e.addEventListener("abort", () => {
      this.handleAborted(e);
    });
  }
  handleAborted(e) {
    this.signals.delete(e), this.signals.size === 0 && this.abortController.abort();
  }
  get signal() {
    return this.abortController.signal;
  }
  abort() {
    this.abortController.abort();
  }
}
class gd {
  constructor() {
    this.callbacks = /* @__PURE__ */ new Set();
  }
  addCallback(e = () => {
  }) {
    this.callbacks.add(e), this.currentMessage && e(this.currentMessage);
  }
  callback(e) {
    this.currentMessage = e;
    for (const n of this.callbacks)
      n(e);
  }
}
class Te {
  constructor({ fill: e, cache: n }) {
    if (typeof e != "function")
      throw new TypeError("must pass a fill function");
    if (typeof n != "object")
      throw new TypeError("must pass a cache object");
    if (typeof n.get != "function" || typeof n.set != "function" || typeof n.delete != "function")
      throw new TypeError("cache must implement get(key), set(key, val), and and delete(key)");
    this.cache = n, this.fillCallback = e;
  }
  static isAbortException(e) {
    return (
      // DOMException
      e.name === "AbortError" || // standard-ish non-DOM abort exception
      //@ts-ignore
      e.code === "ERR_ABORTED" || // stringified DOMException
      e.message === "AbortError: aborted" || // stringified standard-ish exception
      e.message === "Error: aborted"
    );
  }
  evict(e, n) {
    this.cache.get(e) === n && this.cache.delete(e);
  }
  fill(e, n, i, r) {
    const a = new _d(), s = new gd();
    s.addCallback(r);
    const o = {
      aborter: a,
      promise: this.fillCallback(n, a.signal, (c) => {
        s.callback(c);
      }),
      settled: !1,
      statusReporter: s,
      get aborted() {
        return this.aborter.signal.aborted;
      }
    };
    o.aborter.addSignal(i), o.aborter.signal.addEventListener("abort", () => {
      o.settled || this.evict(e, o);
    }), o.promise.then(() => {
      o.settled = !0;
    }, () => {
      o.settled = !0, this.evict(e, o);
    }).catch((c) => {
      throw console.error(c), c;
    }), this.cache.set(e, o);
  }
  static checkSinglePromise(e, n) {
    function i() {
      if (n?.aborted)
        throw Object.assign(new Error("aborted"), { code: "ERR_ABORTED" });
    }
    return e.then((r) => (i(), r), (r) => {
      throw i(), r;
    });
  }
  has(e) {
    return this.cache.has(e);
  }
  /**
   * Callback for getting status of the pending async
   *
   * @callback statusCallback
   * @param {any} status, current status string or message object
   */
  /**
   * @param {any} key cache key to use for this request
   * @param {any} data data passed as the first argument to the fill callback
   * @param {AbortSignal} [signal] optional AbortSignal object that aborts the request
   * @param {statusCallback} a callback to get the current status of a pending async operation
   */
  get(e, n, i, r) {
    if (!i && n instanceof AbortSignal)
      throw new TypeError("second get argument appears to be an AbortSignal, perhaps you meant to pass `null` for the fill data?");
    const a = this.cache.get(e);
    return a ? a.aborted && !a.settled ? (this.evict(e, a), this.get(e, n, i, r)) : a.settled ? a.promise : (a.aborter.addSignal(i), a.statusReporter.addCallback(r), Te.checkSinglePromise(a.promise, i)) : (this.fill(e, n, i, r), Te.checkSinglePromise(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.cache.get(e).promise,
      i
    ));
  }
  /**
   * delete the given entry from the cache. if it exists and its fill request has
   * not yet settled, the fill will be signaled to abort.
   *
   * @param {any} key
   */
  delete(e) {
    const n = this.cache.get(e);
    n && (n.settled || n.aborter.abort(), this.cache.delete(e));
  }
  /**
   * Clear all requests from the cache. Aborts any that have not settled.
   * @returns {number} count of entries deleted
   */
  clear() {
    const e = this.cache.keys();
    let n = 0;
    for (let i = e.next(); !i.done; i = e.next())
      this.delete(i.value), n += 1;
    return n;
  }
}
var Tn = { exports: {} }, md = Tn.exports, Lr;
function vd() {
  return Lr || (Lr = 1, function(t, e) {
    (function(n, i) {
      t.exports = i();
    })(md, function() {
      const n = /^[\w+.-]+:\/\//, i = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/, r = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
      function a(E) {
        return n.test(E);
      }
      function s(E) {
        return E.startsWith("//");
      }
      function o(E) {
        return E.startsWith("/");
      }
      function c(E) {
        return E.startsWith("file:");
      }
      function f(E) {
        return /^[.?#]/.test(E);
      }
      function u(E) {
        const k = i.exec(E);
        return p(k[1], k[2] || "", k[3], k[4] || "", k[5] || "/", k[6] || "", k[7] || "");
      }
      function _(E) {
        const k = r.exec(E), x = k[2];
        return p("file:", "", k[1] || "", "", o(x) ? x : "/" + x, k[3] || "", k[4] || "");
      }
      function p(E, k, x, A, N, S, B) {
        return {
          scheme: E,
          user: k,
          host: x,
          port: A,
          path: N,
          query: S,
          hash: B,
          type: 7
        };
      }
      function g(E) {
        if (s(E)) {
          const x = u("http:" + E);
          return x.scheme = "", x.type = 6, x;
        }
        if (o(E)) {
          const x = u("http://foo.com" + E);
          return x.scheme = "", x.host = "", x.type = 5, x;
        }
        if (c(E))
          return _(E);
        if (a(E))
          return u(E);
        const k = u("http://foo.com/" + E);
        return k.scheme = "", k.host = "", k.type = E ? E.startsWith("?") ? 3 : E.startsWith("#") ? 2 : 4 : 1, k;
      }
      function T(E) {
        if (E.endsWith("/.."))
          return E;
        const k = E.lastIndexOf("/");
        return E.slice(0, k + 1);
      }
      function z(E, k) {
        R(k, k.type), E.path === "/" ? E.path = k.path : E.path = T(k.path) + E.path;
      }
      function R(E, k) {
        const x = k <= 4, A = E.path.split("/");
        let N = 1, S = 0, B = !1;
        for (let F = 1; F < A.length; F++) {
          const w = A[F];
          if (!w) {
            B = !0;
            continue;
          }
          if (B = !1, w !== ".") {
            if (w === "..") {
              S ? (B = !0, S--, N--) : x && (A[N++] = w);
              continue;
            }
            A[N++] = w, S++;
          }
        }
        let P = "";
        for (let F = 1; F < N; F++)
          P += "/" + A[F];
        (!P || B && !P.endsWith("/..")) && (P += "/"), E.path = P;
      }
      function $(E, k) {
        if (!E && !k)
          return "";
        const x = g(E);
        let A = x.type;
        if (k && A !== 7) {
          const S = g(k), B = S.type;
          switch (A) {
            case 1:
              x.hash = S.hash;
            // fall through
            case 2:
              x.query = S.query;
            // fall through
            case 3:
            case 4:
              z(x, S);
            // fall through
            case 5:
              x.user = S.user, x.host = S.host, x.port = S.port;
            // fall through
            case 6:
              x.scheme = S.scheme;
          }
          B > A && (A = B);
        }
        R(x, A);
        const N = x.query + x.hash;
        switch (A) {
          // This is impossible, because of the empty checks at the start of the function.
          // case UrlType.Empty:
          case 2:
          case 3:
            return N;
          case 4: {
            const S = x.path.slice(1);
            return S ? f(k || E) && !f(S) ? "./" + S + N : S + N : N || ".";
          }
          case 5:
            return x.path + N;
          default:
            return x.scheme + "//" + x.user + x.host + x.port + x.path + N;
        }
      }
      return $;
    });
  }(Tn)), Tn.exports;
}
var wd = vd();
const yd = /* @__PURE__ */ Qi(wd);
async function ji(t, e, n = {}) {
  const { defaultContent: i = {} } = n;
  try {
    const r = await e(t, { encoding: "utf8" }), a = new TextDecoder("utf8");
    return JSON.parse(a.decode(r));
  } catch (r) {
    if (r.code === "ENOENT" || r.status === 404 || r.message.includes("404") || r.message.includes("ENOENT"))
      return i;
    throw r;
  }
}
function tr(t, e = ".") {
  return yd(t, e);
}
class xd {
  constructor({ readFile: e, cacheSize: n = 100 }) {
    if (this.topList = [], this.chunkCache = new Te({
      cache: new Gn({ maxSize: n }),
      fill: this.readChunkItems.bind(this)
    }), this.readFile = e, !this.readFile)
      throw new Error('must provide a "readFile" function');
  }
  importExisting(e, n, i, r, a) {
    this.topList = e, this.attrs = n, this.start = n.makeFastGetter("Start"), this.end = n.makeFastGetter("End"), this.lazyClass = a, this.baseURL = i, this.lazyUrlTemplate = r;
  }
  binarySearch(e, n, i) {
    let r = -1, a = e.length, s;
    for (; a - r > 1; )
      s = r + a >>> 1, i(e[s]) >= n ? a = s : r = s;
    return i === this.end ? a : r;
  }
  readChunkItems(e) {
    const n = tr(this.lazyUrlTemplate.replaceAll(/\{Chunk\}/gi, e), this.baseURL);
    return ji(n, this.readFile, { defaultContent: [] });
  }
  async *iterateSublist(e, n, i, r, a, s, o) {
    const c = this.attrs.makeGetter("Chunk"), f = this.attrs.makeGetter("Sublist"), u = [];
    for (let _ = this.binarySearch(e, n, a); _ < e.length && _ >= 0 && r * s(e[_]) < r * i; _ += r) {
      if (e[_][0] === this.lazyClass) {
        const g = c(e[_]), T = this.chunkCache.get(g, g).then((z) => [z, g]);
        u.push(T);
      } else
        yield [e[_], o.concat(_)];
      const p = f(e[_]);
      p && (yield* this.iterateSublist(p, n, i, r, a, s, o.concat(_)));
    }
    for (const _ of u) {
      const [p, g] = await _;
      p && (yield* this.iterateSublist(p, n, i, r, a, s, [
        ...o,
        g
      ]));
    }
  }
  async *iterate(e, n) {
    const i = e > n ? -1 : 1, r = e > n ? this.start : this.end, a = e > n ? this.end : this.start;
    this.topList.length > 0 && (yield* this.iterateSublist(this.topList, e, n, i, r, a, [0]));
  }
  async histogram(e, n, i) {
    const r = new Array(i);
    r.fill(0);
    const a = (n - e) / i;
    for await (const s of this.iterate(e, n)) {
      const o = Math.max(0, (this.start(s) - e) / a | 0), c = Math.min(i, (this.end(s) - e) / a | 0);
      for (let f = o; f <= c; f += 1)
        r[f] += 1;
    }
    return r;
  }
}
class bd {
  constructor(e) {
    this.classes = e, this.fields = [];
    for (let n = 0; n < e.length; n += 1) {
      this.fields[n] = {};
      for (let i = 0; i < e[n].attributes.length; i += 1)
        this.fields[n][e[n].attributes[i]] = i + 1;
      e[n].proto === void 0 && (e[n].proto = {}), e[n].isArrayAttr === void 0 && (e[n].isArrayAttr = {});
    }
  }
  /**
   * @private
   */
  attrIndices(e) {
    return this.classes.map((n) => n.attributes.indexOf(e) + 1 || n.attributes.indexOf(e.toLowerCase()) + 1 || void 0);
  }
  get(e, n) {
    if (n in this.fields[e[0]])
      return e[this.fields[e[0]][n]];
    const i = n.toLowerCase();
    if (i in this.fields[e[0]])
      return e[this.fields[e[0]][i]];
    const r = this.classes[e[0]].attributes.length + 1;
    return r >= e.length || !(n in e[r]) ? n in this.classes[e[0]].proto ? this.classes[e[0]].proto[n] : void 0 : e[r][n];
  }
  makeSetter(e) {
    return (n, i) => {
      this.set(n, e, i);
    };
  }
  makeGetter(e) {
    return (n) => this.get(n, e);
  }
  makeFastGetter(e) {
    const n = this.attrIndices(e);
    return function(r) {
      if (n[r[0]] !== void 0)
        return r[n[r[0]]];
    };
  }
  // construct(self, obj, klass) {
  //   const result = new Array(self.classes[klass].length)
  //   Object.keys(obj).forEach(attr => {
  //     this.set(result, attr, obj[attr])
  //   })
  //   return result
  // }
  /**
   * Returns fast pre-compiled getter and setter functions for use with
   * Arrays that use this representation.
   * When the returned <code>get</code> and <code>set</code> functions are
   * added as methods to an Array that contains data in this
   * representation, they provide fast access by name to the data.
   *
   * @returns {Object} <code>{ get: function() {...}, set: function(val) {...} }</code>
   *
   * @example
   * var accessors = attrs.accessors();
   * var feature = get_feature_from_someplace();
   * feature.get = accessors.get;
   * // print out the feature start and end
   * console.log( feature.get('start') + ',' + feature.get('end') );
   */
  accessors() {
    return this._accessors || (this._accessors = this._makeAccessors()), this._accessors;
  }
  /**
   * @private
   */
  _makeAccessors() {
    const e = {}, n = {
      get(r) {
        const a = this.get.field_accessors[r.toLowerCase()];
        if (a)
          return a.call(this);
      },
      set(r, a) {
        const s = this.set.field_accessors[r];
        if (s)
          return s.call(this, a);
      },
      tags() {
        return i[this[0]] || [];
      }
    };
    n.get.field_accessors = {}, n.set.field_accessors = {}, this.classes.forEach((r, a) => {
      (r.attributes || []).forEach((s, o) => {
        e[s] = e[s] || [], e[s][a] = o + 1, s = s.toLowerCase(), e[s] = e[s] || [], e[s][a] = o + 1;
      });
    });
    const i = this.classes.map((r) => r.attributes);
    return Object.keys(e).forEach((r) => {
      const a = e[r];
      n.get.field_accessors[r] = a ? function() {
        return this[a[this[0]]];
      } : function() {
      };
    }), n;
  }
}
class kd {
  constructor({ urlTemplate: e, chunkSize: n, length: i, cacheSize: r = 100, readFile: a }, s) {
    if (this.urlTemplate = e, this.chunkSize = n, this.length = i, this.baseUrl = s === void 0 ? "" : s, this.readFile = a, !a)
      throw new Error("must provide readFile callback");
    this.chunkCache = new Te({
      cache: new Gn({ maxSize: r }),
      fill: this.getChunk.bind(this)
    });
  }
  /**
   * call the callback on one element of the array
   * @param i index
   * @param callback callback, gets called with (i, value, param)
   * @param param (optional) callback will get this as its last parameter
   */
  index(e, n, i) {
    this.range(e, e, n, void 0, i);
  }
  /**
   * async generator for the elements in the range [start,end]
   *
   * @param start index of first element to call the callback on
   * @param end index of last element to call the callback on
   */
  async *range(e, n) {
    e = Math.max(0, e), n = Math.min(n, this.length - 1);
    const i = Math.floor(e / this.chunkSize), r = Math.floor(n / this.chunkSize), a = [];
    for (let s = i; s <= r; s += 1)
      a.push(this.chunkCache.get(s, s));
    for (const s of a) {
      const [o, c] = await s;
      yield* this.filterChunkData(e, n, o, c);
    }
  }
  async getChunk(e) {
    let n = this.urlTemplate.replaceAll(/\{Chunk\}/gi, e);
    this.baseUrl && (n = tr(n, this.baseUrl));
    const i = await ji(n, this.readFile);
    return [e, i];
  }
  *filterChunkData(e, n, i, r) {
    const a = i * this.chunkSize, s = Math.max(0, e - a), o = Math.min(n - a, this.chunkSize - 1);
    for (let c = s; c <= o; c += 1)
      yield [c + a, r[c]];
  }
}
function Td() {
  return this._uniqueID;
}
function Ed() {
  return this._parent;
}
function Sd() {
  return this.get("subfeatures");
}
class Ad {
  constructor({ baseUrl: e, urlTemplate: n, readFile: i, cacheSize: r = 10 }) {
    if (this.baseUrl = e, this.urlTemplates = { root: n }, this.readFile = i, !this.readFile)
      throw new Error('must provide a "readFile" function argument');
    this.dataRootCache = new Te({
      cache: new Gn({ maxSize: r }),
      fill: this.fetchDataRoot.bind(this)
    });
  }
  makeNCList() {
    return new xd({ readFile: this.readFile });
  }
  loadNCList(e, n, i) {
    e.nclist.importExisting(n.intervals.nclist, e.attrs, i, n.intervals.urlTemplate, n.intervals.lazyClass);
  }
  getDataRoot(e) {
    return this.dataRootCache.get(e, e);
  }
  fetchDataRoot(e) {
    const n = tr(this.urlTemplates.root.replaceAll(/{\s*refseq\s*}/g, e), this.baseUrl);
    return ji(n, this.readFile).then((i) => (
      // trackInfo = JSON.parse( trackInfo );
      this.parseTrackInfo(i, n)
    ));
  }
  parseTrackInfo(e, n) {
    const i = {
      nclist: this.makeNCList(),
      stats: {
        featureCount: e.featureCount || 0
      }
    };
    e.intervals && (i.attrs = new bd(e.intervals.classes), this.loadNCList(i, e, n));
    const { histograms: r } = e;
    if (r?.meta) {
      for (let a = 0; a < r.meta.length; a += 1)
        r.meta[a].lazyArray = new kd({ ...r.meta[a].arrayParams, readFile: this.readFile }, n);
      i._histograms = r;
    }
    return i._histograms && Object.keys(i._histograms).forEach((a) => {
      i._histograms[a].forEach((o) => {
        Object.keys(o).forEach((c) => {
          typeof o[c] == "string" && String(Number(o[c])) === o[c] && (o[c] = Number(o[c]));
        });
      });
    }), i;
  }
  async getRegionStats(e) {
    return (await this.getDataRoot(e.ref)).stats;
  }
  /**
   * fetch binned counts of feature coverage in the given region.
   *
   * @param {object} query
   * @param {string} query.refName reference sequence name
   * @param {number} query.start region start
   * @param {number} query.end region end
   * @param {number} query.numBins number of bins desired in the feature counts
   * @param {number} query.basesPerBin number of bp desired in each feature counting bin
   * @returns {object} as:
   *    `{ bins: hist, stats: statEntry }`
   */
  async getRegionFeatureDensities({ refName: e, start: n, end: i, numBins: r, basesPerBin: a }) {
    const s = await this.getDataRoot(e);
    if (r)
      a = (i - n) / r;
    else if (a)
      r = Math.ceil((i - n) / a);
    else
      throw new TypeError("numBins or basesPerBin arg required for getRegionFeatureDensities");
    const c = (s._histograms.stats || []).find((p) => p.basesPerBin >= a);
    let f = s._histograms.meta[0];
    for (let p = 0; p < s._histograms.meta.length; p += 1)
      a >= s._histograms.meta[p].basesPerBin && (f = s._histograms.meta[p]);
    let u = a / f.basesPerBin;
    if (u > 0.9 && Math.abs(u - Math.round(u)) < 1e-4) {
      const p = Math.floor(n / f.basesPerBin);
      u = Math.round(u);
      const g = [];
      for (let T = 0; T < r; T += 1)
        g[T] = 0;
      for await (const [T, z] of f.lazyArray.range(p, p + u * r - 1))
        g[Math.floor((T - p) / u)] += z;
      return { bins: g, stats: c };
    }
    return { bins: await s.nclist.histogram(n, i, r), stats: c };
  }
  /**
   * Fetch features in a given region. This method is an asynchronous generator
   * yielding feature objects.
   *
   * @param {object} args
   * @param {string} args.refName reference sequence name
   * @param {number} args.start start of region. 0-based half-open.
   * @param {number} args.end end of region. 0-based half-open.
   * @yields {object}
   */
  async *getFeatures({ refName: e, start: n, end: i }) {
    const r = await this.getDataRoot(e), a = r.attrs?.accessors();
    for await (const [s, o] of r.nclist.iterate(n, i)) {
      if (!s.decorated) {
        const c = o.join(",");
        this.decorateFeature(a, s, `${e},${c}`);
      }
      yield s;
    }
  }
  // helper method to recursively add .get and .tags methods to a feature and its
  // subfeatures
  decorateFeature(e, n, i, r) {
    n.get = e.get, n.tags = e.tags, n._uniqueID = i, n.id = Td, n._parent = r, n.parent = Ed, n.children = Sd, (n.get("subfeatures") || []).forEach((a, s) => {
      this.decorateFeature(e, a, `${i}-${s}`, n);
    }), n.decorated = !0;
  }
}
function Pe(t) {
  let e = t.length;
  for (; --e >= 0; )
    t[e] = 0;
}
const $d = 3, Nd = 258, Bs = 29, Id = 256, Dd = Id + 1 + Bs, Ps = 30, Rd = 512, Md = new Array((Dd + 2) * 2);
Pe(Md);
const Ld = new Array(Ps * 2);
Pe(Ld);
const Od = new Array(Rd);
Pe(Od);
const Cd = new Array(Nd - $d + 1);
Pe(Cd);
const Fd = new Array(Bs);
Pe(Fd);
const zd = new Array(Ps);
Pe(zd);
const Bd = (t, e, n, i) => {
  let r = t & 65535 | 0, a = t >>> 16 & 65535 | 0, s = 0;
  for (; n !== 0; ) {
    s = n > 2e3 ? 2e3 : n, n -= s;
    do
      r = r + e[i++] | 0, a = a + r | 0;
    while (--s);
    r %= 65521, a %= 65521;
  }
  return r | a << 16 | 0;
};
var Mi = Bd;
const Pd = () => {
  let t, e = [];
  for (var n = 0; n < 256; n++) {
    t = n;
    for (var i = 0; i < 8; i++)
      t = t & 1 ? 3988292384 ^ t >>> 1 : t >>> 1;
    e[n] = t;
  }
  return e;
}, Hd = new Uint32Array(Pd()), Vd = (t, e, n, i) => {
  const r = Hd, a = i + n;
  t ^= -1;
  for (let s = i; s < a; s++)
    t = t >>> 8 ^ r[(t ^ e[s]) & 255];
  return t ^ -1;
};
var ne = Vd, Li = {
  2: "need dictionary",
  /* Z_NEED_DICT       2  */
  1: "stream end",
  /* Z_STREAM_END      1  */
  0: "",
  /* Z_OK              0  */
  "-1": "file error",
  /* Z_ERRNO         (-1) */
  "-2": "stream error",
  /* Z_STREAM_ERROR  (-2) */
  "-3": "data error",
  /* Z_DATA_ERROR    (-3) */
  "-4": "insufficient memory",
  /* Z_MEM_ERROR     (-4) */
  "-5": "buffer error",
  /* Z_BUF_ERROR     (-5) */
  "-6": "incompatible version"
  /* Z_VERSION_ERROR (-6) */
}, Hs = {
  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH: 0,
  Z_FINISH: 4,
  Z_BLOCK: 5,
  Z_TREES: 6,
  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK: 0,
  Z_STREAM_END: 1,
  Z_NEED_DICT: 2,
  Z_STREAM_ERROR: -2,
  Z_DATA_ERROR: -3,
  Z_MEM_ERROR: -4,
  Z_BUF_ERROR: -5,
  /* The deflate compression method */
  Z_DEFLATED: 8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};
const Ud = (t, e) => Object.prototype.hasOwnProperty.call(t, e);
var Gd = function(t) {
  const e = Array.prototype.slice.call(arguments, 1);
  for (; e.length; ) {
    const n = e.shift();
    if (n) {
      if (typeof n != "object")
        throw new TypeError(n + "must be non-object");
      for (const i in n)
        Ud(n, i) && (t[i] = n[i]);
    }
  }
  return t;
}, Zd = (t) => {
  let e = 0;
  for (let i = 0, r = t.length; i < r; i++)
    e += t[i].length;
  const n = new Uint8Array(e);
  for (let i = 0, r = 0, a = t.length; i < a; i++) {
    let s = t[i];
    n.set(s, r), r += s.length;
  }
  return n;
}, Vs = {
  assign: Gd,
  flattenChunks: Zd
};
let Us = !0;
try {
  String.fromCharCode.apply(null, new Uint8Array(1));
} catch {
  Us = !1;
}
const je = new Uint8Array(256);
for (let t = 0; t < 256; t++)
  je[t] = t >= 252 ? 6 : t >= 248 ? 5 : t >= 240 ? 4 : t >= 224 ? 3 : t >= 192 ? 2 : 1;
je[254] = je[254] = 1;
var qd = (t) => {
  if (typeof TextEncoder == "function" && TextEncoder.prototype.encode)
    return new TextEncoder().encode(t);
  let e, n, i, r, a, s = t.length, o = 0;
  for (r = 0; r < s; r++)
    n = t.charCodeAt(r), (n & 64512) === 55296 && r + 1 < s && (i = t.charCodeAt(r + 1), (i & 64512) === 56320 && (n = 65536 + (n - 55296 << 10) + (i - 56320), r++)), o += n < 128 ? 1 : n < 2048 ? 2 : n < 65536 ? 3 : 4;
  for (e = new Uint8Array(o), a = 0, r = 0; a < o; r++)
    n = t.charCodeAt(r), (n & 64512) === 55296 && r + 1 < s && (i = t.charCodeAt(r + 1), (i & 64512) === 56320 && (n = 65536 + (n - 55296 << 10) + (i - 56320), r++)), n < 128 ? e[a++] = n : n < 2048 ? (e[a++] = 192 | n >>> 6, e[a++] = 128 | n & 63) : n < 65536 ? (e[a++] = 224 | n >>> 12, e[a++] = 128 | n >>> 6 & 63, e[a++] = 128 | n & 63) : (e[a++] = 240 | n >>> 18, e[a++] = 128 | n >>> 12 & 63, e[a++] = 128 | n >>> 6 & 63, e[a++] = 128 | n & 63);
  return e;
};
const Wd = (t, e) => {
  if (e < 65534 && t.subarray && Us)
    return String.fromCharCode.apply(null, t.length === e ? t : t.subarray(0, e));
  let n = "";
  for (let i = 0; i < e; i++)
    n += String.fromCharCode(t[i]);
  return n;
};
var Xd = (t, e) => {
  const n = e || t.length;
  if (typeof TextDecoder == "function" && TextDecoder.prototype.decode)
    return new TextDecoder().decode(t.subarray(0, e));
  let i, r;
  const a = new Array(n * 2);
  for (r = 0, i = 0; i < n; ) {
    let s = t[i++];
    if (s < 128) {
      a[r++] = s;
      continue;
    }
    let o = je[s];
    if (o > 4) {
      a[r++] = 65533, i += o - 1;
      continue;
    }
    for (s &= o === 2 ? 31 : o === 3 ? 15 : 7; o > 1 && i < n; )
      s = s << 6 | t[i++] & 63, o--;
    if (o > 1) {
      a[r++] = 65533;
      continue;
    }
    s < 65536 ? a[r++] = s : (s -= 65536, a[r++] = 55296 | s >> 10 & 1023, a[r++] = 56320 | s & 1023);
  }
  return Wd(a, r);
}, Kd = (t, e) => {
  e = e || t.length, e > t.length && (e = t.length);
  let n = e - 1;
  for (; n >= 0 && (t[n] & 192) === 128; )
    n--;
  return n < 0 || n === 0 ? e : n + je[t[n]] > e ? n : e;
}, Oi = {
  string2buf: qd,
  buf2string: Xd,
  utf8border: Kd
};
function Yd() {
  this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
}
var Jd = Yd;
const hn = 16209, Qd = 16191;
var jd = function(e, n) {
  let i, r, a, s, o, c, f, u, _, p, g, T, z, R, $, E, k, x, A, N, S, B, P, F;
  const w = e.state;
  i = e.next_in, P = e.input, r = i + (e.avail_in - 5), a = e.next_out, F = e.output, s = a - (n - e.avail_out), o = a + (e.avail_out - 257), c = w.dmax, f = w.wsize, u = w.whave, _ = w.wnext, p = w.window, g = w.hold, T = w.bits, z = w.lencode, R = w.distcode, $ = (1 << w.lenbits) - 1, E = (1 << w.distbits) - 1;
  t:
    do {
      T < 15 && (g += P[i++] << T, T += 8, g += P[i++] << T, T += 8), k = z[g & $];
      e:
        for (; ; ) {
          if (x = k >>> 24, g >>>= x, T -= x, x = k >>> 16 & 255, x === 0)
            F[a++] = k & 65535;
          else if (x & 16) {
            A = k & 65535, x &= 15, x && (T < x && (g += P[i++] << T, T += 8), A += g & (1 << x) - 1, g >>>= x, T -= x), T < 15 && (g += P[i++] << T, T += 8, g += P[i++] << T, T += 8), k = R[g & E];
            n:
              for (; ; ) {
                if (x = k >>> 24, g >>>= x, T -= x, x = k >>> 16 & 255, x & 16) {
                  if (N = k & 65535, x &= 15, T < x && (g += P[i++] << T, T += 8, T < x && (g += P[i++] << T, T += 8)), N += g & (1 << x) - 1, N > c) {
                    e.msg = "invalid distance too far back", w.mode = hn;
                    break t;
                  }
                  if (g >>>= x, T -= x, x = a - s, N > x) {
                    if (x = N - x, x > u && w.sane) {
                      e.msg = "invalid distance too far back", w.mode = hn;
                      break t;
                    }
                    if (S = 0, B = p, _ === 0) {
                      if (S += f - x, x < A) {
                        A -= x;
                        do
                          F[a++] = p[S++];
                        while (--x);
                        S = a - N, B = F;
                      }
                    } else if (_ < x) {
                      if (S += f + _ - x, x -= _, x < A) {
                        A -= x;
                        do
                          F[a++] = p[S++];
                        while (--x);
                        if (S = 0, _ < A) {
                          x = _, A -= x;
                          do
                            F[a++] = p[S++];
                          while (--x);
                          S = a - N, B = F;
                        }
                      }
                    } else if (S += _ - x, x < A) {
                      A -= x;
                      do
                        F[a++] = p[S++];
                      while (--x);
                      S = a - N, B = F;
                    }
                    for (; A > 2; )
                      F[a++] = B[S++], F[a++] = B[S++], F[a++] = B[S++], A -= 3;
                    A && (F[a++] = B[S++], A > 1 && (F[a++] = B[S++]));
                  } else {
                    S = a - N;
                    do
                      F[a++] = F[S++], F[a++] = F[S++], F[a++] = F[S++], A -= 3;
                    while (A > 2);
                    A && (F[a++] = F[S++], A > 1 && (F[a++] = F[S++]));
                  }
                } else if ((x & 64) === 0) {
                  k = R[(k & 65535) + (g & (1 << x) - 1)];
                  continue n;
                } else {
                  e.msg = "invalid distance code", w.mode = hn;
                  break t;
                }
                break;
              }
          } else if ((x & 64) === 0) {
            k = z[(k & 65535) + (g & (1 << x) - 1)];
            continue e;
          } else if (x & 32) {
            w.mode = Qd;
            break t;
          } else {
            e.msg = "invalid literal/length code", w.mode = hn;
            break t;
          }
          break;
        }
    } while (i < r && a < o);
  A = T >> 3, i -= A, T -= A << 3, g &= (1 << T) - 1, e.next_in = i, e.next_out = a, e.avail_in = i < r ? 5 + (r - i) : 5 - (i - r), e.avail_out = a < o ? 257 + (o - a) : 257 - (a - o), w.hold = g, w.bits = T;
};
const Ne = 15, Or = 852, Cr = 592, Fr = 0, Qn = 1, zr = 2, t0 = new Uint16Array([
  /* Length codes 257..285 base */
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  13,
  15,
  17,
  19,
  23,
  27,
  31,
  35,
  43,
  51,
  59,
  67,
  83,
  99,
  115,
  131,
  163,
  195,
  227,
  258,
  0,
  0
]), e0 = new Uint8Array([
  /* Length codes 257..285 extra */
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  16,
  17,
  17,
  17,
  17,
  18,
  18,
  18,
  18,
  19,
  19,
  19,
  19,
  20,
  20,
  20,
  20,
  21,
  21,
  21,
  21,
  16,
  72,
  78
]), n0 = new Uint16Array([
  /* Distance codes 0..29 base */
  1,
  2,
  3,
  4,
  5,
  7,
  9,
  13,
  17,
  25,
  33,
  49,
  65,
  97,
  129,
  193,
  257,
  385,
  513,
  769,
  1025,
  1537,
  2049,
  3073,
  4097,
  6145,
  8193,
  12289,
  16385,
  24577,
  0,
  0
]), i0 = new Uint8Array([
  /* Distance codes 0..29 extra */
  16,
  16,
  16,
  16,
  17,
  17,
  18,
  18,
  19,
  19,
  20,
  20,
  21,
  21,
  22,
  22,
  23,
  23,
  24,
  24,
  25,
  25,
  26,
  26,
  27,
  27,
  28,
  28,
  29,
  29,
  64,
  64
]), r0 = (t, e, n, i, r, a, s, o) => {
  const c = o.bits;
  let f = 0, u = 0, _ = 0, p = 0, g = 0, T = 0, z = 0, R = 0, $ = 0, E = 0, k, x, A, N, S, B = null, P;
  const F = new Uint16Array(Ne + 1), w = new Uint16Array(Ne + 1);
  let U = null, V, J, et;
  for (f = 0; f <= Ne; f++)
    F[f] = 0;
  for (u = 0; u < i; u++)
    F[e[n + u]]++;
  for (g = c, p = Ne; p >= 1 && F[p] === 0; p--)
    ;
  if (g > p && (g = p), p === 0)
    return r[a++] = 1 << 24 | 64 << 16 | 0, r[a++] = 1 << 24 | 64 << 16 | 0, o.bits = 1, 0;
  for (_ = 1; _ < p && F[_] === 0; _++)
    ;
  for (g < _ && (g = _), R = 1, f = 1; f <= Ne; f++)
    if (R <<= 1, R -= F[f], R < 0)
      return -1;
  if (R > 0 && (t === Fr || p !== 1))
    return -1;
  for (w[1] = 0, f = 1; f < Ne; f++)
    w[f + 1] = w[f] + F[f];
  for (u = 0; u < i; u++)
    e[n + u] !== 0 && (s[w[e[n + u]]++] = u);
  if (t === Fr ? (B = U = s, P = 20) : t === Qn ? (B = t0, U = e0, P = 257) : (B = n0, U = i0, P = 0), E = 0, u = 0, f = _, S = a, T = g, z = 0, A = -1, $ = 1 << g, N = $ - 1, t === Qn && $ > Or || t === zr && $ > Cr)
    return 1;
  for (; ; ) {
    V = f - z, s[u] + 1 < P ? (J = 0, et = s[u]) : s[u] >= P ? (J = U[s[u] - P], et = B[s[u] - P]) : (J = 96, et = 0), k = 1 << f - z, x = 1 << T, _ = x;
    do
      x -= k, r[S + (E >> z) + x] = V << 24 | J << 16 | et | 0;
    while (x !== 0);
    for (k = 1 << f - 1; E & k; )
      k >>= 1;
    if (k !== 0 ? (E &= k - 1, E += k) : E = 0, u++, --F[f] === 0) {
      if (f === p)
        break;
      f = e[n + s[u]];
    }
    if (f > g && (E & N) !== A) {
      for (z === 0 && (z = g), S += _, T = f - z, R = 1 << T; T + z < p && (R -= F[T + z], !(R <= 0)); )
        T++, R <<= 1;
      if ($ += 1 << T, t === Qn && $ > Or || t === zr && $ > Cr)
        return 1;
      A = E & N, r[A] = g << 24 | T << 16 | S - a | 0;
    }
  }
  return E !== 0 && (r[S + E] = f - z << 24 | 64 << 16 | 0), o.bits = g, 0;
};
var Ke = r0;
const a0 = 0, Gs = 1, Zs = 2, {
  Z_FINISH: Br,
  Z_BLOCK: s0,
  Z_TREES: dn,
  Z_OK: Ee,
  Z_STREAM_END: o0,
  Z_NEED_DICT: l0,
  Z_STREAM_ERROR: Yt,
  Z_DATA_ERROR: qs,
  Z_MEM_ERROR: Ws,
  Z_BUF_ERROR: c0,
  Z_DEFLATED: Pr
} = Hs, Zn = 16180, Hr = 16181, Vr = 16182, Ur = 16183, Gr = 16184, Zr = 16185, qr = 16186, Wr = 16187, Xr = 16188, Kr = 16189, Fn = 16190, oe = 16191, jn = 16192, Yr = 16193, ti = 16194, Jr = 16195, Qr = 16196, jr = 16197, ta = 16198, pn = 16199, _n = 16200, ea = 16201, na = 16202, ia = 16203, ra = 16204, aa = 16205, ei = 16206, sa = 16207, oa = 16208, At = 16209, Xs = 16210, Ks = 16211, f0 = 852, u0 = 592, h0 = 15, d0 = h0, la = (t) => (t >>> 24 & 255) + (t >>> 8 & 65280) + ((t & 65280) << 8) + ((t & 255) << 24);
function p0() {
  this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new Uint16Array(320), this.work = new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
}
const Ae = (t) => {
  if (!t)
    return 1;
  const e = t.state;
  return !e || e.strm !== t || e.mode < Zn || e.mode > Ks ? 1 : 0;
}, Ys = (t) => {
  if (Ae(t))
    return Yt;
  const e = t.state;
  return t.total_in = t.total_out = e.total = 0, t.msg = "", e.wrap && (t.adler = e.wrap & 1), e.mode = Zn, e.last = 0, e.havedict = 0, e.flags = -1, e.dmax = 32768, e.head = null, e.hold = 0, e.bits = 0, e.lencode = e.lendyn = new Int32Array(f0), e.distcode = e.distdyn = new Int32Array(u0), e.sane = 1, e.back = -1, Ee;
}, Js = (t) => {
  if (Ae(t))
    return Yt;
  const e = t.state;
  return e.wsize = 0, e.whave = 0, e.wnext = 0, Ys(t);
}, Qs = (t, e) => {
  let n;
  if (Ae(t))
    return Yt;
  const i = t.state;
  return e < 0 ? (n = 0, e = -e) : (n = (e >> 4) + 5, e < 48 && (e &= 15)), e && (e < 8 || e > 15) ? Yt : (i.window !== null && i.wbits !== e && (i.window = null), i.wrap = n, i.wbits = e, Js(t));
}, js = (t, e) => {
  if (!t)
    return Yt;
  const n = new p0();
  t.state = n, n.strm = t, n.window = null, n.mode = Zn;
  const i = Qs(t, e);
  return i !== Ee && (t.state = null), i;
}, _0 = (t) => js(t, d0);
let ca = !0, ni, ii;
const g0 = (t) => {
  if (ca) {
    ni = new Int32Array(512), ii = new Int32Array(32);
    let e = 0;
    for (; e < 144; )
      t.lens[e++] = 8;
    for (; e < 256; )
      t.lens[e++] = 9;
    for (; e < 280; )
      t.lens[e++] = 7;
    for (; e < 288; )
      t.lens[e++] = 8;
    for (Ke(Gs, t.lens, 0, 288, ni, 0, t.work, { bits: 9 }), e = 0; e < 32; )
      t.lens[e++] = 5;
    Ke(Zs, t.lens, 0, 32, ii, 0, t.work, { bits: 5 }), ca = !1;
  }
  t.lencode = ni, t.lenbits = 9, t.distcode = ii, t.distbits = 5;
}, to = (t, e, n, i) => {
  let r;
  const a = t.state;
  return a.window === null && (a.wsize = 1 << a.wbits, a.wnext = 0, a.whave = 0, a.window = new Uint8Array(a.wsize)), i >= a.wsize ? (a.window.set(e.subarray(n - a.wsize, n), 0), a.wnext = 0, a.whave = a.wsize) : (r = a.wsize - a.wnext, r > i && (r = i), a.window.set(e.subarray(n - i, n - i + r), a.wnext), i -= r, i ? (a.window.set(e.subarray(n - i, n), 0), a.wnext = i, a.whave = a.wsize) : (a.wnext += r, a.wnext === a.wsize && (a.wnext = 0), a.whave < a.wsize && (a.whave += r))), 0;
}, m0 = (t, e) => {
  let n, i, r, a, s, o, c, f, u, _, p, g, T, z, R = 0, $, E, k, x, A, N, S, B;
  const P = new Uint8Array(4);
  let F, w;
  const U = (
    /* permutation of code lengths */
    new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
  );
  if (Ae(t) || !t.output || !t.input && t.avail_in !== 0)
    return Yt;
  n = t.state, n.mode === oe && (n.mode = jn), s = t.next_out, r = t.output, c = t.avail_out, a = t.next_in, i = t.input, o = t.avail_in, f = n.hold, u = n.bits, _ = o, p = c, B = Ee;
  t:
    for (; ; )
      switch (n.mode) {
        case Zn:
          if (n.wrap === 0) {
            n.mode = jn;
            break;
          }
          for (; u < 16; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          if (n.wrap & 2 && f === 35615) {
            n.wbits === 0 && (n.wbits = 15), n.check = 0, P[0] = f & 255, P[1] = f >>> 8 & 255, n.check = ne(n.check, P, 2, 0), f = 0, u = 0, n.mode = Hr;
            break;
          }
          if (n.head && (n.head.done = !1), !(n.wrap & 1) || /* check if zlib header allowed */
          (((f & 255) << 8) + (f >> 8)) % 31) {
            t.msg = "incorrect header check", n.mode = At;
            break;
          }
          if ((f & 15) !== Pr) {
            t.msg = "unknown compression method", n.mode = At;
            break;
          }
          if (f >>>= 4, u -= 4, S = (f & 15) + 8, n.wbits === 0 && (n.wbits = S), S > 15 || S > n.wbits) {
            t.msg = "invalid window size", n.mode = At;
            break;
          }
          n.dmax = 1 << n.wbits, n.flags = 0, t.adler = n.check = 1, n.mode = f & 512 ? Kr : oe, f = 0, u = 0;
          break;
        case Hr:
          for (; u < 16; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          if (n.flags = f, (n.flags & 255) !== Pr) {
            t.msg = "unknown compression method", n.mode = At;
            break;
          }
          if (n.flags & 57344) {
            t.msg = "unknown header flags set", n.mode = At;
            break;
          }
          n.head && (n.head.text = f >> 8 & 1), n.flags & 512 && n.wrap & 4 && (P[0] = f & 255, P[1] = f >>> 8 & 255, n.check = ne(n.check, P, 2, 0)), f = 0, u = 0, n.mode = Vr;
        /* falls through */
        case Vr:
          for (; u < 32; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          n.head && (n.head.time = f), n.flags & 512 && n.wrap & 4 && (P[0] = f & 255, P[1] = f >>> 8 & 255, P[2] = f >>> 16 & 255, P[3] = f >>> 24 & 255, n.check = ne(n.check, P, 4, 0)), f = 0, u = 0, n.mode = Ur;
        /* falls through */
        case Ur:
          for (; u < 16; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          n.head && (n.head.xflags = f & 255, n.head.os = f >> 8), n.flags & 512 && n.wrap & 4 && (P[0] = f & 255, P[1] = f >>> 8 & 255, n.check = ne(n.check, P, 2, 0)), f = 0, u = 0, n.mode = Gr;
        /* falls through */
        case Gr:
          if (n.flags & 1024) {
            for (; u < 16; ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            n.length = f, n.head && (n.head.extra_len = f), n.flags & 512 && n.wrap & 4 && (P[0] = f & 255, P[1] = f >>> 8 & 255, n.check = ne(n.check, P, 2, 0)), f = 0, u = 0;
          } else n.head && (n.head.extra = null);
          n.mode = Zr;
        /* falls through */
        case Zr:
          if (n.flags & 1024 && (g = n.length, g > o && (g = o), g && (n.head && (S = n.head.extra_len - n.length, n.head.extra || (n.head.extra = new Uint8Array(n.head.extra_len)), n.head.extra.set(
            i.subarray(
              a,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              a + g
            ),
            /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
            S
          )), n.flags & 512 && n.wrap & 4 && (n.check = ne(n.check, i, g, a)), o -= g, a += g, n.length -= g), n.length))
            break t;
          n.length = 0, n.mode = qr;
        /* falls through */
        case qr:
          if (n.flags & 2048) {
            if (o === 0)
              break t;
            g = 0;
            do
              S = i[a + g++], n.head && S && n.length < 65536 && (n.head.name += String.fromCharCode(S));
            while (S && g < o);
            if (n.flags & 512 && n.wrap & 4 && (n.check = ne(n.check, i, g, a)), o -= g, a += g, S)
              break t;
          } else n.head && (n.head.name = null);
          n.length = 0, n.mode = Wr;
        /* falls through */
        case Wr:
          if (n.flags & 4096) {
            if (o === 0)
              break t;
            g = 0;
            do
              S = i[a + g++], n.head && S && n.length < 65536 && (n.head.comment += String.fromCharCode(S));
            while (S && g < o);
            if (n.flags & 512 && n.wrap & 4 && (n.check = ne(n.check, i, g, a)), o -= g, a += g, S)
              break t;
          } else n.head && (n.head.comment = null);
          n.mode = Xr;
        /* falls through */
        case Xr:
          if (n.flags & 512) {
            for (; u < 16; ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            if (n.wrap & 4 && f !== (n.check & 65535)) {
              t.msg = "header crc mismatch", n.mode = At;
              break;
            }
            f = 0, u = 0;
          }
          n.head && (n.head.hcrc = n.flags >> 9 & 1, n.head.done = !0), t.adler = n.check = 0, n.mode = oe;
          break;
        case Kr:
          for (; u < 32; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          t.adler = n.check = la(f), f = 0, u = 0, n.mode = Fn;
        /* falls through */
        case Fn:
          if (n.havedict === 0)
            return t.next_out = s, t.avail_out = c, t.next_in = a, t.avail_in = o, n.hold = f, n.bits = u, l0;
          t.adler = n.check = 1, n.mode = oe;
        /* falls through */
        case oe:
          if (e === s0 || e === dn)
            break t;
        /* falls through */
        case jn:
          if (n.last) {
            f >>>= u & 7, u -= u & 7, n.mode = ei;
            break;
          }
          for (; u < 3; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          switch (n.last = f & 1, f >>>= 1, u -= 1, f & 3) {
            case 0:
              n.mode = Yr;
              break;
            case 1:
              if (g0(n), n.mode = pn, e === dn) {
                f >>>= 2, u -= 2;
                break t;
              }
              break;
            case 2:
              n.mode = Qr;
              break;
            case 3:
              t.msg = "invalid block type", n.mode = At;
          }
          f >>>= 2, u -= 2;
          break;
        case Yr:
          for (f >>>= u & 7, u -= u & 7; u < 32; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          if ((f & 65535) !== (f >>> 16 ^ 65535)) {
            t.msg = "invalid stored block lengths", n.mode = At;
            break;
          }
          if (n.length = f & 65535, f = 0, u = 0, n.mode = ti, e === dn)
            break t;
        /* falls through */
        case ti:
          n.mode = Jr;
        /* falls through */
        case Jr:
          if (g = n.length, g) {
            if (g > o && (g = o), g > c && (g = c), g === 0)
              break t;
            r.set(i.subarray(a, a + g), s), o -= g, a += g, c -= g, s += g, n.length -= g;
            break;
          }
          n.mode = oe;
          break;
        case Qr:
          for (; u < 14; ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          if (n.nlen = (f & 31) + 257, f >>>= 5, u -= 5, n.ndist = (f & 31) + 1, f >>>= 5, u -= 5, n.ncode = (f & 15) + 4, f >>>= 4, u -= 4, n.nlen > 286 || n.ndist > 30) {
            t.msg = "too many length or distance symbols", n.mode = At;
            break;
          }
          n.have = 0, n.mode = jr;
        /* falls through */
        case jr:
          for (; n.have < n.ncode; ) {
            for (; u < 3; ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            n.lens[U[n.have++]] = f & 7, f >>>= 3, u -= 3;
          }
          for (; n.have < 19; )
            n.lens[U[n.have++]] = 0;
          if (n.lencode = n.lendyn, n.lenbits = 7, F = { bits: n.lenbits }, B = Ke(a0, n.lens, 0, 19, n.lencode, 0, n.work, F), n.lenbits = F.bits, B) {
            t.msg = "invalid code lengths set", n.mode = At;
            break;
          }
          n.have = 0, n.mode = ta;
        /* falls through */
        case ta:
          for (; n.have < n.nlen + n.ndist; ) {
            for (; R = n.lencode[f & (1 << n.lenbits) - 1], $ = R >>> 24, E = R >>> 16 & 255, k = R & 65535, !($ <= u); ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            if (k < 16)
              f >>>= $, u -= $, n.lens[n.have++] = k;
            else {
              if (k === 16) {
                for (w = $ + 2; u < w; ) {
                  if (o === 0)
                    break t;
                  o--, f += i[a++] << u, u += 8;
                }
                if (f >>>= $, u -= $, n.have === 0) {
                  t.msg = "invalid bit length repeat", n.mode = At;
                  break;
                }
                S = n.lens[n.have - 1], g = 3 + (f & 3), f >>>= 2, u -= 2;
              } else if (k === 17) {
                for (w = $ + 3; u < w; ) {
                  if (o === 0)
                    break t;
                  o--, f += i[a++] << u, u += 8;
                }
                f >>>= $, u -= $, S = 0, g = 3 + (f & 7), f >>>= 3, u -= 3;
              } else {
                for (w = $ + 7; u < w; ) {
                  if (o === 0)
                    break t;
                  o--, f += i[a++] << u, u += 8;
                }
                f >>>= $, u -= $, S = 0, g = 11 + (f & 127), f >>>= 7, u -= 7;
              }
              if (n.have + g > n.nlen + n.ndist) {
                t.msg = "invalid bit length repeat", n.mode = At;
                break;
              }
              for (; g--; )
                n.lens[n.have++] = S;
            }
          }
          if (n.mode === At)
            break;
          if (n.lens[256] === 0) {
            t.msg = "invalid code -- missing end-of-block", n.mode = At;
            break;
          }
          if (n.lenbits = 9, F = { bits: n.lenbits }, B = Ke(Gs, n.lens, 0, n.nlen, n.lencode, 0, n.work, F), n.lenbits = F.bits, B) {
            t.msg = "invalid literal/lengths set", n.mode = At;
            break;
          }
          if (n.distbits = 6, n.distcode = n.distdyn, F = { bits: n.distbits }, B = Ke(Zs, n.lens, n.nlen, n.ndist, n.distcode, 0, n.work, F), n.distbits = F.bits, B) {
            t.msg = "invalid distances set", n.mode = At;
            break;
          }
          if (n.mode = pn, e === dn)
            break t;
        /* falls through */
        case pn:
          n.mode = _n;
        /* falls through */
        case _n:
          if (o >= 6 && c >= 258) {
            t.next_out = s, t.avail_out = c, t.next_in = a, t.avail_in = o, n.hold = f, n.bits = u, jd(t, p), s = t.next_out, r = t.output, c = t.avail_out, a = t.next_in, i = t.input, o = t.avail_in, f = n.hold, u = n.bits, n.mode === oe && (n.back = -1);
            break;
          }
          for (n.back = 0; R = n.lencode[f & (1 << n.lenbits) - 1], $ = R >>> 24, E = R >>> 16 & 255, k = R & 65535, !($ <= u); ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          if (E && (E & 240) === 0) {
            for (x = $, A = E, N = k; R = n.lencode[N + ((f & (1 << x + A) - 1) >> x)], $ = R >>> 24, E = R >>> 16 & 255, k = R & 65535, !(x + $ <= u); ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            f >>>= x, u -= x, n.back += x;
          }
          if (f >>>= $, u -= $, n.back += $, n.length = k, E === 0) {
            n.mode = aa;
            break;
          }
          if (E & 32) {
            n.back = -1, n.mode = oe;
            break;
          }
          if (E & 64) {
            t.msg = "invalid literal/length code", n.mode = At;
            break;
          }
          n.extra = E & 15, n.mode = ea;
        /* falls through */
        case ea:
          if (n.extra) {
            for (w = n.extra; u < w; ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            n.length += f & (1 << n.extra) - 1, f >>>= n.extra, u -= n.extra, n.back += n.extra;
          }
          n.was = n.length, n.mode = na;
        /* falls through */
        case na:
          for (; R = n.distcode[f & (1 << n.distbits) - 1], $ = R >>> 24, E = R >>> 16 & 255, k = R & 65535, !($ <= u); ) {
            if (o === 0)
              break t;
            o--, f += i[a++] << u, u += 8;
          }
          if ((E & 240) === 0) {
            for (x = $, A = E, N = k; R = n.distcode[N + ((f & (1 << x + A) - 1) >> x)], $ = R >>> 24, E = R >>> 16 & 255, k = R & 65535, !(x + $ <= u); ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            f >>>= x, u -= x, n.back += x;
          }
          if (f >>>= $, u -= $, n.back += $, E & 64) {
            t.msg = "invalid distance code", n.mode = At;
            break;
          }
          n.offset = k, n.extra = E & 15, n.mode = ia;
        /* falls through */
        case ia:
          if (n.extra) {
            for (w = n.extra; u < w; ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            n.offset += f & (1 << n.extra) - 1, f >>>= n.extra, u -= n.extra, n.back += n.extra;
          }
          if (n.offset > n.dmax) {
            t.msg = "invalid distance too far back", n.mode = At;
            break;
          }
          n.mode = ra;
        /* falls through */
        case ra:
          if (c === 0)
            break t;
          if (g = p - c, n.offset > g) {
            if (g = n.offset - g, g > n.whave && n.sane) {
              t.msg = "invalid distance too far back", n.mode = At;
              break;
            }
            g > n.wnext ? (g -= n.wnext, T = n.wsize - g) : T = n.wnext - g, g > n.length && (g = n.length), z = n.window;
          } else
            z = r, T = s - n.offset, g = n.length;
          g > c && (g = c), c -= g, n.length -= g;
          do
            r[s++] = z[T++];
          while (--g);
          n.length === 0 && (n.mode = _n);
          break;
        case aa:
          if (c === 0)
            break t;
          r[s++] = n.length, c--, n.mode = _n;
          break;
        case ei:
          if (n.wrap) {
            for (; u < 32; ) {
              if (o === 0)
                break t;
              o--, f |= i[a++] << u, u += 8;
            }
            if (p -= c, t.total_out += p, n.total += p, n.wrap & 4 && p && (t.adler = n.check = /*UPDATE_CHECK(state.check, put - _out, _out);*/
            n.flags ? ne(n.check, r, p, s - p) : Mi(n.check, r, p, s - p)), p = c, n.wrap & 4 && (n.flags ? f : la(f)) !== n.check) {
              t.msg = "incorrect data check", n.mode = At;
              break;
            }
            f = 0, u = 0;
          }
          n.mode = sa;
        /* falls through */
        case sa:
          if (n.wrap && n.flags) {
            for (; u < 32; ) {
              if (o === 0)
                break t;
              o--, f += i[a++] << u, u += 8;
            }
            if (n.wrap & 4 && f !== (n.total & 4294967295)) {
              t.msg = "incorrect length check", n.mode = At;
              break;
            }
            f = 0, u = 0;
          }
          n.mode = oa;
        /* falls through */
        case oa:
          B = o0;
          break t;
        case At:
          B = qs;
          break t;
        case Xs:
          return Ws;
        case Ks:
        /* falls through */
        default:
          return Yt;
      }
  return t.next_out = s, t.avail_out = c, t.next_in = a, t.avail_in = o, n.hold = f, n.bits = u, (n.wsize || p !== t.avail_out && n.mode < At && (n.mode < ei || e !== Br)) && to(t, t.output, t.next_out, p - t.avail_out), _ -= t.avail_in, p -= t.avail_out, t.total_in += _, t.total_out += p, n.total += p, n.wrap & 4 && p && (t.adler = n.check = /*UPDATE_CHECK(state.check, strm.next_out - _out, _out);*/
  n.flags ? ne(n.check, r, p, t.next_out - p) : Mi(n.check, r, p, t.next_out - p)), t.data_type = n.bits + (n.last ? 64 : 0) + (n.mode === oe ? 128 : 0) + (n.mode === pn || n.mode === ti ? 256 : 0), (_ === 0 && p === 0 || e === Br) && B === Ee && (B = c0), B;
}, v0 = (t) => {
  if (Ae(t))
    return Yt;
  let e = t.state;
  return e.window && (e.window = null), t.state = null, Ee;
}, w0 = (t, e) => {
  if (Ae(t))
    return Yt;
  const n = t.state;
  return (n.wrap & 2) === 0 ? Yt : (n.head = e, e.done = !1, Ee);
}, y0 = (t, e) => {
  const n = e.length;
  let i, r, a;
  return Ae(t) || (i = t.state, i.wrap !== 0 && i.mode !== Fn) ? Yt : i.mode === Fn && (r = 1, r = Mi(r, e, n, 0), r !== i.check) ? qs : (a = to(t, e, n, n), a ? (i.mode = Xs, Ws) : (i.havedict = 1, Ee));
};
var x0 = Js, b0 = Qs, k0 = Ys, T0 = _0, E0 = js, S0 = m0, A0 = v0, $0 = w0, N0 = y0, I0 = "pako inflate (from Nodeca project)", le = {
  inflateReset: x0,
  inflateReset2: b0,
  inflateResetKeep: k0,
  inflateInit: T0,
  inflateInit2: E0,
  inflate: S0,
  inflateEnd: A0,
  inflateGetHeader: $0,
  inflateSetDictionary: N0,
  inflateInfo: I0
};
function D0() {
  this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
}
var R0 = D0;
const eo = Object.prototype.toString, {
  Z_NO_FLUSH: M0,
  Z_FINISH: L0,
  Z_OK: tn,
  Z_STREAM_END: ri,
  Z_NEED_DICT: ai,
  Z_STREAM_ERROR: O0,
  Z_DATA_ERROR: fa,
  Z_MEM_ERROR: C0
} = Hs;
function qn(t) {
  this.options = Vs.assign({
    chunkSize: 1024 * 64,
    windowBits: 15,
    to: ""
  }, t || {});
  const e = this.options;
  e.raw && e.windowBits >= 0 && e.windowBits < 16 && (e.windowBits = -e.windowBits, e.windowBits === 0 && (e.windowBits = -15)), e.windowBits >= 0 && e.windowBits < 16 && !(t && t.windowBits) && (e.windowBits += 32), e.windowBits > 15 && e.windowBits < 48 && (e.windowBits & 15) === 0 && (e.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new Jd(), this.strm.avail_out = 0;
  let n = le.inflateInit2(
    this.strm,
    e.windowBits
  );
  if (n !== tn)
    throw new Error(Li[n]);
  if (this.header = new R0(), le.inflateGetHeader(this.strm, this.header), e.dictionary && (typeof e.dictionary == "string" ? e.dictionary = Oi.string2buf(e.dictionary) : eo.call(e.dictionary) === "[object ArrayBuffer]" && (e.dictionary = new Uint8Array(e.dictionary)), e.raw && (n = le.inflateSetDictionary(this.strm, e.dictionary), n !== tn)))
    throw new Error(Li[n]);
}
qn.prototype.push = function(t, e) {
  const n = this.strm, i = this.options.chunkSize, r = this.options.dictionary;
  let a, s, o;
  if (this.ended) return !1;
  for (e === ~~e ? s = e : s = e === !0 ? L0 : M0, eo.call(t) === "[object ArrayBuffer]" ? n.input = new Uint8Array(t) : n.input = t, n.next_in = 0, n.avail_in = n.input.length; ; ) {
    for (n.avail_out === 0 && (n.output = new Uint8Array(i), n.next_out = 0, n.avail_out = i), a = le.inflate(n, s), a === ai && r && (a = le.inflateSetDictionary(n, r), a === tn ? a = le.inflate(n, s) : a === fa && (a = ai)); n.avail_in > 0 && a === ri && n.state.wrap > 0 && t[n.next_in] !== 0; )
      le.inflateReset(n), a = le.inflate(n, s);
    switch (a) {
      case O0:
      case fa:
      case ai:
      case C0:
        return this.onEnd(a), this.ended = !0, !1;
    }
    if (o = n.avail_out, n.next_out && (n.avail_out === 0 || a === ri))
      if (this.options.to === "string") {
        let c = Oi.utf8border(n.output, n.next_out), f = n.next_out - c, u = Oi.buf2string(n.output, c);
        n.next_out = f, n.avail_out = i - f, f && n.output.set(n.output.subarray(c, c + f), 0), this.onData(u);
      } else
        this.onData(n.output.length === n.next_out ? n.output : n.output.subarray(0, n.next_out));
    if (!(a === tn && o === 0)) {
      if (a === ri)
        return a = le.inflateEnd(this.strm), this.onEnd(a), this.ended = !0, !0;
      if (n.avail_in === 0) break;
    }
  }
  return !0;
};
qn.prototype.onData = function(t) {
  this.chunks.push(t);
};
qn.prototype.onEnd = function(t) {
  t === tn && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = Vs.flattenChunks(this.chunks)), this.chunks = [], this.err = t, this.msg = this.strm.msg;
};
function F0(t, e) {
  const n = new qn(e);
  if (n.push(t), n.err) throw n.msg || Li[n.err];
  return n.result;
}
var z0 = F0, B0 = {
  inflate: z0
};
const { inflate: P0 } = B0;
var H0 = P0;
const V0 = { refName: "seq_id" }, U0 = { seq_id: "refName" };
class zn {
  constructor(e, n, i) {
    this.ncFeature = e, this.uniqueId = i || e.id(), this.parentHandle = n;
  }
  jb2TagToJb1Tag(e) {
    return (V0[e] || e).toLowerCase();
  }
  jb1TagToJb2Tag(e) {
    const n = e.toLowerCase();
    return U0[n] || n;
  }
  get(e) {
    const n = this.ncFeature.get(this.jb2TagToJb1Tag(e));
    return n && e === "subfeatures" ? n.map((i) => new zn(i, this)) : n;
  }
  /**
   * Get an array listing which data keys are present in this feature.
   */
  tags() {
    return this.ncFeature.tags().map((e) => this.jb1TagToJb2Tag(e));
  }
  /**
   * Get the unique ID of this feature.
   */
  id() {
    return this.uniqueId;
  }
  /**
   * Get this feature's parent feature, or undefined if none.
   */
  parent() {
    return this.parentHandle;
  }
  /**
   * Get an array of child features, or undefined if none.
   */
  children() {
    return this.get("subfeatures");
  }
  toJSON() {
    const e = { uniqueId: this.id(), subfeatures: [] };
    return this.ncFeature.tags().forEach((n) => {
      const i = this.jb1TagToJb2Tag(n), r = this.ncFeature.get(n);
      i === "subfeatures" ? e.children = (r || []).map(
        (a) => new zn(a, this).toJSON()
      ) : e[i] = r;
    }), {
      ...e,
      fmin: e.start,
      fmax: e.end,
      seqId: e.refName
    };
  }
}
function G0(t) {
  return t[0] === 31 && t[1] === 139 && t[2] === 8;
}
async function Z0(t) {
  const e = await fetch(t);
  if (!e.ok)
    throw new Error(`HTTP ${e.status} fetching ${t}`);
  const n = await e.arrayBuffer();
  return G0(new Uint8Array(n)) ? H0(n) : n;
}
async function Np({
  urlTemplate: t,
  baseUrl: e,
  region: n
}) {
  const i = new Ad({
    urlTemplate: t,
    baseUrl: e,
    readFile: Z0
  }), r = [];
  for await (const a of i.getFeatures({
    refName: n.chromosome,
    start: n.start,
    end: n.end
  }))
    r.push(new zn(a).toJSON());
  return r;
}
async function Ip({
  region: t,
  baseUrl: e,
  genome: n,
  track: i,
  extra: r = ".json?ignoreCache=true&flatten=false"
}) {
  const a = `${t.chromosome}:${t.start}..${t.end}`, s = `${e}/${encodeURI(n)}/${encodeURI(i)}/${encodeURIComponent(a)}${r}`, o = await fetch(s);
  if (!o.ok)
    throw new Error(`HTTP ${o.status} fetching ${s}`);
  return o.json();
}
const gn = {};
function ua(t) {
  return (typeof t == "object" && t !== null && "message" in t ? t.message : `${t}`).replace(/\.$/, "");
}
class we {
  constructor(e, n = {}) {
    this.baseOverrides = {}, this.url = e;
    const i = n.fetch || globalThis.fetch.bind(globalThis);
    n.overrides && (this.baseOverrides = n.overrides), this.fetchImplementation = i;
  }
  async fetch(e, n) {
    let i;
    try {
      i = await this.fetchImplementation(e, n);
    } catch (r) {
      if (`${r}`.includes("Failed to fetch")) {
        console.warn(`generic-filehandle: refetching ${e} to attempt to work around chrome CORS header caching bug`);
        try {
          i = await this.fetchImplementation(e, {
            ...n,
            cache: "reload"
          });
        } catch (a) {
          throw new Error(`${ua(a)} fetching ${e}`, { cause: a });
        }
      } else
        throw new Error(`${ua(r)} fetching ${e}`, { cause: r });
    }
    return i;
  }
  async read(e, n, i = {}) {
    const { headers: r = {}, signal: a, overrides: s = {} } = i;
    e < 1 / 0 ? r.range = `bytes=${n}-${n + e}` : e === 1 / 0 && n !== 0 && (r.range = `bytes=${n}-`);
    const o = await this.fetch(this.url, {
      ...this.baseOverrides,
      ...s,
      headers: {
        ...r,
        ...s.headers,
        ...this.baseOverrides.headers
      },
      method: "GET",
      redirect: "follow",
      mode: "cors",
      signal: a
    });
    if (!o.ok)
      throw new Error(`HTTP ${o.status} fetching ${this.url}`);
    if (o.status === 200 && n === 0 || o.status === 206) {
      const c = await o.arrayBuffer(), f = o.headers.get("content-range"), u = /\/(\d+)$/.exec(f || "");
      return u?.[1] && (this._stat = {
        size: parseInt(u[1], 10)
      }), new Uint8Array(c.slice(0, e));
    }
    throw o.status === 200 ? new Error(`${this.url} fetch returned status 200, expected 206`) : new Error(`HTTP ${o.status} fetching ${this.url}`);
  }
  async readFile(e = {}) {
    let n, i;
    typeof e == "string" ? (n = e, i = {}) : (n = e.encoding, i = e, delete i.encoding);
    const { headers: r = {}, signal: a, overrides: s = {} } = i, o = await this.fetch(this.url, {
      headers: r,
      method: "GET",
      redirect: "follow",
      mode: "cors",
      signal: a,
      ...this.baseOverrides,
      ...s
    });
    if (o.status !== 200)
      throw new Error(`HTTP ${o.status} fetching ${this.url}`);
    if (n === "utf8")
      return o.text();
    if (n)
      throw new Error(`unsupported encoding: ${n}`);
    return new Uint8Array(await o.arrayBuffer());
  }
  async stat() {
    if (!this._stat && (await this.read(10, 0), !this._stat))
      throw new Error(`unable to determine size of file at ${this.url}`);
    return this._stat;
  }
  async close() {
  }
}
var si = {}, ha;
function he() {
  return ha || (ha = 1, function(t) {
    var e = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
    function n(a, s) {
      return Object.prototype.hasOwnProperty.call(a, s);
    }
    t.assign = function(a) {
      for (var s = Array.prototype.slice.call(arguments, 1); s.length; ) {
        var o = s.shift();
        if (o) {
          if (typeof o != "object")
            throw new TypeError(o + "must be non-object");
          for (var c in o)
            n(o, c) && (a[c] = o[c]);
        }
      }
      return a;
    }, t.shrinkBuf = function(a, s) {
      return a.length === s ? a : a.subarray ? a.subarray(0, s) : (a.length = s, a);
    };
    var i = {
      arraySet: function(a, s, o, c, f) {
        if (s.subarray && a.subarray) {
          a.set(s.subarray(o, o + c), f);
          return;
        }
        for (var u = 0; u < c; u++)
          a[f + u] = s[o + u];
      },
      // Join array of chunks to single array.
      flattenChunks: function(a) {
        var s, o, c, f, u, _;
        for (c = 0, s = 0, o = a.length; s < o; s++)
          c += a[s].length;
        for (_ = new Uint8Array(c), f = 0, s = 0, o = a.length; s < o; s++)
          u = a[s], _.set(u, f), f += u.length;
        return _;
      }
    }, r = {
      arraySet: function(a, s, o, c, f) {
        for (var u = 0; u < c; u++)
          a[f + u] = s[o + u];
      },
      // Join array of chunks to single array.
      flattenChunks: function(a) {
        return [].concat.apply([], a);
      }
    };
    t.setTyped = function(a) {
      a ? (t.Buf8 = Uint8Array, t.Buf16 = Uint16Array, t.Buf32 = Int32Array, t.assign(t, i)) : (t.Buf8 = Array, t.Buf16 = Array, t.Buf32 = Array, t.assign(t, r));
    }, t.setTyped(e);
  }(si)), si;
}
var Ie = {}, Jt = {}, _e = {}, da;
function q0() {
  if (da) return _e;
  da = 1;
  var t = he(), e = 4, n = 0, i = 1, r = 2;
  function a(m) {
    for (var M = m.length; --M >= 0; )
      m[M] = 0;
  }
  var s = 0, o = 1, c = 2, f = 3, u = 258, _ = 29, p = 256, g = p + 1 + _, T = 30, z = 19, R = 2 * g + 1, $ = 15, E = 16, k = 7, x = 256, A = 16, N = 17, S = 18, B = (
    /* extra bits for each length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
  ), P = (
    /* extra bits for each distance code */
    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
  ), F = (
    /* extra bits for each bit length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
  ), w = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], U = 512, V = new Array((g + 2) * 2);
  a(V);
  var J = new Array(T * 2);
  a(J);
  var et = new Array(U);
  a(et);
  var at = new Array(u - f + 1);
  a(at);
  var C = new Array(_);
  a(C);
  var tt = new Array(T);
  a(tt);
  function it(m, M, I, q, y) {
    this.static_tree = m, this.extra_bits = M, this.extra_base = I, this.elems = q, this.max_length = y, this.has_stree = m && m.length;
  }
  var nt, Q, _t;
  function ot(m, M) {
    this.dyn_tree = m, this.max_code = 0, this.stat_desc = M;
  }
  function xt(m) {
    return m < 256 ? et[m] : et[256 + (m >>> 7)];
  }
  function yt(m, M) {
    m.pending_buf[m.pending++] = M & 255, m.pending_buf[m.pending++] = M >>> 8 & 255;
  }
  function rt(m, M, I) {
    m.bi_valid > E - I ? (m.bi_buf |= M << m.bi_valid & 65535, yt(m, m.bi_buf), m.bi_buf = M >> E - m.bi_valid, m.bi_valid += I - E) : (m.bi_buf |= M << m.bi_valid & 65535, m.bi_valid += I);
  }
  function dt(m, M, I) {
    rt(
      m,
      I[M * 2],
      I[M * 2 + 1]
      /*.Len*/
    );
  }
  function st(m, M) {
    var I = 0;
    do
      I |= m & 1, m >>>= 1, I <<= 1;
    while (--M > 0);
    return I >>> 1;
  }
  function kt(m) {
    m.bi_valid === 16 ? (yt(m, m.bi_buf), m.bi_buf = 0, m.bi_valid = 0) : m.bi_valid >= 8 && (m.pending_buf[m.pending++] = m.bi_buf & 255, m.bi_buf >>= 8, m.bi_valid -= 8);
  }
  function Dt(m, M) {
    var I = M.dyn_tree, q = M.max_code, y = M.stat_desc.static_tree, L = M.stat_desc.has_stree, h = M.stat_desc.extra_bits, H = M.stat_desc.extra_base, j = M.stat_desc.max_length, l, D, O, d, v, b, X = 0;
    for (d = 0; d <= $; d++)
      m.bl_count[d] = 0;
    for (I[m.heap[m.heap_max] * 2 + 1] = 0, l = m.heap_max + 1; l < R; l++)
      D = m.heap[l], d = I[I[D * 2 + 1] * 2 + 1] + 1, d > j && (d = j, X++), I[D * 2 + 1] = d, !(D > q) && (m.bl_count[d]++, v = 0, D >= H && (v = h[D - H]), b = I[D * 2], m.opt_len += b * (d + v), L && (m.static_len += b * (y[D * 2 + 1] + v)));
    if (X !== 0) {
      do {
        for (d = j - 1; m.bl_count[d] === 0; )
          d--;
        m.bl_count[d]--, m.bl_count[d + 1] += 2, m.bl_count[j]--, X -= 2;
      } while (X > 0);
      for (d = j; d !== 0; d--)
        for (D = m.bl_count[d]; D !== 0; )
          O = m.heap[--l], !(O > q) && (I[O * 2 + 1] !== d && (m.opt_len += (d - I[O * 2 + 1]) * I[O * 2], I[O * 2 + 1] = d), D--);
    }
  }
  function Et(m, M, I) {
    var q = new Array($ + 1), y = 0, L, h;
    for (L = 1; L <= $; L++)
      q[L] = y = y + I[L - 1] << 1;
    for (h = 0; h <= M; h++) {
      var H = m[h * 2 + 1];
      H !== 0 && (m[h * 2] = st(q[H]++, H));
    }
  }
  function lt() {
    var m, M, I, q, y, L = new Array($ + 1);
    for (I = 0, q = 0; q < _ - 1; q++)
      for (C[q] = I, m = 0; m < 1 << B[q]; m++)
        at[I++] = q;
    for (at[I - 1] = q, y = 0, q = 0; q < 16; q++)
      for (tt[q] = y, m = 0; m < 1 << P[q]; m++)
        et[y++] = q;
    for (y >>= 7; q < T; q++)
      for (tt[q] = y << 7, m = 0; m < 1 << P[q] - 7; m++)
        et[256 + y++] = q;
    for (M = 0; M <= $; M++)
      L[M] = 0;
    for (m = 0; m <= 143; )
      V[m * 2 + 1] = 8, m++, L[8]++;
    for (; m <= 255; )
      V[m * 2 + 1] = 9, m++, L[9]++;
    for (; m <= 279; )
      V[m * 2 + 1] = 7, m++, L[7]++;
    for (; m <= 287; )
      V[m * 2 + 1] = 8, m++, L[8]++;
    for (Et(V, g + 1, L), m = 0; m < T; m++)
      J[m * 2 + 1] = 5, J[m * 2] = st(m, 5);
    nt = new it(V, B, p + 1, g, $), Q = new it(J, P, 0, T, $), _t = new it(new Array(0), F, 0, z, k);
  }
  function Y(m) {
    var M;
    for (M = 0; M < g; M++)
      m.dyn_ltree[M * 2] = 0;
    for (M = 0; M < T; M++)
      m.dyn_dtree[M * 2] = 0;
    for (M = 0; M < z; M++)
      m.bl_tree[M * 2] = 0;
    m.dyn_ltree[x * 2] = 1, m.opt_len = m.static_len = 0, m.last_lit = m.matches = 0;
  }
  function vt(m) {
    m.bi_valid > 8 ? yt(m, m.bi_buf) : m.bi_valid > 0 && (m.pending_buf[m.pending++] = m.bi_buf), m.bi_buf = 0, m.bi_valid = 0;
  }
  function pt(m, M, I, q) {
    vt(m), yt(m, I), yt(m, ~I), t.arraySet(m.pending_buf, m.window, M, I, m.pending), m.pending += I;
  }
  function mt(m, M, I, q) {
    var y = M * 2, L = I * 2;
    return m[y] < m[L] || m[y] === m[L] && q[M] <= q[I];
  }
  function bt(m, M, I) {
    for (var q = m.heap[I], y = I << 1; y <= m.heap_len && (y < m.heap_len && mt(M, m.heap[y + 1], m.heap[y], m.depth) && y++, !mt(M, q, m.heap[y], m.depth)); )
      m.heap[I] = m.heap[y], I = y, y <<= 1;
    m.heap[I] = q;
  }
  function G(m, M, I) {
    var q, y, L = 0, h, H;
    if (m.last_lit !== 0)
      do
        q = m.pending_buf[m.d_buf + L * 2] << 8 | m.pending_buf[m.d_buf + L * 2 + 1], y = m.pending_buf[m.l_buf + L], L++, q === 0 ? dt(m, y, M) : (h = at[y], dt(m, h + p + 1, M), H = B[h], H !== 0 && (y -= C[h], rt(m, y, H)), q--, h = xt(q), dt(m, h, I), H = P[h], H !== 0 && (q -= tt[h], rt(m, q, H)));
      while (L < m.last_lit);
    dt(m, x, M);
  }
  function Mt(m, M) {
    var I = M.dyn_tree, q = M.stat_desc.static_tree, y = M.stat_desc.has_stree, L = M.stat_desc.elems, h, H, j = -1, l;
    for (m.heap_len = 0, m.heap_max = R, h = 0; h < L; h++)
      I[h * 2] !== 0 ? (m.heap[++m.heap_len] = j = h, m.depth[h] = 0) : I[h * 2 + 1] = 0;
    for (; m.heap_len < 2; )
      l = m.heap[++m.heap_len] = j < 2 ? ++j : 0, I[l * 2] = 1, m.depth[l] = 0, m.opt_len--, y && (m.static_len -= q[l * 2 + 1]);
    for (M.max_code = j, h = m.heap_len >> 1; h >= 1; h--)
      bt(m, I, h);
    l = L;
    do
      h = m.heap[
        1
        /*SMALLEST*/
      ], m.heap[
        1
        /*SMALLEST*/
      ] = m.heap[m.heap_len--], bt(
        m,
        I,
        1
        /*SMALLEST*/
      ), H = m.heap[
        1
        /*SMALLEST*/
      ], m.heap[--m.heap_max] = h, m.heap[--m.heap_max] = H, I[l * 2] = I[h * 2] + I[H * 2], m.depth[l] = (m.depth[h] >= m.depth[H] ? m.depth[h] : m.depth[H]) + 1, I[h * 2 + 1] = I[H * 2 + 1] = l, m.heap[
        1
        /*SMALLEST*/
      ] = l++, bt(
        m,
        I,
        1
        /*SMALLEST*/
      );
    while (m.heap_len >= 2);
    m.heap[--m.heap_max] = m.heap[
      1
      /*SMALLEST*/
    ], Dt(m, M), Et(I, j, m.bl_count);
  }
  function zt(m, M, I) {
    var q, y = -1, L, h = M[0 * 2 + 1], H = 0, j = 7, l = 4;
    for (h === 0 && (j = 138, l = 3), M[(I + 1) * 2 + 1] = 65535, q = 0; q <= I; q++)
      L = h, h = M[(q + 1) * 2 + 1], !(++H < j && L === h) && (H < l ? m.bl_tree[L * 2] += H : L !== 0 ? (L !== y && m.bl_tree[L * 2]++, m.bl_tree[A * 2]++) : H <= 10 ? m.bl_tree[N * 2]++ : m.bl_tree[S * 2]++, H = 0, y = L, h === 0 ? (j = 138, l = 3) : L === h ? (j = 6, l = 3) : (j = 7, l = 4));
  }
  function $t(m, M, I) {
    var q, y = -1, L, h = M[0 * 2 + 1], H = 0, j = 7, l = 4;
    for (h === 0 && (j = 138, l = 3), q = 0; q <= I; q++)
      if (L = h, h = M[(q + 1) * 2 + 1], !(++H < j && L === h)) {
        if (H < l)
          do
            dt(m, L, m.bl_tree);
          while (--H !== 0);
        else L !== 0 ? (L !== y && (dt(m, L, m.bl_tree), H--), dt(m, A, m.bl_tree), rt(m, H - 3, 2)) : H <= 10 ? (dt(m, N, m.bl_tree), rt(m, H - 3, 3)) : (dt(m, S, m.bl_tree), rt(m, H - 11, 7));
        H = 0, y = L, h === 0 ? (j = 138, l = 3) : L === h ? (j = 6, l = 3) : (j = 7, l = 4);
      }
  }
  function Nt(m) {
    var M;
    for (zt(m, m.dyn_ltree, m.l_desc.max_code), zt(m, m.dyn_dtree, m.d_desc.max_code), Mt(m, m.bl_desc), M = z - 1; M >= 3 && m.bl_tree[w[M] * 2 + 1] === 0; M--)
      ;
    return m.opt_len += 3 * (M + 1) + 5 + 5 + 4, M;
  }
  function Ut(m, M, I, q) {
    var y;
    for (rt(m, M - 257, 5), rt(m, I - 1, 5), rt(m, q - 4, 4), y = 0; y < q; y++)
      rt(m, m.bl_tree[w[y] * 2 + 1], 3);
    $t(m, m.dyn_ltree, M - 1), $t(m, m.dyn_dtree, I - 1);
  }
  function St(m) {
    var M = 4093624447, I;
    for (I = 0; I <= 31; I++, M >>>= 1)
      if (M & 1 && m.dyn_ltree[I * 2] !== 0)
        return n;
    if (m.dyn_ltree[9 * 2] !== 0 || m.dyn_ltree[10 * 2] !== 0 || m.dyn_ltree[13 * 2] !== 0)
      return i;
    for (I = 32; I < p; I++)
      if (m.dyn_ltree[I * 2] !== 0)
        return i;
    return n;
  }
  var Tt = !1;
  function Zt(m) {
    Tt || (lt(), Tt = !0), m.l_desc = new ot(m.dyn_ltree, nt), m.d_desc = new ot(m.dyn_dtree, Q), m.bl_desc = new ot(m.bl_tree, _t), m.bi_buf = 0, m.bi_valid = 0, Y(m);
  }
  function ft(m, M, I, q) {
    rt(m, (s << 1) + (q ? 1 : 0), 3), pt(m, M, I);
  }
  function K(m) {
    rt(m, o << 1, 3), dt(m, x, V), kt(m);
  }
  function ct(m, M, I, q) {
    var y, L, h = 0;
    m.level > 0 ? (m.strm.data_type === r && (m.strm.data_type = St(m)), Mt(m, m.l_desc), Mt(m, m.d_desc), h = Nt(m), y = m.opt_len + 3 + 7 >>> 3, L = m.static_len + 3 + 7 >>> 3, L <= y && (y = L)) : y = L = I + 5, I + 4 <= y && M !== -1 ? ft(m, M, I, q) : m.strategy === e || L === y ? (rt(m, (o << 1) + (q ? 1 : 0), 3), G(m, V, J)) : (rt(m, (c << 1) + (q ? 1 : 0), 3), Ut(m, m.l_desc.max_code + 1, m.d_desc.max_code + 1, h + 1), G(m, m.dyn_ltree, m.dyn_dtree)), Y(m), q && vt(m);
  }
  function ut(m, M, I) {
    return m.pending_buf[m.d_buf + m.last_lit * 2] = M >>> 8 & 255, m.pending_buf[m.d_buf + m.last_lit * 2 + 1] = M & 255, m.pending_buf[m.l_buf + m.last_lit] = I & 255, m.last_lit++, M === 0 ? m.dyn_ltree[I * 2]++ : (m.matches++, M--, m.dyn_ltree[(at[I] + p + 1) * 2]++, m.dyn_dtree[xt(M) * 2]++), m.last_lit === m.lit_bufsize - 1;
  }
  return _e._tr_init = Zt, _e._tr_stored_block = ft, _e._tr_flush_block = ct, _e._tr_tally = ut, _e._tr_align = K, _e;
}
var oi, pa;
function no() {
  if (pa) return oi;
  pa = 1;
  function t(e, n, i, r) {
    for (var a = e & 65535 | 0, s = e >>> 16 & 65535 | 0, o = 0; i !== 0; ) {
      o = i > 2e3 ? 2e3 : i, i -= o;
      do
        a = a + n[r++] | 0, s = s + a | 0;
      while (--o);
      a %= 65521, s %= 65521;
    }
    return a | s << 16 | 0;
  }
  return oi = t, oi;
}
var li, _a;
function io() {
  if (_a) return li;
  _a = 1;
  function t() {
    for (var i, r = [], a = 0; a < 256; a++) {
      i = a;
      for (var s = 0; s < 8; s++)
        i = i & 1 ? 3988292384 ^ i >>> 1 : i >>> 1;
      r[a] = i;
    }
    return r;
  }
  var e = t();
  function n(i, r, a, s) {
    var o = e, c = s + a;
    i ^= -1;
    for (var f = s; f < c; f++)
      i = i >>> 8 ^ o[(i ^ r[f]) & 255];
    return i ^ -1;
  }
  return li = n, li;
}
var ci, ga;
function er() {
  return ga || (ga = 1, ci = {
    2: "need dictionary",
    /* Z_NEED_DICT       2  */
    1: "stream end",
    /* Z_STREAM_END      1  */
    0: "",
    /* Z_OK              0  */
    "-1": "file error",
    /* Z_ERRNO         (-1) */
    "-2": "stream error",
    /* Z_STREAM_ERROR  (-2) */
    "-3": "data error",
    /* Z_DATA_ERROR    (-3) */
    "-4": "insufficient memory",
    /* Z_MEM_ERROR     (-4) */
    "-5": "buffer error",
    /* Z_BUF_ERROR     (-5) */
    "-6": "incompatible version"
    /* Z_VERSION_ERROR (-6) */
  }), ci;
}
var ma;
function W0() {
  if (ma) return Jt;
  ma = 1;
  var t = he(), e = q0(), n = no(), i = io(), r = er(), a = 0, s = 1, o = 3, c = 4, f = 5, u = 0, _ = 1, p = -2, g = -3, T = -5, z = -1, R = 1, $ = 2, E = 3, k = 4, x = 0, A = 2, N = 8, S = 9, B = 15, P = 8, F = 29, w = 256, U = w + 1 + F, V = 30, J = 19, et = 2 * U + 1, at = 15, C = 3, tt = 258, it = tt + C + 1, nt = 32, Q = 42, _t = 69, ot = 73, xt = 91, yt = 103, rt = 113, dt = 666, st = 1, kt = 2, Dt = 3, Et = 4, lt = 3;
  function Y(l, D) {
    return l.msg = r[D], D;
  }
  function vt(l) {
    return (l << 1) - (l > 4 ? 9 : 0);
  }
  function pt(l) {
    for (var D = l.length; --D >= 0; )
      l[D] = 0;
  }
  function mt(l) {
    var D = l.state, O = D.pending;
    O > l.avail_out && (O = l.avail_out), O !== 0 && (t.arraySet(l.output, D.pending_buf, D.pending_out, O, l.next_out), l.next_out += O, D.pending_out += O, l.total_out += O, l.avail_out -= O, D.pending -= O, D.pending === 0 && (D.pending_out = 0));
  }
  function bt(l, D) {
    e._tr_flush_block(l, l.block_start >= 0 ? l.block_start : -1, l.strstart - l.block_start, D), l.block_start = l.strstart, mt(l.strm);
  }
  function G(l, D) {
    l.pending_buf[l.pending++] = D;
  }
  function Mt(l, D) {
    l.pending_buf[l.pending++] = D >>> 8 & 255, l.pending_buf[l.pending++] = D & 255;
  }
  function zt(l, D, O, d) {
    var v = l.avail_in;
    return v > d && (v = d), v === 0 ? 0 : (l.avail_in -= v, t.arraySet(D, l.input, l.next_in, v, O), l.state.wrap === 1 ? l.adler = n(l.adler, D, v, O) : l.state.wrap === 2 && (l.adler = i(l.adler, D, v, O)), l.next_in += v, l.total_in += v, v);
  }
  function $t(l, D) {
    var O = l.max_chain_length, d = l.strstart, v, b, X = l.prev_length, Z = l.nice_match, W = l.strstart > l.w_size - it ? l.strstart - (l.w_size - it) : 0, gt = l.window, qt = l.w_mask, It = l.prev, wt = l.strstart + tt, Ct = gt[d + X - 1], Bt = gt[d + X];
    l.prev_length >= l.good_match && (O >>= 2), Z > l.lookahead && (Z = l.lookahead);
    do
      if (v = D, !(gt[v + X] !== Bt || gt[v + X - 1] !== Ct || gt[v] !== gt[d] || gt[++v] !== gt[d + 1])) {
        d += 2, v++;
        do
          ;
        while (gt[++d] === gt[++v] && gt[++d] === gt[++v] && gt[++d] === gt[++v] && gt[++d] === gt[++v] && gt[++d] === gt[++v] && gt[++d] === gt[++v] && gt[++d] === gt[++v] && gt[++d] === gt[++v] && d < wt);
        if (b = tt - (wt - d), d = wt - tt, b > X) {
          if (l.match_start = D, X = b, b >= Z)
            break;
          Ct = gt[d + X - 1], Bt = gt[d + X];
        }
      }
    while ((D = It[D & qt]) > W && --O !== 0);
    return X <= l.lookahead ? X : l.lookahead;
  }
  function Nt(l) {
    var D = l.w_size, O, d, v, b, X;
    do {
      if (b = l.window_size - l.lookahead - l.strstart, l.strstart >= D + (D - it)) {
        t.arraySet(l.window, l.window, D, D, 0), l.match_start -= D, l.strstart -= D, l.block_start -= D, d = l.hash_size, O = d;
        do
          v = l.head[--O], l.head[O] = v >= D ? v - D : 0;
        while (--d);
        d = D, O = d;
        do
          v = l.prev[--O], l.prev[O] = v >= D ? v - D : 0;
        while (--d);
        b += D;
      }
      if (l.strm.avail_in === 0)
        break;
      if (d = zt(l.strm, l.window, l.strstart + l.lookahead, b), l.lookahead += d, l.lookahead + l.insert >= C)
        for (X = l.strstart - l.insert, l.ins_h = l.window[X], l.ins_h = (l.ins_h << l.hash_shift ^ l.window[X + 1]) & l.hash_mask; l.insert && (l.ins_h = (l.ins_h << l.hash_shift ^ l.window[X + C - 1]) & l.hash_mask, l.prev[X & l.w_mask] = l.head[l.ins_h], l.head[l.ins_h] = X, X++, l.insert--, !(l.lookahead + l.insert < C)); )
          ;
    } while (l.lookahead < it && l.strm.avail_in !== 0);
  }
  function Ut(l, D) {
    var O = 65535;
    for (O > l.pending_buf_size - 5 && (O = l.pending_buf_size - 5); ; ) {
      if (l.lookahead <= 1) {
        if (Nt(l), l.lookahead === 0 && D === a)
          return st;
        if (l.lookahead === 0)
          break;
      }
      l.strstart += l.lookahead, l.lookahead = 0;
      var d = l.block_start + O;
      if ((l.strstart === 0 || l.strstart >= d) && (l.lookahead = l.strstart - d, l.strstart = d, bt(l, !1), l.strm.avail_out === 0) || l.strstart - l.block_start >= l.w_size - it && (bt(l, !1), l.strm.avail_out === 0))
        return st;
    }
    return l.insert = 0, D === c ? (bt(l, !0), l.strm.avail_out === 0 ? Dt : Et) : (l.strstart > l.block_start && (bt(l, !1), l.strm.avail_out === 0), st);
  }
  function St(l, D) {
    for (var O, d; ; ) {
      if (l.lookahead < it) {
        if (Nt(l), l.lookahead < it && D === a)
          return st;
        if (l.lookahead === 0)
          break;
      }
      if (O = 0, l.lookahead >= C && (l.ins_h = (l.ins_h << l.hash_shift ^ l.window[l.strstart + C - 1]) & l.hash_mask, O = l.prev[l.strstart & l.w_mask] = l.head[l.ins_h], l.head[l.ins_h] = l.strstart), O !== 0 && l.strstart - O <= l.w_size - it && (l.match_length = $t(l, O)), l.match_length >= C)
        if (d = e._tr_tally(l, l.strstart - l.match_start, l.match_length - C), l.lookahead -= l.match_length, l.match_length <= l.max_lazy_match && l.lookahead >= C) {
          l.match_length--;
          do
            l.strstart++, l.ins_h = (l.ins_h << l.hash_shift ^ l.window[l.strstart + C - 1]) & l.hash_mask, O = l.prev[l.strstart & l.w_mask] = l.head[l.ins_h], l.head[l.ins_h] = l.strstart;
          while (--l.match_length !== 0);
          l.strstart++;
        } else
          l.strstart += l.match_length, l.match_length = 0, l.ins_h = l.window[l.strstart], l.ins_h = (l.ins_h << l.hash_shift ^ l.window[l.strstart + 1]) & l.hash_mask;
      else
        d = e._tr_tally(l, 0, l.window[l.strstart]), l.lookahead--, l.strstart++;
      if (d && (bt(l, !1), l.strm.avail_out === 0))
        return st;
    }
    return l.insert = l.strstart < C - 1 ? l.strstart : C - 1, D === c ? (bt(l, !0), l.strm.avail_out === 0 ? Dt : Et) : l.last_lit && (bt(l, !1), l.strm.avail_out === 0) ? st : kt;
  }
  function Tt(l, D) {
    for (var O, d, v; ; ) {
      if (l.lookahead < it) {
        if (Nt(l), l.lookahead < it && D === a)
          return st;
        if (l.lookahead === 0)
          break;
      }
      if (O = 0, l.lookahead >= C && (l.ins_h = (l.ins_h << l.hash_shift ^ l.window[l.strstart + C - 1]) & l.hash_mask, O = l.prev[l.strstart & l.w_mask] = l.head[l.ins_h], l.head[l.ins_h] = l.strstart), l.prev_length = l.match_length, l.prev_match = l.match_start, l.match_length = C - 1, O !== 0 && l.prev_length < l.max_lazy_match && l.strstart - O <= l.w_size - it && (l.match_length = $t(l, O), l.match_length <= 5 && (l.strategy === R || l.match_length === C && l.strstart - l.match_start > 4096) && (l.match_length = C - 1)), l.prev_length >= C && l.match_length <= l.prev_length) {
        v = l.strstart + l.lookahead - C, d = e._tr_tally(l, l.strstart - 1 - l.prev_match, l.prev_length - C), l.lookahead -= l.prev_length - 1, l.prev_length -= 2;
        do
          ++l.strstart <= v && (l.ins_h = (l.ins_h << l.hash_shift ^ l.window[l.strstart + C - 1]) & l.hash_mask, O = l.prev[l.strstart & l.w_mask] = l.head[l.ins_h], l.head[l.ins_h] = l.strstart);
        while (--l.prev_length !== 0);
        if (l.match_available = 0, l.match_length = C - 1, l.strstart++, d && (bt(l, !1), l.strm.avail_out === 0))
          return st;
      } else if (l.match_available) {
        if (d = e._tr_tally(l, 0, l.window[l.strstart - 1]), d && bt(l, !1), l.strstart++, l.lookahead--, l.strm.avail_out === 0)
          return st;
      } else
        l.match_available = 1, l.strstart++, l.lookahead--;
    }
    return l.match_available && (d = e._tr_tally(l, 0, l.window[l.strstart - 1]), l.match_available = 0), l.insert = l.strstart < C - 1 ? l.strstart : C - 1, D === c ? (bt(l, !0), l.strm.avail_out === 0 ? Dt : Et) : l.last_lit && (bt(l, !1), l.strm.avail_out === 0) ? st : kt;
  }
  function Zt(l, D) {
    for (var O, d, v, b, X = l.window; ; ) {
      if (l.lookahead <= tt) {
        if (Nt(l), l.lookahead <= tt && D === a)
          return st;
        if (l.lookahead === 0)
          break;
      }
      if (l.match_length = 0, l.lookahead >= C && l.strstart > 0 && (v = l.strstart - 1, d = X[v], d === X[++v] && d === X[++v] && d === X[++v])) {
        b = l.strstart + tt;
        do
          ;
        while (d === X[++v] && d === X[++v] && d === X[++v] && d === X[++v] && d === X[++v] && d === X[++v] && d === X[++v] && d === X[++v] && v < b);
        l.match_length = tt - (b - v), l.match_length > l.lookahead && (l.match_length = l.lookahead);
      }
      if (l.match_length >= C ? (O = e._tr_tally(l, 1, l.match_length - C), l.lookahead -= l.match_length, l.strstart += l.match_length, l.match_length = 0) : (O = e._tr_tally(l, 0, l.window[l.strstart]), l.lookahead--, l.strstart++), O && (bt(l, !1), l.strm.avail_out === 0))
        return st;
    }
    return l.insert = 0, D === c ? (bt(l, !0), l.strm.avail_out === 0 ? Dt : Et) : l.last_lit && (bt(l, !1), l.strm.avail_out === 0) ? st : kt;
  }
  function ft(l, D) {
    for (var O; ; ) {
      if (l.lookahead === 0 && (Nt(l), l.lookahead === 0)) {
        if (D === a)
          return st;
        break;
      }
      if (l.match_length = 0, O = e._tr_tally(l, 0, l.window[l.strstart]), l.lookahead--, l.strstart++, O && (bt(l, !1), l.strm.avail_out === 0))
        return st;
    }
    return l.insert = 0, D === c ? (bt(l, !0), l.strm.avail_out === 0 ? Dt : Et) : l.last_lit && (bt(l, !1), l.strm.avail_out === 0) ? st : kt;
  }
  function K(l, D, O, d, v) {
    this.good_length = l, this.max_lazy = D, this.nice_length = O, this.max_chain = d, this.func = v;
  }
  var ct;
  ct = [
    /*      good lazy nice chain */
    new K(0, 0, 0, 0, Ut),
    /* 0 store only */
    new K(4, 4, 8, 4, St),
    /* 1 max speed, no lazy matches */
    new K(4, 5, 16, 8, St),
    /* 2 */
    new K(4, 6, 32, 32, St),
    /* 3 */
    new K(4, 4, 16, 16, Tt),
    /* 4 lazy matches */
    new K(8, 16, 32, 32, Tt),
    /* 5 */
    new K(8, 16, 128, 128, Tt),
    /* 6 */
    new K(8, 32, 128, 256, Tt),
    /* 7 */
    new K(32, 128, 258, 1024, Tt),
    /* 8 */
    new K(32, 258, 258, 4096, Tt)
    /* 9 max compression */
  ];
  function ut(l) {
    l.window_size = 2 * l.w_size, pt(l.head), l.max_lazy_match = ct[l.level].max_lazy, l.good_match = ct[l.level].good_length, l.nice_match = ct[l.level].nice_length, l.max_chain_length = ct[l.level].max_chain, l.strstart = 0, l.block_start = 0, l.lookahead = 0, l.insert = 0, l.match_length = l.prev_length = C - 1, l.match_available = 0, l.ins_h = 0;
  }
  function m() {
    this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = N, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new t.Buf16(et * 2), this.dyn_dtree = new t.Buf16((2 * V + 1) * 2), this.bl_tree = new t.Buf16((2 * J + 1) * 2), pt(this.dyn_ltree), pt(this.dyn_dtree), pt(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new t.Buf16(at + 1), this.heap = new t.Buf16(2 * U + 1), pt(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new t.Buf16(2 * U + 1), pt(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
  }
  function M(l) {
    var D;
    return !l || !l.state ? Y(l, p) : (l.total_in = l.total_out = 0, l.data_type = A, D = l.state, D.pending = 0, D.pending_out = 0, D.wrap < 0 && (D.wrap = -D.wrap), D.status = D.wrap ? Q : rt, l.adler = D.wrap === 2 ? 0 : 1, D.last_flush = a, e._tr_init(D), u);
  }
  function I(l) {
    var D = M(l);
    return D === u && ut(l.state), D;
  }
  function q(l, D) {
    return !l || !l.state || l.state.wrap !== 2 ? p : (l.state.gzhead = D, u);
  }
  function y(l, D, O, d, v, b) {
    if (!l)
      return p;
    var X = 1;
    if (D === z && (D = 6), d < 0 ? (X = 0, d = -d) : d > 15 && (X = 2, d -= 16), v < 1 || v > S || O !== N || d < 8 || d > 15 || D < 0 || D > 9 || b < 0 || b > k)
      return Y(l, p);
    d === 8 && (d = 9);
    var Z = new m();
    return l.state = Z, Z.strm = l, Z.wrap = X, Z.gzhead = null, Z.w_bits = d, Z.w_size = 1 << Z.w_bits, Z.w_mask = Z.w_size - 1, Z.hash_bits = v + 7, Z.hash_size = 1 << Z.hash_bits, Z.hash_mask = Z.hash_size - 1, Z.hash_shift = ~~((Z.hash_bits + C - 1) / C), Z.window = new t.Buf8(Z.w_size * 2), Z.head = new t.Buf16(Z.hash_size), Z.prev = new t.Buf16(Z.w_size), Z.lit_bufsize = 1 << v + 6, Z.pending_buf_size = Z.lit_bufsize * 4, Z.pending_buf = new t.Buf8(Z.pending_buf_size), Z.d_buf = 1 * Z.lit_bufsize, Z.l_buf = 3 * Z.lit_bufsize, Z.level = D, Z.strategy = b, Z.method = O, I(l);
  }
  function L(l, D) {
    return y(l, D, N, B, P, x);
  }
  function h(l, D) {
    var O, d, v, b;
    if (!l || !l.state || D > f || D < 0)
      return l ? Y(l, p) : p;
    if (d = l.state, !l.output || !l.input && l.avail_in !== 0 || d.status === dt && D !== c)
      return Y(l, l.avail_out === 0 ? T : p);
    if (d.strm = l, O = d.last_flush, d.last_flush = D, d.status === Q)
      if (d.wrap === 2)
        l.adler = 0, G(d, 31), G(d, 139), G(d, 8), d.gzhead ? (G(
          d,
          (d.gzhead.text ? 1 : 0) + (d.gzhead.hcrc ? 2 : 0) + (d.gzhead.extra ? 4 : 0) + (d.gzhead.name ? 8 : 0) + (d.gzhead.comment ? 16 : 0)
        ), G(d, d.gzhead.time & 255), G(d, d.gzhead.time >> 8 & 255), G(d, d.gzhead.time >> 16 & 255), G(d, d.gzhead.time >> 24 & 255), G(d, d.level === 9 ? 2 : d.strategy >= $ || d.level < 2 ? 4 : 0), G(d, d.gzhead.os & 255), d.gzhead.extra && d.gzhead.extra.length && (G(d, d.gzhead.extra.length & 255), G(d, d.gzhead.extra.length >> 8 & 255)), d.gzhead.hcrc && (l.adler = i(l.adler, d.pending_buf, d.pending, 0)), d.gzindex = 0, d.status = _t) : (G(d, 0), G(d, 0), G(d, 0), G(d, 0), G(d, 0), G(d, d.level === 9 ? 2 : d.strategy >= $ || d.level < 2 ? 4 : 0), G(d, lt), d.status = rt);
      else {
        var X = N + (d.w_bits - 8 << 4) << 8, Z = -1;
        d.strategy >= $ || d.level < 2 ? Z = 0 : d.level < 6 ? Z = 1 : d.level === 6 ? Z = 2 : Z = 3, X |= Z << 6, d.strstart !== 0 && (X |= nt), X += 31 - X % 31, d.status = rt, Mt(d, X), d.strstart !== 0 && (Mt(d, l.adler >>> 16), Mt(d, l.adler & 65535)), l.adler = 1;
      }
    if (d.status === _t)
      if (d.gzhead.extra) {
        for (v = d.pending; d.gzindex < (d.gzhead.extra.length & 65535) && !(d.pending === d.pending_buf_size && (d.gzhead.hcrc && d.pending > v && (l.adler = i(l.adler, d.pending_buf, d.pending - v, v)), mt(l), v = d.pending, d.pending === d.pending_buf_size)); )
          G(d, d.gzhead.extra[d.gzindex] & 255), d.gzindex++;
        d.gzhead.hcrc && d.pending > v && (l.adler = i(l.adler, d.pending_buf, d.pending - v, v)), d.gzindex === d.gzhead.extra.length && (d.gzindex = 0, d.status = ot);
      } else
        d.status = ot;
    if (d.status === ot)
      if (d.gzhead.name) {
        v = d.pending;
        do {
          if (d.pending === d.pending_buf_size && (d.gzhead.hcrc && d.pending > v && (l.adler = i(l.adler, d.pending_buf, d.pending - v, v)), mt(l), v = d.pending, d.pending === d.pending_buf_size)) {
            b = 1;
            break;
          }
          d.gzindex < d.gzhead.name.length ? b = d.gzhead.name.charCodeAt(d.gzindex++) & 255 : b = 0, G(d, b);
        } while (b !== 0);
        d.gzhead.hcrc && d.pending > v && (l.adler = i(l.adler, d.pending_buf, d.pending - v, v)), b === 0 && (d.gzindex = 0, d.status = xt);
      } else
        d.status = xt;
    if (d.status === xt)
      if (d.gzhead.comment) {
        v = d.pending;
        do {
          if (d.pending === d.pending_buf_size && (d.gzhead.hcrc && d.pending > v && (l.adler = i(l.adler, d.pending_buf, d.pending - v, v)), mt(l), v = d.pending, d.pending === d.pending_buf_size)) {
            b = 1;
            break;
          }
          d.gzindex < d.gzhead.comment.length ? b = d.gzhead.comment.charCodeAt(d.gzindex++) & 255 : b = 0, G(d, b);
        } while (b !== 0);
        d.gzhead.hcrc && d.pending > v && (l.adler = i(l.adler, d.pending_buf, d.pending - v, v)), b === 0 && (d.status = yt);
      } else
        d.status = yt;
    if (d.status === yt && (d.gzhead.hcrc ? (d.pending + 2 > d.pending_buf_size && mt(l), d.pending + 2 <= d.pending_buf_size && (G(d, l.adler & 255), G(d, l.adler >> 8 & 255), l.adler = 0, d.status = rt)) : d.status = rt), d.pending !== 0) {
      if (mt(l), l.avail_out === 0)
        return d.last_flush = -1, u;
    } else if (l.avail_in === 0 && vt(D) <= vt(O) && D !== c)
      return Y(l, T);
    if (d.status === dt && l.avail_in !== 0)
      return Y(l, T);
    if (l.avail_in !== 0 || d.lookahead !== 0 || D !== a && d.status !== dt) {
      var W = d.strategy === $ ? ft(d, D) : d.strategy === E ? Zt(d, D) : ct[d.level].func(d, D);
      if ((W === Dt || W === Et) && (d.status = dt), W === st || W === Dt)
        return l.avail_out === 0 && (d.last_flush = -1), u;
      if (W === kt && (D === s ? e._tr_align(d) : D !== f && (e._tr_stored_block(d, 0, 0, !1), D === o && (pt(d.head), d.lookahead === 0 && (d.strstart = 0, d.block_start = 0, d.insert = 0))), mt(l), l.avail_out === 0))
        return d.last_flush = -1, u;
    }
    return D !== c ? u : d.wrap <= 0 ? _ : (d.wrap === 2 ? (G(d, l.adler & 255), G(d, l.adler >> 8 & 255), G(d, l.adler >> 16 & 255), G(d, l.adler >> 24 & 255), G(d, l.total_in & 255), G(d, l.total_in >> 8 & 255), G(d, l.total_in >> 16 & 255), G(d, l.total_in >> 24 & 255)) : (Mt(d, l.adler >>> 16), Mt(d, l.adler & 65535)), mt(l), d.wrap > 0 && (d.wrap = -d.wrap), d.pending !== 0 ? u : _);
  }
  function H(l) {
    var D;
    return !l || !l.state ? p : (D = l.state.status, D !== Q && D !== _t && D !== ot && D !== xt && D !== yt && D !== rt && D !== dt ? Y(l, p) : (l.state = null, D === rt ? Y(l, g) : u));
  }
  function j(l, D) {
    var O = D.length, d, v, b, X, Z, W, gt, qt;
    if (!l || !l.state || (d = l.state, X = d.wrap, X === 2 || X === 1 && d.status !== Q || d.lookahead))
      return p;
    for (X === 1 && (l.adler = n(l.adler, D, O, 0)), d.wrap = 0, O >= d.w_size && (X === 0 && (pt(d.head), d.strstart = 0, d.block_start = 0, d.insert = 0), qt = new t.Buf8(d.w_size), t.arraySet(qt, D, O - d.w_size, d.w_size, 0), D = qt, O = d.w_size), Z = l.avail_in, W = l.next_in, gt = l.input, l.avail_in = O, l.next_in = 0, l.input = D, Nt(d); d.lookahead >= C; ) {
      v = d.strstart, b = d.lookahead - (C - 1);
      do
        d.ins_h = (d.ins_h << d.hash_shift ^ d.window[v + C - 1]) & d.hash_mask, d.prev[v & d.w_mask] = d.head[d.ins_h], d.head[d.ins_h] = v, v++;
      while (--b);
      d.strstart = v, d.lookahead = C - 1, Nt(d);
    }
    return d.strstart += d.lookahead, d.block_start = d.strstart, d.insert = d.lookahead, d.lookahead = 0, d.match_length = d.prev_length = C - 1, d.match_available = 0, l.next_in = W, l.input = gt, l.avail_in = Z, d.wrap = X, u;
  }
  return Jt.deflateInit = L, Jt.deflateInit2 = y, Jt.deflateReset = I, Jt.deflateResetKeep = M, Jt.deflateSetHeader = q, Jt.deflate = h, Jt.deflateEnd = H, Jt.deflateSetDictionary = j, Jt.deflateInfo = "pako deflate (from Nodeca project)", Jt;
}
var ge = {}, va;
function ro() {
  if (va) return ge;
  va = 1;
  var t = he(), e = !0, n = !0;
  try {
    String.fromCharCode.apply(null, [0]);
  } catch {
    e = !1;
  }
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch {
    n = !1;
  }
  for (var i = new t.Buf8(256), r = 0; r < 256; r++)
    i[r] = r >= 252 ? 6 : r >= 248 ? 5 : r >= 240 ? 4 : r >= 224 ? 3 : r >= 192 ? 2 : 1;
  i[254] = i[254] = 1, ge.string2buf = function(s) {
    var o, c, f, u, _, p = s.length, g = 0;
    for (u = 0; u < p; u++)
      c = s.charCodeAt(u), (c & 64512) === 55296 && u + 1 < p && (f = s.charCodeAt(u + 1), (f & 64512) === 56320 && (c = 65536 + (c - 55296 << 10) + (f - 56320), u++)), g += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
    for (o = new t.Buf8(g), _ = 0, u = 0; _ < g; u++)
      c = s.charCodeAt(u), (c & 64512) === 55296 && u + 1 < p && (f = s.charCodeAt(u + 1), (f & 64512) === 56320 && (c = 65536 + (c - 55296 << 10) + (f - 56320), u++)), c < 128 ? o[_++] = c : c < 2048 ? (o[_++] = 192 | c >>> 6, o[_++] = 128 | c & 63) : c < 65536 ? (o[_++] = 224 | c >>> 12, o[_++] = 128 | c >>> 6 & 63, o[_++] = 128 | c & 63) : (o[_++] = 240 | c >>> 18, o[_++] = 128 | c >>> 12 & 63, o[_++] = 128 | c >>> 6 & 63, o[_++] = 128 | c & 63);
    return o;
  };
  function a(s, o) {
    if (o < 65534 && (s.subarray && n || !s.subarray && e))
      return String.fromCharCode.apply(null, t.shrinkBuf(s, o));
    for (var c = "", f = 0; f < o; f++)
      c += String.fromCharCode(s[f]);
    return c;
  }
  return ge.buf2binstring = function(s) {
    return a(s, s.length);
  }, ge.binstring2buf = function(s) {
    for (var o = new t.Buf8(s.length), c = 0, f = o.length; c < f; c++)
      o[c] = s.charCodeAt(c);
    return o;
  }, ge.buf2string = function(s, o) {
    var c, f, u, _, p = o || s.length, g = new Array(p * 2);
    for (f = 0, c = 0; c < p; ) {
      if (u = s[c++], u < 128) {
        g[f++] = u;
        continue;
      }
      if (_ = i[u], _ > 4) {
        g[f++] = 65533, c += _ - 1;
        continue;
      }
      for (u &= _ === 2 ? 31 : _ === 3 ? 15 : 7; _ > 1 && c < p; )
        u = u << 6 | s[c++] & 63, _--;
      if (_ > 1) {
        g[f++] = 65533;
        continue;
      }
      u < 65536 ? g[f++] = u : (u -= 65536, g[f++] = 55296 | u >> 10 & 1023, g[f++] = 56320 | u & 1023);
    }
    return a(g, f);
  }, ge.utf8border = function(s, o) {
    var c;
    for (o = o || s.length, o > s.length && (o = s.length), c = o - 1; c >= 0 && (s[c] & 192) === 128; )
      c--;
    return c < 0 || c === 0 ? o : c + i[s[c]] > o ? c : o;
  }, ge;
}
var fi, wa;
function ao() {
  if (wa) return fi;
  wa = 1;
  function t() {
    this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
  }
  return fi = t, fi;
}
var ya;
function X0() {
  if (ya) return Ie;
  ya = 1;
  var t = W0(), e = he(), n = ro(), i = er(), r = ao(), a = Object.prototype.toString, s = 0, o = 4, c = 0, f = 1, u = 2, _ = -1, p = 0, g = 8;
  function T(E) {
    if (!(this instanceof T)) return new T(E);
    this.options = e.assign({
      level: _,
      method: g,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: p,
      to: ""
    }, E || {});
    var k = this.options;
    k.raw && k.windowBits > 0 ? k.windowBits = -k.windowBits : k.gzip && k.windowBits > 0 && k.windowBits < 16 && (k.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new r(), this.strm.avail_out = 0;
    var x = t.deflateInit2(
      this.strm,
      k.level,
      k.method,
      k.windowBits,
      k.memLevel,
      k.strategy
    );
    if (x !== c)
      throw new Error(i[x]);
    if (k.header && t.deflateSetHeader(this.strm, k.header), k.dictionary) {
      var A;
      if (typeof k.dictionary == "string" ? A = n.string2buf(k.dictionary) : a.call(k.dictionary) === "[object ArrayBuffer]" ? A = new Uint8Array(k.dictionary) : A = k.dictionary, x = t.deflateSetDictionary(this.strm, A), x !== c)
        throw new Error(i[x]);
      this._dict_set = !0;
    }
  }
  T.prototype.push = function(E, k) {
    var x = this.strm, A = this.options.chunkSize, N, S;
    if (this.ended)
      return !1;
    S = k === ~~k ? k : k === !0 ? o : s, typeof E == "string" ? x.input = n.string2buf(E) : a.call(E) === "[object ArrayBuffer]" ? x.input = new Uint8Array(E) : x.input = E, x.next_in = 0, x.avail_in = x.input.length;
    do {
      if (x.avail_out === 0 && (x.output = new e.Buf8(A), x.next_out = 0, x.avail_out = A), N = t.deflate(x, S), N !== f && N !== c)
        return this.onEnd(N), this.ended = !0, !1;
      (x.avail_out === 0 || x.avail_in === 0 && (S === o || S === u)) && (this.options.to === "string" ? this.onData(n.buf2binstring(e.shrinkBuf(x.output, x.next_out))) : this.onData(e.shrinkBuf(x.output, x.next_out)));
    } while ((x.avail_in > 0 || x.avail_out === 0) && N !== f);
    return S === o ? (N = t.deflateEnd(this.strm), this.onEnd(N), this.ended = !0, N === c) : (S === u && (this.onEnd(c), x.avail_out = 0), !0);
  }, T.prototype.onData = function(E) {
    this.chunks.push(E);
  }, T.prototype.onEnd = function(E) {
    E === c && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = e.flattenChunks(this.chunks)), this.chunks = [], this.err = E, this.msg = this.strm.msg;
  };
  function z(E, k) {
    var x = new T(k);
    if (x.push(E, !0), x.err)
      throw x.msg || i[x.err];
    return x.result;
  }
  function R(E, k) {
    return k = k || {}, k.raw = !0, z(E, k);
  }
  function $(E, k) {
    return k = k || {}, k.gzip = !0, z(E, k);
  }
  return Ie.Deflate = T, Ie.deflate = z, Ie.deflateRaw = R, Ie.gzip = $, Ie;
}
var De = {}, Xt = {}, ui, xa;
function K0() {
  if (xa) return ui;
  xa = 1;
  var t = 30, e = 12;
  return ui = function(i, r) {
    var a, s, o, c, f, u, _, p, g, T, z, R, $, E, k, x, A, N, S, B, P, F, w, U, V;
    a = i.state, s = i.next_in, U = i.input, o = s + (i.avail_in - 5), c = i.next_out, V = i.output, f = c - (r - i.avail_out), u = c + (i.avail_out - 257), _ = a.dmax, p = a.wsize, g = a.whave, T = a.wnext, z = a.window, R = a.hold, $ = a.bits, E = a.lencode, k = a.distcode, x = (1 << a.lenbits) - 1, A = (1 << a.distbits) - 1;
    t:
      do {
        $ < 15 && (R += U[s++] << $, $ += 8, R += U[s++] << $, $ += 8), N = E[R & x];
        e:
          for (; ; ) {
            if (S = N >>> 24, R >>>= S, $ -= S, S = N >>> 16 & 255, S === 0)
              V[c++] = N & 65535;
            else if (S & 16) {
              B = N & 65535, S &= 15, S && ($ < S && (R += U[s++] << $, $ += 8), B += R & (1 << S) - 1, R >>>= S, $ -= S), $ < 15 && (R += U[s++] << $, $ += 8, R += U[s++] << $, $ += 8), N = k[R & A];
              n:
                for (; ; ) {
                  if (S = N >>> 24, R >>>= S, $ -= S, S = N >>> 16 & 255, S & 16) {
                    if (P = N & 65535, S &= 15, $ < S && (R += U[s++] << $, $ += 8, $ < S && (R += U[s++] << $, $ += 8)), P += R & (1 << S) - 1, P > _) {
                      i.msg = "invalid distance too far back", a.mode = t;
                      break t;
                    }
                    if (R >>>= S, $ -= S, S = c - f, P > S) {
                      if (S = P - S, S > g && a.sane) {
                        i.msg = "invalid distance too far back", a.mode = t;
                        break t;
                      }
                      if (F = 0, w = z, T === 0) {
                        if (F += p - S, S < B) {
                          B -= S;
                          do
                            V[c++] = z[F++];
                          while (--S);
                          F = c - P, w = V;
                        }
                      } else if (T < S) {
                        if (F += p + T - S, S -= T, S < B) {
                          B -= S;
                          do
                            V[c++] = z[F++];
                          while (--S);
                          if (F = 0, T < B) {
                            S = T, B -= S;
                            do
                              V[c++] = z[F++];
                            while (--S);
                            F = c - P, w = V;
                          }
                        }
                      } else if (F += T - S, S < B) {
                        B -= S;
                        do
                          V[c++] = z[F++];
                        while (--S);
                        F = c - P, w = V;
                      }
                      for (; B > 2; )
                        V[c++] = w[F++], V[c++] = w[F++], V[c++] = w[F++], B -= 3;
                      B && (V[c++] = w[F++], B > 1 && (V[c++] = w[F++]));
                    } else {
                      F = c - P;
                      do
                        V[c++] = V[F++], V[c++] = V[F++], V[c++] = V[F++], B -= 3;
                      while (B > 2);
                      B && (V[c++] = V[F++], B > 1 && (V[c++] = V[F++]));
                    }
                  } else if ((S & 64) === 0) {
                    N = k[(N & 65535) + (R & (1 << S) - 1)];
                    continue n;
                  } else {
                    i.msg = "invalid distance code", a.mode = t;
                    break t;
                  }
                  break;
                }
            } else if ((S & 64) === 0) {
              N = E[(N & 65535) + (R & (1 << S) - 1)];
              continue e;
            } else if (S & 32) {
              a.mode = e;
              break t;
            } else {
              i.msg = "invalid literal/length code", a.mode = t;
              break t;
            }
            break;
          }
      } while (s < o && c < u);
    B = $ >> 3, s -= B, $ -= B << 3, R &= (1 << $) - 1, i.next_in = s, i.next_out = c, i.avail_in = s < o ? 5 + (o - s) : 5 - (s - o), i.avail_out = c < u ? 257 + (u - c) : 257 - (c - u), a.hold = R, a.bits = $;
  }, ui;
}
var hi, ba;
function Y0() {
  if (ba) return hi;
  ba = 1;
  var t = he(), e = 15, n = 852, i = 592, r = 0, a = 1, s = 2, o = [
    /* Length codes 257..285 base */
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0
  ], c = [
    /* Length codes 257..285 extra */
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78
  ], f = [
    /* Distance codes 0..29 base */
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0
  ], u = [
    /* Distance codes 0..29 extra */
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64
  ];
  return hi = function(p, g, T, z, R, $, E, k) {
    var x = k.bits, A = 0, N = 0, S = 0, B = 0, P = 0, F = 0, w = 0, U = 0, V = 0, J = 0, et, at, C, tt, it, nt = null, Q = 0, _t, ot = new t.Buf16(e + 1), xt = new t.Buf16(e + 1), yt = null, rt = 0, dt, st, kt;
    for (A = 0; A <= e; A++)
      ot[A] = 0;
    for (N = 0; N < z; N++)
      ot[g[T + N]]++;
    for (P = x, B = e; B >= 1 && ot[B] === 0; B--)
      ;
    if (P > B && (P = B), B === 0)
      return R[$++] = 1 << 24 | 64 << 16 | 0, R[$++] = 1 << 24 | 64 << 16 | 0, k.bits = 1, 0;
    for (S = 1; S < B && ot[S] === 0; S++)
      ;
    for (P < S && (P = S), U = 1, A = 1; A <= e; A++)
      if (U <<= 1, U -= ot[A], U < 0)
        return -1;
    if (U > 0 && (p === r || B !== 1))
      return -1;
    for (xt[1] = 0, A = 1; A < e; A++)
      xt[A + 1] = xt[A] + ot[A];
    for (N = 0; N < z; N++)
      g[T + N] !== 0 && (E[xt[g[T + N]]++] = N);
    if (p === r ? (nt = yt = E, _t = 19) : p === a ? (nt = o, Q -= 257, yt = c, rt -= 257, _t = 256) : (nt = f, yt = u, _t = -1), J = 0, N = 0, A = S, it = $, F = P, w = 0, C = -1, V = 1 << P, tt = V - 1, p === a && V > n || p === s && V > i)
      return 1;
    for (; ; ) {
      dt = A - w, E[N] < _t ? (st = 0, kt = E[N]) : E[N] > _t ? (st = yt[rt + E[N]], kt = nt[Q + E[N]]) : (st = 96, kt = 0), et = 1 << A - w, at = 1 << F, S = at;
      do
        at -= et, R[it + (J >> w) + at] = dt << 24 | st << 16 | kt | 0;
      while (at !== 0);
      for (et = 1 << A - 1; J & et; )
        et >>= 1;
      if (et !== 0 ? (J &= et - 1, J += et) : J = 0, N++, --ot[A] === 0) {
        if (A === B)
          break;
        A = g[T + E[N]];
      }
      if (A > P && (J & tt) !== C) {
        for (w === 0 && (w = P), it += S, F = A - w, U = 1 << F; F + w < B && (U -= ot[F + w], !(U <= 0)); )
          F++, U <<= 1;
        if (V += 1 << F, p === a && V > n || p === s && V > i)
          return 1;
        C = J & tt, R[C] = P << 24 | F << 16 | it - $ | 0;
      }
    }
    return J !== 0 && (R[it + J] = A - w << 24 | 64 << 16 | 0), k.bits = P, 0;
  }, hi;
}
var ka;
function J0() {
  if (ka) return Xt;
  ka = 1;
  var t = he(), e = no(), n = io(), i = K0(), r = Y0(), a = 0, s = 1, o = 2, c = 4, f = 5, u = 6, _ = 0, p = 1, g = 2, T = -2, z = -3, R = -4, $ = -5, E = 8, k = 1, x = 2, A = 3, N = 4, S = 5, B = 6, P = 7, F = 8, w = 9, U = 10, V = 11, J = 12, et = 13, at = 14, C = 15, tt = 16, it = 17, nt = 18, Q = 19, _t = 20, ot = 21, xt = 22, yt = 23, rt = 24, dt = 25, st = 26, kt = 27, Dt = 28, Et = 29, lt = 30, Y = 31, vt = 32, pt = 852, mt = 592, bt = 15, G = bt;
  function Mt(y) {
    return (y >>> 24 & 255) + (y >>> 8 & 65280) + ((y & 65280) << 8) + ((y & 255) << 24);
  }
  function zt() {
    this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new t.Buf16(320), this.work = new t.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
  }
  function $t(y) {
    var L;
    return !y || !y.state ? T : (L = y.state, y.total_in = y.total_out = L.total = 0, y.msg = "", L.wrap && (y.adler = L.wrap & 1), L.mode = k, L.last = 0, L.havedict = 0, L.dmax = 32768, L.head = null, L.hold = 0, L.bits = 0, L.lencode = L.lendyn = new t.Buf32(pt), L.distcode = L.distdyn = new t.Buf32(mt), L.sane = 1, L.back = -1, _);
  }
  function Nt(y) {
    var L;
    return !y || !y.state ? T : (L = y.state, L.wsize = 0, L.whave = 0, L.wnext = 0, $t(y));
  }
  function Ut(y, L) {
    var h, H;
    return !y || !y.state || (H = y.state, L < 0 ? (h = 0, L = -L) : (h = (L >> 4) + 1, L < 48 && (L &= 15)), L && (L < 8 || L > 15)) ? T : (H.window !== null && H.wbits !== L && (H.window = null), H.wrap = h, H.wbits = L, Nt(y));
  }
  function St(y, L) {
    var h, H;
    return y ? (H = new zt(), y.state = H, H.window = null, h = Ut(y, L), h !== _ && (y.state = null), h) : T;
  }
  function Tt(y) {
    return St(y, G);
  }
  var Zt = !0, ft, K;
  function ct(y) {
    if (Zt) {
      var L;
      for (ft = new t.Buf32(512), K = new t.Buf32(32), L = 0; L < 144; )
        y.lens[L++] = 8;
      for (; L < 256; )
        y.lens[L++] = 9;
      for (; L < 280; )
        y.lens[L++] = 7;
      for (; L < 288; )
        y.lens[L++] = 8;
      for (r(s, y.lens, 0, 288, ft, 0, y.work, { bits: 9 }), L = 0; L < 32; )
        y.lens[L++] = 5;
      r(o, y.lens, 0, 32, K, 0, y.work, { bits: 5 }), Zt = !1;
    }
    y.lencode = ft, y.lenbits = 9, y.distcode = K, y.distbits = 5;
  }
  function ut(y, L, h, H) {
    var j, l = y.state;
    return l.window === null && (l.wsize = 1 << l.wbits, l.wnext = 0, l.whave = 0, l.window = new t.Buf8(l.wsize)), H >= l.wsize ? (t.arraySet(l.window, L, h - l.wsize, l.wsize, 0), l.wnext = 0, l.whave = l.wsize) : (j = l.wsize - l.wnext, j > H && (j = H), t.arraySet(l.window, L, h - H, j, l.wnext), H -= j, H ? (t.arraySet(l.window, L, h - H, H, 0), l.wnext = H, l.whave = l.wsize) : (l.wnext += j, l.wnext === l.wsize && (l.wnext = 0), l.whave < l.wsize && (l.whave += j))), 0;
  }
  function m(y, L) {
    var h, H, j, l, D, O, d, v, b, X, Z, W, gt, qt, It = 0, wt, Ct, Bt, Ht, nn, rn, Lt, Wt, Ft = new t.Buf8(4), ae, ee, rr = (
      /* permutation of code lengths */
      [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
    );
    if (!y || !y.state || !y.output || !y.input && y.avail_in !== 0)
      return T;
    h = y.state, h.mode === J && (h.mode = et), D = y.next_out, j = y.output, d = y.avail_out, l = y.next_in, H = y.input, O = y.avail_in, v = h.hold, b = h.bits, X = O, Z = d, Wt = _;
    t:
      for (; ; )
        switch (h.mode) {
          case k:
            if (h.wrap === 0) {
              h.mode = et;
              break;
            }
            for (; b < 16; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            if (h.wrap & 2 && v === 35615) {
              h.check = 0, Ft[0] = v & 255, Ft[1] = v >>> 8 & 255, h.check = n(h.check, Ft, 2, 0), v = 0, b = 0, h.mode = x;
              break;
            }
            if (h.flags = 0, h.head && (h.head.done = !1), !(h.wrap & 1) || /* check if zlib header allowed */
            (((v & 255) << 8) + (v >> 8)) % 31) {
              y.msg = "incorrect header check", h.mode = lt;
              break;
            }
            if ((v & 15) !== E) {
              y.msg = "unknown compression method", h.mode = lt;
              break;
            }
            if (v >>>= 4, b -= 4, Lt = (v & 15) + 8, h.wbits === 0)
              h.wbits = Lt;
            else if (Lt > h.wbits) {
              y.msg = "invalid window size", h.mode = lt;
              break;
            }
            h.dmax = 1 << Lt, y.adler = h.check = 1, h.mode = v & 512 ? U : J, v = 0, b = 0;
            break;
          case x:
            for (; b < 16; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            if (h.flags = v, (h.flags & 255) !== E) {
              y.msg = "unknown compression method", h.mode = lt;
              break;
            }
            if (h.flags & 57344) {
              y.msg = "unknown header flags set", h.mode = lt;
              break;
            }
            h.head && (h.head.text = v >> 8 & 1), h.flags & 512 && (Ft[0] = v & 255, Ft[1] = v >>> 8 & 255, h.check = n(h.check, Ft, 2, 0)), v = 0, b = 0, h.mode = A;
          /* falls through */
          case A:
            for (; b < 32; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            h.head && (h.head.time = v), h.flags & 512 && (Ft[0] = v & 255, Ft[1] = v >>> 8 & 255, Ft[2] = v >>> 16 & 255, Ft[3] = v >>> 24 & 255, h.check = n(h.check, Ft, 4, 0)), v = 0, b = 0, h.mode = N;
          /* falls through */
          case N:
            for (; b < 16; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            h.head && (h.head.xflags = v & 255, h.head.os = v >> 8), h.flags & 512 && (Ft[0] = v & 255, Ft[1] = v >>> 8 & 255, h.check = n(h.check, Ft, 2, 0)), v = 0, b = 0, h.mode = S;
          /* falls through */
          case S:
            if (h.flags & 1024) {
              for (; b < 16; ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              h.length = v, h.head && (h.head.extra_len = v), h.flags & 512 && (Ft[0] = v & 255, Ft[1] = v >>> 8 & 255, h.check = n(h.check, Ft, 2, 0)), v = 0, b = 0;
            } else h.head && (h.head.extra = null);
            h.mode = B;
          /* falls through */
          case B:
            if (h.flags & 1024 && (W = h.length, W > O && (W = O), W && (h.head && (Lt = h.head.extra_len - h.length, h.head.extra || (h.head.extra = new Array(h.head.extra_len)), t.arraySet(
              h.head.extra,
              H,
              l,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              W,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              Lt
            )), h.flags & 512 && (h.check = n(h.check, H, W, l)), O -= W, l += W, h.length -= W), h.length))
              break t;
            h.length = 0, h.mode = P;
          /* falls through */
          case P:
            if (h.flags & 2048) {
              if (O === 0)
                break t;
              W = 0;
              do
                Lt = H[l + W++], h.head && Lt && h.length < 65536 && (h.head.name += String.fromCharCode(Lt));
              while (Lt && W < O);
              if (h.flags & 512 && (h.check = n(h.check, H, W, l)), O -= W, l += W, Lt)
                break t;
            } else h.head && (h.head.name = null);
            h.length = 0, h.mode = F;
          /* falls through */
          case F:
            if (h.flags & 4096) {
              if (O === 0)
                break t;
              W = 0;
              do
                Lt = H[l + W++], h.head && Lt && h.length < 65536 && (h.head.comment += String.fromCharCode(Lt));
              while (Lt && W < O);
              if (h.flags & 512 && (h.check = n(h.check, H, W, l)), O -= W, l += W, Lt)
                break t;
            } else h.head && (h.head.comment = null);
            h.mode = w;
          /* falls through */
          case w:
            if (h.flags & 512) {
              for (; b < 16; ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              if (v !== (h.check & 65535)) {
                y.msg = "header crc mismatch", h.mode = lt;
                break;
              }
              v = 0, b = 0;
            }
            h.head && (h.head.hcrc = h.flags >> 9 & 1, h.head.done = !0), y.adler = h.check = 0, h.mode = J;
            break;
          case U:
            for (; b < 32; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            y.adler = h.check = Mt(v), v = 0, b = 0, h.mode = V;
          /* falls through */
          case V:
            if (h.havedict === 0)
              return y.next_out = D, y.avail_out = d, y.next_in = l, y.avail_in = O, h.hold = v, h.bits = b, g;
            y.adler = h.check = 1, h.mode = J;
          /* falls through */
          case J:
            if (L === f || L === u)
              break t;
          /* falls through */
          case et:
            if (h.last) {
              v >>>= b & 7, b -= b & 7, h.mode = kt;
              break;
            }
            for (; b < 3; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            switch (h.last = v & 1, v >>>= 1, b -= 1, v & 3) {
              case 0:
                h.mode = at;
                break;
              case 1:
                if (ct(h), h.mode = _t, L === u) {
                  v >>>= 2, b -= 2;
                  break t;
                }
                break;
              case 2:
                h.mode = it;
                break;
              case 3:
                y.msg = "invalid block type", h.mode = lt;
            }
            v >>>= 2, b -= 2;
            break;
          case at:
            for (v >>>= b & 7, b -= b & 7; b < 32; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            if ((v & 65535) !== (v >>> 16 ^ 65535)) {
              y.msg = "invalid stored block lengths", h.mode = lt;
              break;
            }
            if (h.length = v & 65535, v = 0, b = 0, h.mode = C, L === u)
              break t;
          /* falls through */
          case C:
            h.mode = tt;
          /* falls through */
          case tt:
            if (W = h.length, W) {
              if (W > O && (W = O), W > d && (W = d), W === 0)
                break t;
              t.arraySet(j, H, l, W, D), O -= W, l += W, d -= W, D += W, h.length -= W;
              break;
            }
            h.mode = J;
            break;
          case it:
            for (; b < 14; ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            if (h.nlen = (v & 31) + 257, v >>>= 5, b -= 5, h.ndist = (v & 31) + 1, v >>>= 5, b -= 5, h.ncode = (v & 15) + 4, v >>>= 4, b -= 4, h.nlen > 286 || h.ndist > 30) {
              y.msg = "too many length or distance symbols", h.mode = lt;
              break;
            }
            h.have = 0, h.mode = nt;
          /* falls through */
          case nt:
            for (; h.have < h.ncode; ) {
              for (; b < 3; ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              h.lens[rr[h.have++]] = v & 7, v >>>= 3, b -= 3;
            }
            for (; h.have < 19; )
              h.lens[rr[h.have++]] = 0;
            if (h.lencode = h.lendyn, h.lenbits = 7, ae = { bits: h.lenbits }, Wt = r(a, h.lens, 0, 19, h.lencode, 0, h.work, ae), h.lenbits = ae.bits, Wt) {
              y.msg = "invalid code lengths set", h.mode = lt;
              break;
            }
            h.have = 0, h.mode = Q;
          /* falls through */
          case Q:
            for (; h.have < h.nlen + h.ndist; ) {
              for (; It = h.lencode[v & (1 << h.lenbits) - 1], wt = It >>> 24, Ct = It >>> 16 & 255, Bt = It & 65535, !(wt <= b); ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              if (Bt < 16)
                v >>>= wt, b -= wt, h.lens[h.have++] = Bt;
              else {
                if (Bt === 16) {
                  for (ee = wt + 2; b < ee; ) {
                    if (O === 0)
                      break t;
                    O--, v += H[l++] << b, b += 8;
                  }
                  if (v >>>= wt, b -= wt, h.have === 0) {
                    y.msg = "invalid bit length repeat", h.mode = lt;
                    break;
                  }
                  Lt = h.lens[h.have - 1], W = 3 + (v & 3), v >>>= 2, b -= 2;
                } else if (Bt === 17) {
                  for (ee = wt + 3; b < ee; ) {
                    if (O === 0)
                      break t;
                    O--, v += H[l++] << b, b += 8;
                  }
                  v >>>= wt, b -= wt, Lt = 0, W = 3 + (v & 7), v >>>= 3, b -= 3;
                } else {
                  for (ee = wt + 7; b < ee; ) {
                    if (O === 0)
                      break t;
                    O--, v += H[l++] << b, b += 8;
                  }
                  v >>>= wt, b -= wt, Lt = 0, W = 11 + (v & 127), v >>>= 7, b -= 7;
                }
                if (h.have + W > h.nlen + h.ndist) {
                  y.msg = "invalid bit length repeat", h.mode = lt;
                  break;
                }
                for (; W--; )
                  h.lens[h.have++] = Lt;
              }
            }
            if (h.mode === lt)
              break;
            if (h.lens[256] === 0) {
              y.msg = "invalid code -- missing end-of-block", h.mode = lt;
              break;
            }
            if (h.lenbits = 9, ae = { bits: h.lenbits }, Wt = r(s, h.lens, 0, h.nlen, h.lencode, 0, h.work, ae), h.lenbits = ae.bits, Wt) {
              y.msg = "invalid literal/lengths set", h.mode = lt;
              break;
            }
            if (h.distbits = 6, h.distcode = h.distdyn, ae = { bits: h.distbits }, Wt = r(o, h.lens, h.nlen, h.ndist, h.distcode, 0, h.work, ae), h.distbits = ae.bits, Wt) {
              y.msg = "invalid distances set", h.mode = lt;
              break;
            }
            if (h.mode = _t, L === u)
              break t;
          /* falls through */
          case _t:
            h.mode = ot;
          /* falls through */
          case ot:
            if (O >= 6 && d >= 258) {
              y.next_out = D, y.avail_out = d, y.next_in = l, y.avail_in = O, h.hold = v, h.bits = b, i(y, Z), D = y.next_out, j = y.output, d = y.avail_out, l = y.next_in, H = y.input, O = y.avail_in, v = h.hold, b = h.bits, h.mode === J && (h.back = -1);
              break;
            }
            for (h.back = 0; It = h.lencode[v & (1 << h.lenbits) - 1], wt = It >>> 24, Ct = It >>> 16 & 255, Bt = It & 65535, !(wt <= b); ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            if (Ct && (Ct & 240) === 0) {
              for (Ht = wt, nn = Ct, rn = Bt; It = h.lencode[rn + ((v & (1 << Ht + nn) - 1) >> Ht)], wt = It >>> 24, Ct = It >>> 16 & 255, Bt = It & 65535, !(Ht + wt <= b); ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              v >>>= Ht, b -= Ht, h.back += Ht;
            }
            if (v >>>= wt, b -= wt, h.back += wt, h.length = Bt, Ct === 0) {
              h.mode = st;
              break;
            }
            if (Ct & 32) {
              h.back = -1, h.mode = J;
              break;
            }
            if (Ct & 64) {
              y.msg = "invalid literal/length code", h.mode = lt;
              break;
            }
            h.extra = Ct & 15, h.mode = xt;
          /* falls through */
          case xt:
            if (h.extra) {
              for (ee = h.extra; b < ee; ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              h.length += v & (1 << h.extra) - 1, v >>>= h.extra, b -= h.extra, h.back += h.extra;
            }
            h.was = h.length, h.mode = yt;
          /* falls through */
          case yt:
            for (; It = h.distcode[v & (1 << h.distbits) - 1], wt = It >>> 24, Ct = It >>> 16 & 255, Bt = It & 65535, !(wt <= b); ) {
              if (O === 0)
                break t;
              O--, v += H[l++] << b, b += 8;
            }
            if ((Ct & 240) === 0) {
              for (Ht = wt, nn = Ct, rn = Bt; It = h.distcode[rn + ((v & (1 << Ht + nn) - 1) >> Ht)], wt = It >>> 24, Ct = It >>> 16 & 255, Bt = It & 65535, !(Ht + wt <= b); ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              v >>>= Ht, b -= Ht, h.back += Ht;
            }
            if (v >>>= wt, b -= wt, h.back += wt, Ct & 64) {
              y.msg = "invalid distance code", h.mode = lt;
              break;
            }
            h.offset = Bt, h.extra = Ct & 15, h.mode = rt;
          /* falls through */
          case rt:
            if (h.extra) {
              for (ee = h.extra; b < ee; ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              h.offset += v & (1 << h.extra) - 1, v >>>= h.extra, b -= h.extra, h.back += h.extra;
            }
            if (h.offset > h.dmax) {
              y.msg = "invalid distance too far back", h.mode = lt;
              break;
            }
            h.mode = dt;
          /* falls through */
          case dt:
            if (d === 0)
              break t;
            if (W = Z - d, h.offset > W) {
              if (W = h.offset - W, W > h.whave && h.sane) {
                y.msg = "invalid distance too far back", h.mode = lt;
                break;
              }
              W > h.wnext ? (W -= h.wnext, gt = h.wsize - W) : gt = h.wnext - W, W > h.length && (W = h.length), qt = h.window;
            } else
              qt = j, gt = D - h.offset, W = h.length;
            W > d && (W = d), d -= W, h.length -= W;
            do
              j[D++] = qt[gt++];
            while (--W);
            h.length === 0 && (h.mode = ot);
            break;
          case st:
            if (d === 0)
              break t;
            j[D++] = h.length, d--, h.mode = ot;
            break;
          case kt:
            if (h.wrap) {
              for (; b < 32; ) {
                if (O === 0)
                  break t;
                O--, v |= H[l++] << b, b += 8;
              }
              if (Z -= d, y.total_out += Z, h.total += Z, Z && (y.adler = h.check = /*UPDATE(state.check, put - _out, _out);*/
              h.flags ? n(h.check, j, Z, D - Z) : e(h.check, j, Z, D - Z)), Z = d, (h.flags ? v : Mt(v)) !== h.check) {
                y.msg = "incorrect data check", h.mode = lt;
                break;
              }
              v = 0, b = 0;
            }
            h.mode = Dt;
          /* falls through */
          case Dt:
            if (h.wrap && h.flags) {
              for (; b < 32; ) {
                if (O === 0)
                  break t;
                O--, v += H[l++] << b, b += 8;
              }
              if (v !== (h.total & 4294967295)) {
                y.msg = "incorrect length check", h.mode = lt;
                break;
              }
              v = 0, b = 0;
            }
            h.mode = Et;
          /* falls through */
          case Et:
            Wt = p;
            break t;
          case lt:
            Wt = z;
            break t;
          case Y:
            return R;
          case vt:
          /* falls through */
          default:
            return T;
        }
    return y.next_out = D, y.avail_out = d, y.next_in = l, y.avail_in = O, h.hold = v, h.bits = b, (h.wsize || Z !== y.avail_out && h.mode < lt && (h.mode < kt || L !== c)) && ut(y, y.output, y.next_out, Z - y.avail_out), X -= y.avail_in, Z -= y.avail_out, y.total_in += X, y.total_out += Z, h.total += Z, h.wrap && Z && (y.adler = h.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
    h.flags ? n(h.check, j, Z, y.next_out - Z) : e(h.check, j, Z, y.next_out - Z)), y.data_type = h.bits + (h.last ? 64 : 0) + (h.mode === J ? 128 : 0) + (h.mode === _t || h.mode === C ? 256 : 0), (X === 0 && Z === 0 || L === c) && Wt === _ && (Wt = $), Wt;
  }
  function M(y) {
    if (!y || !y.state)
      return T;
    var L = y.state;
    return L.window && (L.window = null), y.state = null, _;
  }
  function I(y, L) {
    var h;
    return !y || !y.state || (h = y.state, (h.wrap & 2) === 0) ? T : (h.head = L, L.done = !1, _);
  }
  function q(y, L) {
    var h = L.length, H, j, l;
    return !y || !y.state || (H = y.state, H.wrap !== 0 && H.mode !== V) ? T : H.mode === V && (j = 1, j = e(j, L, h, 0), j !== H.check) ? z : (l = ut(y, L, h, h), l ? (H.mode = Y, R) : (H.havedict = 1, _));
  }
  return Xt.inflateReset = Nt, Xt.inflateReset2 = Ut, Xt.inflateResetKeep = $t, Xt.inflateInit = Tt, Xt.inflateInit2 = St, Xt.inflate = m, Xt.inflateEnd = M, Xt.inflateGetHeader = I, Xt.inflateSetDictionary = q, Xt.inflateInfo = "pako inflate (from Nodeca project)", Xt;
}
var di, Ta;
function so() {
  return Ta || (Ta = 1, di = {
    /* Allowed flush values; see deflate() and inflate() below for details */
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    /* Return codes for the compression/decompression functions. Negative values
    * are errors, positive values are used for special but normal events.
    */
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    //Z_MEM_ERROR:     -4,
    Z_BUF_ERROR: -5,
    //Z_VERSION_ERROR: -6,
    /* compression levels */
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    /* Possible values of the data_type field (though see inflate()) */
    Z_BINARY: 0,
    Z_TEXT: 1,
    //Z_ASCII:                1, // = Z_TEXT (deprecated)
    Z_UNKNOWN: 2,
    /* The deflate compression method */
    Z_DEFLATED: 8
    //Z_NULL:                 null // Use -1 or null inline, depending on var type
  }), di;
}
var pi, Ea;
function Q0() {
  if (Ea) return pi;
  Ea = 1;
  function t() {
    this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
  }
  return pi = t, pi;
}
var Sa;
function j0() {
  if (Sa) return De;
  Sa = 1;
  var t = J0(), e = he(), n = ro(), i = so(), r = er(), a = ao(), s = Q0(), o = Object.prototype.toString;
  function c(_) {
    if (!(this instanceof c)) return new c(_);
    this.options = e.assign({
      chunkSize: 16384,
      windowBits: 0,
      to: ""
    }, _ || {});
    var p = this.options;
    p.raw && p.windowBits >= 0 && p.windowBits < 16 && (p.windowBits = -p.windowBits, p.windowBits === 0 && (p.windowBits = -15)), p.windowBits >= 0 && p.windowBits < 16 && !(_ && _.windowBits) && (p.windowBits += 32), p.windowBits > 15 && p.windowBits < 48 && (p.windowBits & 15) === 0 && (p.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new a(), this.strm.avail_out = 0;
    var g = t.inflateInit2(
      this.strm,
      p.windowBits
    );
    if (g !== i.Z_OK)
      throw new Error(r[g]);
    if (this.header = new s(), t.inflateGetHeader(this.strm, this.header), p.dictionary && (typeof p.dictionary == "string" ? p.dictionary = n.string2buf(p.dictionary) : o.call(p.dictionary) === "[object ArrayBuffer]" && (p.dictionary = new Uint8Array(p.dictionary)), p.raw && (g = t.inflateSetDictionary(this.strm, p.dictionary), g !== i.Z_OK)))
      throw new Error(r[g]);
  }
  c.prototype.push = function(_, p) {
    var g = this.strm, T = this.options.chunkSize, z = this.options.dictionary, R, $, E, k, x, A = !1;
    if (this.ended)
      return !1;
    $ = p === ~~p ? p : p === !0 ? i.Z_FINISH : i.Z_NO_FLUSH, typeof _ == "string" ? g.input = n.binstring2buf(_) : o.call(_) === "[object ArrayBuffer]" ? g.input = new Uint8Array(_) : g.input = _, g.next_in = 0, g.avail_in = g.input.length;
    do {
      if (g.avail_out === 0 && (g.output = new e.Buf8(T), g.next_out = 0, g.avail_out = T), R = t.inflate(g, i.Z_NO_FLUSH), R === i.Z_NEED_DICT && z && (R = t.inflateSetDictionary(this.strm, z)), R === i.Z_BUF_ERROR && A === !0 && (R = i.Z_OK, A = !1), R !== i.Z_STREAM_END && R !== i.Z_OK)
        return this.onEnd(R), this.ended = !0, !1;
      g.next_out && (g.avail_out === 0 || R === i.Z_STREAM_END || g.avail_in === 0 && ($ === i.Z_FINISH || $ === i.Z_SYNC_FLUSH)) && (this.options.to === "string" ? (E = n.utf8border(g.output, g.next_out), k = g.next_out - E, x = n.buf2string(g.output, E), g.next_out = k, g.avail_out = T - k, k && e.arraySet(g.output, g.output, E, k, 0), this.onData(x)) : this.onData(e.shrinkBuf(g.output, g.next_out))), g.avail_in === 0 && g.avail_out === 0 && (A = !0);
    } while ((g.avail_in > 0 || g.avail_out === 0) && R !== i.Z_STREAM_END);
    return R === i.Z_STREAM_END && ($ = i.Z_FINISH), $ === i.Z_FINISH ? (R = t.inflateEnd(this.strm), this.onEnd(R), this.ended = !0, R === i.Z_OK) : ($ === i.Z_SYNC_FLUSH && (this.onEnd(i.Z_OK), g.avail_out = 0), !0);
  }, c.prototype.onData = function(_) {
    this.chunks.push(_);
  }, c.prototype.onEnd = function(_) {
    _ === i.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = e.flattenChunks(this.chunks)), this.chunks = [], this.err = _, this.msg = this.strm.msg;
  };
  function f(_, p) {
    var g = new c(p);
    if (g.push(_, !0), g.err)
      throw g.msg || r[g.err];
    return g.result;
  }
  function u(_, p) {
    return p = p || {}, p.raw = !0, f(_, p);
  }
  return De.Inflate = c, De.inflate = f, De.inflateRaw = u, De.ungzip = f, De;
}
var _i, Aa;
function tp() {
  if (Aa) return _i;
  Aa = 1;
  var t = he().assign, e = X0(), n = j0(), i = so(), r = {};
  return t(r, e, n, i), _i = r, _i;
}
var ep = tp();
const np = /* @__PURE__ */ Qi(ep);
function ip(t) {
  let e = 0;
  for (const n of t)
    e += n.length;
  return e;
}
function oo(t) {
  const e = new Uint8Array(ip(t));
  let n = 0;
  for (const i of t)
    e.set(i, n), n += i.length;
  return e;
}
const { Z_SYNC_FLUSH: lo, Inflate: co } = np;
async function nr(t) {
  try {
    let e, n = 0, i;
    const r = [];
    do {
      const a = t.subarray(n);
      if (i = new co(), { strm: e } = i, i.push(a, lo), i.err)
        throw new Error(i.msg);
      n += e.next_in, r.push(i.result);
    } while (e.avail_in);
    return oo(r);
  } catch (e) {
    throw /incorrect header check/.exec(`${e}`) ? new Error("problem decompressing block: incorrect gzip header check") : e;
  }
}
async function rp(t, e) {
  try {
    let n;
    const { minv: i, maxv: r } = e;
    let a = i.blockPosition, s = i.dataPosition;
    const o = [], c = [], f = [];
    let u = 0;
    do {
      const _ = t.subarray(a - i.blockPosition), p = new co();
      if ({ strm: n } = p, p.push(_, lo), p.err)
        throw new Error(p.msg);
      const g = p.result;
      o.push(g);
      let T = g.length;
      c.push(a), f.push(s), o.length === 1 && i.dataPosition && (o[0] = o[0].subarray(i.dataPosition), T = o[0].length);
      const z = a;
      if (a += n.next_in, s += T, z >= r.blockPosition) {
        o[u] = o[u].subarray(0, r.blockPosition === i.blockPosition ? r.dataPosition - i.dataPosition + 1 : r.dataPosition + 1), c.push(a), f.push(s);
        break;
      }
      u++;
    } while (n.avail_in);
    return {
      buffer: oo(o),
      cpositions: c,
      dpositions: f
    };
  } catch (n) {
    throw /incorrect header check/.exec(`${n}`) ? new Error("problem decompressing block: incorrect gzip header check") : n;
  }
}
class Bn {
  constructor(e, n, i, r = void 0) {
    this.minv = e, this.maxv = n, this.bin = i, this._fetchedSize = r;
  }
  toUniqueString() {
    return `${this.minv}..${this.maxv} (bin ${this.bin}, fetchedSize ${this.fetchedSize()})`;
  }
  toString() {
    return this.toUniqueString();
  }
  compareTo(e) {
    return this.minv.compareTo(e.minv) || this.maxv.compareTo(e.maxv) || this.bin - e.bin;
  }
  fetchedSize() {
    return this._fetchedSize !== void 0 ? this._fetchedSize : this.maxv.blockPosition + 65536 - this.minv.blockPosition;
  }
}
class fo {
  constructor({ filehandle: e, renameRefSeqs: n = (i) => i }) {
    this.filehandle = e, this.renameRefSeq = n;
  }
  async getMetadata(e = {}) {
    const { indices: n, ...i } = await this.parse(e);
    return i;
  }
  _findFirstData(e, n) {
    return e ? e.compareTo(n) > 0 ? n : e : n;
  }
  async parse(e = {}) {
    return this.parseP || (this.parseP = this._parse(e).catch((n) => {
      throw this.parseP = void 0, n;
    })), this.parseP;
  }
  async hasRefSeq(e, n = {}) {
    return !!(await this.parse(n)).indices[e]?.binIndex;
  }
}
const $a = 65536, ap = $a * $a;
function uo(t, e = 0) {
  const n = t[e] | t[e + 1] << 8 | t[e + 2] << 16 | t[e + 3] << 24;
  return ((t[e + 4] | t[e + 5] << 8 | t[e + 6] << 16 | t[e + 7] << 24) >>> 0) * ap + (n >>> 0);
}
class sp extends Error {
}
function Xe(t) {
  if (t && t.aborted) {
    if (typeof DOMException < "u")
      throw new DOMException("aborted", "AbortError");
    {
      const e = new sp("aborted");
      throw e.code = "ERR_ABORTED", e;
    }
  }
}
function op(t, e) {
  return e.minv.blockPosition - t.maxv.blockPosition < 65e3 && e.maxv.blockPosition - t.minv.blockPosition < 5e6;
}
function ho(t, e) {
  const n = [];
  let i = null;
  return t.length === 0 ? t : (t.sort(function(r, a) {
    const s = r.minv.blockPosition - a.minv.blockPosition;
    return s !== 0 ? s : r.minv.dataPosition - a.minv.dataPosition;
  }), t.forEach((r) => {
    (!e || r.maxv.compareTo(e) > 0) && (i === null ? (n.push(r), i = r) : op(i, r) ? r.maxv.compareTo(i.maxv) > 0 && (i.maxv = r.maxv) : (n.push(r), i = r));
  }), n);
}
class ir {
  constructor(e, n) {
    this.blockPosition = e, this.dataPosition = n;
  }
  toString() {
    return `${this.blockPosition}:${this.dataPosition}`;
  }
  compareTo(e) {
    return this.blockPosition - e.blockPosition || this.dataPosition - e.dataPosition;
  }
}
function Oe(t, e = 0) {
  return new ir(t[e + 7] * 1099511627776 + t[e + 6] * 4294967296 + t[e + 5] * 16777216 + t[e + 4] * 65536 + t[e + 3] * 256 + t[e + 2], t[e + 1] << 8 | t[e]);
}
const lp = 21582659, cp = 38359875, fp = {
  0: "generic",
  1: "SAM",
  2: "VCF"
};
function up(t, e) {
  return t * 2 ** e;
}
function Na(t, e) {
  return Math.floor(t / 2 ** e);
}
class gi extends fo {
  constructor(e) {
    super(e), this.maxBinNumber = 0, this.depth = 0, this.minShift = 0;
  }
  async lineCount(e, n = {}) {
    const i = await this.parse(n), r = i.refNameToId[e];
    if (r === void 0 || !i.indices[r])
      return -1;
    const { stats: s } = i.indices[r];
    return s ? s.lineCount : -1;
  }
  indexCov() {
    throw new Error("CSI indexes do not support indexcov");
  }
  parseAuxData(e, n) {
    const i = new DataView(e.buffer), r = i.getInt32(n, !0), a = r & 65536 ? "zero-based-half-open" : "1-based-closed", s = fp[r & 15];
    if (!s)
      throw new Error(`invalid Tabix preset format flags ${r}`);
    const o = {
      ref: i.getInt32(n + 4, !0),
      start: i.getInt32(n + 8, !0),
      end: i.getInt32(n + 12, !0)
    }, c = i.getInt32(n + 16, !0), f = c ? String.fromCharCode(c) : null, u = i.getInt32(n + 20, !0), _ = i.getInt32(n + 24, !0), { refIdToName: p, refNameToId: g } = this._parseNameBytes(e.subarray(n + 28, n + 28 + _));
    return {
      refIdToName: p,
      refNameToId: g,
      skipLines: u,
      metaChar: f,
      columnNumbers: o,
      format: s,
      coordinateType: a
    };
  }
  _parseNameBytes(e) {
    let n = 0, i = 0;
    const r = [], a = {}, s = new TextDecoder("utf8");
    for (let o = 0; o < e.length; o += 1)
      if (!e[o]) {
        if (i < o) {
          const c = this.renameRefSeq(s.decode(e.subarray(i, o)));
          r[n] = c, a[c] = n;
        }
        i = o + 1, n += 1;
      }
    return {
      refNameToId: a,
      refIdToName: r
    };
  }
  // fetch and parse the index
  async _parse(e = {}) {
    const n = await nr(await this.filehandle.readFile(e)), i = new DataView(n.buffer);
    let r;
    if (i.getUint32(0, !0) === lp)
      r = 1;
    else if (i.getUint32(0, !0) === cp)
      r = 2;
    else
      throw new Error("Not a CSI file");
    this.minShift = i.getInt32(4, !0), this.depth = i.getInt32(8, !0), this.maxBinNumber = ((1 << (this.depth + 1) * 3) - 1) / 7;
    const a = 2 ** (this.minShift + this.depth * 3), s = i.getInt32(12, !0), o = s && s >= 30 ? this.parseAuxData(n, 16) : {
      refIdToName: [],
      refNameToId: {},
      metaChar: null,
      columnNumbers: { ref: 0, start: 1, end: 2 },
      coordinateType: "zero-based-half-open",
      format: "generic"
    }, c = i.getInt32(16 + s, !0);
    let f, u = 16 + s + 4;
    const _ = new Array(c).fill(0).map(() => {
      const p = i.getInt32(u, !0);
      u += 4;
      const g = {};
      let T;
      for (let z = 0; z < p; z += 1) {
        const R = i.getUint32(u, !0);
        if (R > this.maxBinNumber)
          T = this.parsePseudoBin(n, u + 4), u += 48;
        else {
          const $ = Oe(n, u + 4);
          f = this._findFirstData(f, $);
          const E = i.getInt32(u + 12, !0);
          u += 16;
          const k = new Array(E);
          for (let x = 0; x < E; x += 1) {
            const A = Oe(n, u), N = Oe(n, u + 8);
            u += 16, k[x] = new Bn(A, N, R);
          }
          g[R] = k;
        }
      }
      return { binIndex: g, stats: T };
    });
    return {
      ...o,
      csi: !0,
      refCount: c,
      maxBlockSize: 65536,
      firstDataLine: f,
      csiVersion: r,
      indices: _,
      depth: this.depth,
      maxBinNumber: this.maxBinNumber,
      maxRefLength: a
    };
  }
  parsePseudoBin(e, n) {
    return {
      lineCount: uo(e, n + 28)
    };
  }
  async blocksForRange(e, n, i, r = {}) {
    n < 0 && (n = 0);
    const a = await this.parse(r), s = a.refNameToId[e];
    if (s === void 0)
      return [];
    const o = a.indices[s];
    if (!o)
      return [];
    const c = this.reg2bins(n, i), f = [];
    for (const [u, _] of c)
      for (let p = u; p <= _; p++)
        if (o.binIndex[p])
          for (const g of o.binIndex[p])
            f.push(new Bn(g.minv, g.maxv, p));
    return ho(f, new ir(0, 0));
  }
  /**
   * calculate the list of bins that may overlap with region [beg,end) (zero-based half-open)
   */
  reg2bins(e, n) {
    e -= 1, e < 1 && (e = 1), n > 2 ** 50 && (n = 2 ** 34), n -= 1;
    let i = 0, r = 0, a = this.minShift + this.depth * 3;
    const s = [];
    for (; i <= this.depth; a -= 3, r += up(1, i * 3), i += 1) {
      const o = r + Na(e, a), c = r + Na(n, a);
      if (c - o + s.length > this.maxBinNumber)
        throw new Error(`query ${e}-${n} is too large for current binning scheme (shift ${this.minShift}, depth ${this.depth}), try a smaller query or a coarser index binning scheme`);
      s.push([o, c]);
    }
    return s;
  }
}
const hp = 21578324, Ia = 14;
function dp(t, e) {
  return t += 1, e -= 1, [
    [0, 0],
    [1 + (t >> 26), 1 + (e >> 26)],
    [9 + (t >> 23), 9 + (e >> 23)],
    [73 + (t >> 20), 73 + (e >> 20)],
    [585 + (t >> 17), 585 + (e >> 17)],
    [4681 + (t >> 14), 4681 + (e >> 14)]
  ];
}
class Ue extends fo {
  async lineCount(e, n = {}) {
    const i = await this.parse(n), r = i.refNameToId[e];
    return r === void 0 || !i.indices[r] ? -1 : i.indices[r].stats?.lineCount ?? -1;
  }
  // fetch and parse the index
  async _parse(e = {}) {
    const n = await this.filehandle.readFile(e), i = await nr(n);
    Xe(e.signal);
    const r = new DataView(i.buffer);
    if (r.getUint32(0, !0) !== hp)
      throw new Error("Not a TBI file");
    const s = r.getUint32(4, !0), o = r.getUint32(8, !0), c = o & 65536 ? "zero-based-half-open" : "1-based-closed", u = {
      0: "generic",
      1: "SAM",
      2: "VCF"
    }[o & 15];
    if (!u)
      throw new Error(`invalid Tabix preset format flags ${o}`);
    const _ = {
      ref: r.getInt32(12, !0),
      start: r.getInt32(16, !0),
      end: r.getInt32(20, !0)
    }, p = r.getInt32(24, !0), g = 5, T = ((1 << (g + 1) * 3) - 1) / 7, z = 2 ** (14 + g * 3), R = p ? String.fromCharCode(p) : null, $ = r.getInt32(28, !0), E = r.getInt32(32, !0), { refNameToId: k, refIdToName: x } = this._parseNameBytes(i.slice(36, 36 + E));
    let A = 36 + E, N;
    return {
      indices: new Array(s).fill(0).map(() => {
        const B = r.getInt32(A, !0);
        A += 4;
        const P = {};
        let F;
        for (let V = 0; V < B; V += 1) {
          const J = r.getUint32(A, !0);
          if (A += 4, J > T + 1)
            throw new Error("tabix index contains too many bins, please use a CSI index");
          if (J === T + 1) {
            const et = r.getInt32(A, !0);
            A += 4, et === 2 && (F = this.parsePseudoBin(i, A)), A += 16 * et;
          } else {
            const et = r.getInt32(A, !0);
            A += 4;
            const at = new Array(et);
            for (let C = 0; C < et; C += 1) {
              const tt = Oe(i, A), it = Oe(i, A + 8);
              A += 16, N = this._findFirstData(N, tt), at[C] = new Bn(tt, it, J);
            }
            P[J] = at;
          }
        }
        const w = r.getInt32(A, !0);
        A += 4;
        const U = new Array(w);
        for (let V = 0; V < w; V += 1)
          U[V] = Oe(i, A), A += 8, N = this._findFirstData(N, U[V]);
        return {
          binIndex: P,
          linearIndex: U,
          stats: F
        };
      }),
      metaChar: R,
      maxBinNumber: T,
      maxRefLength: z,
      skipLines: $,
      firstDataLine: N,
      columnNumbers: _,
      coordinateType: c,
      format: u,
      refIdToName: x,
      refNameToId: k,
      maxBlockSize: 65536
    };
  }
  parsePseudoBin(e, n) {
    return {
      lineCount: uo(e, n + 16)
    };
  }
  _parseNameBytes(e) {
    let n = 0, i = 0;
    const r = [], a = {}, s = new TextDecoder("utf8");
    for (let o = 0; o < e.length; o += 1)
      if (!e[o]) {
        if (i < o) {
          const c = this.renameRefSeq(s.decode(e.subarray(i, o)));
          r[n] = c, a[c] = n;
        }
        i = o + 1, n += 1;
      }
    return {
      refNameToId: a,
      refIdToName: r
    };
  }
  async blocksForRange(e, n, i, r = {}) {
    n < 0 && (n = 0);
    const a = await this.parse(r), s = a.refNameToId[e];
    if (s === void 0)
      return [];
    const o = a.indices[s];
    if (!o)
      return [];
    (o.linearIndex.length ? o.linearIndex[n >> Ia >= o.linearIndex.length ? o.linearIndex.length - 1 : n >> Ia] : new ir(0, 0)) || console.warn("querying outside of possible tabix range");
    const f = dp(n, i), u = [];
    for (const [z, R] of f)
      for (let $ = z; $ <= R; $++)
        if (o.binIndex[$])
          for (const E of o.binIndex[$])
            u.push(new Bn(E.minv, E.maxv, $));
    const _ = o.linearIndex.length;
    let p = null;
    const g = Math.min(n >> 14, _ - 1), T = Math.min(i >> 14, _ - 1);
    for (let z = g; z <= T; ++z) {
      const R = o.linearIndex[z];
      R && (!p || R.compareTo(p) < 0) && (p = R);
    }
    return ho(u, p);
  }
}
function pp(t) {
  return /^[\u0000-\u007F]*$/.test(t);
}
class _p {
  /**
   * @param {object} args
   *
   * @param {string} [args.path]
   *
   * @param {filehandle} [args.filehandle]
   *
   * @param {string} [args.tbiPath]
   *
   * @param {filehandle} [args.tbiFilehandle]
   *
   * @param {string} [args.csiPath]
   *
   * @param {filehandle} [args.csiFilehandle]
   *
   * @param {url} [args.url]
   *
   * @param {csiUrl} [args.csiUrl]
   *
   * @param {tbiUrl} [args.tbiUrl]
   *
   * @param {function} [args.renameRefSeqs] optional function with sig `string
   * => string` to transform reference sequence names for the purpose of
   * indexing and querying. note that the data that is returned is not altered,
   * just the names of the reference sequences that are used for querying.
   */
  constructor({ path: e, filehandle: n, url: i, tbiPath: r, tbiUrl: a, tbiFilehandle: s, csiPath: o, csiUrl: c, csiFilehandle: f, renameRefSeqs: u = (p) => p, chunkCacheSize: _ = 5 * 2 ** 20 }) {
    if (n)
      this.filehandle = n;
    else if (e)
      this.filehandle = new gn(e);
    else if (i)
      this.filehandle = new we(i);
    else
      throw new TypeError("must provide either filehandle or path");
    if (s)
      this.index = new Ue({
        filehandle: s,
        renameRefSeqs: u
      });
    else if (f)
      this.index = new gi({
        filehandle: f,
        renameRefSeqs: u
      });
    else if (r)
      this.index = new Ue({
        filehandle: new gn(r),
        renameRefSeqs: u
      });
    else if (o)
      this.index = new gi({
        filehandle: new gn(o),
        renameRefSeqs: u
      });
    else if (e)
      this.index = new Ue({
        filehandle: new gn(`${e}.tbi`),
        renameRefSeqs: u
      });
    else if (c)
      this.index = new gi({
        filehandle: new we(c)
      });
    else if (a)
      this.index = new Ue({
        filehandle: new we(a)
      });
    else if (i)
      this.index = new Ue({
        filehandle: new we(`${i}.tbi`)
      });
    else
      throw new TypeError("must provide one of tbiFilehandle, tbiPath, csiFilehandle, csiPath, tbiUrl, csiUrl");
    this.renameRefSeq = u, this.chunkCache = new Te({
      cache: new Gn({ maxSize: Math.floor(_ / 65536) }),
      fill: (p, g) => this.readChunk(p, { signal: g })
    });
  }
  /**
   * @param refName name of the reference sequence
   *
   * @param start start of the region (in 0-based half-open coordinates)
   *
   * @param end end of the region (in 0-based half-open coordinates)
   *
   * @param opts callback called for each line in the region. can also pass a
   * object param containing obj.lineCallback, obj.signal, etc
   *
   * @returns promise that is resolved when the whole read is finished,
   * rejected on error
   */
  async getLines(e, n, i, r) {
    let a, s = {}, o;
    typeof r == "function" ? o = r : (s = r, o = r.lineCallback, a = r.signal);
    const c = await this.index.getMetadata(s);
    Xe(a);
    const f = n ?? 0, u = i ?? c.maxRefLength;
    if (!(f <= u))
      throw new TypeError("invalid start and end coordinates. start must be less than or equal to end");
    if (f === u)
      return;
    const _ = await this.index.blocksForRange(e, f, u, s);
    Xe(a);
    const p = new TextDecoder("utf8");
    for (const g of _) {
      const { buffer: T, cpositions: z, dpositions: R } = await this.chunkCache.get(g.toString(), g, a);
      Xe(a);
      let $ = 0, E = 0;
      const k = p.decode(T), x = pp(k);
      for (; $ < k.length; ) {
        let A, N;
        if (x) {
          if (N = k.indexOf(`
`, $), N === -1)
            break;
          A = k.slice($, N);
        } else {
          if (N = T.indexOf(10, $), N === -1)
            break;
          const P = T.slice($, N);
          A = p.decode(P);
        }
        if (R) {
          for (; $ + g.minv.dataPosition >= R[E++]; )
            ;
          E--;
        }
        const { startCoordinate: S, overlaps: B } = this.checkLine(c, e, f, u, A);
        if (B)
          o(
            A,
            // cpositions[pos] refers to actual file offset of a bgzip block
            // boundaries
            //
            // we multiply by (1 <<8) in order to make sure each block has a
            // "unique" address space so that data in that block could never
            // overlap
            //
            // then the blockStart-dpositions is an uncompressed file offset
            // from that bgzip block boundary, and since the cpositions are
            // multiplied by (1 << 8) these uncompressed offsets get a unique
            // space
            z[E] * 256 + ($ - R[E]) + g.minv.dataPosition + 1
          );
        else if (S !== void 0 && S >= u)
          return;
        $ = N + 1;
      }
    }
  }
  async getMetadata(e = {}) {
    return this.index.getMetadata(e);
  }
  /**
   * get a buffer containing the "header" region of the file, which are the
   * bytes up to the first non-meta line
   */
  async getHeaderBuffer(e = {}) {
    const { firstDataLine: n, metaChar: i, maxBlockSize: r } = await this.getMetadata(e);
    Xe(e.signal);
    const a = (n?.blockPosition || 0) + r, s = await this.filehandle.read(a, 0, e), o = await nr(s);
    if (i) {
      let c = -1;
      const f = 10, u = i.charCodeAt(0);
      for (let _ = 0; _ < o.length && !(_ === c + 1 && o[_] !== u); _ += 1)
        o[_] === f && (c = _);
      return o.subarray(0, c + 1);
    }
    return o;
  }
  /**
   * get a string containing the "header" region of the file, is the portion up
   * to the first non-meta line
   *
   * @returns {Promise} for a string
   */
  async getHeader(e = {}) {
    const n = new TextDecoder("utf8"), i = await this.getHeaderBuffer(e);
    return n.decode(i);
  }
  /**
   * get an array of reference sequence names, in the order in which they occur
   * in the file. reference sequence renaming is not applied to these names.
   */
  async getReferenceSequenceNames(e = {}) {
    return (await this.getMetadata(e)).refIdToName;
  }
  /**
   * @param {object} metadata metadata object from the parsed index, containing
   * columnNumbers, metaChar, and format
   *
   * @param {string} regionRefName
   *
   * @param {number} regionStart region start coordinate (0-based-half-open)
   *
   * @param {number} regionEnd region end coordinate (0-based-half-open)
   *
   * @param {array[string]} line
   *
   * @returns {object} like `{startCoordinate, overlaps}`. overlaps is boolean,
   * true if line is a data line that overlaps the given region
   */
  checkLine(e, n, i, r, a) {
    const { columnNumbers: s, metaChar: o, coordinateType: c, format: f } = e;
    if (o && a.startsWith(o))
      return { overlaps: !1 };
    let { ref: u, start: _, end: p } = s;
    u || (u = 0), _ || (_ = 0), p || (p = 0), f === "VCF" && (p = 8);
    const g = Math.max(u, _, p);
    let T = 1, z = 0, R = "", $ = -1 / 0;
    const E = a.length;
    for (let k = 0; k < E + 1; k++)
      if (a[k] === "	" || k === E) {
        if (T === u) {
          if (this.renameRefSeq(a.slice(z, k)) !== n)
            return {
              overlaps: !1
            };
        } else if (T === _) {
          if ($ = parseInt(a.slice(z, k), 10), c === "1-based-closed" && ($ -= 1), $ >= r)
            return {
              startCoordinate: $,
              overlaps: !1
            };
          if ((p === 0 || p === _) && $ + 1 <= i)
            return {
              startCoordinate: $,
              overlaps: !1
            };
        } else if (f === "VCF" && T === 4)
          R = a.slice(z, k);
        else if (T === p && (f === "VCF" ? this._getVcfEnd($, R, a.slice(z, k)) : Number.parseInt(a.slice(z, k), 10)) <= i)
          return {
            overlaps: !1
          };
        if (z = k + 1, T += 1, T > g)
          break;
      }
    return {
      startCoordinate: $,
      overlaps: !0
    };
  }
  _getVcfEnd(e, n, i) {
    let r = e + n.length;
    const a = i.includes("SVTYPE=TRA");
    if (i[0] !== "." && !a) {
      let s = ";";
      for (let o = 0; o < i.length; o += 1) {
        if (s === ";" && i.slice(o, o + 4) === "END=") {
          let c = i.indexOf(";", o);
          c === -1 && (c = i.length), r = parseInt(i.slice(o + 4, c), 10);
          break;
        }
        s = i[o];
      }
    } else if (a)
      return e + 1;
    return r;
  }
  /**
   * return the approximate number of data lines in the given reference
   * sequence
   *
   * @param refSeq reference sequence name
   *
   * @returns number of data lines present on that reference sequence
   */
  async lineCount(e, n = {}) {
    return this.index.lineCount(e, n);
  }
  /**
   * read and uncompress the data in a chunk (composed of one or more
   * contiguous bgzip blocks) of the file
   */
  async readChunk(e, n = {}) {
    const i = await this.filehandle.read(e.fetchedSize(), e.minv.blockPosition, n);
    return rp(i, e);
  }
}
function gp(t, e, n) {
  const i = e.split("	"), r = {};
  let a = 0;
  if (t.includes("GT")) {
    const s = t.split(":");
    if (s.length === 1)
      for (const o of n)
        r[o] = i[a++];
    else {
      const o = s.indexOf("GT");
      if (o === 0)
        for (const c of n) {
          const f = i[a++], u = f.indexOf(":");
          r[c] = u !== -1 ? f.slice(0, u) : f;
        }
      else
        for (const c of n) {
          const f = i[a++].split(":");
          r[c] = f[o];
        }
    }
  }
  return r;
}
function mp(t) {
  const e = [];
  let n = "", i = !1, r = !1;
  for (const a of t)
    a === '"' ? (i = !i, n += a) : a === "[" ? (r = !0, n += a) : a === "]" ? (r = !1, n += a) : a === "," && !i && !r ? (e.push(n.trim()), n = "") : n += a;
  return n && e.push(n.trim()), e;
}
function vp(t, e) {
  const n = t.indexOf(e);
  return [t.slice(0, n), t.slice(n + 1)];
}
function wp(t) {
  const e = t.replace(/^<|>$/g, "");
  return Object.fromEntries(mp(e).map((n) => {
    const [i, r] = vp(n, "=");
    return r && r.startsWith("[") && r.endsWith("]") ? [
      i,
      r.slice(1, -1).split(",").map((a) => a.trim())
    ] : r && r.startsWith('"') && r.endsWith('"') ? [i, r.slice(1, -1)] : [i, r?.replaceAll(/^"|"$/g, "")];
  }));
}
const mn = {
  // INFO fields
  InfoFields: {
    // from the VCF4.3 spec, https://samtools.github.io/hts-specs/VCFv4.3.pdf
    AA: { Number: 1, Type: "String", Description: "Ancestral allele" },
    AC: {
      Number: "A",
      Type: "Integer",
      Description: "Allele count in genotypes, for each ALT allele, in the same order as listed"
    },
    AD: {
      Number: "R",
      Type: "Integer",
      Description: "Total read depth for each allele"
    },
    ADF: {
      Number: "R",
      Type: "Integer",
      Description: "Read depth for each allele on the forward strand"
    },
    ADR: {
      Number: "R",
      Type: "Integer",
      Description: "Read depth for each allele on the reverse strand"
    },
    AF: {
      Number: "A",
      Type: "Float",
      Description: "Allele frequency for each ALT allele in the same order as listed (estimated from primary data, not called genotypes)"
    },
    AN: {
      Number: 1,
      Type: "Integer",
      Description: "Total number of alleles in called genotypes"
    },
    BQ: {
      Number: 1,
      Type: "Float",
      Description: "RMS base quality"
    },
    CIGAR: {
      Number: 1,
      Type: "Float",
      Description: "Cigar string describing how to align an alternate allele to the reference allele"
    },
    DB: {
      Number: 0,
      Type: "Flag",
      Description: "dbSNP membership"
    },
    DP: {
      Number: 1,
      Type: "Integer",
      Description: "combined depth across samples"
    },
    END: {
      Number: 1,
      Type: "Integer",
      Description: "End position (for use with symbolic alleles)"
    },
    H2: {
      Number: 0,
      Type: "Flag",
      Description: "HapMap2 membership"
    },
    H3: {
      Number: 0,
      Type: "Flag",
      Description: "HapMap3 membership"
    },
    MQ: {
      Number: 1,
      Type: null,
      Description: "RMS mapping quality"
    },
    MQ0: {
      Number: 1,
      Type: "Integer",
      Description: "Number of MAPQ == 0 reads"
    },
    NS: {
      Number: 1,
      Type: "Integer",
      Description: "Number of samples with data"
    },
    SB: {
      Number: 4,
      Type: "Integer",
      Description: "Strand bias"
    },
    SOMATIC: {
      Number: 0,
      Type: "Flag",
      Description: "Somatic mutation (for cancer genomics)"
    },
    VALIDATED: {
      Number: 0,
      Type: "Flag",
      Description: "Validated by follow-up experiment"
    },
    "1000G": {
      Number: 0,
      Type: "Flag",
      Description: "1000 Genomes membership"
    },
    // specifically for structural variants
    IMPRECISE: {
      Number: 0,
      Type: "Flag",
      Description: "Imprecise structural variation"
    },
    NOVEL: {
      Number: 0,
      Type: "Flag",
      Description: "Indicates a novel structural variation"
    },
    // For precise variants, END is POS + length of REF allele - 1,
    // and the for imprecise variants the corresponding best estimate.
    SVTYPE: {
      Number: 1,
      Type: "String",
      Description: "Type of structural variant"
    },
    // Value should be one of DEL, INS, DUP, INV, CNV, BND. This key can
    // be derived from the REF/ALT fields but is useful for filtering.
    SVLEN: {
      Number: null,
      Type: "Integer",
      Description: "Difference in length between REF and ALT alleles"
    },
    // One value for each ALT allele. Longer ALT alleles (e.g. insertions)
    // have positive values, shorter ALT alleles (e.g. deletions)
    // have negative values.
    CIPOS: {
      Number: 2,
      Type: "Integer",
      Description: "Confidence interval around POS for imprecise variants"
    },
    CIEND: {
      Number: 2,
      Type: "Integer",
      Description: "Confidence interval around END for imprecise variants"
    },
    HOMLEN: {
      Type: "Integer",
      Description: "Length of base pair identical micro-homology at event breakpoints"
    },
    HOMSEQ: {
      Type: "String",
      Description: "Sequence of base pair identical micro-homology at event breakpoints"
    },
    BKPTID: {
      Type: "String",
      Description: "ID of the assembled alternate allele in the assembly file"
    },
    // For precise variants, the consensus sequence the alternate allele assembly
    // is derivable from the REF and ALT fields. However, the alternate allele
    // assembly file may contain additional information about the characteristics
    // of the alt allele contigs.
    MEINFO: {
      Number: 4,
      Type: "String",
      Description: "Mobile element info of the form NAME,START,END,POLARITY"
    },
    METRANS: {
      Number: 4,
      Type: "String",
      Description: "Mobile element transduction info of the form CHR,START,END,POLARITY"
    },
    DGVID: {
      Number: 1,
      Type: "String",
      Description: "ID of this element in Database of Genomic Variation"
    },
    DBVARID: {
      Number: 1,
      Type: "String",
      Description: "ID of this element in DBVAR"
    },
    DBRIPID: {
      Number: 1,
      Type: "String",
      Description: "ID of this element in DBRIP"
    },
    MATEID: {
      Number: null,
      Type: "String",
      Description: "ID of mate breakends"
    },
    PARID: {
      Number: 1,
      Type: "String",
      Description: "ID of partner breakend"
    },
    EVENT: {
      Number: 1,
      Type: "String",
      Description: "ID of event associated to breakend"
    },
    CILEN: {
      Number: 2,
      Type: "Integer",
      Description: "Confidence interval around the inserted material between breakend"
    },
    DPADJ: { Type: "Integer", Description: "Read Depth of adjacency" },
    CN: {
      Number: 1,
      Type: "Integer",
      Description: "Copy number of segment containing breakend"
    },
    CNADJ: {
      Number: null,
      Type: "Integer",
      Description: "Copy number of adjacency"
    },
    CICN: {
      Number: 2,
      Type: "Integer",
      Description: "Confidence interval around copy number for the segment"
    },
    CICNADJ: {
      Number: null,
      Type: "Integer",
      Description: "Confidence interval around copy number for the adjacency"
    }
  },
  // FORMAT fields
  GenotypeFields: {
    // from the VCF4.3 spec, https://samtools.github.io/hts-specs/VCFv4.3.pdf
    AD: {
      Number: "R",
      Type: "Integer",
      Description: "Read depth for each allele"
    },
    ADF: {
      Number: "R",
      Type: "Integer",
      Description: "Read depth for each allele on the forward strand"
    },
    ADR: {
      Number: "R",
      Type: "Integer",
      Description: "Read depth for each allele on the reverse strand"
    },
    DP: {
      Number: 1,
      Type: "Integer",
      Description: "Read depth"
    },
    EC: {
      Number: "A",
      Type: "Integer",
      Description: "Expected alternate allele counts"
    },
    FT: {
      Number: 1,
      Type: "String",
      Description: 'Filter indicating if this genotype was "called"'
    },
    GL: {
      Number: "G",
      Type: "Float",
      Description: "Genotype likelihoods"
    },
    GP: {
      Number: "G",
      Type: "Float",
      Description: "Genotype posterior probabilities"
    },
    GQ: {
      Number: 1,
      Type: "Integer",
      Description: "Conditional genotype quality"
    },
    GT: {
      Number: 1,
      Type: "String",
      Description: "Genotype"
    },
    HQ: {
      Number: 2,
      Type: "Integer",
      Description: "Haplotype quality"
    },
    MQ: {
      Number: 1,
      Type: "Integer",
      Description: "RMS mapping quality"
    },
    PL: {
      Number: "G",
      Type: "Integer",
      Description: "Phred-scaled genotype likelihoods rounded to the closest integer"
    },
    PQ: {
      Number: 1,
      Type: "Integer",
      Description: "Phasing quality"
    },
    PS: {
      Number: 1,
      Type: "Integer",
      Description: "Phase set"
    }
  },
  // ALT fields
  AltTypes: {
    DEL: {
      Description: "Deletion relative to the reference"
    },
    INS: {
      Description: "Insertion of novel sequence relative to the reference"
    },
    DUP: {
      Description: "Region of elevated copy number relative to the reference"
    },
    INV: {
      Description: "Inversion of reference sequence"
    },
    CNV: {
      Description: "Copy number variable region (may be both deletion and duplication)"
    },
    "DUP:TANDEM": {
      Description: "Tandem duplication"
    },
    "DEL:ME": {
      Description: "Deletion of mobile element relative to the reference"
    },
    "INS:ME": {
      Description: "Insertion of a mobile element relative to the reference"
    },
    NON_REF: {
      Description: "Represents any possible alternative allele at this location"
    },
    "*": {
      Description: "Represents any possible alternative allele at this location"
    }
  },
  // FILTER fields
  FilterTypes: {
    PASS: {
      Description: "Passed all filters"
    }
  }
};
function yp(t) {
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}
class xp {
  constructor({ header: e = "", strict: n = !0 }) {
    if (!e.length)
      throw new Error("empty header received");
    const i = e.split(/[\r\n]+/).filter(Boolean);
    if (!i.length)
      throw new Error("no non-empty header lines specified");
    this.strict = n, this.metadata = JSON.parse(JSON.stringify({
      INFO: mn.InfoFields,
      FORMAT: mn.GenotypeFields,
      ALT: mn.AltTypes,
      FILTER: mn.FilterTypes
    }));
    let r;
    if (i.forEach((c) => {
      if (c.startsWith("#"))
        c.startsWith("##") ? this.parseMetadata(c) : r = c;
      else throw new Error(`Bad line in header:
${c}`);
    }), !r)
      throw new Error("No format line found in header");
    const a = r.trim().split("	"), s = a.slice(0, 8), o = [
      "#CHROM",
      "POS",
      "ID",
      "REF",
      "ALT",
      "QUAL",
      "FILTER",
      "INFO"
    ];
    if (a.length < 8)
      throw new Error(`VCF header missing columns:
${r}`);
    if (s.length !== o.length || !s.every((c, f) => c === o[f]))
      throw new Error(`VCF column headers not correct:
${r}`);
    this.samples = a.slice(9);
  }
  parseSamples(e, n) {
    const i = {};
    if (e) {
      const r = n.split("	"), a = e.split(":"), s = a.map((o) => {
        const c = this.getMetadata("FORMAT", o, "Type");
        return c === "Integer" || c === "Float";
      });
      for (let o = 0; o < this.samples.length; o++) {
        const c = this.samples[o];
        i[c] = {};
        const f = r[o].split(":");
        for (let u = 0; u < f.length; u++) {
          const _ = f[u];
          i[c][a[u]] = _ === "" || _ === "." ? void 0 : _.split(",").map((p) => p === "." ? void 0 : s[u] ? +p : p);
        }
      }
    }
    return i;
  }
  /**
   * Parse a VCF metadata line (i.e. a line that starts with "##") and add its
   * properties to the object.
   *
   * @param {string} line - A line from the VCF. Supports both LF and CRLF
   * newlines.
   */
  parseMetadata(e) {
    const n = /^##(.+?)=(.*)/.exec(e.trim());
    if (!n)
      throw new Error(`Line is not a valid metadata line: ${e}`);
    const [i, r] = n.slice(1, 3), a = i;
    if (r?.startsWith("<")) {
      a in this.metadata || (this.metadata[a] = {});
      const [s, o] = this.parseStructuredMetaVal(r);
      s ? this.metadata[a][s] = o : this.metadata[a] = o;
    } else
      this.metadata[a] = r;
  }
  /**
   * Parse a VCF header structured meta string (i.e. a meta value that starts
   * with "<ID=...")
   *
   * @param {string} metaVal - The VCF metadata value
   *
   * @returns {Array} - Array with two entries, 1) a string of the metadata ID
   * and 2) an object with the other key-value pairs in the metadata
   */
  parseStructuredMetaVal(e) {
    const n = wp(e), i = n.ID;
    return delete n.ID, "Number" in n && (Number.isNaN(Number(n.Number)) || (n.Number = Number(n.Number))), [i, n];
  }
  /**
   * Get metadata filtered by the elements in args. For example, can pass
   * ('INFO', 'DP') to only get info on an metadata tag that was like
   * "##INFO=<ID=DP,...>"
   *
   * @param  {...string} args - List of metadata filter strings.
   *
   * @returns {any} An object, string, or number, depending on the filtering
   */
  getMetadata(...e) {
    let n = this.metadata;
    for (const i of e)
      if (n = n[i], !n)
        return n;
    return n;
  }
  /**
   * Parse a VCF line into an object like
   *
   * ```typescript
   * {
   *   CHROM: 'contigA',
   *   POS: 3000,
   *   ID: ['rs17883296'],
   *   REF: 'G',
   *   ALT: ['T', 'A'],
   *   QUAL: 100,
   *   FILTER: 'PASS',
   *   INFO: {
   *     NS: [3],
   *     DP: [14],
   *     AF: [0.5],
   *     DB: true,
   *     XYZ: ['5'],
   *   },
   *   SAMPLES: () => ({
   *     HG00096: {
   *       GT: ['0|0'],
   *       AP: ['0.000', '0.000'],
   *     }
   *   }),
   *   GENOTYPES: () => ({
   *     HG00096: '0|0'
   *   })
   * }
   * ```
   *
   * SAMPLES and GENOTYPES methods are functions instead of static data fields
   * because it avoids parsing the potentially long list of samples from e.g.
   * 1000 genotypes data unless requested.
   *
   * The SAMPLES function gives all info about the samples
   *
   * The GENOTYPES function only extracts the raw GT string if it exists, for
   * potentially optimized parsing by programs that need it
   *
   * @param {string} line - A string of a line from a VCF
   */
  parseLine(e) {
    let n = 0;
    for (let N = 0; n < e.length && (e[n] === "	" && (N += 1), N !== 9); n += 1)
      ;
    const i = e.slice(0, n).split("	"), r = e.slice(n + 1), [a, s, o, c, f, u, _] = i, p = a, g = +s, T = o === "." ? void 0 : o.split(";"), z = c, R = f === "." ? void 0 : f.split(","), $ = u === "." ? void 0 : +u, E = _ === "." ? void 0 : _.split(";"), k = i[8];
    if (this.strict && !i[7])
      throw new Error("no INFO field specified, must contain at least a '.' (turn off strict mode to allow)");
    const x = i[7]?.includes("%"), A = i[7] === void 0 || i[7] === "." ? {} : Object.fromEntries(i[7].split(";").map((N) => {
      const [S, B] = N.split("="), P = B?.split(",").map((w) => w === "." ? void 0 : w).map((w) => w && x ? yp(w) : w), F = this.getMetadata("INFO", S, "Type");
      return F === "Integer" || F === "Float" ? [
        S,
        P?.map((w) => w === void 0 ? void 0 : Number(w))
      ] : F === "Flag" ? [S, !0] : [S, P ?? !0];
    }));
    return {
      CHROM: p,
      POS: g,
      ALT: R,
      INFO: A,
      REF: z,
      FILTER: E && E.length === 1 && E[0] === "PASS" ? "PASS" : E,
      ID: T,
      QUAL: $,
      FORMAT: k,
      SAMPLES: () => this.parseSamples(i[8] ?? "", r),
      GENOTYPES: () => gp(i[8] ?? "", r, this.samples)
    };
  }
}
function bp(t) {
  const e = t.split(/[[\]]/);
  if (e.length > 1) {
    const n = t.includes("[") ? "right" : "left";
    let i, r, a;
    for (const s of e)
      s && (s.includes(":") ? (a = s, i = r ? "right" : "left") : r = s);
    if (!(a && i && r))
      throw new Error(`Invalid breakend: ${t}`);
    return { MatePosition: a, Join: i, Replacement: r, MateDirection: n };
  } else {
    if (t.startsWith("."))
      return {
        Join: "left",
        SingleBreakend: !0,
        Replacement: t.slice(1)
      };
    if (t.endsWith("."))
      return {
        Join: "right",
        SingleBreakend: !0,
        Replacement: t.slice(0, -1)
      };
    if (t.startsWith("<")) {
      const n = /<(.*)>(.*)/.exec(t);
      if (!n)
        throw new Error(`failed to parse ${t}`);
      const i = n[2];
      return i ? {
        Join: "left",
        Replacement: i,
        MateDirection: "right",
        MatePosition: `<${n[1]}>:1`
      } : void 0;
    } else if (t.includes("<")) {
      const n = /(.*)<(.*)>/.exec(t);
      if (!n)
        throw new Error(`failed to parse ${t}`);
      const i = n[1];
      return i ? {
        Join: "right",
        Replacement: i,
        MateDirection: "right",
        MatePosition: `<${n[2]}>:1`
      } : void 0;
    }
  }
}
const kp = {
  DEL: "deletion",
  INS: "insertion",
  DUP: "duplication",
  INV: "inversion",
  INVDUP: "inverted_duplication",
  CNV: "copy_number_variation",
  TRA: "translocation",
  "DUP:TANDEM": "tandem_duplication",
  NON_REF: "sequence_variant",
  "*": "sequence_variant"
};
function Tp(t, e, n) {
  if (!e || e.length === 0)
    return ["remark", "no alternative alleles"];
  const i = /* @__PURE__ */ new Set();
  let r = /* @__PURE__ */ new Set();
  if (e.forEach((a) => {
    let [s, o] = po(a, n);
    s || ([s, o] = Ep(t, a)), s && o && (i.add(s), r.add(o));
  }), r.size > 1) {
    const a = [...r], s = new Set(
      a.map((o) => {
        const c = o.split("->");
        return c[1] ? c[0] : o;
      }).filter((o) => !!o)
    );
    r = new Set(
      [...s].map((o) => o.trim()).map((o) => {
        const c = a.map((f) => f.split("->").map((u) => u.trim())).map((f) => f[1] && f[0] === o ? f[1] : "").filter((f) => !!f);
        return c.length ? `${o} -> ${c.join(",")}` : o;
      })
    );
  }
  return i.size ? [[...i].join(","), [...r].join(",")] : [];
}
function po(t, e) {
  if (typeof t == "string" && !t.startsWith("<"))
    return [];
  let n = kp[t];
  if (!n && e.getMetadata("ALT", t) && (n = "sequence_variant"), n)
    return [n, t];
  const i = t.split(":");
  return i.length > 1 ? po(`<${i.slice(0, -1).join(":")}>`, e) : [];
}
function Ep(t, e) {
  if (bp(e))
    return ["breakend", e];
  if (t.length === 1 && e.length === 1)
    return ["SNV", Re("SNV", t, e)];
  if (e === "<INS>")
    return ["insertion", e];
  if (e === "<DEL>")
    return ["deletion", e];
  if (e === "<DUP>")
    return ["duplication", e];
  if (e === "<CNV>")
    return ["cnv", e];
  if (e === "<INV>")
    return ["inversion", e];
  if (e === "<TRA>")
    return ["translocation", e];
  if (e.includes("<"))
    return ["sv", e];
  if (t.length === e.length)
    return t.split("").reverse().join("") === e ? ["inversion", Re("inversion", t, e)] : ["substitution", Re("substitution", t, e)];
  if (t.length <= e.length) {
    const i = e.length - t.length, r = i.toLocaleString("en-US");
    return [
      "insertion",
      i > 5 ? `${r}bp INS` : Re("insertion", t, e)
    ];
  }
  if (t.length > e.length) {
    const i = t.length - e.length, r = i.toLocaleString("en-US");
    return [
      "deletion",
      i > 5 ? `${r}bp DEL` : Re("deletion", t, e)
    ];
  }
  return ["indel", Re("indel", t, e)];
}
function Re(t, e, n) {
  return `${t} ${e} -> ${n}`;
}
function Sp(t, e) {
  const { REF: n = "", ALT: i, POS: r, CHROM: a, ID: s } = t, o = r - 1, [c, f] = Tp(n, i, e);
  return {
    refName: a,
    start: o,
    end: Ap(t),
    description: f,
    type: c,
    name: s?.join(","),
    aliases: s && s.length > 1 ? s.slice(1) : void 0
  };
}
function Ap(t) {
  const { POS: e, REF: n = "", ALT: i } = t, r = i?.includes("<TRA>"), a = e - 1;
  if (i?.some((o) => o.includes("<"))) {
    const o = t.INFO;
    if (o.END && !r)
      return +o.END[0];
  }
  return a + n.length;
}
class $p {
  constructor(e) {
    this.variant = e.variant, this.parser = e.parser, this.data = Sp(this.variant, this.parser), this._id = e.id;
  }
  get(e) {
    return e === "samples" ? this.variant.SAMPLES() : e === "genotypes" ? this.variant.GENOTYPES() : this.data[e] ?? this.variant[e];
  }
  parent() {
  }
  children() {
  }
  id() {
    return this._id;
  }
  toJSON() {
    const { SAMPLES: e, GENOTYPES: n, ...i } = this.variant;
    return {
      uniqueId: this._id,
      ...i,
      ...this.data,
      samples: this.variant.SAMPLES()
    };
  }
}
async function Dp({
  url: t,
  indexUrl: e,
  indexType: n = "TBI",
  region: i
}) {
  const r = e ?? t + (n === "TBI" ? ".tbi" : ".csi"), a = new _p({
    tbiFilehandle: n === "TBI" ? new we(r) : void 0,
    csiFilehandle: n === "CSI" ? new we(r) : void 0,
    filehandle: new we(t)
  }), s = new xp({
    header: await a.getHeader()
  }), o = [];
  let c = 0;
  return await a.getLines(i.chromosome, i.start, i.end, {
    lineCallback: (f) => {
      const u = s.parseLine(f), _ = new $p({
        variant: u,
        parser: s,
        id: `${c++}`
      }), p = _.get("INFO");
      o.push({
        id: _.get("ID"),
        reference_allele: _.get("REF"),
        alternative_alleles: { values: _.get("ALT") },
        name: _.get("name"),
        seqId: _.get("refName"),
        fmin: _.get("start"),
        fmax: _.get("end"),
        strand: 1,
        source: "",
        type: Da(p.soTerm[0]) ?? _.get("type"),
        ...Object.fromEntries(
          Object.entries(p).map(([g, T]) => [
            g,
            {
              values: [JSON.stringify(T.map((z) => Da(z)))]
            }
          ])
        )
      });
    }
  }), o;
}
function Da(t) {
  return t?.replace(/['"]+/g, "");
}
function Rp(t) {
  const [e, n] = t.split(":"), [i, r] = n.split("..");
  return {
    chromosome: e,
    start: +i,
    end: +r
  };
}
Se.prototype.first = function() {
  return ht(this.nodes()[0]);
};
Se.prototype.last = function() {
  return ht(this.nodes()[this.size() - 1]);
};
class Mp {
  constructor(e, n, i, r) {
    this.height = r, this.width = i, this.config = e, this.svg_target = n, this.viewer = this._initViewer(n), this.draw();
  }
  generateLegend() {
    return Ou();
  }
  get tracks() {
    return this.config.tracks ?? [];
  }
  get genome() {
    return this.config.genome;
  }
  closeModal() {
    for (const e of document.getElementsByClassName("gfc-tooltip"))
      e.style.visibility = "hidden";
  }
  setSelectedAlleles(e, n) {
    const i = ht(n);
    i.selectAll(".highlight").remove(), i.selectAll(
      ".variant-deletion,.variant-SNV,.variant-insertion,.variant-delins"
    ).filter((r) => r.selected === "true").style("stroke", null).datum((r) => (r.selected = "false", r)), Xi(e, i);
  }
  _initViewer(e) {
    ht(e).selectAll("*").remove();
    const n = ht(e), r = `${e.replace("#", "")} main-view`, a = {
      top: 8,
      right: 30,
      bottom: 30,
      left: 40
    };
    return n.attr("width", this.width).attr("height", this.height).append("g").attr("transform", `translate(${a.left},${a.top})`).attr("class", r), this.width = this.width - a.left - a.right, this.height = this.height - a.top - a.bottom, ht(`${e} .main-view`);
  }
  getTracks(e) {
    return e ? this.tracks[0] : this.tracks;
  }
  draw() {
    const e = this.width, n = this.config.transcriptTypes ?? $u, i = this.config.variantTypes ?? Nu, r = this.config.binRatio ?? 0.01, a = this.config.region, s = this._configureRange(
      a.start,
      a.end,
      e
    ), o = s.range, c = a.chromosome, f = this.config.variantFilter ?? [], u = this.config.isoformFilter ?? [], _ = this.config.htpVariant ?? "", p = s.start, g = s.end;
    new Pu({
      viewer: this.viewer,
      track: {
        chromosome: c,
        start: p,
        end: g,
        range: s.range
      },
      height: this.height,
      width: e
    }).DrawOverviewTrack();
    let R = 100;
    const $ = this.config.showVariantLabel ?? !0, { viewer: E, genome: k, height: x, tracks: A } = this;
    if (!A || !Array.isArray(A))
      throw new Error(`Tracks must be an array, got: ${typeof A}`);
    A.map((N) => {
      const { variantData: S, trackData: B } = N;
      if (N.type === Ve.ISOFORM_AND_VARIANT) {
        const P = new Fu({
          viewer: E,
          height: x,
          width: e,
          transcriptTypes: n,
          variantTypes: i,
          showVariantLabel: $,
          trackData: B,
          variantData: S,
          variantFilter: f,
          binRatio: r,
          isoformFilter: u,
          geneBounds: N.geneBounds,
          geneSymbol: N.geneSymbol,
          geneId: N.geneId,
          speciesTaxonId: N.speciesTaxonId
          // Pass species taxon ID
        });
        R += P.DrawTrack();
      } else if (N.type === Ve.ISOFORM_EMBEDDED_VARIANT) {
        const P = new zu({
          viewer: E,
          height: x,
          width: e,
          transcriptTypes: n,
          variantData: S,
          trackData: B,
          variantTypes: i,
          showVariantLabel: $,
          variantFilter: f
        });
        R += P.DrawTrack();
      } else if (N.type === Ve.ISOFORM) {
        const P = new Bu({
          region: a,
          viewer: E,
          height: x,
          width: e,
          genome: k,
          trackData: B,
          transcriptTypes: n,
          htpVariant: _,
          geneBounds: N.geneBounds,
          geneSymbol: N.geneSymbol,
          geneId: N.geneId
        });
        R += P.DrawTrack();
      } else N.type === Ve.VARIANT ? new fd({
        region: a,
        viewer: E,
        range: o,
        height: x,
        width: e
      }).DrawTrack() : N.type === Ve.VARIANT_GLOBAL ? new ud({
        region: a,
        viewer: E,
        track: {
          ...N,
          range: o
        },
        height: x,
        width: e
      }).DrawTrack() : console.error(`TrackType not found ${N.type}`);
      ht(this.svg_target).attr("height", R);
    });
  }
  // Configure the range for our tracks two use cases
  //    1. Entered with a position
  //    2. TODO: Entered with a range start at 0?
  //    3. Are we in overview or scrollable?
  _configureRange(e, n, i) {
    let r = null;
    const a = 17;
    let s = 0, o = [0, 0];
    if (e === n) {
      r = 300, s = a * r, e = e - r / 2 - 1, n = n + r / 2;
      const c = (
        // @ts-expect-error
        ht("#clip-rect").node().getBoundingClientRect().width / 2 + 100
      );
      o = [
        c - s / 2,
        c + s / 2
      ];
    } else
      return {
        range: [0, i],
        start: e,
        end: n
      };
    return {
      range: o,
      start: e,
      end: n
    };
  }
}
export {
  Mp as GenomeFeatureViewer,
  Ip as fetchApolloAPIData,
  Np as fetchNCListData,
  Dp as fetchTabixVcfData,
  Rp as parseLocString
};
