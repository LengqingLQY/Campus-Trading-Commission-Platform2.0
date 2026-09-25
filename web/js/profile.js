(function () {
    "use strict";

    var api = window.CTCP;
    var root = document.querySelector("[data-profile-root]");
    if (!root) return;

    var statusNames = {
        open: "待接取",
        accepted: "已接取",
        delivered: "已送达",
        completed: "已完成",
        on_sale: "在售",
        sold: "已售出"
    };
    var statusClass = {
        open: "",
        accepted: "",
        delivered: "",
        completed: "done",
        on_sale: "",
        sold: "done"
    };
    var auditNames = { pending: "待审核", approved: "已通过", rejected: "已驳回" };
    var recordTabs = new Set(["published-tasks", "published-products", "accepted", "bought"]);
    var requestedTab = new URLSearchParams(location.search).get("recordTab");
    var currentTab = recordTabs.has(requestedTab) ? requestedTab : "published-tasks";
    var userData = null;

    function profileReturnPath(type) {
        return "profile-user.jsp?recordTab=" + encodeURIComponent(type) + "#profile-records";
    }

    // 发布记录信息区：approved 链详情并显示业务状态；pending/rejected 显示审核状态且不可点击（详情对未审核内容 404）。
    function publishedInfo(item, type, kind) {
        var detail = kind === "task" ? "task-detail.jsp?taskId=" + item.id : "product-detail.jsp?productId=" + item.id;
        var amountText = kind === "task" ? "金额" : "价格";
        var amountVal = kind === "task" ? item.amount : item.price;
        var audit = item.auditStatus;
        var approved = !audit || audit === "approved";

        if (approved) {
            var st = statusNames[item.status] || item.status;
            var cls = statusClass[item.status] || "";
            return '<a class="record-info" href="' + api.pageUrlWithReturn(detail, profileReturnPath(type)) + '" style="flex:1;text-decoration:none;color:inherit;">' +
                '<span class="record-title">' + api.escapeHtml(item.title) + '</span>' +
                '<span class="status-tag ' + cls + '">' + api.escapeHtml(st) + '</span>' +
                '<p class="record-meta">' + amountText + '：' + api.money(amountVal) + ' 元</p>' +
            '</a>';
        }

        var auditText = auditNames[audit] || "待审核";
        var remark = (audit === "rejected" && item.auditRemark) ? ' · 驳回理由：' + api.escapeHtml(item.auditRemark) : '';
        return '<div class="record-info" style="flex:1;">' +
            '<span class="record-title">' + api.escapeHtml(item.title) + '</span>' +
            '<span class="status-tag pending">' + api.escapeHtml(auditText) + '</span>' +
            '<p class="record-meta">' + amountText + '：' + api.money(amountVal) + ' 元' + remark + '</p>' +
        '</div>';
    }

    // ===== 加载用户资料 =====
    async function loadProfile() {
        try {
            userData = await api.requireUser();
            var initialLetter = api.initial(userData.username);
            document.querySelector("[data-profile-avatar]").textContent = initialLetter;
            document.querySelector("[data-profile-name]").textContent = userData.username + "的空间";

            var avatarContainer = document.querySelector("[data-profile-avatar-lg]");
            if (avatarContainer) {
                if (userData.avatarUrl) {
                    avatarContainer.style.backgroundImage = "url(" + api.escapeHtml(userData.avatarUrl) + ")";
                    avatarContainer.style.backgroundSize = "cover";
                    avatarContainer.style.backgroundPosition = "center";
                    var letterEl = avatarContainer.querySelector("[data-avatar-letter]");
                    if (letterEl) letterEl.style.display = "none";
                } else {
                    avatarContainer.style.backgroundImage = "";
                    var letterEl2 = avatarContainer.querySelector("[data-avatar-letter]");
                    if (letterEl2) {
                        letterEl2.style.display = "";
                        letterEl2.textContent = initialLetter;
                    }
                }
            }

            document.querySelector("[data-profile-username]").textContent = userData.username;
            document.querySelector("[data-profile-qq]").textContent = userData.qq || "—";
            document.querySelector("[data-profile-wechat]").textContent = userData.wechat || "—";
            document.querySelector("[data-profile-phone]").textContent = userData.phone || "—";
            document.querySelector("[data-profile-input-username]").value = userData.username || "";
            document.querySelector("[data-profile-input-qq]").value = userData.qq || "";
            document.querySelector("[data-profile-input-wechat]").value = userData.wechat || "";
            document.querySelector("[data-profile-input-phone]").value = userData.phone || "";
            return userData;
        } catch (error) {
            if (error.status !== 401) {
                api.toast("加载个人资料失败：" + error.message, "error");
            }
            throw error;
        }
    }

    // ===== 保存个人资料 =====
    async function saveProfile(event) {
        event.preventDefault();
        var feedback = document.querySelector("[data-profile-feedback]");
        api.setFeedback(feedback, "");

        var formData = new FormData(event.target);
        var body = {};
        var username = String(formData.get("username") || "").trim();
        if (username) body.username = username;
        var qq = String(formData.get("qq") || "").trim();
        if (qq !== undefined) body.qq = qq;
        var wechat = String(formData.get("wechat") || "").trim();
        if (wechat !== undefined) body.wechat = wechat;
        var phone = String(formData.get("phone") || "").trim();
        if (phone !== undefined) body.phone = phone;

        var oldPassword = String(formData.get("oldPassword") || "").trim();
        var newPassword = String(formData.get("newPassword") || "").trim();
        if (oldPassword && newPassword) {
            if (newPassword.length < 6) {
                api.setFeedback(feedback, "新密码至少 6 位");
                return;
            }
            body.oldPassword = oldPassword;
            body.newPassword = newPassword;
        } else if (oldPassword || newPassword) {
            api.setFeedback(feedback, "修改密码需同时填写旧密码和新密码");
            return;
        }

        var button = event.target.querySelector("button[type='submit']");
        api.setLoading(button, true, "正在保存...");
        try {
            await api.request("/users/me", { method: "PUT", body: body });
            api.toast("资料已更新", "success");
            api.resetCurrentUser();
            await loadProfile();
        } catch (error) {
            api.setFeedback(feedback, error.message || "保存失败，请稍后重试");
        } finally {
            api.setLoading(button, false);
        }
    }

    // ===== 头像上传 =====
    function initAvatarUpload() {
        var avatarContainer = document.querySelector("[data-profile-avatar-lg]");
        var fileInput = document.querySelector("#avatarInput");
        if (!avatarContainer || !fileInput) return;

        // 点击头像触发上传（但点击「恢复默认」时不上传）
        avatarContainer.addEventListener("click", function(e) {
            if (e.target.closest("[data-action='reset-avatar']")) return;
            fileInput.click();
        });

        fileInput.addEventListener("change", function() {
            var file = this.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                alert("图片不能超过 5MB");
                this.value = "";
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                // 先本地预览
                avatarContainer.style.backgroundImage = "url(" + e.target.result + ")";
                avatarContainer.style.backgroundSize = "cover";
                avatarContainer.style.backgroundPosition = "center";
                var letterEl = avatarContainer.querySelector("[data-avatar-letter]");
                if (letterEl) letterEl.style.display = "none";

                // 真实头像上传接口
                var fd = new FormData();
                fd.append("avatar", file);
                fetch("http://localhost:8081/api/users/me/avatar", {
                    method: "POST",
                    body: fd,
                    credentials: "include"
                })
                .then(function(response) { return response.json(); })
                .then(function(result) {
                    if (result.code === 0) {
                        api.toast("头像已更新", "success");
                        api.resetCurrentUser();
                        loadProfile();
                    } else {
                        throw new Error(result.msg || "上传失败");
                    }
                })
                .catch(function(error) {
                    alert("头像上传失败：" + error.message);
                    loadProfile();
                });
            };
            reader.readAsDataURL(file);
        });

        // ===== 恢复默认头像 =====
        var resetBtn = avatarContainer.querySelector("[data-action='reset-avatar']");
        if (resetBtn) {
            resetBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                if (!confirm("确认恢复默认头像吗？")) return;

                // 清除背景图，显示字母
                avatarContainer.style.backgroundImage = "";
                var letterEl = avatarContainer.querySelector("[data-avatar-letter]");
                if (letterEl) {
                    letterEl.style.display = "";
                    letterEl.textContent = api.initial(userData ? userData.username : "同");
                }

                // 调用后端清空 avatarUrl
                api.request("/users/me", {
                    method: "PUT",
                    body: { avatarUrl: "" }
                })
                .then(function() {
                    api.toast("已恢复默认头像", "success");
                    api.resetCurrentUser();
                    loadProfile();
                })
                .catch(function(error) {
                    api.toast("操作失败：" + error.message, "error");
                    loadProfile();
                });
            });
        }
    }

    // ===== 删除函数 =====
    async function deleteTaskFromProfile(taskId, element) {
        if (!confirm("确认删除这个任务吗？\n删除后任务会从列表和个人空间中隐藏。")) return;
        try {
            await api.request("/tasks/" + taskId, { method: "DELETE" });
            api.toast("任务已删除", "success");
            element.remove();
        } catch (error) {
            api.toast(error.message || "删除失败，请稍后重试", "error");
        }
    }

    async function deleteProductFromProfile(productId, element) {
        if (!confirm("确认删除这个商品吗？\n删除后商品会从列表和个人空间中隐藏。")) return;
        try {
            await api.request("/products/" + productId, { method: "DELETE" });
            api.toast("商品已删除", "success");
            element.remove();
        } catch (error) {
            api.toast(error.message || "删除失败，请稍后重试", "error");
        }
    }

    // ===== 绑定删除事件 =====
    function bindDeleteEvents() {
        document.querySelectorAll("[data-delete-task]").forEach(function(btn) {
            btn.removeEventListener("click", handleTaskDelete);
            btn.addEventListener("click", handleTaskDelete);
        });
        document.querySelectorAll("[data-delete-product]").forEach(function(btn) {
            btn.removeEventListener("click", handleProductDelete);
            btn.addEventListener("click", handleProductDelete);
        });
    }

    function handleTaskDelete(event) {
        var btn = event.currentTarget;
        var taskId = Number(btn.dataset.deleteTask);
        var record = btn.closest(".record-item");
        if (record) deleteTaskFromProfile(taskId, record);
    }

    function handleProductDelete(event) {
        var btn = event.currentTarget;
        var productId = Number(btn.dataset.deleteProduct);
        var record = btn.closest(".record-item");
        if (record) deleteProductFromProfile(productId, record);
    }

    // ===== 渲染记录列表 =====
    function renderRecords(data, type) {
        var list = document.querySelector("[data-record-list]");
        var items = data.list || [];

        if (!items.length) {
            var labels = {
                "published-tasks": "你还没有发布过任何任务",
                "published-products": "你还没有发布过任何商品",
                "accepted": "你还没有接取任何任务",
                "bought": "你还没有购买任何商品"
            };
            list.innerHTML = '<div class="empty-state"><span>📭</span><h3>' + (labels[type] || "暂无记录") + '</h3></div>';
            return;
        }

        var html = "";

        if (type === "published-tasks") {
            html = '<div class="record-section-label">📌 我发布的任务</div>';
            items.forEach(function(item) {
                var canDelete = item.status === "open" || item.status === "completed";
                var deleteBtn = canDelete
                    ? '<button class="btn-sm btn-danger" data-delete-task="' + item.id + '" style="padding:2px 10px;font-size:11px;border:none;border-radius:6px;background:#ff4d4f;color:#fff;cursor:pointer;">删除</button>'
                    : '<span class="status-tag" style="background:#f5f5f5;color:#999;font-size:10px;">不可删除</span>';
                html +=
                    '<div class="record-item" data-task-id="' + item.id + '">' +
                        publishedInfo(item, type, "task") +
                        '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">' +
                            '<span class="record-date">' + api.shortTime(item.createdAt) + '</span>' +
                            deleteBtn +
                        '</div>' +
                    '</div>';
            });
        } else if (type === "published-products") {
            html = '<div class="record-section-label">📌 我上架的商品</div>';
            items.forEach(function(item) {
                var canDelete = item.status === "on_sale" || item.status === "completed";
                var deleteBtn = canDelete
                    ? '<button class="btn-sm btn-danger" data-delete-product="' + item.id + '" style="padding:2px 10px;font-size:11px;border:none;border-radius:6px;background:#ff4d4f;color:#fff;cursor:pointer;">删除</button>'
                    : '<span class="status-tag" style="background:#f5f5f5;color:#999;font-size:10px;">不可删除</span>';
                html +=
                    '<div class="record-item" data-product-id="' + item.id + '">' +
                        publishedInfo(item, type, "product") +
                        '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">' +
                            '<span class="record-date">' + api.shortTime(item.createdAt) + '</span>' +
                            deleteBtn +
                        '</div>' +
                    '</div>';
            });
        } else if (type === "accepted") {
            html = '<div class="record-section-label">📌 我接取的任务</div>';
            items.forEach(function(item) {
                var st = statusNames[item.status] || item.status;
                var cls = statusClass[item.status] || "";
                html +=
                    '<a class="record-item" href="' + api.pageUrlWithReturn("task-detail.jsp?taskId=" + item.id, profileReturnPath(type)) + '">' +
                        '<div class="record-info">' +
                            '<span class="record-title">' + api.escapeHtml(item.title) + '</span>' +
                            '<span class="status-tag ' + cls + '">' + api.escapeHtml(st) + '</span>' +
                            '<p class="record-meta">发布者：' + api.escapeHtml(item.publisherName || "校园同学") + ' · 金额：' + api.money(item.amount) + ' 元</p>' +
                        '</div>' +
                        '<span class="record-date">' + api.shortTime(item.createdAt) + '</span>' +
                    '</a>';
            });
        } else if (type === "bought") {
            html = '<div class="record-section-label">📌 我购买的商品</div>';
            items.forEach(function(item) {
                var st = statusNames[item.status] || item.status;
                var cls = statusClass[item.status] || "";
                html +=
                    '<a class="record-item" href="' + api.pageUrlWithReturn("product-detail.jsp?productId=" + item.id, profileReturnPath(type)) + '">' +
                        '<div class="record-info">' +
                            '<span class="record-title">' + api.escapeHtml(item.title) + '</span>' +
                            '<span class="status-tag ' + cls + '">' + api.escapeHtml(st) + '</span>' +
                            '<p class="record-meta">卖家：' + api.escapeHtml(item.sellerName || "校园同学") + ' · 价格：' + api.money(item.price) + ' 元</p>' +
                        '</div>' +
                        '<span class="record-date">' + api.shortTime(item.createdAt) + '</span>' +
                    '</a>';
            });
        }

        list.innerHTML = html || '<div class="empty-state"><span>📭</span><h3>暂无记录</h3></div>';
        bindDeleteEvents();
    }

    // ===== 加载记录 =====
    async function loadRecords(type) {
        var list = document.querySelector("[data-record-list]");
        list.innerHTML = '<div class="loading-state"><span class="button-spinner"></span><p>正在加载记录...</p></div>';

        try {
            var data;
            if (type === "published-tasks" || type === "accepted") {
                var param = type === "published-tasks" ? "published" : "accepted";
                data = await api.request("/me/tasks" + api.query({ type: param, page: 1, size: 50 }));
            } else {
                var param = type === "published-products" ? "published" : "bought";
                data = await api.request("/me/products" + api.query({ type: param, page: 1, size: 50 }));
            }
            renderRecords(data, type);
        } catch (error) {
            list.innerHTML = '<div class="empty-state empty-state--error"><span>!</span><h3>加载失败</h3><p>' + api.escapeHtml(error.message) + '</p></div>';
        }
    }

    // ===== Tab 切换 =====
    function initTabs() {
        document.querySelectorAll("[data-record-tab]").forEach(function(button) {
            button.classList.toggle("sort-pill--active", button.dataset.recordTab === currentTab);
            button.addEventListener("click", function() {
                document.querySelectorAll("[data-record-tab]").forEach(function(b) { b.classList.remove("sort-pill--active"); });
                this.classList.add("sort-pill--active");
                currentTab = this.dataset.recordTab;
                var nextUrl = new URL(location.href);
                nextUrl.searchParams.set("recordTab", currentTab);
                history.replaceState(null, "", nextUrl);
                loadRecords(currentTab);
            });
        });
    }

    // ===== 初始化 =====
    async function init() {
        try {
            await loadProfile();
            document.querySelector("[data-profile-loading]").style.display = "none";
            document.querySelector("[data-profile-content]").style.display = "block";

            var form = document.querySelector("[data-profile-form]");
            if (form) form.addEventListener("submit", saveProfile);

            initTabs();
            loadRecords(currentTab);

            // 头像上传 + 恢复默认
            initAvatarUpload();
        } catch (error) {
            if (error.status === 401) {
                return;
            }
            document.querySelector("[data-profile-loading]").innerHTML =
                '<div class="empty-state empty-state--error"><span>!</span><h3>加载失败</h3><p>' + api.escapeHtml(error.message) + '</p></div>';
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();