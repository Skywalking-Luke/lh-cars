(function(){
var WA="60128744878";
var SITE="https://skywalking-luke.github.io/lh-cars/";
var list=document.getElementById("brokerList");
if(!list)return;
function toast(m){var e=document.querySelector(".toast");if(!e){e=document.createElement("div");e.className="toast";document.body.appendChild(e)}e.textContent=m;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(function(){e.style.display="none"},2200)}
function copy(txt){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    return navigator.clipboard.writeText(txt).then(function(){toast("Copied")}).catch(fallback);
  }
  return fallback();
  function fallback(){var t=document.createElement("textarea");t.value=txt;document.body.appendChild(t);t.select();try{document.execCommand("copy");toast("Copied")}catch(e){prompt("Copy:",txt)}document.body.removeChild(t)}
}
function fmtRM(n){if(!n)return null;return "RM"+Number(n).toLocaleString("en-MY")}
function comm(n){if(!n)return "—";return fmtRM(Math.round(n*0.01))+" – "+fmtRM(Math.round(n*0.03))}
function link(c){return SITE+c.href}
function chips(c){return (c.chips||[]).join(" · ")}
function price(c){return c.price_label||"Enquire for price"}
function tagMake(c){return (c.make||"").replace(/\s+/g,"")}
function captionBM(c){
  return "🚗 "+c.title+"\n"+chips(c)+"\n💰 "+price(c)+"\n\n📌 HARGA MESTI IKUT HARGA LISTING.\n❌ Jangan ubah harga / bagi discount atas post.\n\nBerminat? WhatsApp LH Cars\n+60 12-874 4878\n"+link(c)+"\n\n#LHCars #KeretaJual #CarForSaleMY";
}
function captionEN(c){
  return c.title+"\n"+chips(c)+"\n"+price(c)+"\n\nPrice must follow the listed price.\nWhatsApp LH Cars +60 12-874 4878\n"+link(c)+"\n\n#LHCars #KeretaMalaysia";
}
function marketplace(c){
  return c.title+"\n\n"+chips(c)+"\nPrice: "+price(c)+"\n\nBuyer-side broker listing. Price follows the listed price.\nPhotos + full spec: "+link(c)+"\n\nWhatsApp LH Cars (Luke)\n+60 12-874 4878\nJohor / KL / nationwide viewing by arrangement.\n\n#LHCars #MarketplaceMY #KeretaJual";
}
function mudah(c){
  return c.title+"\n"+price(c)+"\n"+chips(c)+"\n\nKereta ni listed dengan LH Cars (broker).\nHarga ikut listing. Nego, viewing dan closing — WhatsApp terus.\n\n📍 Viewing by arrangement\n💬 WhatsApp: +60 12-874 4878\n🔗 "+link(c)+"\n\nSila serius sahaja. Scammer / time-waster ignore.";
}
function tiktok(c){
  var hook=c.title+(c.price_num?" — "+price(c):" — enquire price");
  return hook+"\n\nFull spec + photos on the site. WhatsApp LH Cars +60128744878\n"+link(c)+"\n\n#kereta #jualkereta #carsforsalemy #lhcars #"+tagMake(c)+" #fyp #foryou #malaysia #usedcars #luxurycars";
}
function parseCars(html){
  var doc=new DOMParser().parseFromString(html,"text/html");
  var cards=doc.querySelectorAll("[data-list] .card");
  if(!cards.length)cards=doc.querySelectorAll("article.card");
  return [].map.call(cards,function(card){
    var a=card.querySelector("a.ph"), img=card.querySelector("img"), h3=card.querySelector("h3"), ribbon=card.querySelector(".ribbon");
    var chip=[].map.call(card.querySelectorAll(".chips span"),function(s){return s.textContent.replace(/\s+/g," ").trim()}).filter(Boolean);
    return {
      title:h3?h3.textContent.trim():"",
      make:card.getAttribute("data-make")||"",
      year:card.getAttribute("data-year")?+card.getAttribute("data-year"):null,
      price_num:card.getAttribute("data-price")?+card.getAttribute("data-price"):null,
      price_label:ribbon?ribbon.textContent.replace(/\s+/g," ").trim():null,
      href:a?a.getAttribute("href"):"",
      img:img?img.getAttribute("src"):"",
      chips:chip
    };
  }).filter(function(c){return c.title&&c.href});
}
var data=[], q=document.getElementById("bkQ"), mk=document.getElementById("bkMake"), so=document.getElementById("bkSort");
function render(){
  var term=(q&&q.value||"").toLowerCase();
  var make=mk&&mk.value||"";
  var sort=so&&so.value||"";
  var rows=data.filter(function(c){
    if(make&&c.make!==make)return false;
    if(!term)return true;
    return (c.title+" "+(c.chips||[]).join(" ")+" "+(c.price_label||"")).toLowerCase().indexOf(term)>=0;
  });
  rows.sort(function(a,b){
    if(sort==="phi")return (b.price_num||0)-(a.price_num||0);
    if(sort==="plo")return (a.price_num||1e12)-(b.price_num||1e12);
    if(sort==="new")return (b.year||0)-(a.year||0);
    return 0;
  });
  list.innerHTML="";
  var vis=document.getElementById("bkCount");
  if(vis)vis.textContent=rows.length+" cars";
  rows.forEach(function(c){
    var art=document.createElement("article");
    art.className="card bk-card";
    var commHtml=c.price_num?'<div class="bk-comm">Est. commission 1–3%: <b>'+comm(c.price_num)+'</b></div>':'<div class="bk-comm">Commission confirmed when the deal closes</div>';
    art.innerHTML=
      '<a class="ph" href="'+c.href+'"><img src="'+c.img+'" alt="" loading="lazy"><span class="ribbon">'+(c.price_label||"Enquire")+'</span></a>'+
      '<div class="bd"><h3>'+c.title+'</h3>'+
      '<div class="chips">'+(c.chips||[]).map(function(x){return "<span>"+x+"</span>"}).join("")+'</div>'+
      commHtml+
      '<div class="bk-plats">'+
        '<div class="bk-plat"><b>Marketplace</b><button type="button" class="btn btn-red btn-sm" data-act="fb">Copy listing</button><button type="button" class="btn btn-ghost btn-sm" data-act="title">Copy title</button></div>'+
        '<div class="bk-plat"><b>Mudah</b><button type="button" class="btn btn-red btn-sm" data-act="mudah">Copy listing</button></div>'+
        '<div class="bk-plat"><b>TikTok</b><button type="button" class="btn btn-red btn-sm" data-act="tt">Copy caption</button></div>'+
      '</div>'+
      '<div class="act">'+
      '<button type="button" class="btn btn-ghost btn-sm" data-act="bm">Copy BM</button>'+
      '<button type="button" class="btn btn-ghost btn-sm" data-act="en">Copy EN</button>'+
      '<a class="btn btn-ghost btn-sm" href="'+c.href+'">Photos</a>'+
      '</div></div>';
    art.querySelector('[data-act="fb"]').addEventListener("click",function(){copy(marketplace(c))});
    art.querySelector('[data-act="title"]').addEventListener("click",function(){copy(c.title)});
    art.querySelector('[data-act="mudah"]').addEventListener("click",function(){copy(mudah(c))});
    art.querySelector('[data-act="tt"]').addEventListener("click",function(){copy(tiktok(c))});
    art.querySelector('[data-act="bm"]').addEventListener("click",function(){copy(captionBM(c))});
    art.querySelector('[data-act="en"]').addEventListener("click",function(){copy(captionEN(c))});
    list.appendChild(art);
  });
}
fetch("cars.html").then(function(r){return r.text()}).then(function(html){
  data=parseCars(html);
  var makes={};
  data.forEach(function(c){if(c.make)makes[c.make]=1});
  if(mk)Object.keys(makes).sort().forEach(function(m){var o=document.createElement("option");o.value=m;o.textContent=m;mk.appendChild(o)});
  ["input","change"].forEach(function(ev){
    if(q)q.addEventListener(ev,render);
    if(mk)mk.addEventListener(ev,render);
    if(so)so.addEventListener(ev,render);
  });
  render();
}).catch(function(){
  list.innerHTML='<p class="muted">Could not load stock. Open <a href="cars.html">cars.html</a>.</p>';
});
})();
