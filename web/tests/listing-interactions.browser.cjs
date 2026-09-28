"use strict";

// 仅拦截测试浏览器的请求，不启动或改动真实后端 / 数据库。
// 运行：可用 Playwright 的环境中执行 node --test web/tests/listing-interactions.browser.cjs
const {test, before, after} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {chromium} = require("playwright");
const webRoot = path.resolve(__dirname, "..");
const artifacts = process.env.CTCP_TEST_ARTIFACTS || path.join(os.tmpdir(), "ctcp-listing-ui");
const origin = "http://ctcp.test";
let browser;

before(async () => {
    browser = await chromium.launch({headless: true, channel: process.env.CTCP_TEST_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined)});
    fs.mkdirSync(artifacts, {recursive: true});
});
after(async () => { if (browser) await browser.close(); });

function fixture(overrides = {}) {
    return {
        user: {id: 7, username: "林同学", role: "user"},
        item: {id: 21, sellerId: 7, publisherId: 7, sellerName: "林同学", publisherName: "林同学", title: "九成新高等数学教材 · 上下册",
            description: "陪我度过大一的两本教材，希望继续帮到需要的同学。\n书页完整，少量铅笔标注，附课后习题笔记。\n图书馆门口可以当面看看，时间我们一起商量。",
            price: 28, amount: 6, category: "book", condition: "good", pickup: "南区菜鸟驿站", delivery: "紫金公寓 2 号楼", location: "图书馆门口",
            contact: "微信：campus-example", createdAt: "2026-09-04 09:30:00", deadline: "2026-09-05 18:30:00", status: "on_sale", auditStatus: "approved",
            imageUrls: "/images/1.svg,/images/2.svg,/images/3.svg"},
        comments: Array.from({length: 23}, (_, index) => ({id: index + 1, authorId: index % 2 ? 8 : 7,
            authorName: index % 2 ? "周同学" : "林同学", content: index % 2 ? "请问这周五下午方便在图书馆交接吗？" : "可以的，有什么想了解的都可以留言。",
            createdAt: `2026-09-04 10:${String(index).padStart(2, "0")}:00`, replyTo: null})),
        nextCommentId: 100, requests: [], errors: [], uploads: [], holdUploads: false,
        ...overrides
    };
}

