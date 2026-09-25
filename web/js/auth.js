(function () {
    "use strict";

    const api = window.CTCP;

    function safeNext() {
        const value = new URLSearchParams(location.search).get("next");
        if (!value || !/^[a-z-]+\.jsp(?:\?[^#]*)?$/.test(value)) {
            return "main.jsp";
        }
        return value;
    }

    function initLogin() {
        const form = document.querySelector("[data-auth='login']");
        if (!form) return;
        const account = form.querySelector("#username");
        const password = form.querySelector("#password");
        const remember = form.querySelector("#remember-me");
        const button = form.querySelector("button[type='submit']");
        const feedback = form.querySelector("[data-feedback]");

        const remembered = localStorage.getItem("ctcp-remembered-account");
        if (remembered) {
            account.value = remembered;
            remember.checked = true;
        }
        const params = new URLSearchParams(location.search);
        if (params.get("registered") === "1") {
            account.value = params.get("account") || account.value;
            api.setFeedback(feedback, "注册成功，请使用新账号登录", "success");
        }

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            api.setFeedback(feedback, "");
            if (!account.value.trim() || !password.value) {
                api.setFeedback(feedback, "请输入校园账号和登录密码");
                return;
            }
            api.setLoading(button, true, "正在登录...");
            try {
                const data = await api.request("/login", {
                    method: "POST",
                    body: {account: account.value.trim(), password: password.value}
                });
                if (remember.checked) {
                    localStorage.setItem("ctcp-remembered-account", account.value.trim());
                } else {
                    localStorage.removeItem("ctcp-remembered-account");
                }
                api.resetCurrentUser();
                const target = data && data.role === "admin" ? "profile-admin.jsp" : safeNext();
                location.href = api.pageUrl(target);
            } catch (error) {
                api.setFeedback(feedback, error.message || "登录失败，请稍后重试");
            } finally {
                api.setLoading(button, false);
            }
        });

        const forgot = document.querySelector("[data-action='forgot-password']");
        if (forgot) {
            forgot.addEventListener("click", (event) => {
                event.preventDefault();
                api.toast("当前版本暂未开放找回密码，请联系平台管理员", "info");
            });
        }
    }

    function initRegister() {
        const form = document.querySelector("[data-auth='register']");
        if (!form) return;
        const button = form.querySelector("button[type='submit']");
        const feedback = form.querySelector("[data-feedback]");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            api.setFeedback(feedback, "");
            const data = new FormData(form);
            const account = String(data.get("account") || "").trim();
            const username = String(data.get("username") || "").trim();
            const password = String(data.get("password") || "");
            const confirm = String(data.get("confirmPassword") || "");
            if (!username || !account || !password) {
                api.setFeedback(feedback, "请填写昵称、校园账号和密码");
                return;
            }
            if (password.length < 6) {
                api.setFeedback(feedback, "密码长度不能少于 6 位");
                return;
            }
            if (password !== confirm) {
                api.setFeedback(feedback, "两次输入的密码不一致");
                return;
            }
            if (!data.get("agreement")) {
                api.setFeedback(feedback, "请先阅读并同意校园平台使用规范");
                return;
            }

            api.setLoading(button, true, "正在创建账号...");
            try {
                await api.request("/register", {
                    method: "POST",
                    body: {
                        account,
                        password,
                        username,
                        qq: String(data.get("qq") || "").trim(),
                        wechat: String(data.get("wechat") || "").trim(),
                        phone: String(data.get("phone") || "").trim()
                    }
                });
                location.href = api.pageUrl(`index.jsp?registered=1&account=${encodeURIComponent(account)}`);
            } catch (error) {
                api.setFeedback(feedback, error.message || "注册失败，请稍后重试");
            } finally {
                api.setLoading(button, false);
            }
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        initLogin();
        initRegister();
    });
})();
