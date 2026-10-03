(function(){
var WA_SVG='<svg class="wa-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.05c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.12.1-1.81-.11-.41-.13-.95-.31-1.64-.61-2.89-1.25-4.77-4.16-4.91-4.35-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.64-.39.85-.39h.61c.2 0 .46-.04.72.55.27.64.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.14.18-.3.4-.43.54-.14.14-.29.29-.12.56.16.27.73 1.2 1.57 1.94 1.08.96 1.99 1.26 2.27 1.4.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.38-.23.64-.14.26.09 1.64.77 1.92.91.28.14.46.21.53.33.07.12.07.69-.17 1.37z"/></svg>';
function iconize(el){
  if(!el||el.querySelector(".wa-ico"))return;
  el.innerHTML=WA_SVG+el.innerHTML.replace(/\uD83D\uDCAC/g,"").trim();
}
document.querySelectorAll(".hwa,.swa,.btn-wa").forEach(iconize);
var here=location.pathname;
var onCars=/cars\.html$/.test(here);
var onHome=/\/(index\.html)?$/.test(here)||here.endsWith("/lh-cars")||here.endsWith("/lh-cars/");
if(!onCars&&!onHome)return;
var old=document.querySelector(".bands");if(old)old.remove();
if(document.querySelector(".finder"))return;
var box=document.createElement("section");
box.className="finder wrap";
box.innerHTML='<div class="tabs"><button type="button" class="on" data-tab="buy">Buy a Car</button><button type="button" data-tab="sell">Sell Your Car</button></div><form class="q"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="2"/></svg><input name="q" placeholder="What car are you looking for?" aria-label="Search cars"></form><div class="types"></div><div class="prices"></div><div class="brands"></div>';
var host=document.querySelector("header");
if(host)host.insertAdjacentElement("afterend",box);else return;
box.querySelector('[data-tab="sell"]').addEventListener("click",function(){
  location.href="https://wa.me/60128744878?text="+encodeURIComponent("Hi LH Cars, I want to sell my car. Can you handle it?");
});
var types=[
  ["Convertible","M4 18h40l-2 4H8l-2-4h4l3-3h18l3 3h4zM10 15h8l1-2H14l-1 2zM36 13h6v2h-6z"],
  ["Coupe","M6 18h44l-3-3-6-4H22l-8 4-5 3h6zM24 12h10l3 3H27z"],
  ["Hatchback","M5 18h46v-3l-6-6H18l-8 5v4h6zM20 11h16l3 3H22z"],
  ["SUV","M4 19h48l-2-6H10L6 19h4m6 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm28 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM14 13h24l2 4H16z"],
  ["Sedan","M3 18h50l-2-3-5-4H22l-8 4-4 3h7zM24 12h14l2 3H26z"],
  ["MPV","M4 19h48v-7l-4-4H12l-4 4v7h6m4 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm30 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 10h24v4H16z"],
  ["Sports","M8 18h42l-4-2-5-5H24l-7 4-4 3h7zM26 12h12l2 3H28z"],
  ["Classic","M7 18h42c2 0 3-2 2-4-2-3-6-4-10-4H22c-5 0-9 2-11 5-1 1 0 3 2 3zM20 12h16c2 1 3 2 3 3H18c0-1 1-3 2-3z"]
];
var typeHost=box.querySelector(".types");
types.forEach(function(t){
  var b=document.createElement("button");b.type="button";b.className="breathe";
  var file=t[0].toLowerCase();
  b.innerHTML='<img class="sil" alt="" src="assets/img/bodies/'+file+'.svg"><span>'+t[0]+'</span>';
  b.addEventListener("click",function(){go({type:t[0]})});
  typeHost.appendChild(b);
});
var prices=[["Less than RM20,000",0,20000],["RM20,000 - 50,000",20000,50000],["RM50,000 - 100,000",50000,100000],["More than RM100,000",100000,1e15]];
var priceHost=box.querySelector(".prices");
prices.forEach(function(p){
  var b=document.createElement("button");b.type="button";b.className="breathe";b.textContent=p[0];
  b.addEventListener("click",function(){go({min:p[1],max:p[2]})});
  priceHost.appendChild(b);
});
var logos={
  "Porsche":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M24 3l7 3 6 2 4 6v8l-3 7-6 8-8 8-8-8-6-8-3-7V14l4-6 6-2z"/><path fill="#111" d="M24 8l4 2 4 2 2 4v5l-2 5-4 5-4 5-4-5-4-5-2-5v-5l2-4 4-2z"/><path fill="currentColor" d="M24 16c2 2 3 4 3 6s-1 4-3 6-3-2-3-6 1-4 3-6z"/></svg>',
  "Ferrari":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M28 6c2 4 2 8 0 12l4 2c2-1 5-1 7 1 1 4-1 8-4 10l-3 8h-6l2-6c-3 1-6 0-8-2-3 3-7 4-11 2 2-4 6-6 10-5l2-6c-4-1-7-4-8-8 4 0 7 2 9 5 1-4 3-8 6-13z"/></svg>',
  "Lamborghini":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M24 4l14 6v8c0 8-4 14-10 18l-4 8-4-8C14 32 10 26 10 18v-8z"/><path fill="#111" d="M24 12c3 2 5 5 5 9 0 3-2 6-5 8-3-2-5-5-5-8 0-4 2-7 5-9z"/><path fill="currentColor" d="M22 16h4l1 6-3 4-3-4z"/></svg>',
  "Mercedes-Benz":'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="currentColor" d="M24 10l3 12h-6zM14 30l10-4v5zM34 30l-10-4v5z"/></svg>',
  "BMW":'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="currentColor"/><path fill="#111" d="M24 8a16 16 0 0 1 16 16H24zM8 24a16 16 0 0 1 16-16v16z"/><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="3"/><text x="24" y="27" text-anchor="middle" font-size="7" font-family="sans-serif" fill="currentColor">BMW</text></svg>',
  "Audi":'<svg viewBox="0 0 64 32"><circle cx="12" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="26" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="40" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="54" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  "Nissan":'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="3"/><path fill="currentColor" d="M14 30V18h4l6 8V18h4v12h-4l-6-8v8z"/></svg>',
  "Honda":'<svg viewBox="0 0 48 48"><rect x="6" y="8" width="36" height="32" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><path fill="currentColor" d="M16 14h5v8h6v-8h5v20h-5v-8h-6v8h-5z"/></svg>',
  "Toyota":'<svg viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="18" ry="14" fill="none" stroke="currentColor" stroke-width="2.6"/><ellipse cx="24" cy="24" rx="10" ry="14" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 24h32" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  "MG":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M24 4l16 6v10c0 10-6 16-16 22C14 36 8 30 8 20V10z"/><text x="24" y="28" text-anchor="middle" font-size="12" font-family="sans-serif" font-weight="700" fill="#111">MG</text></svg>',
  "Land Rover":'<svg viewBox="0 0 64 32"><ellipse cx="32" cy="16" rx="28" ry="12" fill="none" stroke="currentColor" stroke-width="2.4"/><text x="32" y="20" text-anchor="middle" font-size="8" font-family="serif" fill="currentColor">LAND ROVER</text></svg>',
  "Lexus":'<svg viewBox="0 0 48 48"><ellipse cx="24" cy="24" rx="18" ry="14" fill="none" stroke="currentColor" stroke-width="2.6"/><path fill="currentColor" d="M16 30l8-16 8 16h-4l-1-3h-6l-1 3z"/></svg>',
  "Bentley":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M8 30c6-10 10-14 16-14s10 4 16 14c-6-4-10-6-16-6s-10 2-16 6z"/><path fill="currentColor" d="M22 16h4v16h-4z"/></svg>',
  "Rolls-Royce":'<svg viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><text x="24" y="29" text-anchor="middle" font-size="12" font-family="serif" font-weight="700" fill="currentColor">RR</text></svg>',
  "McLaren":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M8 34l10-20h6L14 34zM22 14h8l10 20h-6L24 18l-4 8h6l2 4H16z"/></svg>',
  "Aston Martin":'<svg viewBox="0 0 48 48"><path fill="currentColor" d="M6 30c8-12 12-16 18-16s10 4 18 16c-8-6-12-8-18-8s-10 2-18 8z"/><path fill="currentColor" d="M22 14h4l2 16h-8z"/></svg>'
};
var makes=["Porsche","Ferrari","Lamborghini","Mercedes-Benz","BMW","Audi","Nissan","Honda","Toyota","MG","Land Rover","Lexus","Bentley","Rolls-Royce","McLaren","Aston Martin"];
var brandHost=box.querySelector(".brands");
makes.forEach(function(m){
  var b=document.createElement("button");b.type="button";b.className="breathe";
  var slugs={"Mercedes-Benz":"mercedes","Land Rover":"landrover","Rolls-Royce":"rollsroyce","Aston Martin":"astonmartin","Lexus":"lexus"};
  var file=slugs[m]||m.toLowerCase().replace(/[^a-z]/g,"");
  b.innerHTML='<span class="marklogo"><img alt="" src="assets/img/brands/'+file+(m==='Lexus'?'.png':'.svg')+'"></span><span>'+m+'</span>';
  b.addEventListener("click",function(){go({make:m})});
  brandHost.appendChild(b);
});
function go(q){
  if(!onCars){
    var u=new URL("cars.html",location.href);
    if(q.make)u.searchParams.set("make",q.make);
    if(q.type)u.searchParams.set("type",q.type);
    if(q.min!=null)u.searchParams.set("min",q.min);
    if(q.max!=null)u.searchParams.set("max",q.max);
    if(q.q)u.searchParams.set("q",q.q);
    location.href=u.pathname+u.search;
    return;
  }
  apply(q);
}
function apply(q){
  var cards=[].slice.call(document.querySelectorAll("[data-list] .card"));
  var n=0;
  cards.forEach(function(c){
    var price=+c.dataset.price||0;
    var make=(c.dataset.make||"").toLowerCase();
    var text=(c.textContent||"").toLowerCase();
    var ok=true;
    if(q.make&&make.indexOf(q.make.toLowerCase())<0&&text.indexOf(q.make.toLowerCase())<0)ok=false;
    if(q.type&&text.indexOf(q.type.toLowerCase())<0)ok=false;
    if(q.q&&text.indexOf(q.q.toLowerCase())<0)ok=false;
    if(q.min!=null&&price&&price<q.min)ok=false;
    if(q.max!=null&&price&&price>=q.max)ok=false;
    c.style.display=ok?"":"none";
    if(ok)n++;
  });
  var empty=document.querySelector(".empty");
  if(empty)empty.style.display=n?"none":"block";
  var list=document.querySelector("[data-list]");
  if(list)list.scrollIntoView({behavior:"smooth",block:"start"});
}
box.querySelector("form").addEventListener("submit",function(e){
  e.preventDefault();
  go({q:box.querySelector("input").value.trim()});
});
if(onCars){
  var params=new URLSearchParams(location.search);
  var q={};
  if(params.get("make"))q.make=params.get("make");
  if(params.get("type"))q.type=params.get("type");
  if(params.get("q"))q.q=params.get("q");
  if(params.get("min"))q.min=+params.get("min");
  if(params.get("max"))q.max=+params.get("max");
  if(Object.keys(q).length)apply(q);
}
})();