async function openPage(t, file, state = fixture(), viewport = {width: 1440, height: 960}) {
    const context = await browser.newContext({viewport});
    t.after(() => context.close());
    const page = await context.newPage();
    page.on("pageerror", (error) => state.errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.pathname.startsWith("/api/")) {
            const endpoint = url.pathname.slice(4);
            const method = request.method();
            const body = request.headers()["content-type"]?.startsWith("application/json") ? request.postDataJSON() : null;
            state.requests.push({endpoint, method, body, query: url.search});
            const respond = (data, code = 0) => route.fulfill({status: code || 200, contentType: "application/json", body: JSON.stringify({code, msg: code ? `模拟接口错误 ${code}` : "success", data})});
            if (endpoint === "/users/me") return respond(state.user, state.user ? 0 : 401);
            const comments = endpoint.match(/^\/(public\/)?(products|tasks)\/\d+\/comments(?:\/(\d+))?$/);
            if (comments) {
                if (method === "GET") {
                    if (state.commentReadError) return respond(null, state.commentReadError);
                    const page = Number(url.searchParams.get("page"));
                    assert.equal(url.searchParams.get("size"), "10");
                    return respond({list: state.comments.slice((page - 1) * 10, page * 10), total: state.comments.length, page, size: 10});
                }
                if (state.commentWriteError) return respond(null, state.commentWriteError);
                if (method === "POST") {
                    const parent = state.comments.find((item) => item.id === body.replyToId);
                    const item = {id: state.nextCommentId++, authorId: state.user.id, authorName: state.user.username, content: body.content, createdAt: "2026-09-04 12:00:00",
                        replyTo: parent ? {id: parent.id, authorName: parent.authorName, content: parent.content, deleted: false} : null};
                    state.comments.push(item);
                    return respond({id: item.id, page: Math.ceil(state.comments.length / 10)});
                }
                if (method === "DELETE") {
                    const id = Number(comments[3]);
                    const target = state.comments.find((item) => item.id === id);
                    if (target.authorId !== state.user.id) return respond(null, 403);
                    state.comments = state.comments.filter((item) => item.id !== id);
                    state.comments.forEach((item) => { if (item.replyTo?.id === id) item.replyTo = {id, deleted: true}; });
                    return respond({id});
                }
            }
            if (/^\/(products|tasks)\/\d+\/edit$/.test(endpoint)) return respond(state.item, state.editError || 0);
            if (/^\/public\/(products|tasks)\/\d+$/.test(endpoint)) return respond(state.item);
            if (/^\/(products|tasks)(\/\d+)?$/.test(endpoint)) return respond({id: 21, status: state.item.status, auditStatus: "pending"}, state.saveError || 0);
            if (endpoint === "/upload/image") {
                const number = state.uploads.length + 1;
                if (!state.holdUploads) return respond({url: `/images/upload-${number}.svg`});
                return new Promise((resolve) => state.uploads.push(async (code = 0) => { await respond({url: `/images/upload-${number}.svg`}, code); resolve(); }));
            }
            if (endpoint === "/me/tasks" && state.acceptedTasks) {
                const page = Number(url.searchParams.get("page"));
                return respond({list: state.acceptedTasks.slice((page - 1) * 50, page * 50), total: state.acceptedTasks.length});
            }
            if (endpoint.startsWith("/me/")) return respond({list: [], total: 0});
            return respond(null, 404);
        }
        if (url.pathname.startsWith("/images/")) {
            if (url.pathname.includes("broken")) return route.fulfill({status: 404, body: ""});
            const title = url.pathname.includes("2") ? "习题笔记" : url.pathname.includes("3") ? "高等数学 · 下册" : "高等数学 · 上册";
            return route.fulfill({contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720"><rect width="600" height="720" fill="#e5ecdc"/><rect x="90" y="75" width="420" height="570" rx="5" fill="#eee5be"/><rect x="90" y="75" width="20" height="570" fill="#cec497"/><rect x="125" y="105" width="350" height="510" rx="3" fill="none" stroke="#a59e78"/><text x="300" y="170" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#8c855b">同 济 大 学 数 学 系</text><text x="300" y="325" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#504d37">${title}</text><text x="300" y="375" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#8c855b">ADVANCED MATHEMATICS</text><path d="M190 480 Q300 360 410 480" fill="none" stroke="#a5a77d" stroke-width="2"/><text x="300" y="575" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#8c855b">校园二手 · 测试图片</text></svg>`});
        }
        const relative = url.pathname.replace(/^\/CTCP\//, "");
        if (relative === "profile-user.jsp") return route.fulfill({contentType: "text/html", body: "<title>发布记录</title><p>测试跳转目标</p>"});
        const filePath = path.resolve(webRoot, relative);
        if (!filePath.startsWith(webRoot + path.sep) || !fs.existsSync(filePath)) return route.fulfill({status: 404, body: ""});
        let content = fs.readFileSync(filePath, "utf8");
        if (relative.endsWith(".jsp")) content = content.replace(/<jsp:include page="sidebar.jsp"\s*\/>/, fs.readFileSync(path.join(webRoot, "sidebar.jsp"), "utf8")).replace(/<%@[^%]*%>/g, "");
        await route.fulfill({contentType: relative.endsWith(".js") ? "text/javascript" : relative.endsWith(".css") ? "text/css" : "text/html", body: content});
    });
    await page.goto(`${origin}/CTCP/${file}`);
    return {page, state};
}

async function commentsReady(page, total) {
    await page.waitForFunction((total) => document.querySelector("[data-comment-total]")?.textContent === String(total)
        && document.querySelector("[data-comment-list]")?.getAttribute("aria-busy") === "false", total);
}
async function editorReady(page) { await page.locator("[data-publish-fields]:enabled").waitFor(); }
async function noErrors(state) { assert.deepEqual(state.errors, []); }

test("详情：固定左图、切换/大图/键盘、右侧独立滚动、每页十条、响应式", async (t) => {
    const {page, state} = await openPage(t, "product-detail.jsp?productId=21");
    await commentsReady(page, 23);
    assert.equal(await page.locator(".comment-item").count(), 10);
    assert.equal(await page.locator("[data-detail-gallery] img:visible").count(), 1);
    assert.equal(await page.locator(".detail-edit-action").textContent(), "修改商品");
    await page.locator("[data-gallery-next]").click();
    assert.equal(await page.locator("[data-gallery-image]").getAttribute("src"), "/images/2.svg");
    await page.locator("[data-gallery-open]").click();
    await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("dialog [data-gallery-count]").textContent(), "3 / 3");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.equal(await page.locator("[data-gallery-open]").evaluate((el) => el === document.activeElement), true);
    const before = await page.locator(".detail-media-column").boundingBox();
    await page.screenshot({path: path.join(artifacts, "product-detail.png")});
    await page.locator(".detail-content-column").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForFunction(() => document.querySelector(".detail-content-column").scrollTop > 100);
    const after = await page.locator(".detail-media-column").boundingBox();
    assert.equal(before.y, after.y);
    assert.ok(await page.locator(".detail-content-column").evaluate((el) => el.scrollTop > 100));
    await page.locator('[data-comment-action="next"]').click();
    await page.waitForFunction(() => document.querySelector("[data-comment-page]").textContent.includes("2 / 3"));
    assert.equal(await page.locator(".comment-item").count(), 10);
    await page.screenshot({path: path.join(artifacts, "product-comments.png")});
    for (const width of [1024, 390]) {
        await page.setViewportSize({width, height: 844});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `不应在 ${width}px 横向溢出`);
    }
    await page.screenshot({path: path.join(artifacts, "product-mobile.png"), fullPage: true});
    await noErrors(state);
});

