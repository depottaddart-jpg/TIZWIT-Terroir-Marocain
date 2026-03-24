/**
 * TIZWIT — Coopérative Artisanale Marocaine
 * script.js — All interactive logic
 *
 * ─── CONFIGURATION ──────────────────────────────────────────────
 * Change WHATSAPP_NUMBER to your own number (international format, no +, no spaces)
 */
const WHATSAPP_NUMBER = "212600000000";  // ← CHANGE THIS

/** Shipping thresholds */
const SHIPPING_FREE_THRESHOLD = 499;    // DHS — free shipping above this
const SHIPPING_DOMESTIC       = 25;     // DHS — domestic shipping fee
const SHIPPING_INTERNATIONAL  = 250;    // DHS — international flat rate

// ─────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────
let products      = [];          // loaded from products.json
let cart          = [];          // array of { id, name, price, image, qty }
let isInternational = false;     // shipping option toggle

// ─────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadCart();                    // restore cart from localStorage
  loadProducts();                // fetch & render products
  initNav();                     // navigation behaviour
  initCartPanel();               // cart drawer events
  initWaModal();                 // WhatsApp order modal
  initScrollReveal();            // fade-in on scroll
  initCatalogueBtn();            // PDF download
  initContactCards();            // contact card links
});

// ─────────────────────────────────────────────────────────────────
// PRODUCTS — fetch, render, filter
// ─────────────────────────────────────────────────────────────────
async function loadProducts() {
  showSkeletons(6);

  try {
    const res  = await fetch("products.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    products = await res.json();

    if (!Array.isArray(products) || products.length === 0) {
      showEmptyState("Aucun produit disponible pour le moment.");
      return;
    }

    buildFilterBar();
    renderProducts(products);

  } catch (err) {
    console.error("Erreur chargement produits:", err);
    showEmptyState("Impossible de charger les produits. Vérifiez votre connexion.");
  }
}

/** Build category filter pills from loaded product data */
function buildFilterBar() {
  const bar = document.getElementById("filter-bar");
  if (!bar) return;

  const categories = ["Tous", ...new Set(products.map(p => p.category))];
  bar.innerHTML = "";

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (cat === "Tous" ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filtered = cat === "Tous" ? products : products.filter(p => p.category === cat);
      renderProducts(filtered);
    });
    bar.appendChild(btn);
  });
}

