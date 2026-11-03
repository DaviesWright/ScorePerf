/*
 * ScoReview vivid colours. Loaded in <head> on every page (see
 * scoreview_performance/templates/index.html), before Chart.js.
 *
 * 1. Wraps the global Chart so every chart's dataset colours are made vivid
 *    without editing the upstream chart scripts. Hues are kept (green stays
 *    green), saturation/lightness are lifted; greys take a palette colour;
 *    near-white and near-black (borders, "hidden slice" grey) are left alone.
 * 2. Gives each dashboard tile its own accent via --sco-accent (see colors.css).
 */
(function (root) {
    "use strict";

    var PALETTE = [
        "#5B97F5", // brand blue (logo)
        "#16C57F", // brand emerald (senrabconsultech.com)
        "#F59E0B", // amber
        "#00B8CC", // brand cyan (senrabconsultech.com)
        "#8B5CF6", // violet
        "#EC4899", // pink
        "#F97316", // orange
        "#EF4444", // red
        "#6366F1", // indigo
        "#84CC16", // lime
    ];

    function parse(color) {
        if (typeof color !== "string") return null;
        var c = color.trim(), m;
        if ((m = /^#([0-9a-f]{3})$/i.exec(c))) {
            return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
        }
        if ((m = /^#([0-9a-f]{6})$/i.exec(c))) {
            return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: 1 };
        }
        if ((m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(c))) {
            return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        }
        return null;
    }

    function toHsl(o) {
        var r = o.r / 255, g = o.g / 255, b = o.b / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, h = 0, s = 0;
        if (max !== min) {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
        }
        return { h: h, s: s, l: l };
    }

    function toRgb(h, s, l) {
        function f(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        return { r: Math.round(f(p, q, h + 1 / 3) * 255), g: Math.round(f(p, q, h) * 255), b: Math.round(f(p, q, h - 1 / 3) * 255) };
    }

    function hex(o) {
        return "#" + [o.r, o.g, o.b].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
    }

    function vivid(color, i) {
        var o = parse(color);
        if (!o || o.a === 0) return color;
        var hsl = toHsl(o);
        if (hsl.l < 0.2) return color;
        var out;
        if (hsl.s < 0.25) {
            if (hsl.l > 0.88) return color;
            out = parse(PALETTE[i % PALETTE.length]);
        } else {
            out = toRgb(hsl.h, Math.max(hsl.s, 0.72), Math.min(Math.max(hsl.l, 0.45), 0.58));
        }
        return o.a < 1 ? "rgba(" + out.r + "," + out.g + "," + out.b + "," + o.a + ")" : hex(out);
    }

    var KEYS = ["backgroundColor", "borderColor", "hoverBackgroundColor", "pointBackgroundColor", "pointBorderColor"];

    function recolor(data) {
        try {
            var sets = data && data.datasets;
            if (!sets) return;
            sets.forEach(function (ds, di) {
                KEYS.forEach(function (k) {
                    var v = ds[k];
                    if (Array.isArray(v)) {
                        ds[k] = v.map(function (c, i) { return vivid(c, i); });
                    } else if (typeof v === "string") {
                        ds[k] = vivid(v, di);
                    }
                });
            });
        } catch (e) { /* never break a chart over colour */ }
    }

    function wrap(C) {
        if (!C || C.__scoWrapped) return C;
        var update = C.prototype && C.prototype.update;
        if (update) {
            C.prototype.update = function (mode) {
                recolor(this.data);
                return update.call(this, mode);
            };
        }
        var proxy = new Proxy(C, {
            construct: function (target, args) {
                if (args[1]) recolor(args[1].data);
                return Reflect.construct(target, args);
            },
            get: function (target, prop) {
                return prop === "__scoWrapped" ? true : target[prop];
            },
        });
        return proxy;
    }

    if (root && typeof root === "object" && root.document) {
        var real = root.Chart;
        Object.defineProperty(root, "Chart", {
            configurable: true,
            get: function () { return real; },
            set: function (v) { real = wrap(v); },
        });
        if (real) real = wrap(real);

        var tint = function () {
            var n = 0;
            root.document.querySelectorAll(".oh-card-dashboard:not(.oh-card-dashboard--transparent)").forEach(function (el) {
                el.style.setProperty("--sco-accent", PALETTE[n++ % PALETTE.length]);
            });
        };
        root.document.addEventListener("DOMContentLoaded", tint);
        root.document.addEventListener("htmx:afterSettle", tint);
    }

    root.__scoColors = { vivid: vivid, recolor: recolor, wrap: wrap, PALETTE: PALETTE };
})(typeof window !== "undefined" ? window : globalThis);
