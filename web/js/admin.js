(function () {
    "use strict";

    var api = window.CTCP;
    var root = document.querySelector("[data-admin-root]");
    if (!root) return;

    var list = document.querySelector("[data-admin-list]");
    var state = { tab: "tasks", auditStatus: "pending", keyword: "", editingUserId: null };

    var auditNames = { pending: "待审核", approved: "已通过", rejected: "已驳回" };

    // ===== 权限门控：非管理员跳回首页 =====
    async function init() {
        var user;
        try {
            user = await api.currentUser();
        } catch (e) {
            location.replace("main.jsp");
            return;
        }
        if (!user || user.role !== "admin") {
            location.replace("main.jsp");
            return;
        }
        document.querySelector("[data-admin-avatar]").textContent = api.initial(user.username);
        document.querySelector("[data-admin-name]").textContent = user.username;

        bindTabs();
        bindAuditFilter();
        bindUserSearch();
        bindListDelegation();
        loadStats();
        loadList();
    }

    // ===== 统计 =====
    async function loadStats() {
        try {
            var s = await api.request("/admin/stats");
            setText("[data-stat-pending-tasks]", s.pendingTasks);
            setText("[data-stat-pending-products]", s.pendingProducts);
            setText("[data-stat-users]", s.userCount);
            setText("[data-stat-tasks]", s.totalTasks);
        } catch (e) {
            /* 统计失败不阻塞列表 */
        }
    }

    function setText(selector, value) {
        var el = document.querySelector(selector);
        if (el) el.textContent = value == null ? "0" : value;
    }

    // ===== Tab =====
    function bindTabs() {
        document.querySelectorAll("[data-admin-tab]").forEach(function (btn) {
            btn.addEventListener("click", function () {
                document.querySelectorAll("[data-admin-tab]").forEach(function (b) { b.classList.remove("sort-pill--active"); });
                btn.classList.add("sort-pill--active");
                state.tab = btn.dataset.adminTab;
                state.editingUserId = null;

                var filter = document.querySelector("[data-admin-audit-filter]");
                if (filter) filter.style.display = state.tab === "users" ? "none" : "";
                var search = document.querySelector("[data-admin-user-search]");
                if (search) search.style.display = state.tab === "users" ? "" : "none";

                loadList();
            });
        });
    }

    // ===== 审核状态筛选 =====
    function bindAuditFilter() {
        document.querySelectorAll("[data-audit-filter]").forEach(function (chip) {
            chip.addEventListener("click", function () {
                document.querySelectorAll("[data-audit-filter]").forEach(function (c) { c.classList.remove("category-chip--active"); });
                chip.classList.add("category-chip--active");
                state.auditStatus = chip.dataset.auditFilter || "";
                loadList();
            });
        });
    }

    // ===== 用户搜索 =====
    function bindUserSearch() {
        var input = document.querySelector("[data-admin-user-search-input]");
        if (!input) return;
        var timer = null;
        input.addEventListener("input", function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                state.keyword = input.value.trim();
                loadList();
            }, 320);
        });
        var btn = document.querySelector("[data-admin-user-search] .btn-search");
        if (btn) {
            btn.addEventListener("click", function () {
                state.keyword = input.value.trim();
                loadList();
            });
        }
    }

    // ===== 加载列表 =====
    async function loadList() {
        list.innerHTML = '<div class="loading-state"><span class="button-spinner"></span><p>加载中...</p></div>';
        try {
            if (state.tab === "users") {
                var u = await api.request("/admin/users" + api.query({ keyword: state.keyword, page: 1, size: 50 }));
                renderUsers(u.list || []);
            } else {
                var path = state.tab === "tasks" ? "/admin/tasks" : "/admin/products";
                var d = await api.request(path + api.query({ auditStatus: state.auditStatus, page: 1, size: 50 }));
                if (state.tab === "tasks") renderTasks(d.list || []);
                else renderProducts(d.list || []);
            }
        } catch (e) {
            list.innerHTML = '<div class="empty-state empty-state--error"><span>!</span><h3>加载失败</h3><p>' + api.escapeHtml(e.message) + '</p></div>';
        }
    }

    // ===== 渲染：任务 =====
    function renderTasks(items) {
        if (!items.length) {
            list.innerHTML = '<div class="empty-state"><span>📋</span><h3>没有匹配的任务</h3><p>换个状态筛选试试。</p></div>';
            return;
        }
        var html = '<div class="record-section-label">📋 任务审核</div>';
        items.forEach(function (item) {
            var tag = auditNames[item.auditStatus] || item.auditStatus;
            var cls = item.auditStatus === "pending" ? "pending" : (item.auditStatus === "approved" ? "done" : "");
            var remark = (item.auditStatus === "rejected" && item.auditRemark) ? ' · 驳回理由：' + api.escapeHtml(item.auditRemark) : '';
            var actions = item.auditStatus === "pending"
                ? '<button class="btn-sm btn-approve" data-approve-task="' + item.id + '">✅ 通过</button>' +
                  '<button class="btn-sm btn-reject" data-reject-task="' + item.id + '">❌ 驳回</button>'
                : '<button class="btn-sm btn-reject" data-delete-task="' + item.id + '">🗑 删除</button>';
            html += '<div class="admin-item">' +
                '<div class="admin-info">' +
                    '<span class="admin-title">' + api.escapeHtml(item.title) + '</span>' +
                    '<span class="status-tag ' + cls + '" style="margin-left:6px;">' + api.escapeHtml(tag) + '</span>' +
                    '<p class="admin-meta">发布者：' + api.escapeHtml(item.publisherName || "校园同学") + ' · 金额：' + api.money(item.amount) + ' 元' + remark + '</p>' +
                '</div>' +
                '<div class="admin-actions">' + actions + '</div>' +
            '</div>';
        });
        list.innerHTML = html;
    }

    // ===== 渲染：商品 =====
    function renderProducts(items) {
        if (!items.length) {
            list.innerHTML = '<div class="empty-state"><span>🛒</span><h3>没有匹配的商品</h3><p>换个状态筛选试试。</p></div>';
            return;
        }
        var html = '<div class="record-section-label">🛒 商品审核</div>';
        items.forEach(function (item) {
            var tag = auditNames[item.auditStatus] || item.auditStatus;
            var cls = item.auditStatus === "pending" ? "pending" : (item.auditStatus === "approved" ? "done" : "");
            var remark = (item.auditStatus === "rejected" && item.auditRemark) ? ' · 驳回理由：' + api.escapeHtml(item.auditRemark) : '';
            var actions = item.auditStatus === "pending"
                ? '<button class="btn-sm btn-approve" data-approve-product="' + item.id + '">✅ 通过</button>' +
                  '<button class="btn-sm btn-reject" data-reject-product="' + item.id + '">❌ 驳回</button>'
                : '<button class="btn-sm btn-reject" data-delete-product="' + item.id + '">🗑 删除</button>';
            html += '<div class="admin-item">' +
                '<div class="admin-info">' +
                    '<span class="admin-title">' + api.escapeHtml(item.title) + '</span>' +
                    '<span class="status-tag ' + cls + '" style="margin-left:6px;">' + api.escapeHtml(tag) + '</span>' +
                    '<p class="admin-meta">卖家：' + api.escapeHtml(item.sellerName || "校园同学") + ' · 价格：' + api.money(item.price) + ' 元' + remark + '</p>' +
                '</div>' +
                '<div class="admin-actions">' + actions + '</div>' +
            '</div>';
        });
        list.innerHTML = html;
    }

    // ===== 渲染：用户 =====
    function renderUsers(items) {
        if (!items.length) {
            list.innerHTML = '<div class="empty-state"><span>👥</span><h3>没有匹配的用户</h3><p>换个关键词试试。</p></div>';
            return;
        }
        var html = '<div class="record-section-label">👥 用户管理</div>';
        items.forEach(function (item) {
            if (state.editingUserId === item.id) {
                html += renderUserEdit(item);
                return;
            }
            var isAdmin = item.role === "admin";
            html += '<div class="admin-item">' +
                '<div class="admin-info">' +
                    '<span class="admin-title">' + api.escapeHtml(item.username) + '</span>' +
                    '<span class="status-tag" style="margin-left:6px;">' + (isAdmin ? "管理员" : "普通用户") + '</span>' +
                    '<p class="admin-meta">账号：' + api.escapeHtml(item.account) + ' · QQ：' + api.escapeHtml(item.qq || "—") + ' · 微信：' + api.escapeHtml(item.wechat || "—") + ' · 电话：' + api.escapeHtml(item.phone || "—") + '</p>' +
                '</div>' +
                '<div class="admin-actions">' +
                    '<button class="btn-sm btn-edit" data-edit-user="' + item.id + '">✏️ 编辑</button>' +
                    '<button class="btn-sm btn-reset" data-reset-user="' + item.id + '">🔒 重置密码</button>' +
                '</div>' +
            '</div>';
        });
        list.innerHTML = html;
    }

    function renderUserEdit(item) {
        return '<div class="admin-item">' +
            '<div class="admin-info" style="flex:1;">' +
                '<div class="publish-form-grid" style="margin:0;">' +
                    '<div class="form-field"><label>昵称</label><input type="text" data-edit-username value="' + api.escapeHtml(item.username || "") + '"></div>' +
                    '<div class="form-field"><label>QQ</label><input type="text" data-edit-qq value="' + api.escapeHtml(item.qq || "") + '"></div>' +
                    '<div class="form-field"><label>微信</label><input type="text" data-edit-wechat value="' + api.escapeHtml(item.wechat || "") + '"></div>' +
                    '<div class="form-field"><label>电话</label><input type="text" data-edit-phone value="' + api.escapeHtml(item.phone || "") + '"></div>' +
                '</div>' +
            '</div>' +
            '<div class="admin-actions">' +
                '<button class="btn-sm btn-approve" data-save-user="' + item.id + '">💾 保存</button>' +
                '<button class="btn-sm" data-cancel-user>取消</button>' +
            '</div>' +
        '</div>';
    }

    // ===== 事件委托 =====
    function bindListDelegation() {
        list.addEventListener("click", function (e) {
            var btn = e.target.closest("button[data-approve-task], button[data-reject-task], button[data-delete-task], " +
                "button[data-approve-product], button[data-reject-product], button[data-delete-product], " +
                "button[data-edit-user], button[data-save-user], button[data-cancel-user], button[data-reset-user]");
            if (!btn) return;

            if (btn.dataset.approveTask || btn.dataset.approveProduct) {
                audit(btn.dataset.approveTask ? "task" : "product", Number(btn.dataset.approveTask || btn.dataset.approveProduct), true);
            } else if (btn.dataset.rejectTask || btn.dataset.rejectProduct) {
                audit(btn.dataset.rejectTask ? "task" : "product", Number(btn.dataset.rejectTask || btn.dataset.rejectProduct), false);
            } else if (btn.dataset.deleteTask || btn.dataset.deleteProduct) {
                remove(btn.dataset.deleteTask ? "task" : "product", Number(btn.dataset.deleteTask || btn.dataset.deleteProduct));
            } else if (btn.dataset.editUser) {
                state.editingUserId = Number(btn.dataset.editUser);
                loadList();
            } else if (btn.dataset.cancelUser !== undefined && btn.hasAttribute("data-cancel-user")) {
                state.editingUserId = null;
                loadList();
            } else if (btn.dataset.saveUser) {
                saveUser(Number(btn.dataset.saveUser));
            } else if (btn.dataset.resetUser) {
                resetPassword(Number(btn.dataset.resetUser));
            }
        });
    }

    function typePath(type, id) {
        return (type === "task" ? "/admin/tasks/" : "/admin/products/") + id;
    }

    async function audit(type, id, approve) {
        var remark = "";
        if (!approve) {
            remark = prompt("请输入驳回理由（2～200 字）：");
            if (remark == null) return;
            remark = remark.trim();
            if (remark.length < 2 || remark.length > 200) {
                api.toast("驳回理由需为 2～200 字", "error");
                return;
            }
        }
        try {
            await api.request(typePath(type, id) + "/audit", { method: "PUT", body: { approve: approve, remark: remark } });
            api.toast(approve ? "已通过" : "已驳回", "success");
            loadList();
            loadStats();
        } catch (e) {
            api.toast(e.message || "操作失败", "error");
        }
    }

    async function remove(type, id) {
        if (!confirm("确认删除？删除后内容会被隐藏。")) return;
        try {
            await api.request(typePath(type, id), { method: "DELETE" });
            api.toast("已删除", "success");
            loadList();
            loadStats();
        } catch (e) {
            api.toast(e.message || "删除失败", "error");
        }
    }

    async function saveUser(id) {
        var username = list.querySelector("[data-edit-username]").value.trim();
        if (!username) {
            api.toast("昵称不能为空", "error");
            return;
        }
        try {
            await api.request("/admin/users/" + id, {
                method: "PUT",
                body: {
                    username: username,
                    qq: list.querySelector("[data-edit-qq]").value.trim(),
                    wechat: list.querySelector("[data-edit-wechat]").value.trim(),
                    phone: list.querySelector("[data-edit-phone]").value.trim()
                }
            });
            api.toast("已保存", "success");
            state.editingUserId = null;
            loadList();
        } catch (e) {
            api.toast(e.message || "保存失败", "error");
        }
    }

    async function resetPassword(id) {
        if (!confirm("确认重置该用户密码？")) return;
        var pwd = prompt("请输入新密码（至少 6 位）：");
        if (pwd == null) return;
        if (pwd.length < 6) {
            api.toast("密码至少 6 位", "error");
            return;
        }
        try {
            await api.request("/admin/users/" + id + "/reset-password", { method: "PUT", body: { password: pwd } });
            api.toast("密码已重置", "success");
        } catch (e) {
            api.toast(e.message || "重置失败", "error");
        }
    }

    init();
})();
