/* Bellas Conecta: registro como primera pantalla.
   Modo local de PRUEBA funciona en este mismo navegador.
   Modo servidor opcional: Supabase con las credenciales públicas configuradas. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.BELLAS_SUPABASE || {};
  const serverMode = /^https:\/\/[\w-]+\.supabase\.co\/?$/.test(cfg.url||'') &&
    Boolean(cfg.anonKey) && !/PEGA_AQUI|TU-|sb_secret_|service.role/i.test(cfg.anonKey) &&
    Boolean(window.supabase?.createClient);
  const KEY_USERS='bc-demo-users-v3',KEY_CURRENT='bc-demo-session-v3';
  const getUsers=()=>{try {return JSON.parse(localStorage.getItem(KEY_USERS)||'[]')||[];}catch{return []}};
  const saveUsers=users=>localStorage.setItem(KEY_USERS,JSON.stringify(users));
  let db=null,session=null,profile=null,isAdmin=false,cartera=[],page=0,hasMore=false;
  let authVersion=0;
  const normEmail=s=>String(s||'').trim().toLowerCase();
  const errorBox=$('accountMessages');
  function aviso(msg,tipo='error') {errorBox.hidden=false;errorBox.className='account-notice '+tipo;errorBox.textContent=msg;}
  function clearAviso(){errorBox.hidden=true;errorBox.textContent='';}
  function busy(id,on){const b=$(id); if(!b)return; b.disabled=on;if(on){b.dataset.original=b.textContent;b.textContent='Un momento…';}else if(b.dataset.original){b.textContent=b.dataset.original;}}
  function modo(m){$('signupForm').hidden=m!=='registro';$('loginForm').hidden=m!=='login';$('showSignUp').setAttribute('aria-selected',String(m==='registro'));$('showLogIn').setAttribute('aria-selected',String(m==='login'));clearAviso();}
  function rutValido(v){
    const clean=String(v||'').toUpperCase().replace(/[^0-9K]/g,'');
    if(!/^\d{1,8}[0-9K]$/.test(clean))return null;
    const body=clean.slice(0,-1); let fac=2,sum=0;
    for(let i=body.length-1;i>=0;i--){sum+=Number(body[i])*fac;fac=fac===7?2:fac+1;}
    const rem=11-sum%11;const dv=rem===11?'0':rem===10?'K':String(rem);
    if(clean.slice(-1)!==dv)return null;
    return `${Number(body)}-${dv}`;
  }
  function telefono(v){const digits=String(v||'').replace(/\D/g,'');if(/^9\d{8}$/.test(digits))return '+56'+digits;if(/^569\d{8}$/.test(digits))return '+'+digits;return null;}
  function human(e){const s=String(e?.message||'').toLowerCase();if(/already registered|already exists|user already/.test(s))return 'Este correo ya está registrado. Ingresa a tu cuenta.';if(/invalid|credentials/.test(s))return 'Correo o contraseña incorrectos.';if(/email not confirmed/.test(s))return 'Revisa tu correo para confirmar tu cuenta.';return 'No se pudo completar la operación. Inténtalo nuevamente.';}
  // En este prototipo local solo se almacena un derivado de la contraseña, nunca la contraseña en texto.
  async function hashPassword(password,salt){if(!crypto?.subtle)throw Error('Para registrarte abre la aplicación desde un enlace HTTPS.');const raw=new TextEncoder().encode(password);const key=await crypto.subtle.importKey('raw',raw,'PBKDF2',false,['deriveBits']);const saltBytes=Uint8Array.from(salt.match(/.{2}/g).map(h=>parseInt(h,16)));const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,iterations:125000,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('');}
  function bytesHex(a){return [...a].map(x=>x.toString(16).padStart(2,'0')).join('');}
  function currentLocal(){const em=localStorage.getItem(KEY_CURRENT);return getUsers().find(u=>u.email===em)||null;}
  function markAdmin(){
    $('cartera-registrada-tab').hidden=!isAdmin;
    document.querySelectorAll('button[data-tab="portal"]').forEach(el=>el.hidden=!isAdmin);
    const btn=document.querySelector('#bottom button[onclick*="portal"]');if(btn){btn.hidden=!isAdmin;}
    const pc=$('portal-cartera');if(pc&&!isAdmin)pc.classList.remove('active');
  }
  function goHome(){if(typeof go==='function')go('inicio'); window.scrollTo(0,0);}
  function applyProfile(){
    $('profileEmail').textContent=profile?.email||'';
    $('profileRut').textContent=profile?.rut||'';
    $('profileName').value=profile?.nombre||'';
    $('profilePhone').value=profile?.telefono||'';
    if($('bName'))$('bName').value=profile?.nombre||'';
    if($('bPhone'))$('bPhone').value=profile?.telefono||'';
  }
  function renderCartera(){
    const query=$('carteraSearch').value.trim().toLowerCase();
    const filtered=cartera.filter(u=>[u.nombre,u.rut,u.telefono,u.email].some(x=>String(x||'').toLowerCase().includes(query)));
    $('carteraList').replaceChildren();
    for(const u of filtered){
      const el=document.createElement('div');el.className='client-reg-card';
      const title=document.createElement('b');title.textContent=u.nombre;
      const more=document.createElement('div');more.className='muted';more.style.whiteSpace='pre-line';
      more.textContent=`RUT: ${u.rut}\nTeléfono: ${u.telefono}\nCorreo: ${u.email}\nFecha de registro: ${new Date(u.creado_en).toLocaleDateString('es-CL')}`;
      el.append(title,more);$('carteraList').appendChild(el);
    }
    if(!filtered.length){const empty=document.createElement('div');empty.className='card empty';empty.textContent='No hay clientes para mostrar.';$('carteraList').appendChild(empty);}
    $('carteraTotal').textContent=`${cartera.length} cliente(s) registrado(s)`;
    $('carteraMas').hidden=!serverMode||!hasMore;
  }
  async function cargarCartera(reset=true){
    if(!isAdmin||!profile)return;
    if(serverMode){if(reset){cartera=[];page=0;}const {data,error}=await db.from('clientes').select('id,nombre,rut,telefono,email,creado_en').order('creado_en',{ascending:false}).range(page*50,(page+1)*50-1);
      if(error){$('carteraList').textContent='No fue posible consultar la cartera.';return;}
      cartera.push(...(data||[]));hasMore=(data||[]).length===50;page++;
    }else cartera=getUsers();
    renderCartera();
  }
  function enter(u,serverSession=null){
    profile=u;session=serverSession||{user:{id:u.id,email:u.email}};isAdmin=!!u.admin;
    $('accountSignedIn').hidden=false;$('accountSignedOut').hidden=true;
    document.body.classList.add('bc-session');markAdmin();applyProfile();clearAviso();
    // Mantiene aislada la experiencia de cada cuenta en el historial visible.
    if(typeof renderClientHistory==='function')renderClientHistory();
    goHome();
  }
  function exit(){
    session=null;profile=null;isAdmin=false;authVersion++;
    $('accountSignedIn').hidden=true;$('accountSignedOut').hidden=false;
    document.body.classList.remove('bc-session');$('cartera-registrada-tab').hidden=true;
    $('carteraList').replaceChildren();
    $('loginForm').reset();$('signupForm').reset();modo('login');
    window.scrollTo(0,0);
  }
  async function signup(e){
    e.preventDefault();clearAviso();
    const nombre=$('cuName').value.trim().replace(/\s+/g,' '),rut=rutValido($('cuRut').value),tel=telefono($('cuPhone').value),email=normEmail($('cuEmail').value),pass=$('cuPassword').value;
    if(nombre.length<3||nombre.length>100)return aviso('Ingresa tu nombre y apellido.');
    if(!rut)return aviso('Revisa tu RUT y su dígito verificador.');
    if(!tel)return aviso('Escribe un celular chileno válido (ejemplo: 9 1234 5678).');
    if(pass.length<8)return aviso('Tu contraseña debe tener al menos 8 caracteres.');
    if(pass!==$('cuPasswordConfirm').value)return aviso('Las contraseñas no coinciden.');
    if(!$('cuConsent').checked)return aviso('Debes aceptar el registro de datos para crear la cuenta.');
    busy('signUpBtn',true);
    try{
      if(serverMode){
        const {data,error}=await db.auth.signUp({email,password:pass,options:{emailRedirectTo:location.origin+location.pathname,data:{nombre,rut,telefono:tel,autoriza_promociones:$('cuOffers').checked,consentimiento_version:'2026-10'}}});
        if(error)throw error;
        if(data.session){await syncServer(data.session);}
        else {modo('login');aviso('Cuenta creada. Confirma tu correo e inicia sesión.','ok');}
      }else{
        const users=getUsers();
        if(users.some(u=>u.email===email))return aviso('Este correo ya tiene cuenta. Selecciona Iniciar sesión.');
        if(users.some(u=>u.rut===rut))return aviso('Este RUT ya está registrado en este dispositivo.');
        const salt=bytesHex(crypto.getRandomValues(new Uint8Array(16)));
        const hash=await hashPassword(pass,salt);
        const rec={id:bytesHex(crypto.getRandomValues(new Uint8Array(12))),nombre,rut,telefono:tel,email,salt,hash,creado_en:new Date().toISOString(),autoriza_promociones:$('cuOffers').checked,admin:users.length===0};
        users.push(rec);saveUsers(users);localStorage.setItem(KEY_CURRENT,rec.email);$('signupForm').reset();enter(rec);
      }
    }catch(err){aviso(err.message?.startsWith('Para registrarte')?err.message:human(err));}
    finally{busy('signUpBtn',false);}
  }
  async function login(e){
    e.preventDefault();clearAviso();busy('loginBtn',true);
    try{
      const email=normEmail($('loginEmail').value),pass=$('loginPassword').value;
      if(serverMode){const {data,error}=await db.auth.signInWithPassword({email,password:pass});if(error)throw error;await syncServer(data.session);}
      else{const u=getUsers().find(u=>u.email===email);if(!u||await hashPassword(pass,u.salt)!==u.hash)return aviso('Correo o contraseña incorrectos.');localStorage.setItem(KEY_CURRENT,email);$('loginForm').reset();enter(u);}
    }catch(err){aviso(err.message?.startsWith('Para registrarte')?err.message:human(err));}
    finally{busy('loginBtn',false);}
  }
  async function syncServer(s){
    if(!s)return exit();
    const v=++authVersion;
    const {data:rec,error}=await db.from('clientes').select('nombre,rut,telefono,email').eq('id',s.user.id).maybeSingle();
    if(v!==authVersion)return;
    if(error||!rec){aviso('Tu cuenta fue creada, pero no se pudo obtener tu perfil.');return;}
    const {data:a}=await db.from('administradores').select('user_id').eq('user_id',s.user.id).maybeSingle();
    if(v!==authVersion)return;
    enter({...rec,id:s.user.id,admin:!!a,email:rec.email||s.user.email},s);
  }
  async function updateProfile(e){
    e.preventDefault();if(!profile)return;
    const nombre=$('profileName').value.trim().replace(/\s+/g,' '),tel=telefono($('profilePhone').value);
    if(nombre.length<3||!tel)return aviso('Revisa el nombre y el número de teléfono.');
    if(serverMode){const {error}=await db.from('clientes').update({nombre,telefono:tel}).eq('id',session.user.id);if(error)return aviso('No se pudo actualizar el perfil.');}
    else{const users=getUsers(),u=users.find(x=>x.id===profile.id);if(!u)return aviso('No encontramos tu cuenta.');u.nombre=nombre;u.telefono=tel;saveUsers(users);}
    profile.nombre=nombre;profile.telefono=tel;applyProfile();aviso('Tus datos se actualizaron.','ok');
  }
  async function passwordRecovery(){
    if(!serverMode)return aviso('En esta versión de prueba, crea otra cuenta de prueba si olvidaste tu contraseña.');
    const em=normEmail($('loginEmail').value);if(!em)return aviso('Primero escribe tu correo.');
    const {error}=await db.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});aviso(error?'No pudimos enviar el enlace.':'Revisa tu correo para recuperar tu contraseña.',error?'error':'ok');
  }
  async function resetPassword(e){e.preventDefault();if(!serverMode)return;
    const pw=$('recoveryPassword').value;if(pw.length<8)return aviso('Mínimo 8 caracteres.');
    const {error}=await db.auth.updateUser({password:pw});if(error)aviso('No se pudo cambiar la contraseña.');else{$('recoveryForm').hidden=true;aviso('Contraseña actualizada.','ok');}
  }
  function exportCsv(){if(!isAdmin||!cartera.length)return;
    if(!confirm('La descarga contiene información personal. ¿Quieres exportarla?'))return;
    const csvSafe=x=>{let val=String(x??'');if(/^[\s\x00-\x1f]*[=+@\-]/.test(val))val="'"+val;return '"'+val.replace(/"/g,'""')+'"';};
    const rows=[['Nombre','RUT','Teléfono','Correo','Fecha de registro'],...cartera.map(u=>[u.nombre,u.rut,u.telefono,u.email,u.creado_en])];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(csvSafe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='bellas-conecta-clientes.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),400);
  }
  async function init(){
    // Trasladar el formulario existente a portada, sin duplicar IDs.
    $('authHere').appendChild($('accountMessages'));
    $('authHere').appendChild($('accountSignedOut'));
    $('showLogIn').addEventListener('click',()=>modo('login'));
    $('showSignUp').addEventListener('click',()=>modo('registro'));
    $('signupForm').addEventListener('submit',signup);
    $('loginForm').addEventListener('submit',login);
    $('profileForm').addEventListener('submit',updateProfile);
    $('logoutBtn').addEventListener('click',async()=>{if(serverMode)await db.auth.signOut();else localStorage.removeItem(KEY_CURRENT);exit();});
    $('forgotPassword').addEventListener('click',passwordRecovery);
    $('recoveryForm').addEventListener('submit',resetPassword);
    $('carteraSearch').addEventListener('input',renderCartera);
    $('carteraMas').addEventListener('click',()=>cargarCartera(false));
    $('carteraCSV').addEventListener('click',exportCsv);
    $('cuRut').addEventListener('blur',()=>{const r=rutValido($('cuRut').value);if(r)$('cuRut').value=r;});
    modo('login');
    if(serverMode){
      db=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}});
      db.auth.onAuthStateChange((event,s)=>{
        setTimeout(()=>{if(event==='PASSWORD_RECOVERY'){$('recoveryForm').hidden=false;aviso('Ingresa tu nueva contraseña.','ok');}else if(event==='SIGNED_OUT')exit();else if(event==='SIGNED_IN')syncServer(s);},0);
      });
      const {data}=await db.auth.getSession();if(data?.session)await syncServer(data.session);
    }else{const u=currentLocal();if(u)enter(u);}
  }
  window.BellasClientes={cargarCartera,normalizarRut:rutValido,normalizarTelefono:telefono,esAdmin:()=>isAdmin};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
