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
    <title>管理员 · 个人空间 · CTCP</title>
</head>
<body class="app-page app-page--admin">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace profile-page-workspace" data-admin-root>
        <header class="workspace__topbar product-page-topbar profile-topbar">
            <div>
                <span class="workspace__kicker">PROFILE · ADMIN PANEL</span>
                <h1>个人空间 <span class="profile-role admin">管理员</span></h1>
            </div>
            <div class="workspace__actions">
                <div class="profile-chip">
                    <span class="avatar avatar--small" data-admin-avatar style="background:#ffccc7;color:#ff4d4f;">管</span>
                    <span data-admin-name>管理员</span>
                </div>
            </div>
        </header>

        <section class="profile-content">

            <!-- 统计卡片 -->
            <div class="admin-stats" style="margin-top:16px;">
                <div class="stat-item"><strong data-stat-pending-tasks>0</strong><span>待审核任务</span></div>
                <div class="stat-item"><strong data-stat-pending-products>0</strong><span>待审核商品</span></div>
                <div class="stat-item"><strong data-stat-users>0</strong><span>注册用户</span></div>
                <div class="stat-item"><strong data-stat-tasks>0</strong><span>全部任务</span></div>
            </div>

            <!-- Tabs -->
            <div class="market-tools" style="margin-top:0; padding-bottom:16px; border-bottom: 1px solid #eff5f3;">
                <button class="sort-pill sort-pill--active" type="button" data-admin-tab="tasks">📋 待审核任务</button>
                <button class="sort-pill" type="button" data-admin-tab="products">🛒 待审核商品</button>
                <button class="sort-pill" type="button" data-admin-tab="users">👥 用户管理</button>
            </div>

            <!-- 审核状态筛选（任务/商品 Tab 下显示） -->
            <div class="category-row" data-admin-audit-filter style="padding-top:14px;">
                <span class="tool-label">状态</span>
                <button class="category-chip category-chip--active" type="button" data-audit-filter="pending">待审核</button>
                <button class="category-chip" type="button" data-audit-filter="approved">已通过</button>
                <button class="category-chip" type="button" data-audit-filter="rejected">已驳回</button>
                <button class="category-chip" type="button" data-audit-filter="">全部</button>
            </div>

            <!-- 用户搜索（用户 Tab 下显示） -->
            <div class="user-search" data-admin-user-search style="display:none; padding-top:14px;">
                <input type="text" data-admin-user-search-input placeholder="🔍 搜索用户（账号/昵称）">
                <button class="btn-search" type="button">搜索</button>
            </div>

            <!-- 列表容器 -->
            <div data-admin-list></div>

        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/admin.js"></script>
</body>
</html>
