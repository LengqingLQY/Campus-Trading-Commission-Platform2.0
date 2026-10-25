"use strict";

const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = (name) => fs.readFileSync(path.join(__dirname, "../js", name), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
};

function badgeApp({user = {id: 1}, request = async () => ({unreadCount: 2, latestId: 8})} = {}) {
    const events = {}, timers = new Map();
    const badge = {hidden: true, textContent: "", setAttribute(k, v) { this[k] = v; }};
    const document = {readyState: "loading", visibilityState: "visible",
        addEventListener(name, cb) { events[name] = cb; }, getElementById() { return badge; }};
    const window = {CTCP: {currentUser: async () => user, request}};
    let timerId = 0;
    vm.runInNewContext(read("notifications.js"), {window, document,
        setInterval(cb, ms) { const id = ++timerId; timers.set(id, {cb, ms}); return id; },
        clearInterval(id) { timers.delete(id); }});
    return {N: window.CTCPNotifications, badge, timers, document, events};
}

test("游客不请求消息、不启动轮询；角标显示 99+ 并保留实际读屏数量", async () => {
    let requests = 0;
    const guest = badgeApp({user: null, request: async () => { requests++; }});
    await guest.N.init();
    assert.equal(requests, 0); assert.equal(guest.timers.size, 0); assert.equal(guest.badge.hidden, true);
    const app = badgeApp(); await app.N.init();
    app.N.setCounts({unreadCount: 105, latestId: 105});
    assert.equal(app.badge.textContent, "99+"); assert.match(app.badge["aria-label"], /105/);
    app.N.setCounts({unreadCount: 0, latestId: 105}); assert.equal(app.badge.hidden, true);
});

test("30 秒轮询在隐藏时暂停，回到可见时立即刷新，401 清理角标和定时器", async () => {
    let requests = 0, expired = false;
    const app = badgeApp({request: async () => {
        requests++; if (expired) throw {status: 401}; return {unreadCount: 3, latestId: 4};
    }});
    await app.N.init(); assert.equal([...app.timers.values()][0].ms, 30000);
    app.document.visibilityState = "hidden"; app.events.visibilitychange();
    assert.equal(app.timers.size, 0); await app.N.refresh(); assert.equal(requests, 1);
    app.document.visibilityState = "visible"; app.events.visibilitychange(); await tick();
    assert.equal(requests, 2); assert.equal(app.timers.size, 1);
    expired = true; await app.N.refresh(); assert.equal(app.timers.size, 0); assert.equal(app.badge.hidden, true);
});

test("计数请求合并；过期响应不能覆盖列表已同步的数量；网络失败保留上次数量", async () => {
    const response = deferred(); let requests = 0;
    const app = badgeApp({request: () => { requests++; return response.promise; }});
    const first = app.N.refresh(), second = app.N.refresh(); await tick(); assert.equal(requests, 1);
    app.N.setCounts({unreadCount: 1, latestId: 11}); response.resolve({unreadCount: 9, latestId: 9});
    await Promise.all([first, second]); assert.equal(app.N.state.unreadCount, 1);
    const offline = badgeApp({request: async () => { throw {status: 0}; }});
    offline.N.setCounts({unreadCount: 5, latestId: 10}); await offline.N.refresh();
    assert.equal(offline.N.state.unreadCount, 5); assert.equal(offline.N._stopped, false);
});

function button(dataset = {}) {
    return {dataset, disabled: false, listeners: {}, classList: {toggle() {}},
        setAttribute() {}, addEventListener(name, cb) { this.listeners[name] = cb; },
        click() { return this.listeners.click({preventDefault() {}}); }};
}

