(function () {
    "use strict";

    const api = window.CTCP;
    const root = document.querySelector("[data-product-detail]");
    if (!root) return;

    const productId = Number(new URLSearchParams(location.search).get("productId"));
    const categoryNames = {book: "图书教材", electronic: "电子数码", daily: "生活日用", clothing: "服饰鞋帽", sports: "运动户外", other: "其他"};
    const conditionNames = {new: "全新", almost_new: "几乎全新", good: "成色良好", fair: "有使用痕迹"};
    const categoryEmoji = {book: "📚", electronic: "🎧", daily: "🪴", clothing: "🧥", sports: "🏀", other: "✨"};
    let product = null;
    let currentUser = null;
    let orderLink = null;

    async function findRelatedOrder() {
        if (!currentUser || product.status === "on_sale") return null;
        const [published, bought] = await Promise.allSettled([
            api.request(`/me/products${api.query({type: "published", page: 1, size: 50})}`),
            api.request(`/me/products${api.query({type: "bought", page: 1, size: 50})}`)
        ]);
        if (published.status === "fulfilled") {
            const item = (published.value.list || []).find((row) => Number(row.id) === productId && row.orderId);
            if (item) return {orderId: item.orderId, role: "seller"};
        }
        if (bought.status === "fulfilled") {
            const item = (bought.value.list || []).find((row) => Number(row.id) === productId && row.orderId);
            if (item) return {orderId: item.orderId, role: "buyer"};
        }
        return null;
    }

    function render() {
        const own = currentUser && Number(currentUser.id) === Number(product.sellerId);
        const category = categoryNames[product.category] || "二手好物";
        const sold = product.status !== "on_sale";
        let action;
        if (orderLink) {
            action = `<a class="primary-action" href="${api.pageUrl(`product-order.jsp?orderId=${orderLink.orderId}&role=${orderLink.role}`)}"><span>进入交易页面</span><span>→</span></a>`;
        } else if (sold) {
            action = `<button class="primary-action" type="button" disabled><span>${product.status === "completed" ? "交易已完成" : "商品已售出"}</span></button>`;
        } else if (!currentUser) {
            const next = encodeURIComponent(`product-detail.jsp?productId=${productId}`);
            action = `<a class="primary-action" href="${api.pageUrl(`index.jsp?next=${next}`)}"><span>登录后购买</span><span>→</span></a>`;
        } else if (own) {
            action = `<button class="primary-action" type="button" disabled><span>这是你发布的商品</span></button>`;
        } else {
            action = `<button class="primary-action" type="button" data-action="buy"><span>立即购买</span><span>→</span></button>`;
        }

        root.innerHTML = `
            <div class="detail-media-column">
                <div class="detail-media detail-media--book">
                    <span class="detail-media__label">${api.escapeHtml(category)}</span>
                    <span class="detail-media__emoji" aria-hidden="true">${categoryEmoji[product.category] || "✨"}</span>
                    <span class="detail-media__spark detail-media__spark--one" aria-hidden="true">✦</span>
                    <span class="detail-media__spark detail-media__spark--two" aria-hidden="true">✧</span>
                    <span class="detail-media__circle detail-media__circle--one" aria-hidden="true"></span>
                    <span class="detail-media__circle detail-media__circle--two" aria-hidden="true"></span>
                </div>
                <div class="detail-note"><span class="detail-note__icon">☼</span><p><strong>校园友好交易</strong><br><span>建议在公共区域当面交接</span></p></div>
            </div>
            <article class="detail-panel">
                <div class="detail-status-row">
                    <span class="detail-tag detail-tag--category">${api.escapeHtml(category)}</span>
                    <span class="availability-badge${sold ? " availability-badge--sold" : ""}">${sold ? "已售出" : "在售"}</span>
                </div>
                <h2>${api.escapeHtml(product.title)}</h2>
                <p class="detail-subtitle">${api.escapeHtml(product.description || "一件正在等待新主人的校园好物")}</p>
                <div class="detail-price"><small>￥</small><strong>${api.money(product.price)}</strong><span>价格仅作信息记录</span></div>
                <div class="detail-divider"></div>
                <dl class="detail-facts">
                    <div><dt>商品成色</dt><dd><span class="detail-tag detail-tag--condition">${api.escapeHtml(conditionNames[product.condition] || "成色良好")}</span></dd></div>
                    <div><dt>交易地点</dt><dd>⌖ ${api.escapeHtml(product.location || "双方协商")}</dd></div>
                    <div><dt>发布时间</dt><dd>${api.shortTime(product.createdAt)}</dd></div>
                    <div><dt>联系方式</dt><dd data-product-contact>${api.escapeHtml(product.contact || "购买后请通过平台记录联系")}</dd></div>
                    <div><dt>卖家</dt><dd class="seller-detail"><span class="avatar avatar--tiny">${api.initial(product.sellerName)}</span>${api.escapeHtml(product.sellerName || "校园同学")}</dd></div>
                </dl>
                <div class="detail-description"><h3>商品描述</h3><p>${api.escapeHtml(product.description || "卖家暂未补充更多描述。")}</p></div>
                <div class="detail-actions">${action}<a class="secondary-action" href="${api.pageUrl("secondhand.jsp")}">再看看</a></div>
                <p class="detail-footnote">购买会生成交易记录；之后由买卖双方联系并在线下完成交接，平台不接入真实支付。</p>
            </article>`;

        const buyButton = root.querySelector("[data-action='buy']");
        if (buyButton) buyButton.addEventListener("click", buy);
    }

    async function buy() {
        const button = root.querySelector("[data-action='buy']");
        if (!confirm(`确认购买“${product.title}”吗？\n本操作不包含在线支付，购买后请与卖家线下联系。`)) return;
        api.setLoading(button, true, "正在生成交易...");
        try {
            const data = await api.request(`/products/${productId}/buy`, {method: "POST"});
            api.toast("购买成功，正在进入交易页面", "success");
            location.href = api.pageUrl(`product-order.jsp?orderId=${data.orderId}&role=buyer`);
        } catch (error) {
            api.toast(error.message || "购买失败，请稍后重试", "error");
            api.setLoading(button, false);
        }
    }

    async function load() {
        if (!Number.isInteger(productId) || productId < 1) {
            root.innerHTML = `<div class="empty-state empty-state--error"><h3>商品编号无效</h3><a href="${api.pageUrl("secondhand.jsp")}">返回商品列表</a></div>`;
            return;
        }
        try {
            const [productResult, userResult] = await Promise.all([
                api.request(`/public/products/${productId}`),
                api.currentUser().catch(() => null)
            ]);
            product = productResult;
            currentUser = userResult;
            orderLink = await findRelatedOrder();
            render();
        } catch (error) {
            root.innerHTML = `<div class="empty-state empty-state--error"><span>!</span><h3>商品详情加载失败</h3><p>${api.escapeHtml(error.message)}</p><a href="${api.pageUrl("secondhand.jsp")}">返回商品列表</a></div>`;
        }
    }

    load();
})();
