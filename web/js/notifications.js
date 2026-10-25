/*
 * notifications.js — 统一管理侧边栏未读角标与已读写入（设计书 §8）
 * 由 sidebar.jsp 在所有含侧边栏的页面加载；自身在 DOMContentLoaded 后自动初始化。
 * 暴露 window.CTCPNotifications 供 message-center.js 调用。
 */
(function () {
    "use strict";

    function boot() {
        window.CTCPNotifications.init();
    }

    const api = function () { return window.CTCP; };

    const N = {
        state: { unreadCount: 0, latestId: 0 },
        _badge: null,
        _timer: null,
        _listeners: [],
        _stopped: false,
        _pending: null,
        _revision: 0,

        async init() {
            this._badge = document.getElementById("nav-unread-badge");
            await this.refresh();
            this._start();
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible") {
                    this.refresh();
                    this._start();
                } else {
                    this._stopTimer();
                }
            });
        },

        /** 注册未读变化回调，签名 (state, prevLatestId)。 */
        onUnread(cb) {
            if (typeof cb === "function") this._listeners.push(cb);
        },

        setCounts(counts) {
            this._revision++;
            const previousLatest = this.state.latestId;
            this.state = {unreadCount: counts.unreadCount, latestId: counts.latestId};
            this._renderBadge();
            this._listeners.forEach((cb) => cb(this.state, previousLatest));
        },

        async refresh() {
            if (this._stopped || document.visibilityState === "hidden") return;
            if (this._pending) return this._pending;
            const revision = this._revision;
            this._pending = (async () => {
                try {
                    if (!await api().currentUser()) {
                        this._stop();
                        return;
                    }
                    const counts = await api().request("/me/notifications/unread-count");
                    // 列表已同步数量时，丢弃更早发出的计数请求。
                    if (revision === this._revision) this.setCounts(counts);
                } catch (e) {
                    if (e.status === 401) this._stop();
                    // 网络错误保留上次数字，下一次可见轮询重试。
                }
            })();
            try { await this._pending; }
            finally { this._pending = null; }
        },

        _stop() {
            this._stopped = true;
            this._stopTimer();
            this.setCounts({unreadCount: 0, latestId: 0});
        },

        _renderBadge() {
            if (!this._badge) return;
            const n = this.state.unreadCount;
            this._badge.setAttribute("aria-label", "您有 " + n + " 条未读消息");
            if (!n) {
                this._badge.hidden = true;
                this._badge.textContent = "";
                return;
            }
            this._badge.hidden = false;
            this._badge.textContent = n > 99 ? "99+" : String(n);
            this._badge.setAttribute("aria-label", "您有 " + n + " 条未读消息");
        },

        _start() {
            this._stopTimer();
            if (this._stopped || document.visibilityState === "hidden") return;
            this._timer = setInterval(() => {
                if (document.visibilityState !== "visible") return;
                this.refresh();
            }, 30000);
        },

        _stopTimer() {
            if (this._timer) {
                clearInterval(this._timer);
                this._timer = null;
            }
        },

        markRead(id) {
            return api().request("/me/notifications/" + id + "/read", { method: "PUT" });
        },

        markAll(upToId) {
            return api().request("/me/notifications/read-all", {
                method: "PUT",
                body: { upToId: (typeof upToId === "number" ? upToId : this.state.latestId) }
            });
        }
    };

    window.CTCPNotifications = N;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
