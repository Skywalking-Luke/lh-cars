/* LH Cars — shared JS */
(function () {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "✕" : "☰";
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      });
    });
  }

  // Mark active nav (path-aware for nested pages)
  const parts = location.pathname.split("/").filter(Boolean);
  const path = (parts[parts.length - 1] || "index.html").toLowerCase();
  document.querySelectorAll(".nav a").forEach(function (a) {
    const href = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });

  // Gallery: thumb click → swap hero (data-full)
  const heroImg = document.querySelector(".listing-hero-img img");
  const thumbs = document.querySelectorAll(".listing-thumbs [data-full]");
  if (heroImg && thumbs.length) {
    thumbs.forEach(function (btn, idx) {
      if (idx === 0) btn.classList.add("active");
      btn.addEventListener("click", function () {
        const full = btn.getAttribute("data-full");
        if (!full) return;
        heroImg.style.opacity = "0.4";
        const next = new Image();
        next.onload = function () {
          heroImg.src = full;
          heroImg.alt = btn.getAttribute("data-alt") || heroImg.alt;
          heroImg.style.opacity = "1";
        };
        next.src = full;
        thumbs.forEach(function (t) { t.classList.remove("active"); });
        btn.classList.add("active");
      });
    });
  }

  // Contact form → WhatsApp deep link
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = (form.querySelector('[name="name"]') || {}).value || "";
      const phone = (form.querySelector('[name="phone"]') || {}).value || "";
      const interest = (form.querySelector('[name="interest"]') || {}).value || "";
      const message = (form.querySelector('[name="message"]') || {}).value || "";
      const lines = [
        "Hai LH Cars, saya berminat.",
        name ? "Nama: " + name.trim() : "",
        phone ? "Telefon: " + phone.trim() : "",
        interest ? "Minat: " + interest.trim() : "",
        message ? "Mesej: " + message.trim() : ""
      ].filter(Boolean);
      const text = encodeURIComponent(lines.join("\n"));
      window.open("https://wa.me/60128744878?text=" + text, "_blank", "noopener");
    });
  }
})();
