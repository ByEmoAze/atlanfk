document.addEventListener('DOMContentLoaded',()=>{
  // Navbar profile dropdown injection
  (async()=>{
    const nav=document.querySelector('.nav .nav-links');
    if(!nav) return;
    if(window.PUBLIC_MODE){
      // Hide auth/admin links in public mode
      [...nav.querySelectorAll('a')].forEach(a=>{
        const href=a.getAttribute('href')||'';
        if(['login.html','register.html','admin.html','auth.html'].includes(href)) a.remove();
      });
      return;
    }
    const token=localStorage.getItem('atlanfk_token');
    if(!token){
      // show Login/Register if not present
      const hasLogin=[...nav.querySelectorAll('a')].some(a=>a.getAttribute('href')==='login.html');
      if(!hasLogin){
        const a1=document.createElement('a');a1.href='login.html';a1.textContent='Giriş';
        const a2=document.createElement('a');a2.href='register.html';a2.textContent='Qeydiyyat';
        nav.appendChild(a1);nav.appendChild(a2);
      }
      return;
    }
    try{
      const res=await fetch((window.API_BASE||'')+'/api/auth/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      const data=await res.json();
      if(!res.ok) return;
      const username=data.user.username;
      // Clear auth links if exist
      [...nav.querySelectorAll('a')].forEach(a=>{
        if(['login.html','register.html'].includes(a.getAttribute('href'))) a.remove();
      });
      const wrap=document.createElement('div');
      wrap.style.position='relative';
      wrap.innerHTML=`<button id="profile-btn" class="btn">${username}</button>
      <div id="profile-menu" style="position:absolute;right:0;top:110%;background:#121820;border:1px solid rgba(255,255,255,.12);border-radius:10px;min-width:200px;display:none;padding:8px">
        <div style="padding:8px 10px;color:#b5c0cf">${username}</div>
        <hr style="border-color:rgba(255,255,255,.08)">
        <button id="logout-btn" class="btn" style="width:100%;margin:6px 0">Hesabdan çıx</button>
        <button id="delete-btn" class="btn" style="width:100%;border-color:#ff6b6b;color:#ffb3b3">Hesabı sil</button>
      </div>`;
      nav.appendChild(wrap);
      const btn=wrap.querySelector('#profile-btn');
      const menu=wrap.querySelector('#profile-menu');
      btn.addEventListener('click',()=>{menu.style.display=menu.style.display==='none'||menu.style.display===''?'block':'none'});
      document.addEventListener('click',(e)=>{ if(!wrap.contains(e.target)) menu.style.display='none'; });
      wrap.querySelector('#logout-btn').addEventListener('click',()=>{localStorage.removeItem('atlanfk_token'); location.reload();});
      wrap.querySelector('#delete-btn').addEventListener('click',async()=>{
        if(!confirm('Hesabınızı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.')) return;
        const r=await fetch((window.API_BASE||'')+'/api/auth/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
        if(r.ok){ localStorage.removeItem('atlanfk_token'); location.href='index.html'; }
        else alert('Silinmədi');
      });
    }catch(e){/* ignore */}
  })();
  // Contact form handling
  const form=document.getElementById('contact-form');
  if(form){
  const statusEl=document.getElementById('form-status');
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    statusEl.textContent='Göndərilir...';
    const formData=new FormData(form);
    const name=formData.get('name')?.toString().trim();
    const email=formData.get('email')?.toString().trim();
    const message=formData.get('message')?.toString().trim();
    const emailOk=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email||'');
    if(!name||!emailOk){
      statusEl.textContent='Zəhmət olmasa ad və düzgün e‑poçt daxil edin.';
      statusEl.style.color='#ffb3b3';
      return;
    }
    // Real email sending via Formspree/other endpoint
    // 1) Go to https://formspree.io, create a form, and replace ENDPOINT below.
    // 2) It will forward messages to atlanfk@gmail.com after verification.
    const ENDPOINT = form.dataset.endpoint || '';
    try{
      if(ENDPOINT){
        const res = await fetch(ENDPOINT,{method:'POST',headers:{'Accept':'application/json'},body:formData});
        if(!res.ok) throw new Error('http');
        statusEl.style.color='#a8ffbf';
        statusEl.textContent='Mesajınız göndərildi. Təşəkkürlər!';
        form.reset();
      }else{
        // Fallback demo if endpoint not configured
        await new Promise(r=>setTimeout(r,700));
        statusEl.style.color='#a8ffbf';
        statusEl.textContent='Demo rejim: endpoint qurulmayıb. (Formspree linkini əlavə edin)';
      }
    }catch(err){
      statusEl.style.color='#ffb3b3';
      statusEl.textContent='Xəta baş verdi. Daha sonra yenidən cəhd edin.';
    }
  });
  }

  // Gate editing by role
  const token = localStorage.getItem('atlanfk_token');
  let canEdit=false;
  async function checkRole(){
    if(!token) return false;
    try{
      const res=await fetch('/api/auth/me',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      const data=await res.json();
      if(res.ok && (data.user.role==='admin' || data.user.role==='superadmin')) return true;
    }catch(e){}
    return false;
  }

  (async()=>{
    canEdit = await checkRole();
    document.querySelectorAll('.pitch [contenteditable][data-key]')
      .forEach((el)=>{
        const key='atlanfk_name_'+el.getAttribute('data-key');
        const cached=localStorage.getItem(key);
        if(cached) el.textContent=cached;
        if(canEdit){
          el.setAttribute('contenteditable','true');
          el.addEventListener('input',()=>{
            localStorage.setItem(key,el.textContent.trim());
          });
        }else{
          el.setAttribute('contenteditable','false');
        }
      });

  // Drag & drop for positions with persistence (relative % coords)
  const pitch=document.getElementById('pitch');
  if(!pitch) return;
  const nodes=[...pitch.querySelectorAll('.pos')];

  const loadPos=()=>{
    nodes.forEach(node=>{
      const key=node.querySelector('[data-key]')?.getAttribute('data-key');
      if(!key) return;
      const stored=localStorage.getItem('atlanfk_xy_'+key);
      if(stored){
        const {x,y}=JSON.parse(stored);
        node.style.left=x+'%';
        node.style.top=y+'%';
        node.style.right='';
        node.style.bottom='';
      }
    });
  };

  const savePos=(node,xPerc,yPerc)=>{
    const key=node.querySelector('[data-key]')?.getAttribute('data-key');
    if(!key) return;
    localStorage.setItem('atlanfk_xy_'+key,JSON.stringify({x:xPerc,y:yPerc}));
  };

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  let dragging=null;
  nodes.forEach(node=>{
    const onPointerDown=(e)=>{
      if(!canEdit) return;
      dragging=node;
      node.classList.add('dragging');
      node.setPointerCapture(e.pointerId);
    };
    const onPointerMove=(e)=>{
      if(dragging!==node) return;
      const rect=pitch.getBoundingClientRect();
      const x=clamp((e.clientX-rect.left)/rect.width,0,1);
      const y=clamp((e.clientY-rect.top)/rect.height,0,1);
      const xPerc=(x*100);
      const yPerc=(y*100);
      node.style.left=xPerc+'%';
      node.style.top=yPerc+'%';
    };
    const onPointerUp=(e)=>{
      if(dragging!==node) return;
      dragging=null;
      node.classList.remove('dragging');
      const rect=pitch.getBoundingClientRect();
      const centerX=(node.getBoundingClientRect().left+node.offsetWidth/2-rect.left)/rect.width*100;
      const centerY=(node.getBoundingClientRect().top+node.offsetHeight/2-rect.top)/rect.height*100;
      savePos(node,clamp(centerX,0,100),clamp(centerY,0,100));
    };
    node.addEventListener('pointerdown',onPointerDown);
    node.addEventListener('pointermove',onPointerMove);
    node.addEventListener('pointerup',onPointerUp);
    node.addEventListener('pointercancel',onPointerUp);
  });

  loadPos();

  // Reset button
  const reset=document.getElementById('reset-pitch');
  if(reset){
    reset.addEventListener('click',()=>{
      if(!canEdit){ alert('Yalnız admin/üstadmin dəyişdirə bilər.'); return; }
      document.querySelectorAll('.pitch [data-key]').forEach(el=>{
        const k=el.getAttribute('data-key');
        localStorage.removeItem('atlanfk_xy_'+k);
        // keep names as user may want them persistent
      });
      location.reload();
    });
  }
  })();
});


