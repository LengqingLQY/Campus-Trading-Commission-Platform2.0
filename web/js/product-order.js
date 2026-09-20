(function () {
    "use strict";

    const api = window.CTCP;
    const domain = window.CTCPDomain;
    const root = document.querySelector("[data-order-detail]");
    if (!root) return;
    const orderId = Number(new URLSearchParams(location.search).get("orderId"));
    let order = null;

    const statusNames = {
        created: "待卖家交付",
        delivered: "待买家确认",
        completed: "交易已完成",
        cancelled: "交易已取消"
    };

    function contactText(role) {
        if (role === "buyer") {
            return order.contact
                || [order.sellerWechat && `微信：${order.sellerWechat}`, order.sellerQq && `QQ：${order.sellerQq}`, order.sellerPhone && `电话：${order.sellerPhone}`].filter(Boolean).join(" · ")
                || "卖家暂未留下联系方式";
        }
        return [order.buyerWechat && `微信：${order.buyerWechat}`, order.buyerQq && `QQ：${order.buyerQq}`, order.buyerPhone && `电话：${order.buyerPhone}`].filter(Boolean).join(" · ")
            || "买家暂未留下联系方式，可等待买家主动联系";
    }

    function actionArea() {
        const action = domain.orderAction(order.viewerRole, order.status);
        if (action === "completed") {
            return `<div class="order-complete-banner"><span>✓</span><div><strong>这笔交易已经完成</strong><small>感谢你让校园闲置物品继续发挥价值。</small></div></div>`;
        }
        if (action === "cancelled") {
            return `<div class="order-waiting-banner"><span>—</span><div><strong>这笔交易已取消</strong><small>当前页面仅保留交易记录。</small></div></div>`;
        }
        if (action === "deliver") {
            return `<button class="primary-action order-main-action" type="button" data-order-action="deliver">确认商品已交付</button><p class="order-action-hint">请在线下完成交接后再确认，确认后将提醒买家验货收货。</p>`;
        }
        if (action === "complete") {
            return `<button class="primary-action order-main-action" type="button" data-order-action="complete">确认收到商品</button><p class="order-action-hint">请先当面验货；确认后订单将完成，操作不可重复。</p>`;
        }
        const waiting = action === "waiting_seller" ? "等待卖家确认交付" : "等待买家确认收货";
        const note = action === "waiting_seller" ? "你可以先联系卖家约定校园内的交接时间和地点。" : "商品已交付，买家验货后会确认完成交易。";
        return `<div class="order-waiting-banner"><span>⌛</span><div><strong>${waiting}</strong><small>${note}</small></div></div>`;
    }

    function timelineClass(step) {
        const rank = domain.orderRank(order.status);
        if (rank > step) return "is-done";
        if (rank === step) return "is-current";
        return "";
    }

    function timelineIcon(step) {
        const rank = domain.orderRank(order.status);
        return rank > step || (rank === 3 && step === 3) ? "✓" : String(step);
    }

    function render() {
        const role = order.viewerRole;
        const counterpart = role === "buyer" ? order.sellerName : order.buyerName;
        const contact = contactText(role);
        root.innerHTML = `
            <section class="order-hero">
                <div>
                    <span class="order-kicker">ORDER #${order.id} · ${role === "buyer" ? "BUYER" : "SELLER"}</span>
                    <h2>${api.escapeHtml(order.productTitle)}</h2>
                    <p>你是本次交易的${role === "buyer" ? "买家" : "卖家"} · 交易对象：${api.escapeHtml(counterpart || "校园同学")}</p>
                </div>
                <div class="order-price"><small>成交价</small><strong>￥${api.money(order.price)}</strong><span>${statusNames[order.status] || "交易进行中"}</span></div>
            </section>
            <section class="order-grid">
                <article class="order-card">
                    <div class="order-card__heading"><span>01</span><div><h3>交易进度</h3><p>卖家交付后，由买家验货并确认完成</p></div></div>
                    <ol class="order-timeline">
                        <li class="is-done"><i>✓</i><div><strong>购买成功，订单已生成</strong><small>${api.shortTime(order.createdAt)}</small></div></li>
                        <li class="${timelineClass(1)}"><i>${timelineIcon(1)}</i><div><strong>联系对方并完成线下交付</strong><small>${order.deliveredAt ? `卖家于 ${api.shortTime(order.deliveredAt)} 确认交付` : api.escapeHtml(order.location || "双方协商校园内交易地点")}</small></div></li>
                        <li class="${timelineClass(2)}"><i>${timelineIcon(2)}</i><div><strong>买家验货并确认收到</strong><small>${order.finishedAt ? `买家于 ${api.shortTime(order.finishedAt)} 确认完成` : "请当面核对商品情况，确认无误后完成交易"}</small></div></li>
                    </ol>
                    ${actionArea()}
                </article>
                <aside class="order-card order-card--contact">
                    <div class="order-card__heading"><span>02</span><div><h3>交易信息</h3><p>联系方式仅对本次交易双方展示</p></div></div>
                    <dl class="order-facts">
                        <div><dt>我的身份</dt><dd>${role === "buyer" ? "买家" : "卖家"}</dd></div>
                        <div><dt>交易对象</dt><dd>${api.escapeHtml(counterpart || "校园同学")}</dd></div>
                        <div><dt>交易地点</dt><dd>${api.escapeHtml(order.location || "双方协商")}</dd></div>
                        <div><dt>对方联系方式</dt><dd data-order-contact>${api.escapeHtml(contact)}</dd></div>
                        <div><dt>订单状态</dt><dd>${statusNames[order.status] || api.escapeHtml(order.status)}</dd></div>
                    </dl>
                    <div class="order-actions">
                        <button class="secondary-action" type="button" data-copy-contact>复制联系方式</button>
                        <a class="secondary-action" href="${api.pageUrl(`product-detail.jsp?productId=${order.productId}`)}">查看商品详情</a>
                        <a class="secondary-action" href="${api.pageUrl("main.jsp")}">返回发现首页</a>
                    </div>
                </aside>
            </section>`;

        root.querySelector("[data-copy-contact]").addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(contact);
                api.toast("联系方式已复制", "success");
            } catch (error) {
                api.toast(`联系方式：${contact}`, "info");
            }
        });
        const action = root.querySelector("[data-order-action]");
        if (action) action.addEventListener("click", advance);
    }

    async function advance(event) {
        const action = event.currentTarget.dataset.orderAction;
        const isDeliver = action === "deliver";
        const message = isDeliver
            ? "请确认商品已经在线下交给买家。确认后订单将等待买家收货。"
            : "请确认已经收到并验过商品。确认后本次交易将完成。";
        if (!confirm(message)) return;
        api.setLoading(event.currentTarget, true, isDeliver ? "正在确认交付..." : "正在完成交易...");
        try {
            await api.request(`/product-orders/${orderId}/${isDeliver ? "deliver" : "complete"}`, {method: "PUT"});
            api.toast(isDeliver ? "已确认交付，等待买家确认" : "交易已完成", "success");
            await load();
        } catch (error) {
            api.toast(error.message || "操作失败，请稍后重试", "error");
            api.setLoading(event.currentTarget, false);
        }
    }

    async function load() {
        if (!Number.isInteger(orderId) || orderId < 1) {
            root.innerHTML = `<div class="empty-state empty-state--error"><h3>交易编号无效</h3><a href="${api.pageUrl("main.jsp")}">返回首页</a></div>`;
            return;
        }
        try {
            await api.requireUser();
            order = await api.request(`/product-orders/${orderId}`);
            render();
        } catch (error) {
            if (error.status !== 401) {
                root.innerHTML = `<div class="empty-state empty-state--error"><span>!</span><h3>交易信息加载失败</h3><p>${api.escapeHtml(error.message)}</p><a href="${api.pageUrl("main.jsp")}">返回首页</a></div>`;
            }
        }
    }

    load();
})();
