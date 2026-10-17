"use strict";
const assert = require("node:assert/strict");
const {test} = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const domain = require("../js/domain.js");
const read = name => fs.readFileSync(path.join(__dirname, "../js", name), "utf8");

function element() {
    return {innerHTML: "", textContent: "", dataset: {}, disabled: false, listeners: {},
        classList: {add() {}}, setAttribute() {},
        addEventListener(type, handler) { this.listeners[type] = handler; }};
}

async function orderPage(kind, role, failed = false) {
    const root = element(), slot = element(), button = element(), feedback = element();
    const radios = Array.from({length: 5}, (_, i) => Object.assign(element(), {value: String(i + 1)}));
    slot.querySelectorAll = () => radios;
    root.querySelector = selector => {
        if (selector === "[data-copy-contact]") return element();
        if (selector === "[data-rating-feedback]") return feedback;
        if (selector === "[data-rating-selector]") return root.innerHTML.includes("data-rating-selector") ? slot : null;
        if (selector === "[data-rating-submit]") return root.innerHTML.includes("data-rating-submit") ? button : null;
        return null;
    };
    root.querySelectorAll = () => [];
    const context = vm.createContext({URL, URLSearchParams,
        location: new URL("http://localhost:8080/CTCP/" + kind + "-order.jsp?orderId=7"),
        document: {readyState: "loading", currentScript: null, addEventListener() {}, querySelector: () => root},
        CTCPDomain: domain});
    context.window = context;
    vm.runInContext(read("api.js"), context);
    const api = context.CTCP;
    api.requireUser = async () => ({id: 1});
    api.toast = () => {};
    const order = {id: 7, productId: 1, status: "completed", viewerRole: role, sellerName: "卖家<x>", buyerName: "买家",
        publisherName: "发布者", accepterName: "接单者", counterpartyRating: {average: 4.5, count: 2}, myRatingStars: null};
    const requests = [];
    let resolvePost;
    api.request = async (url, config) => {
        if (config && config.method === "POST") {
            requests.push({url, body: config.body});
            await new Promise(resolve => { resolvePost = resolve; });
            if (failed) throw new Error("评价服务失败");
            order.myRatingStars = config.body.stars;
        }
        return order;
    };
    vm.runInContext(read("rating.js"), context);
    vm.runInContext(read(kind + "-order.js"), context);
    await new Promise(setImmediate);
    return {root, button, feedback, radios, requests, finish: () => resolvePost()};
}

for (const [kind, role] of [["product", "buyer"], ["product", "seller"], ["task", "publisher"], ["task", "accepter"]]) {
    test(`${kind}/${role}：选星提交、禁用按钮、刷新订单和评分`, async () => {
        const page = await orderPage(kind, role);
        assert.match(page.root.innerHTML, /4\.5/);
        assert.doesNotMatch(page.root.innerHTML, /卖家<x>/);
        await page.button.listeners.click({currentTarget: page.button});
        assert.match(page.feedback.textContent, /请先选择/);
        assert.equal(page.requests.length, 0);
        page.radios[4].listeners.change();
        const pending = page.button.listeners.click({currentTarget: page.button});
        assert.equal(page.button.disabled, true, "实际按钮必须在请求期间禁用");
        assert.equal(page.requests[0].url, `/${kind}-orders/7/rating`);
        assert.equal(page.requests[0].body.stars, 5);
        page.finish();
        await pending;
        assert.match(page.root.innerHTML, /已评价 5 星/);
    });
}

test("提交失败显示接口错误并恢复按钮", async () => {
    const page = await orderPage("task", "publisher", true);
    page.radios[0].listeners.change();
    const pending = page.button.listeners.click({currentTarget: page.button});
    page.finish();
    await pending;
    assert.equal(page.button.disabled, false);
    assert.equal(page.feedback.textContent, "评价服务失败");
});

