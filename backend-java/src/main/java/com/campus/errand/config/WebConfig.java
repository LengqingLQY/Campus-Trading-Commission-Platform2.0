package com.campus.errand.config;

import com.campus.errand.interceptor.AdminInterceptor;
import com.campus.errand.interceptor.AuthInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 注册登录拦截器。
 *
 * 公开接口统一使用 /api/public/ 前缀（另加 /api/register、/api/login），
 * 与需登录接口在路径层面完全分开，因此 POST /api/tasks 等写接口能被正常拦截，
 * 无需在每个 Controller 里重复判断登录。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /** 图片/头像上传目录，与 application.properties 的 app.upload.dir 对应。 */
    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new AuthInterceptor())
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/register",
                        "/api/login",
                        "/api/public/**");

        // 管理员接口：注册在 AuthInterceptor 之后，先登录校验（401）、再角色校验（403）。
        registry.addInterceptor(new AdminInterceptor())
                .addPathPatterns("/api/admin/**");
    }

    /**
     * 跨域：前端页面跑在 8080，后端 8081，属跨域请求。
     * 允许前端来源带 Cookie 调用（allowCredentials 必须配具体来源，不能用 *）。
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:8080", "http://127.0.0.1:8080")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    /**
     * 静态映射：把上传目录暴露为 /uploads/**，供 <img> 直接加载。
     * 图片用 <img> 标签跨域加载不受 CORS 限制，无需在此配跨域。
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = dir.toUri().toString();
        if (!location.endsWith("/")) {
            location += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}
