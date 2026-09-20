(function (global) {
    "use strict";

    const explicitBase = global.CTCP_API_BASE;
    const scriptUrl = document.currentScript && document.currentScript.src;
    const WEB_BASE = scriptUrl ? new URL("../", scriptUrl) : new URL("./", location.href);
    const backendOrigin = location.port === "8081"
        ? location.origin
        : `${location.protocol}//${location.hostname || "localhost"}:8081`;
    const API_BASE = explicitBase || `${backendOrigin}/api`;
    let currentUserPromise = null;

    class ApiError extends Error {
        constructor(message, status, payload) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.payload = payload;
        }
    }

    async function request(path, options) {
        const config = Object.assign({method: "GET"}, options || {});
        config.credentials = "include";
        config.headers = Object.assign({Accept: "application/json"}, config.headers || {});
        if (config.body && typeof config.body !== "string") {
            config.headers["Content-Type"] = "application/json; charset=UTF-8";
            config.body = JSON.stringify(config.body);
        }

        let response;
        try {
            response = await fetch(`${API_BASE}${path}`, config);
        } catch (error) {
            throw new ApiError("无法连接后端服务，请确认 8081 端口已启动", 0, null);
        }

        const raw = await response.text();
        let payload = null;
        try {
            payload = raw ? JSON.parse(raw) : null;
        } catch (error) {
            throw new ApiError("服务返回了无法识别的数据", response.status, null);
        }
        if (!response.ok || !payload || payload.code !== 0) {
            throw new ApiError(
                payload && payload.msg ? payload.msg : `请求失败（${response.status}）`,
                response.ok && payload && payload.code ? payload.code : response.status || 0,
                payload
            );
        }
        return payload.data;
    }

    function query(params) {
        const search = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                search.set(key, value);
            }
        });
        const value = search.toString();
        return value ? `?${value}` : "";
    }

    /** 始终以 web 根目录解析 JSP，避免外部脚本目录影响相对地址。 */
    function pageUrl(path) {
        return new URL(path, WEB_BASE).href;
    }

    async function currentUser(force) {
        if (force || !currentUserPromise) {
            currentUserPromise = request("/users/me").catch((error) => {
                currentUserPromise = null;
                if (error.status === 401 || (error.payload && error.payload.code === 401)) {
                    return null;
                }
                throw error;
            });
        }
        return currentUserPromise;
    }

    async function requireUser() {
        const user = await currentUser();
        if (!user) {
            const next = `${location.pathname.split("/").pop() || "main.jsp"}${location.search}`;
            location.href = pageUrl(`index.jsp?next=${encodeURIComponent(next)}`);
            throw new ApiError("请先登录", 401, null);
        }
        return user;
    }

    function resetCurrentUser() {
        currentUserPromise = null;
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function money(value) {
        const number = Number(value || 0);
        return Number.isFinite(number) ? number.toFixed(2) : "0.00";
    }

    function shortTime(value) {
        return value ? String(value).slice(0, 16) : "时间待定";
    }

    function initial(name) {
        const value = String(name || "同学").trim();
        return value.slice(0, 1).toUpperCase();
    }

    function toast(message, type) {
        let region = document.querySelector(".toast-region");
        if (!region) {
            region = document.createElement("div");
            region.className = "toast-region";
            region.setAttribute("aria-live", "polite");
            document.body.appendChild(region);
        }
        const item = document.createElement("div");
        item.className = `toast toast--${type || "info"}`;
        item.textContent = message;
        region.appendChild(item);
        requestAnimationFrame(() => item.classList.add("toast--visible"));
        setTimeout(() => {
            item.classList.remove("toast--visible");
            setTimeout(() => item.remove(), 220);
        }, 3000);
    }

    function setLoading(button, loading, text) {
        if (!button) return;
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span><span>${escapeHtml(text || "处理中...")}</span>`;
        } else {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }

    function setFeedback(element, message, type) {
        if (!element) return;
        element.textContent = message || "";
        element.className = `form-feedback${message ? ` form-feedback--${type || "error"}` : ""}`;
    }

    async function hydrateShell() {
        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return;

        let user = null;
        try {
            user = await currentUser();
        } catch (error) {
            return;
        }
        document.querySelectorAll("[data-user-name]").forEach((node) => {
            node.textContent = user ? user.username : "游客同学";
        });
        document.querySelectorAll("[data-user-avatar]").forEach((node) => {
            node.textContent = initial(user && user.username);
        });

        const logout = document.querySelector("[data-action='logout']");
        if (logout) {
            logout.addEventListener("click", async (event) => {
                event.preventDefault();
                if (!user) {
                    location.href = pageUrl("index.jsp");
                    return;
                }
                try {
                    await request("/logout", {method: "POST"});
                } catch (error) {
                    // 即使服务端 Session 已过期，也应回到登录页。
                }
                resetCurrentUser();
                location.href = pageUrl("index.jsp");
            });
        }
    }

    global.CTCP = {
        API_BASE,
        ApiError,
        request,
        query,
        pageUrl,
        currentUser,
        requireUser,
        resetCurrentUser,
        escapeHtml,
        money,
        shortTime,
        initial,
        toast,
        setLoading,
        setFeedback
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hydrateShell);
    } else {
        hydrateShell();
    }
})(window);