/** Render product cards into the grid */
function renderProducts(list) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <p>Aucun produit dans cette catégorie.</p>
      </div>`;
    return;
  }

  list.forEach((p, i) => {
    const card = createProductCard(p);
    card.style.animationDelay = `${i * 60}ms`;
    card.classList.add("reveal");
    grid.appendChild(card);
  });

  // Trigger reveal after paint
  requestAnimationFrame(() => {
    grid.querySelectorAll(".reveal").forEach(el => {
      setTimeout(() => el.classList.add("visible"), 50);
    });
  });
}

/** Build a single product card DOM element */
function createProductCard(p) {
  const card = document.createElement("div");
  card.className = "product-card";
  card.dataset.id = p.id;

  const badgeClass = {
    "Premium":     "badge-premium",
    "Bio":         "badge-bio",
    "Rare":        "badge-rare",
    "Bestseller":  "badge-bestseller",
  }[p.badge] || "";

  card.innerHTML = `
    <div class="product-img-wrap">
      <img src="${p.image}" alt="${escHtml(p.name)}" loading="lazy"
           onerror="this.src='https://via.placeholder.com/400x300/F5EDD8/C1440E?text=Produit'">
      ${p.badge ? `<span class="product-badge ${badgeClass}">${escHtml(p.badge)}</span>` : ""}
    </div>
    <div class="product-body">
      <div class="product-category">${escHtml(p.category)}</div>
      <div class="product-name">${escHtml(p.name)}</div>
      <p class="product-desc">${escHtml(p.description)}</p>
      ${p.weight ? `<div class="product-weight"><i class="fa-solid fa-weight-hanging"></i>${escHtml(p.weight)}</div>` : ""}
      <div class="product-footer">
        <div class="product-price"><sup>DHS </sup>${p.price.toFixed(2)}</div>
        <button class="btn-add-cart" aria-label="Ajouter ${escHtml(p.name)} au panier"
                onclick="addToCart(${p.id}, this)">
          <i class="fa-solid fa-basket-shopping"></i> Ajouter
        </button>
      </div>
    </div>`;
  return card;
}

/** Show loading skeletons while products load */
function showSkeletons(count) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = Array.from({length: count}, () => `
    <div class="product-skeleton">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line" style="width:40%;height:10px;"></div>
        <div class="skeleton skeleton-line" style="width:80%;height:16px;margin:.5rem 0;"></div>
        <div class="skeleton skeleton-line" style="width:100%;"></div>
        <div class="skeleton skeleton-line" style="width:90%;"></div>
        <div class="skeleton skeleton-line" style="width:60%;"></div>
      </div>
    </div>`).join("");
}

function showEmptyState(msg) {
  const grid = document.getElementById("product-grid");
  if (grid) grid.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <p>${msg}</p>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
// CART — add, remove, update qty, persist
// ─────────────────────────────────────────────────────────────────

/** Add product to cart (called from product card button) */
function addToCart(id, btnEl) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id:    product.id,
      name:  product.name,
      price: product.price,
      image: product.image,
      qty:   1,
    });
  }

  saveCart();
  updateCartUI();
  showToast(`${product.name} ajouté au panier 🛒`, "success");

  // Brief button feedback
  if (btnEl) {
    btnEl.classList.add("added");
    btnEl.innerHTML = `<i class="fa-solid fa-check"></i> Ajouté`;
    setTimeout(() => {
      btnEl.classList.remove("added");
      btnEl.innerHTML = `<i class="fa-solid fa-basket-shopping"></i> Ajouter`;
    }, 1600);
  }
}

/** Remove item entirely from cart */
function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

/** Change quantity of an item */
function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(id);
    return;
  }
  saveCart();
  updateCartUI();
  renderCartItems();
}

/** Persist cart to localStorage */
function saveCart() {
  try {
    localStorage.setItem("tizwit_cart", JSON.stringify(cart));
  } catch (e) {
    console.warn("localStorage unavailable:", e);
  }
}

/** Load cart from localStorage */
function loadCart() {
  try {
    const raw = localStorage.getItem("tizwit_cart");
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    cart = [];
  }
}

/** Compute subtotal (without shipping) */
function getSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/** Compute shipping cost based on rules */
function getShipping() {
  const sub = getSubtotal();
  if (cart.length === 0) return 0;
  if (isInternational) return SHIPPING_INTERNATIONAL;
  if (sub > SHIPPING_FREE_THRESHOLD) return 0;
  return SHIPPING_DOMESTIC;
}

/** Total items count in cart */
function getCartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// ─────────────────────────────────────────────────────────────────
// CART UI — panel rendering
// ─────────────────────────────────────────────────────────────────
function initCartPanel() {
  // Open from navbar button
  document.querySelectorAll("[data-open-cart]").forEach(btn => {
    btn.addEventListener("click", openCart);
  });

  // Close button
  document.getElementById("cart-close-btn")?.addEventListener("click", closeCart);

  // Overlay click
  document.getElementById("cart-overlay")?.addEventListener("click", closeCart);

  // International shipping toggle
  const toggle = document.getElementById("intl-shipping-toggle");
  if (toggle) {
    toggle.addEventListener("change", () => {
      isInternational = toggle.checked;
      renderCartSummary();
    });
  }

  // WhatsApp order button inside cart
  document.getElementById("cart-wa-btn")?.addEventListener("click", openWaModal);

  // Initial render
  updateCartUI();
}

function openCart() {
  document.getElementById("cart-panel")?.classList.add("open");
  document.getElementById("cart-overlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
  renderCartItems();
  renderCartSummary();
}

function closeCart() {
  document.getElementById("cart-panel")?.classList.remove("open");
  document.getElementById("cart-overlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

/** Update badge counters everywhere */
function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll(".cart-badge").forEach(el => {
    el.textContent = count;
  });
  document.querySelectorAll(".bottom-cart-badge").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
  renderCartSummary();
}

/** Render cart item list in the panel */
function renderCartItems() {
  const body = document.getElementById("cart-body");
  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>Votre panier est vide.</p>
        <p style="font-size:.8rem;margin-top:.3rem;">Explorez nos produits du terroir !</p>
      </div>`;
    return;
  }

  body.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img class="cart-item-img"
           src="${escHtml(item.image)}" alt="${escHtml(item.name)}"
           onerror="this.src='https://via.placeholder.com/64x64/F5EDD8/C1440E?text=P'">
      <div class="cart-item-info">
        <div class="cart-item-name">${escHtml(item.name)}</div>
        <div class="cart-item-price">${(item.price * item.qty).toFixed(2)} DHS</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)" aria-label="Diminuer">−</button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, 1)" aria-label="Augmenter">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Supprimer">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>`).join("");
}

