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
var carsHref=onCars?"cars.html":"cars.html";
box.innerHTML='<div class="tabs"><button type="button" class="on" data-tab="buy">Buy a Car</button><button type="button" data-tab="sell">Sell Your Car</button></div><form class="q"><svg class="wa-ico" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l5 5" stroke="currentColor" stroke-width="2"/></svg><input name="q" placeholder="What car are you looking for?" aria-label="Search cars"></form><div class="types"></div><div class="prices"></div><div class="brands"></div>';
var host=document.querySelector("header");
if(host)host.insertAdjacentElement("afterend",box);else return;
box.querySelector('[data-tab="sell"]').addEventListener("click",function(){
  location.href="https://wa.me/60128744878?text="+encodeURIComponent("Hi LH Cars, I want to sell my car. Can you handle it?");
});
var types=[["Convertible","M4 14h16l-2 6H6l-2-6h2l2-4h8l2 4z"],["Coupe","M3 16h18l-1.5-4H6.5L4 16h2l1-3h10l1 3z"],["Hatchback","M3 16h18v-4l-3-4H7L4 12v4h2"],["SUV","M3 16h18l-1-5H6L4 16h2m2 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],["Sedan","M2 16h20v-3l-2-4H6L3 13v3h2"],["MPV","M2 16h20v-5l-2-3H6L3 11v5h2"],["Sports","M3 16h18l-2-3-3-4H8L5 13l-2 3h3"],["Classic","M4 16h16l-1-3H7L5 16h2m1-5h10l1 2H7l1-2z"]];
var typeHost=box.querySelector(".types");
types.forEach(function(t){
  var b=document.createElement("button");b.type="button";b.className="breathe";
  b.innerHTML='<svg viewBox="0 0 24 24"><path fill="currentColor" d="'+t[1]+'"/></svg>'+t[0];
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
var makes=["Porsche","Ferrari","Lamborghini","Mercedes-Benz","BMW","Audi","Nissan","Honda","Toyota","MG","Land Rover","Lexus","Bentley","Rolls-Royce","McLaren","Aston Martin"];
var brandHost=box.querySelector(".brands");
makes.forEach(function(m){
  var b=document.createElement("button");b.type="button";b.className="breathe";
  b.innerHTML="<b>"+m.split(" ")[0].slice(0,3)+"</b>"+m;
  b.addEventListener("click",function(){go({make:m})});
  brandHost.appendChild(b);
});
function go(q){
  if(!onCars){
    var u=new URL(carsHref,location.href);
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
