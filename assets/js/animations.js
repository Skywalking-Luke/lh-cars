/* LH Cars motion: hero entrance, scroll reveal, header shrink, gallery fade. No libraries. */
(function(){
var d=document,root=d.documentElement,reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var css=".hdr{transition:background .3s,box-shadow .3s}.hdr .wrap{transition:height .3s}.hdr.scrolled{background:rgba(14,16,22,.97);box-shadow:0 8px 24px rgba(0,0,0,.35)}.hdr.scrolled .wrap{height:56px}"+
".card .ph img,.hero-card img,.thumbs img{transition:transform .6s cubic-bezier(.2,.7,.2,1)}.card:hover .ph img,.hero-card:hover img{transform:scale(1.06)}"+
".btn{transition:transform .2s,box-shadow .2s,background .2s,filter .2s}.btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.35)}.btn:active{transform:translateY(0)}"+
".stage img{transition:opacity .35s ease}.stage img.fade{opacity:.15}.swa{animation:lhpop .6s .8s both}"+
"@keyframes lhpop{from{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:none}}"+
"@keyframes lhup{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}"+
".anim .hero .kick,.anim .hero h1,.anim .hero p,.anim .hero .ctas,.anim .hero-card,.anim .page-h .kick,.anim .page-h h1,.anim .page-h p{animation:lhup .8s cubic-bezier(.2,.7,.2,1) both}"+
".anim .hero h1,.anim .page-h h1{animation-delay:.08s}.anim .hero p,.anim .page-h p{animation-delay:.16s}.anim .hero .ctas{animation-delay:.24s}.anim .hero-card{animation-delay:.2s}"+
".anim [data-rv]{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}.anim [data-rv].in{opacity:1;transform:none}"+
"@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}";
var s=d.createElement("style");s.textContent=css;d.head.appendChild(s);
// header shrink on scroll
var h=d.querySelector(".hdr");function onScroll(){if(h)h.classList.toggle("scrolled",window.scrollY>20)}
window.addEventListener("scroll",onScroll,{passive:true});onScroll();
// gallery fade when the main photo changes
var st=d.querySelector(".stage img");
if(st&&!reduce&&window.MutationObserver){new MutationObserver(function(){st.classList.add("fade");var done=function(){st.classList.remove("fade")};if(st.complete)setTimeout(done,60);else st.addEventListener("load",done,{once:true})}).observe(st,{attributes:true,attributeFilter:["src"]})}
if(reduce||!("IntersectionObserver" in window))return;
// scroll reveal (staggered within each group)
root.classList.add("anim");
var sel=".sec-h,.card,.step,.feat,.cta,.note,.filters,.faq details,.stage,.pbar,.dgrid>div,.enq,.trust .wrap>div,.form";
var els=[].slice.call(d.querySelectorAll(sel));
els.forEach(function(el){var p=el.parentNode,i=[].indexOf.call(p.children,el);el.setAttribute("data-rv","");el.style.transitionDelay=Math.min(i,5)*70+"ms"});
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);setTimeout(function(){e.target.style.transitionDelay=""},1200)}})},{rootMargin:"0px 0px -8% 0px",threshold:.08});
els.forEach(function(el){io.observe(el)});
// filter/sort re-shows cards immediately
d.addEventListener("change",function(e){if(e.target.closest&&e.target.closest(".filters"))els.forEach(function(el){el.classList.add("in")})});
})();
