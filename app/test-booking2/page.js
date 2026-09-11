"use client";

import { useMemo, useState } from "react";

const ROOM_PRICE = 1900;
const HOUSE_PRICE = 3900;

export default function TestBooking2() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [bookingType, setBookingType] = useState("room");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deposit, setDeposit] = useState(0);
  const [foods, setFoods] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showFood, setShowFood] = useState(false);
  const [showNote, setShowNote] = useState(false);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(`${checkIn}T00:00:00`);
    const b = new Date(`${checkOut}T00:00:00`);
    const d = Math.round((b - a) / 86400000);
    return d > 0 ? d : 0;
  }, [checkIn, checkOut]);

  const roomTotal = (bookingType === "room" ? ROOM_PRICE : HOUSE_PRICE) * (nights || 1);
  const foodTotal = foods.reduce((s, x) => s + Number(x.price || 0), 0);
  const noteTotal = notes.reduce((s, x) => s + Number(x.price || 0), 0);
  const total = roomTotal + foodTotal + noteTotal;
  const remaining = Math.max(0, total - Number(deposit || 0));

  const addFood = () => { setShowFood(true); setFoods(v => [...v, { name: "", price: "" }]); };
  const addNote = () => { setShowNote(true); setNotes(v => [...v, { text: "", price: "" }]); };
  const updateFood = (i, key, value) => setFoods(v => v.map((x, n) => n === i ? { ...x, [key]: value } : x));
  const updateNote = (i, key, value) => setNotes(v => v.map((x, n) => n === i ? { ...x, [key]: value } : x));

  return (
    <main className="page">
      <div className="card">
        <header className="header"><div className="plus">＋</div><h1>จองคิวให้ลูกค้า</h1><button className="menu">☰</button></header>

        <section className="section">
          <Title n="1" text="วันที่เข้าพัก" reset={() => { setCheckIn(""); setCheckOut(""); }} />
          <div className="grid2">
            <label>วันเช็คอิน<input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} /></label>
            <label>วันเช็คเอาท์<input type="date" min={checkIn || undefined} value={checkOut} onChange={e => setCheckOut(e.target.value)} /></label>
          </div>
          {nights > 0 && <div className="green">เข้าพัก {nights} คืน</div>}
        </section>

        <section className="section">
          <Title n="2" text="ข้อมูลลูกค้า" />
          <label>ชื่อผู้จอง<input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ-นามสกุล หรือชื่อเฟสบุ๊ค" /></label>
          <label>เบอร์โทรศัพท์<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0XXXXXXXXX" inputMode="tel" /></label>
        </section>

        <section className="section">
          <Title n="3" text="ประเภทการจอง" />
          <div className="typegrid">
            <button className={bookingType === "room" ? "type selected" : "type"} onClick={() => setBookingType("room")}><span><b>1 ห้อง</b><small>฿{ROOM_PRICE.toLocaleString()}/คืน</small></span>{bookingType === "room" && <i>✓</i>}</button>
            <button className={bookingType === "house" ? "type selected" : "type"} onClick={() => setBookingType("house")}><span><b>เหมาหลัง</b><small>฿{HOUSE_PRICE.toLocaleString()}/คืน</small></span>{bookingType === "house" && <i>✓</i>}</button>
          </div>
        </section>

        <section className="section">
          <Title n="4" text="ผู้เข้าพักและอาหาร" />

          <div className="guestgrid">
            <div className="guestcard"><div><b>ผู้ใหญ่</b><small>อย่างน้อย 1 คน</small></div><div className="step"><button onClick={() => setAdults(v => Math.max(1, v - 1))}>−</button><b>{adults}</b><button onClick={() => setAdults(v => v + 1)}>＋</button></div></div>
            <div className="guestcard"><div><b>เด็ก</b><small>ไม่เกิน 12 ปี</small></div><div className="step"><button onClick={() => setChildren(v => Math.max(0, v - 1))}>−</button><b>{children}</b><button onClick={() => setChildren(v => v + 1)}>＋</button></div></div>
          </div>

          {!showFood ? <button className="add" onClick={addFood}>＋ เพิ่มอาหาร</button> : (
            <div className="extraBox">
              <div className="extraHead"><b>รายการอาหาร</b><span>รวม ฿{foodTotal.toLocaleString()}</span></div>
              {foods.map((f, i) => <div className="item" key={i}><input value={f.name} onChange={e => updateFood(i, "name", e.target.value)} placeholder="เช่น หมูกระทะ" /><input className="money" type="number" min="0" value={f.price} onChange={e => updateFood(i, "price", e.target.value)} placeholder="ราคา" /><button onClick={() => setFoods(v => v.filter((_, n) => n !== i))}>×</button></div>)}
              <button className="add smalladd" onClick={addFood}>＋ เพิ่มรายการอาหาร</button>
              {foods.length > 0 && <button className="closeExtra" onClick={() => { setFoods([]); setShowFood(false); }}>ปิดรายการอาหาร</button>}
            </div>
          )}

          {!showNote ? <button className="add" onClick={addNote}>＋ เพิ่มหมายเหตุ</button> : (
            <div className="extraBox">
              <div className="extraHead"><b>ค่าใช้จ่ายเพิ่มเติม / หมายเหตุ</b><span>รวม ฿{noteTotal.toLocaleString()}</span></div>
              {notes.map((x, i) => <div className="item" key={i}><input value={x.text} onChange={e => updateNote(i, "text", e.target.value)} placeholder="เช่น เตียงเสริม" /><input className="money" type="number" min="0" value={x.price} onChange={e => updateNote(i, "price", e.target.value)} placeholder="ราคา" /><button onClick={() => setNotes(v => v.filter((_, n) => n !== i))}>×</button></div>)}
              <button className="add smalladd" onClick={addNote}>＋ เพิ่มรายการ</button>
              {notes.length > 0 && <button className="closeExtra" onClick={() => { setNotes([]); setShowNote(false); }}>ปิดหมายเหตุ</button>}
            </div>
          )}
        </section>

        <section className="section">
          <Title n="5" text="การชำระเงิน" />
          <div className="grid2"><label>มัดจำ (บาท)<input type="number" min="0" value={deposit} onChange={e => setDeposit(e.target.value)} /></label><label>คงเหลือ (บาท)<input value={remaining.toLocaleString()} readOnly /></label></div>
        </section>

        <section className="summary">
          <div><b>ค่าที่พัก</b><span>฿{roomTotal.toLocaleString()}</span></div>
          {foodTotal > 0 && <div><b>ค่าอาหาร</b><span>+ ฿{foodTotal.toLocaleString()}</span></div>}
          {noteTotal > 0 && <div><b>ค่าใช้จ่ายเพิ่มเติม</b><span>+ ฿{noteTotal.toLocaleString()}</span></div>}
          <div className="grand"><b>ยอดรวมสุทธิ</b><strong>฿{total.toLocaleString()}</strong></div>
          <p>{nights ? `${nights} คืน × ฿${(bookingType === "room" ? ROOM_PRICE : HOUSE_PRICE).toLocaleString()}` : "เลือกวันเช็คอินและเช็คเอาท์เพื่อคำนวณราคา"}</p>
        </section>
        <div className="actions"><button>ยกเลิก</button><button className="save">บันทึกการจอง</button></div>
      </div>

      <style jsx>{`
        *{box-sizing:border-box}.page{min-height:100dvh;background:#f1f3f6;padding:18px;font-family:Arial,'Noto Sans Thai',sans-serif;color:#202329}.card{max-width:820px;margin:auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 8px 35px #0001}.header{height:94px;padding:0 28px;display:flex;align-items:center;gap:18px;border-bottom:1px solid #e7e8eb}.plus{width:52px;height:52px;border-radius:16px;background:#e8f8ef;color:#18a762;display:grid;place-items:center;font-size:34px;font-weight:800}.header h1{font-size:30px;margin:0}.menu{margin-left:auto;border:0;background:#f0f1f3;border-radius:16px;width:54px;height:54px;font-size:25px}.section{padding:24px 30px;border-bottom:10px solid #f1f3f6}.title{display:flex;align-items:center;gap:13px;margin-bottom:18px}.title>span{width:40px;height:40px;border-radius:50%;background:#16b765;color:#fff;display:grid;place-items:center;font-weight:800;font-size:21px}.title h2{font-size:25px;margin:0}.reset{margin-left:auto;border:0;background:none;color:#d6294f;font-weight:800;font-size:17px}.grid2,.typegrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.section label{display:flex;flex-direction:column;gap:7px;font-size:16px;font-weight:800;margin-bottom:13px}.grid2 label{margin:0}.section input{width:100%;border:2px solid #dfe2e6;border-radius:16px;padding:14px 15px;font-size:17px;outline:none;background:#fff}.section input:focus{border-color:#19b66a}.green{color:#18a762;font-weight:800;margin-top:10px}.type{position:relative;min-height:120px;border:3px solid #e2e4e8;border-radius:24px;background:#fff;display:flex;align-items:center;padding:18px 22px;text-align:left}.type.selected{border-color:#1fba6b}.type b{display:block;font-size:24px}.type small{display:block;color:#969ca7;font-size:18px;font-weight:700;margin-top:5px}.type i{position:absolute;right:15px;top:14px;width:38px;height:38px;border-radius:50%;background:#20b86c;color:#fff;display:grid;place-items:center;font-style:normal;font-size:23px}.guestgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.guestcard{display:flex;justify-content:space-between;align-items:center;border:2px solid #e0e2e6;border-radius:20px;padding:16px 18px}.guestcard b{display:block;font-size:21px}.guestcard small{color:#9298a2;font-size:15px}.step{display:flex;align-items:center;gap:18px;border:2px solid #d9dce1;border-radius:30px;padding:6px 12px}.step b{font-size:22px}.step button{border:0;background:none;font-size:25px;padding:0 3px}.add{border:0;background:none;color:#16a65d;font-size:19px;font-weight:800;padding:12px 0;cursor:pointer;display:block}.extraBox{border:2px solid #dfe2e6;border-radius:18px;padding:14px;margin:8px 0 8px}.extraHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-size:18px}.extraHead span{color:#18a762;font-weight:800}.item{display:grid;grid-template-columns:minmax(0,1fr) 120px 38px;gap:8px;margin-bottom:8px}.item input{margin:0!important}.item .money{text-align:right}.item button{border:0;background:#f0f1f3;border-radius:12px;font-size:22px}.smalladd{padding:6px 0}.closeExtra{border:0;background:none;color:#8b919a;font-size:14px;padding:4px 0;cursor:pointer}.summary{padding:22px 30px}.summary>div{display:flex;justify-content:space-between;margin:7px 0}.grand{border-top:2px solid #e8eaed;padding-top:14px;margin-top:14px!important}.grand b{font-size:24px}.grand strong{font-size:29px;color:#18a762}.summary p{color:#8d939c;margin:6px 0 0}.actions{display:flex;gap:12px;padding:0 30px 30px}.actions button{flex:1;border:0;border-radius:15px;padding:15px;font-size:18px;font-weight:800}.actions .save{background:#19ad65;color:#fff}
        @media(max-width:600px){.page{padding:0;background:#fff}.card{border-radius:0;box-shadow:none}.header{height:76px;padding:0 16px;gap:11px}.plus{width:45px;height:45px;border-radius:14px;font-size:28px}.header h1{font-size:22px}.menu{width:45px;height:45px}.section{padding:19px 16px;border-bottom-width:8px}.title{gap:10px;margin-bottom:14px}.title>span{width:36px;height:36px;font-size:18px}.title h2{font-size:21px}.grid2,.typegrid,.guestgrid{gap:8px}.section label{font-size:14px}.section input{font-size:16px;padding:11px 10px;border-radius:13px}.type{min-height:102px;border-radius:18px;padding:12px}.type b{font-size:19px}.type small{font-size:14px}.type i{width:30px;height:30px;right:8px;top:8px;font-size:18px}.guestcard{padding:12px;border-radius:16px}.guestcard b{font-size:18px}.guestcard small{font-size:13px}.step{gap:11px;padding:5px 8px}.step b{font-size:20px}.step button{font-size:23px}.add{font-size:18px}.extraHead{font-size:16px}.item{grid-template-columns:minmax(0,1fr) 82px 34px}.item input{min-width:0}.grand b{font-size:21px}.grand strong{font-size:26px}.actions{padding:0 16px 20px}.actions button{font-size:16px;padding:13px}}
      `}</style>
    </main>
  );
}

function Title({ n, text, reset }) { return <div className="title"><span>{n}</span><h2>{text}</h2>{reset && <button className="reset" onClick={reset}>↶ รีเซ็ต</button>}</div>; }
