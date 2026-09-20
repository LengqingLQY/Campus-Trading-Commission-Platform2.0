<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 二手交易进度</title>
</head>
<body class="app-page app-page--secondhand">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace order-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div><span class="workspace__kicker">SECOND-HAND · TRADE FLOW</span><h1>交易进度</h1></div>
            <div class="workspace__actions"><a class="back-link" href="main.jsp">← 返回发现首页</a></div>
        </header>
        <div class="order-detail-root" data-order-detail>
            <div class="loading-state"><span class="button-spinner"></span><p>正在读取交易记录...</p></div>
        </div>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/domain.js"></script>
<script src="js/product-order.js"></script>
</body>
</html>
