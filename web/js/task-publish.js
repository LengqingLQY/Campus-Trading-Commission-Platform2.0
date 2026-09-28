(function () {
    "use strict";
    const api = window.CTCP;
    const form = document.querySelector("[data-task-publish]");
    if (!form) return;
    const feedback = form.querySelector("[data-feedback]");
    const imageManager = new window.ImageUploadManager({
        container: "[data-task-upload-zone]", input: "#taskImageInput",
        countEl: "[data-image-count]", max: 3, form: "[data-task-publish]"
    });

    function updatePreview() {
        const data = new FormData(form);
        const layout = form.closest(".publish-layout");
        const deadline = String(data.get("deadline") || "").trim();
        layout.querySelector("[data-preview-title]").textContent = String(data.get("title") || "").trim() || "你的任务标题";
        layout.querySelector("[data-preview-description]").textContent = String(data.get("description") || "").trim() || "填写说明后，这里会显示任务简介。";
        layout.querySelector("[data-preview-amount]").textContent = `￥ ${api.money(data.get("amount"))}`;
        layout.querySelector("[data-preview-deadline]").textContent = deadline ? api.shortTime(deadline.replace("T", " ")) : "时间待定";
    }

    const editor = new window.ListingEditor({kind: "task", form, imageManager, updatePreview,
        fields: ["title", "description", "pickup", "delivery", "amount", "deadline", "contact"]});
    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!editor.ready || editor.saving) return;
        api.setFeedback(feedback, "");
        const data = new FormData(form);
        const title = String(data.get("title") || "").trim();
        const pickup = String(data.get("pickup") || "").trim();
        const delivery = String(data.get("delivery") || "").trim();
        const amount = Number(data.get("amount") || 0);
        if (!title || title.length > 80) { api.setFeedback(feedback, "请填写 1～80 字的任务标题"); form.querySelector("[name='title']").focus(); return; }
        if (!pickup || !delivery) { api.setFeedback(feedback, "请填写取件地点和送达地点"); form.querySelector(!pickup ? "[name='pickup']" : "[name='delivery']").focus(); return; }
        if (!Number.isFinite(amount) || amount < 0 || form.elements.amount.validity.badInput) { api.setFeedback(feedback, "跑腿金额必须是非负数字"); return; }
        if (amount > 100000) { api.setFeedback(feedback, "跑腿金额不能超过 100,000 元"); form.querySelector("[name='amount']").focus(); return; }
        if (!data.get("agreement")) { api.setFeedback(feedback, "请确认发布内容真实有效"); return; }
        let deadline = String(data.get("deadline") || "").trim();
        if (deadline) { deadline = deadline.replace("T", " "); if (deadline.length === 16) deadline += ":00"; }
        await editor.save({title, pickup, delivery, amount, deadline: deadline || null,
            description: String(data.get("description") || "").trim(), contact: String(data.get("contact") || "").trim()});
    });
    editor.load();
})();