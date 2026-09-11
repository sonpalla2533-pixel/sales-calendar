"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { supabase } from "../lib/supabase";

const STATUS = {
  booked: "จองแล้ว",
  waiting_payment: "รอชำระเงิน",
  maintenance: "ปิดปรับปรุง",
  cancelled: "ยกเลิก"
};

function thaiDate(key) {
  if (!key) return "";
  const d = new Date(key + "T00:00:00");
  return `${d.getDate()} ${["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."][d.getMonth()]} ${d.getFullYear()+543}`;
}

function receiptDate(key) {
  if (!key) return "-";
  const d = new Date(key + "T00:00:00");
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()+543}`;
}

function receiptCode(code) {
  if (!code) return "-";
  return String(code).replace(/^KSV[-\s]*/i, "");
}

export default function BookingModal({ date, booking, onClose, onSaved }) {
  const open = !!date || !!booking;
  const [mode, setMode] = useState(booking ? "view" : "form");
  const [form, setForm] = useState({});
  const [moveDate, setMoveDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const detailRef = useRef(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    setMode(booking ? "view" : "form");
    setMessage("");
    setForm(booking || {
      booking_date: date,
      customer_name: "",
      phone: "",
      food: "ไม่ได้สั่งเพิ่ม",
      adults: 1,
      children: 0,
      note: "",
      status: "booked",
      deposit: 0,
      remaining: 0
    });
    setMoveDate(booking?.booking_date || "");
  }, [booking, date]);

  if (!open) return null;

  async function save() {
    setSaving(true); setMessage("");
    const payload = {
      booking_date: form.booking_date,
      customer_name: form.customer_name,
      phone: form.phone,
      food: form.food,
      adults: Number(form.adults || 0),
      children: Number(form.children || 0),
      note: form.note,
      status: form.status,
      deposit: Number(form.deposit || 0),
      remaining: Number(form.remaining || 0)
    };
    const result = booking
      ? await supabase.from("bookings").update(payload).eq("id", booking.id)
      : await supabase.from("bookings").insert(payload);
    if (result.error) setMessage(result.error.message);
    else onSaved();
    setSaving(false);
  }

  async function moveBooking() {
    if (!moveDate) return;
    setSaving(true); setMessage("");
    const { error } = await supabase.from("bookings").update({ booking_date: moveDate }).eq("id", booking.id);
    if (error) setMessage(error.message);
    else onSaved();
    setSaving(false);
  }

  async function cancelBooking() {
    if (!confirm("ยืนยันยกเลิกการจองนี้หรือไม่?")) return;
    setSaving(true);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (error) setMessage(error.message);
    else onSaved();
    setSaving(false);
  }

  async function downloadReceipt() {
    if (!receiptRef.current || !booking) return;
    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: "#fff",
      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
      useCORS: true
    });
    const fileName = `รายละเอียดการจอง-${booking.customer_name || "ลูกค้า"}.png`;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ files: [file], title: "รายละเอียดการจอง" });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    const link = document.createElement("a");
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const total = Number(booking?.deposit || 0) + Number(booking?.remaining || 0);

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="close-btn" onClick={onClose}>×</button>

        {mode === "view" ? (
          <>
            <div ref={detailRef} className="detail-export">
              <div className="modal-date">{thaiDate(booking.booking_date)}</div>
              <h2>รายละเอียดการจอง</h2>
              <div className="detail-card">
                <div className="detail-top">
                  <span className={`big-status status-${booking.status}`}>{STATUS[booking.status]}</span>
                </div>
                <Row label="ชื่อ" value={booking.customer_name}/>
                <Row label="เบอร์โทร" value={booking.phone || "-"}/>
                <Row label="รายการอาหาร" value={booking.food || "-"}/>
                <Row label="ผู้เข้าพัก" value={`ผู้ใหญ่ ${booking.adults} คน, เด็ก ${booking.children} คน`}/>
                <Row label="มัดจำ" value={`${Number(booking.deposit||0).toLocaleString()} บาท`}/>
                <Row label="คงเหลือ" value={`${Number(booking.remaining||0).toLocaleString()} บาท`}/>
                <Row label="หมายเหตุ" value={booking.note || "-"}/>
              </div>
            </div>

            <div ref={receiptRef} className="receipt-export" aria-hidden="true">
              <div className="receipt-perforation top"></div>
              <div className="receipt-inner">
                <div className="receipt-title-th">รายละเอียดการจอง</div>
                <div className="receipt-line">------------------------------------------</div>
                <div className="receipt-row"><span>เลขที่การจอง</span><b>{receiptCode(booking.booking_code)}</b></div>
                <div className="receipt-row"><span>วันที่จอง</span><b>{receiptDate(booking.booking_date)}</b></div>
                <div className="receipt-row"><span>สถานะการจอง</span><b>{STATUS[booking.status] || "-"}</b></div>
                <div className="receipt-spacer"></div>
                <div className="receipt-row"><span>ชื่อลูกค้า</span><b>{booking.customer_name || "-"}</b></div>
                <div className="receipt-row"><span>เบอร์โทรศัพท์</span><b>{booking.phone || "-"}</b></div>
                <div className="receipt-row"><span>จำนวนผู้ใหญ่</span><b>{Number(booking.adults || 0)} คน</b></div>
                <div className="receipt-row"><span>จำนวนเด็ก</span><b>{Number(booking.children || 0)} คน</b></div>
                <div className="receipt-line">------------------------------------------</div>
                <div className="receipt-section">รายการอาหาร</div>
                <div className="receipt-row"><span>รายการ</span><b>{booking.food || "-"}</b></div>
                <div className="receipt-line">------------------------------------------</div>
                <div className="receipt-section">รายละเอียดการชำระเงิน</div>
                <div className="receipt-row"><span>เงินมัดจำ</span><b>{Number(booking.deposit || 0).toLocaleString()} บาท</b></div>
                <div className="receipt-row"><span>ยอดคงเหลือ</span><b>{Number(booking.remaining || 0).toLocaleString()} บาท</b></div>
                <div className="receipt-row"><span>รวมทั้งหมด</span><b>{total.toLocaleString()} บาท</b></div>
                <div className="receipt-line">------------------------------------------</div>
                <div className="receipt-section">หมายเหตุ</div>
                <div className="receipt-note">{booking.note || "-"}</div>
                <div className="receipt-line receipt-bottom-line">------------------------------------------</div>
                <div className="receipt-thanks-th">ขอบคุณที่ใช้บริการ</div>
                <div className="receipt-wifi">
                  <div className="receipt-wifi-title">📶 WiFi aisfibre5G_Khonsan Village</div>
                  <div className="receipt-wifi-pass">Password: <b>Ksv090868</b></div>
                </div>
              </div>
              <div className="receipt-perforation bottom"></div>
            </div>

            {message && <div className="error">{message}</div>}
            <div className="actions">
              <button className="btn secondary export-hide" onClick={downloadReceipt}>ดาวน์โหลดรูปภาพรายละเอียด</button>
              <button className="btn secondary" onClick={() => setMode("form")}>แก้ไข</button>
              <button className="btn secondary" onClick={() => setMode("move")}>ย้ายวัน</button>
              {booking.status !== "cancelled" && <button className="btn danger" onClick={cancelBooking}>ยกเลิก</button>}
            </div>
          </>
        ) : mode === "move" ? (
          <>
            <div className="modal-date">ย้ายการจอง</div>
            <h2>ย้ายวันจอง</h2>
            <p className="muted">จากวันที่ <b>{thaiDate(booking.booking_date)}</b></p>
            <label>เป็นวันที่</label>
            <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} />
            {message && <div className="error">{message}</div>}
            <div className="actions">
              <button className="btn secondary" onClick={() => setMode("view")}>กลับ</button>
              <button className="btn primary" disabled={saving} onClick={moveBooking}>{saving ? "กำลังบันทึก…" : "ยืนยันย้ายวัน"}</button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-date">{thaiDate(form.booking_date)}</div>
            <h2>{booking ? "แก้ไขการจอง" : "เพิ่มการจอง"}</h2>
            <div className="form-grid">
              <label>วันที่<input type="date" value={form.booking_date || ""} onChange={e => set("booking_date",e.target.value)}/></label>
              <label>ชื่อ<input value={form.customer_name || ""} onChange={e => set("customer_name",e.target.value)} placeholder="ชื่อลูกค้า"/></label>
              <label>เบอร์โทร<input value={form.phone || ""} onChange={e => set("phone",e.target.value)} placeholder="เบอร์โทร"/></label>
              <label>รายการอาหาร<select value={form.food || ""} onChange={e => set("food",e.target.value)}><option>ไม่ได้สั่งเพิ่ม</option><option>สั่งอาหารแล้ว</option><option>รอยืนยัน</option></select></label>
              <label>ผู้ใหญ่<input type="number" min="0" value={form.adults ?? 0} onChange={e => set("adults",e.target.value)}/></label>
              <label>เด็ก<input type="number" min="0" value={form.children ?? 0} onChange={e => set("children",e.target.value)}/></label>
              <label>มัดจำ (บาท)<input type="number" min="0" value={form.deposit ?? 0} onChange={e => set("deposit",e.target.value)}/></label>
              <label>คงเหลือ (บาท)<input type="number" min="0" value={form.remaining ?? 0} onChange={e => set("remaining",e.target.value)}/></label>
              <label className="full">สถานะ<select value={form.status || "booked"} onChange={e => set("status",e.target.value)}><option value="booked">จองแล้ว</option><option value="waiting_payment">รอชำระเงิน</option><option value="maintenance">ปิดปรับปรุง</option></select></label>
              <label className="full">หมายเหตุ<textarea rows="4" value={form.note || ""} onChange={e => set("note",e.target.value)} placeholder="รายละเอียดเพิ่มเติม"/></label>
            </div>
            {message && <div className="error">{message}</div>}
            <div className="actions">
              <button className="btn secondary" onClick={() => booking ? setMode("view") : onClose()}>ยกเลิก</button>
              <button className="btn primary" disabled={saving || !form.customer_name} onClick={save}>{saving ? "กำลังบันทึก…" : "บันทึก"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({label,value}) {
  return <div className="detail-row"><span>{label}</span><b>{value}</b></div>;
}
