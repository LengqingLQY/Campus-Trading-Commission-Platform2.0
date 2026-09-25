<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/profile.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>个人空间 · CTCP</title>
</head>
<body class="app-page app-page--profile">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace profile-page-workspace">
        <header class="workspace__topbar product-page-topbar profile-topbar">
            <div>
                <span class="workspace__kicker">PROFILE · PERSONAL SPACE</span>
                <h1>个人空间 <span class="profile-role user">普通用户</span></h1>
            </div>
            <div class="workspace__actions">
                <button class="profile-chip" type="button">
                    <span class="avatar avatar--small" data-profile-avatar>A</span>
                    <span data-profile-name>我的空间</span>
                </button>
            </div>
        </header>

        <section class="profile-content" data-profile-root>

            <!-- 加载状态 -->
            <div class="loading-state" data-profile-loading><span class="button-spinner"></span><p>正在加载个人资料...</p></div>

            <!-- 内容区域 -->
            <div data-profile-content style="display:none;">

                <!-- ===== 个人资料 ===== -->
                <div class="profile-card">
                    <div class="section-heading">
                        <span class="section-heading__number">👤</span>
                        <div><h2>个人资料</h2><p>查看和修改个人信息</p></div>
                    </div>

                    <div class="profile-avatar-row">
                        <!-- ===== 头像区域（点击上传） ===== -->
                        <div class="profile-avatar-lg user" data-profile-avatar-lg>
                            <span class="avatar-letter" data-avatar-letter>A</span>
                            <div class="avatar-upload-overlay">
                                <span class="upload-icon">📷</span>
                                <span class="upload-text" data-action="upload-avatar">更换头像</span>
                                <span class="upload-divider">|</span>
                                <span class="upload-text" data-action="reset-avatar">恢复默认</span>
                            </div>
                        </div>
                        <input type="file" id="avatarInput" accept="image/*" style="display:none;">
                        <div>
                            <span class="profile-name" data-profile-username>加载中</span>
                            <span class="profile-role user">普通用户</span>
                            <p class="profile-contact">
                                QQ：<span data-profile-qq>—</span> &nbsp;|&nbsp;
                                微信：<span data-profile-wechat>—</span> &nbsp;|&nbsp;
                                电话：<span data-profile-phone>—</span>
                            </p>
                        </div>
                    </div>

                    <form class="publish-form" data-profile-form novalidate>
                        <div class="publish-form-grid">
                            <div class="form-field">
                                <label for="edit-username">用户名</label>
                                <input type="text" id="edit-username" name="username" data-profile-input-username>
                            </div>
                            <div class="form-field">
                                <label for="edit-qq">QQ</label>
                                <input type="text" id="edit-qq" name="qq" data-profile-input-qq>
                            </div>
                            <div class="form-field">
                                <label for="edit-wechat">微信</label>
                                <input type="text" id="edit-wechat" name="wechat" data-profile-input-wechat>
                            </div>
                            <div class="form-field">
                                <label for="edit-phone">电话</label>
                                <input type="text" id="edit-phone" name="phone" data-profile-input-phone>
                            </div>
                            <fieldset class="form-field form-field--full profile-password-fieldset">
                                <legend>重置密码 <span>需同时填写旧密码和新密码</span></legend>
                                <div class="profile-password-grid">
                                    <div>
                                        <label for="edit-old-password">旧密码</label>
                                        <input type="password" id="edit-old-password" name="oldPassword" placeholder="旧密码">
                                    </div>
                                    <div>
                                        <label for="edit-new-password">新密码</label>
                                        <input type="password" id="edit-new-password" name="newPassword" placeholder="新密码（至少6位）">
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                        <p class="form-feedback" data-profile-feedback aria-live="polite"></p>
                        <div class="publish-actions">
                            <button class="primary-action" type="submit" style="background:#52c41a;">💾 保存修改</button>
                            <button class="secondary-action" type="reset">取消</button>
                        </div>
                        <p class="security-hint">🔒 密码使用哈希存储，不显示明文</p>
                    </form>
                </div>

                <!-- ===== 我的记录 ===== -->
                <div class="profile-records" id="profile-records" data-profile-records>
                    <div class="section-heading" style="border-bottom:none;padding-bottom:0;">
                        <span class="section-heading__number">📋</span>
                        <div><h2>我的记录</h2><p>我发布的 · 我接取的 · 我购买的</p></div>
                    </div>

                    <div class="market-tools" style="margin-top:16px;padding-bottom:16px;border-bottom:1px solid #eff5f3;">
                        <button class="sort-pill sort-pill--active" type="button" data-record-tab="published-tasks">📦 我发布的任务</button>
                        <button class="sort-pill" type="button" data-record-tab="published-products">🛍️ 我上架的商品</button>
                        <button class="sort-pill" type="button" data-record-tab="accepted">🏃 我接取的任务</button>
                        <button class="sort-pill" type="button" data-record-tab="bought">🛒 我购买的商品</button>
                    </div>

                    <div data-record-list>
                        <div class="loading-state"><span class="button-spinner"></span><p>正在加载记录...</p></div>
                    </div>
                </div>
            </div>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/profile.js"></script>
</body>
</html>