test("评论：回复跨页、纯文本转义、仅本人删除、删除末页回退、失败保留草稿", async (t) => {
    const state = fixture();
    state.comments = state.comments.slice(0, 10);
    state.comments[1].content = '<img src=x onerror="window.xss=true"> 原评论';
    const {page} = await openPage(t, "product-detail.jsp?productId=21", state);
    await commentsReady(page, 10);
    assert.equal(await page.locator('.comment-item[data-comment-id="2"] [data-comment-action="delete"]').count(), 0);
    assert.equal(await page.locator('.comment-item img').count(), 0);
    await page.locator('.comment-item[data-comment-id="2"] [data-comment-action="reply"]').click();
    await page.locator(".comment-form textarea").fill("回复中的 <script> 不会执行");
    state.commentWriteError = 404;
    await page.locator(".comment-form button[type=submit]").click();
    await page.waitForFunction(() => document.querySelector("[data-comment-feedback]").textContent.includes("已保留"));
    assert.equal(await page.locator(".comment-form textarea").inputValue(), "回复中的 <script> 不会执行");
    assert.ok(await page.locator("[data-comment-reply-target]").isVisible());
    state.commentWriteError = 0;
    await page.locator(".comment-form button[type=submit]").click();
    await commentsReady(page, 11);
    assert.equal(await page.locator(".comment-item").count(), 1);
    assert.ok((await page.locator("[data-comment-page]").textContent()).includes("2 / 2"));
    assert.ok((await page.locator(".comment-quote").textContent()).includes("<img"));
    assert.equal(state.requests.filter((r) => r.method === "POST").at(-1).body.replyToId, 2);
    await page.locator('[data-comment-action="delete"]').click();
    await commentsReady(page, 10);
    assert.equal(await page.locator(".comment-item").count(), 10);
    assert.ok(!(await page.locator("[data-comment-pagination]").isVisible()));
    assert.equal(await page.evaluate(() => window.xss), undefined);
    await noErrors(state);
});

