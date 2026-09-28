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

    function promoVisual(item, emoji, kind, badge) {
        const imageUrl = api.firstImageUrl(item.imageUrls);
        const kindClass = kind === "跑腿推广" ? "discovery-card__kind--task" : "discovery-card__kind--product";
        const content = imageUrl
            ? `<img class="discovery-card__image" src="${api.escapeHtml(imageUrl)}" alt="${api.escapeHtml(item.title)}" loading="lazy" decoding="async">`
            : `<span class="discovery-card__emoji" aria-hidden="true">${emoji}</span>`;
        return `
            <div class="discovery-card__visual${imageUrl ? " discovery-card__visual--has-image" : ""}">
                <span class="discovery-card__kind ${kindClass}">${api.escapeHtml(kind)}</span>
                ${content}
                <span class="discovery-card__badge">${api.escapeHtml(badge)}</span>
            </div>`;
    }

    function promoProduct(item, index) {
        const title = api.escapeHtml(item.title);
        const description = api.escapeHtml(item.description || "等待下一位同学发现的校园好物");
        const category = categoryNames[item.category] || "二手好物";
        const emoji = categoryEmoji[item.category] || "✨";
        return `
            <a class="discovery-card discovery-card--product tone-${index % 4}" href="${api.pageUrlWithReturn(`product-detail.jsp?productId=${item.id}`)}">
                ${promoVisual(item, emoji, "二手交易", category)}
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
                ${promoVisual(item, index % 2 ? "🏃" : "📦", "跑腿推广", "待接取")}
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

    // ===== 交易待办项 =====
    function todoItem(item, role, needsAction, statusText) {
        const labels = {
            "待交付": "待我确认交付", "待确认收货": "待我确认收货",
            "待卖家交付": "等待卖家确认交付", "待买家确认": "等待买家确认收货",
            "待处理终止申请": "待我处理终止申请", "待对方确认终止": "等待对方确认终止"
        };
        const counterpart = role === "buyer"
            ? `卖家：${item.sellerName || "待联系"}`
            : `买家：${item.buyerName || "待联系"}`;
        return `
            <a class="todo-item${needsAction ? " todo-item--active" : ""}"
               href="${api.pageUrl(`product-order.jsp?orderId=${item.orderId}&role=${role}`)}">
                <span class="todo-item__icon" aria-hidden="true">${role === "buyer" ? "🛍" : "📮"}</span>
                <span class="todo-item__content">
                    <span class="todo-item__role">二手交易 · 我是${role === "buyer" ? "买家" : "卖家"}</span>
                    <strong>${api.escapeHtml(item.title)}</strong>
                    <small>${api.escapeHtml(counterpart)} · ￥${api.money(item.dealPrice || item.price)}</small>
                </span>
                <span class="todo-item__status">${api.escapeHtml(labels[statusText] || statusText)}</span>
            </a>`;
    }

    // ===== 跑腿待办项 =====
    function taskTodoItem(task, role, needsAction, statusText) {
        const counterpart = role === "publisher"
            ? `接取者：${task.accepterName || "待确认"}`
            : `发布者：${task.publisherName || "待确认"}`;
        const icon = role === "publisher" ? "📦" : "🏃";
        return `
            <a class="todo-item${needsAction ? " todo-item--active" : ""}"
               href="${api.pageUrlWithReturn(`task-detail.jsp?taskId=${task.id}`)}">
                <span class="todo-item__icon" aria-hidden="true">${icon}</span>
                <span class="todo-item__content">
                    <span class="todo-item__role">跑腿任务 · 我是${role === "publisher" ? "发布者" : "接取者"}</span>
                    <strong>${api.escapeHtml(task.title)}</strong>
                    <small>${api.escapeHtml(counterpart)} · ￥${api.money(task.amount)}</small>
                </span>
                <span class="todo-item__status">${api.escapeHtml(statusText)}</span>
            </a>`;
    }

    // ===== 构建跑腿待办 =====
    function buildTaskTodos(publishedTasks, acceptedTasks) {
        const todos = [];
        // 我发布的任务：accepted → 等待送达，delivered → 待确认
        (publishedTasks || []).forEach(task => {
            if (task.status === "accepted") {
                todos.push({ kind: "task", role: "publisher", task: task, statusText: "等待接取者送达", needsAction: false });
            } else if (task.status === "delivered") {
                todos.push({ kind: "task", role: "publisher", task: task, statusText: "已送达，待我确认完成", needsAction: true });
            }
        });
        // 我接取的任务：accepted → 待送达，delivered → 已送达（等待发布者确认）
        (acceptedTasks || []).forEach(task => {
            if (task.status === "accepted") {
                todos.push({ kind: "task", role: "accepter", task: task, statusText: "待我送达并确认", needsAction: true });
            } else if (task.status === "delivered") {
                todos.push({ kind: "task", role: "accepter", task: task, statusText: "已送达，等待发布者确认", needsAction: false });
            }
        });
        todos.forEach(entry => {
            const request = entry.task.terminationRequest;
            if (domain.isPendingTermination(request)) {
                const ownId = entry.role === "publisher" ? entry.task.publisherId : entry.task.accepterId;
                entry.needsAction = Number(request.requesterId) !== Number(ownId);
                entry.statusText = entry.needsAction ? "待我处理终止申请" : "等待对方确认终止";
            }
        });
        return todos;
    }

    // ===== 渲染待办（交易 + 跑腿） =====
    function renderTodos(published, bought, taskPublished, taskAccepted) {
        const root = document.querySelector("[data-todos]");
        const badge = document.querySelector("[data-todo-count]");

        // 1. 构建交易待办
        const tradeTodos = domain.buildTradeTodos(published.list, bought.list);

        // 2. 构建跑腿待办
        const taskTodos = buildTaskTodos(taskPublished, taskAccepted);

        // 3. 合并后按当前用户是否需要处理统一分组。
        const allTodos = [...tradeTodos, ...taskTodos];

        if (badge) badge.textContent = String(allTodos.length);

        if (!allTodos.length) {
            root.innerHTML = `
                <div class="todo-empty">
                    <span aria-hidden="true">☀</span>
                    <strong>目前没有进行中的交易或跑腿</strong>
                    <p>发布任务或发现好物后，待办会出现在这里。</p>
                </div>`;
            return;
        }

        root.innerHTML = [
            {needsAction: true, title: "需要我处理"},
            {needsAction: false, title: "等待对方处理"}
        ].map(group => {
            const entries = allTodos.filter(entry => entry.needsAction === group.needsAction);
            if (!entries.length) return "";
            return `<section class="todo-group${group.needsAction ? " todo-group--action" : ""}" aria-label="${group.title}">
                <h3 class="todo-group__heading">${group.title}<span>${entries.length}</span></h3>
                ${entries.map(entry => entry.kind === "task"
                    ? taskTodoItem(entry.task, entry.role, entry.needsAction, entry.statusText)
                    : todoItem(entry.item, entry.role, entry.needsAction, entry.statusText)).join("")}
            </section>`;
        }).join("");
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
                api.request(`/me/products${api.query({type: "bought", page: 1, size: 50})}`),
                // 新增：跑腿待办数据
                api.request(`/me/tasks${api.query({type: "published", page: 1, size: 50})}`).catch(() => ({ list: [] })),
                api.request(`/me/tasks${api.query({type: "accepted", page: 1, size: 50})}`).catch(() => ({ list: [] }))
            ]);

            const products = results[0].status === "fulfilled" ? results[0].value.list || [] : [];
            const tasks = results[1].status === "fulfilled" ? results[1].value.list || [] : [];
            recommendationPool = [
                ...products.filter((item) => item.status === "on_sale").map((data) => ({kind: "product", data})),
                ...tasks.filter((item) => item.status === "open").map((data) => ({kind: "task", data}))
            ];
            renderRecommendations();

            // 交易数据
            const published = results[2].status === "fulfilled" ? results[2].value : { list: [] };
            const bought = results[3].status === "fulfilled" ? results[3].value : { list: [] };
            // 跑腿数据
            const taskPublished = results[4].status === "fulfilled" ? results[4].value.list || [] : [];
            const taskAccepted = results[5].status === "fulfilled" ? results[5].value.list || [] : [];

            renderTodos(published, bought, taskPublished, taskAccepted);

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
