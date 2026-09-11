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

// ใช้วันที่ประเทศไทยโดยตรง เพื่อไม่ให้ timezone ของเครื่องทำให้วันคลาดเคลื่อน
function getThaiToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = {};
  parts.forEach(({ type, value }) => { if (type !== "literal") values[type] = value; });
  return new Date(Number(values.year), Number(values.month) - 1, Number(values.day));
}

export default function Home() {
  const initialToday = getThaiToday();
  const [today, setToday] = useState(initialToday);
  const [viewDate, setViewDate] = useState(new Date(initialToday.getFullYear(), initialToday.getMonth(), 1));
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthPicker, setMonthPicker] = useState(false);
  const calendarRef = useRef(null);

  useEffect(() => {
    let previousKey = dateKey(initialToday.getFullYear(), initialToday.getMonth(), initialToday.getDate());
    let previousCurrentYear = initialToday.getFullYear();
    let previousCurrentMonth = initialToday.getMonth();

    const updateToday = () => {
      const next = getThaiToday();
      const nextKey = dateKey(next.getFullYear(), next.getMonth(), next.getDate());
      setToday(next);

      if (nextKey !== previousKey) {
        setViewDate(currentView => {
          const stillViewingPreviousCurrentMonth =
            currentView.getFullYear() === previousCurrentYear &&
            currentView.getMonth() === previousCurrentMonth;
          return stillViewingPreviousCurrentMonth
            ? new Date(next.getFullYear(), next.getMonth(), 1)
            : currentView;
        });
        previousKey = nextKey;
        previousCurrentYear = next.getFullYear();
        previousCurrentMonth = next.getMonth();
      }
    };

    updateToday();
    const timer = setInterval(updateToday, 30000);
    return () => clearInterval(timer);
  }, []);

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
    const section = calendarRef.current;
    if (!section) return;
    const canvas = await html2canvas(section, {
      backgroundColor: "#ffffff",
      scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)),
      useCORS: true,
      onclone: (doc) => {
        const root = doc.querySelector("[data-calendar-export]");
        if (!root) return;

        // รูปดาวน์โหลดใช้เฉพาะเดือน + วันในสัปดาห์ + วันที่ ตามแบบที่กำหนด
        root.querySelectorAll(".circle-btn, .chev, .calendar-download-row, .loading, .error, .mini-status, .month-picker").forEach(el => {
          el.style.display = "none";
        });

        const monthTitle = root.querySelector(".month-title");
        if (monthTitle) {
          monthTitle.style.cursor = "default";
          monthTitle.style.fontSize = "34px";
          monthTitle.style.fontWeight = "800";
          monthTitle.style.color = "#000";
          monthTitle.style.padding = "0";
          monthTitle.style.margin = "0";
        }

        const monthWrap = root.querySelector(".month-picker-wrap");
        if (monthWrap) {
          monthWrap.style.display = "flex";
          monthWrap.style.justifyContent = "center";
        }

        root.querySelectorAll(".day strong").forEach(el => {
          el.style.color = "#000";
          el.style.background = "transparent";
          el.style.width = "auto";
          el.style.height = "auto";
          el.style.display = "block";
        });

        // ให้รูปออกมากระชับเหมือนภาพตัวอย่าง
        root.style.padding = "8px 10px 10px";
        root.style.boxSizing = "border-box";
        root.style.background = "#fff";
        root.style.width = "100%";

        const monthRow = root.querySelector(".month-row");
        if (monthRow) {
          monthRow.style.display = "block";
          monthRow.style.height = "auto";
          monthRow.style.margin = "0 0 10px";
        }

        const weekRow = root.querySelector(".week-row");
        if (weekRow) {
          weekRow.style.marginTop = "0";
          weekRow.style.paddingBottom = "8px";
          weekRow.style.fontSize = "18px";
        }

        const grid = root.querySelector(".calendar-grid");
        if (grid) {
          grid.style.gap = "8px";
          grid.style.marginTop = "10px";
        }

        root.querySelectorAll(".day").forEach(el => {
          el.style.borderRadius = "16px";
          el.style.padding = "4px";
        });
      }
    });

    const fileName = `ปฏิทิน-${thaiMonths[viewDate.getMonth()]}-${viewDate.getFullYear()+543}.png`;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ files: [file], title: "บันทึกปฏิทิน" });
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-icon">✓</div><h1>ปฏิทินฝ่ายขาย</h1></div>
        <button className="menu-btn" aria-label="เมนู"><span></span><span></span><span></span></button>
      </header>

      <section ref={calendarRef} data-calendar-export className="calendar-section">
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
            const isToday = key === dateKey(today.getFullYear(), today.getMonth(), today.getDate());
            return <button className={`day ${status ? `status-${status}` : ""} ${isToday ? "today" : ""}`} key={key} onClick={() => openDay(d)}>
              <strong>{d}</strong>{active && <span className="mini-status">{STATUS[status]?.label}</span>}
            </button>;
          })}
        </div>
        {loading && <div className="loading">กำลังโหลดข้อมูล…</div>}
        <div className="calendar-download-row export-hide"><button className="btn secondary download-calendar-btn" onClick={downloadCalendar}>ดาวน์โหลดรูปภาพหน้าปฏิทิน</button></div>
      </section>

      <BookingModal date={selectedDate} booking={selectedBooking}
        onClose={() => { setSelectedDate(null); setSelectedBooking(null); }}
        onSaved={() => { setSelectedDate(null); setSelectedBooking(null); loadBookings(); }} />
    </main>
  );
}
