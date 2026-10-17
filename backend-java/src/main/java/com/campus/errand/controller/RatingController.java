package com.campus.errand.controller;

import com.campus.errand.dto.RatingCreateDTO;
import com.campus.errand.pojo.Result;
import com.campus.errand.pojo.User;
import com.campus.errand.service.RatingService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class RatingController {
    private final RatingService ratingService;

    public RatingController(RatingService ratingService) { this.ratingService = ratingService; }

    @PostMapping("/product-orders/{id}/rating")
    public Result rateProduct(@PathVariable int id, @RequestBody RatingCreateDTO dto, HttpSession session) {
        return Result.ok(ratingService.rateProduct(id, currentUserId(session), dto));
    }

    @PostMapping("/task-orders/{id}/rating")
    public Result rateTask(@PathVariable int id, @RequestBody RatingCreateDTO dto, HttpSession session) {
        return Result.ok(ratingService.rateTask(id, currentUserId(session), dto));
    }

    @GetMapping("/task-orders/{id}")
    public Result taskOrder(@PathVariable int id, HttpSession session) {
        return Result.ok(ratingService.taskOrder(id, currentUserId(session)));
    }

    @GetMapping("/me/rating-orders")
    public Result orders(@RequestParam(defaultValue = "all") String state,
                         @RequestParam(defaultValue = "1") int page,
                         @RequestParam(defaultValue = "20") int size, HttpSession session) {
        return Result.ok(ratingService.orders(currentUserId(session), state, page, size));
    }

    @GetMapping("/public/users/{id}/rating")
    public Result publicRating(@PathVariable int id) { return Result.ok(ratingService.publicRating(id)); }

    private int currentUserId(HttpSession session) {
        return ((User) session.getAttribute("user")).getId();
    }
}
