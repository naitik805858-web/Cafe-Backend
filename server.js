/* =====================================================
   CHĪFAN PRIME — Backend Server (Node.js, zero deps)
   Serves: User panel (/), Admin panel (/admin), REST API (/api/*)
   Database: /home/user/data/db.json
   ===================================================== */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/* ---------------- Database ---------------- */
const DEFAULT_DB = {
  settings: {
    adminPassword: "Naitik80",
    storeName: "CHĪFAN PRIME",
    upiId: "chifanprime@upi"
  },
  categories: ["All Dishes", "Dim Sum", "Noodles", "Ramen", "Bao", "Drinks"],
  dishes: [
    { id: 1, name: "Truffle Crystal Dim Sum", category: "Dim Sum", price: 349, rating: 4.96, reviews: "2.4k+", veg: true, spice: "Mild 🥟", cook: "Bamboo Steam", image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80", desc: "Translucent dumplings crafted with wild shiitake mushrooms and natural black truffle glaze.", relatedIds: [2, 5, 7] },
    { id: 2, name: "Firecracker Dan-Dan Noodles", category: "Noodles", price: 289, rating: 4.89, reviews: "3.8k+", veg: true, spice: "Hot 🔥🔥", cook: "High Heat Wok", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80", desc: "Artisanal hand-pulled wheat noodles drenched in Sichuan peppercorn chilli crisp.", relatedIds: [1, 4, 6] },
    { id: 3, name: "Tokyo Rich Miso Ramen", category: "Ramen", price: 399, rating: 4.92, reviews: "1.9k+", veg: true, spice: "Medium 🌶️", cook: "12-Hr Simmered", image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80", desc: "Silky umami miso broth layered with springy noodles, silken tofu, and nori sheets.", relatedIds: [1, 4, 8] },
    { id: 4, name: "Crispy Sriracha Lotus Bao", category: "Bao", price: 249, rating: 4.81, reviews: "1.4k+", veg: true, spice: "Mild 🌶️", cook: "Double Steamed", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80", desc: "Pillow-soft lotus bao buns stuffed with crispy spiced cottage cheese and chili glaze.", relatedIds: [2, 3, 7] },
    { id: 5, name: "Fiery Schezwan Fried Momos", category: "Dim Sum", price: 219, rating: 4.88, reviews: "4.1k+", veg: true, spice: "Extra Hot 🔥🔥🔥", cook: "Golden Crisp", image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80", desc: "Crisp golden momos tossed in wok-reduced smoky garlic Sichuan glaze.", relatedIds: [1, 2, 7] },
    { id: 6, name: "Hong Kong Hakka Wok Noodles", category: "Noodles", price: 269, rating: 4.75, reviews: "1.7k+", veg: true, spice: "Medium 🌶️", cook: "Wok Tossed", image: "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80", desc: "Eggless noodles tossed with crisp bell peppers, cabbage ribbons and dark soy aroma.", relatedIds: [2, 4, 5] },
    { id: 7, name: "Signature Brown Sugar Boba", category: "Drinks", price: 199, rating: 4.95, reviews: "5.2k+", veg: true, spice: "Sweet 🍯", cook: "Cold Infused", image: "https://images.unsplash.com/photo-1558857563-b37cf5c8b211?auto=format&fit=crop&w=600&q=80", desc: "Warm caramelized muscovado tapioca pearls served with chilled organic milk.", relatedIds: [1, 2, 8] },
    { id: 8, name: "Kyoto Ceremonial Iced Matcha", category: "Drinks", price: 229, rating: 4.91, reviews: "920+", veg: true, spice: "Sweet 🍵", cook: "Hand Whisked", image: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80", desc: "Authentic first-harvest Uji matcha whisked with almond milk and chilled over ice.", relatedIds: [3, 7] }
  ],
  banners: [
    { tag: "⚡ FLASH 40% OFF", title: "Artisanal Crystal Dim Sums", desc: "Handcrafted shiitake truffle dumplings with house chili glaze.", cta: "Explore Deal", img: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80", color: "from-red-600 to-rose-700" },
    { tag: "🔥 CHEF SPECIAL", title: "1-for-1 Firecracker Dan-Dan Bowls", desc: "Sichuan hand-pulled noodles with roasted peanuts.", cta: "Claim Combo", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80", color: "from-amber-600 to-red-600" }
  ],
  users: [],
  orders: []
};

let db;
function loadDB() {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    db = JSON.parse(JSON.stringify(DEFAULT_DB));
    saveDB();
  }
}
let saveTimer = null;
function saveDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }, 100);
}
loadDB();

/* ---------------- Admin auth ---------------- */
const adminTokens = new Set();
function isAdmin(req) {
  const t = req.headers["x-admin-token"];
  return t && adminTokens.has(t);
}

/* ---------------- Helpers ---------------- */
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { resolve({}); }
    });
  });
}
const STAGE_INFO = {
  1: { status: "Order Vaulted & Received ✅", defaultEta: "25 Mins" },
  2: { status: "Wok Cooking & Thermal Boxed 📦", defaultEta: "14 Mins" },
  3: { status: "Cyber Agent En-Route 🏍️", defaultEta: "5 Mins" },
  4: { status: "Vault Delivered ✅", defaultEta: "Arrived 🎉" }
};

