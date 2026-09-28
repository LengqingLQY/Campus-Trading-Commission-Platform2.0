"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const domain = require("../js/domain.js");

const webRoot = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(webRoot, file), "utf8");
const imageUrl = "http://localhost:8081/uploads/products/first.png";
const products = [
    {id: 1, title: "有图商品", imageUrls: ` ,  ${imageUrl} , /uploads/second.png`},
    {id: 2, title: "无图商品", imageUrls: " , , "},
    {id: 3, title: '带"引号的商品', imageUrls: '/uploads/test.png?label="cover"&size=small'}
].map((item) => ({status: "on_sale", category: "book", price: 10, ...item}));
const tasks = [
    {id: 1, title: "有图任务", imageUrls: " /uploads/task.png , /uploads/task-2.png"},
    {id: 2, title: "无图任务", imageUrls: null}
].map((item) => ({status: "open", amount: 5, ...item}));

async function renderPage(script) {
    const elements = new Map();
    for (const selector of [
        "[data-recommendations]", "[data-todos]", "[data-todo-count]", "[data-home-feedback]",
        "[data-action='refresh-recommendations']", "[data-product-grid]", "[data-product-count]",
        "[data-today-count]", "[data-product-search]"
    ]) {
        elements.set(selector, {
            innerHTML: "", textContent: "", listeners: {},
            addEventListener(type, callback) { this.listeners[type] = callback; },
            querySelector() { return null; }
        });
    }
    const readyCallbacks = [];
    const context = vm.createContext({
        document: {
            readyState: "loading",
            addEventListener(type, callback) {
                if (type === "DOMContentLoaded") readyCallbacks.push(callback);
            },
            querySelector: (selector) => elements.get(selector) || null,
            querySelectorAll: () => []
        },
        location: new URL("http://localhost:8080/CTCP/main.jsp"),
        URL, URLSearchParams, setTimeout, clearTimeout,
        CTCPDomain: domain
    });
    context.window = context;
    vm.runInContext(read("js/api.js"), context, {filename: "api.js"});
    const api = context.CTCP;
    api.requireUser = async () => ({username: "测试同学"});
    api.request = async (endpoint) => ({
        list: endpoint.startsWith("/public/products") ? products
            : endpoint.startsWith("/public/tasks") ? tasks : []
    });
    api.toast = () => {};
    vm.runInContext(read(`js/${script}`), context, {filename: script});
    for (const callback of readyCallbacks) callback();
    await new Promise(setImmediate);
    return {api, elements};
}

function assertCards(html, wrapper) {
    const cards = [...html.matchAll(wrapper)].map((match) => match[0]);
    const withImage = cards.find((card) => card.includes("有图商品"));
    const withoutImage = cards.find((card) => card.includes("无图商品"));
    assert.ok(withImage && withoutImage, "列表应正常渲染有图和无图商品");
    assert.ok(withImage.includes(`src="${imageUrl}"`), "缩略图应取第一张非空图片并去除两端空白");
    assert.equal((withImage.match(/<img\b/g) || []).length, 1, "卡片仅展示一张缩略图");
    assert.doesNotMatch(withImage, /second\.png/, "第二张图片只在详情页展示");
    assert.doesNotMatch(withoutImage, /<img\b|--has-image/, "无图商品应保留图标占位，不生成空图片");
    assert.match(withoutImage, /📚/, "无图商品保留分类图标");
    assert.ok(html.includes('src="/uploads/test.png?label=&quot;cover&quot;&amp;size=small"'), "图片地址必须进行 HTML 转义");
}

async function main() {
    const home = await renderPage("home.js");
    const api = home.api;
    for (const empty of [undefined, null, "", " , , ", 123]) {
        assert.equal(api.firstImageUrl(empty), "", "空图片字段不应产生无效缩略图");
    }
    assert.equal(api.firstImageUrl(` , ${imageUrl} , /second.png`), imageUrl);
    const recommendations = home.elements.get("[data-recommendations]");
    assertCards(recommendations.innerHTML, /<a class="discovery-card[\s\S]*?<\/a>/g);
    assert.match(recommendations.innerHTML, /class="discovery-card__image"/, "首页必须展示真实缩略图");
    assert.match(recommendations.innerHTML, /src="\/uploads\/task\.png"/, "首页跑腿推荐也应展示上传图片");
    const noImageTask = [...recommendations.innerHTML.matchAll(/<a class="discovery-card[\s\S]*?<\/a>/g)]
        .map((match) => match[0]).find((card) => card.includes("无图任务"));
    assert.ok(noImageTask);
    assert.doesNotMatch(noImageTask, /<img\b/, "无图任务仍显示占位图标");
    home.elements.get("[data-action='refresh-recommendations']").listeners.click();
    assertCards(recommendations.innerHTML, /<a class="discovery-card[\s\S]*?<\/a>/g);

    const market = await renderPage("market.js");
    assertCards(market.elements.get("[data-product-grid]").innerHTML, /<article class="product-card[\s\S]*?<\/article>/g);
    assert.equal(market.elements.get("[data-product-count]").textContent, "共 3 件");

    const css = read("css/functional.css");
    assert.match(css, /\.discovery-card__image\s*\{[^}]*object-fit:\s*cover;/, "首页缩略图应等比例填充卡片");
    assert.match(css, /\.discovery-card__visual--has-image::after\s*\{\s*display:\s*none;/, "真实图片上不应叠加装饰图案");
    console.log("列表图片测试通过：首页商品/任务缩略图、二手列表首图、空图占位、地址转义、换一批推荐");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
