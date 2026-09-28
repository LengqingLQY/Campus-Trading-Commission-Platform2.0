/** 发布与修改共用的状态控制。修改权限最终以保存接口的校验为准。 */
(function (global) {
    "use strict";
    const api = global.CTCP;

    class ListingEditor {
        constructor(options) {
            Object.assign(this, options);
            this.params = new URLSearchParams(location.search);
            this.isEdit = this.params.has(`${this.kind}Id`);
            this.id = Number(this.params.get(`${this.kind}Id`));
            this.resource = this.kind === "product" ? "products" : "tasks";
            this.label = this.kind === "product" ? "商品" : "任务";
            this.ready = false;
            this.saving = false;
            this.fieldset = this.form.querySelector("[data-publish-fields]");
            this.button = this.form.querySelector("button[type='submit']");
            this.feedback = this.form.querySelector("[data-feedback]");
            this.note = document.createElement("div");
            this.note.className = "publish-mode-note";
            this.note.innerHTML = '<p role="status"></p><button type="button" data-editor-retry hidden>重新加载</button>';
            this.form.prepend(this.note);
            this.note.querySelector("button").addEventListener("click", () => this.load());
            if (this.isEdit) this.configureEdit();
            this.setLocked(true);
        }

        configureEdit() {
            document.title = `CTCP · 修改${this.label}`;
            document.querySelector(".product-page-topbar h1").textContent = `修改${this.label}`;
            document.querySelector(".workspace__kicker").textContent = this.kind === "product" ? "SECOND-HAND · EDIT ITEM" : "ERRAND · EDIT TASK";
            document.querySelector(".section-heading h2").textContent = `更新${this.label}信息`;
            document.querySelector(".section-heading p").textContent = "补充细节，让信息更准确";
            document.querySelector(".publish-preview-card__head > span").textContent = "修改预览";
            this.form.querySelector(".publish-hint strong").textContent = "修改后需重新审核";
            this.form.querySelector(".publish-hint p span").textContent = "保存后重新提交审核，审核通过后恢复公开展示。";
            this.button.innerHTML = '<span>保存修改</span><span>✓</span>';
            const fallback = `${this.kind}-detail.jsp?${this.kind}Id=${this.id}`;
            this.form.querySelector(".publish-actions a").href = api.safePageUrl(this.params.get("returnTo"), fallback);
        }

        setLocked(value) {
            this.fieldset.disabled = value;
            this.imageManager.setDisabled(value);
        }

        async load() {
            this.ready = false;
            this.setLocked(true);
            this.note.hidden = false;
            this.note.querySelector("button").hidden = true;
            this.note.querySelector("p").textContent = this.isEdit ? "正在读取原发布内容…" : "正在准备发布页面…";
            try {
                const user = await api.requireUser();
                if (this.isEdit) {
                    if (!Number.isSafeInteger(this.id) || this.id < 1) throw new api.ApiError(`${this.label}编号无效`, 400);
                    // 使用本人编辑详情接口，待审核和被驳回的原稿也能回填；不降级为新建。
                    const data = await api.request(`/${this.resource}/${this.id}/edit`);
                    const ownerId = data && data[this.kind === "product" ? "sellerId" : "publisherId"];
                    if (!data || Number(ownerId) !== Number(user.id)) throw new api.ApiError(`只能修改自己发布的${this.label}`, 403);
                    if (data.status !== (this.kind === "product" ? "on_sale" : "open")) throw new api.ApiError(`${this.label}已被购买、接取或已完成，不能修改`, 409);
                    this.fields.forEach((name) => {
                        const input = this.form.elements.namedItem(name);
                        if (input) input.value = name === "deadline" ? String(data[name] || "").replace(" ", "T").slice(0, 16) : data[name] == null ? "" : data[name];
                    });
                    this.imageManager.setImageUrls(data.imageUrls);
                    this.note.querySelector("p").textContent = `正在修改你发布的${this.label}。原有图片已保留，可继续添加或删除。`;
                } else this.note.hidden = true;
                this.ready = true;
                this.setLocked(false);
                this.updatePreview();
            } catch (error) {
                const unavailable = [404, 405, 501].includes(error.status);
                this.note.querySelector("p").textContent = unavailable ? `暂时无法读取${this.label}，请稍后重试。` : error.message || "页面加载失败，请稍后重试。";
                this.note.querySelector("button").hidden = [400, 401, 403, 409].includes(error.status);
            }
        }

        async save(body) {
            if (!this.ready || this.saving) return;
            if (this.imageManager.isUploading()) { api.setFeedback(this.feedback, "图片仍在上传，请等待上传完成后再提交。"); return; }
            this.saving = true;
            this.setLocked(true);
            api.setFeedback(this.feedback, "");
            api.setLoading(this.button, true, this.isEdit ? "正在保存…" : "正在发布…");
            try {
                await api.requireUser();
                await api.request(this.isEdit ? `/${this.resource}/${this.id}` : `/${this.resource}`, {
                    method: this.isEdit ? "PUT" : "POST",
                    body: Object.assign({}, body, {imageUrls: this.imageManager.getImageUrls()})
                });
                api.toast(this.isEdit ? "修改已保存，等待管理员审核" : "发布成功，等待管理员审核", "success");
                location.href = api.pageUrl(`profile-user.jsp?recordTab=published-${this.resource}`);
            } catch (error) {
                const message = this.isEdit && error.status === 409 ? "当前状态已变化，无法保存修改。你的输入已保留，请返回详情查看。"
                    : [404, 405, 501].includes(error.status) ? "暂时无法保存，填写内容已保留，请稍后重试。"
                    : error.message || "提交失败，请稍后重试。";
                api.setFeedback(this.feedback, message);
                if (error.status === 401) this.ready = false;
            } finally {
                this.saving = false;
                api.setLoading(this.button, false);
                this.setLocked(!this.ready);
            }
        }
    }
    global.ListingEditor = ListingEditor;
})(window);
