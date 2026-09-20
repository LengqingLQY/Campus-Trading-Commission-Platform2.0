"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

async function main() {
    let responseFactory = async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({code: 0, msg: "ok", data: {id: 2}})
    });
    let captured = null;
    const document = {
        readyState: "loading",
        body: {appendChild() {}},
        addEventListener() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        createElement() {
            return {className: "", setAttribute() {}, appendChild() {}, remove() {}, classList: {add() {}, remove() {}}};
        }
    };
    const context = {
        document,
        location: {
            port: "8080",
            protocol: "http:",
            hostname: "localhost",
            origin: "http://localhost:8080",
            href: "http://localhost:8080/CTCP/index.jsp",
            pathname: "/CTCP/index.jsp",
            search: ""
        },
        URL,
        URLSearchParams,
        requestAnimationFrame(callback) { callback(); },
        setTimeout() { return 1; },
        clearTimeout() {},
        fetch: async (url, options) => {
            captured = {url, options};
            return responseFactory();
        },
        console
    };
    context.window = context;
    vm.createContext(context);
    const source = fs.readFileSync(path.resolve(__dirname, "../js/api.js"), "utf8");
    vm.runInContext(source, context, {filename: "api.js"});

    const result = await context.CTCP.request("/login", {
        method: "POST",
        body: {account: "alice", password: "alice123"}
    });
    assert.equal(result.id, 2);
    assert.equal(captured.url, "http://localhost:8081/api/login");
    assert.equal(captured.options.credentials, "include");
    assert.equal(captured.options.headers["Content-Type"], "application/json; charset=UTF-8");
    assert.deepEqual(JSON.parse(captured.options.body), {account: "alice", password: "alice123"});
    assert.equal(context.CTCP.pageUrl("secondhand.jsp"), "http://localhost:8080/CTCP/secondhand.jsp");

    responseFactory = async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({code: 401, msg: "账号或密码错误", data: null})
    });
    await assert.rejects(
        () => context.CTCP.request("/login", {method: "POST", body: {}}),
        (error) => error.status === 401 && error.message === "账号或密码错误",
        "兼容旧骨架的 HTTP 200 + code=401"
    );

    responseFactory = async () => ({
        ok: false,
        status: 409,
        text: async () => JSON.stringify({code: 409, msg: "商品已售出", data: null})
    });
    await assert.rejects(
        () => context.CTCP.request("/products/1/buy", {method: "POST"}),
        (error) => error.status === 409 && error.message === "商品已售出"
    );

    console.log("API 客户端测试通过：跨端口地址、Session 凭证、JSON 请求、401/409 错误映射");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
