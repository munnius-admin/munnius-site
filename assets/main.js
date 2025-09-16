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

const io=new IntersectionObserver((entries,observer)=>{
  entries.forEach(en=>{
    if(!en.isIntersecting) return;
    en.target.classList.add('show');
    observer.unobserve(en.target);
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

const finishLoad=img=>{
  const apply=()=>requestAnimationFrame(()=>img.classList.add('loaded'));
  if('decode' in img){img.decode().catch(()=>{}).then(apply);} else{apply();}
};

document.querySelectorAll('img.fade-img').forEach(img=>{
  if(img.complete){
    if(img.naturalWidth>0){finishLoad(img);} else{img.classList.add('loaded');}
    return;
  }
  img.addEventListener('load',()=>finishLoad(img),{once:true});
  img.addEventListener('error',()=>img.classList.add('loaded'),{once:true});
});
