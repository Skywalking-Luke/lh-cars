(function(){
var WA="60128744878";
function t(k,fb){return (window.LH_T&&window.LH_T(k))||fb}
function waURL(txt){return "https://wa.me/"+WA+"?text="+encodeURIComponent(txt)}
// WhatsApp links: data-wa="key" [data-car="name"]; the English message is already in the href
window.LH_updateWA=function(){document.querySelectorAll("[data-wa]").forEach(function(a){var m=t(a.getAttribute("data-wa"),a.getAttribute("data-wa-en")||"");if(!m)return;a.href=waURL(m.replace("{car}",a.getAttribute("data-car")||""))})};
document.querySelectorAll("[data-wa]").forEach(function(a){var h=a.getAttribute("href")||"";var i=h.indexOf("?text=");if(i>0){var en=decodeURIComponent(h.slice(i+6));var c=a.getAttribute("data-car");a.setAttribute("data-wa-en",c?en.replace(c,"{car}"):en)}});
// mobile menu
var b=document.querySelector(".burger"),n=document.querySelector(".nav");if(b&&n)b.addEventListener("click",function(){n.classList.toggle("open");b.setAttribute("aria-expanded",n.classList.contains("open"))});
// toast
function toast(m){var e=document.querySelector(".toast");if(!e){e=document.createElement("div");e.className="toast";document.body.appendChild(e)}e.textContent=m;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(function(){e.style.display="none"},2200)}
// share
document.querySelectorAll("[data-share]").forEach(function(btn){btn.addEventListener("click",function(){var d={title:document.title,url:location.href};if(navigator.share){navigator.share(d).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(location.href).then(function(){toast(t("copied","Link copied"))})}else{prompt("Copy link:",location.href)}})});
// gallery + lightbox
var stage=document.querySelector(".stage img");
if(stage){var th=[].slice.call(document.querySelectorAll(".thumbs button")),srcs=th.map(function(x){return x.getAttribute("data-full")}),cur=0,cnt=document.querySelector(".count");
var lb=document.querySelector(".lb"),lbImg=lb&&lb.querySelector("img");
function show(i){cur=(i+srcs.length)%srcs.length;stage.src=srcs[cur];th.forEach(function(x,j){x.classList.toggle("on",j===cur)});if(cnt)cnt.textContent=(cur+1)+" / "+srcs.length;if(lbImg)lbImg.src=srcs[cur]}
th.forEach(function(x,j){x.addEventListener("click",function(){show(j);if(window.innerWidth<900)stage.scrollIntoView({behavior:"smooth",block:"center"})})});
document.querySelectorAll("[data-go]").forEach(function(x){x.addEventListener("click",function(e){e.stopPropagation();show(cur+(+x.getAttribute("data-go")))})});
stage.addEventListener("click",function(){if(lb){lbImg.src=srcs[cur];lb.classList.add("open")}});
if(lb){lb.addEventListener("click",function(e){if(e.target===lb||e.target.classList.contains("x"))lb.classList.remove("open")})}
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&lb)lb.classList.remove("open");if(e.key==="ArrowRight")show(cur+1);if(e.key==="ArrowLeft")show(cur-1)});
var sx=null;stage.parentNode.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});stage.parentNode.addEventListener("touchend",function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)show(cur+(dx<0?1:-1));sx=null});
if(cnt)cnt.textContent="1 / "+srcs.length}
// filter + sort
var list=document.querySelector("[data-list]");
if(list){var mk=document.getElementById("fMake"),so=document.getElementById("fSort"),cards=[].slice.call(list.children),empty=document.querySelector(".empty");
function apply(){var m=mk.value,s=so.value,vis=cards.filter(function(c){var ok=!m||c.dataset.make===m;c.style.display=ok?"":"none";return ok});
var sorted=cards.slice().sort(function(a,b){var y=(+b.dataset.year)-(+a.dataset.year),pa=+a.dataset.price||1e12,pb=+b.dataset.price||1e12;if(s==="new")return y;if(s==="old")return -y;if(s==="plo")return pa-pb;if(s==="phi")return (+b.dataset.price||0)-(+a.dataset.price||0);return (+a.dataset.order)-(+b.dataset.order)});
sorted.forEach(function(c){list.appendChild(c)});empty.style.display=vis.length?"none":"block"}
mk.addEventListener("change",apply);so.addEventListener("change",apply)}
// contact form -> WhatsApp
var f=document.getElementById("waForm");
if(f)f.addEventListener("submit",function(e){e.preventDefault();var v=function(id){return (document.getElementById(id).value||"").trim()};
var msg=t("wa_form","Hi LH Cars, my name is {name}. Phone: {phone}. I'm interested in: {interest}. {msg}").replace("{name}",v("fName")||"-").replace("{phone}",v("fPhone")||"-").replace("{interest}",v("fInterest")||"-").replace("{msg}",v("fMsg"));
window.open(waURL(msg.trim()),"_blank","noopener")});
document.querySelectorAll(".yr").forEach(function(y){y.textContent=new Date().getFullYear()});
if(window.LH_updateWA)window.LH_updateWA();
})();
