/*
 * message-center.js — 消息列表、分类/已读筛选、分页与已读写入（设计书 §4）
 */
(function () {
    "use strict";

    const api = window.CTCP;
    const N = window.CTCPNotifications;
    const root = document.querySelector("[data-message-center]");
    if (!root) return;

    const listEl = root.querySelector("[data-message-list]");
    const paginationEl = root.querySelector("[data-pagination]");
    const newBanner = root.querySelector("[data-new-banner]");
    const unreadHint = document.querySelector("[data-unread-hint]");
    const markAllBtn = document.querySelector("[data-mark-all]");

    const PAGE_SIZE = 20;
    const state = {
        category: new URLSearchParams(location.search).get("category") || "all",
        filterState: new URLSearchParams(location.search).get("state") || "all",
        page: Number(new URLSearchParams(location.search).get("page") || 1) || 1,
        total: 0,
        loading: false
    };
    let lastSeenLatest = N ? N.state.latestId : 0;

    const categoryNames = { audit: "审核", order: "订单", termination: "终止申请", all: "全部" };

    function returnPath() {
        const q = new URLSearchParams();
        q.set("category", state.category);
        q.set("state", state.filterState);
        q.set("page", state.page);
        return "message-center.jsp?" + q.toString();
    }

    function syncUrl() {
        const q = new URLSearchParams();
        q.set("category", state.category);
        q.set("state", state.filterState);
        q.set("page", state.page);
        history.replaceState(null, "", "message-center.jsp?" + q.toString());
    }

    function targetHref(item) {
        const ret = returnPath();
        if (item.targetType === "product_record") return api.pageUrlWithReturn("profile-user.jsp?recordTab=published-products#profile-records", ret);
        if (item.targetType === "task_record") return api.pageUrlWithReturn("profile-user.jsp?recordTab=published-tasks#profile-records", ret);
        if (item.targetType === "product_order") return api.pageUrlWithReturn("product-order.jsp?orderId=" + item.targetId, ret);
        if (item.targetType === "task_order") return api.pageUrlWithReturn("task-order.jsp?orderId=" + item.targetId, ret);
        return null;
    }

    function targetLabel(item) {
        if (item.targetType === "product_record" || item.targetType === "task_record") return "查看发布记录";
        return "查看订单";
    }

    function itemHtml(item) {
        const href = targetHref(item);
        const unreadClass = item.read ? "" : " msg-item--unread";
        const dot = item.read ? "" : '<span class="msg-dot" aria-label="未读"></span>';
        const actions = [];
        if (href) actions.push('<a class="secondary-action msg-action" href="' + api.escapeHtml(href) + '" data-open data-id="' + item.id + '">' + targetLabel(item) + '</a>');
        if (!item.read) actions.push('<button type="button" class="secondary-action msg-action" data-mark="' + item.id + '">标为已读</button>');
        return '<article class="msg-item' + unreadClass + '">' +
            '<div class="msg-head">' + dot +
            '<span class="msg-cat msg-cat--' + api.escapeHtml(item.category) + '">' + (categoryNames[item.category] || item.category) + '</span>' +
            '<span class="msg-title">' + api.escapeHtml(item.title) + '</span>' +
            '<span class="msg-time">' + api.escapeHtml(item.createdAt) + '</span>' +
            '</div>' +
            '<p class="msg-content">' + api.escapeHtml(item.content) + '</p>' +
            '<div class="msg-actions">' + actions.join("") + '</div>' +
            '</article>';
    }

    function renderToolbar() {
        root.querySelectorAll("[data-category]").forEach((b) => b.classList.toggle("is-active", b.dataset.category === state.category));
        root.querySelectorAll("[data-state]").forEach((b) => b.classList.toggle("is-active", b.dataset.state === state.filterState));
    }

    function renderPagination() {
        const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
        if (state.total === 0) { paginationEl.innerHTML = ""; return; }
        paginationEl.innerHTML =
            '<button type="button" class="secondary-action" data-page="' + (state.page - 1) + '" ' + (state.page <= 1 ? "disabled" : "") + '>上一页</button>' +
            '<span class="msg-page-info">第 ' + state.page + ' / ' + totalPages + ' 页 · 共 ' + state.total + ' 条</span>' +
            '<button type="button" class="secondary-action" data-page="' + (state.page + 1) + '" ' + (state.page >= totalPages ? "disabled" : "") + '>下一页</button>';
        paginationEl.querySelectorAll("[data-page]").forEach((b) => b.addEventListener("click", () => {
            const p = Number(b.dataset.page);
            if (p < 1 || p > totalPages) return;
            state.page = p; syncUrl(); load();
        }));
    }

    function bindItemActions() {
        listEl.querySelectorAll("[data-mark]").forEach((b) => b.addEventListener("click", (e) => {
            e.preventDefault();
            markRead(Number(b.dataset.mark), b);
        }));
        listEl.querySelectorAll("[data-open]").forEach((a) => a.addEventListener("click", (e) => {
            e.preventDefault();
            const id = Number(a.dataset.id);
            const href = a.getAttribute("href");
            const item = a.closest(".msg-item");
            // 未读消息：先标已读，成功后再跳转；失败保留当前页并提示重试。
            if (item && item.classList.contains("msg-item--unread")) {
                N.markRead(id).then(() => {
                    N.refresh();
                    lastSeenLatest = N.state.latestId;
                    location.href = href;
                }).catch(() => api.toast("消息已读失败，请重试", "error"));
            } else {
                location.href = href;
            }
        }));
    }

    function renderList(data) {
        const items = data.list || [];
        if (!items.length) {
            const empty = state.filterState === "unread" ? "没有未读消息" : "暂时没有消息";
            listEl.innerHTML = '<div class="empty-state"><h3>' + empty + '</h3></div>';
        } else {
            listEl.innerHTML = items.map(itemHtml).join("");
        }
        state.total = data.total || 0;
        if (unreadHint) unreadHint.textContent = (data.unreadCount ? "未读 " + data.unreadCount + " 条" : "全部已读");
        bindItemActions();
        renderPagination();
    }

    async function markRead(id, btn) {
        try {
            await N.markRead(id);
            const item = btn.closest(".msg-item");
            if (item) item.classList.remove("msg-item--unread");
            btn.remove();
            await N.refresh();
            lastSeenLatest = N.state.latestId;
            if (state.filterState === "unread") load(); // 仅未读视图下，已读后刷新当前页
        } catch (e) {
            api.toast("标记已读失败：" + (e.message || "请重试"), "error");
        }
    }

    async function load() {
        if (state.loading) return;
        state.loading = true;
        if (newBanner && !newBanner.hidden) newBanner.hidden = true;
        listEl.innerHTML = '<div class="loading-state"><span class="button-spinner"></span><p>正在加载消息...</p></div>';
        try {
            const data = await api.request("/me/notifications" + api.query({
                category: state.category, state: state.filterState, page: state.page, size: PAGE_SIZE
            }));
            renderList(data);
        } catch (e) {
            listEl.innerHTML = '<div class="empty-state empty-state--error"><span>!</span><h3>加载失败</h3><p>' + api.escapeHtml(e.message) + '</p><button type="button" class="secondary-action" data-retry>重试</button></div>';
            const r = listEl.querySelector("[data-retry]");
            if (r) r.addEventListener("click", load);
        } finally {
            state.loading = false;
        }
    }

    // 顶部“全部已读”：作用于当前用户所有分类，提交期间禁用按钮。
    if (markAllBtn) markAllBtn.addEventListener("click", async () => {
        markAllBtn.disabled = true;
        try {
            const res = await N.markAll(N.state.latestId);
            api.toast("已将 " + ((res && res.updatedCount) || 0) + " 条消息标为已读", "success");
            await N.refresh();
            lastSeenLatest = N.state.latestId;
            await load();
        } catch (e) {
            api.toast("操作失败：" + (e.message || "请重试"), "error");
        } finally {
            markAllBtn.disabled = false;
        }
    });

    // 工具栏：切换分类 / 已读筛选，回到第 1 页。
    root.querySelectorAll("[data-category]").forEach((b) => b.addEventListener("click", () => {
        state.category = b.dataset.category; state.page = 1; syncUrl(); renderToolbar(); load();
    }));
    root.querySelectorAll("[data-state]").forEach((b) => b.addEventListener("click", () => {
        state.filterState = b.dataset.state; state.page = 1; syncUrl(); renderToolbar(); load();
    }));

    // 全局未读变化时，若发现新消息则提示刷新（不自动移动当前列表）。
    if (N && N.onUnread) N.onUnread((cur) => {
        if (cur.latestId > lastSeenLatest) newBanner.hidden = false;
    });
    if (newBanner) newBanner.querySelector("[data-refresh]").addEventListener("click", () => {
        newBanner.hidden = true; load();
    });

    renderToolbar();
    load();
})();
