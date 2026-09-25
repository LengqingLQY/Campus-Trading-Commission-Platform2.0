(function () {
    "use strict";

    var api = window.CTCP;
    var root = document.querySelector("[data-task-detail]");
    if (!root) return;

    var searchParams = new URLSearchParams(location.search);
    var taskId = Number(searchParams.get("taskId"));

    var statusNames = {
        open: "待接取",
        accepted: "已接取",
        delivered: "已送达",
        completed: "已完成"
    };
    var statusClass = {
        open: "availability-badge waiting",
        accepted: "availability-badge ongoing",
        delivered: "availability-badge ongoing",
        completed: "availability-badge done"
    };
    var task = null;
    var currentUser = null;
    var terminationComposerOpen = false;

    // ===== 图片渲染函数（平铺） =====
    function renderImages(imageUrls) {
        if (!imageUrls) return '';
        var urls = imageUrls.split(',').filter(function(u) { return u && u.trim(); });
        if (urls.length === 0) return '';
        var items = urls.map(function(url) {
            return '<div class="detail-image-item"><img src="' + api.escapeHtml(url.trim()) + '" alt="任务图片"></div>';
        }).join('');
        return '<div class="detail-image-grid">' + items + '</div>';
    }

    // ===== 来源返回 =====
    function resolveReturnContext() {
        var requested = searchParams.get("returnTo") || document.referrer || "";
        var fallbackUrl = api.pageUrl("task-hall.jsp");
        var url = api.safePageUrl(requested, "task-hall.jsp");
        var detailPath = new URL(api.pageUrl("task-detail.jsp")).pathname;
        if (new URL(url).pathname === detailPath) url = fallbackUrl;
        var pageName = new URL(url).pathname.split("/").pop();
        var labels = {
            "profile-user.jsp": "返回个人空间",
            "main.jsp": "返回发现首页",
            "task-hall.jsp": "返回任务列表",
            "task-publish.jsp": "返回发布页面"
        };
        return { url: url, label: labels[pageName] || "返回上一页" };
    }

    var returnContext = resolveReturnContext();
    var headerBackLink = document.querySelector("[data-detail-back]");
    if (headerBackLink) {
        headerBackLink.href = returnContext.url;
        headerBackLink.textContent = "← " + returnContext.label;
    }

    function returnLink() {
        return '<a class="secondary-action" data-detail-back href="' + api.escapeHtml(returnContext.url) + '">' + api.escapeHtml(returnContext.label) + '</a>';
    }

    // ===== 待处理终止申请 =====
    function pendingTermination() {
        if (!task || (task.status !== "accepted" && task.status !== "delivered")) return null;
        var req = task.terminationRequest;
        return req && (!req.status || req.status === "pending") ? req : null;
    }

    // ===== 删除 =====
    async function deleteTask() {
        var btn = root.querySelector("[data-action='delete-task']");
        var msg = task.status === "completed"
            ? "删除后任务发布信息会被隐藏；已完成的记录仍会保留。"
            : "删除后任务会从列表和个人空间中隐藏。";
        if (!confirm("确认删除“" + task.title + "”吗？\n" + msg)) return;
        api.setLoading(btn, true, "正在删除...");
        try {
            await api.request("/tasks/" + taskId, { method: "DELETE" });
            api.toast("任务已删除", "success");
            setTimeout(function() { location.replace(returnContext.url); }, 450);
        } catch (error) {
            api.toast(error.message || "删除失败", "error");
            api.setLoading(btn, false);
        }
    }

    // ===== 终止申请操作 =====
    function handleTerminationAction(event) {
        var action = event.currentTarget.dataset.terminationAction;
        if (action === "open") { terminationComposerOpen = true; render(); return; }
        if (action === "close") { terminationComposerOpen = false; render(); return; }
        if (action === "submit") submitTerminationRequest(event.currentTarget);
        else resolveTerminationRequest(action, event.currentTarget);
    }

    async function submitTerminationRequest(btn) {
        var input = root.querySelector("[data-termination-reason]");
        var fb = root.querySelector("[data-termination-feedback]");
        var reason = String(input ? input.value : "").trim();
        if (reason.length < 2 || reason.length > 200) {
            api.setFeedback(fb, "请填写 2～200 字的终止原因");
            if (input) input.focus();
            return;
        }
        api.setFeedback(fb, "");
        api.setLoading(btn, true, "正在提交...");
        try {
            await api.request("/tasks/" + taskId + "/termination-request", {
                method: "POST",
                body: { reason: reason }
            });
            terminationComposerOpen = false;
            api.toast("终止申请已发送", "success");
            await load();
        } catch (error) {
            api.setFeedback(fb, error.message || "提交失败");
            api.setLoading(btn, false);
        }
    }

    async function resolveTerminationRequest(action, btn) {
        var config = {
            approve: { method: "PUT", suffix: "/approve", confirm: "同意后任务将回到待接取状态，确认吗？", loading: "正在终止...", success: "已同意终止" },
            reject: { method: "PUT", suffix: "/reject", confirm: "确认拒绝终止申请？", loading: "正在处理...", success: "已拒绝" },
            withdraw: { method: "DELETE", suffix: "", confirm: "确认撤回终止申请？", loading: "正在撤回...", success: "已撤回" }
        }[action];
        if (!config || !confirm(config.confirm)) return;
        api.setLoading(btn, true, config.loading);
        try {
            await api.request("/tasks/" + taskId + "/termination-request" + config.suffix, { method: config.method });
            api.toast(config.success, "success");
            await load();
        } catch (error) {
            api.toast(error.message || "操作失败", "error");
            if (error.status === 409) await load();
            else api.setLoading(btn, false);
        }
    }

    // ===== 渲染 =====
    function render() {
        var statusText = statusNames[task.status] || task.status;
        var cls = statusClass[task.status] || "availability-badge";
        var isOwner = currentUser && Number(currentUser.id) === Number(task.publisherId);
        var isAccepter = currentUser && task.accepterId && Number(currentUser.id) === Number(task.accepterId);
        var isParticipant = isOwner || isAccepter;

        var actionBtn = "", deleteBtn = "", terminationArea = "", terminationEntry = "", footNote = "";
        var pending = pendingTermination();

        // 图片
        var imageHtml = renderImages(task.imageUrls);
        var mediaContent = imageHtml
            ? imageHtml
            : '<div class="detail-media detail-media--task">' +
                '<span class="detail-media__label">跑腿任务</span>' +
                '<span class="detail-media__emoji">📦</span>' +
                '<span class="detail-media__spark detail-media__spark--one">✦</span>' +
                '<span class="detail-media__spark detail-media__spark--two">✧</span>' +
                '<span class="detail-media__circle detail-media__circle--one"></span>' +
                '<span class="detail-media__circle detail-media__circle--two"></span>' +
              '</div>';

        if (isOwner && (task.status === "open" || task.status === "completed")) {
            deleteBtn = '<button class="secondary-action danger-action" type="button" data-action="delete-task">🗑️ 删除任务</button>';
        }

        if (pending) {
            var isReq = pending.requesterId === currentUser.id;
            var name = pending.requesterId === task.publisherId ? "发布者" : "接取者";
            terminationArea =
                '<section class="termination-request-banner termination-request-banner--' + (isReq ? "waiting" : "review") + '">' +
                    '<div class="termination-request-banner__head">' +
                        '<span>' + (isReq ? "⌛" : "!") + '</span>' +
                        '<div><strong>' + (isReq ? "终止申请已发出" : name + "申请终止") + '</strong>' +
                        '<small>' + (isReq ? "等待对方处理" : "同意后任务将回到待接取") + '</small></div>' +
                    '</div>' +
                    '<p class="termination-request-reason"><span>申请理由</span>' + api.escapeHtml(pending.reason || "未填写") + '</p>' +
                    '<div class="termination-request-actions">' +
                        (isReq
                            ? '<button class="secondary-action danger-action" data-termination-action="withdraw">撤回</button>'
                            : '<button class="primary-action termination-approve" data-termination-action="approve">同意终止 ✓</button>' +
                              '<button class="secondary-action" data-termination-action="reject">拒绝</button>') +
                    '</div>' +
                '</section>';
            footNote = "💡 待处理终止申请期间，送达和确认操作已暂停";
        } else if (task.status === "open" && currentUser && !isOwner) {
            actionBtn = '<button class="primary-action" data-action="accept">🤝 接取任务</button>';
        } else if (task.status === "accepted" && currentUser && !isOwner) {
            actionBtn = '<button class="primary-action" style="background:#faad14;" data-action="deliver">🚚 标记送达</button>';
        } else if (task.status === "delivered" && currentUser && isOwner) {
            actionBtn = '<button class="primary-action" style="background:#52c41a;" data-action="complete">✅ 确认完成</button>';
        } else if (task.status === "completed") {
            actionBtn = '<button class="primary-action" disabled style="background:#d9d9d9;color:#999;">✅ 已完成</button>';
        } else if (task.status === "open" && isOwner) {
            actionBtn = '<button class="primary-action" disabled style="background:#d9d9d9;color:#999;">⏳ 等待接取</button>';
            footNote = "💡 你发布了这个任务，等待其他同学接取";
        } else if (!currentUser) {
            var next = encodeURIComponent(api.currentPagePath() || "task-detail.jsp?taskId=" + taskId);
            actionBtn = '<a class="primary-action" href="' + api.pageUrl("index.jsp?next=" + next) + '">登录后接取 →</a>';
        } else {
            actionBtn = '<button class="primary-action" disabled style="background:#d9d9d9;color:#999;">当前状态不可操作</button>';
        }

        if ((task.status === "accepted" || task.status === "delivered") && isParticipant && !pending) {
            terminationEntry =
                '<div class="termination-entry">' +
                    '<button class="secondary-action danger-action" data-termination-action="open">申请终止</button>' +
                    '<p>提交申请后需对方同意才会生效。</p>' +
                '</div>';
        }

        var composer = terminationComposerOpen ?
            '<section class="termination-composer">' +
                '<div class="termination-composer__heading">' +
                    '<div><strong>申请终止</strong><small>需对方同意才会生效</small></div>' +
                    '<button data-termination-action="close">×</button>' +
                '</div>' +
                '<label>终止原因 <span>2～200 字</span></label>' +
                '<textarea data-termination-reason maxlength="200" placeholder="例如：时间无法协调"></textarea>' +
                '<p class="form-feedback" data-termination-feedback></p>' +
                '<div class="termination-composer__actions">' +
                    '<button class="secondary-action" data-termination-action="close">取消</button>' +
                    '<button class="primary-action" data-termination-action="submit">提交 →</button>' +
                '</div>' +
            '</section>' : "";

        root.innerHTML =
            '<div class="detail-media-column">' +
                mediaContent +
                '<div class="detail-note">' +
                    '<span class="detail-note__icon">☼</span>' +
                    '<p><strong>校园互助</strong><br><span>接取后请及时联系发布者</span></p>' +
                '</div>' +
            '</div>' +
            '<article class="detail-panel">' +
                '<div class="detail-status-row">' +
                    '<span class="detail-tag detail-tag--category">跑腿</span>' +
                    '<span class="' + cls + '">● ' + statusText + '</span>' +
                '</div>' +
                '<h2>' + api.escapeHtml(task.title) + '</h2>' +
                '<p class="detail-subtitle">发布者：' + api.escapeHtml(task.publisherName || "校园同学") + ' · ' + api.shortTime(task.createdAt) + '</p>' +
                '<div class="detail-price"><small>￥</small><strong>' + api.money(task.amount) + '</strong><span>跑腿费 · 仅作信息记录</span></div>' +
                '<div class="detail-divider"></div>' +
                '<dl class="detail-facts">' +
                    '<div><dt>📍 取件</dt><dd>' + api.escapeHtml(task.pickup || "待定") + '</dd></div>' +
                    '<div><dt>📍 送达</dt><dd>' + api.escapeHtml(task.delivery || "待定") + '</dd></div>' +
                    '<div><dt>⏰ 截止</dt><dd>' + (task.deadline ? api.shortTime(task.deadline) : "无") + '</dd></div>' +
                    '<div><dt>💰 金额</dt><dd style="color:#f5222d;">' + api.money(task.amount) + ' 元</dd></div>' +
                    '<div><dt>📞 联系方式</dt><dd>' + api.escapeHtml(task.contact || "未填写") + '</dd></div>' +
                '</dl>' +
                '<div class="detail-description">' +
                    '<h3>📝 任务说明</h3>' +
                    '<p>' + api.escapeHtml(task.description || "暂无") + '</p>' +
                '</div>' +
                terminationArea +
                '<div class="detail-actions">' +
                    actionBtn +
                    deleteBtn +
                    returnLink() +
                '</div>' +
                terminationEntry +
                composer +
                (footNote ? '<p class="detail-footnote">' + footNote + '</p>' : "") +
            '</article>';

        // 事件绑定
        ["accept", "deliver", "complete"].forEach(function(action) {
            var btn = root.querySelector("[data-action='" + action + "']");
            if (btn) {
                btn.addEventListener("click", function() {
                    if (action === "accept") accept();
                    else if (action === "deliver") deliver();
                    else if (action === "complete") complete();
                });
            }
        });
        var del = root.querySelector("[data-action='delete-task']");
        if (del) del.addEventListener("click", deleteTask);
        root.querySelectorAll("[data-termination-action]").forEach(function(b) {
            b.addEventListener("click", handleTerminationAction);
        });
    }

    // ===== 操作函数 =====
    async function accept() {
        var btn = root.querySelector("[data-action='accept']");
        if (!confirm("确认接取“" + task.title + "”吗？")) return;
        api.setLoading(btn, true, "正在接取...");
        try {
            await api.request("/tasks/" + taskId + "/accept", { method: "POST" });
            api.toast("接取成功！", "success");
            await load();
        } catch (e) { api.toast(e.message || "接取失败", "error"); api.setLoading(btn, false); }
    }

    async function deliver() {
        var btn = root.querySelector("[data-action='deliver']");
        if (!confirm("确认已送达“" + task.title + "”吗？")) return;
        api.setLoading(btn, true, "正在确认...");
        try {
            await api.request("/tasks/" + taskId + "/deliver", { method: "PUT" });
            api.toast("已标记送达！", "success");
            await load();
        } catch (e) { api.toast(e.message || "操作失败", "error"); api.setLoading(btn, false); }
    }

    async function complete() {
        var btn = root.querySelector("[data-action='complete']");
        if (!confirm("确认完成“" + task.title + "”吗？")) return;
        api.setLoading(btn, true, "正在确认...");
        try {
            await api.request("/tasks/" + taskId + "/complete", { method: "PUT" });
            api.toast("任务已完成！", "success");
            await load();
        } catch (e) { api.toast(e.message || "操作失败", "error"); api.setLoading(btn, false); }
    }

    async function load() {
        if (!Number.isInteger(taskId) || taskId < 1) {
            root.innerHTML = '<div class="empty-state"><h3>任务编号无效</h3>' + returnLink() + '</div>';
            return;
        }
        try {
            var results = await Promise.all([
                api.request("/public/tasks/" + taskId),
                api.currentUser().catch(function() { return null; })
            ]);
            task = results[0];
            currentUser = results[1];
            render();
        } catch (e) {
            root.innerHTML = '<div class="empty-state empty-state--error"><span>!</span><h3>加载失败</h3><p>' + api.escapeHtml(e.message) + '</p>' + returnLink() + '</div>';
        }
    }

    load();
})();