test("空评分显示暂无评价，平均分显示一位小数", () => {
    const context = vm.createContext({window: {CTCP: {escapeHtml: String}}});
    vm.runInContext(read("rating.js"), context);
    const rating = context.window.CTCPRating;
    assert.match(rating.ratingBadge({average: null, count: 0}, "buyer"), /暂无评价/);
    assert.doesNotMatch(rating.ratingBadge({average: null, count: 0}), /is-filled/);
    assert.match(rating.ratingBadge({average: 14 / 3, count: 3}), /4\.7/);
});

test("个人空间：翻页、待评价筛选和返回来源保留", async () => {
    const html = fs.readFileSync(path.join(__dirname, "../profile-user.jsp"), "utf8");
    const nodes = new Map();
    for (const [attribute] of html.matchAll(/\bdata-[\w-]+/g)) {
        const node = Object.assign(element(), {style: {}});
        node.querySelector = selector => nodes.get(selector) || null;
        node.querySelectorAll = () => [];
        nodes.set(`[${attribute}]`, node);
    }
    const list = nodes.get("[data-record-list]");
    list.querySelectorAll = selector => {
        const attribute = selector.slice(1, -1);
        const datasetName = attribute === "data-rating-page" ? "ratingPage" : "ratingState";
        const buttons = [...list.innerHTML.matchAll(new RegExp(attribute + '="([^"]+)"', "g"))].map(([, value]) => {
            const button = element();
            button.dataset[datasetName] = value;
            return button;
        });
        list[datasetName] = buttons;
        return buttons;
    };
    const location = new URL("http://localhost:8080/CTCP/profile-user.jsp?recordTab=rating-orders");
    const context = vm.createContext({URL, URLSearchParams, location,
        history: {replaceState(state, title, url) { location.href = String(url); }},
        document: {readyState: "loading", currentScript: null, addEventListener() {},
            querySelector: selector => nodes.get(selector) || null, querySelectorAll: () => []}});
    context.window = context;
    vm.runInContext(read("api.js"), context);
    context.CTCP.requireUser = async () => ({id: 1, username: "同学"});
    context.CTCP.request = async url => {
        if (url.startsWith("/public/users/")) return {buyer: {average: null, count: 0}, seller: {average: null, count: 0}};
        const query = new URL("http://test" + url).searchParams;
        const pending = query.get("state") === "pending";
        const page = Number(query.get("page"));
        if (pending && page > 1) return {total: 1, list: []};
        return {total: pending ? 1 : 21, list: [{kind: "task", orderId: page === 2 ? 21 : 1,
            title: pending ? "待评价订单" : page === 2 ? "第21笔订单" : "首笔订单",
            counterpartyId: 2, counterpartyName: "交易对象", counterpartRole: "seller", myRatingStars: null}]};
    };
    vm.runInContext(read("rating.js"), context);
    context.document.readyState = "complete";
    vm.runInContext(read("profile.js"), context);
    await new Promise(setImmediate);
    assert.match(list.innerHTML, /共 21 条/);
    list.ratingPage[1].listeners.click.call(list.ratingPage[1]);
    await new Promise(setImmediate);
    assert.match(list.innerHTML, /第21笔订单/);
    assert.equal(location.searchParams.get("ratingPage"), "2");
    assert.match(list.innerHTML, /returnTo=.*ratingPage%3D2/);
    list.ratingState[0].listeners.click.call(list.ratingState[0]);
    await new Promise(setImmediate);
    assert.match(list.innerHTML, /待评价订单/);
    assert.equal(location.searchParams.get("ratingPage"), "1");
    assert.equal(location.searchParams.get("ratingState"), "pending");
    location.searchParams.set("ratingPage", "2");
    vm.runInContext(read("profile.js"), context);
    await new Promise(setImmediate);
    assert.equal(location.searchParams.get("ratingPage"), "1", "末页评价完成后应回到仍有记录的最后一页");
    assert.match(list.innerHTML, /待评价订单/);
});
