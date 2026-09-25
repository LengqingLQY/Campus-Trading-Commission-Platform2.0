(function () {
    "use strict";

    var api = window.CTCP;
    var root = document.querySelector("[data-task-grid]");
    if (!root) return;

    var statusNames = {
        open: "待接取",
        accepted: "已接取",
        delivered: "已送达",
        completed: "已完成"
    };
    var statusClass = {
        open: "",
        accepted: "",
        delivered: "",
        completed: "done"
    };
    var state = { keyword: "", sort: "time_desc", status: "", requestId: 0 };

    function getFirstImage(item) {
        if (item.imageUrls) {
            var urls = item.imageUrls.split(",");
            return urls[0] || null;
        }
        return null;
    }

    function card(item, index) {
        var statusText = statusNames[item.status] || item.status;
        var cls = statusClass[item.status] || "";
        var firstImage = getFirstImage(item);
        var visualContent = firstImage
            ? '<img src="' + api.escapeHtml(firstImage) + '" alt="任务图片" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">'
            : '<span class="product-emoji" aria-hidden="true">' + (index % 2 ? "🏃" : "📦") + '</span>';
        var visualClass = firstImage ? "product-visual product-visual--has-image" : "product-visual product-visual--" + ["mint", "sky", "peach", "lemon"][index % 4];

        return '<article class="product-card product-card--task">\n' +
            '    <a class="product-card__link" href="' + api.pageUrlWithReturn("task-detail.jsp?taskId=" + item.id) + '">\n' +
            '        <div class="' + visualClass + '" style="position:relative;overflow:hidden;">\n' +
            '            <span class="visual-label">跑腿任务</span>\n' +
            '            ' + visualContent + '\n' +
            '            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✦</span>\n' +
            '        </div>\n' +
            '        <div class="product-info">\n' +
            '            <div class="product-tags">\n' +
            '                <span class="category-tag">跑腿</span>\n' +
            '                <span class="condition-tag ' + cls + '">' + api.escapeHtml(statusText) + '</span>\n' +
            '            </div>\n' +
            '            <h3>' + api.escapeHtml(item.title) + '</h3>\n' +
            '            <p class="product-description">' + api.escapeHtml(item.description || "暂无任务说明") + '</p>\n' +
            '            <div class="product-meta">\n' +
            '                <span>⌖ ' + api.escapeHtml(item.pickup || "待定") + ' → ' + api.escapeHtml(item.delivery || "待定") + '</span>\n' +
            '                <span>' + (item.deadline ? "截止 " + api.shortTime(item.deadline) : "时间待定") + '</span>\n' +
            '            </div>\n' +
            '            <div class="product-footer">\n' +
            '                <div class="product-price"><small>￥</small><strong>' + api.money(item.amount) + '</strong></div>\n' +
            '                <span class="seller-name">' + api.escapeHtml(item.publisherName || "校园同学") + '发布</span>\n' +
            '            </div>\n' +
            '        </div>\n' +
            '    </a>\n' +
            '</article>';
    }

    async function load() {
        var id = ++state.requestId;
        root.innerHTML = '<div class="loading-state"><span class="button-spinner"></span><p>正在加载跑腿任务...</p></div>';
        try {
            var data = await api.request("/public/tasks" + api.query({
                keyword: state.keyword,
                sort: state.sort,
                page: 1,
                size: 50
            }));
            if (id !== state.requestId) return;
            var items = data.list || [];
            if (state.status) {
                items = items.filter(function(item) { return item.status === state.status; });
            }
            var total = items.length;
            var openCount = items.filter(function(item) { return item.status === "open"; }).length;
            document.querySelector("[data-task-count-label]").textContent = "共 " + total + " 件";
            document.querySelector("[data-task-count]").textContent = String(openCount).padStart(2, "0");
            root.innerHTML = items.length
                ? items.map(card).join("")
                : '<div class="empty-state"><span>⌕</span><h3>没有匹配的任务</h3><p>换个关键词或状态试试看。</p></div>';
        } catch (error) {
            if (id !== state.requestId) return;
            root.innerHTML = '<div class="empty-state empty-state--error"><span>!</span><h3>任务暂时加载失败</h3><p>' + api.escapeHtml(error.message) + '</p><button type="button" data-retry>重新加载</button></div>';
            var retry = root.querySelector("[data-retry]");
            if (retry) retry.addEventListener("click", load);
        }
    }

    var searchTimer = null;
    var searchInput = document.querySelector("[data-task-search]");
    if (searchInput) {
        searchInput.addEventListener("input", function() {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function() {
                state.keyword = this.value.trim();
                load();
            }.bind(this), 320);
        });
    }

    document.querySelectorAll("[data-sort]").forEach(function(button) {
        button.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelectorAll("[data-sort]").forEach(function(node) { node.classList.remove("sort-pill--active"); });
            this.classList.add("sort-pill--active");
            state.sort = this.dataset.sort;
            load();
        });
    });

    document.querySelectorAll("[data-status]").forEach(function(button) {
        button.addEventListener("click", function(event) {
            event.preventDefault();
            document.querySelectorAll("[data-status]").forEach(function(node) { node.classList.remove("category-chip--active"); });
            this.classList.add("category-chip--active");
            state.status = this.dataset.status;
            load();
        });
    });

    load();
})();