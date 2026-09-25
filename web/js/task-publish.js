(function () {
    "use strict";

    var api = window.CTCP;
    var form = document.querySelector("[data-task-publish]");
    if (!form) return;

    var button = form.querySelector("button[type='submit']");
    var feedback = form.querySelector("[data-feedback]");

    // ===== 图片上传管理器 =====
    var imageManager = new ImageUploadManager({
        container: "[data-task-upload-zone]",
        grid: "[data-task-images]",
        input: "#taskImageInput",
        countEl: "[data-image-count]",
        placeholderEl: "[data-upload-placeholder]",
        max: 3,
        name: "imageUrls",
        form: "[data-task-publish]",
        onUpload: function(file) {
            // 真实图片上传接口
            var fd = new FormData();
            fd.append("file", file);
            return fetch("http://localhost:8081/api/upload/image", {
                method: "POST",
                body: fd,
                credentials: "include"
            })
            .then(function(response) { return response.json(); })
            .then(function(result) {
                if (result.code === 0) {
                    return { url: result.data.url };
                } else {
                    throw new Error(result.msg || "上传失败");
                }
            });
        }
    });

    // ===== 预览更新 =====
    function updatePreview() {
        var data = new FormData(form);
        var title = String(data.get("title") || "").trim() || "你的任务标题";
        var description = String(data.get("description") || "").trim() || "填写说明后，这里会显示任务简介。";
        var amount = Number(data.get("amount") || 0);
        var deadline = String(data.get("deadline") || "").trim();
        var layout = form.closest(".publish-layout");
        layout.querySelector("[data-preview-title]").textContent = title;
        layout.querySelector("[data-preview-description]").textContent = description;
        layout.querySelector("[data-preview-amount]").textContent = "￥ " + api.money(amount);
        layout.querySelector("[data-preview-deadline]").textContent = deadline ? api.shortTime(deadline.replace("T", " ")) : "时间待定";
    }

    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);

    // ===== 表单提交 =====
    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        api.setFeedback(feedback, "");

        var data = new FormData(form);
        var title = String(data.get("title") || "").trim();
        var pickup = String(data.get("pickup") || "").trim();
        var delivery = String(data.get("delivery") || "").trim();

        if (!title) {
            api.setFeedback(feedback, "请填写任务标题");
            form.querySelector("[name='title']").focus();
            return;
        }
        if (!pickup) {
            api.setFeedback(feedback, "请填写取件地点");
            form.querySelector("[name='pickup']").focus();
            return;
        }
        if (!delivery) {
            api.setFeedback(feedback, "请填写送达地点");
            form.querySelector("[name='delivery']").focus();
            return;
        }
        if (!data.get("agreement")) {
            api.setFeedback(feedback, "请确认发布内容真实有效");
            return;
        }

        var deadline = String(data.get("deadline") || "").trim();
        if (deadline) {
            deadline = deadline.replace("T", " ") + ":00";
        }

        var imageUrls = imageManager.getImageUrls();

        api.setLoading(button, true, "正在发布...");
        try {
            await api.requireUser();
            var result = await api.request("/tasks", {
                method: "POST",
                body: {
                    title: title,
                    description: String(data.get("description") || "").trim(),
                    pickup: pickup,
                    delivery: delivery,
                    deadline: deadline || null,
                    amount: Number(data.get("amount") || 0),
                    contact: String(data.get("contact") || "").trim(),
                    imageUrls: imageUrls
                }
            });
            api.toast("发布成功，等待管理员审核", "success");
            location.href = api.pageUrl("profile-user.jsp?recordTab=published-tasks");
        } catch (error) {
            if (error.status !== 401) {
                api.setFeedback(feedback, error.message || "发布失败，请稍后重试");
            }
        } finally {
            api.setLoading(button, false);
        }
    });

    api.requireUser().catch(function() {});
    updatePreview();
})();