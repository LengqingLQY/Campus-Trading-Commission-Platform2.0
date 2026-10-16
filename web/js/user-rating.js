(function () {
    "use strict";

    var api = window.CTCP;
    var R = window.CTCPRating;
    var root = document.querySelector("[data-user-rating-root]");
    if (!root) return;

    var userId = Number(new URLSearchParams(location.search).get("userId"));

    function avatarHtml(data) {
        if (data.avatarUrl) {
            return '<div class="profile-avatar-lg user" style="background-image:url(' +
                api.escapeHtml(data.avatarUrl) + ');background-size:cover;background-position:center;"></div>';
        }
        return '<div class="profile-avatar-lg user"><span class="avatar-letter">' +
            api.escapeHtml(api.initial(data.username || "同学")) + '</span></div>';
    }

    function render(data) {
        root.innerHTML =
            '<div class="profile-card">' +
            '  <div class="section-heading"><span class="section-heading__number"></span><div><h2>公开信誉</h2><p>仅展示昵称、头像与评分，不含账号和联系方式。</p></div></div>' +
            '  <div class="profile-avatar-row">' +
            '    <div class="profile-avatar-wrapper">' + avatarHtml(data) + '</div>' +
            '    <div><span class="profile-name">' + api.escapeHtml(data.username || "校园同学") + '</span></div>' +
            '  </div>' +
            '  <div class="user-rating-summary">' +
            '    <div class="user-rating-column"><h3>买方／需求方信誉</h3>' + R.ratingBadge(data.buyer, "buyer") + '</div>' +
            '    <div class="user-rating-column"><h3>卖方／服务方信誉</h3>' + R.ratingBadge(data.seller, "seller") + '</div>' +
            '  </div>' +
            '</div>' +
            '<div class="profile-actions" style="margin-top:16px;">' +
            '  <a class="secondary-action" href="' + api.pageUrl("main.jsp") + '">返回发现首页</a>' +
            '</div>';
    }

    async function load() {
        if (!Number.isInteger(userId) || userId < 1) {
            root.innerHTML = '<div class="empty-state empty-state--error"><h3>用户编号无效</h3><a href="' + api.pageUrl("main.jsp") + '">返回首页</a></div>';
            return;
        }
        root.innerHTML = '<div class="loading-state"><span class="button-spinner"></span><p>正在加载用户评分...</p></div>';
        try {
            var data = await R.fetchUserRating(userId);
            render(data);
        } catch (error) {
            root.innerHTML = '<div class="empty-state empty-state--error"><span>!</span><h3>加载失败</h3><p>' + api.escapeHtml(error.message) + '</p><a href="' + api.pageUrl("main.jsp") + '">返回首页</a></div>';
        }
    }

    load();
})();
