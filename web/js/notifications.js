/*
 * notifications.js — 统一管理侧边栏未读角标与已读写入（设计书 §8）
 * 由 sidebar.jsp 在所有含侧边栏的页面加载；自身在 DOMContentLoaded 后自动初始化。
 * 暴露 window.CTCPNotifications 供 message-center.js 调用。
 */
(function () {
    "use strict";

    // 兼容 CTCP 尚未就绪（sidebar 在 api.js 之前被 include）的情况：轮询等待。
    function boot() {
        if (!window.CTCP) {
            setTimeout(boot, 50);
            return;
        }
        window.CTCPNotifications.init();
    }

    const api = function () { return window.CTCP; };

    const N = {
        state: { unreadCount: 0, latestId: 0 },
        _badge: null,
        _timer: null,
        _listeners: [],
        _stopped: false,

        init() {
            this._badge = document.getElementById("nav-unread-badge");
            this.refresh();
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

        async refresh() {
            if (this._stopped) return;
            try {
                const res = await api().request("/me/notifications/unread-count");
                const prevLatest = this.state.latestId;
                this.state.unreadCount = (res && typeof res.unreadCount === "number") ? res.unreadCount : 0;
                this.state.latestId = (res && typeof res.latestId === "number") ? res.latestId : 0;
                this._renderBadge();
                this._listeners.forEach((cb) => {
                    try { cb(this.state, prevLatest); } catch (e) { /* 忽略单个监听异常 */ }
                });
            } catch (e) {
                if (e && e.status === 401) this._stopped = true; // 未登录则停止轮询
            }
        },

        _renderBadge() {
            if (!this._badge) return;
            const n = this.state.unreadCount;
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
