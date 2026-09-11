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
const thaiMonths=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const thaiWeek=["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];
function pad(n){return String(n).padStart(2,"0")}
function dateKey(y,m,d){return `${y}-${pad(m+1)}-${pad(d)}`}
function getThaiToday(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const v={};p.forEach(x=>{if(x.type!=="literal")v[x.type]=x.value});return new Date(+v.year,+v.month-1,+v.day)}
function toDate(key){return new Date(key+"T00:00:00")}
function inStay(b,key){const start=b.check_in||b.booking_date;const end=b.check_out||b.booking_date;return start<=key && key<end}

export default function Home(){
 const initialToday=getThaiToday();
 const [today,setToday]=useState(initialToday);
 const [viewDate,setViewDate]=useState(new Date(initialToday.getFullYear(),initialToday.getMonth(),1));
 const [bookings,setBookings]=useState([]); const [selectedDate,setSelectedDate]=useState(null); const [selectedBooking,setSelectedBooking]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [monthPicker,setMonthPicker]=useState(false); const calendarRef=useRef(null);
 async function loadBookings(){
  setLoading(true);setError("");
  const start=new Date(viewDate.getFullYear(),viewDate.getMonth(),1); const end=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,0);
  const {data,error}=await supabase.from("bookings").select("*").or(`check_in.lte.${dateKey(end.getFullYear(),end.getMonth(),end.getDate())},booking_date.lte.${dateKey(end.getFullYear(),end.getMonth(),end.getDate())}`).or(`check_out.gt.${dateKey(start.getFullYear(),start.getMonth(),start.getDate())},booking_date.gte.${dateKey(start.getFullYear(),start.getMonth(),start.getDate())}`).order("created_at",{ascending:false});
  if(error){setError(error.message);setBookings([])}else setBookings(data||[]);setLoading(false);
 }
 useEffect(()=>{loadBookings()},[viewDate]);
 useEffect(()=>{const c=supabase.channel("bookings-live").on("postgres_changes",{event:"*",schema:"public",table:"bookings"},loadBookings).subscribe();return()=>supabase.removeChannel(c)},[viewDate]);
 useEffect(()=>{const t=setInterval(()=>setToday(getThaiToday()),30000);return()=>clearInterval(t)},[]);
 const days=useMemo(()=>{const y=viewDate.getFullYear(),m=viewDate.getMonth(),first=new Date(y,m,1).getDay(),count=new Date(y,m+1,0).getDate();const a=[];for(let i=0;i<first;i++)a.push(null);for(let d=1;d<=count;d++)a.push(d);return a},[viewDate]);
 const byDate=useMemo(()=>{const map={};for(const b of bookings){if(b.status==="cancelled")continue;const s=b.check_in||b.booking_date;const e=b.check_out||b.booking_date;let d=toDate(s),last=toDate(e);if(!b.check_out)last=new Date(d.getTime()+86400000);while(d<last){const k=dateKey(d.getFullYear(),d.getMonth(),d.getDate());(map[k] ||= []).push(b);d=new Date(d.getTime()+86400000)}}return map},[bookings]);
 function openDay(d){if(!d)return;const k=dateKey(viewDate.getFullYear(),viewDate.getMonth(),d);const active=(byDate[k]||[])[0];if(active)setSelectedBooking(active);else setSelectedDate(k)}
 function moveMonth(n){setViewDate(new Date(viewDate.getFullYear(),viewDate.getMonth()+n,1));setMonthPicker(false)}
 function chooseMonth(m){setViewDate(new Date(viewDate.getFullYear(),m,1));setMonthPicker(false)}
 async function downloadCalendar(){const section=calendarRef.current;if(!section)return;const canvas=await html2canvas(section,{backgroundColor:"#fff",scale:Math.min(2,Math.max(1.5,window.devicePixelRatio||1.5)),useCORS:true,onclone:doc=>{const root=doc.querySelector("[data-calendar-export]");if(!root)return;root.querySelectorAll(".circle-btn,.chev,.calendar-download-row,.loading,.error,.mini-status,.month-picker").forEach(el=>el.style.display="none");const title=root.querySelector(".month-title");if(title){title.style.cursor="default";title.style.fontSize="34px";title.style.fontWeight="800";title.style.color="#000";title.style.padding="0";title.style.margin="0"}const wrap=root.querySelector(".month-picker-wrap");if(wrap){wrap.style.display="flex";wrap.style.justifyContent="center"}root.querySelectorAll(".day strong").forEach(el=>{el.style.color="#000";el.style.background="transparent";el.style.width="auto";el.style.height="auto";el.style.display="block"});root.style.padding="8px 10px 10px";root.style.boxSizing="border-box";root.style.background="#fff";root.style.width="100%";const row=root.querySelector(".month-row");if(row){row.style.display="block";row.style.height="auto";row.style.margin="0 0 10px"}const week=root.querySelector(".week-row");if(week){week.style.marginTop="0";week.style.paddingBottom="8px";week.style.fontSize="18px"}const grid=root.querySelector(".calendar-grid");if(grid){grid.style.gap="8px";grid.style.marginTop="10px"}root.querySelectorAll(".day").forEach(el=>{el.style.borderRadius="16px";el.style.padding="4px"})}});const fileName=`ปฏิทิน-${thaiMonths[viewDate.getMonth()]}-${viewDate.getFullYear()+543}.png`;const blob=await new Promise(r=>canvas.toBlob(r,"image/png"));if(!blob)return;const file=new File([blob],fileName,{type:"image/png"});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:"บันทึกปฏิทิน"});return}catch(e){if(e?.name==="AbortError")return}}const a=document.createElement("a");a.download=fileName;a.href=URL.createObjectURL(blob);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
 return <main className="app-shell"><header className="topbar"><div className="brand"><div className="brand-icon">✓</div><h1>ปฏิทินฝ่ายขาย</h1></div><button className="menu-btn" aria-label="เมนู"><span></span><span></span><span></span></button></header><section ref={calendarRef} data-calendar-export className="calendar-section"><div className="month-row"><button className="circle-btn" onClick={()=>moveMonth(-1)}>‹</button><div className="month-picker-wrap"><button className="month-title" onClick={()=>setMonthPicker(v=>!v)}>{thaiMonths[viewDate.getMonth()]} {viewDate.getFullYear()+543} <span className="chev">⌄</span></button>{monthPicker&&<div className="month-picker">{thaiMonths.map((n,i)=><button key={n} className={i===viewDate.getMonth()?"selected":""} onClick={()=>chooseMonth(i)}>{n}</button>)}</div>}</div><button className="circle-btn" onClick={()=>moveMonth(1)}>›</button></div><div className="week-row">{thaiWeek.map(x=><div key={x}>{x}</div>)}</div>{error&&<div className="error">เชื่อมต่อฐานข้อมูลไม่ได้: {error}</div>}<div className="calendar-grid">{days.map((d,i)=>{if(!d)return <div className="day empty" key={`e-${i}`}/>;const key=dateKey(viewDate.getFullYear(),viewDate.getMonth(),d);const active=(byDate[key]||[])[0];const status=active?.status;const isToday=key===dateKey(today.getFullYear(),today.getMonth(),today.getDate());return <button className={`day ${status?`status-${status}`:""} ${isToday?"today":""}`} key={key} onClick={()=>openDay(d)}><strong>{d}</strong>{active&&<span className="mini-status">{STATUS[status]?.label}</span>}</button>})}</div>{loading&&<div className="loading">กำลังโหลดข้อมูล…</div>}<div className="calendar-download-row export-hide"><button className="btn secondary download-calendar-btn" onClick={downloadCalendar}>ดาวน์โหลดรูปภาพหน้าปฏิทิน</button></div></section><BookingModal date={selectedDate} booking={selectedBooking} onClose={()=>{setSelectedDate(null);setSelectedBooking(null)}} onSaved={()=>{setSelectedDate(null);setSelectedBooking(null);loadBookings()}}/></main>
}
