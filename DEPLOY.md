# LH Cars — Deploy Guide / Panduan Hosting

**BM + EN** · Static site (HTML/CSS/JS) — tiada server backend diperlukan.

Zip siap upload: `/workspace/lh-cars-dist/LH-Cars-Website.zip`

---

## (a) Unzip & upload · Nyahzip & muat naik

**BM:**  
1. Muat turun `LH-Cars-Website.zip`.  
2. Nyahzip — anda akan nampak `index.html`, folder `assets/`, dll.  
3. Muat naik **semua isi** (bukan folder luar kosong) ke root hosting anda (`public_html`, `www`, atau root Pages project).  
4. Pastikan `index.html` di root supaya `yoursite.com/` terus buka laman utama.

**EN:**  
1. Download `LH-Cars-Website.zip`.  
2. Unzip — you should see `index.html`, `assets/`, etc.  
3. Upload **all contents** to your host root (`public_html`, `www`, or Pages project root).  
4. Keep `index.html` at the root so the homepage loads at `/`.

---

## (b) Free host options · Pilihan host percuma

### Netlify Drop (paling mudah)
1. Buka https://app.netlify.com/drop  
2. Seret folder site (atau zip yang sudah di-unzip) ke halaman itu.  
3. Netlify beri URL percuma (cth. `random-name.netlify.app`).  
4. Tiada kad kredit diperlukan untuk Drop asas.

### Cloudflare Pages
1. Buka https://pages.cloudflare.com/  
2. Sign up / log in Cloudflare.  
3. **Upload assets** → pilih folder static site → deploy.  
4. Dapat URL `*.pages.dev`.

### GitHub Pages (optional)
1. Cipta repo awam, push semua fail site ke branch `main` (root atau `/docs`).  
2. Settings → Pages → Source: Deploy from branch.  
3. URL: `https://USERNAME.github.io/REPO/`

### cPanel / shared hosting
Muat naik via File Manager atau FTP ke `public_html/`.

---

## (c) Custom domain kemudian · Domain sendiri

**BM / EN (ringkas):**
1. Beli domain (Namecheap, Cloudflare Registrar, etc.).  
2. Di Netlify/Cloudflare Pages: **Domain settings** → Add custom domain.  
3. Ikut arahan DNS:
   - **A / ALIAS / CNAME** seperti yang host tunjukkan (contoh CNAME `www` → `your-site.netlify.app`).  
4. Tunggu DNS propagate (selalunya minutes–48 jam).  
5. Aktifkan HTTPS (biasanya auto di Netlify / Cloudflare).

Contoh mental model: `lhcars.my` → CNAME/ALIAS ke host → HTTPS on.

---

## (d) Update car listings · Kemaskini listing kereta

Fail utama: **`cars.html`** (dan sample cards di **`index.html`** jika mahu sepadan).

Untuk setiap kereta:
1. Tukar nama model, tahun, mileage, jenis badan dalam `.car-card`.  
2. Kekalkan teks harga: **`Hubungi untuk harga`** — jangan isi RM.  
3. Kemaskini pautan WhatsApp `?text=...` supaya mesej praisi sebut model yang betul.  
4. Pastikan nombor kekal: `https://wa.me/60128744878`.  
5. Tanda `Sample` boleh dibuang bila unit sebenar — atau ganti dengan status ringkas (cth. “Available — enquire”).  
6. Upload semula fail yang diubah (atau re-drop folder ke Netlify).

**Jangan:** paparkan % komisen broker di laman awam.

---

## Semakan pantas selepas deploy

- [ ] Mobile menu ☰ berfungsi  
- [ ] Semua butang WhatsApp buka `wa.me/60128744878`  
- [ ] Floating FAB hijau kelihatan  
- [ ] Sticky bar mobile: “WhatsApp LH Cars · Hubungi untuk harga”  
- [ ] Share link nampak title/description (Open Graph)

**Sokongan:** WhatsApp +60128744878
