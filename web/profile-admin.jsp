<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/profile.css">
    <title>管理员 · 个人空间 · CTCP</title>
</head>
<body class="app-page app-page--profile">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace profile-page-workspace">
        <header class="workspace__topbar product-page-topbar profile-topbar">
            <div>
                <span class="workspace__kicker">PROFILE · ADMIN PANEL</span>
                <h1>个人空间 <span class="profile-role admin">管理员</span></h1>
            </div>
            <div class="workspace__actions">
                <button class="profile-chip" type="button">
                    <span class="avatar avatar--small" style="background:#ffccc7;color:#ff4d4f;">管</span>
                    <span>管理员</span>
                </button>
            </div>
        </header>

        <section class="profile-content">

            <!-- ========================================================= -->
            <!-- 上半部分：管理员资料                                       -->
            <!-- ========================================================= -->
            <div class="profile-card">
                <div class="section-heading">
                    <span class="section-heading__number">👤</span>
                    <div>
                        <h2>管理员资料</h2>
                        <p>查看和修改管理员信息</p>
                    </div>
                </div>

                <div class="profile-avatar-row">
                    <span class="profile-avatar-lg admin">管</span>
                    <div>
                        <span class="profile-name">系统管理员</span>
                        <span class="profile-role admin">管理员</span>
                        <p class="profile-contact">QQ：— &nbsp;|&nbsp; 微信：— &nbsp;|&nbsp; 电话：—</p>
                    </div>
                </div>

                <form class="publish-form">
                    <div class="publish-form-grid">
                        <div class="form-field">
                            <label for="edit-username">用户名</label>
                            <input type="text" id="edit-username" value="系统管理员">
                        </div>
                        <div class="form-field">
                            <label for="edit-qq">QQ</label>
                            <input type="text" id="edit-qq" placeholder="未设置">
                        </div>
                        <div class="form-field">
                            <label for="edit-wechat">微信</label>
                            <input type="text" id="edit-wechat" placeholder="未设置">
                        </div>
                        <div class="form-field">
                            <label for="edit-phone">电话</label>
                            <input type="text" id="edit-phone" placeholder="未设置">
                        </div>
                        <div class="form-field form-field--full">
                            <label for="edit-password">重置密码</label>
                            <input type="password" id="edit-password" placeholder="输入新密码（不填则不修改）">
                        </div>
                    </div>
                    <div class="publish-actions">
                        <button class="primary-action" type="button">💾 保存修改</button>
                        <a class="secondary-action" href="#!">取消</a>
                    </div>
                    <p class="security-hint">🔒 密码使用哈希存储，不显示明文</p>
                </form>
            </div>

            <!-- ========================================================= -->
            <!-- 下半部分：管理面板                                         -->
            <!-- ========================================================= -->
            <div class="profile-records">
                <div class="section-heading" style="border-bottom: none; padding-bottom: 0;">
                    <span class="section-heading__number">⚙️</span>
                    <div>
                        <h2>管理面板</h2>
                        <p>审核 · 删除 · 用户管理</p>
                    </div>
                </div>

                <!-- 统计卡片 -->
                <div class="admin-stats" style="margin-top:16px;">
                    <div class="stat-item"><strong>3</strong><span>待审核任务</span></div>
                    <div class="stat-item"><strong>1</strong><span>待审核商品</span></div>
                    <div class="stat-item"><strong>4</strong><span>注册用户</span></div>
                    <div class="stat-item"><strong>0</strong><span>举报待处理</span></div>
                </div>

                <!-- Tabs -->
                <div class="market-tools" style="margin-top:0; padding-bottom:16px; border-bottom: 1px solid #eff5f3;">
                    <a class="sort-pill sort-pill--active" href="#!">📋 待审核任务</a>
                    <a class="sort-pill" href="#!">🛒 待审核商品</a>
                    <a class="sort-pill" href="#!">👥 用户管理</a>
                </div>

                <!-- Tab 1：待审核任务 -->
                <div>

                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">代拿药品（校医院）</span>
                            <span class="status-tag pending" style="margin-left:6px;">待审核</span>
                            <p class="admin-meta">发布者：爱丽丝 · 金额：6.00 元</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-approve">✅ 通过</button>
                            <button class="btn-sm btn-reject">❌ 驳回</button>
                        </div>
                    </div>

                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">帮忙排队买演唱会票</span>
                            <span class="status-tag pending" style="margin-left:6px;">待审核</span>
                            <p class="admin-meta">发布者：鲍勃 · 金额：50.00 元</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-approve">✅ 通过</button>
                            <button class="btn-sm btn-reject">❌ 驳回</button>
                        </div>
                    </div>

                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">图书馆占座并带份早餐</span>
                            <span class="status-tag pending" style="margin-left:6px;">待审核</span>
                            <p class="admin-meta">发布者：卡罗尔 · 金额：3.00 元</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-approve">✅ 通过</button>
                            <button class="btn-sm btn-reject">❌ 驳回</button>
                        </div>
                    </div>

                    <div class="admin-hint">
                        💡 「通过」→ 任务出现在普通用户列表 &nbsp;|&nbsp; 「驳回」→ 需填写驳回理由
                    </div>
                </div>

                <!-- Tab 2：待审核商品（占位） -->
                <div style="display:none;">
                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">宿舍护眼小台灯</span>
                            <span class="status-tag pending" style="margin-left:6px;">待审核</span>
                            <p class="admin-meta">卖家：卡罗尔 · 价格：15.00 元</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-approve">✅ 通过</button>
                            <button class="btn-sm btn-reject">❌ 驳回</button>
                        </div>
                    </div>
                </div>

                <!-- Tab 3：用户管理（占位） -->
                <div style="display:none;">
                    <div class="user-search">
                        <input type="text" placeholder="🔍 搜索用户（账号/昵称）">
                        <button class="btn-search">搜索</button>
                    </div>

                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">爱丽丝</span>
                            <span class="status-tag" style="margin-left:6px;">普通用户</span>
                            <p class="admin-meta">QQ:10001 · 微信:wx_alice · 138****0001</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-edit">✏️ 编辑</button>
                            <button class="btn-sm btn-reset">🔒 重置密码</button>
                        </div>
                    </div>

                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">鲍勃</span>
                            <span class="status-tag" style="margin-left:6px;">普通用户</span>
                            <p class="admin-meta">QQ:10002 · 微信:wx_bob · 138****0002</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-edit">✏️ 编辑</button>
                            <button class="btn-sm btn-reset">🔒 重置密码</button>
                        </div>
                    </div>

                    <div class="admin-item">
                        <div class="admin-info">
                            <span class="admin-title">卡罗尔</span>
                            <span class="status-tag" style="margin-left:6px;">普通用户</span>
                            <p class="admin-meta">QQ:10003 · 微信:wx_carol · 138****0003</p>
                        </div>
                        <div class="admin-actions">
                            <button class="btn-sm btn-edit">✏️ 编辑</button>
                            <button class="btn-sm btn-reset">🔒 重置密码</button>
                        </div>
                    </div>

                    <div class="admin-hint">
                        💡 点击「编辑」可修改用户名、QQ、微信、电话 &nbsp;|&nbsp; 「重置密码」需二次确认
                    </div>
                </div>

                <div class="records-footer">
                    <span>📊 待审核任务：3 条</span>
                    <span>待审核商品：1 条</span>
                    <span>注册用户：4 人</span>
                </div>

                <div class="records-tab-hint">
                    <span>💡 Tab2「待审核商品」：审核二手商品</span>
                    <span>💡 Tab3「用户管理」：查看/编辑用户资料</span>
                </div>
            </div>

        </section>
    </main>
</div>
</body>
</html>