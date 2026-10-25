package com.campus.errand.controller;

import com.campus.errand.dto.NotificationReadAllDTO;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.NotificationService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/notifications")
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) { this.service = service; }

    @GetMapping
    public Result list(@RequestParam(defaultValue = "all") String category,
                       @RequestParam(defaultValue = "all") String state,
                       @RequestParam(defaultValue = "1") int page,
                       @RequestParam(defaultValue = "20") int size, HttpSession session) {
        return Result.ok(service.list(userId(session), category, state, page, size));
    }

    @GetMapping("/unread-count")
    public Result counts(HttpSession session) { return Result.ok(service.counts(userId(session))); }

    @PutMapping("/{id}/read")
    public Result read(@PathVariable long id, HttpSession session) { return Result.ok(service.markRead(id, userId(session))); }

    @PutMapping("/read-all")
    public Result readAll(@RequestBody NotificationReadAllDTO dto, HttpSession session) {
        return Result.ok(service.markAll(userId(session), dto));
    }

    private int userId(HttpSession session) { return ((User) session.getAttribute("user")).getId(); }
}
