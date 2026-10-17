package com.campus.errand;

import com.campus.errand.dto.RatingCreateDTO;
import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.User;
import com.campus.errand.service.RatingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.concurrent.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 真正的 SQLite、Spring 事务和 HTTP 控制器集成测试，不连接 app.db。 */
@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class RatingIntegrationTest {
    private static final Path DATABASE = createOldDatabase();
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired RatingService ratingService;
    @Autowired ObjectMapper mapper;

    private static Path createOldDatabase() {
        try {
            Path db = Files.createTempDirectory("ctcp-rating-test-").resolve("test.db");
            try (var connection = DriverManager.getConnection("jdbc:sqlite:" + db);
                 var statement = connection.createStatement()) {
                String schema = Files.readString(Path.of("../backend/db/schema.sql"));
                // SQLite JDBC 的普通 Statement 每次执行一条语句。
                new ResourceDatabasePopulator(new org.springframework.core.io.ByteArrayResource(schema.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                        .populate(connection);
                statement.execute("DROP TABLE rating");
                statement.execute("INSERT INTO user(id,account,password_hash,username) VALUES(77,'existing','unused','迁移前用户')");
            }
            return db;
        } catch (Exception e) { throw new ExceptionInInitializerError(e); }
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:sqlite:" + DATABASE + "?busy_timeout=5000");
        registry.add("logging.level.org.springframework.jdbc.core", () -> "WARN");
    }

    @BeforeAll
    void startupMigratesOldDatabase() {
        assertEquals("迁移前用户", jdbc.queryForObject("SELECT username FROM user WHERE id=77", String.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM rating", Integer.class));
    }

    @BeforeEach
    void fixture() {
        for (String table : new String[]{"rating", "product_order", "task_order", "product", "task", "user"}) {
            jdbc.update("DELETE FROM " + table);
        }
        for (int id = 1; id <= 4; id++) {
            jdbc.update("INSERT INTO user(id,account,password_hash,username,qq,phone) VALUES(?,?,'unused',?,'private-qq','private-phone')",
                    id, "user" + id, "同学" + id);
        }
        for (int id = 1; id <= 4; id++) {
            String productStatus = id == 1 ? "completed" : id == 4 ? "on_sale" : "sold";
            String taskStatus = id == 1 ? "completed" : id == 2 ? "delivered" : "open";
            jdbc.update("INSERT INTO product(id,seller_id,title,price,status,audit_status) VALUES(?,2,?,12,?,'approved')",
                    id, "商品" + id, productStatus);
            jdbc.update("INSERT INTO task(id,publisher_id,title,pickup,delivery,amount,status,audit_status) VALUES(?,1,?,'图书馆','宿舍',8,?,'approved')",
                    id, "跑腿" + id, taskStatus);
        }
        for (int id = 1; id <= 3; id++) {
            String status = id == 1 ? "completed" : id == 2 ? "delivered" : "cancelled";
            jdbc.update("INSERT INTO product_order(id,product_id,seller_id,buyer_id,status,finished_at) VALUES(?,?,2,1,?,'2026-10-16 12:00:00')", id, id, status);
            jdbc.update("INSERT INTO task_order(id,task_id,publisher_id,accepter_id,status,finished_at) VALUES(?,?,1,2,?,'2026-10-16 12:00:00')", id, id, status);
        }
        // 同一资源的已终止历史订单；评价不能按商品/任务 ID 去重。
        jdbc.update("INSERT INTO product_order(id,product_id,seller_id,buyer_id,status) VALUES(4,1,2,3,'cancelled')");
        jdbc.update("INSERT INTO task_order(id,task_id,publisher_id,accepter_id,status) VALUES(4,1,1,3,'cancelled')");
    }

    private MockHttpSession session(int userId) {
        User user = new User();
        user.setId(userId);
        user.setRole("user");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("user", user);
        return session;
    }

    private ResultActions rate(String kind, int orderId, int userId, String stars) throws Exception {
        return mvc.perform(post("/api/" + kind + "-orders/" + orderId + "/rating")
                .session(session(userId)).contentType("application/json")
                .content("{\"stars\":" + stars + ",\"revieweeId\":3,\"revieweeRole\":\"fake\"}"));
    }

    @Test
    void fourDirectionsAggregateByReceivedRole() throws Exception {
        rate("product", 1, 1, "5").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revieweeId").value(2)).andExpect(jsonPath("$.data.revieweeRole").value("seller"));
        rate("product", 1, 2, "4").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revieweeId").value(1)).andExpect(jsonPath("$.data.revieweeRole").value("buyer"));
        rate("task", 1, 1, "1").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revieweeId").value(2)).andExpect(jsonPath("$.data.revieweeRole").value("seller"));
        rate("task", 1, 2, "3").andExpect(status().isOk())
                .andExpect(jsonPath("$.data.revieweeId").value(1)).andExpect(jsonPath("$.data.revieweeRole").value("buyer"));
        mvc.perform(get("/api/public/users/2/rating")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.seller.average").value(3.0)).andExpect(jsonPath("$.data.seller.count").value(2));
        mvc.perform(get("/api/public/users/1/rating")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.buyer.average").value(3.5)).andExpect(jsonPath("$.data.buyer.count").value(2));
        mvc.perform(get("/api/product-orders/1").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.myRatingStars").value(5)).andExpect(jsonPath("$.data.counterpartyRating.count").value(2));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "6", "1.5", "5.0", "\"5\"", "true", "null", "{}", "[]", "9223372036854775808"})
    void onlyJsonIntegersOneThroughFiveAreAccepted(String stars) throws Exception {
        for (String kind : new String[]{"product", "task"}) rate(kind, 1, 1, stars).andExpect(status().isBadRequest());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM rating", Integer.class));
    }

    @Test
    void rejectsMissingStarsAndUnauthenticatedRequests() throws Exception {
        mvc.perform(post("/api/product-orders/1/rating").session(session(1)).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/product-orders/1/rating").contentType("application/json").content("{\"stars\":5}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me/rating-orders")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/task-orders/1")).andExpect(status().isUnauthorized());
    }

    @Test
    void participantCompletionAndDuplicateRules() throws Exception {
        for (String kind : new String[]{"product", "task"}) {
            rate(kind, 999, 1, "5").andExpect(status().isNotFound());
            rate(kind, 1, 3, "5").andExpect(status().isForbidden());
            rate(kind, 2, 1, "5").andExpect(status().isConflict());
            rate(kind, 3, 1, "5").andExpect(status().isConflict());
            rate(kind, 4, 3, "5").andExpect(status().isConflict());
            rate(kind, 1, 1, "5").andExpect(status().isOk());
            rate(kind, 1, 1, "1").andExpect(status().isConflict());
        }
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM rating", Integer.class));
    }

    @Test
    void publicProfileHasExplicitEmptyScoresAndNoPrivateFields() throws Exception {
        mvc.perform(get("/api/public/users/4/rating")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(4)).andExpect(jsonPath("$.data.username").value("同学4"))
                .andExpect(jsonPath("$.data.buyer.average").hasJsonPath()).andExpect(jsonPath("$.data.buyer.average").value(nullValue()))
                .andExpect(jsonPath("$.data.buyer.count").value(0)).andExpect(jsonPath("$.data.seller.average").value(nullValue()))
                .andExpect(jsonPath("$.data.account").doesNotExist()).andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.qq").doesNotExist()).andExpect(jsonPath("$.data.phone").doesNotExist());
        mvc.perform(get("/api/public/users/999/rating")).andExpect(status().isNotFound());
    }

    @Test
    void softDeletedResourcesRetainOrderDetailsAndRatings() throws Exception {
        jdbc.update("UPDATE product SET is_deleted=1 WHERE id=1");
        jdbc.update("UPDATE task SET is_deleted=1 WHERE id=1");
        rate("product", 1, 1, "5").andExpect(status().isOk());
        rate("task", 1, 2, "4").andExpect(status().isOk());
        mvc.perform(get("/api/task-orders/1").session(session(2))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.taskTitle").value("跑腿1")).andExpect(jsonPath("$.data.viewerRole").value("accepter"))
                .andExpect(jsonPath("$.data.myRatingStars").value(4));
        mvc.perform(get("/api/product-orders/1").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productTitle").value("商品1"));
        mvc.perform(get("/api/me/rating-orders").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(2));
        mvc.perform(get("/api/task-orders/1").session(session(3))).andExpect(status().isForbidden());
        mvc.perform(get("/api/task-orders/999").session(session(1))).andExpect(status().isNotFound());
        mvc.perform(get("/api/public/tasks/1").session(session(1))).andExpect(status().isNotFound());
    }

    @Test
    void combinedHistorySupportsPaginationAndPendingFilter() throws Exception {
        for (int id = 10; id < 32; id++) {
            jdbc.update("INSERT INTO product(id,seller_id,title,status) VALUES(?,2,'更多历史','completed')", id);
            jdbc.update("INSERT INTO product_order(id,product_id,seller_id,buyer_id,status,finished_at) VALUES(?,?,2,1,'completed','2026-10-15 12:00:00')", id, id);
        }
        mvc.perform(get("/api/me/rating-orders").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(24)).andExpect(jsonPath("$.data.list", hasSize(20)));
        mvc.perform(get("/api/me/rating-orders?page=2").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list", hasSize(4)));
        rate("product", 1, 1, "5").andExpect(status().isOk());
        mvc.perform(get("/api/me/rating-orders?state=pending").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(23)).andExpect(jsonPath("$.data.list[0].kind").value("task"))
                .andExpect(jsonPath("$.data.list[0].counterpartRole").value("seller"))
                .andExpect(jsonPath("$.data.list[0].myRatingStars").value(nullValue()));
        mvc.perform(get("/api/me/rating-orders").session(session(3))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
        for (String query : new String[]{"state=bad", "page=0", "size=0", "size=51"}) {
            mvc.perform(get("/api/me/rating-orders?" + query).session(session(1))).andExpect(status().isBadRequest());
        }
    }

    @Test
    void publicListsAndDetailsExposeCorrectRoleAggregates() throws Exception {
        rate("product", 1, 1, "5").andExpect(status().isOk());
        rate("task", 1, 2, "4").andExpect(status().isOk());
        for (String endpoint : new String[]{"/public/products", "/public/products/4"}) {
            String data = endpoint.endsWith("/4") ? "$.data" : "$.data.list[0]";
            mvc.perform(get("/api" + endpoint)).andExpect(status().isOk())
                    .andExpect(jsonPath(data + ".sellerRatingAverage").value(5.0))
                    .andExpect(jsonPath(data + ".sellerRatingCount").value(1));
        }
        for (String endpoint : new String[]{"/public/tasks", "/public/tasks/4"}) {
            String data = endpoint.endsWith("/4") ? "$.data" : "$.data.list[0]";
            mvc.perform(get("/api" + endpoint)).andExpect(status().isOk())
                    .andExpect(jsonPath(data + ".publisherRatingAverage").value(4.0))
                    .andExpect(jsonPath(data + ".publisherRatingCount").value(1));
        }
    }

    @Test
    void taskDetailSuppliesParticipantIdentityAndStableOrderId() throws Exception {
        mvc.perform(get("/api/public/tasks/2").session(session(2))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewerRole").value("accepter")).andExpect(jsonPath("$.data.orderId").value(2));
        mvc.perform(get("/api/public/tasks/2").session(session(1))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewerRole").value("publisher")).andExpect(jsonPath("$.data.orderId").value(2));
        mvc.perform(get("/api/public/tasks/2").session(session(3))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.viewerRole").doesNotExist()).andExpect(jsonPath("$.data.orderId").doesNotExist());
    }

    @Test
    void concurrentDuplicateRequestsCreateExactlyOneRating() throws Exception {
        RatingCreateDTO dto = new RatingCreateDTO(mapper.readTree("5"));
        for (String kind : new String[]{"product", "task"}) {
            CyclicBarrier start = new CyclicBarrier(2);
            try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
                Callable<Integer> call = () -> {
                    start.await(5, TimeUnit.SECONDS);
                    try {
                        if (kind.equals("product")) ratingService.rateProduct(1, 1, dto);
                        else ratingService.rateTask(1, 1, dto);
                        return 0;
                    } catch (BizException e) { return e.getCode(); }
                };
                Future<Integer> first = executor.submit(call), second = executor.submit(call);
                assertEquals(java.util.Set.of(0, 409), java.util.Set.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)));
            }
        }
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM rating", Integer.class));
    }

    @Test
    void migrationIsRepeatableAndDatabaseConstraintsRemainActive() throws Exception {
        rate("product", 1, 1, "5").andExpect(status().isOk());
        new ResourceDatabasePopulator(new ClassPathResource("db/migrations/001-rating.sql")).execute(jdbc.getDataSource());
        assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM user", Integer.class));
        assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM product_order", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM rating", Integer.class));
        for (String sql : new String[]{
                "INSERT INTO rating(task_order_id,reviewer_id,reviewee_id,reviewee_role,stars) VALUES(1,1,2,'seller',2.5)",
                "INSERT INTO rating(product_order_id,task_order_id,reviewer_id,reviewee_id,reviewee_role,stars) VALUES(1,1,2,1,'buyer',4)",
                "INSERT INTO rating(task_order_id,reviewer_id,reviewee_id,reviewee_role,stars) VALUES(1,1,1,'buyer',4)"}) {
            assertThrows(DataAccessException.class, () -> jdbc.update(sql));
        }
    }
}
