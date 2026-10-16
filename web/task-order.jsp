<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css?v=20260909-1733">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/rating.css">
    <link rel="stylesheet" href="css/functional.css?v=20260909-1733">
    <title>CTCP · 跑腿订单进度</title>
</head>
<body class="app-page app-page--secondhand">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace order-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div><span class="workspace__kicker">ERRAND · TASK FLOW</span><h1>跑腿订单进度</h1></div>
        </header>
        <div class="order-detail-root" data-task-order-detail>
            <div class="loading-state"><span class="button-spinner"></span><p>正在读取跑腿订单...</p></div>
        </div>
    </main>
</div>
<script src="js/api.js?v=20260909-2218"></script>
<script src="js/rating.js"></script>
<script src="js/task-order.js"></script>
</body>
</html>
