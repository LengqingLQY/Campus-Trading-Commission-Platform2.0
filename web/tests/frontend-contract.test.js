"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const domain = require("../js/domain.js");

const sequence = [0.12, 0.83, 0.34, 0.66, 0.21, 0.91, 0.48, 0.57];
let sequenceIndex = 0;
const deterministicRandom = () => sequence[(sequenceIndex++) % sequence.length];

const pool = [
    ...Array.from({length: 7}, (_, index) => ({kind: "product", data: {id: index + 1}})),
    ...Array.from({length: 5}, (_, index) => ({kind: "task", data: {id: index + 1}}))
];
const recommendations = domain.selectRecommendations(pool, deterministicRandom);
assert.equal(recommendations.length, 8, "推荐流最多返回 8 条");
assert.equal(recommendations.filter((entry) => entry.kind === "product").length, 5, "推荐流优先包含 5 件商品");
assert.equal(recommendations.filter((entry) => entry.kind === "task").length, 3, "推荐流优先包含 3 个任务");
assert.equal(new Set(recommendations.map((entry) => `${entry.kind}-${entry.data.id}`)).size, 8, "推荐流不能重复");

const todos = domain.buildTradeTodos(
    [
        {orderId: 1, orderStatus: "created", title: "卖家待交付"},
        {orderId: 2, orderStatus: "delivered", title: "卖家等待"},
        {orderId: 3, orderStatus: "completed", title: "已完成不展示"}
    ],
    [
        {orderId: 4, orderStatus: "created", title: "买家等待"},
        {orderId: 5, orderStatus: "delivered", title: "买家待确认"},
        {orderId: 6, orderStatus: "cancelled", title: "已取消不展示"}
    ]
);
assert.deepEqual(todos.map((entry) => entry.item.orderId).sort(), [1, 2, 4, 5], "待办只显示进行中订单");
assert.ok(todos[0].needsAction && todos[1].needsAction, "需要当前用户操作的订单必须置顶");
assert.equal(domain.todoMeta("seller", "created").statusText, "待交付");
assert.equal(domain.todoMeta("buyer", "delivered").statusText, "待确认收货");

assert.equal(domain.orderAction("seller", "created"), "deliver");
assert.equal(domain.orderAction("buyer", "created"), "waiting_seller");
assert.equal(domain.orderAction("seller", "delivered"), "waiting_buyer");
assert.equal(domain.orderAction("buyer", "delivered"), "complete");
assert.equal(domain.orderAction("buyer", "completed"), "completed");

const webRoot = path.resolve(__dirname, "..");
const pages = ["index.jsp", "register.jsp", "main.jsp", "secondhand.jsp", "product-detail.jsp", "product-publish.jsp", "product-order.jsp"];
for (const page of pages) {
    const html = fs.readFileSync(path.join(webRoot, page), "utf8");
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page} 不应包含重复 id`);
    for (const match of html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)) {
        assert.ok(fs.existsSync(path.join(webRoot, match[1])), `${page} 引用的资源 ${match[1]} 必须存在`);
    }
}

const scripts = fs.readdirSync(path.join(webRoot, "js")).filter((name) => name.endsWith(".js"));
const source = scripts.map((name) => fs.readFileSync(path.join(webRoot, "js", name), "utf8")).join("\n");
[
    "/login", "/register", "/users/me", "/logout",
    "/public/products", "/public/tasks", "/products/",
    "/me/products", "/product-orders/"
].forEach((endpoint) => assert.ok(source.includes(endpoint), `前端应引用接口 ${endpoint}`));

console.log(`前端契约测试通过：推荐流、4 种待办、5 种订单动作、${pages.length} 个页面资源`);
