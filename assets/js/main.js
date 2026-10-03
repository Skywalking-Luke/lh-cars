(function(){
var WA="60128744878";
function t(k,fb){return (window.LH_T&&window.LH_T(k))||fb}
function waURL(txt){return "https://wa.me/"+WA+"?text="+encodeURIComponent(txt)}
window.LH_updateWA=function(){document.querySelectorAll("[data-wa]").forEach(function(a){var m=t(a.getAttribute("data-wa"),a.getAttribute("data-wa-en")||"");if(!m)return;a.href=waURL(m.replace("{car}",a.getAttribute("data-car")||"").replace("{price}",a.getAttribute("data-price")||""))})};
document.querySelectorAll("[data-wa]").forEach(function(a){var h=a.getAttribute("href")||"";var i=h.indexOf("?text=");if(i>0){var en=decodeURIComponent(h.slice(i+6));var c=a.getAttribute("data-car"),pr=a.getAttribute("data-price");if(c)en=en.replace(c,"{car}");if(pr)en=en.replace(pr,"{price}");a.setAttribute("data-wa-en",en)}});
var b=document.querySelector(".burger"),n=document.querySelector(".nav");if(b&&n)b.addEventListener("click",function(){n.classList.toggle("open");b.setAttribute("aria-expanded",n.classList.contains("open"))});
function toast(m){var e=document.querySelector(".toast");if(!e){e=document.createElement("div");e.className="toast";document.body.appendChild(e)}e.textContent=m;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(function(){e.style.display="none"},2200)}
document.querySelectorAll("[data-share]").forEach(function(btn){btn.addEventListener("click",function(){var d={title:document.title,url:location.href};if(navigator.share){navigator.share(d).catch(function(){})}else if(navigator.clipboard){navigator.clipboard.writeText(location.href).then(function(){toast(t("copied","Link copied"))})}else{prompt("Copy link:",location.href)}})});
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
var list=document.querySelector("[data-list]");
if(list){var mk=document.getElementById("fMake"),so=document.getElementById("fSort"),cards=[].slice.call(list.children),empty=document.querySelector(".empty");
function apply(){var m=mk.value,s=so.value,vis=cards.filter(function(c){var ok=!m||c.dataset.make===m;c.style.display=ok?"":"none";return ok});
var sorted=cards.slice().sort(function(a,b){var y=(+b.dataset.year)-(+a.dataset.year),pa=+a.dataset.price||1e12,pb=+b.dataset.price||1e12;if(s==="new")return y;if(s==="old")return -y;if(s==="plo")return pa-pb;if(s==="phi")return (+b.dataset.price||0)-(+a.dataset.price||0);return (+a.dataset.order)-(+b.dataset.order)});
sorted.forEach(function(c){list.appendChild(c)});empty.style.display=vis.length?"none":"block"}
mk.addEventListener("change",apply);so.addEventListener("change",apply);window.LH_applyCars=apply}
var f=document.getElementById("waForm");
if(f)f.addEventListener("submit",function(e){e.preventDefault();var v=function(id){return (document.getElementById(id).value||"").trim()};
var msg=t("wa_form","Hi LH Cars, my name is {name}. Phone: {phone}. I'm interested in: {interest}. {msg}").replace("{name}",v("fName")||"-").replace("{phone}",v("fPhone")||"-").replace("{interest}",v("fInterest")||"-").replace("{msg}",v("fMsg"));
window.open(waURL(msg.trim()),"_blank","noopener")});
(function(){
  var inCar=/\/cars\//.test(location.pathname);
  var root=inCar?"../../":"";
  var base=root+"assets/img/";
  var css=document.createElement("link");css.rel="stylesheet";css.href=root+"assets/css/theme.css";document.head.appendChild(css);
  document.querySelectorAll("a.logo").forEach(function(a){
    if(a.querySelector("img.mark"))return;
    var img=document.createElement("img");
    img.className="mark";
    img.alt="LH Cars";
    img.width=28;img.height=36;
    img.style.cssText="height:36px;width:auto;max-width:36px;max-height:36px;object-fit:contain";
    img.src=base+"logo.png";
    var bb=a.querySelector("b");
    if(bb)bb.replaceWith(img);else a.insertBefore(img,a.firstChild);
  });
  var icon=document.querySelector('link[rel="icon"]');
  if(icon){icon.href=base+"favicon.png";icon.type="image/png"}
  var theme=localStorage.getItem("lh-theme")||"dark";
  document.documentElement.setAttribute("data-theme",theme);
  var hdr=document.querySelector(".hdr .wrap");
  if(hdr&&!hdr.querySelector(".theme-btn")){
    var tb=document.createElement("button");
    tb.type="button";tb.className="theme-btn breathe";
    tb.textContent=theme==="light"?"Dark":"Light";
    tb.setAttribute("aria-label","Toggle colour mode");
    tb.addEventListener("click",function(){
      theme=document.documentElement.getAttribute("data-theme")==="light"?"dark":"light";
      document.documentElement.setAttribute("data-theme",theme);
      localStorage.setItem("lh-theme",theme);
      tb.textContent=theme==="light"?"Dark":"Light";
      tb.classList.add("is-on");setTimeout(function(){tb.classList.remove("is-on")},1600);
    });
    var lang=hdr.querySelector(".lang");
    if(lang)hdr.insertBefore(tb,lang);else hdr.appendChild(tb);
  }
  document.querySelectorAll(".btn,.lang button,.feat i,.nav a,.logo").forEach(function(el){el.classList.add("breathe")});
  document.querySelectorAll(".breathe").forEach(function(el){
    el.addEventListener("touchstart",function(){el.classList.add("is-on")},{passive:true});
    el.addEventListener("touchend",function(){setTimeout(function(){el.classList.remove("is-on")},700)});
  });
  var here=location.pathname;
  if(/cars\.html$/.test(here)||/\/(index\.html)?$/.test(here)||here.endsWith("/lh-cars")||here.endsWith("/lh-cars/")){
    var host=document.querySelector("header");
    if(host&&!document.querySelector(".bands")){
      var bar=document.createElement("div");
      bar.className="bands wrap";
      [["All",""],["Under RM100k",100000],["RM100k\u2013500k",500000],["RM500k\u20131m",1000000],["Over RM1m",1e12]].forEach(function(pair,i){
        var btn=document.createElement("button");
        btn.type="button";btn.className="breathe"+(i===0?" on":"");btn.textContent=pair[0];
        btn.addEventListener("click",function(){
          bar.querySelectorAll("button").forEach(function(x){x.classList.remove("on")});
          btn.classList.add("on");btn.classList.add("is-on");setTimeout(function(){btn.classList.remove("is-on")},900);
          if(!/cars\.html$/.test(location.pathname)){location.href="cars.html#stock";return}
          var max=pair[1];
          document.querySelectorAll("[data-list] .card").forEach(function(c){
            var p=+c.dataset.price||0;
            var ok=!max||(i===1?p<100000:i===2?p>=100000&&p<500000:i===3?p>=500000&&p<1000000:p>=1000000);
            c.style.display=ok?"":"none";
          });
        });
        bar.appendChild(btn);
      });
      host.insertAdjacentElement("afterend",bar);
    }
  }
})();
document.querySelectorAll(".yr").forEach(function(y){y.textContent=new Date().getFullYear()});
if(window.LH_updateWA)window.LH_updateWA();
})();