test("任务：游客可读、登录提示、非参与者无送达/终止入口、空图与评论失败独立", async (t) => {
    const state = fixture({user: null, commentReadError: 503});
    Object.assign(state.item, {status: "accepted", imageUrls: "", terminationRequest: {requesterId: 7, reason: "测试", status: "pending"}});
    const {page} = await openPage(t, "task-detail.jsp?taskId=21", state);
    await page.locator(".detail-panel h2").waitFor();
    await page.locator('[data-comment-action="retry"]:visible').waitFor();
    assert.equal(await page.locator(".detail-edit-action, [data-action=deliver], [data-termination-action=approve]").count(), 0);
    assert.ok(await page.locator("[data-comment-login]").isVisible());
    assert.ok(!(await page.locator("[data-comment-form]").isVisible()));
    assert.ok(await page.locator("[data-gallery-open]").isDisabled());
    state.commentReadError = 0;
    state.comments = [];
    await page.locator('[data-comment-action="retry"]').click();
    await commentsReady(page, 0);
    assert.ok(await page.locator(".comments-empty").isVisible());
    await noErrors(state);
});

test("任务原流程：公开详情缺少接单人ID时，真正接单人仍可送达，其他用户无入口；重绘保留评论", async (t) => {
    const state = fixture();
    state.item.status = "accepted";
    state.user = {id: 8, username: "周同学"};
    state.acceptedTasks = Array.from({length: 51}, (_, i) => ({id: i === 50 ? 21 : 1000 + i, orderStatus: "accepted"}));
    const {page} = await openPage(t, "task-detail.jsp?taskId=21", state);
    await commentsReady(page, 23);
    assert.ok(await page.locator("[data-action=deliver]").count());
    await page.locator(".comment-form textarea").fill("打开操作区也不会丢失的评论");
    await page.locator('[data-termination-action="open"]').click();
    assert.equal(await page.locator(".comment-form textarea").inputValue(), "打开操作区也不会丢失的评论");
    assert.equal(state.requests.filter((r) => r.endpoint === "/me/tasks").length, 2);
    await noErrors(state);
    const visitor = fixture();
    visitor.user = {id: 9, username: "其他同学"};
    visitor.item.status = "accepted";
    const other = await openPage(t, "task-detail.jsp?taskId=21", visitor);
    await commentsReady(other.page, 23);
    assert.equal(await other.page.locator("[data-action=deliver], [data-termination-action=open]").count(), 0);
    await noErrors(visitor);
});

for (const kind of ["product", "task"]) {
    test(`${kind} 修改：回填、保留/删除原图、PUT 原ID、409保留输入、成功跳转`, async (t) => {
        const state = fixture({saveError: 409});
        state.item.status = kind === "product" ? "on_sale" : "open";
        const {page} = await openPage(t, `${kind}-publish.jsp?${kind}Id=21&returnTo=${encodeURIComponent(`${kind}-detail.jsp?${kind}Id=21&returnTo=main.jsp`)}`, state);
        await editorReady(page);
        assert.equal(await page.locator(".product-page-topbar h1").textContent(), kind === "product" ? "修改商品" : "修改任务");
        assert.equal(await page.locator('[name="title"]').inputValue(), state.item.title);
        if (kind === "task") assert.equal(await page.locator('[name="deadline"]').inputValue(), "2026-09-05T18:30");
        await page.locator('[data-gallery-index="1"]').click();
        await page.locator("[data-image-remove]").click();
        assert.equal(await page.locator('[name="imageUrls"]').inputValue(), "/images/1.svg,/images/3.svg");
        await page.locator('[name="title"]').fill("修改后仍然保留的标题");
        await page.locator('[name="agreement"]').check();
        await page.locator('.publish-actions button[type="submit"]').click();
        await page.waitForFunction(() => document.querySelector("[data-feedback]").textContent.includes("状态已变化"));
        assert.equal(await page.locator('[name="title"]').inputValue(), "修改后仍然保留的标题");
        assert.equal(state.requests.filter((r) => r.method === "POST").length, 0);
        const saved = state.requests.find((r) => r.method === "PUT");
        assert.equal(saved.endpoint, `/${kind === "product" ? "products" : "tasks"}/21`);
        assert.equal(saved.body.imageUrls, "/images/1.svg,/images/3.svg");
        assert.equal(saved.body.sellerId, undefined);
        await page.screenshot({path: path.join(artifacts, `${kind}-edit.png`), fullPage: true});
        state.saveError = 0;
        await page.locator('.publish-actions button[type="submit"]').click();
        await page.waitForURL(/profile-user.jsp\?recordTab=published-/);
        await noErrors(state);
    });
}

