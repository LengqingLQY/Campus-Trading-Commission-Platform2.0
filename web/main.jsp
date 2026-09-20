<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 发现首页</title>
</head>
<body class="app-page app-page--home">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace home-workspace">
        <header class="workspace__topbar home-topbar">
            <div>
                <span class="workspace__kicker">DISCOVER · CAMPUS TODAY</span>
                <h1><span data-home-user>同学</span>，今天想发现什么？</h1>
                <p class="home-subtitle">随机遇见一件好物，或回应一份校园互助。</p>
            </div>
            <div class="workspace__actions">
                <a class="home-search-link" href="secondhand.jsp"><span aria-hidden="true">⌕</span> 搜索二手商品</a>
                <a class="profile-chip home-publish-link" href="product-publish.jsp"><span aria-hidden="true">＋</span> 发布商品</a>
            </div>
        </header>

        <section class="home-layout" aria-label="校园发现与交易待办">
            <section class="discovery-panel">
                <div class="discovery-heading">
                    <div>
                        <span class="discovery-eyebrow">FOR YOU · 随机推荐</span>
                        <h2>也许正好是你感兴趣的</h2>
                        <p>商品与跑腿任务会在每次进入时随机组合，点击卡片即可查看详情。</p>
                    </div>
                    <button class="shuffle-button" type="button" data-action="refresh-recommendations">
                        <span aria-hidden="true">↻</span> 换一批
                    </button>
                </div>

                <p class="home-feedback" data-home-feedback aria-live="polite"></p>
                <div class="discovery-grid" data-recommendations>
                    <div class="loading-state"><span class="button-spinner"></span><p>正在为你挑选校园推荐...</p></div>
                </div>
            </section>

            <aside class="todo-panel" aria-label="进行中的二手交易">
                <div class="todo-panel__head">
                    <div>
                        <span class="discovery-eyebrow">MY TRADES</span>
                        <h2>交易待办</h2>
                    </div>
                    <span class="todo-count" data-todo-count>0</span>
                </div>
                <p class="todo-panel__intro">买家与卖家都可以从这里快速返回正在进行的交易。</p>
                <div class="todo-list" data-todos>
                    <div class="loading-state loading-state--compact"><span class="button-spinner"></span><p>正在整理待办...</p></div>
                </div>
                <div class="todo-safety">
                    <span aria-hidden="true">☼</span>
                    <p><strong>交易安全提示</strong><br>请选择校园公共区域交接，当面确认商品情况。</p>
                </div>
            </aside>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/domain.js"></script>
<script src="js/home.js"></script>
</body>
</html>
