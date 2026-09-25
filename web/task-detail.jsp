<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/image-upload.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 任务详情</title>
</head>
<body class="app-page app-page--task">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div><span class="workspace__kicker">ERRAND · TASK DETAIL</span><h1>任务详情</h1></div>
            <div class="workspace__actions">
                <a class="back-link" href="task-hall.jsp" data-detail-back>← 返回任务列表</a>
                <a class="profile-chip market-publish-button" href="task-publish.jsp"><span>＋</span><span>发布任务</span></a>
            </div>
        </header>

        <section class="product-detail-layout" data-task-detail aria-label="任务详情内容">
            <div class="loading-state"><span class="button-spinner"></span><p>正在加载任务详情...</p></div>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/task-detail.js"></script>
</body>
</html>