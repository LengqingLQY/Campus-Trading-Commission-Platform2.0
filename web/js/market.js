(function () {
    "use strict";

    const api = window.CTCP;
    const root = document.querySelector("[data-product-grid]");
    if (!root) return;

    const categoryNames = {
        "": "全部", book: "图书教材", electronic: "电子数码", daily: "生活日用",
        clothing: "服饰鞋帽", sports: "运动户外", other: "其他"
    };
    const conditionNames = {new: "全新", almost_new: "几乎全新", good: "成色良好", fair: "有使用痕迹"};
    const emoji = {book: "📚", electronic: "🎧", daily: "🪴", clothing: "🧥", sports: "🏀", other: "✨"};
    const state = {keyword: "", sort: "time_desc", category: "", requestId: 0};

    function card(item, index) {
        const sold = item.status !== "on_sale";
        return `
            <article class="product-card${sold ? " product-card--sold" : ""}">
                <a class="product-card__link" href="${api.pageUrl(`product-detail.jsp?productId=${item.id}`)}">
                    <div class="product-visual product-visual--${["mint", "sky", "peach", "lemon"][index % 4]}">
                        <span class="visual-label">${api.escapeHtml(categoryNames[item.category] || "二手好物")}</span>
                        <span class="product-emoji" aria-hidden="true">${emoji[item.category] || "✨"}</span>
                        ${sold ? `<span class="sale-badge">${item.status === "completed" ? "交易完成" : "已售出"}</span>` : ""}
                    </div>
                    <div class="product-info">
                        <div class="product-tags">
                            <span class="category-tag">${api.escapeHtml(categoryNames[item.category] || "其他")}</span>
                            <span class="condition-tag">${api.escapeHtml(conditionNames[item.condition] || "成色良好")}</span>
                        </div>
                        <h3>${api.escapeHtml(item.title)}</h3>
                        <p class="product-description">${api.escapeHtml(item.description || "卖家暂未填写商品描述")}</p>
                        <div class="product-meta">
                            <span>⌖ ${api.escapeHtml(item.location || "交易地点待沟通")}</span>
                            <span>${api.shortTime(item.createdAt)}</span>
                        </div>
                        <div class="product-footer">
                            <div class="product-price"><small>￥</small><strong>${api.money(item.price)}</strong></div>
                            <span class="seller-name">${api.escapeHtml(item.sellerName || "校园同学")}发布</span>
                        </div>
                    </div>
                </a>
            </article>`;
    }

    async function load() {
        const id = ++state.requestId;
        root.innerHTML = `<div class="loading-state"><span class="button-spinner"></span><p>正在寻找校园好物...</p></div>`;
        try {
            const data = await api.request(`/public/products${api.query({
                keyword: state.keyword,
                sort: state.sort,
                page: 1,
                size: 50
            })}`);
            if (id !== state.requestId) return;
            const items = (data.list || []).filter((item) => !state.category || item.category === state.category);
            document.querySelector("[data-product-count]").textContent = `共 ${items.length} 件`;
            document.querySelector("[data-today-count]").textContent = String(items.filter((item) => item.status === "on_sale").length).padStart(2, "0");
            root.innerHTML = items.length
                ? items.map(card).join("")
                : `<div class="empty-state"><span>⌕</span><h3>没有找到匹配的商品</h3><p>换个关键词或分类试试看。</p></div>`;
        } catch (error) {
            if (id !== state.requestId) return;
            root.innerHTML = `<div class="empty-state empty-state--error"><span>!</span><h3>商品暂时加载失败</h3><p>${api.escapeHtml(error.message)}</p><button type="button" data-retry>重新加载</button></div>`;
            const retry = root.querySelector("[data-retry]");
            if (retry) retry.addEventListener("click", load);
        }
    }

    let searchTimer = null;
    document.querySelector("[data-product-search]").addEventListener("input", (event) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.keyword = event.target.value.trim();
            load();
        }, 320);
    });

    document.querySelectorAll("[data-sort]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            document.querySelectorAll("[data-sort]").forEach((node) => node.classList.remove("sort-pill--active"));
            button.classList.add("sort-pill--active");
            state.sort = button.dataset.sort;
            load();
        });
    });

    document.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            document.querySelectorAll("[data-category]").forEach((node) => node.classList.remove("category-chip--active"));
            button.classList.add("category-chip--active");
            state.category = button.dataset.category;
            load();
        });
    });

    load();
})();
