<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/product.css">
    <link rel="stylesheet" href="css/image-upload.css">
    <link rel="stylesheet" href="css/functional.css">
    <title>CTCP · 发布跑腿任务</title>
</head>
<body class="app-page app-page--task">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div><span class="workspace__kicker">ERRAND · PUBLISH TASK</span><h1>发布跑腿任务</h1></div>
            <div class="workspace__actions"><a class="back-link" href="task-hall.jsp">← 返回任务列表</a></div>
        </header>

        <section class="publish-layout" aria-label="发布任务内容">
            <section class="publish-card">
                <div class="section-heading">
                    <span class="section-heading__number">01</span>
                    <div><h2>填写任务信息</h2><p>告诉同学你需要什么帮助</p></div>
                </div>

                <form class="publish-form" data-task-publish novalidate>
                    <div class="publish-form-grid">
                        <div class="form-field form-field--full">
                            <label for="task-title">任务标题</label>
                            <input type="text" id="task-title" name="title" maxlength="80" placeholder="例如：帮取南区快递" required>
                        </div>
                        <div class="form-field form-field--full">
                            <label for="task-description">任务说明</label>
                            <textarea id="task-description" name="description" rows="4" placeholder="详细描述需要帮忙的内容、取件码、注意事项等"></textarea>
                        </div>
                        <div class="form-field">
                            <label for="task-pickup">取件地点</label>
                            <input type="text" id="task-pickup" name="pickup" placeholder="例如：南区菜鸟驿站">
                        </div>
                        <div class="form-field">
                            <label for="task-delivery">送达地点</label>
                            <input type="text" id="task-delivery" name="delivery" placeholder="例如：7栋宿舍515">
                        </div>
                        <div class="form-field">
                            <label for="task-deadline">截止时间 <span>选填</span></label>
                            <input type="datetime-local" id="task-deadline" name="deadline">
                        </div>
                        <div class="form-field">
                            <label for="task-amount">跑腿金额 <span>元</span></label>
                            <div class="field-with-prefix">
                                <span>￥</span>
                                <input type="number" id="task-amount" name="amount" value="0" step="0.5" min="0">
                            </div>
                        </div>
                        <div class="form-field form-field--full">
                            <label for="task-contact">联系方式 <span>选填</span></label>
                            <input type="text" id="task-contact" name="contact" placeholder="QQ、微信或电话，方便接取人联系你">
                        </div>
                    </div>

                    <div class="publish-hint">
                        <span class="publish-hint__icon">✦</span>
                        <p><strong>发布后需管理员审核</strong><br><span>审核通过后任务才会进入任务大厅展示。</span></p>
                    </div>

                    <label class="publish-agreement" for="publish-agreement">
                        <input type="checkbox" id="publish-agreement" name="agreement">
                        <span>我确认发布内容真实有效</span>
                    </label>

                    <p class="form-feedback" data-feedback aria-live="polite"></p>

                    <div class="publish-actions">
                        <a class="secondary-action" href="task-hall.jsp">取消</a>
                        <button class="primary-action" type="submit"><span>立即发布</span><span>→</span></button>
                    </div>
                </form>
            </section>

            <aside class="publish-aside">
                <div class="publish-preview-card">
                    <div class="publish-preview-card__head"><span>发布预览</span><span class="preview-dots">•••</span></div>

                    <!-- ===== 图片上传区域 ===== -->
                    <div class="publish-preview-visual image-upload-zone" data-task-upload-zone>
                        <div class="image-upload-placeholder" data-upload-placeholder>
                            <span class="upload-icon">📷</span>
                            <span class="upload-text">点击上传图片</span>
                            <span class="upload-hint">支持 JPG、PNG，最多 3 张</span>
                        </div>
                        <div class="image-upload-grid" data-task-images></div>
                        <input type="file" id="taskImageInput" accept="image/*" multiple style="display:none;">
                    </div>

                    <span class="preview-tag" data-preview-status>待接取</span>
                    <h3 data-preview-title>你的任务标题</h3>
                    <p data-preview-description>填写说明后，这里会显示任务简介。</p>
                    <div class="preview-footer">
                        <strong data-preview-amount>￥ 0.00</strong>
                        <span data-preview-deadline>时间待定</span>
                    </div>
                    <div class="preview-image-count" data-image-count>已上传 0/3</div>
                </div>

                <div class="publish-process">
                    <h3>发布流程</h3>
                    <ol>
                        <li><span>01</span><p>填写任务信息</p></li>
                        <li><span>02</span><p>发布后进入任务大厅</p></li>
                        <li><span>03</span><p>其他同学接取后完成</p></li>
                    </ol>
                </div>
            </aside>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/image-upload.js"></script>
<script src="js/task-publish.js"></script>
</body>
</html>