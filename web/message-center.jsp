<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css?v=20260909-1733">
    <link rel="stylesheet" href="css/functional.css?v=20260909-1733">
    <link rel="stylesheet" href="css/message-center.css">
    <title>CTCP · 消息中心</title>
</head>
<body class="app-page app-page--messages">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace message-workspace">
        <header class="workspace__topbar message-topbar">
            <div>
                <span class="workspace__kicker">NOTIFICATIONS · 消息中心</span>
                <h1>消息中心</h1>
            </div>
            <div class="message-topbar__actions">
                <span class="message-unread-hint" data-unread-hint></span>
                <button class="primary-action" type="button" data-mark-all>全部已读</button>
            </div>
        </header>

        <div class="message-center" data-message-center>
            <div class="msg-toolbar">
                <div class="msg-filter-group" data-category-filter>
                    <button type="button" class="msg-filter is-active" data-category="all">全部</button>
                    <button type="button" class="msg-filter" data-category="audit">审核</button>
                    <button type="button" class="msg-filter" data-category="order">订单</button>
                    <button type="button" class="msg-filter" data-category="termination">终止申请</button>
                </div>
                <div class="msg-filter-group" data-state-filter>
                    <button type="button" class="msg-filter is-active" data-state="all">全部消息</button>
                    <button type="button" class="msg-filter" data-state="unread">仅未读</button>
                </div>
            </div>

            <div class="msg-new-banner" data-new-banner hidden>
                <span>有新消息</span>
                <button type="button" class="secondary-action" data-refresh>点击刷新</button>
            </div>

            <div class="msg-list" data-message-list>
                <div class="loading-state"><span class="button-spinner"></span><p>正在加载消息...</p></div>
            </div>

            <div class="msg-pagination" data-pagination></div>
        </div>
    </main>
</div>
<script src="js/api.js?v=20260909-2218"></script>
<script src="js/message-center.js"></script>
</body>
</html>
