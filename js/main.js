(() => {
  "use strict";

  const DATA_URL = "data/projects.json";

  /** @type {any} */
  let siteData = null;
  /** @type {any|null} */
  let activeHls = null;
  /** @type {HTMLElement|null} */
  let lightboxEl = null;
  /** @type {string|null} */
  let activeFilter = "all";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function formatDuration(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function playIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5.14v13.72L19 12 8 5.14z"/></svg>`;
  }

  function closeIconSvg() {
    return `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.3 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.29-6.3z"/></svg>`;
  }

  function buildSquarespaceUrl(libraryId, videoId) {
    return `https://video.squarespace-cdn.com/content/v1/${libraryId}/${videoId}/playlist.m3u8`;
  }

  function findItem(id) {
    if (!siteData) return null;
    for (const section of siteData.sections) {
      const item = section.items.find((it) => it.id === id);
      if (item) return { item, section };
    }
    return null;
  }

  function createLightbox() {
    if (lightboxEl) return lightboxEl;
    const el = document.createElement("div");
    el.className = "lightbox";
    el.id = "lightbox";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="lightbox-dialog" role="document">
        <button type="button" class="lightbox-close" aria-label="Close video">${closeIconSvg()}</button>
        <div class="lightbox-stage" data-stage></div>
        <div class="lightbox-caption">
          <h2 data-caption-title></h2>
          <p data-caption-meta></p>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.addEventListener("click", (e) => {
      if (e.target === el) closeLightbox();
    });
    $(".lightbox-close", el).addEventListener("click", closeLightbox);

    lightboxEl = el;
    return el;
  }

  function destroyHls() {
    if (activeHls) {
      try {
        activeHls.destroy();
      } catch (_) {
        /* ignore */
      }
      activeHls = null;
    }
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    destroyHls();
    const stage = $("[data-stage]", lightboxEl);
    stage.innerHTML = "";
    lightboxEl.classList.remove("is-open");
    lightboxEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");

    if (location.hash && location.hash.length > 1) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function openLightbox(item, section) {
    const el = createLightbox();
    const stage = $("[data-stage]", el);
    const titleEl = $("[data-caption-title]", el);
    const metaEl = $("[data-caption-meta]", el);

    destroyHls();
    stage.innerHTML = "";

    titleEl.textContent = item.title;
    metaEl.textContent = `${section.title} · ${formatDuration(item.duration)}`;

    const source = item.source || {};
    const type = source.type;

    if (type === "youtube") {
      const id = source.id || source.videoId;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.title = item.title;
      stage.appendChild(iframe);
    } else if (type === "vimeo") {
      const id = source.id || source.videoId;
      const iframe = document.createElement("iframe");
      iframe.src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.title = item.title;
      stage.appendChild(iframe);
    } else if (type === "mp4") {
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.poster = item.poster || "";
      video.src = source.src || source.url;
      stage.appendChild(video);
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } else if (type === "squarespace-hls") {
      const libraryId = siteData.squarespaceLibraryId;
      const url = buildSquarespaceUrl(libraryId, source.id);
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.poster = item.poster || "";
      stage.appendChild(video);

      const canNative =
        video.canPlayType("application/vnd.apple.mpegurl") ||
        video.canPlayType("application/x-mpegURL");

      if (canNative) {
        video.src = url;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } else if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        activeHls = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        });
        hls.on(window.Hls.Events.ERROR, (_evt, data) => {
          if (data && data.fatal) {
            console.error("HLS error", data);
          }
        });
      } else {
        stage.innerHTML = `<p style="padding:2rem;color:#a8a49c;text-align:center">This browser cannot play HLS video.</p>`;
      }
    } else {
      stage.innerHTML = `<p style="padding:2rem;color:#a8a49c;text-align:center">Unsupported video source.</p>`;
    }

    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    $(".lightbox-close", el).focus();

    if (location.hash !== `#${item.id}`) {
      history.replaceState(null, "", `#${item.id}`);
    }
  }

  function renderFilters(sections) {
    const container = $("#filters");
    if (!container) return;

    const chips = [
      { id: "all", label: "All" },
      ...sections.map((s) => ({ id: s.id, label: s.title })),
    ];

    container.innerHTML = chips
      .map(
        (c) =>
          `<button type="button" class="filter-chip${c.id === "all" ? " is-active" : ""}" data-filter="${escapeHtml(c.id)}" aria-pressed="${c.id === "all" ? "true" : "false"}">${escapeHtml(c.label)}</button>`
      )
      .join("");

    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-filter]");
      if (!btn) return;
      setFilter(btn.getAttribute("data-filter"));
    });
  }

  function setFilter(filterId) {
    activeFilter = filterId || "all";
    $$(".filter-chip").forEach((btn) => {
      const on = btn.getAttribute("data-filter") === activeFilter;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$(".work-section").forEach((section) => {
      const id = section.getAttribute("data-section");
      const show = activeFilter === "all" || activeFilter === id;
      section.classList.toggle("is-hidden", !show);
    });
  }

  function renderSections(sections) {
    const container = $("#sections");
    if (!container) return;

    container.innerHTML = sections
      .map((section) => {
        const cards = section.items
          .map((item) => {
            return `
              <button type="button" class="card" data-item-id="${escapeHtml(item.id)}" aria-label="Play ${escapeHtml(item.title)}">
                <div class="card-media">
                  <img src="${escapeHtml(item.poster)}" alt="" loading="lazy" width="640" height="360" />
                  <div class="card-play"><span class="play-icon">${playIconSvg()}</span></div>
                  <span class="card-duration">${formatDuration(item.duration)}</span>
                </div>
                <div class="card-meta">
                  <h3 class="card-title">${escapeHtml(item.title)}</h3>
                  <p class="card-label">${escapeHtml(section.title)}</p>
                </div>
              </button>
            `;
          })
          .join("");

        return `
          <section class="work-section" id="${escapeHtml(section.id)}" data-section="${escapeHtml(section.id)}" aria-labelledby="heading-${escapeHtml(section.id)}">
            <h2 class="section-title" id="heading-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
            <div class="card-grid">${cards}</div>
          </section>
        `;
      })
      .join("");

    container.addEventListener("click", (e) => {
      const card = e.target.closest("[data-item-id]");
      if (!card) return;
      const found = findItem(card.getAttribute("data-item-id"));
      if (found) openLightbox(found.item, found.section);
    });
  }

  function handleHash() {
    const id = (location.hash || "").replace(/^#/, "");
    if (!id) return;
    const found = findItem(id);
    if (!found) return;

    // Ensure section visible if filtered
    if (activeFilter !== "all" && activeFilter !== found.section.id) {
      setFilter("all");
    }
    openLightbox(found.item, found.section);
  }

  function initStickyHeader() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function bindGlobalKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  async function init() {
    initStickyHeader();
    bindGlobalKeys();
    createLightbox();

    const sectionsEl = $("#sections");
    if (!sectionsEl) return;

    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
      siteData = await res.json();
    } catch (err) {
      sectionsEl.innerHTML = `<p style="color:#a8a49c">Unable to load projects. ${escapeHtml(err.message || err)}</p>`;
      return;
    }

    const site = siteData.site || {};
    const taglineEl = $("[data-site-tagline]");
    if (taglineEl && site.tagline) taglineEl.textContent = site.tagline;

    renderFilters(siteData.sections || []);
    renderSections(siteData.sections || []);
    handleHash();
    window.addEventListener("hashchange", handleHash);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
