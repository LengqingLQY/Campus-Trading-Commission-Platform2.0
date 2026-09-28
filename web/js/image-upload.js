/** 商品与任务发布使用的单图上传预览；上传完成前不将临时图片写入请求。 */
(function (global) {
    "use strict";
    const api = global.CTCP;

    class ImageUploadManager {
        constructor(config) {
            this.config = Object.assign({max: 3, name: "imageUrls"}, config);
            this.container = document.querySelector(config.container);
            this.input = document.querySelector(config.input);
            this.form = document.querySelector(config.form);
            this.countEl = document.querySelector(config.countEl);
            this.items = [];
            this.disabled = false;
            this.container.innerHTML = `
                <div data-upload-gallery></div>
                <div class="image-upload-actions">
                    <button class="image-add-button" type="button" data-image-add>＋ 添加图片</button>
                    <button class="image-remove-button" type="button" data-image-remove>删除当前图片</button>
                </div>
                <p class="image-upload-help">JPG / PNG / GIF / WebP · 最多 ${this.config.max} 张 · 每张不超过 5 MB</p>
                <p class="form-feedback" data-upload-feedback role="status"></p>`;
            this.feedback = this.container.querySelector("[data-upload-feedback]");
            this.gallery = new global.ListingGallery(this.container.querySelector("[data-upload-gallery]"), {
                emptyLabel: "为它添加几张图片", emptyHint: "点击下方按钮，分享更多细节", onChange: () => this.updateControls()
            });
            this.container.querySelector("[data-image-add]").addEventListener("click", () => this.input.click());
            this.container.querySelector("[data-image-remove]").addEventListener("click", () => this.removeImage(this.gallery.index));
            this.input.addEventListener("change", () => { this.addFiles(Array.from(this.input.files)); this.input.value = ""; });
            this.update();
        }

        async upload(file) {
            if (this.config.onUpload) return this.config.onUpload(file);
            const data = new FormData();
            data.append("file", file);
            const response = await fetch(`${api.API_BASE}/upload/image`, {method: "POST", body: data, credentials: "include"});
            let result;
            try { result = await response.json(); } catch (error) { throw new Error("上传服务暂时不可用"); }
            if (!response.ok || !result || result.code !== 0 || !result.data || !result.data.url) throw new Error(result && result.msg || "图片上传失败");
            return result.data;
        }

        addFiles(files) {
            if (this.disabled || !files.length) return;
            api.setFeedback(this.feedback, "");
            if (this.items.length + files.length > this.config.max) { api.setFeedback(this.feedback, `最多添加 ${this.config.max} 张图片，请减少选择的数量。`); return; }
            const invalid = files.find((file) => !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0);
            if (invalid) { api.setFeedback(this.feedback, `“${invalid.name}”不是有效的图片，或大小超过 5 MB。请选择 JPG、PNG、GIF、WebP。`); return; }
            // 同步预占位置，连续选择或上传乱序完成不会突破数量上限或交换图片顺序。
            const added = files.map(() => ({url: "", pending: true}));
            added.forEach((item, index) => { item.preview = URL.createObjectURL(files[index]); });
            this.items.push(...added);
            this.gallery.index = this.items.length - added.length;
            this.update();
            files.forEach(async (file, index) => {
                const item = added[index];
                try {
                    const result = await this.upload(file);
                    const url = result && (result.url || result);
                    if (!global.ListingGallery.imageList([url]).length || String(url).startsWith("blob:")) throw new Error("上传服务未返回有效图片地址");
                    if (!this.items.includes(item)) return;
                    item.url = url;
                    item.pending = false;
                } catch (error) {
                    if (!this.items.includes(item)) return;
                    this.items.splice(this.items.indexOf(item), 1);
                    api.setFeedback(this.feedback, `“${file.name}”上传失败：${error.message || "请稍后重试"}`);
                } finally { URL.revokeObjectURL(item.preview); this.update(); }
            });
        }

        setImageUrls(value) {
            this.items.forEach((item) => { if (item.preview) URL.revokeObjectURL(item.preview); });
            this.items = global.ListingGallery.imageList(value).map((url) => ({url, pending: false}));
            this.gallery.index = 0;
            this.update();
        }

        removeImage(index) {
            if (this.disabled || !this.items[index]) return;
            const [item] = this.items.splice(index, 1);
            if (item.preview) URL.revokeObjectURL(item.preview);
            this.update();
        }

        update() {
            this.gallery.setImages(this.items.map((item) => item.url || item.preview));
            this.updateControls();
            let hidden = this.form.querySelector(`input[name='${this.config.name}']`);
            if (!hidden) { hidden = document.createElement("input"); hidden.type = "hidden"; hidden.name = this.config.name; this.form.appendChild(hidden); }
            hidden.value = this.getImageUrls();
        }

        updateControls() {
            const pending = this.items.filter((item) => item.pending).length;
            this.input.disabled = this.disabled || this.items.length >= this.config.max;
            this.container.querySelector("[data-image-add]").disabled = this.input.disabled;
            const remove = this.container.querySelector("[data-image-remove]");
            remove.disabled = this.disabled || !this.items.length;
            remove.textContent = this.items[this.gallery.index] && this.items[this.gallery.index].pending ? "取消当前上传" : "删除当前图片";
            if (this.countEl) this.countEl.textContent = pending ? `${this.items.length - pending} 张已上传 · ${pending} 张上传中` : `已添加 ${this.items.length} / ${this.config.max} 张`;
        }

        setDisabled(value) { this.disabled = value; this.updateControls(); }
        isUploading() { return this.items.some((item) => item.pending); }
        getImageUrls() { return this.items.filter((item) => !item.pending).map((item) => item.url).join(","); }
        getImageList() { return this.items.filter((item) => !item.pending).map((item) => item.url); }
        reset() { this.setImageUrls([]); }
    }
    global.ImageUploadManager = ImageUploadManager;
})(window);