/** Render subtotal / shipping / total summary */
function renderCartSummary() {
  const subtotal  = getSubtotal();
  const shipping  = getShipping();
  const total     = subtotal + shipping;
  const isFree    = shipping === 0 && cart.length > 0 && !isInternational;

  const summaryEl = document.getElementById("cart-summary");
  if (!summaryEl) return;

  const shippingLabel = isInternational
    ? `International (+${SHIPPING_INTERNATIONAL} DHS)`
    : isFree
      ? "Livraison gratuite 🎉"
      : subtotal === 0
        ? "—"
        : `Livraison (+${SHIPPING_DOMESTIC} DHS)`;

  const shippingVal = shipping === 0 ? (cart.length > 0 ? "0.00 DHS" : "—") : `${shipping.toFixed(2)} DHS`;

  summaryEl.innerHTML = `
    <div class="summary-row">
      <span class="lbl">Sous-total</span>
      <span class="val">${subtotal.toFixed(2)} DHS</span>
    </div>
    <div class="summary-row ${isFree ? "shipping-free" : ""}">
      <span class="lbl">${shippingLabel}</span>
      <span class="val">${isFree ? "GRATUIT" : shippingVal}</span>
    </div>
    <div class="summary-row total">
      <span class="lbl">Total</span>
      <span class="val">${total.toFixed(2)} DHS</span>
    </div>`;

  // Enable / disable WhatsApp button
  const waBtn = document.getElementById("cart-wa-btn");
  if (waBtn) {
    waBtn.disabled = cart.length === 0;
    waBtn.style.opacity = cart.length === 0 ? "0.5" : "1";
  }
}

// ─────────────────────────────────────────────────────────────────
// WHATSAPP MODAL
// ─────────────────────────────────────────────────────────────────
function initWaModal() {
  const overlay = document.getElementById("wa-modal-overlay");
  const form    = document.getElementById("wa-order-form");
  const closeBtn= document.getElementById("wa-modal-close");

  // Close on overlay click (not on modal itself)
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeWaModal();
  });
  closeBtn?.addEventListener("click", closeWaModal);

  // Form submission
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (validateWaForm()) sendWhatsAppOrder();
  });

  // Live validation clear on input
  ["wa-name", "wa-address"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", () => clearFieldError(id));
  });
}

