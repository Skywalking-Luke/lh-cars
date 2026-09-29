(function(){
var WA="60128744878";
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
function caption(c,lang){
  var chips=(c.chips||[]).join(" · ");
  var price=c.price_label||"Enquire for price";
  var link="https://skywalking-luke.github.io/lh-cars/"+c.href;
  if(lang==="en"){
    return c.title+"\n"+chips+"\n"+price+"\n\nPrice must follow the listed price. Do not change it. Do not give a discount.\nInterested? WhatsApp LH Cars +60 12-874 4878\n"+link+"\n\n#LHCars #KeretaMalaysia";
  }
  return "🚗 "+c.title+"\n"+chips+"\n💰 "+price+"\n\n📌 HARGA MESTI IKUT HARGA YANG DIBERI.\n❌ Dilarang letak harga sendiri / ubah harga / bagi discount tanpa kebenaran.\n\nBerminat? Terus WhatsApp LH Cars:\n+60 12-874 4878\n"+link+"\n\n#LHCars #KeretaJual #CarForSaleMY";
}
function leadMsg(c){
  var price=c.price_label||"Enquire for price";
  return "Hi LH Cars, saya broker. Ada customer berminat dengan "+c.title+" ("+price+"). Sila assist untuk harga, viewing dan closing.";
}
function parseCars(html){
  var doc=new DOMParser().parseFromString(html,"text/html");
  var cards=doc.querySelectorAll("[data-list] .card");
  if(!cards.length)cards=doc.querySelectorAll("article.card");
  return [].map.call(cards,function(card){
    var a=card.querySelector("a.ph"), img=card.querySelector("img"), h3=card.querySelector("h3"), ribbon=card.querySelector(".ribbon");
    var chips=[].map.call(card.querySelectorAll(".chips span"),function(s){return s.textContent.replace(/\s+/g," ").trim()}).filter(Boolean);
    return {
      title:h3?h3.textContent.trim():"",
      make:card.getAttribute("data-make")||"",
      year:card.getAttribute("data-year")?+card.getAttribute("data-year"):null,
      price_num:card.getAttribute("data-price")?+card.getAttribute("data-price"):null,
      price_label:ribbon?ribbon.textContent.replace(/\s+/g," ").trim():null,
      href:a?a.getAttribute("href"):"",
      img:img?img.getAttribute("src"):"",
      chips:chips
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
      '<div class="act">'+
      '<button type="button" class="btn btn-red btn-sm" data-act="bm">Copy BM caption</button>'+
      '<button type="button" class="btn btn-ghost btn-sm" data-act="en">Copy EN caption</button>'+
      '<button type="button" class="btn btn-ghost btn-sm" data-act="lead">Copy lead text</button>'+
      '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/'+WA+'?text='+encodeURIComponent(leadMsg(c))+'">Send lead</a>'+
      '<a class="btn btn-ghost btn-sm" href="'+c.href+'">Photos</a>'+
      '</div></div>';
    art.querySelector('[data-act="bm"]').addEventListener("click",function(){copy(caption(c,"bm"))});
    art.querySelector('[data-act="en"]').addEventListener("click",function(){copy(caption(c,"en"))});
    art.querySelector('[data-act="lead"]').addEventListener("click",function(){copy(leadMsg(c))});
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
