<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/secondhand.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 二手交易</title>
</head>
<body class="app-page app-page--secondhand">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace market-workspace">
        <header class="workspace__topbar market-topbar">
            <div>
                <span class="workspace__kicker">SECOND-HAND · CAMPUS MARKET</span>
                <h1>二手交易 <span class="heading-note">让闲置再次发光</span></h1>
            </div>
            <div class="workspace__actions">
                <div class="market-counter"><strong data-today-count>00</strong><span>在售好物</span></div>
                <a class="profile-chip market-publish-button" href="product-publish.jsp"><span class="plus-symbol">＋</span><span>发布商品</span></a>
            </div>
        </header>

        <section class="market-content" aria-label="二手商品展示区域">
            <div class="market-banner">
                <div class="banner-copy">
                    <span class="banner-label">校园闲置小集 · CAMPUS MARKET</span>
                    <h2>好物不闲置，<br><em>刚好遇见你。</em></h2>
                    <p>搜索需要的物品，查看真实信息，购买后与卖家在校园内完成交接。</p>
                    <div class="banner-meta"><span>● 校园内见面交易</span><span>● 不接入在线支付</span></div>
                </div>
                <div class="banner-art" aria-hidden="true">
                    <div class="art-ring art-ring--large"></div><div class="art-ring art-ring--small"></div>
                    <div class="art-card art-card--book">📚</div><div class="art-card art-card--ball">🏀</div>
                    <span class="art-spark art-spark--one">✦</span><span class="art-spark art-spark--two">✧</span>
                </div>
            </div>

            <div class="market-tools">
                <label class="market-search">
                    <span class="search-icon" aria-hidden="true">⌕</span>
                    <input type="search" data-product-search placeholder="搜索商品标题或描述" aria-label="搜索商品标题或描述">
                </label>
                <div class="market-sort" aria-label="商品排序">
                    <span class="tool-label">排序</span>
                    <button class="sort-pill sort-pill--active" type="button" data-sort="time_desc">最新发布</button>
                    <button class="sort-pill" type="button" data-sort="time_asc">最早发布</button>
                    <button class="sort-pill" type="button" data-sort="price_asc">价格低 → 高</button>
                    <button class="sort-pill" type="button" data-sort="price_desc">价格高 → 低</button>
                </div>
            </div>

            <div class="category-row" aria-label="商品分类">
                <span class="tool-label">分类</span>
                <button class="category-chip category-chip--active" type="button" data-category="">全部</button>
                <button class="category-chip" type="button" data-category="book">图书教材</button>
                <button class="category-chip" type="button" data-category="electronic">电子数码</button>
                <button class="category-chip" type="button" data-category="daily">生活日用</button>
                <button class="category-chip" type="button" data-category="clothing">服饰鞋帽</button>
                <button class="category-chip" type="button" data-category="sports">运动户外</button>
                <button class="category-chip" type="button" data-category="other">其他</button>
            </div>

            <div class="listing-head">
                <div><h2>校园好物</h2><p>点击商品卡片查看详情，并进入购买流程</p></div>
                <span class="listing-count" data-product-count>加载中</span>
            </div>

            <div class="product-grid functional-product-grid" data-product-grid>
                <div class="loading-state"><span class="button-spinner"></span><p>正在寻找校园好物...</p></div>
            </div>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/market.js"></script>
</body>
</html>
