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
    <title>CTCP · 跑腿任务</title>
</head>
<body class="app-page app-page--task">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace market-workspace">
        <header class="workspace__topbar market-topbar">
            <div>
                <span class="workspace__kicker">ERRAND · CAMPUS SERVICE</span>
                <h1>跑腿任务 <span class="heading-note">发布 · 接取 · 完成</span></h1>
            </div>
            <div class="workspace__actions">
                <div class="market-counter"><strong data-task-count>00</strong><span>待接取</span></div>
                <a class="profile-chip market-publish-button" href="task-publish.jsp"><span class="plus-symbol">＋</span><span>发布任务</span></a>
            </div>
        </header>

        <section class="market-content" aria-label="跑腿任务展示区域">
            <div class="market-banner">
                <div class="banner-copy">
                    <span class="banner-label">校园跑腿 · CAMPUS ERRAND</span>
                    <h2>需要帮忙？<br><em>发布一个任务吧。</em></h2>
                    <p>取快递、带饭、占座、代买……校园里的每一件小事，都可以在这里找到愿意帮忙的同学。</p>
                    <div class="banner-meta"><span>● 校园内互助</span><span>● 跑腿费仅作信息记录</span></div>
                </div>
                <div class="banner-art" aria-hidden="true">
                    <div class="art-ring art-ring--large"></div><div class="art-ring art-ring--small"></div>
                    <div class="art-card art-card--task">📦</div><div class="art-card art-card--delivery">🚚</div>
                    <span class="art-spark art-spark--one">✦</span><span class="art-spark art-spark--two">✧</span>
                </div>
            </div>

            <div class="market-tools">
                <label class="market-search">
                    <span class="search-icon" aria-hidden="true">⌕</span>
                    <input type="search" data-task-search placeholder="搜索任务标题或说明" aria-label="搜索任务标题或说明">
                </label>
                <div class="market-sort" aria-label="任务排序">
                    <span class="tool-label">排序</span>
                    <button class="sort-pill sort-pill--active" type="button" data-sort="time_desc">最新发布</button>
                    <button class="sort-pill" type="button" data-sort="time_asc">最早发布</button>
                    <button class="sort-pill" type="button" data-sort="amount_asc">金额低 → 高</button>
                    <button class="sort-pill" type="button" data-sort="amount_desc">金额高 → 低</button>
                </div>
            </div>

            <div class="category-row" aria-label="任务状态">
                <span class="tool-label">状态</span>
                <button class="category-chip category-chip--active" type="button" data-status="">全部</button>
                <button class="category-chip" type="button" data-status="open">待接取</button>
                <button class="category-chip" type="button" data-status="accepted">已接取</button>
                <button class="category-chip" type="button" data-status="delivered">已送达</button>
                <button class="category-chip" type="button" data-status="completed">已完成</button>
            </div>

            <div class="listing-head">
                <div><h2>当前任务</h2><p>审核通过的任务会在这里与同学见面</p></div>
                <span class="listing-count" data-task-count-label>加载中</span>
            </div>

            <div class="product-grid functional-product-grid" data-task-grid>
                <div class="loading-state"><span class="button-spinner"></span><p>正在加载跑腿任务...</p></div>
            </div>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/task.js"></script>
</body>
</html>