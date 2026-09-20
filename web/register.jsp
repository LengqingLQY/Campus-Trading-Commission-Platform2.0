<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/auth.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 注册</title>
</head>
<body class="auth-page auth-page--register">
<div class="auth-decoration auth-decoration--one"></div>
<div class="auth-decoration auth-decoration--two"></div>
<div class="auth-decoration auth-decoration--three"></div>

<main class="auth-shell auth-shell--register">
    <section class="auth-intro" aria-label="平台介绍">
        <div class="brand-mark brand-mark--large">C</div>
        <p class="eyebrow">CAMPUS TOGETHER · CTCP</p>
        <h1>把喜欢的校园，<br><em>分享给更多人。</em></h1>
        <p class="intro-copy">
            注册一个属于你的校园账号，和志趣相投的同学一起，把日常过得更加有趣。
        </p>

        <div class="register-sticker">
            <span class="register-sticker__sun">☼</span>
            <span>
                <strong>新同学，欢迎加入</strong>
                <small>你的校园故事，从这里开始</small>
            </span>
        </div>
    </section>

    <section class="auth-card auth-card--register" aria-label="注册表单">
        <div class="auth-card__top">
            <span class="mini-label">加入我们</span>
            <span class="dot-group" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
        <h2>创建校园账号</h2>
        <p class="auth-card__subtitle">填写信息，开启你的 CTCP 之旅</p>

        <form class="auth-form auth-form--register" data-auth="register" novalidate>
            <div class="form-field">
                <label for="nickname">昵称</label>
                <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">☺</span>
                    <input type="text" id="nickname" name="username" placeholder="给自己取一个昵称" autocomplete="nickname" required>
                </div>
            </div>

            <div class="form-field">
                <label for="school-account">校园账号</label>
                <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">✦</span>
                    <input type="text" id="school-account" name="account" placeholder="请输入校园账号" autocomplete="username" required>
                </div>
            </div>

            <div class="form-field">
                <label for="register-password">设置密码</label>
                <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">◒</span>
                    <input type="password" id="register-password" name="password" placeholder="至少 6 位密码" autocomplete="new-password" required>
                </div>
            </div>

            <div class="form-field">
                <label for="confirm-password">确认密码</label>
                <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">✓</span>
                    <input type="password" id="confirm-password" name="confirmPassword" placeholder="请再次输入登录密码" autocomplete="new-password" required>
                </div>
            </div>

            <div class="auth-contact-grid">
                <div class="form-field">
                    <label for="register-qq">QQ <span>选填</span></label>
                    <input type="text" id="register-qq" name="qq" placeholder="方便交易联系">
                </div>
                <div class="form-field">
                    <label for="register-wechat">微信 <span>选填</span></label>
                    <input type="text" id="register-wechat" name="wechat" placeholder="微信号">
                </div>
                <div class="form-field auth-contact-grid__full">
                    <label for="register-phone">手机号 <span>选填</span></label>
                    <input type="tel" id="register-phone" name="phone" placeholder="手机号">
                </div>
            </div>

            <label class="check-label check-label--agreement" for="user-agreement">
                <input type="checkbox" id="user-agreement" name="agreement">
                <span>我已阅读并同意校园平台使用规范</span>
            </label>

            <p class="form-feedback" data-feedback aria-live="polite"></p>

            <button class="primary-button" type="submit">
                <span>立即注册</span>
                <span class="button-arrow" aria-hidden="true">→</span>
            </button>
        </form>

        <p class="auth-switch">已经有账号？ <a href="index.jsp">返回登录</a></p>
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
