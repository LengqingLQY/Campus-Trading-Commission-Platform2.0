/**
 * 通用图片上传管理模块
 * 适用场景：跑腿发布、二手发布、个人空间头像等
 * 
 * 使用示例：
 *   var uploader = new ImageUploadManager({
 *       container: "[data-upload-zone]",     // 点击上传区域
 *       grid: "[data-image-grid]",           // 图片网格容器
 *       input: "#fileInput",                 // 文件输入框
 *       countEl: "[data-image-count]",       // 计数显示元素
 *       placeholderEl: "[data-placeholder]", // 占位提示元素
 *       max: 3,                              // 最大上传数量
 *       name: "imageUrls",                   // 隐藏字段名称
 *       form: "[data-form]",                 // 所属表单
 *       onUpload: function(file) {           // 真实上传回调
 *           var fd = new FormData();
 *           fd.append("file", file);
 *           return fetch("/api/upload", { method: "POST", body: fd })
 *               .then(r => r.json());
 *       }
 *   });
 *   
 *   // 获取已上传图片URL列表
 *   var urls = uploader.getImageUrls();
 *   
 *   // 重置
 *   uploader.reset();
 */
(function (global) {
    "use strict";

    function ImageUploadManager(config) {
        if (!config) {
            console.warn("ImageUploadManager: config is required");
            return;
        }

        this.config = Object.assign({
            max: 5,
            name: "imageUrls",
            onUpload: null,
            accept: "image/*"
        }, config);

        this.uploadedImages = [];
        this.container = document.querySelector(config.container);
        this.grid = document.querySelector(config.grid);
        this.input = document.querySelector(config.input);
        this.countEl = document.querySelector(config.countEl);
        this.placeholderEl = document.querySelector(config.placeholderEl);
        this.form = document.querySelector(config.form);

        if (!this.container || !this.grid || !this.input) {
            console.warn("ImageUploadManager: required elements not found");
            return this;
        }

        this.init();
        return this;
    }

    ImageUploadManager.prototype.init = function() {
        var self = this;
        this.updateUI();

        this.container.addEventListener("click", function(e) {
            if (e.target.closest(".image-remove")) return;
            if (self.uploadedImages.length >= self.config.max) {
                alert("最多上传 " + self.config.max + " 张图片");
                return;
            }
            self.input.click();
        });

        this.input.addEventListener("change", function() {
            var files = Array.from(this.files);
            if (self.uploadedImages.length + files.length > self.config.max) {
                alert("最多上传 " + self.config.max + " 张图片");
                this.value = "";
                return;
            }
            files.forEach(function(file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert("图片 \"" + file.name + "\" 超过 5MB，请压缩后重试");
                    return;
                }
                var reader = new FileReader();
                var tempId = "temp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
                reader.onload = function(e) {
                    var tempUrl = e.target.result;
                    self.uploadedImages.push(tempUrl);
                    self.render();
                    self.updateHiddenField();

                    if (typeof self.config.onUpload === "function") {
                        self.config.onUpload(file).then(function(data) {
                            var url = data.url || data;
                            var idx = self.uploadedImages.indexOf(tempUrl);
                            if (idx !== -1) {
                                self.uploadedImages[idx] = url;
                                self.render();
                                self.updateHiddenField();
                            }
                        }).catch(function(error) {
                            console.error("图片上传失败:", error);
                            alert("图片上传失败，请稍后重试");
                            var idx = self.uploadedImages.indexOf(tempUrl);
                            if (idx !== -1) {
                                self.uploadedImages.splice(idx, 1);
                                self.render();
                                self.updateHiddenField();
                            }
                        });
                    }
                };
                reader.readAsDataURL(file);
            });
            this.value = "";
        });
    };

    ImageUploadManager.prototype.render = function() {
        var self = this;
        this.grid.innerHTML = "";
        this.uploadedImages.forEach(function(url, index) {
            var item = document.createElement("div");
            item.className = "image-item";
            item.innerHTML = '<img src="' + url + '" alt="图片 ' + (index + 1) + '">' +
                '<div class="image-overlay">' +
                '<button type="button" class="image-remove" data-index="' + index + '">✕</button>' +
                '</div>';
            self.grid.appendChild(item);
        });
        this.grid.querySelectorAll(".image-remove").forEach(function(btn) {
            btn.addEventListener("click", function(e) {
                e.stopPropagation();
                self.removeImage(parseInt(this.dataset.index));
            });
        });
        this.updateUI();
    };

    ImageUploadManager.prototype.removeImage = function(index) {
        this.uploadedImages.splice(index, 1);
        this.render();
        this.updateHiddenField();
    };

    ImageUploadManager.prototype.updateUI = function() {
        if (this.countEl) {
            this.countEl.textContent = "已上传 " + this.uploadedImages.length + "/" + this.config.max;
        }
        if (this.placeholderEl) {
            this.placeholderEl.style.display = this.uploadedImages.length === 0 ? "flex" : "none";
        }
        this.container.style.cursor = this.uploadedImages.length >= this.config.max ? "default" : "pointer";
    };

    ImageUploadManager.prototype.updateHiddenField = function() {
        var hidden = document.querySelector("input[name='" + this.config.name + "']");
        if (!hidden) {
            hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = this.config.name;
            if (this.form) {
                this.form.appendChild(hidden);
            }
        }
        hidden.value = this.uploadedImages.join(",");
    };

    ImageUploadManager.prototype.getImageUrls = function() {
        return this.uploadedImages.join(",");
    };

    ImageUploadManager.prototype.getImageList = function() {
        return this.uploadedImages.slice();
    };

    ImageUploadManager.prototype.reset = function() {
        this.uploadedImages = [];
        this.render();
        this.updateHiddenField();
        this.updateUI();
    };

    global.ImageUploadManager = ImageUploadManager;

})(window);