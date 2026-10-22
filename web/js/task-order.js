(function () {
    "use strict";

    const api = window.CTCP;
    const R = window.CTCPRating;
    const root = document.querySelector("[data-task-order-detail]");
    if (!root) return;

    const orderId = Number(new URLSearchParams(location.search).get("orderId"));
    let order = null;
    let selectedStars = null;

    const statusNames = {
        accepted: "已接取",
        delivered: "已送达",
        completed: "已完成",
        cancelled: "已终止"
    };

    function counterpartInfo() {
        const role = order.viewerRole;
        const name = role === "publisher" ? (order.accepterName || "接单同学") : (order.publisherName || "发布同学");
        const counterpartRole = role === "publisher" ? "seller" : "buyer";
        return {name, counterpartRole};
    }

    // 来源为消息中心时显示「返回消息中心」，否则沿用「返回评价记录」（沿用现有 returnTo 机制）。
    function returnLinkHtml() {
        const raw = new URLSearchParams(location.search).get("returnTo");
        const fromMessages = raw && raw.indexOf("message-center.jsp") !== -1;
        const href = api.safePageUrl(raw, fromMessages ? "message-center.jsp" : "profile-user.jsp?recordTab=rating-orders");
        const label = fromMessages ? "返回消息中心" : "返回评价记录";
        return `<a class="secondary-action" href="${href}">${label}</a>`;
    }

    function ratingSectionHtml() {
        const {name, counterpartRole} = counterpartInfo();
        const myStars = order.myRatingStars;
        const completed = order.status === "completed";

        if (completed) {
            if (myStars != null) {
                return `<section class="rating-block" data-rating-block>
                    <div class="rating-block__title">交易评价</div>
                    <div class="rating-block__counterpart">你已为 <strong>${api.escapeHtml(name)}</strong> 的${R.roleLabel(counterpartRole)}信誉评分</div>
                    <div class="rating-done">${R.starsHtml(myStars)}<span>已评价 ${myStars} 星</span></div>
                </section>`;
            }
            return `<section class="rating-block" data-rating-block>
                <div class="rating-block__title">交易评价</div>
                <div class="rating-block__counterpart">为 <strong>${api.escapeHtml(name)}</strong> 的${R.roleLabel(counterpartRole)}信誉评分</div>
                <div data-rating-selector></div>
                <div class="rating-submit-row">
                    <button class="primary-action" type="button" data-rating-submit>提交评价</button>
                    <span class="rating-feedback" data-rating-feedback aria-live="polite"></span>
                </div>
            </section>`;
        }
        return `<section class="rating-block" data-rating-block>
            <div class="rating-block__title">交易评价</div>
            <div class="rating-block__counterpart"><strong>${api.escapeHtml(name)}</strong> 的${R.roleLabel(counterpartRole)}信誉</div>
            <p class="rating-feedback">跑腿任务完成后，你可以为对方评分。</p>
        </section>`;
    }

    function statusBanner() {
        if (order.status === "completed") {
            return `<div class="order-complete-banner"><span>✓</span><div><strong>这笔跑腿已经完成</strong><small>感谢你参与的校园互助。</small></div></div>`;
        }
        if (order.status === "cancelled") {
            return `<div class="order-complete-banner order-complete-banner--terminated"><span>↺</span><div><strong>双方已终止这笔跑腿</strong><small>订单记录继续保留。</small></div></div>`;
        }
        const waiting = order.status === "accepted" ? "等待接单者送达" : "等待发布者确认完成";
        return `<div class="order-waiting-banner"><span>⌛</span><div><strong>${statusNames[order.status] || "进行中"}</strong><small>${waiting}</small></div></div>`;
    }

    function render() {
        const role = order.viewerRole;
        const {name, counterpartRole} = counterpartInfo();
        root.innerHTML = `
            <section class="order-hero">
                <div>
                    <span class="order-kicker">TASK ORDER #${order.id} · ${role === "publisher" ? "PUBLISHER" : "ACCEPTER"}</span>
                    <h2>${api.escapeHtml(order.taskTitle || "跑腿任务")}</h2>
                    <p>你是本次跑腿的${role === "publisher" ? "发布者" : "接单者"} · 交易对象：${api.escapeHtml(name)}</p>
                </div>
                <div class="order-price"><small>状态</small><strong>${statusNames[order.status] || api.escapeHtml(order.status)}</strong></div>
            </section>
            <section class="order-grid">
                <article class="order-card">
                    <div class="order-card__heading"><span>01</span><div><h3>订单状态</h3><p>接单者送达后，由发布者确认完成</p></div></div>
                    ${statusBanner()}
                    ${R.ratingBadge(order.counterpartyRating, counterpartInfo().counterpartRole)}
                    ${ratingSectionHtml()}
                </article>
                <aside class="order-card order-card--contact">
                    <div class="order-card__heading"><span>02</span><div><h3>交易信息</h3><p>仅对本次交易双方展示</p></div></div>
                    <dl class="order-facts">
                        <div><dt>我的身份</dt><dd>${role === "publisher" ? "发布者" : "接单者"}</dd></div>
                        <div><dt>交易对象</dt><dd>${api.escapeHtml(name)}</dd></div>
                        <div><dt>订单状态</dt><dd>${statusNames[order.status] || api.escapeHtml(order.status)}</dd></div>
                    </dl>
                    <div class="order-actions">
                        ${returnLinkHtml()}
                        <a class="secondary-action" href="${api.pageUrl("task-hall.jsp")}">返回任务列表</a>
                        ${(order.status === "accepted" || order.status === "delivered") ? `<a class="secondary-action" href="${api.pageUrl("task-detail.jsp?taskId=" + order.taskId)}">进入任务处理</a>` : ""}
                    </div>
                </aside>
            </section>`;

        mountRating();
    }

    function mountRating() {
        selectedStars = null;
        const slot = root.querySelector("[data-rating-selector]");
        if (slot) {
            R.mountStarSelector(slot, {
                onSelect(stars) {
                    selectedStars = stars;
                }
            });
        }
        const button = root.querySelector("[data-rating-submit]");
        if (button) button.addEventListener("click", submitRating);
    }

    async function submitRating(event) {
        const button = event.currentTarget;
        const feedback = root.querySelector("[data-rating-feedback]");
        if (selectedStars == null) {
            api.setFeedback(feedback, "请先选择 1～5 星");
            return;
        }
        api.setFeedback(feedback, "");
        api.setLoading(button, true, "提交中...");
        try {
            await api.request(`/task-orders/${orderId}/rating`, {method: "POST", body: {stars: selectedStars}});
            api.toast("评价已提交", "success");
            await load();
        } catch (error) {
            api.setFeedback(feedback, error.message || "提交失败，请稍后重试");
            api.setLoading(button, false);
        }
    }

    async function load() {
        if (!Number.isInteger(orderId) || orderId < 1) {
            root.innerHTML = `<div class="empty-state empty-state--error"><h3>订单编号无效</h3><a href="${api.pageUrl("task-hall.jsp")}">返回任务列表</a></div>`;
            return;
        }
        try {
            await api.requireUser();
            order = await api.request(`/task-orders/${orderId}`);
            render();
        } catch (error) {
            if (error.status !== 401) {
                root.innerHTML = `<div class="empty-state empty-state--error"><span>!</span><h3>订单加载失败</h3><p>${api.escapeHtml(error.message)}</p><a href="${api.pageUrl("task-hall.jsp")}">返回任务列表</a></div>`;
            }
        }
    }

    load();
})();
