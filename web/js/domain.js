(function (root, factory) {
    "use strict";
    const domain = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = domain;
    }
    root.CTCPDomain = domain;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function shuffle(items, random) {
        const copy = items.slice();
        const nextRandom = random || Math.random;
        for (let index = copy.length - 1; index > 0; index -= 1) {
            const target = Math.floor(nextRandom() * (index + 1));
            [copy[index], copy[target]] = [copy[target], copy[index]];
        }
        return copy;
    }

    /** 优先保证 5 条商品、3 条任务；一类不足时由另一类补到最多 8 条。 */
    function selectRecommendations(pool, random) {
        const products = shuffle(pool.filter((entry) => entry.kind === "product"), random);
        const tasks = shuffle(pool.filter((entry) => entry.kind === "task"), random);
        const selected = [...products.slice(0, 5), ...tasks.slice(0, 3)];
        const selectedKeys = new Set(selected.map(keyOf));
        if (selected.length < 8) {
            shuffle(pool, random).forEach((entry) => {
                const key = keyOf(entry);
                if (selected.length < 8 && !selectedKeys.has(key)) {
                    selected.push(entry);
                    selectedKeys.add(key);
                }
            });
        }
        return shuffle(selected, random);
    }

    function keyOf(entry) {
        return `${entry.kind}-${entry.data.id}`;
    }

    function isPendingTermination(request) {
        return Boolean(request && (!request.status || request.status === "pending"));
    }

    function terminationAction(role, status, request) {
        if (status !== "created" && status !== "delivered") return "unavailable";
        if (!isPendingTermination(request)) return "request";
        return request.requesterRole === role ? "withdraw" : "review";
    }

    function todoMeta(role, status, terminationRequest) {
        const termination = terminationAction(role, status, terminationRequest);
        if (termination === "review") {
            return {needsAction: true, statusText: "待处理终止申请"};
        }
        if (termination === "withdraw") {
            return {needsAction: false, statusText: "待对方确认终止"};
        }
        if (role === "seller" && status === "created") {
            return {needsAction: true, statusText: "待交付"};
        }
        if (role === "buyer" && status === "delivered") {
            return {needsAction: true, statusText: "待确认收货"};
        }
        if (role === "buyer" && status === "created") {
            return {needsAction: false, statusText: "待卖家交付"};
        }
        if (role === "seller" && status === "delivered") {
            return {needsAction: false, statusText: "待买家确认"};
        }
        return {needsAction: false, statusText: "查看"};
    }

    function buildTradeTodos(published, bought) {
        const active = new Set(["created", "delivered"]);
        const entries = [];
        (published || []).forEach((item) => {
            if (item.orderId && active.has(item.orderStatus)) {
                entries.push(Object.assign({item, role: "seller"}, todoMeta("seller", item.orderStatus, item.terminationRequest)));
            }
        });
        (bought || []).forEach((item) => {
            if (item.orderId && active.has(item.orderStatus)) {
                entries.push(Object.assign({item, role: "buyer"}, todoMeta("buyer", item.orderStatus, item.terminationRequest)));
            }
        });
        entries.sort((left, right) => Number(right.needsAction) - Number(left.needsAction));
        return entries;
    }

    function orderAction(role, status) {
        if (status === "completed") return "completed";
        if (status === "cancelled") return "cancelled";
        if (role === "seller" && status === "created") return "deliver";
        if (role === "buyer" && status === "delivered") return "complete";
        if (role === "buyer" && status === "created") return "waiting_seller";
        if (role === "seller" && status === "delivered") return "waiting_buyer";
        return "readonly";
    }

    function orderRank(status) {
        return {created: 1, delivered: 2, completed: 3, cancelled: 0}[status] || 0;
    }

    return {
        shuffle,
        selectRecommendations,
        isPendingTermination,
        terminationAction,
        todoMeta,
        buildTradeTodos,
        orderAction,
        orderRank
    };
});
