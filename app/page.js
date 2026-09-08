"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import BookingModal from "../components/BookingModal";

const STATUS = {
  booked: { label: "จองแล้ว", color: "#e90046" },
  waiting_payment: { label: "รอชำระเงิน", color: "#f0a11d" },
  maintenance: { label: "ปิดปรับปรุง", color: "#55585d" },
  available: { label: "ว่าง", color: "#20a66a" },
  cancelled: { label: "ยกเลิก", color: "#9ca0a6" }
};

const thaiMonths = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"
];
const thaiWeek = ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];

function pad(n) { return String(n).padStart(2, "0"); }
function dateKey(y,m,d) { return `${y}-${pad(m+1)}-${pad(d)}`; }

export default function Home() {
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBookings() {
    setLoading(true);
    setError("");
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .gte("booking_date", dateKey(start.getFullYear(), start.getMonth(), start.getDate()))
      .lte("booking_date", dateKey(end.getFullYear(), end.getMonth(), end.getDate()))
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setBookings(data || []);
    setLoading(false);
  }

  useEffect(() => { loadBookings(); }, [viewDate]);

  useEffect(() => {
    const channel = supabase.channel("bookings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, loadBookings)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [viewDate]);

  const byDate = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!map[b.booking_date]) map[b.booking_date] = [];
      map[b.booking_date].push(b);
    });
    return map;
  }, [bookings]);

  const days = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const first = new Date(y,m,1).getDay();
    const count = new Date(y,m+1,0).getDate();
    const cells = [];
    for (let i=0;i<first;i++) cells.push(null);
    for (let d=1;d<=count;d++) cells.push(d);
    return cells;
  }, [viewDate]);

  function moveMonth(delta) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+delta, 1));
  }

  function openDay(d) {
    if (!d) return;
    const key = dateKey(viewDate.getFullYear(), viewDate.getMonth(), d);
    const items = byDate[key] || [];
    const active = items.find(x => x.status !== "cancelled");
    if (active) setSelectedBooking(active);
    else setSelectedDate(key);
  }

  const visibleBookings = bookings.filter(b => filter === "all" || b.status === filter);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✓</div>
          <h1>ปฏิทินฝ่ายขาย</h1>
        </div>
        <button className="menu-btn" aria-label="เมนู"><span></span><span></span><span></span></button>
      </header>

      <section className="calendar-section">
        <div className="month-row">
          <button className="circle-btn" onClick={() => moveMonth(-1)}>‹</button>
          <button className="month-title" onClick={() => setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))}>
            {thaiMonths[viewDate.getMonth()]} <span className="chev">⌄</span>
          </button>
          <button className="circle-btn" onClick={() => moveMonth(1)}>›</button>
        </div>

        <div className="filter-row">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">ทุกสถานะ</option>
            <option value="booked">จองแล้ว</option>
            <option value="waiting_payment">รอชำระเงิน</option>
            <option value="maintenance">ปิดปรับปรุง</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <button className="circle-btn refresh" onClick={loadBookings}>↻</button>
        </div>

        <div className="legend">
          <span><i style={{background: STATUS.available.color}}/>ว่าง</span>
          <span><i style={{background: STATUS.booked.color}}/>จองแล้ว</span>
          <span><i style={{background: STATUS.waiting_payment.color}}/>รอชำระเงิน</span>
          <span><i style={{background: STATUS.maintenance.color}}/>ปิดปรับปรุง</span>
        </div>

        <div className="week-row">
          {thaiWeek.map(x => <div key={x}>{x}</div>)}
        </div>

        {error && <div className="error">เชื่อมต่อฐานข้อมูลไม่ได้: {error}</div>}

        <div className="calendar-grid">
          {days.map((d, i) => {
            if (!d) return <div className="day empty" key={`e-${i}`} />;
            const key = dateKey(viewDate.getFullYear(), viewDate.getMonth(), d);
            const items = byDate[key] || [];
            const active = items.find(x => x.status !== "cancelled");
            const status = active?.status;
            const isToday = key === dateKey(now.getFullYear(), now.getMonth(), now.getDate());
            return (
              <button
                className={`day ${status ? `status-${status}` : ""} ${isToday ? "today" : ""}`}
                key={key}
                onClick={() => openDay(d)}
              >
                <strong>{d}</strong>
                {active && <span className="mini-status">{STATUS[status]?.label}</span>}
              </button>
            );
          })}
        </div>

        {loading && <div className="loading">กำลังโหลดข้อมูล…</div>}

        <section className="booking-list">
          <div className="list-head">
            <h2>รายการในเดือนนี้</h2>
            <span>{visibleBookings.filter(x => x.status !== "cancelled").length} รายการ</span>
          </div>
          {visibleBookings.map(b => (
            <button className="list-item" key={b.id} onClick={() => setSelectedBooking(b)}>
              <span className="date-chip">{new Date(b.booking_date+"T00:00:00").getDate()}</span>
              <span className="list-main">
                <b>{b.customer_name}</b>
                <small>{b.booking_code} · ผู้ใหญ่ {b.adults} คน, เด็ก {b.children} คน</small>
              </span>
              <span className="status-pill" style={{color: STATUS[b.status]?.color}}>{STATUS[b.status]?.label}</span>
            </button>
          ))}
        </section>
      </section>

      <BookingModal
        date={selectedDate}
        booking={selectedBooking}
        onClose={() => { setSelectedDate(null); setSelectedBooking(null); }}
        onSaved={() => { setSelectedDate(null); setSelectedBooking(null); loadBookings(); }}
      />
    </main>
  );
}
