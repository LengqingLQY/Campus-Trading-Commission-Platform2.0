(() => {
    const initSidebarNavigation = () => {
        const nav = document.querySelector("[data-sidebar-nav]");
        const highlight = nav.querySelector("[data-sidebar-highlight]");
        const links = Array.from(nav.querySelectorAll("[data-nav-page]"));
        let activeLink = null;
        let hoveredLink = null;
        let focusedLink = null;

        const isVisible = (link) => link.getClientRects().length > 0;
        const pageLink = () => links.find((link) => document.body.classList.contains(`app-page--${link.dataset.navPage}`));
        const visiblePageLink = () => {
            const link = pageLink();
            return link && isVisible(link) ? link : null;
        };

        const placeHighlight = (link, instant = false) => {
            if (!link || !isVisible(link)) return;

            const navRect = nav.getBoundingClientRect();
            const linkRect = link.getBoundingClientRect();
            if (instant) highlight.classList.add("sidebar__nav-highlight--instant");

            highlight.style.width = `${linkRect.width}px`;
            highlight.style.height = `${linkRect.height}px`;
            highlight.style.setProperty("--highlight-x", `${linkRect.left - navRect.left}px`);
            highlight.style.setProperty("--highlight-y", `${linkRect.top - navRect.top}px`);
            highlight.classList.add("sidebar__nav-highlight--visible");

            if (instant) {
                requestAnimationFrame(() => highlight.classList.remove("sidebar__nav-highlight--instant"));
            }
        };

        const refreshActiveLink = (instant = true) => {
            activeLink = visiblePageLink() || links.find(isVisible);
            if (!hoveredLink && !focusedLink) placeHighlight(activeLink, instant);
        };

        nav.classList.add("sidebar__nav--enhanced");
        refreshActiveLink();

        links.forEach((link) => {
            link.addEventListener("mouseenter", () => {
                hoveredLink = link;
                placeHighlight(link);
            });
            link.addEventListener("mouseleave", () => {
                if (hoveredLink === link) hoveredLink = null;
            });
            link.addEventListener("focus", () => {
                focusedLink = link;
                placeHighlight(link);
            });
            link.addEventListener("blur", () => {
                focusedLink = null;
                if (!hoveredLink) placeHighlight(activeLink);
            });
        });

        nav.addEventListener("mouseleave", () => {
            hoveredLink = null;
            if (!focusedLink) placeHighlight(activeLink);
        });

        window.addEventListener("resize", () => {
            placeHighlight(hoveredLink || focusedLink || activeLink, true);
        });

        const adminLink = nav.querySelector("[data-admin-link]");
        if (adminLink) {
            new MutationObserver(() => refreshActiveLink()).observe(adminLink, {
                attributes: true,
                attributeFilter: ["style"]
            });
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSidebarNavigation, {once: true});
    } else {
        initSidebarNavigation();
    }
})();
