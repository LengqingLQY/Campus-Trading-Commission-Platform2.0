<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/secondhand.css">
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
                <div class="market-counter">
                    <strong>06</strong>
                    <span>待接取</span>
                </div>
                <a class="profile-chip market-publish-button" href="task-publish.jsp">
                    <span class="plus-symbol" aria-hidden="true">＋</span>
                    <span>发布任务</span>
                </a>
            </div>
        </header>

        <section class="market-content" aria-label="跑腿任务展示区域">
            <!-- ===== 顶部横幅 ===== -->
            <div class="market-banner">
                <div class="banner-copy">
                    <span class="banner-label">校园跑腿 · CAMPUS ERRAND</span>
                    <h2>需要帮忙？<br><em>发布一个任务吧。</em></h2>
                    <p>取快递、带饭、占座、代买……校园里的每一件小事，都可以在这里找到愿意帮忙的同学。</p>
                    <div class="banner-meta">
                        <span>● 校园内互助</span>
                        <span>● 跑腿费仅作信息记录</span>
                    </div>
                </div>
                <div class="banner-art" aria-hidden="true">
                    <div class="art-ring art-ring--large"></div>
                    <div class="art-ring art-ring--small"></div>
                    <div class="art-card art-card--task">📦</div>
                    <div class="art-card art-card--delivery">🚚</div>
                    <span class="art-spark art-spark--one">✦</span>
                    <span class="art-spark art-spark--two">✧</span>
                    <span class="art-dot art-dot--one"></span>
                    <span class="art-dot art-dot--two"></span>
                </div>
            </div>

            <!-- ===== 搜索 & 排序 ===== -->
            <div class="market-tools">
                <div class="market-search">
                    <span class="search-icon" aria-hidden="true">⌕</span>
                    <input type="search" placeholder="搜索任务标题或说明" aria-label="搜索任务标题或说明">
                </div>
                <div class="market-sort" aria-label="任务排序">
                    <span class="tool-label">排序</span>
                    <a class="sort-pill sort-pill--active" href="#!">最新发布</a>
                    <a class="sort-pill" href="#!">最早发布</a>
                    <a class="sort-pill" href="#!">金额低 → 高</a>
                    <a class="sort-pill" href="#!">金额高 → 低</a>
                </div>
            </div>

            <!-- ===== 状态筛选 ===== -->
            <div class="category-row" aria-label="任务状态">
                <span class="tool-label">状态</span>
                <a class="category-chip category-chip--active" href="#!">全部</a>
                <a class="category-chip" href="#!">待接取</a>
                <a class="category-chip" href="#!">已接取</a>
                <a class="category-chip" href="#!">已送达</a>
                <a class="category-chip" href="#!">已完成</a>
                <a class="category-chip" href="#!">待审核</a>
            </div>

            <!-- ===== 列表头 ===== -->
            <div class="listing-head">
                <div>
                    <h2>当前任务</h2>
                    <p>审核通过的任务会在这里与同学见面</p>
                </div>
                <span class="listing-count">共 6 件</span>
            </div>

            <!-- ===== 任务卡片网格 ===== -->
            <div class="product-grid">

                <!-- 任务卡片 1：待接取 -->
                <article class="product-card product-card--task">
                    <a class="product-card__link" href="task-detail.jsp?taskId=1">
                        <div class="product-visual product-visual--mint">
                            <span class="visual-label">跑腿任务</span>
                            <span class="product-emoji" aria-hidden="true">📦</span>
                            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✦</span>
                        </div>
                        <div class="product-info">
                            <div class="product-tags">
                                <span class="category-tag">跑腿</span>
                                <span class="condition-tag">待接取</span>
                            </div>
                            <h3>帮取南区快递</h3>
                            <p class="product-description">中通快递，单号尾号8823，请送到7栋515宿舍。</p>
                            <div class="product-meta">
                                <span>⌖ 南区菜鸟驿站 → 7栋515</span>
                                <span>截止 今日 18:00</span>
                            </div>
                            <div class="product-footer">
                                <div class="product-price"><small>￥</small><strong>5</strong></div>
                                <span class="seller-name">爱丽丝发布</span>
                            </div>
                        </div>
                    </a>
                </article>

                <!-- 任务卡片 2：已接取 -->
                <article class="product-card product-card--task">
                    <a class="product-card__link" href="task-detail.jsp?taskId=2">
                        <div class="product-visual product-visual--sky">
                            <span class="visual-label">跑腿任务</span>
                            <span class="product-emoji" aria-hidden="true">🏃</span>
                            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✧</span>
                        </div>
                        <div class="product-info">
                            <div class="product-tags">
                                <span class="category-tag">跑腿</span>
                                <span class="condition-tag">已接取</span>
                            </div>
                            <h3>代拿药品（校医院）</h3>
                            <p class="product-description">校医院取药，凭取药单，急。</p>
                            <div class="product-meta">
                                <span>⌖ 校医院 → 紫金公寓2号楼</span>
                                <span>接取人：鲍勃</span>
                            </div>
                            <div class="product-footer">
                                <div class="product-price"><small>￥</small><strong>6</strong></div>
                                <span class="seller-name">爱丽丝发布</span>
                            </div>
                        </div>
                    </a>
                </article>

                <!-- 任务卡片 3：已完成 -->
                <article class="product-card product-card--task">
                    <a class="product-card__link" href="task-detail.jsp?taskId=3">
                        <div class="product-visual product-visual--peach">
                            <span class="visual-label">跑腿任务</span>
                            <span class="product-emoji" aria-hidden="true">✅</span>
                            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✦</span>
                        </div>
                        <div class="product-info">
                            <div class="product-tags">
                                <span class="category-tag">跑腿</span>
                                <span class="condition-tag">已完成</span>
                            </div>
                            <h3>代取教材</h3>
                            <p class="product-description">论文已发邮箱，双面打印装订。</p>
                            <div class="product-meta">
                                <span>⌖ 教材科 → 2教203</span>
                                <span>已送达 2026-08-25</span>
                            </div>
                            <div class="product-footer">
                                <div class="product-price"><small>￥</small><strong>10</strong></div>
                                <span class="seller-name">鲍勃发布</span>
                            </div>
                        </div>
                    </a>
                </article>

                <!-- 任务卡片 4：待审核 -->
                <article class="product-card product-card--task">
                    <a class="product-card__link" href="task-detail.jsp?taskId=4">
                        <div class="product-visual product-visual--lemon">
                            <span class="visual-label">跑腿任务</span>
                            <span class="product-emoji" aria-hidden="true">⏳</span>
                            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✧</span>
                        </div>
                        <div class="product-info">
                            <div class="product-tags">
                                <span class="category-tag">跑腿</span>
                                <span class="condition-tag">待审核</span>
                            </div>
                            <h3>图书馆送奶茶</h3>
                            <p class="product-description">南门取外卖，帮忙送到实验楼。</p>
                            <div class="product-meta">
                                <span>⌖ 北门茶百道 → 图书馆3楼</span>
                                <span>截止 明日 10:00</span>
                            </div>
                            <div class="product-footer">
                                <div class="product-price"><small>￥</small><strong>8</strong></div>
                                <span class="seller-name">爱丽丝发布</span>
                            </div>
                        </div>
                    </a>
                </article>

                <!-- 任务卡片 5：已送达 -->
                <article class="product-card product-card--task">
                    <a class="product-card__link" href="task-detail.jsp?taskId=5">
                        <div class="product-visual product-visual--mint">
                            <span class="visual-label">跑腿任务</span>
                            <span class="product-emoji" aria-hidden="true">🚚</span>
                            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✦</span>
                        </div>
                        <div class="product-info">
                            <div class="product-tags">
                                <span class="category-tag">跑腿</span>
                                <span class="condition-tag">已送达</span>
                            </div>
                            <h3>带一份三食堂糖醋排骨</h3>
                            <p class="product-description">已经送到宿舍楼下，等发布者确认收到。</p>
                            <div class="product-meta">
                                <span>⌖ 三食堂 → 紫金公寓2号楼</span>
                                <span>已送达 今日 12:30</span>
                            </div>
                            <div class="product-footer">
                                <div class="product-price"><small>￥</small><strong>4</strong></div>
                                <span class="seller-name">爱丽丝发布</span>
                            </div>
                        </div>
                    </a>
                </article>

                <!-- 任务卡片 6：已驳回 -->
                <article class="product-card product-card--task">
                    <a class="product-card__link" href="task-detail.jsp?taskId=6">
                        <div class="product-visual product-visual--sky">
                            <span class="visual-label">跑腿任务</span>
                            <span class="product-emoji" aria-hidden="true">🚫</span>
                            <span class="visual-doodle visual-doodle--task" aria-hidden="true">✧</span>
                        </div>
                        <div class="product-info">
                            <div class="product-tags">
                                <span class="category-tag">跑腿</span>
                                <span class="condition-tag">已驳回</span>
                            </div>
                            <h3>帮忙排队买演唱会票</h3>
                            <p class="product-description">线下排队代抢票，价格好商量。</p>
                            <div class="product-meta">
                                <span>⌖ 市中心售票点 → 学校北门</span>
                                <span>驳回理由：涉及校外代抢票</span>
                            </div>
                            <div class="product-footer">
                                <div class="product-price"><small>￥</small><strong>50</strong></div>
                                <span class="seller-name">鲍勃发布</span>
                            </div>
                        </div>
                    </a>
                </article>

            </div>
            <!-- /product-grid -->
        </section>
    </main>
</div>
</body>
</html>