# ปฏิทินฝ่ายขาย — Next.js + Supabase

โปรเจกต์ตัวอย่างพร้อมใช้งานสำหรับระบบปฏิทินจองแบบในภาพ:
- ปฏิทินรายเดือน
- คลิกวันที่เพื่อเพิ่มการจอง
- คลิกวันที่มีข้อมูลเพื่อดูรายละเอียด
- สีแยกสถานะ
- แก้ไขข้อมูล
- ย้ายวันจอง
- ยกเลิกการจองโดยเก็บประวัติไว้
- Realtime sync ผ่าน Supabase
- Responsive สำหรับมือถือ/คอม

## 1) สร้าง Supabase
สร้างโปรเจกต์ใหม่ใน Supabase แล้วเปิด SQL Editor
นำไฟล์ `supabase/schema.sql` ไป Run

จากนั้นไปที่ Project Settings > API แล้วคัดลอก:
- Project URL
- anon public key

## 2) ตั้งค่าโปรเจกต์
คัดลอก `.env.local.example` เป็น `.env.local`

ใส่ค่า:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

## 3) ติดตั้งและรัน
```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## หมายเหตุเรื่อง Login
SQL ชุดนี้ตั้ง policy ให้เฉพาะ `authenticated` จัดการข้อมูลได้
ดังนั้นก่อนใช้งานจริงควรทำหน้า Login ด้วย Supabase Auth

## โครงสร้าง
- `app/page.js` หน้าปฏิทิน
- `components/BookingModal.js` popup เพิ่ม/ดู/แก้ไข/ย้าย/ยกเลิก
- `lib/supabase.js` ตัวเชื่อม Supabase
- `supabase/schema.sql` ตาราง + RLS + trigger
- `app/globals.css` UI
