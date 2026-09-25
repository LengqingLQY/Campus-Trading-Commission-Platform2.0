package com.campus.errand.interceptor;

import com.campus.errand.pojo.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 管理员拦截器：拦截 /api/admin/**，session 里的 user 角色非 admin 时返回 403。
 *
 * 必须注册在 {@link AuthInterceptor} 之后，保证先完成登录校验（未登录 401），
 * 再在这里做角色校验（已登录但非管理员 403）。
 */
public class AdminInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        // CORS 预检放行，交由 Spring 的 CORS 处理器响应。
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        HttpSession session = request.getSession(false);
        User user = session == null ? null : (User) session.getAttribute("user");

        if (user == null || !"admin".equals(user.getRole())) {
            response.setStatus(403);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":403,\"msg\":\"无管理员权限\",\"data\":null}");
            return false;
        }
        return true;
    }
}
