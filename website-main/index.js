(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const nav = document.getElementById("site-nav");
  const toggle = document.querySelector(".nav-toggle");

  const closeNav = () => {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openNav = () => {
    if (!nav || !toggle) return;
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.contains("is-open");
      if (isOpen) closeNav();
      else openNav();
    });

    // Close on nav click (mobile)
    nav.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("a[href^='#']")) closeNav();
    });
  }

  // Close nav when clicking outside (mobile)
  document.addEventListener("click", (e) => {
    if (!nav || !toggle) return;
    if (!nav.classList.contains("is-open")) return;
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (nav.contains(target) || toggle.contains(target)) return;
    closeNav();
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeNav();
  });

  // Active nav highlighting based on section in view
  const links = Array.from(document.querySelectorAll(".nav-link[data-nav]"));
  const sections = Array.from(document.querySelectorAll("[data-section]"));

  const setActive = (id) => {
    for (const link of links) {
      const key = link.getAttribute("data-nav");
      link.classList.toggle("is-active", key === id);
    }
  };

  if ("IntersectionObserver" in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!visible) return;
        const id = visible.target.getAttribute("data-section");
        if (id) setActive(id);
      },
      { root: null, threshold: [0.15, 0.25, 0.35, 0.5] }
    );

    sections.forEach((s) => observer.observe(s));
  } else {
    // Fallback: highlight by hash
    const updateByHash = () => {
      const hash = (window.location.hash || "#home").replace("#", "");
      setActive(hash);
    };
    window.addEventListener("hashchange", updateByHash);
    updateByHash();
  }

  // Resume PDF link:
  // - Disable if missing (avoid 404 UX)
  // - Force download without navigating away (PDFs sometimes open in-browser)
  const pdfLink = document.querySelector("[data-resume-pdf]");
  if (pdfLink instanceof HTMLAnchorElement) {
    const isFileProtocol = window.location.protocol === "file:";
    const href = pdfLink.getAttribute("href");

    const setDisabled = () => {
      pdfLink.setAttribute("aria-disabled", "true");
      pdfLink.removeAttribute("href");
      pdfLink.removeAttribute("target");
      pdfLink.removeAttribute("download");
      pdfLink.classList.add("is-disabled");

      const title = pdfLink.querySelector(".card-title");
      const kicker = pdfLink.querySelector(".card-kicker");
      const body = pdfLink.querySelector(".card-body");
      const action = pdfLink.querySelector(".card-action");

      if (title) title.textContent = "Resume (PDF)";
      if (kicker) kicker.textContent = "Unavailable";
      if (body) body.textContent = "resume.pdf wasn’t found. Add it to the site to enable this download.";
      if (action) action.textContent = "PDF missing";
    };

    // Existence check (skip on file://; HEAD is not reliable there)
    if (!isFileProtocol && href) {
      fetch(href, { method: "HEAD" })
        .then((r) => {
          if (!r.ok) setDisabled();
        })
        .catch(() => {
          // Keep link enabled on network/CORS flake
        });
    }

    const forceDownload = async (url, filename) => {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };

    // Force download without navigation (skip on file://; let the browser handle it)
    pdfLink.addEventListener("click", (e) => {
      if (pdfLink.classList.contains("is-disabled") || pdfLink.getAttribute("aria-disabled") === "true") {
        e.preventDefault();
        return;
      }
      if (isFileProtocol) return;
      if (!href) return;

      e.preventDefault();
      const filename = pdfLink.getAttribute("download") || "Mekaeel_Malik_Resume.pdf";

      forceDownload(href, filename).catch(() => {
        // Fallback: open in a new tab without navigating away from the site
        window.open(href, "_blank", "noopener,noreferrer");
      });
    });
  }

  // Hero portrait: try common filenames under /assets/ and fall back to initials
  const portraitImg = document.querySelector("[data-portrait]");
  const portraitFrame = document.querySelector("[data-portrait-frame]");
  if (portraitImg instanceof HTMLImageElement && portraitFrame instanceof HTMLElement) {
    const candidates = [
      "assets/me.webp",
      "assets/me.jpg",
      "assets/me.jpeg",
      "assets/me.png",
      "assets/portrait.webp",
      "assets/portrait.jpg",
      "assets/portrait.jpeg",
      "assets/portrait.png",
    ];

    const tryLoad = (i) => {
      if (i >= candidates.length) {
        portraitFrame.classList.add("is-missing");
        return;
      }

      const src = candidates[i];
      const probe = new Image();
      probe.onload = () => {
        portraitImg.src = src;
        portraitFrame.classList.remove("is-missing");
      };
      probe.onerror = () => tryLoad(i + 1);
      probe.src = src;
    };

    // Start with whatever is in the HTML; if it errors, iterate candidates
    portraitImg.addEventListener("error", () => tryLoad(0), { once: true });
  }
})();