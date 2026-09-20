(function () {
    "use strict";

    const api = window.CTCP;
    const form = document.querySelector("[data-product-publish]");
    if (!form) return;

    const categoryNames = {book: "图书教材", electronic: "电子数码", daily: "生活日用", clothing: "服饰鞋帽", sports: "运动户外", other: "其他"};
    const button = form.querySelector("button[type='submit']");
    const feedback = form.querySelector("[data-feedback]");

    function updatePreview() {
        const data = new FormData(form);
        const title = String(data.get("title") || "").trim() || "你的商品标题";
        const description = String(data.get("description") || "").trim() || "填写描述后，这里会显示商品简介。";
        form.closest(".publish-layout").querySelector("[data-preview-title]").textContent = title;
        form.closest(".publish-layout").querySelector("[data-preview-description]").textContent = description;
        form.closest(".publish-layout").querySelector("[data-preview-price]").textContent = `￥ ${api.money(data.get("price"))}`;
        form.closest(".publish-layout").querySelector("[data-preview-category]").textContent = categoryNames[data.get("category")] || "其他";
    }

    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        api.setFeedback(feedback, "");
        const data = new FormData(form);
        const title = String(data.get("title") || "").trim();
        const price = Number(data.get("price") || 0);
        if (!title) {
            api.setFeedback(feedback, "请填写商品标题");
            form.querySelector("[name='title']").focus();
            return;
        }
        if (!Number.isFinite(price) || price < 0) {
            api.setFeedback(feedback, "商品价格必须是非负数字");
            return;
        }
        if (!data.get("agreement")) {
            api.setFeedback(feedback, "请确认商品信息真实并同意线下完成交接");
            return;
        }
        api.setLoading(button, true, "正在发布...");
        try {
            await api.requireUser();
            const result = await api.request("/products", {
                method: "POST",
                body: {
                    title,
                    description: String(data.get("description") || "").trim(),
                    category: String(data.get("category") || "other"),
                    condition: String(data.get("condition") || "good"),
                    price,
                    location: String(data.get("location") || "").trim(),
                    contact: String(data.get("contact") || "").trim()
                }
            });
            api.toast("商品已发布", "success");
            location.href = api.pageUrl(`product-detail.jsp?productId=${result.id}`);
        } catch (error) {
            if (error.status !== 401) api.setFeedback(feedback, error.message || "发布失败，请稍后重试");
        } finally {
            api.setLoading(button, false);
        }
    });

    api.requireUser().catch(() => {});
    updatePreview();
})();
