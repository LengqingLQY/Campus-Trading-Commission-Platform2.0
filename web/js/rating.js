/**
 * 交易双方评价 —— 公共组件
 * 提供：只读星星、评分徽章、星级选择器（带文字标签的单选按钮，支持键盘）、
 *       用户公开评分链接、拉取用户公开评分。
 * 依赖：window.CTCP（api.js）
 */
(function (global) {
    "use strict";

    const api = global.CTCP;
    const STAR_LABELS = ["很差", "较差", "一般", "满意", "非常满意"];
    const TOTAL = 5;

    // 角色中文：后端返回 buyer/seller，界面显示“买方／需求方”“卖方／服务方”
    function roleLabel(role) {
        if (role === "buyer") return "买方／需求方";
        if (role === "seller") return "卖方／服务方";
        return "";
    }

    // 只读星星（支持 1 位小数显示，渲染按四舍五入取整）
    function starsHtml(stars) {
        const filled = Math.max(0, Math.min(TOTAL, Number(stars) || 0));
        let html = "";
        for (let i = 1; i <= TOTAL; i++) {
            html += `<span class="rating-star ${i <= Math.round(filled) ? "is-filled" : ""}" aria-hidden="true">★</span>`;
        }
        return html;
    }

    // 评分徽章：rating = { average, count } 任一可为 null/0
    // role 可选："buyer" | "seller"，用于“暂无评价”文案
    function ratingBadge(rating, role) {
        if (!rating || rating.count == null || rating.count === 0) {
            const label = roleLabel(role);
            return `<span class="rating-badge rating-badge--empty">` +
                `<span class="rating-stars">${starsHtml(0)}</span>` +
                `<span class="rating-text">${label ? label + " " : ""}暂无评价</span>` +
                `</span>`;
        }
        const avg = Number(rating.average).toFixed(1);
        return `<span class="rating-badge" title="${api.escapeHtml(avg)} 分（${rating.count} 人评价）">` +
            `<span class="rating-stars">${starsHtml(rating.average)}</span>` +
            `<span class="rating-score">${api.escapeHtml(avg)}</span>` +
            `<span class="rating-text">（${rating.count} 人评价）</span>` +
            `</span>`;
    }

    // 姓名 + 链接到公开评分页
    function userRatingLink(userId, nameHtml, opts) {
        opts = opts || {};
        const cls = opts.className ? " " + opts.className : "";
        return `<a class="user-rating-link${cls}" href="${api.pageUrl("user-rating.jsp?userId=" + encodeURIComponent(userId))}">${nameHtml}</a>`;
    }

    // 挂载星级选择器：container 为 DOM 节点
    // options: { value, disabled, onSelect }
    // 返回 { getSelected() } 便于提交时读取
    function mountStarSelector(container, options) {
        const value = options && options.value;
        const disabled = !!(options && options.disabled);
        container.classList.add("rating-selector");
        if (disabled) container.classList.add("is-disabled");
        container.setAttribute("role", "radiogroup");
        container.setAttribute("aria-label", "评分星级");
        container.innerHTML = STAR_LABELS.map((label, idx) => {
            const star = idx + 1;
            const checked = value === star ? "checked" : "";
            return `<label class="rating-option">` +
                `<input type="radio" name="rating-stars" value="${star}" ${checked} ${disabled ? "disabled" : ""}>` +
                `<span class="rating-option__star" aria-hidden="true">★</span>` +
                `<span class="rating-option__label">${api.escapeHtml(label)}</span>` +
                `</label>`;
        }).join("");

        if (!disabled && options && typeof options.onSelect === "function") {
            container.querySelectorAll('input[type="radio"]').forEach((input) => {
                input.addEventListener("change", () => {
                    options.onSelect(Number(input.value));
                });
            });
        }
        return {
            getSelected() {
                const checked = container.querySelector('input[type="radio"]:checked');
                return checked ? Number(checked.value) : null;
            }
        };
    }

    // 拉取用户公开评分：GET /api/public/users/{id}/rating
    // 返回 { userId, username, avatarUrl, buyer:{average,count}, seller:{average,count} }
    function fetchUserRating(userId) {
        return api.request(`/public/users/${userId}/rating`);
    }

    global.CTCPRating = {
        STAR_LABELS,
        TOTAL,
        roleLabel,
        starsHtml,
        ratingBadge,
        userRatingLink,
        mountStarSelector,
        fetchUserRating
    };
})(window);
