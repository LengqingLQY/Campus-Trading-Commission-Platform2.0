<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css?v=20260909-1733">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/image-upload.css">
    <link rel="stylesheet" href="css/functional.css?v=20260909-1733">
    <link rel="stylesheet" href="css/listing.css">
    <title>CTCP · 商品详情</title>
</head>
<body class="app-page app-page--secondhand">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace listing-detail-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div><span class="workspace__kicker">SECOND-HAND · PRODUCT DETAIL</span><h1>商品详情</h1></div>
            <div class="workspace__actions">
                <a class="profile-chip market-publish-button" href="product-publish.jsp"><span>＋</span><span>发布商品</span></a>
            </div>
        </header>

        <section class="product-detail-layout" data-product-detail aria-label="商品详情内容">
            <div class="loading-state"><span class="button-spinner"></span><p>正在加载商品详情...</p></div>
        </section>
    </main>
</div>
<script src="js/api.js?v=20260909-2218"></script>
<script src="js/listing-gallery.js"></script>
<script src="js/listing-comments.js"></script>
<script src="js/product-detail.js"></script>
</body>
</html>
