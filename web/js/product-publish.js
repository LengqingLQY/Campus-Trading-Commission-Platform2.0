(function () {
    "use strict";
    const api = window.CTCP;
    const form = document.querySelector("[data-product-publish]");
    if (!form) return;
    const feedback = form.querySelector("[data-feedback]");
    const categoryNames = {book: "图书教材", electronic: "电子数码", daily: "生活日用", clothing: "服饰鞋帽", sports: "运动户外", other: "其他"};
    const imageManager = new window.ImageUploadManager({
        container: "[data-product-upload-zone]", input: "#productImageInput",
        countEl: "[data-image-count]", max: 3, form: "[data-product-publish]"
    });

    function updatePreview() {
        const data = new FormData(form);
        const layout = form.closest(".publish-layout");
        layout.querySelector("[data-preview-title]").textContent = String(data.get("title") || "").trim() || "你的商品标题";
        layout.querySelector("[data-preview-description]").textContent = String(data.get("description") || "").trim() || "填写描述后，这里会显示商品简介。";
        layout.querySelector("[data-preview-price]").textContent = `￥ ${api.money(data.get("price"))}`;
        layout.querySelector("[data-preview-category]").textContent = categoryNames[data.get("category")] || "其他";
    }

    const editor = new window.ListingEditor({kind: "product", form, imageManager, updatePreview,
        fields: ["title", "description", "category", "condition", "price", "location", "contact"]});
    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!editor.ready || editor.saving) return;
        api.setFeedback(feedback, "");
        const data = new FormData(form);
        const title = String(data.get("title") || "").trim();
        const price = Number(data.get("price") || 0);
        if (!title || title.length > 80) { api.setFeedback(feedback, "请填写 1～80 字的商品标题"); form.querySelector("[name='title']").focus(); return; }
        if (!Number.isFinite(price) || price < 0 || form.elements.price.validity.badInput) { api.setFeedback(feedback, "商品价格必须是非负数字"); return; }
        if (!data.get("agreement")) { api.setFeedback(feedback, "请确认商品信息真实并同意线下完成交接"); return; }
        await editor.save({
            title, price, description: String(data.get("description") || "").trim(),
            category: String(data.get("category") || "other"), condition: String(data.get("condition") || "good"),
            location: String(data.get("location") || "").trim(), contact: String(data.get("contact") || "").trim()
        });
    });
    editor.load();
})();
