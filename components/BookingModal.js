"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { supabase } from "../lib/supabase";

const ROOM_PRICE = 1900;
const HOUSE_PRICE = 3900;
const META_PREFIX = "__SC_META__";
const META_NOTE = "__SC_NOTE__";
const META_FOOD = "__SC_DATA__";
const STATUS = { booked:"จองแล้ว", waiting_payment:"รอชำระเงิน", maintenance:"ปิดปรับปรุง", cancelled:"ยกเลิก" };
const money = n => Number(n || 0).toLocaleString("th-TH");

function isValidDateKey(key){ return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(new Date(key+"T00:00:00").getTime()); }
function thaiDate(key){
  if(!isValidDateKey(key)) return "-";
  const d = new Date(key + "T00:00:00");
  const m = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()+543}`;
}
function addDays(key,n){
  if(!isValidDateKey(key)) return "";
  const d=new Date(key+"T00:00:00"); d.setDate(d.getDate()+Number(n||0));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10);
}
function nightsBetween(a,b){ if(!a||!b) return 1; return Math.max(1, Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000)); }
function receiptCode(code){ return code ? String(code).replace(/^KSV[-\s]*/i,"") : "-"; }
function parseFoodData(value){
  const raw=String(value||"");
  if(!raw.startsWith(META_FOOD)) return {meta:{},legacy:legacyFoodItems(value)};
  try {
    const meta=JSON.parse(raw.slice(META_FOOD.length).trim());
    return {meta:meta||{},legacy:Array.isArray(meta?.food_items)?meta.food_items:[]};
  } catch { return {meta:{},legacy:[]}; }
}
function parseStoredNote(value){
  if(!value || !String(value).startsWith(META_PREFIX)) return { meta:{}, note:value || "" };
  const raw=String(value).slice(META_PREFIX.length);
  const idx=raw.indexOf(META_NOTE);
  if(idx<0) return {meta:{},note:value};
  try { return { meta:JSON.parse(raw.slice(0,idx).trim()), note:raw.slice(idx+META_NOTE.length).trim() }; }
  catch { return {meta:{},note:value}; }
}
function storedNote(note,meta){ return `${META_PREFIX}${JSON.stringify(meta)}\n${META_NOTE}\n${note || ""}`; }
function legacyFoodItems(value){
  if(!value || value === "ไม่ได้สั่งเพิ่ม") return [];
  return String(value).split(/\s*,\s*/).map(part=>{
    const m=part.match(/^(.+?)\s+([\d,]+)\s*บาท$/);
    return m ? {name:m[1].trim(),price:Number(m[2].replace(/,/g,""))} : null;
  }).filter(Boolean);
}
function normalizeBooking(b){
  const p=parseStoredNote(b.note);
  const fd=parseFoodData(b.food);
  const meta=Object.keys(p.meta||{}).length ? p.meta : (fd.meta||{});
  const foods=Array.isArray(meta.food_items) ? meta.food_items : (fd.legacy.length ? fd.legacy : legacyFoodItems(b.food));
  return {
    ...b,
    ...meta,
    note:p.note,
    check_in:meta.check_in || b.booking_date,
    check_out:meta.check_out || addDays(meta.check_in || b.booking_date,1) || (isValidDateKey(b.booking_date)?b.booking_date:""),
    booking_type:meta.booking_type || "room",
    food_items:foods,
    extra_items:Array.isArray(meta.extra_items)?meta.extra_items:[]
  };
}

export default function BookingModal({date,booking,onClose,onSaved}){
  const open=!!date || !!booking;
  const detail=booking ? normalizeBooking(booking) : null;
  const [mode,setMode]=useState(booking?"view":"form");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [foodOpen,setFoodOpen]=useState(false);
  const [extraOpen,setExtraOpen]=useState(false);
  const [foodDraft,setFoodDraft]=useState({name:"",price:""});
  const [extraDraft,setExtraDraft]=useState({name:"",price:""});
  const [form,setForm]=useState({});
  const [moveDate,setMoveDate]=useState("");
  const detailRef=useRef(null);

  useEffect(()=>{
    setMode(booking?"view":"form"); setMessage(""); setFoodOpen(false); setExtraOpen(false);
    setFoodDraft({name:"",price:""}); setExtraDraft({name:"",price:""});
    if(booking){
      const b=normalizeBooking(booking);
      setForm({check_in:b.check_in,check_out:b.check_out,customer_name:b.customer_name||"",phone:b.phone||"",booking_type:b.booking_type,adults:b.adults??1,children:b.children??0,deposit:b.deposit??0,status:b.status||"booked",food_items:b.food_items,extra_items:b.extra_items,note:b.note||""});
      setMoveDate(b.check_in);
    } else {
      setForm({check_in:date,check_out:addDays(date,1),customer_name:"",phone:"",booking_type:"room",adults:1,children:0,deposit:0,status:"booked",food_items:[],extra_items:[],note:""});
      setMoveDate(date||"");
    }
  },[booking,date]);

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const nights=useMemo(()=>nightsBetween(form.check_in,form.check_out),[form.check_in,form.check_out]);
  const accommodation=(form.booking_type==="house"?HOUSE_PRICE:ROOM_PRICE)*nights;
  const foodTotal=(form.food_items||[]).reduce((s,x)=>s+Number(x.price||0),0);
  const extraTotal=(form.extra_items||[]).reduce((s,x)=>s+Number(x.price||0),0);
  const total=accommodation+foodTotal+extraTotal;
  const remaining=Math.max(0,total-Number(form.deposit||0));

  if(!open) return null;

  function addFood(){ if(!foodDraft.name.trim()||Number(foodDraft.price)<=0)return; set("food_items",[...(form.food_items||[]),{name:foodDraft.name.trim(),price:Number(foodDraft.price)}]); setFoodDraft({name:"",price:""}); }
  function addExtra(){ if(!extraDraft.name.trim()||Number(extraDraft.price)<=0)return; set("extra_items",[...(form.extra_items||[]),{name:extraDraft.name.trim(),price:Number(extraDraft.price)}]); setExtraDraft({name:"",price:""}); }
  function removeItem(k,i){ set(k,(form[k]||[]).filter((_,idx)=>idx!==i)); }

  async function save(){
    setSaving(true); setMessage("");
    if(!form.check_in || !form.check_out || form.check_out<=form.check_in){setMessage("กรุณาเลือกวันเช็คเอาท์ให้หลังวันเช็คอิน");setSaving(false);return;}
    if(!form.customer_name.trim()){setMessage("กรุณากรอกชื่อผู้จอง");setSaving(false);return;}
    const meta={check_in:form.check_in,check_out:form.check_out,booking_type:form.booking_type,food_items:form.food_items||[],extra_items:form.extra_items||[]};
    const payload={booking_date:form.check_in,customer_name:form.customer_name.trim(),phone:form.phone||"",food:`${META_FOOD}${JSON.stringify(meta)}`,adults:Number(form.adults||0),children:Number(form.children||0),note:storedNote(form.note,meta),status:form.status,deposit:Number(form.deposit||0),remaining};
    const result=booking?await supabase.from("bookings").update(payload).eq("id",booking.id):await supabase.from("bookings").insert(payload);
    if(result.error) setMessage(result.error.message); else onSaved();
    setSaving(false);
  }

  async function moveBooking(){
    if(!moveDate)return;
    const b=normalizeBooking(booking);
    const stay=nightsBetween(b.check_in,b.check_out);
    const newOut=addDays(moveDate,stay);
    const meta={check_in:moveDate,check_out:newOut,booking_type:b.booking_type,food_items:b.food_items||[],extra_items:b.extra_items||[]};

    // ย้ายเฉพาะข้อมูลที่จำเป็นต่อการย้ายวัน เพื่อไม่เขียนทับข้อมูลเดิมของลูกค้า
    const payload={
      booking_date:moveDate,
      food:`${META_FOOD}${JSON.stringify(meta)}`,
      note:storedNote(b.note,meta)
    };

    setSaving(true);
    setMessage("");

    // แยก UPDATE กับ SELECT ออกจากกัน และตรวจสอบว่าวันที่ในฐานข้อมูลเปลี่ยนจริง
    const updateResult=await supabase
      .from("bookings")
      .update(payload)
      .eq("id",booking.id);

    if(updateResult.error){
      setMessage(`ย้ายวันไม่สำเร็จ: ${updateResult.error.message}`);
      setSaving(false);
      return;
    }

    const verifyResult=await supabase
      .from("bookings")
      .select("*")
      .eq("id",booking.id)
      .maybeSingle();

    if(verifyResult.error){
      setMessage(`บันทึกแล้วแต่ตรวจสอบข้อมูลไม่ได้: ${verifyResult.error.message}`);
      setSaving(false);
      return;
    }

    if(!verifyResult.data){
      setMessage("บันทึกแล้วแต่ไม่พบข้อมูลการจอง กรุณาลองอีกครั้ง");
      setSaving(false);
      return;
    }

    if(verifyResult.data.booking_date!==moveDate){
      setMessage(`ย้ายวันไม่สำเร็จ: ฐานข้อมูลยังเป็นวันที่ ${verifyResult.data.booking_date || "-"}`);
      setSaving(false);
      return;
    }

    onSaved(moveDate,verifyResult.data);
    setSaving(false);
  }

  async function cancelBooking(){
    if(!confirm("ยืนยันยกเลิกการจองนี้หรือไม่?"))return;
    setSaving(true);setMessage("");
    const {error}=await supabase.from("bookings").update({status:"cancelled"}).eq("id",booking.id);
    if(error)setMessage(error.message);else onSaved();setSaving(false);
  }

  async function shareOrDownload(blob,fileName,title){
    if(!blob)return; const file=new File([blob],fileName,{type:"image/png"});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title});return}catch(e){if(e?.name==="AbortError")return}}
    const a=document.createElement("a");a.download=fileName;a.href=URL.createObjectURL(blob);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  async function downloadReceipt(){
    if(!detail)return;
    const foods=detail.food_items||[], extras=detail.extra_items||[];
    const accom=(detail.booking_type==="house"?HOUSE_PRICE:ROOM_PRICE)*nightsBetween(detail.check_in,detail.check_out);
    const food=foods.reduce((s,x)=>s+Number(x.price||0),0);
    const extra=extras.reduce((s,x)=>s+Number(x.price||0),0);
    const grand=accom+food+extra;
    const remain=Math.max(0,grand-Number(detail.deposit||0));
    const el=document.createElement("div");
    el.style.cssText=`position:fixed;left:-10000px;top:0;width:420px;background:#fff;padding:26px;font-family:"Kanit","Noto Sans Thai",Tahoma,Arial,sans-serif;color:#222;box-sizing:border-box`;
    const row=(label,value,big=false)=>`<div style="display:grid;grid-template-columns:135px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid #e5e7eb;font-size:${big?18:16}px;line-height:1.4"><span style="color:#666;font-weight:700">${label}</span><b>${value}</b></div>`;
    const foodHtml=foods.length?foods.map(x=>row("อาหาร",`${x.name} ${money(x.price)} บาท`)).join(""):row("รายการอาหาร","ไม่ได้สั่งเพิ่ม");
    const extraHtml=extras.length?extras.map(x=>row("ค่าใช้จ่ายเพิ่ม",`${x.name} ${money(x.price)} บาท`)).join(""):"";
    const grandText=money(grand);
    el.innerHTML=`<div style="text-align:center;font-size:27px;font-weight:800;margin-bottom:6px">รายละเอียดการจอง</div>
      <div style="text-align:center;margin-bottom:14px"><span style="display:inline-block;background:#fff0f4;color:#c91e4c;padding:7px 15px;border-radius:20px;font-weight:800">${STATUS[detail.status]||"-"}</span></div>
      <div style="border-top:1px solid #e5e7eb">
      ${row("เลขที่",receiptCode(detail.booking_code))}
      ${row("เช็คอิน",thaiDate(detail.check_in))}
      ${row("เช็คเอาท์",`${thaiDate(detail.check_out)} (ไม่เกิน 11:00 น.)`)}
      ${row("ชื่อผู้จอง",detail.customer_name||"-")}
      ${row("เบอร์โทรศัพท์",detail.phone||"-")}
      ${row("ประเภทการจอง",detail.booking_type==="house"?"เหมาหลัง":"1 ห้อง")}
      ${row("ผู้เข้าพัก",`ผู้ใหญ่ ${detail.adults??0} คน, เด็ก ${detail.children??0} คน`)}
      ${row("ค่าที่พัก",`${money(accom)} บาท`)}
      ${foodHtml}${extraHtml}
      ${row("มัดจำ",`${money(detail.deposit)} บาท`)}
      ${row("คงเหลือ",`${money(remain)} บาท`)}
      ${row("รวมทั้งหมด",`${grandText} บาท`,true)}
      ${row("หมายเหตุ",detail.note||"-")}
      </div>
      <div style="text-align:center;font-weight:800;font-size:17px;padding:16px 0 10px">ขอบคุณที่ใช้บริการ</div>
      <div style="background:#f1f3f5;padding:10px;text-align:center;border-radius:8px;font-size:14px;line-height:1.6">📶 WiFi aisfibre5G_Khonsan Village<br/>Password: <b>Ksv090868</b></div>`;
    document.body.appendChild(el);
    const canvas=await html2canvas(el,{backgroundColor:"#fff",scale:2});
    el.remove();
    const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));
    await shareOrDownload(blob,`รายละเอียดการจอง-${detail.customer_name||"ลูกค้า"}.png`,"รายละเอียดการจอง");
  }

  const displayFoods=detail?.food_items||[]; const displayExtras=detail?.extra_items||[];
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><button className="close-btn" onClick={onClose}>×</button>
      {mode==="view"&&detail ? <>
        <div className="modal-date">{thaiDate(detail.check_in)} - {thaiDate(detail.check_out)}</div><h2>รายละเอียดการจอง</h2>
        <div ref={detailRef} className="detail-export"><div className="detail-card"><div className="detail-top"><span className={`big-status status-${detail.status}`}>{STATUS[detail.status]||"-"}</span></div>
          <Row label="เลขที่" value={receiptCode(detail.booking_code)}/>
          <Row label="เช็คอิน" value={thaiDate(detail.check_in)}/>
          <Row label="เช็คเอาท์" value={<>{thaiDate(detail.check_out)} <small className="checkout-note">(ไม่เกิน 11:00 น.)</small></>}/>
          <Row label="ชื่อผู้จอง" value={detail.customer_name||"-"}/>
          <Row label="เบอร์โทรศัพท์" value={detail.phone||"-"}/>
          <Row label="ประเภทการจอง" value={detail.booking_type==="house"?"เหมาหลัง":"1 ห้อง"}/>
          <Row label="ผู้เข้าพัก" value={`ผู้ใหญ่ ${detail.adults??0} คน, เด็ก ${detail.children??0} คน`}/>
          <Row label="ค่าที่พัก" value={`${money((detail.booking_type==="house"?HOUSE_PRICE:ROOM_PRICE)*nightsBetween(detail.check_in,detail.check_out))} บาท`}/>
          <div className="detail-section-title">รายการอาหาร</div>
          {displayFoods.length?displayFoods.map((x,i)=><Row key={`f${i}`} label={x.name} value={`${money(x.price)} บาท`}/>):<Row label="รายการอาหาร" value="ไม่ได้สั่งเพิ่ม"/>}
          {displayExtras.length>0&&<div className="detail-section-title">ค่าใช้จ่ายเพิ่ม</div>}
          {displayExtras.map((x,i)=><Row key={`e${i}`} label={x.name} value={`${money(x.price)} บาท`}/>)}
          <Row label="มัดจำ" value={`${money(detail.deposit)} บาท`}/>
          <Row label="คงเหลือ" value={`${money(Math.max(0,(detail.booking_type==="house"?HOUSE_PRICE:ROOM_PRICE)*nightsBetween(detail.check_in,detail.check_out)+displayFoods.reduce((s,x)=>s+Number(x.price||0),0)+displayExtras.reduce((s,x)=>s+Number(x.price||0),0)-Number(detail.deposit||0)))} บาท`}/>
          <Row label="รวมทั้งหมด" value={`${money((detail.booking_type==="house"?HOUSE_PRICE:ROOM_PRICE)*nightsBetween(detail.check_in,detail.check_out)+displayFoods.reduce((s,x)=>s+Number(x.price||0),0)+displayExtras.reduce((s,x)=>s+Number(x.price||0),0))} บาท`}/>
          <Row label="หมายเหตุ" value={detail.note||"-"}/>
        </div></div>
        {message&&<div className="error">{message}</div>}
        <div className="actions"><button className="btn secondary" onClick={downloadReceipt}>ดาวน์โหลดรูปภาพรายละเอียด</button><button className="btn secondary" onClick={()=>setMode("form")}>แก้ไข</button><button className="btn secondary" onClick={()=>setMode("move")}>ย้ายวัน</button>{detail.status!=="cancelled"&&<button className="btn danger" onClick={cancelBooking}>ยกเลิก</button>}</div>
      </> : mode==="move" ? <>
        <div className="modal-date">ย้ายการจอง</div><h2>ย้ายวันจอง</h2><p className="muted">จากวันที่ <b>{thaiDate(detail?.check_in)}</b></p><label className="single-label">เป็นวันที่<input type="date" value={moveDate} onChange={e=>setMoveDate(e.target.value)}/></label>{message&&<div className="error">{message}</div>}<div className="actions"><button className="btn secondary" onClick={()=>setMode("view")}>กลับ</button><button className="btn primary" disabled={saving} onClick={moveBooking}>{saving?"กำลังบันทึก…":"ยืนยันย้ายวัน"}</button></div>
      </> : <>
        <div className="modal-date">{booking?"แก้ไขการจอง":"เพิ่มการจอง"}</div><h2>{booking?"แก้ไขการจอง":"เพิ่มการจอง"}</h2>
        <div className="form-grid">
          <label>วันเช็คอิน<input type="date" value={form.check_in||""} onChange={e=>set("check_in",e.target.value)}/></label><label>วันเช็คเอาท์<input type="date" value={form.check_out||""} onChange={e=>set("check_out",e.target.value)}/></label>
          <label>ชื่อผู้จอง<input value={form.customer_name||""} onChange={e=>set("customer_name",e.target.value)} placeholder="ชื่อลูกค้า"/></label><label>เบอร์โทรศัพท์<input value={form.phone||""} onChange={e=>set("phone",e.target.value)} placeholder="เบอร์โทร"/></label>
          <div className="full"><label>ประเภทการจอง</label><div className="choice-grid"><button type="button" className={`choice-card ${form.booking_type==="room"?"active":""}`} onClick={()=>set("booking_type","room")}>1 ห้อง<br/><small>{money(ROOM_PRICE)} บาท/คืน</small></button><button type="button" className={`choice-card ${form.booking_type==="house"?"active":""}`} onClick={()=>set("booking_type","house")}>เหมาหลัง<br/><small>{money(HOUSE_PRICE)} บาท/คืน</small></button></div></div>
          <label>ผู้ใหญ่<input type="number" min="0" value={form.adults??0} onChange={e=>set("adults",e.target.value)}/></label><label>เด็ก<input type="number" min="0" value={form.children??0} onChange={e=>set("children",e.target.value)}/></label>
          <div className="full expandable"><button type="button" className="expand-btn" onClick={()=>setFoodOpen(v=>!v)}>+ เพิ่มอาหาร</button>{foodOpen&&<div className="item-editor"><div className="item-add"><input value={foodDraft.name} onChange={e=>setFoodDraft({...foodDraft,name:e.target.value})} placeholder="เช่น หมูกระทะ"/><input type="number" min="0" value={foodDraft.price} onChange={e=>setFoodDraft({...foodDraft,price:e.target.value})} placeholder="ราคา"/><button type="button" onClick={addFood}>เพิ่ม</button></div>{(form.food_items||[]).map((x,i)=><div className="item-line" key={i}><span>{x.name}</span><b>{money(x.price)} บาท</b><button type="button" onClick={()=>removeItem("food_items",i)}>×</button></div>)}</div>}</div>
          <div className="full expandable"><button type="button" className="expand-btn" onClick={()=>setExtraOpen(v=>!v)}>+ เพิ่มหมายเหตุ / ค่าใช้จ่าย</button>{extraOpen&&<div className="item-editor"><div className="item-add"><input value={extraDraft.name} onChange={e=>setExtraDraft({...extraDraft,name:e.target.value})} placeholder="เช่น เตียงเสริม"/><input type="number" min="0" value={extraDraft.price} onChange={e=>setExtraDraft({...extraDraft,price:e.target.value})} placeholder="ราคา"/><button type="button" onClick={addExtra}>เพิ่ม</button></div>{(form.extra_items||[]).map((x,i)=><div className="item-line" key={i}><span>{x.name}</span><b>{money(x.price)} บาท</b><button type="button" onClick={()=>removeItem("extra_items",i)}>×</button></div>)}</div>}</div>
          <label className="full">หมายเหตุ<textarea rows="3" value={form.note||""} onChange={e=>set("note",e.target.value)} placeholder="รายละเอียดเพิ่มเติม"/></label>
          <div className="full totals"><div><span>ค่าที่พัก</span><b>{money(accommodation)} บาท</b></div><div><span>อาหาร</span><b>{money(foodTotal)} บาท</b></div><div><span>ค่าใช้จ่ายเพิ่ม</span><b>{money(extraTotal)} บาท</b></div><div className="grand"><span>รวมทั้งหมด</span><b>{money(total)} บาท</b></div></div>
          <label>มัดจำ (บาท)<input type="number" min="0" value={form.deposit??0} onChange={e=>set("deposit",e.target.value)}/></label><div className="remaining-box"><span>คงเหลือ</span><b>{money(remaining)} บาท</b></div>
          <label className="full">สถานะ<select value={form.status||"booked"} onChange={e=>set("status",e.target.value)}><option value="booked">จองแล้ว</option><option value="waiting_payment">รอชำระเงิน</option><option value="maintenance">ปิดปรับปรุง</option></select></label>
        </div>
        {message&&<div className="error">{message}</div>}
        <div className="actions"><button className="btn secondary" onClick={()=>booking?setMode("view"):onClose()}>ยกเลิก</button><button className="btn primary" disabled={saving||!form.customer_name} onClick={save}>{saving?"กำลังบันทึก…":"บันทึก"}</button></div>
      </>}
    </div>
  </div>;
}
function Row({label,value}){return <div className="detail-row"><span>{label}</span><b>{value}</b></div>}
