document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');
  if(!a) return;
  const id=a.getAttribute('href');
  if(id.length>1){
    e.preventDefault();
    const el=document.querySelector(id);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  }
});

const io=new IntersectionObserver(entries=>{
  entries.forEach(en=>{if(en.isIntersecting) en.target.classList.add('show');});
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

document.querySelectorAll('img.fade-img').forEach(img=>{
  if(img.complete){img.classList.add('loaded');}
  else{img.addEventListener('load',()=>img.classList.add('loaded'));}
});