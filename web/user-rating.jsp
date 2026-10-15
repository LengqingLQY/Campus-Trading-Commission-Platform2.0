<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css?v=20260909-1733">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/profile.css">
    <link rel="stylesheet" href="css/rating.css">
    <link rel="stylesheet" href="css/functional.css?v=20260909-1733">
    <title>用户信誉 · CTCP</title>
</head>
<body class="app-page app-page--profile">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace profile-page-workspace">
        <header class="workspace__topbar product-page-topbar profile-topbar">
            <div>
                <span class="workspace__kicker">USER · CREDIBILITY</span>
                <h1>用户信誉</h1>
            </div>
        </header>

        <section class="profile-content" data-user-rating-root>
            <div class="loading-state"><span class="button-spinner"></span><p>正在加载用户评分...</p></div>
        </section>
    </main>
</div>
<script src="js/api.js?v=20260909-2218"></script>
<script src="js/rating.js"></script>
<script src="js/user-rating.js"></script>
</body>
</html>
