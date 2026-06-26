/**
 * Tiny scroll-reveal runtime (~400 bytes) injected into published pages.
 * Watches for elements with class "s9-reveal" and adds "s9-visible" when
 * they enter the viewport. CSS in the page handles the actual transition.
 */
export const SCROLL_REVEAL_CSS = `
.s9-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}
.s9-reveal.s9-visible {
  opacity: 1;
  transform: translateY(0);
}
`

export const SCROLL_REVEAL_SCRIPT = `
(function(){
  if(!window.IntersectionObserver)return;
  var o=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('s9-visible');o.unobserve(e.target);}
    });
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.s9-reveal').forEach(function(el){o.observe(el);});
})();
`
