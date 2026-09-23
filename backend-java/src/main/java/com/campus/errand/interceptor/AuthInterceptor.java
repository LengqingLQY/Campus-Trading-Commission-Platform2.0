package com.campus.errand.interceptor;

import com.campus.errand.pojo.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录拦截器：拦截 /api/** 中除公开接口外的所有请求，
 * session 里没有 user 时直接返回 401，请求不再向下传递。
 *
 * 公开接口（/api/register、/api/login、/api/public/**）由 WebConfig 排除，
 * 因此无需在这里判断路径。
 */
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        HttpSession session = request.getSession(false);
        User user = session == null ? null : (User) session.getAttribute("user");

        if (user == null) {
            response.setStatus(401);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"msg\":\"请先登录\",\"data\":null}");
            return false;
        }
        return true;
    }
}
