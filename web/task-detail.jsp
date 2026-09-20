<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/product.css">
    <title>CTCP · 任务详情</title>
</head>
<body class="app-page app-page--task">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div>
                <span class="workspace__kicker">ERRAND · TASK DETAIL</span>
                <h1>任务详情</h1>
            </div>
            <div class="workspace__actions">
                <a class="back-link" href="task-hall.jsp">← 返回任务列表</a>
                <a class="profile-chip market-publish-button" href="task-publish.jsp">
                    <span aria-hidden="true">＋</span>
                    <span>发布任务</span>
                </a>
            </div>
        </header>

        <section class="product-detail-layout" aria-label="任务详情内容">
            <div class="detail-media-column">
                <div class="detail-media detail-media--task">
                    <span class="detail-media__label">跑腿任务</span>
                    <span class="detail-media__emoji" aria-hidden="true">📦</span>
                    <span class="detail-media__spark detail-media__spark--one" aria-hidden="true">✦</span>
                    <span class="detail-media__spark detail-media__spark--two" aria-hidden="true">✧</span>
                    <span class="detail-media__circle detail-media__circle--one" aria-hidden="true"></span>
                    <span class="detail-media__circle detail-media__circle--two" aria-hidden="true"></span>
                </div>

                <div class="detail-note">
                    <span class="detail-note__icon" aria-hidden="true">☼</span>
                    <p><strong>校园互助</strong><br><span>接取后请及时联系发布者</span></p>
                </div>
            </div>

            <article class="detail-panel">
                <div class="detail-status-row">
                    <span class="detail-tag detail-tag--category">跑腿</span>
                    <span class="availability-badge">待接取</span>
                </div>

                <h2>帮取南区快递</h2>
                <p class="detail-subtitle">发布者：爱丽丝 · 发布时间：2026-08-24 14:30</p>

                <div class="detail-price"><small>￥</small><strong>5</strong><span>跑腿费 · 仅作信息记录</span></div>

                <div class="detail-divider"></div>

                <dl class="detail-facts">
                    <div>
                        <dt>取件地点</dt>
                        <dd>⌖ 南区菜鸟驿站</dd>
                    </div>
                    <div>
                        <dt>送达地点</dt>
                        <dd>⌖ 7栋宿舍515</dd>
                    </div>
                    <div>
                        <dt>截止时间</dt>
                        <dd>2026-08-25 18:00</dd>
                    </div>
                    <div>
                        <dt>跑腿金额</dt>
                        <dd>￥ 5.00</dd>
                    </div>
                    <div>
                        <dt>联系方式</dt>
                        <dd>QQ：10001</dd>
                    </div>
                    <div>
                        <dt>发布者</dt>
                        <dd class="seller-detail"><span class="avatar avatar--tiny">艾</span>爱丽丝</dd>
                    </div>
                </dl>

                <div class="detail-description">
                    <h3>任务说明</h3>
                    <p>中通快递，单号尾号8823，请帮忙送到7栋515宿舍。</p>
                </div>

                <div class="detail-actions">
                    <button class="primary-action" type="button">
                        <span>🤝 接取任务</span>
                        <span aria-hidden="true">→</span>
                    </button>
                    <a class="secondary-action" href="task-hall.jsp">再看看</a>
                </div>
                <p class="detail-footnote">接取后由双方在线下联系和交接，本页面暂不接入真实支付。</p>
            </article>
        </section>
    </main>
</div>
</body>
</html>