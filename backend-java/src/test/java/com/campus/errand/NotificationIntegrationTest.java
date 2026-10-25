package com.campus.errand;

import com.campus.errand.exception.BizException;
import com.campus.errand.pojo.User;
import com.campus.errand.service.ProductService;
import com.campus.errand.service.TaskService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.Set;
import java.util.concurrent.*;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 使用独立 SQLite 文件，通过实际控制器、事务及数据库触发器验证通知闭环。 */
@SpringBootTest
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class NotificationIntegrationTest {
    private static final Path DATABASE = oldDatabase();
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper mapper;
    @Autowired ProductService products;
    @Autowired TaskService tasks;

    private static Path oldDatabase() {
        try {
            Path db = Files.createTempDirectory("ctcp-notification-test-").resolve("test.db");
            try (var conn = DriverManager.getConnection("jdbc:sqlite:" + db);
                 var stmt = conn.createStatement()) {
                new ResourceDatabasePopulator(new ByteArrayResource(Files.readString(Path.of("../backend/db/schema.sql"))
                        .getBytes(StandardCharsets.UTF_8))).populate(conn);
                stmt.execute("DROP TABLE notification");
                stmt.execute("INSERT INTO user(id,account,password_hash,username) VALUES(77,'existing','unused','迁移前用户')");
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
    void migratesWithoutBackfilling() {
        assertEquals("迁移前用户", jdbc.queryForObject("SELECT username FROM user WHERE id=77", String.class));
        assertEquals(0, count());
    }

    @BeforeEach
    void fixture() {
        jdbc.execute("DROP TRIGGER IF EXISTS fail_notification");
        for (String table : new String[]{"notification", "rating", "product_order_termination_request", "task_termination_request",
                "comment", "product_order", "task_order", "product", "task", "user"}) jdbc.update("DELETE FROM " + table);
        for (int id = 1; id <= 4; id++) {
            jdbc.update("INSERT INTO user(id,account,password_hash,username,role,phone) VALUES(?,?,'unused',?,?,'private-phone')",
                    id, "user" + id, "同学" + id, id == 4 ? "admin" : "user");
        }
        jdbc.update("INSERT INTO product(id,seller_id,title,price,audit_status,contact) VALUES(1,1,'教材',12,'approved','private-contact')");
        jdbc.update("INSERT INTO task(id,publisher_id,title,pickup,delivery,amount,audit_status,contact) "
                + "VALUES(1,1,'取快递','private-pickup','private-delivery',8,'approved','private-contact')");
    }

    private MockHttpSession session(int id) {
        User user = new User(); user.setId(id); user.setRole(id == 4 ? "admin" : "user");
        MockHttpSession session = new MockHttpSession(); session.setAttribute("user", user); return session;
    }

    private int count() { return jdbc.queryForObject("SELECT COUNT(*) FROM notification", Integer.class); }

    private JsonNode list(int userId, String query) throws Exception {
        var response = mvc.perform(get("/api/me/notifications" + query).session(session(userId)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return mapper.readTree(response).get("data");
    }

    private int start(boolean product, int participant) {
        return product ? products.buyProduct(1, participant) : tasks.acceptTask(1, participant);
    }

    private void request(boolean product, int orderId, int requester) {
        if (product) products.createTerminationRequest(orderId, requester, "时间无法协调，完整申请理由");
        else tasks.createTerminationRequest(1, requester, "时间无法协调，完整申请理由");
    }

    private void resolve(boolean product, int orderId, int actor, String action) {
        if (product) {
            switch (action) {
                case "withdrawn" -> products.withdrawTerminationRequest(orderId, actor);
                case "rejected" -> products.rejectTerminationRequest(orderId, actor);
                case "approved" -> products.approveTerminationRequest(orderId, actor);
            }
        } else {
            switch (action) {
                case "withdrawn" -> tasks.withdrawTerminationRequest(1, actor);
                case "rejected" -> tasks.rejectTerminationRequest(1, actor);
                case "approved" -> tasks.approveTerminationRequest(1, actor);
            }
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void fullOrderLifecycleHasCorrectRecipientsAndStableTargets(boolean product) throws Exception {
        int orderId = start(product, 2);
        assertEquals(1, count());
        assertEquals("order_created", list(1, "").at("/list/0/type").asText());
        assertEquals(0, list(2, "").get("total").asInt());
        if (product) products.deliverProductOrder(orderId, 1); else tasks.deliverTask(1, 2);
        assertEquals(2, count());
        int recipient = product ? 2 : 1;
        assertEquals("order_delivered", list(recipient, "").at("/list/0/type").asText());
        if (product) products.completeProductOrder(orderId, 2); else tasks.completeTask(1, 1);
        assertEquals(4, count());
        for (int user : new int[]{1, 2}) {
            JsonNode item = list(user, "").at("/list/0");
            assertEquals("order_completed", item.get("type").asText());
            assertEquals(orderId, item.get("targetId").asInt());
            assertEquals(product ? "product_order" : "task_order", item.get("targetType").asText());
            assertTrue(item.get("content").asText().contains("评价"));
            assertFalse(item.toString().contains("private-"));
        }
        assertThrows(BizException.class, () -> {
            if (product) products.completeProductOrder(orderId, 2); else tasks.completeTask(1, 1);
        });
        assertEquals(4, count());
    }

    @Test
    void taskCanCompleteDirectlyWithoutInventedDelivery() {
        tasks.acceptTask(1, 2); tasks.completeTask(1, 1);
        assertEquals(3, count());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM notification WHERE type='order_delivered'", Integer.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void auditChangesProduceSnapshotsAndDuplicateAuditDoesNotNotify(boolean product) throws Exception {
        String table = product ? "product" : "task";
        String path = "/api/admin/" + (product ? "products" : "tasks") + "/1/audit";
        jdbc.update("UPDATE " + table + " SET audit_status='pending'");
        for (String body : new String[]{"{\"approve\":true}", "{\"approve\":true}",
                "{\"approve\":false,\"remark\":\"图片不清晰，请补充实物照片\"}",
                "{\"approve\":false,\"remark\":\"图片不清晰，请补充实物照片\"}",
                "{\"approve\":false,\"remark\":\"请更换清晰照片\"}"}) {
            mvc.perform(put(path).session(session(4)).contentType("application/json").content(body)).andExpect(status().isOk());
        }
        assertEquals(3, count());
        assertEquals("audit_rejected", list(1, "").at("/list/0/type").asText());
        assertEquals(product ? "product_record" : "task_record", list(1, "").at("/list/0/targetType").asText());
        jdbc.update("UPDATE " + table + " SET audit_status='pending',audit_remark=NULL,title='修改后的标题'");
        mvc.perform(put(path).session(session(4)).contentType("application/json").content("{\"approve\":true}"))
                .andExpect(status().isOk());
        assertEquals(4, count());
        assertTrue(list(1, "").at("/list/0/content").asText().contains("修改后的标题"));
        assertFalse(list(1, "").at("/list/3/content").asText().contains("修改后的标题"));
        mvc.perform(put(path).session(session(2)).contentType("application/json").content("{\"approve\":true}"))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void terminationBothDirectionsAndAllOutcomes(boolean product) throws Exception {
        int orderId = start(product, 2);
        for (int requester : new int[]{1, 2}) {
            int other = requester == 1 ? 2 : 1;
            for (String outcome : new String[]{"withdrawn", "rejected"}) {
                request(product, orderId, requester);
                JsonNode item = list(other, "").at("/list/0");
                assertEquals("termination_requested", item.get("type").asText());
                assertTrue(item.get("content").asText().contains("完整申请理由"));
                assertThrows(BizException.class, () -> request(product, orderId, requester));
                resolve(product, orderId, outcome.equals("withdrawn") ? requester : other, outcome);
                assertEquals("termination_" + outcome, list(outcome.equals("withdrawn") ? other : requester, "").at("/list/0/type").asText());
            }
        }
        request(product, orderId, 2);
        resolve(product, orderId, 1, "approved");
        assertEquals("termination_approved", list(2, "").at("/list/0/type").asText());
        assertEquals(orderId, list(2, "").at("/list/0/targetId").asInt());
        int before = count();
        assertThrows(BizException.class, () -> resolve(product, orderId, 1, "approved"));
        assertEquals(before, count());
        int nextOrder = start(product, 3);
        assertNotEquals(orderId, nextOrder);
        assertEquals(orderId, list(2, "").at("/list/0/targetId").asInt());
        jdbc.update("UPDATE " + (product ? "product" : "task") + " SET is_deleted=1");
        assertEquals(orderId, list(2, "").at("/list/0/targetId").asInt());
        mvc.perform(get("/api/" + (product ? "product" : "task") + "-orders/" + orderId).session(session(2)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("cancelled"));
    }

    @Test
    void pendingTaskTerminationBlocksProgressAndIsPrivate() throws Exception {
        tasks.acceptTask(1, 2); tasks.createTerminationRequest(1, 1, "仅双方可见的申请理由");
        int before = count();
        assertThrows(BizException.class, () -> tasks.deliverTask(1, 2));
        assertThrows(BizException.class, () -> tasks.completeTask(1, 1));
        assertEquals(before, count());
        mvc.perform(get("/api/public/tasks/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.terminationRequest").doesNotExist());
        mvc.perform(get("/api/public/tasks/1").session(session(3))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.terminationRequest").doesNotExist());
        tasks.rejectTerminationRequest(1, 2); tasks.deliverTask(1, 2);
    }

    private long insert(int recipient, String type) {
        jdbc.update("INSERT INTO notification(recipient_id,type,title,content,target_type,target_id,created_at) "
                + "VALUES(?,?,'标题','正文','product_order',42,'2026-10-25 12:00:00')", recipient, type);
        return jdbc.queryForObject("SELECT MAX(id) FROM notification", Long.class);
    }

    @Test
    void paginationIsolationAndReadWatermark() throws Exception {
        long first = insert(1, "audit_approved");
        long second = insert(1, "order_created");
        long foreign = insert(2, "order_completed");
        JsonNode data = list(1, "?category=audit&state=unread&size=1");
        assertEquals(1, data.get("total").asInt());
        assertEquals(2, data.get("unreadCount").asInt());
        assertEquals(second, data.get("latestId").asLong());
        assertEquals(first, data.at("/list/0/id").asLong());
        assertFalse(data.at("/list/0").has("readAt"));
        assertEquals(second, list(1, "?size=1").at("/list/0/id").asLong());
        assertEquals(first, list(1, "?size=1&page=2").at("/list/0/id").asLong());
        assertEquals(0, list(1, "?page=2147483647").get("list").size());
        for (long id : new long[]{foreign, Long.MAX_VALUE}) {
            mvc.perform(put("/api/me/notifications/" + id + "/read").session(session(1))).andExpect(status().isNotFound());
        }
        mvc.perform(put("/api/me/notifications/" + first + "/read").session(session(1))).andExpect(status().isOk());
        jdbc.update("UPDATE notification SET read_at='2026-10-25 12:05:00' WHERE id=?", first);
        mvc.perform(put("/api/me/notifications/" + first + "/read").session(session(1)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.readAt").value("2026-10-25 12:05:00"));
        long newer = insert(1, "termination_requested");
        for (int expected : new int[]{1, 0}) {
            mvc.perform(put("/api/me/notifications/read-all").session(session(1)).contentType("application/json")
                    .content("{\"upToId\":" + second + "}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.data.updatedCount").value(expected));
        }
        assertEquals(newer, list(1, "?state=unread").at("/list/0/id").asLong());
        assertEquals(1, list(2, "?state=unread").get("total").asInt());
        mvc.perform(get("/api/me/notifications/unread-count").session(session(4))).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount").value(0)).andExpect(jsonPath("$.data.latestId").value(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"-1", "1.5", "5.0", "\"5\"", "true", "null", "{}", "[]", "9223372036854775808"})
    void watermarkMustBeNonnegativeJsonInteger(String value) throws Exception {
        mvc.perform(put("/api/me/notifications/read-all").session(session(1)).contentType("application/json")
                .content("{\"upToId\":" + value + "}")).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsBadQueriesAndVisitors() throws Exception {
        for (String query : new String[]{"category=bad", "state=read", "page=0", "page=abc", "size=0", "size=51"})
            mvc.perform(get("/api/me/notifications?" + query).session(session(1))).andExpect(status().isBadRequest());
        for (String id : new String[]{"0", "-1", "abc", "1.5"})
            mvc.perform(put("/api/me/notifications/" + id + "/read").session(session(1))).andExpect(status().isBadRequest());
        mvc.perform(put("/api/me/notifications/read-all").session(session(1)).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/me/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me/notifications/unread-count")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/me/notifications/1/read")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/me/notifications/read-all").contentType("application/json").content("{\"upToId\":0}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/me/notifications/read-all").session(session(1)).contentType("application/json").content("{\"upToId\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.updatedCount").value(0));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void failedMessageRollsBackCreationAndSecondCompletionMessage(boolean product) {
        jdbc.execute("CREATE TRIGGER fail_notification BEFORE INSERT ON notification BEGIN SELECT RAISE(ABORT,'test failure'); END");
        assertThrows(RuntimeException.class, () -> start(product, 2));
        assertEquals(product ? "on_sale" : "open", jdbc.queryForObject("SELECT status FROM " + (product ? "product" : "task"), String.class));
        assertEquals(0, count());
        jdbc.execute("DROP TRIGGER fail_notification");
        int orderId = start(product, 2);
        if (product) products.deliverProductOrder(orderId, 1);
        int before = count();
        // 第二条完成通知失败时，第一条通知和业务状态也必须回滚。
        int secondRecipient = product ? 1 : 2;
        jdbc.execute("CREATE TRIGGER fail_notification BEFORE INSERT ON notification WHEN NEW.type='order_completed' AND NEW.recipient_id="
                + secondRecipient + " BEGIN SELECT RAISE(ABORT,'test failure'); END");
        assertThrows(RuntimeException.class, () -> {
            if (product) products.completeProductOrder(orderId, 2); else tasks.completeTask(1, 1);
        });
        assertEquals(before, count());
        assertEquals(product ? "delivered" : "accepted", jdbc.queryForObject("SELECT status FROM "
                + (product ? "product_order" : "task_order") + " WHERE id=?", String.class, orderId));
        assertEquals(product ? "sold" : "accepted", jdbc.queryForObject("SELECT status FROM " + (product ? "product" : "task"), String.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void failedMessageRollsBackTerminationAndAudit(boolean product) throws Exception {
        int orderId = start(product, 2);
        jdbc.execute("CREATE TRIGGER fail_notification BEFORE INSERT ON notification BEGIN SELECT RAISE(ABORT,'test failure'); END");
        assertThrows(RuntimeException.class, () -> request(product, orderId, 2));
        String requestTable = product ? "product_order_termination_request" : "task_termination_request";
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM " + requestTable, Integer.class));
        jdbc.execute("DROP TRIGGER fail_notification");
        request(product, orderId, 2);
        jdbc.execute("CREATE TRIGGER fail_notification BEFORE INSERT ON notification BEGIN SELECT RAISE(ABORT,'test failure'); END");
        for (String action : new String[]{"withdrawn", "rejected", "approved"}) {
            assertThrows(RuntimeException.class, () -> resolve(product, orderId, action.equals("withdrawn") ? 2 : 1, action));
            assertEquals("pending", jdbc.queryForObject("SELECT status FROM " + requestTable, String.class));
        }
        String table = product ? "product" : "task";
        jdbc.update("UPDATE " + table + " SET audit_status='pending'");
        mvc.perform(put("/api/admin/" + (product ? "products" : "tasks") + "/1/audit").session(session(4))
                .contentType("application/json").content("{\"approve\":true}")).andExpect(status().is5xxServerError());
        assertEquals("pending", jdbc.queryForObject("SELECT audit_status FROM " + table, String.class));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void concurrentBuyOrAcceptOnlyCreatesOneOrderAndMessage(boolean product) throws Exception {
        CyclicBarrier start = new CyclicBarrier(2);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Callable<Integer> call = () -> {
                start.await(5, TimeUnit.SECONDS);
                try { start(product, 2); return 0; }
                catch (BizException e) { return e.getCode(); }
            };
            var first = executor.submit(call); var second = executor.submit(call);
            assertEquals(Set.of(0, 409), Set.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)));
        }
        assertEquals(1, count());
    }

    @Test
    void repeatableMigrationPreservesMessagesAndBusinessRecords() {
        products.buyProduct(1, 2);
        new ResourceDatabasePopulator(new ClassPathResource("db/migrations/001-rating.sql"),
                new ClassPathResource("db/migrations/002-notification.sql")).execute(jdbc.getDataSource());
        assertEquals(1, count());
        assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM user", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM product_order", Integer.class));
    }
}
