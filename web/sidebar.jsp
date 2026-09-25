<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<aside class="sidebar">
    <div class="sidebar__glow sidebar__glow--top" aria-hidden="true"></div>
    <div class="sidebar__glow sidebar__glow--bottom" aria-hidden="true"></div>

    <div class="sidebar__brand">
        <a class="brand-link" href="main.jsp">
            <span class="brand-mark brand-mark--sidebar">C</span>
            <span class="brand-copy">
                <strong>CTCP</strong>
                <small>校园连接计划</small>
            </span>
        </a>
        <span class="brand-spark" aria-hidden="true">✦</span>
    </div>

    <div class="sidebar__profile">
        <div class="avatar" data-user-avatar>同</div>
        <div class="profile-copy">
            <strong><span data-user-name>同学</span>，你好</strong>
            <small>今天也要元气满满</small>
        </div>
        <span class="profile-status" aria-label="在线"></span>
    </div>

    <nav class="sidebar__nav" aria-label="校园导航">
        <p class="nav-caption">功能导航</p>
        <ul>
            <li>
                <a class="nav-link nav-link--home" href="main.jsp">
                    <span class="nav-icon" aria-hidden="true">⌂</span>
                    <span>发现首页</span>
                </a>
            </li>
            <li>
                <a class="nav-link nav-link--task" href="task-hall.jsp">
                    <span class="nav-icon" aria-hidden="true">↗</span>
                    <span>跑腿任务</span>
                </a>
            </li>
            <li>
                <a class="nav-link nav-link--secondhand" href="secondhand.jsp">
                    <span class="nav-icon" aria-hidden="true">◇</span>
                    <span>二手交易</span>
                </a>
            </li>
            <li>
                <a class="nav-link nav-link--profile" href="profile-user.jsp">
                    <span class="nav-icon" aria-hidden="true">☻</span>
                    <span>个人空间</span>
                </a>
            </li>
            <li>
                <a class="nav-link nav-link--admin" href="profile-admin.jsp" data-admin-link style="display:none;">
                    <span class="nav-icon" aria-hidden="true">⚙</span>
                    <span>管理员面板</span>
                </a>
            </li>
        </ul>
    </nav>

    <div class="sidebar__bottom">
        <div class="tip-card">
            <span class="tip-card__icon" aria-hidden="true">☀</span>
            <p><strong>校园小贴士</strong><br><span>让闲置物品遇见真正需要它的人。</span></p>
        </div>
        <a class="sidebar-logout" href="index.jsp" data-action="logout">
            <span aria-hidden="true">↩</span>
            <span>退出登录</span>
        </a>
    </div>
</aside>