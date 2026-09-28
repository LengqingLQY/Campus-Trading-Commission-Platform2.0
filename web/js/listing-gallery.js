(function (global) {
    "use strict";

    const api = global.CTCP;
    let sequence = 0;

    // 详情和发布预览共用同一套单图浏览器；只接收可显示的图片地址。
    function imageList(value) {
        const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
        return values.filter((item) => typeof item === "string").map((item) => item.trim()).filter((item) => {
            if (!item) return false;
            try {
                const url = new URL(item, location.href);
                return ["http:", "https:", "blob:"].includes(url.protocol) && !url.username && !url.password;
            } catch (error) {
                return false;
            }
        });
    }

    class ListingGallery {
        constructor(element, options) {
            this.element = element;
            this.options = options || {};
            this.index = 0;
            this.images = [];
            this.label = this.options.label || "图片";
            this.element.classList.add("listing-gallery");
            this.element.setAttribute("role", "group");
            this.element.setAttribute("aria-label", this.label + "浏览");
            this.element.innerHTML = `
                <button class="listing-gallery__stage" type="button" data-gallery-open>
                    <img data-gallery-image hidden alt="">
                    <span class="listing-gallery__empty" data-gallery-empty>
                        <span class="listing-gallery__icon" aria-hidden="true">${api.escapeHtml(this.options.emptyIcon || "📷")}</span>
                        <strong>${api.escapeHtml(this.options.emptyLabel || "暂无图片")}</strong>
                        <span>${api.escapeHtml(this.options.emptyHint || "文字里也藏着值得发现的细节")}</span>
                    </span>
                    <span class="listing-gallery__zoom" data-gallery-zoom>⤢ 点击查看大图</span>
                    <span class="listing-gallery__error" data-gallery-error hidden>图片暂时无法显示，可切换其他图片</span>
                </button>
                <div class="listing-gallery__controls">
                    <button class="gallery-arrow" type="button" data-gallery-prev aria-label="上一张图片">←</button>
                    <div class="listing-gallery__pages" data-gallery-pages></div>
                    <button class="gallery-arrow" type="button" data-gallery-next aria-label="下一张图片">→</button>
                </div>
                <p class="listing-gallery__count" data-gallery-count aria-live="polite"></p>`;
            this.element.querySelector("[data-gallery-open]").addEventListener("click", () => this.open());
            this.element.querySelector("[data-gallery-prev]").addEventListener("click", () => this.select(this.index - 1));
            this.element.querySelector("[data-gallery-next]").addEventListener("click", () => this.select(this.index + 1));
            this.element.querySelector("[data-gallery-pages]").addEventListener("click", (event) => {
                const button = event.target.closest("[data-gallery-index]");
                if (button) this.select(Number(button.dataset.galleryIndex));
            });
            this.element.addEventListener("keydown", (event) => this.onKey(event));
            this.bindImage(this.element);
            this.setImages(this.options.images);
        }

        bindImage(root) {
            const img = root.querySelector("[data-gallery-image]");
            img.addEventListener("error", () => {
                img.hidden = true;
                root.querySelector("[data-gallery-error]").hidden = false;
            });
        }

        setImages(value) {
            this.images = imageList(value);
            this.index = Math.max(0, Math.min(this.index, this.images.length - 1));
            this.render();
        }

        select(index) {
            if (index < 0 || index >= this.images.length) return;
            this.index = index;
            this.render();
            if (this.options.onChange) this.options.onChange(index);
        }

        renderFrame(root) {
            const img = root.querySelector("[data-gallery-image]");
            const url = this.images[this.index];
            if (img.getAttribute("src") !== (url || null)) {
                root.querySelector("[data-gallery-error]").hidden = true;
                img.hidden = !url;
                if (url) img.src = url;
                else img.removeAttribute("src");
            }
            img.alt = `${this.label}，第 ${this.index + 1} 张，共 ${this.images.length} 张`;
            root.querySelector("[data-gallery-prev]").disabled = this.index === 0 || !url;
            root.querySelector("[data-gallery-next]").disabled = this.index >= this.images.length - 1;
            root.querySelector("[data-gallery-count]").textContent = url
                ? `${this.index + 1} / ${this.images.length}` : "暂无图片";
        }

        render() {
            this.renderFrame(this.element);
            const hasImages = this.images.length > 0;
            this.element.querySelector("[data-gallery-empty]").hidden = hasImages;
            this.element.querySelector("[data-gallery-zoom]").hidden = !hasImages;
            const open = this.element.querySelector("[data-gallery-open]");
            open.disabled = !hasImages;
            open.setAttribute("aria-label", hasImages ? `查看${this.label}大图，第 ${this.index + 1} 张` : "暂无图片");
            // 数字按钮无需加载缩略图；页内始终只有一张图片。
            const pages = this.element.querySelector("[data-gallery-pages]");
            if (pages.children.length !== this.images.length) {
                pages.innerHTML = this.images.map((_, index) => `<button type="button" class="gallery-page"
                    data-gallery-index="${index}" aria-label="查看第 ${index + 1} 张图片">${index + 1}</button>`).join("");
            }
            [...pages.children].forEach((button, index) => button.setAttribute("aria-pressed", String(index === this.index)));
            if (this.dialog && this.dialog.open) this.renderFrame(this.dialog);
        }

        onKey(event) {
            if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            this.select(this.index + (event.key === "ArrowLeft" ? -1 : 1));
        }

        open() {
            if (!this.images.length) return;
            if (!this.dialog) {
                const id = `listing-lightbox-${++sequence}`;
                this.dialog = document.createElement("dialog");
                this.dialog.className = "listing-lightbox";
                this.dialog.setAttribute("aria-labelledby", id);
                this.dialog.innerHTML = `
                    <div class="listing-lightbox__head"><strong id="${id}">${api.escapeHtml(this.label)}预览</strong>
                        <button type="button" class="gallery-arrow" data-gallery-close aria-label="关闭大图" autofocus>×</button></div>
                    <div class="listing-lightbox__image"><img data-gallery-image alt="">
                        <p data-gallery-error hidden>图片暂时无法显示，可切换其他图片</p></div>
                    <div class="listing-lightbox__footer">
                        <button type="button" class="gallery-arrow" data-gallery-prev aria-label="上一张图片">←</button>
                        <span data-gallery-count aria-live="polite"></span>
                        <button type="button" class="gallery-arrow" data-gallery-next aria-label="下一张图片">→</button>
                    </div>
                    <p class="listing-lightbox__hint">方向键切换 · Esc 关闭</p>`;
                this.dialog.querySelector("[data-gallery-close]").addEventListener("click", () => this.dialog.close());
                this.dialog.querySelector("[data-gallery-prev]").addEventListener("click", () => this.select(this.index - 1));
                this.dialog.querySelector("[data-gallery-next]").addEventListener("click", () => this.select(this.index + 1));
                this.dialog.addEventListener("keydown", (event) => this.onKey(event));
                this.dialog.addEventListener("click", (event) => {
                    if (event.target === this.dialog) {
                        const rect = this.dialog.getBoundingClientRect();
                        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.dialog.close();
                    }
                });
                this.dialog.addEventListener("close", () => {
                    document.body.classList.remove("listing-lightbox-open");
                    this.element.querySelector("[data-gallery-open]").focus({preventScroll: true});
                });
                this.bindImage(this.dialog);
                document.body.appendChild(this.dialog);
            }
            this.renderFrame(this.dialog);
            this.dialog.showModal();
            document.body.classList.add("listing-lightbox-open");
        }
    }

    ListingGallery.imageList = imageList;
    global.ListingGallery = ListingGallery;
})(window);