test("编辑拒绝：他人/已成交/不存在/无效ID都不能回退为发布", async (t) => {
    for (const failure of ["owner", "sold", "missing", "invalid"]) {
        const state = fixture();
        if (failure === "owner") state.item.sellerId = 8;
        if (failure === "sold") state.item.status = "sold";
        if (failure === "missing") state.editError = 404;
        const {page} = await openPage(t, `product-publish.jsp?productId=${failure === "invalid" ? "bad" : "21"}`, state);
        await page.waitForFunction(() => !document.querySelector(".publish-mode-note p").textContent.includes("正在"));
        assert.equal(await page.locator("[data-publish-fields]").evaluate((el) => el.disabled), true);
        assert.ok(await page.locator("[data-image-add]").isDisabled());
        assert.equal(state.requests.filter((r) => r.method === "POST" || r.method === "PUT").length, 0);
        await noErrors(state);
    }
});

const png = {name: "sample.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=", "base64")};
const waitFor = async (predicate) => { for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise((resolve) => setTimeout(resolve, 20)); } throw new Error("等待测试请求超时"); };

test("上传：预占数量、乱序完成保持顺序、临时图不提交、取消不复活、新发布POST", async (t) => {
    const state = fixture({holdUploads: true});
    const {page} = await openPage(t, "product-publish.jsp", state);
    await editorReady(page);
    await page.locator('[name="title"]').fill("新发布的校园好物");
    await page.locator('[name="agreement"]').check();
    await page.locator("#productImageInput").setInputFiles([png, {...png, name: "second.png"}]);
    await waitFor(() => state.uploads.length === 2);
    assert.equal(await page.locator('[name="imageUrls"]').inputValue(), "");
    await page.locator('.publish-actions button[type="submit"]').click();
    assert.match(await page.locator("[data-feedback]").textContent(), /仍在上传/);
    await state.uploads[1]();
    await state.uploads[0]();
    await page.waitForFunction(() => document.querySelector('[name="imageUrls"]').value === "/images/upload-1.svg,/images/upload-2.svg");
    await page.locator("#productImageInput").setInputFiles([png, png]);
    assert.match(await page.locator("[data-upload-feedback]").textContent(), /最多添加/);
    assert.equal(state.uploads.length, 2);
    await page.locator("#productImageInput").setInputFiles(png);
    await waitFor(() => state.uploads.length === 3);
    await page.locator("[data-image-remove]").click();
    await state.uploads[2]();
    assert.equal(await page.locator('[name="imageUrls"]').inputValue(), "/images/upload-1.svg,/images/upload-2.svg");
    await page.screenshot({path: path.join(artifacts, "product-publish.png"), fullPage: true});
    await page.locator('.publish-actions button[type="submit"]').click();
    await page.waitForURL(/profile-user.jsp/);
    const create = state.requests.find((r) => r.endpoint === "/products" && r.method === "POST");
    assert.equal(create.body.imageUrls, "/images/upload-1.svg,/images/upload-2.svg");
    assert.ok(!JSON.stringify(create.body).includes("blob:"));
    await noErrors(state);
});
