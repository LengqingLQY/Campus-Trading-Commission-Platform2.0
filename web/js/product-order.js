(function () {
    "use strict";

    const api = window.CTCP;
    const domain = window.CTCPDomain;
    const root = document.querySelector("[data-order-detail]");
    if (!root) return;
    const orderId = Number(new URLSearchParams(location.search).get("orderId"));
    let order = null;
    let terminationComposerOpen = false;

    const statusNames = {
        created: "待卖家交付",
        delivered: "待买家确认",
        completed: "交易已完成",
        cancelled: "交易已终止"
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

    function pendingTermination() {
        if (!order || (order.status !== "created" && order.status !== "delivered")) return null;
        const request = order.terminationRequest;
        return domain.isPendingTermination(request) ? request : null;
    }

    function terminationComposer() {
        if (!terminationComposerOpen) return "";
        return `
            <section class="termination-composer" aria-label="发起终止交易申请">
                <div class="termination-composer__heading">
                    <div><strong>申请终止这笔交易</strong><small>提交后交易步骤会暂停，需对方同意才会真正终止。</small></div>
                    <button type="button" aria-label="关闭终止申请表单" data-termination-action="close">×</button>
                </div>
                <label for="termination-reason">终止原因 <span>2～200 字，对方可见</span></label>
                <textarea id="termination-reason" maxlength="200" data-termination-reason placeholder="例如：时间无法协调，希望终止本次交易"></textarea>
                <p class="form-feedback" data-termination-feedback aria-live="polite"></p>
                <div class="termination-composer__actions">
                    <button class="secondary-action" type="button" data-termination-action="close">暂不申请</button>
                    <button class="primary-action termination-submit" type="button" data-termination-action="submit"><span>提交终止申请</span><span>→</span></button>
                </div>
            </section>`;
    }

    function terminationRequestArea(request) {
        const mode = domain.terminationAction(order.viewerRole, order.status, request);
        const mine = mode === "withdraw";
        const otherRoleName = order.viewerRole === "buyer" ? "卖家" : "买家";
        const requester = request.requesterName || (request.requesterRole === "buyer" ? "买家" : "卖家");
        const title = mine ? "终止申请已发出" : `${requester}申请终止交易`;
        const description = mine
            ? `等待${otherRoleName}处理；在对方同意、拒绝或你撤回之前，交付与确认收货操作会暂停。`
            : "请确认双方已经妥善处理线下物品；同意后订单将终止，商品立即恢复待售。";
        const buttons = mine
            ? `<button class="secondary-action danger-action" type="button" data-termination-action="withdraw">撤回终止申请</button>`
            : `<button class="primary-action termination-approve" type="button" data-termination-action="approve"><span>同意终止并恢复在售</span><span>✓</span></button>
               <button class="secondary-action" type="button" data-termination-action="reject">拒绝，继续交易</button>`;
        return `
            <section class="termination-request-banner termination-request-banner--${mine ? "waiting" : "review"}">
                <div class="termination-request-banner__head">
                    <span aria-hidden="true">${mine ? "⌛" : "!"}</span>
                    <div><strong>${api.escapeHtml(title)}</strong><small>${api.escapeHtml(description)}</small></div>
                </div>
                <p class="termination-request-reason"><span>申请理由</span>${api.escapeHtml(request.reason || "对方未填写具体原因")}</p>
                <div class="termination-request-meta">发起时间：${api.shortTime(request.createdAt)}</div>
                <div class="termination-request-actions">${buttons}</div>
            </section>`;
    }

    function progressActionArea() {
        const action = domain.orderAction(order.viewerRole, order.status);
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

    function actionArea() {
        const action = domain.orderAction(order.viewerRole, order.status);
        if (action === "completed") {
            return `<div class="order-complete-banner"><span>✓</span><div><strong>这笔交易已经完成</strong><small>感谢你让校园闲置物品继续发挥价值。</small></div></div>`;
        }
        if (action === "cancelled") {
            return `<div class="order-complete-banner order-complete-banner--terminated"><span>↺</span><div><strong>双方已终止这笔交易</strong><small>订单记录继续保留，商品已经恢复为待售状态。</small></div></div>`;
        }

        const request = pendingTermination();
        if (request) return terminationRequestArea(request);

        return `${progressActionArea()}
            <div class="termination-entry">
                <button class="secondary-action danger-action" type="button" data-termination-action="open">申请终止交易</button>
                <p>仅提交申请不会终止订单；需要交易另一方确认同意。</p>
            </div>
            ${terminationComposer()}`;
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
        const request = pendingTermination();
        const heroStatus = request
            ? request.requesterRole === role ? "终止申请待对方确认" : "终止申请待你处理"
            : statusNames[order.status] || "交易进行中";
        const terminationFact = request
            ? `<div><dt>终止申请</dt><dd>${request.requesterRole === role ? "已发起，等待对方处理" : "对方已发起，等待你处理"}</dd></div>`
            : order.status === "cancelled"
                ? `<div><dt>商品状态</dt><dd>已恢复待售</dd></div>`
                : "";
        root.innerHTML = `
            <section class="order-hero">
                <div>
                    <span class="order-kicker">ORDER #${order.id} · ${role === "buyer" ? "BUYER" : "SELLER"}</span>
                    <h2>${api.escapeHtml(order.productTitle)}</h2>
                    <p>你是本次交易的${role === "buyer" ? "买家" : "卖家"} · 交易对象：${api.escapeHtml(counterpart || "校园同学")}</p>
                </div>
                <div class="order-price"><small>成交价</small><strong>￥${api.money(order.price)}</strong><span>${api.escapeHtml(heroStatus)}</span></div>
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
                        ${terminationFact}
                    </dl>
                    <div class="order-actions">
                        <button class="secondary-action" type="button" data-copy-contact>复制联系方式</button>
                        <a class="secondary-action" href="${api.pageUrlWithReturn(`product-detail.jsp?productId=${order.productId}`)}">查看商品详情</a>
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
        root.querySelectorAll("[data-termination-action]").forEach((button) => {
            button.addEventListener("click", handleTerminationAction);
        });
    }

    function handleTerminationAction(event) {
        const action = event.currentTarget.dataset.terminationAction;
        if (action === "open") {
            terminationComposerOpen = true;
            render();
            const reason = root.querySelector("[data-termination-reason]");
            if (reason) reason.focus();
            return;
        }
        if (action === "close") {
            terminationComposerOpen = false;
            render();
            return;
        }
        if (action === "submit") {
            submitTerminationRequest(event.currentTarget);
            return;
        }
        resolveTerminationRequest(action, event.currentTarget);
    }

    async function submitTerminationRequest(button) {
        const reasonInput = root.querySelector("[data-termination-reason]");
        const feedback = root.querySelector("[data-termination-feedback]");
        const reason = String(reasonInput && reasonInput.value || "").trim();
        if (reason.length < 2 || reason.length > 200) {
            api.setFeedback(feedback, "请填写 2～200 字的终止原因");
            if (reasonInput) reasonInput.focus();
            return;
        }
        api.setFeedback(feedback, "");
        api.setLoading(button, true, "正在提交...");
        try {
            await api.request(`/product-orders/${orderId}/termination-request`, {
                method: "POST",
                body: {reason}
            });
            terminationComposerOpen = false;
            api.toast("终止申请已发送，等待对方处理", "success");
            await load();
        } catch (error) {
            api.setFeedback(feedback, error.message || "申请提交失败，请稍后重试");
            api.setLoading(button, false);
        }
    }

    async function resolveTerminationRequest(action, button) {
        const configs = {
            approve: {
                method: "PUT",
                suffix: "/approve",
                confirmText: "同意后本订单将终止，商品会立即恢复待售。请确认线下物品已经妥善处理。",
                loadingText: "正在终止交易...",
                successText: "交易已终止，商品已恢复待售"
            },
            reject: {
                method: "PUT",
                suffix: "/reject",
                confirmText: "确认拒绝终止申请并继续当前交易吗？",
                loadingText: "正在处理...",
                successText: "已拒绝终止申请，交易继续"
            },
            withdraw: {
                method: "DELETE",
                suffix: "",
                confirmText: "确认撤回你发起的终止申请吗？撤回后交易将继续。",
                loadingText: "正在撤回...",
                successText: "终止申请已撤回"
            }
        };
        const config = configs[action];
        if (!config || !confirm(config.confirmText)) return;
        api.setLoading(button, true, config.loadingText);
        try {
            await api.request(`/product-orders/${orderId}/termination-request${config.suffix}`, {method: config.method});
            api.toast(config.successText, "success");
            await load();
        } catch (error) {
            api.toast(error.message || "操作失败，请稍后重试", "error");
            if (error.status === 409) {
                await load();
            } else {
                api.setLoading(button, false);
            }
        }
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
