<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/auth.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 登录</title>
</head>
<body class="auth-page">
<div class="auth-decoration auth-decoration--one"></div>
<div class="auth-decoration auth-decoration--two"></div>
<div class="auth-decoration auth-decoration--three"></div>

<main class="auth-shell">
    <section class="auth-intro" aria-label="平台介绍">
        <div class="brand-mark brand-mark--large">C</div>
        <p class="eyebrow">CAMPUS TOGETHER · CTCP</p>
        <h1>让校园生活，<br><em>更有连接感。</em></h1>
        <p class="intro-copy">
            学习、活动、服务和同学之间的每一次相遇，都可以在这里轻松发生。
        </p>

        <ul class="auth-points">
            <li>
                <span class="point-number">01</span>
                <span>
                    <strong>发现校园新鲜事</strong>
                    <small>把值得关注的校园信息放在一起</small>
                </span>
            </li>
            <li>
                <span class="point-number">02</span>
                <span>
                    <strong>和同学一起成长</strong>
                    <small>学习、分享与每一个小目标都有人回应</small>
                </span>
            </li>
        </ul>

        <div class="floating-note">
            <span class="floating-note__icon">✦</span>
            <span>今天也要收集一点校园里的小确幸</span>
        </div>
    </section>

    <section class="auth-card" aria-label="登录表单">
        <div class="auth-card__top">
            <span class="mini-label">欢迎回来</span>
            <span class="dot-group" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <h2>登录 CTCP</h2>
        <p class="auth-card__subtitle">从今天的校园生活开始吧</p>

        <form class="auth-form" data-auth="login" novalidate>
            <div class="form-field">
                <label for="username">校园账号</label>
                <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">✦</span>
                    <input type="text" id="username" name="username" placeholder="请输入校园账号" autocomplete="username" required>
                </div>
            </div>

            <div class="form-field">
                <label for="password">登录密码</label>
                <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">◒</span>
                    <input type="password" id="password" name="password" placeholder="请输入登录密码" autocomplete="current-password" required>
                </div>
            </div>

            <div class="form-options">
                <label class="check-label" for="remember-me">
                    <input type="checkbox" id="remember-me" name="remember-me">
                    <span>记住我</span>
                </label>
                <button class="muted-link" type="button" data-action="forgot-password">忘记密码？</button>
            </div>

            <p class="form-feedback" data-feedback aria-live="polite"></p>

            <button class="primary-button" type="submit">
                <span>登录</span>
                <span class="button-arrow" aria-hidden="true">→</span>
            </button>
        </form>

        <p class="auth-switch">还没有账号？ <a href="register.jsp">立即注册</a></p>
    </section>
</main>

<footer class="auth-footer">
    <span>CTCP · Campus Together</span>
    <span>校园协作，从一份好心情开始</span>
</footer>
<script src="js/api.js"></script>
<script src="js/auth.js"></script>
</body>
</html>
