# 📷 CCTV UBON (React + Vite) - รวมกล้องวงจรปิดสดเมืองอุบลราชธานี

เว็บแอพพลิเคชัน **React 18 + Vite + Tailwind CSS** รวมกล้องวงจรปิดสด (Live CCTV 150+ จุด) และติดตามระดับน้ำแม่น้ำมูล M.7 ทั่วเขตเทศบาลนครอุบลราชธานี พัฒนาขึ้นมาเพื่อรันบน **Cloudflare Pages** โดยตรง

---

## 🛠️ Stack เทคโนโลยีที่เลือกใช้
- ⚛️ **React 18 + Vite**: โหลดเร็ว ทำงานแบบ Single Page Application (SPA) จัดการ State และ Component ได้ยืดหยุ่น
- 🎨 **Tailwind CSS + Lucide Icons**: ดีไซน์ Dark Glassmorphism เรียบหรู ทันสมัย
- ⚡ **Hls.js + IntersectionObserver**: ระบบตรวจจับ In-Viewport โหลดเล่นสตรีมเฉพาะจอที่เลื่อนมาเห็น และหยุดเล่นเมื่อเลื่อนพ้นจอ ประหยัดเน็ตและ CPU/GPU
- 🗺️ **Leaflet.js**: แผนที่ Interactive Map ปักหมุดกล้องทั่วเมืองอุบลฯ
- ☁️ **Cloudflare Pages + Functions**: ซัพพอร์ตการดีพลอยขึ้น Cloudflare Pages 100% พร้อม Edge Function คลีน Header CORS อัตโนมัติ

---

## 💻 วิธีเปิดทดสอบบนเครื่อง Local

เปิด Terminal ในโฟลเดอร์นี้ แล้วรันคำสั่ง:

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่: **http://localhost:3000**

*(ตัว Vite Dev Server มีการเซ็ต Reverse Proxy แก้ไข Header CORS ซ้ำซ้อนให้เรียบร้อยแล้ว)*

---

## 🚀 วิธีนำขึ้น Cloudflare Pages (Deploy)

### 📌 วิธีที่ 1: ผ่าน Git (GitHub / GitLab) - *แนะนำ*
1. Push โค้ดทั้งหมดขึ้น GitHub
2. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
3. เลือก Repository
4. ตั้งค่า **Build Settings**:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. กด **Save and Deploy**

---

### 📌 วิธีที่ 2: อัปโหลดโฟลเดอร์ Build โดยตรง (Direct Upload)
1. รันคำสั่งบิลด์บนเครื่อง:
   ```bash
   npm run build
   ```
2. โฟลเดอร์ `dist` จะถูกสร้างขึ้นมา
3. ก๊อปปี้โฟลเดอร์ `functions` ไปใส่ไว้ใน `dist` (หรือลากโฟลเดอร์ `dist` ขึ้น Cloudflare Pages Direct Upload)