function openWaModal() {
  if (cart.length === 0) {
    showToast("Votre panier est vide !", "error");
    return;
  }
  closeCart();
  renderOrderPreview();
  document.getElementById("wa-modal-overlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeWaModal() {
  document.getElementById("wa-modal-overlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

/** Render order summary inside the modal */
function renderOrderPreview() {
  const container = document.getElementById("order-preview");
  if (!container) return;

  const subtotal = getSubtotal();
  const shipping = getShipping();
  const total    = subtotal + shipping;

  const items = cart.map(item => `
    <div class="order-preview-item">
      <span>${escHtml(item.name)} × ${item.qty}</span>
      <span>${(item.price * item.qty).toFixed(2)} DHS</span>
    </div>`).join("");

  const shippingLine = shipping > 0
    ? `<div class="order-preview-item"><span>Livraison</span><span>${shipping.toFixed(2)} DHS</span></div>`
    : `<div class="order-preview-item"><span>Livraison</span><span style="color:var(--green)">GRATUITE</span></div>`;

  container.innerHTML = `
    ${items}
    ${shippingLine}
    <div class="order-preview-total">
      <span>Total à payer</span>
      <span>${total.toFixed(2)} DHS</span>
    </div>`;
}

/** Validate form fields, return true if valid */
function validateWaForm() {
  let valid = true;

  const nameEl    = document.getElementById("wa-name");
  const addressEl = document.getElementById("wa-address");

  if (!nameEl?.value.trim() || nameEl.value.trim().length < 3) {
    showFieldError("wa-name", "Veuillez entrer votre nom complet (min. 3 caractères).");
    valid = false;
  }
  if (!addressEl?.value.trim() || addressEl.value.trim().length < 10) {
    showFieldError("wa-address", "Veuillez entrer une adresse de livraison complète.");
    valid = false;
  }
  return valid;
}

function showFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  const errEl = document.getElementById(`${fieldId}-error`);
  el?.classList.add("error");
  if (errEl) { errEl.textContent = msg; errEl.classList.add("show"); }
}
function clearFieldError(fieldId) {
  document.getElementById(fieldId)?.classList.remove("error");
  const errEl = document.getElementById(`${fieldId}-error`);
  if (errEl) errEl.classList.remove("show");
}

/** Build & open WhatsApp URL with the pre-filled order message */
function sendWhatsAppOrder() {
  const name    = document.getElementById("wa-name")?.value.trim();
  const address = document.getElementById("wa-address")?.value.trim();
  const subtotal = getSubtotal();
  const shipping = getShipping();
  const total    = subtotal + shipping;

  const itemLines = cart
    .map(item => `  • ${item.name} × ${item.qty}  →  ${(item.price * item.qty).toFixed(2)} DHS`)
    .join("\n");

  const shippingLine = shipping === 0
    ? "  Livraison : GRATUITE 🎉"
    : isInternational
      ? `  Livraison internationale : ${shipping.toFixed(2)} DHS`
      : `  Livraison : ${shipping.toFixed(2)} DHS`;

  const message =
`🌿 *Nouvelle commande — TIZWIT*

👤 *Nom :* ${name}
📍 *Adresse :* ${address}

🛒 *Articles commandés :*
${itemLines}

${shippingLine}
💰 *Total : ${total.toFixed(2)} DHS*

Merci de confirmer ma commande. 🙏`;

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");

  // Feedback & cleanup
  showToast("Redirection vers WhatsApp… ✅", "success");
  closeWaModal();

  // Reset form
  document.getElementById("wa-order-form")?.reset();
}

// ─────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────
function initNav() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a[href^='#'], .bottom-nav-item[data-section]");

  // Smooth scroll for nav links
  document.querySelectorAll("a[href^='#']").forEach(a => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Bottom nav items
  document.querySelectorAll(".bottom-nav-item[data-section]").forEach(item => {
    item.addEventListener("click", () => {
      const section = document.getElementById(item.dataset.section);
      section?.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Active link tracking via IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll(".nav-links a").forEach(a => {
          a.classList.toggle("active", a.getAttribute("href") === `#${id}`);
        });
        document.querySelectorAll(".bottom-nav-item").forEach(item => {
          item.classList.toggle("active", item.dataset.section === id);
        });
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
}

// ─────────────────────────────────────────────────────────────────
// SCROLL REVEAL
// ─────────────────────────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

// ─────────────────────────────────────────────────────────────────
// PDF CATALOGUE
// ─────────────────────────────────────────────────────────────────
function initCatalogueBtn() {
  document.getElementById("catalogue-btn")?.addEventListener("click", downloadCatalogue);
}

async function downloadCatalogue() {
  if (typeof window.jspdf === "undefined") {
    showToast("Bibliothèque PDF en chargement…", "");
    // jsPDF is loaded from CDN in index.html
    await waitForjsPDF();
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const pageW  = doc.internal.pageSize.getWidth();
  const margin = 15;
  const colW   = pageW - margin * 2;

  // ── Cover page ──
  doc.setFillColor(193, 68, 14);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setFillColor(139, 46, 8);
  doc.rect(0, 60, pageW, 10, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("TIZWIT", pageW / 2, 28, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Coopérative Artisanale du Terroir Marocain", pageW / 2, 38, { align: "center" });
  doc.text("Catalogue de Produits — " + new Date().getFullYear(), pageW / 2, 48, { align: "center" });

  // gold ornament line
  doc.setDrawColor(212, 168, 71);
  doc.setLineWidth(0.8);
  doc.line(margin, 56, pageW - margin, 56);

  // intro text
  doc.setTextColor(43, 27, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const intro = "Découvrez notre sélection de produits authentiques, issus des terroirs marocains, produits par les femmes artisanes de notre coopérative dans le respect des traditions ancestrales.";
  const introLines = doc.splitTextToSize(intro, colW);
  doc.text(introLines, margin, 82);

  // ── Product pages ──
  let y = 100;
  const lineH = 6;

  products.forEach((p, i) => {
    // New page if needed
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // Product block background
    const blockH = 42;
    doc.setFillColor(245, 237, 216);
    doc.roundedRect(margin, y, colW, blockH, 3, 3, "F");

    // Category chip
    doc.setFillColor(193, 68, 14);
    doc.roundedRect(margin + 4, y + 4, 36, 5, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(p.category.toUpperCase(), margin + 6, y + 7.5);

    // Product name
    doc.setTextColor(43, 27, 16);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(p.name, margin + 4, y + 16);

    // Weight badge
    if (p.weight) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 62, 40);
      doc.text(`[ ${p.weight} ]`, margin + 4, y + 22);
    }

    // Description (truncated)
    doc.setFontSize(7.5);
    doc.setTextColor(90, 62, 40);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(p.description, colW - 60);
    doc.text(descLines.slice(0, 3), margin + 4, y + 29);

    // Price (right-aligned)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(193, 68, 14);
    doc.text(`${p.price.toFixed(0)} DHS`, pageW - margin - 4, y + 20, { align: "right" });

    // Badge
    if (p.badge) {
      doc.setFillColor(232, 160, 32);
      doc.roundedRect(pageW - margin - 30, y + 26, 26, 5, 2, 2, "F");
      doc.setFontSize(6);
      doc.setTextColor(43, 27, 16);
      doc.setFont("helvetica", "bold");
      doc.text(p.badge.toUpperCase(), pageW - margin - 17, y + 29.5, { align: "center" });
    }

    // Separator line
    doc.setDrawColor(212, 168, 71);
    doc.setLineWidth(0.3);
    doc.line(margin, y + blockH + 2, pageW - margin, y + blockH + 2);

    y += blockH + 8;
  });

  // ── Footer note ──
  if (y > 250) { doc.addPage(); y = 20; }
  y += 5;
  doc.setFillColor(44, 85, 69);
  doc.rect(margin, y, colW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Commander via WhatsApp", pageW / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`wa.me/${WHATSAPP_NUMBER}`, pageW / 2, y + 14, { align: "center" });
  doc.text("Livraison gratuite dès 499 DHS • Produits 100% authentiques", pageW / 2, y + 20, { align: "center" });

  doc.save("TIZWIT_Catalogue_Produits.pdf");
  showToast("Catalogue PDF téléchargé ! 📄", "success");
}

/** Wait for jsPDF to become available (loaded async by CDN) */
function waitForjsPDF(attempts = 0) {
  return new Promise((resolve, reject) => {
    if (window.jspdf) return resolve();
    if (attempts > 20) return reject(new Error("jsPDF non disponible"));
    setTimeout(() => waitForjsPDF(attempts + 1).then(resolve).catch(reject), 200);
  });
}

// ─────────────────────────────────────────────────────────────────
// CONTACT CARDS
// ─────────────────────────────────────────────────────────────────
function initContactCards() {
  const waCard = document.getElementById("contact-wa-card");
  if (waCard) {
    waCard.addEventListener("click", () => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
    });
  }
  const emailCard = document.getElementById("contact-email-card");
  if (emailCard) {
    emailCard.addEventListener("click", () => {
      window.location.href = "mailto:contact@tizwit.ma";
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────
function showToast(msg, type = "") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);

  // Auto-remove after 3s
  setTimeout(() => {
    toast.style.animation = "toastOut .25s ease forwards";
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS */
function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
