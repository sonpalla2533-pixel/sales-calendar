"use client";

import { useMemo, useState } from "react";

const ROOM_PRICE = 1900;
const HOUSE_PRICE = 3900;

function PersonIcon({ child = false }) {
  return (
    <svg className="line-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy={child ? "13" : "11"} r={child ? "6" : "7"} />
      <path d={child ? "M14 35c0-6 4-10 10-10s10 4 10 10v4H14z" : "M11 40c0-8 5-13 13-13s13 5 13 13"} />
    </svg>
  );
}

function RoomIcon() {
  return (
    <svg className="room-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 21h32v17H8z" />
      <path d="M12 21v-5h24v5" />
      <path d="M12 27h24" />
      <path d="M12 38v4M36 38v4" />
      <path d="M15 21v-5M33 21v-5" />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg className="room-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 23 24 10l15 13v16H9z" />
      <path d="M19 39V27h10v12M7 23h34" />
    </svg>
  );
}

export default function TestBookingPage() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingType, setBookingType] = useState("room");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deposit, setDeposit] = useState(0);
  const [showFood, setShowFood] = useState(false);
  const [food, setFood] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(`${checkIn}T00:00:00`);
    const b = new Date(`${checkOut}T00:00:00`);
    const diff = Math.round((b - a) / 86400000);
    return diff > 0 ? diff : 0;
  }, [checkIn, checkOut]);

  const price = bookingType === "room" ? ROOM_PRICE : HOUSE_PRICE;
  const total = nights ? price * nights : price;
  const remaining = Math.max(0, total - Number(deposit || 0));

  function changeAdults(delta) { setAdults(v => Math.max(1, v + delta)); }
  function changeChildren(delta) { setChildren(v => Math.max(0, v + delta)); }

  return (
    <main className="test-page">
      <div className="test-card">
        <header className="test-header">
          <div className="test-brand-icon">＋</div>
          <h1>จองคิวให้ลูกค้า</h1>
          <button className="test-menu" aria-label="เมนู"><i></i><i></i><i></i></button>
        </header>

        <section className="test-section">
          <div className="section-title"><span>1</span><h2>วันที่เข้าพัก</h2><b className="required-dot"></b><button className="reset" onClick={() => {setCheckIn("");setCheckOut("")}}>↶ รีเซ็ต</button></div>
          <div className="date-grid">
            <label><span>วันเช็คอิน</span><input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></label>
            <label><span>วันเช็คเอาท์</span><input type="date" min={checkIn || undefined} value={checkOut} onChange={e => setCheckOut(e.target.value)} /></label>
          </div>
          {nights > 0 && <div className="stay-info">เข้าพัก {nights} คืน</div>}
        </section>

        <section className="test-section">
          <div className="section-title"><span>2</span><h2>ข้อมูลลูกค้า</h2></div>
          <label className="field-label">ชื่อผู้จอง <b className="required-dot"></b><input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="ชื่อ-นามสกุล หรือชื่อเฟสบุ๊ค" /></label>
          <label className="field-label">เบอร์โทรศัพท์ <b className="required-dot"></b><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XXXXXXXXX" inputMode="tel" /></label>
        </section>

        <section className="test-section">
          <div className="section-title"><span>3</span><h2>ประเภทการจอง</h2></div>
          <div className="type-grid">
            <button className={`type-card ${bookingType === "room" ? "selected" : ""}`} onClick={() => setBookingType("room")}>
              <div className="type-icon"><RoomIcon /></div>
              <div><strong>1 ห้อง</strong><small>฿{ROOM_PRICE.toLocaleString()}/คืน</small></div>
              {bookingType === "room" && <em>✓</em>}
            </button>
            <button className={`type-card ${bookingType === "house" ? "selected" : ""}`} onClick={() => setBookingType("house")}>
              <div className="type-icon"><HouseIcon /></div>
              <div><strong>เหมาหลัง</strong><small>฿{HOUSE_PRICE.toLocaleString()}/คืน</small></div>
              {bookingType === "house" && <em>✓</em>}
            </button>
          </div>
        </section>

        <section className="test-section">
          <div className="section-title"><span>4</span><h2>ผู้เข้าพักและอาหาร</h2></div>
          <Counter label="ผู้ใหญ่" hint="อย่างน้อย 1 คน" value={adults} child={false} onMinus={() => changeAdults(-1)} onPlus={() => changeAdults(1)} />
          <Counter label="เด็ก" hint="ไม่เกิน 12 ปี" value={children} child onMinus={() => changeChildren(-1)} onPlus={() => changeChildren(1)} />

          {!showFood ? (
            <button className="add-row" onClick={() => setShowFood(true)}>＋ เพิ่มอาหาร</button>
          ) : (
            <div className="expand-box"><div className="expand-heading"><strong>อาหาร</strong><button onClick={() => {setShowFood(false);setFood("")}}>×</button></div><input value={food} onChange={e => setFood(e.target.value)} placeholder="ระบุรายการอาหาร" /></div>
          )}

          {!showNote ? (
            <button className="add-row" onClick={() => setShowNote(true)}>＋ เพิ่มหมายเหตุ</button>
          ) : (
            <div className="expand-box"><div className="expand-heading"><strong>หมายเหตุ</strong><button onClick={() => {setShowNote(false);setNote("")}}>×</button></div><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" rows="3" /></div>
          )}
        </section>

        <section className="test-section payment-section">
          <div className="section-title"><span>5</span><h2>การชำระเงิน</h2></div>
          <div className="payment-grid">
            <label className="field-label">มัดจำ (บาท)<input type="number" min="0" value={deposit} onChange={e => setDeposit(e.target.value)} /></label>
            <label className="field-label">คงเหลือ (บาท)<input value={remaining.toLocaleString()} readOnly /></label>
          </div>
        </section>

        <section className="test-total">
          <div><strong>ยอดรวมสุทธิ</strong><b>฿{total.toLocaleString()}</b></div>
          <p>{nights ? `${nights} คืน × ฿${price.toLocaleString()}` : "เลือกวันเช็คอินและเช็คเอาท์เพื่อคำนวณราคา"}</p>
        </section>

        <div className="test-actions"><button className="cancel-btn">ยกเลิก</button><button className="save-btn">บันทึกการจอง</button></div>
      </div>

      <style jsx>{`
        .test-page{min-height:100dvh;background:#f1f3f6;padding:18px;font-family:Arial,'Noto Sans Thai',sans-serif;color:#202329}
        .test-card{max-width:820px;margin:auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 35px #00000012}
        .test-header{height:94px;padding:0 28px;display:flex;align-items:center;gap:18px;border-bottom:1px solid #e7e8eb}
        .test-brand-icon{width:52px;height:52px;border-radius:16px;background:#e8f8ef;color:#18a762;display:grid;place-items:center;font-size:34px;font-weight:800}
        h1{font-size:30px;margin:0;font-weight:800}.test-menu{margin-left:auto;width:54px;height:54px;border:0;border-radius:16px;background:#f0f1f3;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center}.test-menu i{width:26px;height:4px;border-radius:4px;background:#303238}
        .test-section{padding:24px 30px;border-bottom:10px solid #f1f3f6}.section-title{display:flex;align-items:center;gap:13px;margin-bottom:18px}.section-title>span{width:40px;height:40px;border-radius:50%;background:#16b765;color:#fff;display:grid;place-items:center;font-size:21px;font-weight:800}.section-title h2{font-size:25px;margin:0;font-weight:800}.required-dot{display:inline-block;width:10px;height:10px;background:#ed3650;border-radius:50%;box-shadow:0 0 0 7px #ffecef}.reset{margin-left:auto;border:0;background:none;color:#d6294f;font-size:18px;font-weight:800;cursor:pointer}
        .date-grid,.payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.date-grid label,.field-label{font-size:16px;font-weight:800;display:flex;flex-direction:column;gap:7px}.date-grid input,.field-label input,.expand-box input,.expand-box textarea{width:100%;border:2px solid #dfe2e6;border-radius:16px;padding:14px 15px;font-size:17px;box-sizing:border-box;outline:none;background:#fff}.date-grid input:focus,.field-label input:focus,.expand-box input:focus,.expand-box textarea:focus{border-color:#19b66a}.stay-info{margin-top:10px;color:#18a762;font-weight:800}
        .field-label{margin-top:13px}.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.type-card{position:relative;min-height:128px;border:3px solid #e2e4e8;border-radius:24px;background:#fff;display:flex;align-items:center;gap:18px;padding:18px 22px;text-align:left;cursor:pointer}.type-card.selected{border-color:#1fba6b}.type-card em{position:absolute;right:15px;top:14px;width:38px;height:38px;border-radius:50%;background:#20b86c;color:#fff;display:grid;place-items:center;font-style:normal;font-size:23px}.type-icon{width:52px;display:grid;place-items:center;color:#aeb4bf}.room-icon{width:44px;height:44px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.type-card strong{display:block;font-size:24px}.type-card small{display:block;color:#969ca7;font-size:18px;font-weight:700;margin-top:5px}
        .counter{display:flex;align-items:center;justify-content:space-between;border:2px solid #e0e2e6;border-radius:20px;padding:17px 22px;margin-bottom:12px}.counter-title{display:flex;gap:12px;align-items:center}.line-icon{width:32px;height:32px;fill:none;stroke:#aeb4bf;stroke-width:2.7;stroke-linecap:round;stroke-linejoin:round}.counter-title strong{display:block;font-size:22px}.counter-title small{display:block;color:#9298a2;font-size:17px;font-weight:700;margin-top:3px}.counter-control{border:2px solid #d9dce1;border-radius:30px;display:flex;align-items:center;gap:25px;padding:8px 17px;font-size:25px;font-weight:800}.counter-control button{border:0;background:none;font-size:26px;color:#555;cursor:pointer;padding:0 5px}.add-row{border:0;background:none;color:#16a65d;font-size:21px;font-weight:800;padding:10px 0;cursor:pointer;display:block}.expand-box{border:2px solid #dfe2e6;border-radius:18px;padding:14px;margin:8px 0 12px}.expand-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;font-size:19px}.expand-heading button{border:0;background:#f0f1f3;border-radius:50%;width:28px;height:28px;cursor:pointer}.expand-box textarea{resize:vertical}
        .payment-section{border-bottom:10px solid #f1f3f6}.payment-grid{gap:14px}.payment-grid .field-label{margin-top:0}.payment-grid input[type="number"]{appearance:textfield}.payment-grid input[type="number"]::-webkit-outer-spin-button,.payment-grid input[type="number"]::-webkit-inner-spin-button{appearance:none;margin:0}
        .test-total{padding:24px 30px;background:#fff}.test-total>div{display:flex;justify-content:space-between;align-items:center}.test-total strong{font-size:25px}.test-total b{font-size:31px;color:#18a762}.test-total p{margin:6px 0 0;color:#8d939c}.test-actions{display:flex;gap:12px;padding:0 30px 30px}.cancel-btn,.save-btn{flex:1;border:0;border-radius:15px;padding:15px;font-size:18px;font-weight:800;cursor:pointer}.cancel-btn{background:#eef0f2}.save-btn{background:#19ad65;color:#fff}
        @media(max-width:600px){.test-page{padding:0;background:#fff}.test-card{border-radius:0;box-shadow:none}.test-header{height:76px;padding:0 16px;gap:11px}.test-brand-icon{width:45px;height:45px;border-radius:14px;font-size:28px}h1{font-size:22px}.test-menu{width:45px;height:45px}.test-section{padding:19px 16px;border-bottom-width:8px}.section-title{gap:10px;margin-bottom:14px}.section-title>span{width:36px;height:36px;font-size:18px}.section-title h2{font-size:21px}.reset{font-size:15px}.date-grid,.payment-grid{gap:8px}.date-grid label,.field-label{font-size:14px}.date-grid input,.field-label input,.expand-box input,.expand-box textarea{font-size:16px;padding:11px 10px;border-radius:13px}.type-grid{gap:8px}.type-card{min-height:105px;border-radius:18px;padding:12px;gap:9px}.type-icon{width:35px}.room-icon{width:32px;height:32px}.type-card strong{font-size:20px}.type-card small{font-size:14px}.type-card em{width:30px;height:30px;right:8px;top:8px;font-size:18px}.counter{padding:12px 13px;border-radius:16px}.counter-title{gap:8px}.line-icon{width:28px;height:28px}.counter-title strong{font-size:19px}.counter-title small{font-size:14px}.counter-control{gap:15px;font-size:23px;padding:6px 11px}.counter-control button{font-size:24px}.add-row{font-size:18px}.test-total{padding:19px 16px}.test-total strong{font-size:21px}.test-total b{font-size:26px}.test-actions{padding:0 16px 20px}.cancel-btn,.save-btn{font-size:16px;padding:13px}
        }
      `}</style>
    </main>
  );
}

function Counter({label,hint,value,child,onMinus,onPlus}) {
  return <div className="counter"><div className="counter-title"><span className="person-icon"><PersonIcon child={child} /></span><div><strong>{label}</strong><small>{hint}</small></div></div><div className="counter-control"><button onClick={onMinus}>−</button><span>{value}</span><button onClick={onPlus}>＋</button></div></div>;
}
