(function (global) {
    "use strict";
    const api = global.CTCP;
    const PAGE_SIZE = 10;
    let sequence = 0;

    class ListingComments {
        constructor(element, options) {
            this.element = element;
            this.user = options.user;
            this.page = 1;
            this.total = 0;
            this.items = [];
            this.replyTarget = null;
            this.loading = false;
            this.mutating = false;
            this.requestId = 0;
            this.endpoint = `/${options.kind === "product" ? "products" : "tasks"}/${options.id}/comments`;
            this.loginUrl = api.pageUrl(`index.jsp?next=${encodeURIComponent(api.currentPagePath())}`);
            const fieldId = `listing-comment-${++sequence}`;
            this.element.classList.add("listing-comments");
            this.element.setAttribute("aria-label", "评论区");
            this.element.innerHTML = `
                <div class="comments-heading"><h3>交流与评论 <span data-comment-total>—</span></h3><span>每页 10 条</span></div>
                <div class="comments-login" data-comment-login ${this.user ? "hidden" : ""}>
                    <span>和同学聊聊，问问你关心的细节</span><a href="${api.escapeHtml(this.loginUrl)}">登录后评论 →</a>
                </div>
                <form class="comment-form" data-comment-form ${this.user ? "" : "hidden"}>
                    <label for="${fieldId}">有什么想问的，或想分享的？</label>
                    <div class="comment-reply-target" data-comment-reply-target hidden><span></span><button type="button" class="comment-text-action" data-comment-action="cancel-reply">取消回复</button></div>
                    <textarea id="${fieldId}" name="content" maxlength="1000" placeholder="友善交流，让校园里的每一次相遇更有温度。" required></textarea>
                    <div class="comment-form__footer"><span data-comment-length>0 / 1000</span><button class="primary-action" type="submit">发布评论 <span aria-hidden="true">↑</span></button></div>
                    <p class="form-feedback" data-comment-feedback role="status"></p>
                </form>
                <div class="comments-status" data-comment-status role="status" hidden><span></span><button class="comment-text-action" type="button" data-comment-action="retry" hidden>重试</button></div>
                <div class="comments-list" data-comment-list></div>
                <nav class="comments-pagination" data-comment-pagination aria-label="评论分页" hidden>
                    <button class="secondary-action" type="button" data-comment-action="previous">← 上一页</button>
                    <span data-comment-page></span>
                    <button class="secondary-action" type="button" data-comment-action="next">下一页 →</button>
                </nav>`;
            this.form = this.element.querySelector("[data-comment-form]");
            this.input = this.form.querySelector("textarea");
            this.feedback = this.element.querySelector("[data-comment-feedback]");
            this.input.addEventListener("input", () => this.updateCounter());
            this.form.addEventListener("submit", (event) => { event.preventDefault(); this.post(); });
            this.element.addEventListener("click", (event) => this.handleClick(event));
            this.load(1);
        }

        updateCounter() {
            this.element.querySelector("[data-comment-length]").textContent = `${this.input.value.length} / 1000`;
        }

        setStatus(message, retry) {
            const status = this.element.querySelector("[data-comment-status]");
            status.hidden = !message;
            status.querySelector("span").textContent = message;
            status.querySelector("button").hidden = !retry;
        }

        updateControls() {
            this.element.querySelectorAll("button").forEach((button) => { button.disabled = this.loading || this.mutating; });
            this.input.readOnly = this.mutating;
            this.element.querySelector('[data-comment-action="previous"]').disabled = this.loading || this.mutating || this.page <= 1;
            this.element.querySelector('[data-comment-action="next"]').disabled = this.loading || this.mutating || this.page >= Math.ceil(this.total / PAGE_SIZE);
            this.element.querySelector("[data-comment-list]").setAttribute("aria-busy", String(this.loading));
        }

        async load(page, focusList) {
            const requestId = ++this.requestId;
            this.loading = true;
            this.setStatus("正在加载评论…", false);
            this.updateControls();
            try {
                const data = await api.request(`/public${this.endpoint}${api.query({page, size: PAGE_SIZE})}`);
                if (requestId !== this.requestId) return;
                if (!data || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0) throw new Error("评论数据暂时无法读取");
                const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
                // 删除本页最后一条后自动回到最后一个有效页。
                if (page > lastPage) return await this.load(lastPage, focusList);
                this.page = page;
                this.total = data.total;
                this.items = data.list.slice(0, PAGE_SIZE);
                this.renderList();
                this.setStatus("", false);
                if (focusList) {
                    const first = this.element.querySelector(".comment-item") || this.element.querySelector(".comments-heading");
                    first.setAttribute("tabindex", "-1");
                    first.focus({preventScroll: true});
                    first.scrollIntoView({block: "start"});
                }
            } catch (error) {
                if (requestId !== this.requestId) return;
                this.setStatus("评论暂时无法加载，请稍后重试。", true);
            } finally {
                if (requestId === this.requestId) { this.loading = false; this.updateControls(); }
            }
        }

        renderList() {
            this.element.querySelector("[data-comment-total]").textContent = this.total;
            this.element.querySelector("[data-comment-list]").innerHTML = this.items.length
                ? this.items.map((item) => {
                    const own = this.user && Number(this.user.id) === Number(item.authorId);
                    const reply = item.replyTo;
                    const quote = reply ? (reply.deleted ? "原评论已删除" : `回复 ${reply.authorName || "校园同学"}：${String(reply.content || "").slice(0, 160)}`) : "";
                    return `<article class="comment-item" data-comment-id="${api.escapeHtml(item.id)}">
                        <span class="comment-avatar" aria-hidden="true">${api.escapeHtml(api.initial(item.authorName))}</span>
                        <div class="comment-body">
                            <div class="comment-meta"><strong>${api.escapeHtml(item.authorName || "校园同学")}${own ? " · 我" : ""}</strong><time>${api.escapeHtml(api.shortTime(item.createdAt))}</time></div>
                            ${quote ? `<blockquote class="comment-quote">${api.escapeHtml(quote)}</blockquote>` : ""}
                            <p class="comment-content">${api.escapeHtml(item.content)}</p>
                            <div class="comment-actions">
                                ${this.user ? '<button type="button" class="comment-text-action" data-comment-action="reply">回复</button>' : `<a class="comment-text-action" href="${api.escapeHtml(this.loginUrl)}">登录后回复</a>`}
                                ${own ? '<button type="button" class="comment-text-action comment-text-action--delete" data-comment-action="delete">删除</button>' : ""}
                            </div>
                        </div></article>`;
                }).join("")
                : '<p class="comments-empty">还没有评论<br>来开启这场校园小交流吧</p>';
            this.element.querySelector("[data-comment-pagination]").hidden = this.total <= PAGE_SIZE;
            this.element.querySelector("[data-comment-page]").textContent = `第 ${this.page} / ${Math.max(1, Math.ceil(this.total / PAGE_SIZE))} 页`;
        }

        handleClick(event) {
            const button = event.target.closest("[data-comment-action]");
            if (!button || button.disabled || this.loading || this.mutating) return;
            const action = button.dataset.commentAction;
            if (action === "previous") return this.load(this.page - 1, true);
            if (action === "next") return this.load(this.page + 1, true);
            if (action === "retry") return this.load(this.page);
            if (action === "cancel-reply") return this.setReply(null);
            const row = button.closest("[data-comment-id]");
            const item = row && this.items.find((entry) => String(entry.id) === row.dataset.commentId);
            if (!item || !this.user) return;
            if (action === "reply") this.setReply(item);
            if (action === "delete") this.remove(item);
        }

        setReply(item) {
            this.replyTarget = item;
            const target = this.element.querySelector("[data-comment-reply-target]");
            target.hidden = !item;
            target.querySelector("span").textContent = item ? `回复 ${item.authorName || "校园同学"}：${String(item.content || "").slice(0, 100)}` : "";
            this.form.querySelector("button[type='submit']").innerHTML = item ? '发布回复 <span aria-hidden="true">↑</span>' : '发布评论 <span aria-hidden="true">↑</span>';
            api.setFeedback(this.feedback, "");
            if (item) { this.input.focus({preventScroll: true}); this.form.scrollIntoView({block: "start"}); }
        }

        showError(error, fallback) {
            api.setFeedback(this.feedback, error.status === 401 ? "登录已过期，请重新登录后再试。" :
                [404, 405, 501].includes(error.status) ? fallback : error.message || fallback);
            if (error.status === 401) this.element.querySelector("[data-comment-login]").hidden = false;
        }

        async post() {
            if (!this.user || this.loading || this.mutating) return;
            const content = this.input.value.trim();
            if (!content || content.length > 1000) { api.setFeedback(this.feedback, "请输入 1～1000 字的评论内容。"); this.input.focus(); return; }
            this.mutating = true;
            api.setFeedback(this.feedback, "");
            this.updateControls();
            try {
                const result = await api.request(this.endpoint, {method: "POST", body: {content, replyToId: this.replyTarget ? this.replyTarget.id : null}});
                this.input.value = "";
                this.updateCounter();
                this.setReply(null);
                api.toast("评论已发布", "success");
                const page = result && Number.isInteger(result.page) && result.page > 0 ? result.page : Math.max(1, Math.ceil((this.total + 1) / PAGE_SIZE));
                await this.load(page, true);
            } catch (error) {
                this.showError(error, "评论暂时无法发布，内容已保留，请稍后重试。");
            } finally { this.mutating = false; this.updateControls(); }
        }

        async remove(item) {
            if (!this.user || Number(item.authorId) !== Number(this.user.id) || this.mutating) return;
            if (!confirm("确认删除这条评论吗？其他同学的回复会保留。")) return;
            this.mutating = true;
            this.updateControls();
            try {
                await api.request(`${this.endpoint}/${item.id}`, {method: "DELETE"});
                if (this.replyTarget && this.replyTarget.id === item.id) this.setReply(null);
                api.toast("评论已删除", "success");
                await this.load(this.page, true);
            } catch (error) {
                this.showError(error, "评论暂时无法删除，请稍后重试。");
                this.feedback.scrollIntoView({block: "nearest"});
            } finally { this.mutating = false; this.updateControls(); }
        }
    }
    global.ListingComments = ListingComments;
})(window);