/* ---------------- Static files ---------------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp"
};
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(buf);
  });
}

/* ---------------- Server ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;

  if (req.method === "OPTIONS") return sendJSON(res, 200, { ok: true });

  /* ========== PUBLIC API ========== */

  // Bootstrap data for the user panel
  if (p === "/api/bootstrap" && req.method === "GET") {
    return sendJSON(res, 200, {
      dishes: db.dishes, categories: db.categories, banners: db.banners, settings: { storeName: db.settings.storeName, upiId: db.settings.upiId }
    });
  }

  // Create order (from user panel checkout)
  if (p === "/api/orders" && req.method === "POST") {
    const b = await readBody(req);
    if (!b.items || !b.items.length) return sendJSON(res, 400, { error: "No items" });
    const id = b.id || ("CF-" + Math.floor(1000 + Math.random() * 9000));
    const order = {
      id,
      items: b.items,
      total: b.total || 0,
      method: b.method || "COD",
      name: b.name || "", phone: b.phone || "", address: b.address || "", landmark: b.landmark || "",
      stage: 1,
      status: STAGE_INFO[1].status,
      eta: STAGE_INFO[1].defaultEta,
      date: b.date || new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
      createdAt: Date.now()
    };
    db.orders.unshift(order);
    saveDB();
    return sendJSON(res, 200, { ok: true, order });
  }

  // Track order (user panel Track Matrix polls this)
  if (p.startsWith("/api/orders/track/") && req.method === "GET") {
    const id = decodeURIComponent(p.split("/")[4] || "");
    const order = db.orders.find((o) => o.id === id);
    if (!order) return sendJSON(res, 404, { error: "Order not found" });
    return sendJSON(res, 200, { order });
  }

  // Order history for a user (by phone or email)
  if (p === "/api/my-orders" && req.method === "GET") {
    const phone = (url.searchParams.get("phone") || "").trim();
    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    const orders = db.orders.filter((o) =>
      (phone && (o.phone || "").replace(/\D/g, "").endsWith(phone.replace(/\D/g, "").slice(-10))) ||
      (email && (o.email || "").toLowerCase() === email)
    );
    return sendJSON(res, 200, { orders });
  }

  // Upsert user profile (login/signup/profile-save from user panel)
  if (p === "/api/users/sync" && req.method === "POST") {
    const b = await readBody(req);
    if (!b.phone && !b.email) return sendJSON(res, 400, { error: "phone or email required" });
    const norm = (s) => (s || "").trim().toLowerCase();
    let u = db.users.find(
      (x) => (b.phone && x.phone && x.phone.replace(/\D/g, "") === String(b.phone).replace(/\D/g, "")) ||
             (b.email && norm(x.email) === norm(b.email))
    );
    if (u) {
      Object.assign(u, { name: b.name || u.name, phone: b.phone || u.phone, email: b.email || u.email, address: b.address || u.address, lastSeen: Date.now() });
    } else {
      u = { id: "U-" + crypto.randomBytes(3).toString("hex").toUpperCase(), name: b.name || "Operative", phone: b.phone || "", email: b.email || "", address: b.address || "", joined: Date.now(), lastSeen: Date.now() };
      db.users.push(u);
    }
    saveDB();
    return sendJSON(res, 200, { ok: true, user: u });
  }

  /* ========== ADMIN API ========== */

  if (p === "/api/admin/login" && req.method === "POST") {
    const b = await readBody(req);
    if (b.password === db.settings.adminPassword) {
      const token = crypto.randomBytes(24).toString("hex");
      adminTokens.add(token);
      return sendJSON(res, 200, { ok: true, token });
    }
    return sendJSON(res, 401, { error: "Wrong password" });
  }

  if (p.startsWith("/api/admin/")) {
    if (!isAdmin(req)) return sendJSON(res, 401, { error: "Unauthorized" });

    // Whole DB snapshot for dashboard
    if (p === "/api/admin/db" && req.method === "GET") {
      return sendJSON(res, 200, { db: { ...db, settings: { ...db.settings, adminPassword: undefined } } });
    }

    /* ----- Dishes CRUD ----- */
    if (p === "/api/admin/dishes" && req.method === "POST") {
      const b = await readBody(req);
      const id = Math.max(0, ...db.dishes.map((d) => d.id)) + 1;
      const dish = {
        id, name: b.name || "New Dish", category: b.category || db.categories[1] || "Dim Sum",
        price: Number(b.price) || 0, rating: Number(b.rating) || 4.5, reviews: b.reviews || "New",
        veg: b.veg !== false, spice: b.spice || "Mild 🌶️", cook: b.cook || "Wok Tossed",
        image: b.image || "", desc: b.desc || "", relatedIds: Array.isArray(b.relatedIds) ? b.relatedIds : []
      };
      db.dishes.push(dish); saveDB();
      return sendJSON(res, 200, { ok: true, dish });
    }
    if (p.match(/^\/api\/admin\/dishes\/\d+$/)) {
      const id = Number(p.split("/")[4]);
      const idx = db.dishes.findIndex((d) => d.id === id);
      if (idx === -1) return sendJSON(res, 404, { error: "Dish not found" });
      if (req.method === "PUT") {
        const b = await readBody(req);
        const d = db.dishes[idx];
        ["name", "category", "reviews", "spice", "cook", "image", "desc"].forEach((k) => { if (b[k] !== undefined) d[k] = b[k]; });
        if (b.price !== undefined) d.price = Number(b.price);
        if (b.rating !== undefined) d.rating = Number(b.rating);
        if (b.veg !== undefined) d.veg = !!b.veg;
        if (Array.isArray(b.relatedIds)) d.relatedIds = b.relatedIds;
        saveDB();
        return sendJSON(res, 200, { ok: true, dish: d });
      }
      if (req.method === "DELETE") {
        db.dishes.splice(idx, 1); saveDB();
        return sendJSON(res, 200, { ok: true });
      }
    }

    /* ----- Categories ----- */
    if (p === "/api/admin/categories" && req.method === "PUT") {
      const b = await readBody(req);
      if (!Array.isArray(b.categories) || !b.categories.length) return sendJSON(res, 400, { error: "categories array required" });
      const cats = b.categories.map((c) => String(c).trim()).filter(Boolean);
      if (cats[0] !== "All Dishes") cats.unshift("All Dishes");
      db.categories = [...new Set(cats)];
      saveDB();
      return sendJSON(res, 200, { ok: true, categories: db.categories });
    }

    /* ----- Banners ----- */
    if (p === "/api/admin/banners" && req.method === "PUT") {
      const b = await readBody(req);
      if (!Array.isArray(b.banners)) return sendJSON(res, 400, { error: "banners array required" });
      db.banners = b.banners.map((x) => ({
        tag: x.tag || "", title: x.title || "", desc: x.desc || "", cta: x.cta || "Explore",
        img: x.img || "", color: x.color || "from-red-600 to-rose-700"
      }));
      saveDB();
      return sendJSON(res, 200, { ok: true, banners: db.banners });
    }

    /* ----- Orders: update stage / eta / delete ----- */
    if (p.match(/^\/api\/admin\/orders\/[^/]+$/)) {
      const id = decodeURIComponent(p.split("/")[4]);
      const order = db.orders.find((o) => o.id === id);
      if (!order) return sendJSON(res, 404, { error: "Order not found" });
      if (req.method === "PUT") {
        const b = await readBody(req);
        if (b.stage !== undefined) {
          const st = Math.min(4, Math.max(1, Number(b.stage)));
          order.stage = st;
          order.status = b.status || STAGE_INFO[st].status;
          if (b.eta === undefined) order.eta = STAGE_INFO[st].defaultEta;
        }
        if (b.eta !== undefined) order.eta = b.eta;
        if (b.status !== undefined) order.status = b.status;
        saveDB();
        return sendJSON(res, 200, { ok: true, order });
      }
      if (req.method === "DELETE") {
        db.orders = db.orders.filter((o) => o.id !== id);
        saveDB();
        return sendJSON(res, 200, { ok: true });
      }
    }

    /* ----- Users: update / delete ----- */
    if (p.match(/^\/api\/admin\/users\/[^/]+$/)) {
      const id = decodeURIComponent(p.split("/")[4]);
      const u = db.users.find((x) => x.id === id);
      if (!u) return sendJSON(res, 404, { error: "User not found" });
      if (req.method === "PUT") {
        const b = await readBody(req);
        ["name", "phone", "email", "address"].forEach((k) => { if (b[k] !== undefined) u[k] = b[k]; });
        saveDB();
        return sendJSON(res, 200, { ok: true, user: u });
      }
      if (req.method === "DELETE") {
        db.users = db.users.filter((x) => x.id !== id);
        saveDB();
        return sendJSON(res, 200, { ok: true });
      }
    }

    /* ----- Settings ----- */
    if (p === "/api/admin/settings" && req.method === "PUT") {
      const b = await readBody(req);
      if (b.adminPassword) db.settings.adminPassword = String(b.adminPassword);
      if (b.storeName) db.settings.storeName = String(b.storeName);
      if (b.upiId) db.settings.upiId = String(b.upiId);
      saveDB();
      return sendJSON(res, 200, { ok: true });
    }

    return sendJSON(res, 404, { error: "Unknown admin route" });
  }

  /* ========== STATIC ========== */
  if (p === "/" || p === "/index.html") {
    // index.html ya chifan-prime.html — jo bhi maujood ho use serve karo
    const userPanel = fs.existsSync(path.join(ROOT, "index.html"))
      ? path.join(ROOT, "index.html")
      : path.join(ROOT, "chifan-prime.html");
    return serveFile(res, userPanel);
  }
  if (p === "/admin" || p === "/admin.html") return serveFile(res, path.join(ROOT, "admin.html"));
  const safe = path.normalize(path.join(ROOT, p)).replace(/^(\.\.[/\\])+/, "");
  if (safe.startsWith(ROOT) && fs.existsSync(safe) && fs.statSync(safe).isFile()) return serveFile(res, safe);
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ CHĪFAN PRIME server running on http://0.0.0.0:${PORT}`);
  console.log(`   User panel  → /`);
  console.log(`   Admin panel → /admin  (default password: admin123)`);
});
