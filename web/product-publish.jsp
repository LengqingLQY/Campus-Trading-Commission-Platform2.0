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
    <title>CTCP · 发布商品</title>
</head>
<body class="app-page app-page--secondhand">
<div class="app-layout">
    <jsp:include page="sidebar.jsp" />

    <main class="workspace product-page-workspace">
        <header class="workspace__topbar product-page-topbar">
            <div><span class="workspace__kicker">SECOND-HAND · LIST AN ITEM</span><h1>发布一件二手好物</h1></div>
            <div class="workspace__actions"><a class="back-link" href="secondhand.jsp">← 返回商品列表</a></div>
        </header>

        <section class="publish-layout" aria-label="发布商品内容">
            <section class="publish-card">
                <div class="section-heading"><span class="section-heading__number">01</span><div><h2>填写商品信息</h2><p>真实、清楚的信息更容易遇见需要它的同学</p></div></div>

                <form class="publish-form" data-product-publish novalidate>
                    <div class="publish-form-grid">
                        <div class="form-field form-field--full"><label for="product-title">商品标题</label><input type="text" id="product-title" name="title" maxlength="80" placeholder="例如：九成新高等数学教材" required></div>
                        <div class="form-field">
                            <label for="product-category">商品分类</label>
                            <select id="product-category" name="category">
                                <option value="book">图书教材</option><option value="electronic">电子数码</option>
                                <option value="daily">生活日用</option><option value="clothing">服饰鞋帽</option>
                                <option value="sports">运动户外</option><option value="other">其他</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label for="product-condition">商品成色</label>
                            <select id="product-condition" name="condition">
                                <option value="new">全新</option><option value="almost_new">几乎全新</option>
                                <option value="good" selected>成色良好</option><option value="fair">有使用痕迹</option>
                            </select>
                        </div>
                        <div class="form-field"><label for="product-price">商品价格 <span>元</span></label><div class="field-with-prefix"><span>￥</span><input type="number" id="product-price" name="price" value="0" step="0.01" min="0"></div></div>
                        <div class="form-field"><label for="product-location">交易地点</label><input type="text" id="product-location" name="location" placeholder="例如：紫金公寓 2 号楼下"></div>
                        <div class="form-field form-field--full"><label for="product-contact">联系方式</label><input type="text" id="product-contact" name="contact" placeholder="QQ、微信或其他方便买家联系的方式"></div>
                        <div class="form-field form-field--full"><label for="product-description">商品描述</label><textarea id="product-description" name="description" rows="5" placeholder="介绍使用情况、尺寸、配件和需要特别说明的地方"></textarea></div>
                    </div>

                    <div class="publish-hint"><span class="publish-hint__icon">✦</span><p><strong>发布后需管理员审核</strong><br><span>审核通过后商品才会进入二手市场展示。</span></p></div>
                    <label class="publish-agreement" for="publish-agreement"><input type="checkbox" id="publish-agreement" name="agreement"><span>我确认商品信息真实有效，并同意在线下完成交易交接</span></label>
                    <p class="form-feedback" data-feedback aria-live="polite"></p>
                    <div class="publish-actions"><a class="secondary-action" href="secondhand.jsp">取消</a><button class="primary-action" type="submit"><span>立即发布</span><span>→</span></button></div>
                </form>
            </section>

            <aside class="publish-aside">
                <div class="publish-preview-card">
                    <div class="publish-preview-card__head"><span>发布预览</span><span class="preview-dots">•••</span></div>
                    <!-- ===== 图片上传区域 ===== -->
                    <div class="publish-preview-visual image-upload-zone" data-product-upload-zone>
                        <div class="image-upload-placeholder" data-upload-placeholder>
                            <span class="upload-icon">📷</span>
                            <span class="upload-text">点击上传图片</span>
                            <span class="upload-hint">支持 JPG、PNG，最多 3 张</span>
                        </div>
                        <div class="image-upload-grid" data-product-images></div>
                        <input type="file" id="productImageInput" accept="image/*" multiple style="display:none;">
                    </div>
                    <span class="preview-tag" data-preview-category>图书教材</span>
                    <h3 data-preview-title>你的商品标题</h3>
                    <p data-preview-description>填写描述后，这里会显示商品简介。</p>
                    <div class="preview-footer"><strong data-preview-price>￥ 0.00</strong><span>发布后在售</span></div>
                    <div class="preview-image-count" data-image-count>已上传 0/3</div>
                </div>
                <div class="publish-process"><h3>发布流程</h3><ol><li><span>01</span><p>填写真实商品信息</p></li><li><span>02</span><p>发布后进入二手市场</p></li><li><span>03</span><p>买家购买后线下交接</p></li></ol></div>
            </aside>
        </section>
    </main>
</div>
<script src="js/api.js"></script>
<script src="js/image-upload.js"></script>
<script src="js/product-publish.js"></script>
</body>
</html>
