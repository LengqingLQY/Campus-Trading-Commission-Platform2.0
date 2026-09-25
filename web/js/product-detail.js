(function () {
    "use strict";

    const api = window.CTCP;
    const root = document.querySelector("[data-product-detail]");
    if (!root) return;

    const searchParams = new URLSearchParams(location.search);
    const productId = Number(searchParams.get("productId"));
    const categoryNames = {book: "图书教材", electronic: "电子数码", daily: "生活日用", clothing: "服饰鞋帽", sports: "运动户外", other: "其他"};
    const conditionNames = {new: "全新", almost_new: "几乎全新", good: "成色良好", fair: "有使用痕迹"};
    const categoryEmoji = {book: "📚", electronic: "🎧", daily: "🪴", clothing: "🧥", sports: "🏀", other: "✨"};
    let product = null;
    let currentUser = null;
    let orderLink = null;

    // ===== 图片渲染函数（平铺） =====
    function renderImages(imageUrls) {
        if (!imageUrls) return "";
        const urls = imageUrls.split(",").filter((u) => u && u.trim());
        if (urls.length === 0) return "";
        const items = urls.map((url) =>
            `<div class="detail-image-item"><img src="${api.escapeHtml(url.trim())}" alt="商品图片"></div>`
        ).join("");
        return `<div class="detail-image-grid">${items}</div>`;
    }

    function resolveReturnContext() {
        const requested = searchParams.get("returnTo") || document.referrer || "";
        const fallbackUrl = api.pageUrl("secondhand.jsp");
        let url = api.safePageUrl(requested, "secondhand.jsp");
        const detailPath = new URL(api.pageUrl("product-detail.jsp")).pathname;
        if (new URL(url).pathname === detailPath) url = fallbackUrl;

        const pageName = new URL(url).pathname.split("/").pop();
        const labels = {
            "profile-user.jsp": "返回个人空间",
            "main.jsp": "返回发现首页",
            "product-order.jsp": "返回交易页面",
            "product-publish.jsp": "返回发布页面",
            "secondhand.jsp": "返回商品列表"
        };
        return {url, label: labels[pageName] || "返回上一页"};
    }

    const returnContext = resolveReturnContext();
    const headerBackLink = document.querySelector("[data-detail-back]");
    if (headerBackLink) {
        headerBackLink.href = returnContext.url;
        headerBackLink.textContent = `← ${returnContext.label}`;
    }

    function canUseBrowserBack() {
        if (!document.referrer || history.length < 2) return false;
        try {
            const referrer = new URL(document.referrer);
            const target = new URL(returnContext.url);
            return referrer.origin === target.origin
                && referrer.pathname === target.pathname
                && referrer.search === target.search;
        } catch (error) {
            return false;
        }
    }

    document.addEventListener("click", (event) => {
        const link = event.target.closest && event.target.closest("[data-detail-back]");
        if (!link || !canUseBrowserBack()) return;
        event.preventDefault();
        history.back();
    });

    function returnLink() {
        return `<a class="secondary-action" data-detail-back href="${api.escapeHtml(returnContext.url)}">${api.escapeHtml(returnContext.label)}</a>`;
    }

    async function findRelatedOrder() {
        if (!currentUser || product.status === "on_sale") return null;
        const [published, bought] = await Promise.allSettled([
            api.request(`/me/products${api.query({type: "published", page: 1, size: 50})}`),
            api.request(`/me/products${api.query({type: "bought", page: 1, size: 50})}`)
        ]);
        if (published.status === "fulfilled") {
            const item = (published.value.list || []).find((row) => Number(row.id) === productId
                && row.orderId && row.orderStatus !== "cancelled");
            if (item) return {orderId: item.orderId, role: "seller"};
        }
        if (bought.status === "fulfilled") {
            const item = (bought.value.list || []).find((row) => Number(row.id) === productId
                && row.orderId && row.orderStatus !== "cancelled");
            if (item) return {orderId: item.orderId, role: "buyer"};
        }
        return null;
    }

    function render() {
        const own = currentUser && Number(currentUser.id) === Number(product.sellerId);
        const category = categoryNames[product.category] || "二手好物";
        const sold = product.status !== "on_sale";
        let action;
        let ownerDeleteAction = "";
        if (orderLink) {
            action = `<a class="primary-action" href="${api.pageUrl(`product-order.jsp?orderId=${orderLink.orderId}&role=${orderLink.role}`)}"><span>进入交易页面</span><span>→</span></a>`;
        } else if (sold) {
            action = `<button class="primary-action" type="button" disabled><span>${product.status === "completed" ? "交易已完成" : "商品已售出"}</span><span aria-hidden="true">✓</span></button>`;
        } else if (!currentUser) {
            const next = encodeURIComponent(api.currentPagePath() || `product-detail.jsp?productId=${productId}`);
            action = `<a class="primary-action" href="${api.pageUrl(`index.jsp?next=${next}`)}"><span>登录后购买</span><span>→</span></a>`;
        } else if (own) {
            action = `<button class="primary-action" type="button" disabled><span>这是你发布的商品</span><span aria-hidden="true">✓</span></button>`;
        } else {
            action = `<button class="primary-action" type="button" data-action="buy"><span>立即购买</span><span>→</span></button>`;
        }

        if (own) {
            ownerDeleteAction = product.status === "sold"
                ? `<button class="secondary-action danger-action" type="button" disabled title="交易进行中，完成交易后才能删除">交易中不可删除</button>`
                : `<button class="secondary-action danger-action" type="button" data-action="delete">删除商品</button>`;
        }

        const imageHtml = renderImages(product.imageUrls);
        const mediaContent = imageHtml || `
                <div class="detail-media detail-media--book">
                    <span class="detail-media__label">${api.escapeHtml(category)}</span>
                    <span class="detail-media__emoji" aria-hidden="true">${categoryEmoji[product.category] || "✨"}</span>
                    <span class="detail-media__spark detail-media__spark--one" aria-hidden="true">✦</span>
                    <span class="detail-media__spark detail-media__spark--two" aria-hidden="true">✧</span>
                    <span class="detail-media__circle detail-media__circle--one" aria-hidden="true"></span>
                    <span class="detail-media__circle detail-media__circle--two" aria-hidden="true"></span>
                </div>`;

        root.innerHTML = `
            <div class="detail-media-column">
                ${mediaContent}
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
                <div class="detail-actions">${action}${ownerDeleteAction}${returnLink()}</div>
                <p class="detail-footnote">购买会生成交易记录；之后由买卖双方联系并在线下完成交接，平台不接入真实支付。</p>
            </article>`;

        const buyButton = root.querySelector("[data-action='buy']");
        if (buyButton) buyButton.addEventListener("click", buy);
        const deleteButton = root.querySelector("[data-action='delete']");
        if (deleteButton) deleteButton.addEventListener("click", removeProduct);
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

    async function removeProduct() {
        const button = root.querySelector("[data-action='delete']");
        const consequence = product.status === "completed"
            ? "删除后商品发布信息会被隐藏；商品数据和已经完成的交易记录仍会保留。"
            : "删除后商品会从二手列表和个人空间中隐藏，数据库数据仍会保留，便于后续恢复。";
        if (!confirm(`确认删除“${product.title}”吗？\n${consequence}`)) return;
        api.setLoading(button, true, "正在删除...");
        try {
            await api.request(`/products/${productId}`, {method: "DELETE"});
            api.toast("商品已删除", "success");
            setTimeout(() => location.replace(returnContext.url), 450);
        } catch (error) {
            api.toast(error.message || "删除失败，请稍后重试", "error");
            api.setLoading(button, false);
        }
    }

    async function load() {
        if (!Number.isInteger(productId) || productId < 1) {
            root.innerHTML = `<div class="empty-state empty-state--error"><h3>商品编号无效</h3>${returnLink()}</div>`;
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
            root.innerHTML = `<div class="empty-state empty-state--error"><span>!</span><h3>商品详情加载失败</h3><p>${api.escapeHtml(error.message)}</p>${returnLink()}</div>`;
        }
    }

    load();
})();
