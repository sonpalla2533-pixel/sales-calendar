"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import BookingModal from "../components/BookingModal";
import html2canvas from "html2canvas";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthPicker, setMonthPicker] = useState(false);
  const calendarRef = useRef(null);

  async function loadBookings() {
    setLoading(true); setError("");
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const { data, error } = await supabase
      .from("bookings").select("*")
      .gte("booking_date", dateKey(start.getFullYear(), start.getMonth(), start.getDate()))
      .lte("booking_date", dateKey(end.getFullYear(), end.getMonth(), end.getDate()))
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setBookings(data || []); setLoading(false);
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
    bookings.forEach(b => { if (!map[b.booking_date]) map[b.booking_date] = []; map[b.booking_date].push(b); });
    return map;
  }, [bookings]);

  const days = useMemo(() => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const first = new Date(y,m,1).getDay(), count = new Date(y,m+1,0).getDate();
    const cells = [];
    for (let i=0;i<first;i++) cells.push(null);
    for (let d=1;d<=count;d++) cells.push(d);
    return cells;
  }, [viewDate]);

  function moveMonth(delta) { setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth()+delta, 1)); setMonthPicker(false); }
  function chooseMonth(month) { setViewDate(new Date(viewDate.getFullYear(), month, 1)); setMonthPicker(false); }
  function openDay(d) {
    if (!d) return;
    const key = dateKey(viewDate.getFullYear(), viewDate.getMonth(), d);
    const active = (byDate[key] || []).find(x => x.status !== "cancelled");
    if (active) setSelectedBooking(active); else setSelectedDate(key);
  }

  async function downloadCalendar() {
    if (!calendarRef.current) return;
    const canvas = await html2canvas(calendarRef.current, {
      backgroundColor: "#ffffff", scale: 2, useCORS: true,
      onclone: (doc) => {
        const root = doc.querySelector("[data-calendar-export]");
        if (!root) return;
        root.querySelectorAll(".download-calendar-btn, .export-hide").forEach(el => el.style.display = "none");
        const today = root.querySelector(".today strong");
        if (today) {
          today.style.background = "transparent";
          today.style.color = "#000";
          today.style.width = "auto";
          today.style.height = "auto";
          today.style.display = "block";
        }
        const title = root.querySelector(".brand h1");
        if (title) title.style.visibility = "hidden";
      }
    });
    const link = document.createElement("a");
    link.download = `ปฏิทิน-${thaiMonths[viewDate.getMonth()]}-${viewDate.getFullYear()+543}.png`;
    link.href = canvas.toDataURL("image/png"); link.click();
  }

  return (
    <main className="app-shell">
      <div ref={calendarRef} data-calendar-export>
        <header className="topbar">
          <div className="brand"><div className="brand-icon">✓</div><h1>ปฏิทินฝ่ายขาย</h1></div>
          <button className="menu-btn" aria-label="เมนู"><span></span><span></span><span></span></button>
        </header>

        <section className="calendar-section">
          <div className="month-row">
            <button className="circle-btn" onClick={() => moveMonth(-1)}>‹</button>
            <div className="month-picker-wrap">
              <button className="month-title" onClick={() => setMonthPicker(v => !v)}>
                {thaiMonths[viewDate.getMonth()]} {viewDate.getFullYear() + 543} <span className="chev">⌄</span>
              </button>
              {monthPicker && <div className="month-picker">
                {thaiMonths.map((name, i) => <button key={name} className={i === viewDate.getMonth() ? "selected" : ""} onClick={() => chooseMonth(i)}>{name}</button>)}
              </div>}
            </div>
            <button className="circle-btn" onClick={() => moveMonth(1)}>›</button>
          </div>

          <div className="week-row">{thaiWeek.map(x => <div key={x}>{x}</div>)}</div>
          {error && <div className="error">เชื่อมต่อฐานข้อมูลไม่ได้: {error}</div>}
          <div className="calendar-grid">
            {days.map((d, i) => {
              if (!d) return <div className="day empty" key={`e-${i}`} />;
              const key = dateKey(viewDate.getFullYear(), viewDate.getMonth(), d);
              const active = (byDate[key] || []).find(x => x.status !== "cancelled");
              const status = active?.status;
              const isToday = key === dateKey(now.getFullYear(), now.getMonth(), now.getDate());
              return <button className={`day ${status ? `status-${status}` : ""} ${isToday ? "today" : ""}`} key={key} onClick={() => openDay(d)}>
                <strong>{d}</strong>{active && <span className="mini-status">{STATUS[status]?.label}</span>}
              </button>;
            })}
          </div>
          {loading && <div className="loading">กำลังโหลดข้อมูล…</div>}
          <div className="calendar-download-row export-hide"><button className="btn secondary download-calendar-btn" onClick={downloadCalendar}>ดาวน์โหลดรูปภาพหน้าปฏิทิน</button></div>
        </section>
      </div>

      <BookingModal date={selectedDate} booking={selectedBooking}
        onClose={() => { setSelectedDate(null); setSelectedBooking(null); }}
        onSaved={() => { setSelectedDate(null); setSelectedBooking(null); loadBookings(); }} />
    </main>
  );
}
