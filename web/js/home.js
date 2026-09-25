(function () {
    "use strict";

    const api = window.CTCP;
    const domain = window.CTCPDomain;
    const categoryNames = {
        book: "图书教材", electronic: "电子数码", daily: "生活日用",
        clothing: "服饰鞋帽", sports: "运动户外", other: "其他"
    };
    const categoryEmoji = {
        book: "📚", electronic: "🎧", daily: "🪴",
        clothing: "🧥", sports: "🏀", other: "✨"
    };
    let recommendationPool = [];

    function promoProduct(item, index) {
        const title = api.escapeHtml(item.title);
        const description = api.escapeHtml(item.description || "等待下一位同学发现的校园好物");
        const category = categoryNames[item.category] || "二手好物";
        const emoji = categoryEmoji[item.category] || "✨";
        return `
            <a class="discovery-card discovery-card--product tone-${index % 4}" href="${api.pageUrlWithReturn(`product-detail.jsp?productId=${item.id}`)}">
                <div class="discovery-card__visual">
                    <span class="discovery-card__kind">二手交易</span>
                    <span class="discovery-card__emoji" aria-hidden="true">${emoji}</span>
                    <span class="discovery-card__badge">${api.escapeHtml(category)}</span>
                </div>
                <div class="discovery-card__body">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="discovery-card__meta">
                        <strong>￥${api.money(item.price)}</strong>
                        <span>${api.escapeHtml(item.sellerName || "校园卖家")} · 去看看 →</span>
                    </div>
                </div>
            </a>`;
    }

    function promoTask(item, index) {
        const title = api.escapeHtml(item.title);
        const description = api.escapeHtml(item.description || "一份正在等待同学响应的校园互助");
        return `
            <a class="discovery-card discovery-card--task tone-${index % 4}" href="${api.pageUrl(`task-detail.jsp?taskId=${item.id}`)}">
                <div class="discovery-card__visual">
                    <span class="discovery-card__kind">跑腿推广</span>
                    <span class="discovery-card__emoji" aria-hidden="true">${index % 2 ? "🏃" : "📦"}</span>
                    <span class="discovery-card__badge">待接取</span>
                </div>
                <div class="discovery-card__body">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="discovery-card__meta">
                        <strong>￥${api.money(item.amount)}</strong>
                        <span>${api.escapeHtml(item.pickup || "校园内")} · 查看 →</span>
                    </div>
                </div>
            </a>`;
    }

    function renderRecommendations() {
        const root = document.querySelector("[data-recommendations]");
        if (!root) return;
        const selected = domain.selectRecommendations(recommendationPool);
        if (!selected.length) {
            root.innerHTML = `<div class="empty-state"><span>✦</span><h3>暂时没有可推荐的内容</h3><p>稍后刷新再来看看吧。</p></div>`;
            return;
        }
        root.innerHTML = selected.map((entry, index) => entry.kind === "product"
            ? promoProduct(entry.data, index)
            : promoTask(entry.data, index)).join("");
    }

    function todoItem(item, role, needsAction, statusText) {
        const counterpart = role === "buyer"
            ? `卖家：${item.sellerName || "待联系"}`
            : `买家：${item.buyerName || "待联系"}`;
        return `
            <a class="todo-item${needsAction ? " todo-item--active" : ""}"
               href="${api.pageUrl(`product-order.jsp?orderId=${item.orderId}&role=${role}`)}">
                <span class="todo-item__icon" aria-hidden="true">${role === "buyer" ? "🛍" : "📮"}</span>
                <span class="todo-item__content">
                    <strong>${api.escapeHtml(item.title)}</strong>
                    <small>${api.escapeHtml(counterpart)} · ￥${api.money(item.dealPrice || item.price)}</small>
                </span>
                <span class="todo-item__status">${statusText}</span>
            </a>`;
    }

    function renderTodos(published, bought) {
        const root = document.querySelector("[data-todos]");
        const badge = document.querySelector("[data-todo-count]");
        const all = domain.buildTradeTodos(published.list, bought.list);
        if (badge) badge.textContent = String(all.length);
        if (!all.length) {
            root.innerHTML = `
                <div class="todo-empty">
                    <span aria-hidden="true">☀</span>
                    <strong>目前没有进行中的交易</strong>
                    <p>发现感兴趣的好物后，交易会出现在这里。</p>
                </div>`;
            return;
        }
        root.innerHTML = all.map(({item, role, needsAction, statusText}) => todoItem(item, role, needsAction, statusText)).join("");
    }

    async function loadHome() {
        const feedback = document.querySelector("[data-home-feedback]");
        try {
            const user = await api.requireUser();
            document.querySelectorAll("[data-home-user]").forEach((node) => {
                node.textContent = user.username;
            });

            const results = await Promise.allSettled([
                api.request(`/public/products${api.query({sort: "time_desc", page: 1, size: 50})}`),
                api.request(`/public/tasks${api.query({sort: "time_desc", page: 1, size: 50})}`),
                api.request(`/me/products${api.query({type: "published", page: 1, size: 50})}`),
                api.request(`/me/products${api.query({type: "bought", page: 1, size: 50})}`)
            ]);

            const products = results[0].status === "fulfilled" ? results[0].value.list || [] : [];
            const tasks = results[1].status === "fulfilled" ? results[1].value.list || [] : [];
            recommendationPool = [
                ...products.filter((item) => item.status === "on_sale").map((data) => ({kind: "product", data})),
                ...tasks.filter((item) => item.status === "open").map((data) => ({kind: "task", data}))
            ];
            renderRecommendations();

            if (results[2].status === "fulfilled" && results[3].status === "fulfilled") {
                renderTodos(results[2].value, results[3].value);
            } else {
                document.querySelector("[data-todos]").innerHTML = `
                    <div class="todo-empty"><strong>待办暂时加载失败</strong><p>后端完成个人商品记录接口后即可显示。</p></div>`;
            }

            if (!recommendationPool.length && (results[0].status === "rejected" || results[1].status === "rejected")) {
                feedback.textContent = "推荐内容暂时无法加载，请稍后刷新";
            }
        } catch (error) {
            if (error.status !== 401) {
                feedback.textContent = error.message || "主界面加载失败";
            }
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const refresh = document.querySelector("[data-action='refresh-recommendations']");
        if (refresh) {
            refresh.addEventListener("click", () => {
                renderRecommendations();
                api.toast("已换一批校园推荐", "success");
            });
        }
        loadHome();
    });
})();
