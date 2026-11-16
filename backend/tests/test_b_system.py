"""人员 B 的真实 HTTP 回归。先在根目录 mvnw.cmd package，再运行本文件。

仅使用临时 SQLite、上传目录和本脚本启动的 JAR，默认端口 18081。
JAVA_HOME 可指定 JDK 23。输出不包含密码和 Cookie。
"""
import base64
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor
from http.cookiejar import CookieJar
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import threading
import time
import unittest
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import build_opener, HTTPCookieProcessor, Request, urlopen


ROOT = Path(__file__).resolve().parents[2]
BASE = "http://localhost:18081"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=")


class Client:
    def __init__(self):
        self.opener = build_opener(HTTPCookieProcessor(CookieJar()))

    def request(self, method, path, body=None, expected=200, content_type="application/json"):
        data = json.dumps(body).encode() if isinstance(body, dict) else body
        request = Request(BASE + path, data=data, method=method,
                          headers={"Content-Type": content_type})
        try:
            response = self.opener.open(request, timeout=15)
        except HTTPError as error:
            response = error
        with response:
            status = response.code
            result = json.loads(response.read())
        if expected is not None and status != expected:
            raise AssertionError(f"{method} {path} -> {status}, expected {expected}, {result}")
        return status, result.get("data")

    def upload(self, path, field, data=PNG, mime="image/png", expected=200):
        boundary = "ctcp-test-b-boundary"
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field}\"; "
                f"filename=\"test.png\"\r\nContent-Type: {mime}\r\n\r\n").encode()
        body += data + f"\r\n--{boundary}--\r\n".encode()
        return self.request("POST", path, body, expected, "multipart/form-data; boundary=" + boundary)[1]


class BSystemTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 端口已占用时直接报告环境冲突，避免请求落到其他人的服务。
        with socket.socket() as probe:
            probe.bind(("localhost", 18081))
        cls.temp = tempfile.TemporaryDirectory(prefix="ctcp-test-b-")
        cls.addClassCleanup(cls.temp.cleanup)
        cls.directory = Path(cls.temp.name)
        cls.database = cls.directory / "test.db"
        with closing(sqlite3.connect(cls.database)) as conn:
            conn.executescript((ROOT / "backend/db/schema.sql").read_text(encoding="utf-8"))
        cls.java = str(Path(os.environ["JAVA_HOME"]) / "bin/java.exe") if "JAVA_HOME" in os.environ else shutil.which("java")
        (ROOT / ".codex-build").mkdir(exist_ok=True)
        cls.log = open(ROOT / ".codex-build/b-system-server.log", "w", encoding="utf-8")
        cls.addClassCleanup(cls.log.close)
        cls.start_server()
        cls.addClassCleanup(cls.stop_server)
        guest = Client()
        cls.ids = {}
        for account in ("publisher", "runner", "other", "admin"):
            cls.ids[account] = guest.request("POST", "/api/register", {
                "account": "ST1113-B-" + account, "password": "test-B-123", "username": account})[1]["id"]
        with closing(sqlite3.connect(cls.database)) as conn:
            conn.execute("UPDATE user SET role='admin' WHERE id=?", (cls.ids["admin"],))
            conn.commit()

    @classmethod
    def start_server(cls):
        cls.process = subprocess.Popen([
            cls.java, "-jar", str(ROOT / "backend-java/target/campus-errand-backend-1.0-SNAPSHOT.jar"),
            "--server.port=18081", "--spring.datasource.url=jdbc:sqlite:" + str(cls.database) + "?busy_timeout=5000",
            "--app.upload.dir=" + str(cls.directory / "uploads"),
            "--logging.level.org.springframework.jdbc.core=WARN"], cwd=ROOT,
            stdout=cls.log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
        for attempt in range(100):
            if cls.process.poll() is not None:
                raise RuntimeError("JAR 启动失败，见 .codex-build/b-system-server.log")
            try:
                with urlopen(BASE + "/api/public/tasks", timeout=1) as response:
                    if response.status == 200:
                        return
            except (URLError, TimeoutError):
                time.sleep(0.2)
        cls.stop_server()
        raise RuntimeError("JAR 启动超时")

    @classmethod
    def stop_server(cls):
        cls.process.terminate()
        cls.process.wait(timeout=20)

    def login(self, account, password="test-B-123", expected=200):
        client = Client()
        client.request("POST", "/api/login", {"account": "ST1113-B-" + account, "password": password}, expected)
        return client

    def setUp(self):
        self.publisher = self.login("publisher")
        self.runner = self.login("runner")
        self.other = self.login("other")
        self.admin = self.login("admin")
        self.guest = Client()

    def task_body(self, **changes):
        return {"title": "ST1113-B-" + self._testMethodName, "pickup": "东门",
                "delivery": "宿舍", "amount": 8, "description": "人员B测试任务", **changes}

    def task(self, approve=True, **changes):
        task_id = self.publisher.request("POST", "/api/tasks", self.task_body(**changes))[1]["id"]
        if approve:
            self.admin.request("PUT", f"/api/admin/tasks/{task_id}/audit", {"approve": True})
        return task_id

    def accept(self, task_id, client=None):
        return (client or self.runner).request("POST", f"/api/tasks/{task_id}/accept")[1]["orderId"]

    def state(self, task_id, order_id, state):
        for client in (self.publisher, self.runner):
            order = client.request("GET", f"/api/task-orders/{order_id}")[1]
            self.assertEqual(state, order["status"])
        with closing(sqlite3.connect(self.database)) as conn:
            task_state = conn.execute("SELECT status FROM task WHERE id=?", (task_id,)).fetchone()[0]
        self.assertEqual("open" if state == "cancelled" else state, task_state)

    def test_01_lifecycle_records_and_duplicates(self):
        task = self.task()
        order = self.accept(task)
        self.state(task, order, "accepted")
        self.runner.request("POST", f"/api/tasks/{task}/accept", expected=409)
        self.publisher.request("PUT", f"/api/tasks/{task}/deliver", expected=403)
        self.runner.request("PUT", f"/api/tasks/{task}/complete", expected=403)
        self.runner.request("PUT", f"/api/tasks/{task}/deliver")
        self.runner.request("PUT", f"/api/tasks/{task}/deliver", expected=409)
        self.state(task, order, "delivered")
        self.publisher.request("PUT", f"/api/tasks/{task}/complete")
        self.publisher.request("PUT", f"/api/tasks/{task}/complete", expected=409)
        self.state(task, order, "completed")
        for client, kind in ((self.publisher, "published"), (self.runner, "accepted")):
            records = client.request("GET", "/api/me/tasks?type=" + kind)[1]["list"]
            self.assertIn(task, [item["id"] for item in records])

    def test_02_termination_six_paths_and_reaccept(self):
        for requester_role in ("publisher", "runner"):
            for outcome in ("withdraw", "reject", "approve"):
                with self.subTest(requester=requester_role, outcome=outcome):
                    task = self.task()
                    order = self.accept(task)
                    requester = getattr(self, requester_role)
                    other = self.runner if requester_role == "publisher" else self.publisher
                    path = f"/api/tasks/{task}/termination-request"
                    requester.request("POST", path, {"reason": "测试双方协商终止"})
                    requester.request("POST", path, {"reason": "重复申请"}, expected=409)
                    requester.request("PUT", path + "/approve", expected=403)
                    requester.request("PUT", path + "/reject", expected=403)
                    other.request("DELETE", path, expected=403)
                    self.other.request("PUT", path + "/approve", expected=403)
                    self.runner.request("PUT", f"/api/tasks/{task}/deliver", expected=409)
                    self.publisher.request("PUT", f"/api/tasks/{task}/complete", expected=409)
                    if outcome == "withdraw":
                        requester.request("DELETE", path)
                    else:
                        other.request("PUT", path + "/" + outcome)
                    self.state(task, order, "cancelled" if outcome == "approve" else "accepted")
                    if outcome == "approve":
                        self.publisher.request("PUT", f"/api/tasks/{task}", self.task_body(amount=12, description="终止后修改"))
                        self.runner.request("POST", f"/api/tasks/{task}/accept", expected=404)
                        self.admin.request("PUT", f"/api/admin/tasks/{task}/audit", {"approve": True})
                        new_order = self.accept(task, self.other)
                        self.assertNotEqual(order, new_order)
                        self.assertEqual("cancelled", self.runner.request("GET", f"/api/task-orders/{order}")[1]["status"])
                    else:
                        self.runner.request("PUT", f"/api/tasks/{task}/deliver")
                        self.publisher.request("PUT", f"/api/tasks/{task}/complete")

    def test_03_audit_visibility_edit_delete(self):
        task = self.task(approve=False)
        path = f"/api/tasks/{task}"
        self.guest.request("GET", f"/api/public/tasks/{task}", expected=404)
        self.runner.request("POST", path + "/accept", expected=404)
        self.admin.request("PUT", f"/api/admin/tasks/{task}/audit", {"approve": False}, expected=400)
        self.admin.request("PUT", f"/api/admin/tasks/{task}/audit", {"approve": False, "remark": "补充任务信息"})
        self.assertEqual("补充任务信息", self.publisher.request("GET", f"/api/me/tasks/{task}")[1]["auditRemark"])
        self.other.request("GET", path + "/edit", expected=403)
        self.other.request("PUT", path, self.task_body(), expected=403)
        self.other.request("DELETE", path, expected=403)
        self.publisher.request("PUT", path, self.task_body(title="ST1113-B-重新审核"))
        self.assertEqual("pending", self.publisher.request("GET", path + "/edit")[1]["auditStatus"])
        self.admin.request("PUT", f"/api/admin/tasks/{task}/audit", {"approve": True})
        self.guest.request("GET", f"/api/public/tasks/{task}")
        self.accept(task)
        self.publisher.request("PUT", path, self.task_body(), expected=409)
        self.publisher.request("DELETE", path, expected=409)
        self.admin.request("DELETE", f"/api/admin/tasks/{task}", expected=400)
        self.runner.request("PUT", path + "/deliver")
        self.publisher.request("PUT", path + "/complete")
        self.admin.request("DELETE", f"/api/admin/tasks/{task}")
        self.guest.request("GET", f"/api/public/tasks/{task}", expected=404)
        open_task = self.task()
        self.publisher.request("DELETE", f"/api/tasks/{open_task}")
        self.guest.request("GET", f"/api/public/tasks/{open_task}", expected=404)

    def test_04_input_boundaries(self):
        editable = self.task(approve=False)
        with closing(sqlite3.connect(self.database)) as conn:
            before = conn.execute("SELECT COUNT(*) FROM task").fetchone()[0]
        invalid = [{"title": ""}, {"title": "字" * 81}, {"pickup": " "}, {"delivery": ""},
                   {"amount": -1}, {"amount": 100001}, {"amount": "NaN"}, {"amount": "Infinity"},
                   {"deadline": "2026-99-99 25:61:00"}]
        for changes in invalid:
            with self.subTest(changes=changes):
                self.publisher.request("POST", "/api/tasks", self.task_body(**changes), expected=400)
                self.publisher.request("PUT", f"/api/tasks/{editable}", self.task_body(**changes), expected=400)
        with closing(sqlite3.connect(self.database)) as conn:
            self.assertEqual(before, conn.execute("SELECT COUNT(*) FROM task").fetchone()[0])
        titled = self.task(title="  " + "字" * 80 + "  ")
        self.assertEqual("字" * 80, self.publisher.request("GET", f"/api/public/tasks/{titled}")[1]["title"])
        for amount in (0, 100000):
            with self.subTest(amount=amount):
                self.task(amount=amount)
        self.runner.request("POST", "/api/tasks/2147483647/accept", expected=404)
        for query in ("page=0", "size=0", "size=51"):
            self.guest.request("GET", "/api/public/tasks?" + query, expected=400)

    def test_05_session_and_authorization(self):
        task = self.task()
        for method, path, body in (("PUT", "/api/users/me", {"username": "失效修改"}),
                                   ("POST", f"/api/tasks/{task}/accept", None),
                                   ("GET", "/api/admin/stats", None)):
            self.guest.request(method, path, body, expected=401)
        self.runner.request("GET", "/api/admin/users", expected=403)
        self.runner.request("PUT", f"/api/admin/tasks/{task}/audit", {"approve": True}, expected=403)
        self.publisher.request("POST", f"/api/tasks/{task}/accept", expected=403)
        order = self.accept(task)
        self.other.request("GET", f"/api/task-orders/{order}", expected=403)
        self.other.request("PUT", f"/api/tasks/{task}/deliver", expected=403)
        client = self.login("other")
        client.request("POST", "/api/logout")
        client.request("PUT", "/api/users/me", {"username": "失效修改"}, expected=401)

    def test_06_profile_and_password(self):
        client = self.publisher
        client.request("PUT", "/api/users/me", {"username": "人员B", "phone": "13800138000", "qq": "123456"})
        profile = client.request("GET", "/api/users/me")[1]
        self.assertEqual("人员B", profile["username"])
        self.assertEqual("13800138000", profile["phone"])
        self.assertNotIn("passwordHash", profile)
        for body, expected in (({"phone": "123"}, 400), ({"oldPassword": "test-B-123"}, 400),
                               ({"newPassword": "changed-B-123"}, 400),
                               ({"oldPassword": "wrong", "newPassword": "changed-B-123"}, 401)):
            client.request("PUT", "/api/users/me", body, expected)
        client.request("PUT", "/api/users/me", {"oldPassword": "test-B-123", "newPassword": "changed-B-123"})
        self.login("publisher", expected=401)
        changed = self.login("publisher", "changed-B-123")
        changed.request("PUT", "/api/users/me", {"oldPassword": "changed-B-123", "newPassword": "test-B-123"})

    def test_07_images_avatar_and_limits(self):
        urls = [self.publisher.upload("/api/upload/image", "file")["url"] for _ in range(2)]
        task = self.task(imageUrls=",".join(urls))
        self.assertEqual(urls, self.publisher.request("GET", f"/api/public/tasks/{task}")[1]["imageUrls"].split(","))
        self.publisher.request("PUT", f"/api/tasks/{task}", self.task_body(imageUrls=",".join(urls[1:])))
        self.assertEqual(urls[1:], self.publisher.request("GET", f"/api/tasks/{task}/edit")[1]["imageUrls"].split(","))
        for url in urls:
            with urlopen(url) as response:
                self.assertEqual(PNG, response.read())
                self.assertIn("image/png", response.headers["Content-Type"])
        avatar = self.publisher.upload("/api/users/me/avatar", "avatar")["avatarUrl"]
        self.assertEqual(avatar, self.publisher.request("GET", "/api/users/me")[1]["avatarUrl"])
        self.publisher.request("PUT", "/api/users/me", {"avatarUrl": ""})
        self.assertEqual("", self.publisher.request("GET", "/api/users/me")[1].get("avatarUrl", ""))
        self.publisher.upload("/api/upload/image", "file", b"text", "text/plain", expected=400)
        self.publisher.upload("/api/upload/image", "file", b"", expected=400)
        self.publisher.upload("/api/upload/image", "file", b"x" * (5 * 1024 * 1024 + 1), expected=400)

    def test_08_comments_replies_pagination_and_permissions(self):
        task = self.task()
        path = f"/api/tasks/{task}/comments"
        public = f"/api/public/tasks/{task}/comments"
        first = self.publisher.request("POST", path, {"content": "<script>alert(1)</script>"})[1]["id"]
        reply = self.runner.request("POST", path, {"content": "回复", "replyToId": first})[1]["id"]
        for number in range(9):
            last = self.publisher.request("POST", path, {"content": f"评论{number}"})[1]
        self.assertEqual(2, last["page"])
        page = self.guest.request("GET", public + "?page=2")[1]
        self.assertEqual(11, page["total"])
        self.assertEqual(1, len(page["list"]))
        self.other.request("DELETE", path + f"/{first}", expected=403)
        self.publisher.request("POST", path, {"content": " "}, expected=400)
        self.publisher.request("POST", path, {"content": "字" * 1001}, expected=400)
        self.publisher.request("DELETE", path + f"/{last['id']}")
        self.assertEqual(10, self.guest.request("GET", public)[1]["total"])
        records = self.guest.request("GET", public)[1]["list"]
        self.assertEqual("<script>alert(1)</script>", records[0]["content"])
        self.assertEqual(reply, records[1]["id"])
        other_task = self.task()
        self.publisher.request("POST", f"/api/tasks/{other_task}/comments", {"content": "跨任务回复", "replyToId": first}, expected=409)

    def test_09_admin_users_and_statistics(self):
        data = self.admin.request("GET", "/api/admin/users?keyword=ST1113-B-other")[1]
        self.assertEqual(1, data["total"])
        self.assertNotIn("passwordHash", data["list"][0])
        user = self.ids["other"]
        self.admin.request("PUT", f"/api/admin/users/{user}", {"username": "管理员修改B", "phone": "13900139000"})
        self.assertEqual("管理员修改B", self.other.request("GET", "/api/users/me")[1]["username"])
        self.admin.request("PUT", f"/api/admin/users/{user}/reset-password", {"password": "reset-B-123"})
        self.login("other", expected=401)
        reset = self.login("other", "reset-B-123")
        reset.request("PUT", "/api/users/me", {"oldPassword": "reset-B-123", "newPassword": "test-B-123"})
        stats = self.admin.request("GET", "/api/admin/stats")[1]
        with closing(sqlite3.connect(self.database)) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM user").fetchone()[0], stats["userCount"])
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM task WHERE is_deleted=0 AND audit_status='pending'").fetchone()[0], stats["pendingTasks"])

    def test_10_ratings_both_sides_and_history(self):
        task = self.task()
        order = self.accept(task)
        path = f"/api/task-orders/{order}/rating"
        self.publisher.request("POST", path, {"stars": 5}, expected=409)
        self.runner.request("PUT", f"/api/tasks/{task}/deliver")
        self.publisher.request("PUT", f"/api/tasks/{task}/complete")
        for client, stars in ((self.publisher, 5), (self.runner, 4)):
            client.request("POST", path, {"stars": stars})
            client.request("POST", path, {"stars": stars}, expected=409)
            self.assertEqual(stars, client.request("GET", f"/api/task-orders/{order}")[1]["myRatingStars"])
        self.other.request("POST", path, {"stars": 5}, expected=403)
        self.publisher.request("DELETE", f"/api/tasks/{task}")
        self.assertEqual(5, self.publisher.request("GET", f"/api/task-orders/{order}")[1]["myRatingStars"])
        pending = self.publisher.request("GET", "/api/me/rating-orders?state=pending&size=50")[1]
        self.assertNotIn(order, [item["orderId"] for item in pending["list"]])
        first = self.publisher.request("GET", "/api/me/rating-orders?size=1")[1]
        second = self.publisher.request("GET", "/api/me/rating-orders?size=1&page=2")[1]
        self.assertEqual(first["total"], second["total"])
        self.assertNotEqual(first["list"], second["list"])

    def test_11_concurrent_accept_three_rounds(self):
        for round_number in range(1, 4):
            with self.subTest(round=round_number):
                task = self.task()
                barrier = threading.Barrier(2)
                def accept(client):
                    barrier.wait(timeout=5)
                    return client.request("POST", f"/api/tasks/{task}/accept", expected=None)[0]
                with ThreadPoolExecutor(max_workers=2) as pool:
                    results = list(pool.map(accept, (self.login("runner"), self.login("other"))))
                self.assertEqual([200, 409], sorted(results))
                with closing(sqlite3.connect(self.database)) as conn:
                    self.assertEqual(1, conn.execute("SELECT COUNT(*) FROM task_order WHERE task_id=? AND status<>'cancelled'", (task,)).fetchone()[0])
                print(f"并发第{round_number}轮 task={task}, HTTP={results}, 有效订单=1", flush=True)

    def test_12_notification_isolation_read_and_categories(self):
        task = self.task()
        order = self.accept(task)
        self.runner.request("PUT", f"/api/tasks/{task}/deliver")
        self.publisher.request("PUT", f"/api/tasks/{task}/complete")
        data = self.publisher.request("GET", "/api/me/notifications?size=50")[1]
        related = [item for item in data["list"] if item["targetType"] == "task_order" and item["targetId"] == order]
        self.assertEqual({"order_created", "order_delivered", "order_completed"}, {item["type"] for item in related})
        identifier = related[0]["id"]
        self.other.request("PUT", f"/api/me/notifications/{identifier}/read", expected=404)
        self.publisher.request("PUT", f"/api/me/notifications/{identifier}/read")
        self.publisher.request("PUT", f"/api/me/notifications/{identifier}/read")
        for category in ("audit", "order", "termination"):
            self.publisher.request("GET", "/api/me/notifications?category=" + category)
        first = self.publisher.request("GET", "/api/me/notifications?size=1")[1]
        second = self.publisher.request("GET", "/api/me/notifications?size=1&page=2")[1]
        self.assertNotEqual(first["list"][0]["id"], second["list"][0]["id"])
        self.publisher.request("PUT", "/api/me/notifications/read-all", {"upToId": data["latestId"]})
        self.assertEqual(0, self.publisher.request("GET", "/api/me/notifications/unread-count")[1]["unreadCount"])

    def test_99_restart_persistence_and_session_expiry(self):
        task = self.task()
        order = self.accept(task)
        avatar = self.publisher.upload("/api/users/me/avatar", "avatar")["avatarUrl"]
        before = self.publisher.request("GET", "/api/me/notifications/unread-count")[1]
        self.stop_server()
        self.start_server()
        self.publisher.request("PUT", "/api/users/me", {"username": "重启后旧会话"}, expected=401)
        self.publisher = self.login("publisher")
        self.runner = self.login("runner")
        self.state(task, order, "accepted")
        self.assertEqual(avatar, self.publisher.request("GET", "/api/users/me")[1]["avatarUrl"])
        self.assertEqual(before, self.publisher.request("GET", "/api/me/notifications/unread-count")[1])
        with urlopen(BASE + urlsplit(avatar).path) as response:
            self.assertEqual(PNG, response.read())
        with closing(sqlite3.connect(self.database)) as conn:
            self.assertEqual("ok", conn.execute("PRAGMA integrity_check").fetchone()[0])
            self.assertEqual([], conn.execute("PRAGMA foreign_key_check").fetchall())


if __name__ == "__main__":
    unittest.main(verbosity=2)