function messageApp(request, search = "") {
    const categories = ["all", "audit", "order", "termination"].map((category) => button({category}));
    const filters = ["all", "unread"].map((state) => button({state}));
    const markAll = button(), refresh = button(), hint = {};
    const banner = {hidden: true, querySelector() { return refresh; }};
    const list = {innerHTML: "", querySelector() { return null; }, querySelectorAll(selector) {
        if (selector === "[data-mark]") {
            this.mark = button({mark: "7"}); return this.innerHTML.includes("data-mark") ? [this.mark] : [];
        }
        if (selector === "[data-open]") {
            const href = this.innerHTML.match(/href="([^"]+)" data-open/);
            this.open = button({id: "7"});
            this.open.getAttribute = () => href && href[1];
            this.open.closest = () => ({classList: {contains: () => true}});
            return href ? [this.open] : [];
        }
        return [];
    }};
    const pagination = {innerHTML: "", querySelectorAll() { return []; }};
    const root = {querySelector(selector) {
        return {"[data-message-list]": list, "[data-pagination]": pagination, "[data-new-banner]": banner}[selector];
    }, querySelectorAll(selector) { return selector === "[data-category]" ? categories : filters; }};
    const document = {querySelector(selector) {
        return {"[data-message-center]": root, "[data-unread-hint]": hint, "[data-mark-all]": markAll}[selector];
    }};
    const counts = [], writes = [], errors = [];
    const N = {state: {latestId: 0}, onUnread(cb) { this.listener = cb; },
        setCounts(data) { counts.push(data); this.state = data; this.listener(data); },
        refresh: async () => {}, markRead: async () => {}, markAll: async (id) => { writes.push(id); return {updatedCount: 1}; }};
    const location = {search, href: ""}, history = {replaceState(a, b, value) { this.url = value; }};
    const api = {request, requireUser: async () => ({id: 1}),
        query: (p) => "?" + new URLSearchParams(p), escapeHtml: (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
        pageUrlWithReturn: (p, ret) => p + (p.includes("?") ? "&" : "?") + "returnTo=" + encodeURIComponent(ret),
        toast: (s) => errors.push(s)};
    vm.runInNewContext(read("message-center.js"), {window: {CTCP: api, CTCPNotifications: N}, document, location, history, URLSearchParams});
    return {categories, filters, markAll, refresh, hint, banner, list, pagination, N, counts, writes, errors, location, history};
}

const data = (overrides = {}) => ({list: [{id: 7, type: "order_created", category: "order", title: "教材", content: "完整正文",
    targetType: "product_order", targetId: 42, read: false, createdAt: "2026-10-25 12:00:00"}],
    total: 1, page: 1, size: 20, unreadCount: 1, latestId: 7, ...overrides});

test("列表同步角标；新消息仅显示提示；全部已读使用列表水位", async () => {
    const app = messageApp(async () => data()); await tick();
    assert.equal(app.counts[0].latestId, 7); assert.match(app.hint.textContent, /1/);
    assert.equal(app.banner.hidden, true);
    app.N.state.latestId = 10; app.N.listener({unreadCount: 2, latestId: 10});
    assert.equal(app.banner.hidden, false);
    await app.markAll.click(); assert.deepEqual(app.writes, [7]);
});

test("快速切换分类时，只渲染最后一次请求；参数归一化", async () => {
    const old = deferred(), recent = deferred(); let count = 0;
    const app = messageApp(() => (++count === 1 ? old.promise : recent.promise)); await tick();
    app.categories[1].click(); await tick();
    recent.resolve(data({list: [], total: 0, unreadCount: 0, latestId: 9})); await tick();
    old.resolve(data()); await tick(); assert.equal(app.counts.length, 1); assert.equal(app.counts[0].latestId, 9);
    const urls = [];
    messageApp(async (url) => { urls.push(url); return data(); }, "?category=bad&state=read&page=-5"); await tick();
    assert.match(urls[0], /category=all&state=all&page=1/);
});

test("未读末页读完后回到有效末页，读写失败不提前跳转", async () => {
    const urls = []; let calls = 0;
    const app = messageApp(async (url) => {
        urls.push(url); return ++calls === 1 ? data({list: [], total: 20}) : data({total: 20});
    }, "?state=unread&page=2"); await tick(); await tick();
    assert.match(urls[1], /page=1/); assert.match(app.history.url, /page=1/);
    app.N.markRead = async () => { throw new Error("离线"); };
    await app.list.open.click(); assert.equal(app.location.href, ""); assert.match(app.errors[0], /已读失败/);
    app.N.markRead = async () => {};
    await app.list.open.click(); assert.match(app.location.href, /product-order.jsp\?orderId=42/);
    assert.match(app.location.href, /returnTo=message-center.jsp/);
});
