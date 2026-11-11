/* Rumah Tangga Aset — frontend */
const API=(window.RTA_CONFIG||{}).API_URL;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get:k=>{try{return sessionStorage.getItem(k)}catch(_){return null}},set:(k,v)=>{try{sessionStorage.setItem(k,v)}catch(_){}},clear:()=>{try{sessionStorage.clear()}catch(_){}}};
let token=store.get('rta_token')||'';
let me=null;try{me=JSON.parse(store.get('rta_user')||'null')}catch(_){}
let page='dashboard';
const cache={assets:[],loans:[],vehicles:[],users:[]};

/* ---------- ikon ---------- */
const ic=(d,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I={
  dashboard:ic('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  assets:ic('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  loans:ic('<path d="M7 7h13l-3-3M17 17H4l3 3"/>'),
  vehicles:ic('<path d="M5 16h14M3 12l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 7l2 5v5h-3M3 12v5h3"/><circle cx="7.5" cy="16.5" r="1.7"/><circle cx="16.5" cy="16.5" r="1.7"/>'),
  users:ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .7 3.2 2.4 3.5 5.2"/>'),
  activity:ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  menu:ic('<path d="M4 7h16M4 12h16M4 17h16"/>',24),
  check:ic('<path d="m5 12 5 5 9-10"/>',18)
};


/* ---------- foto: perkecil di browser, tampilkan via thumbnail Drive ---------- */
const imgUrl=u=>{u=String(u||'');const m=u.match(/[?&]id=([\w-]+)/)||u.match(/\/d\/([\w-]+)/);return m&&/drive\.google\.com|googleusercontent\.com/.test(u)?'https://drive.google.com/thumbnail?id='+m[1]+'&sz=w800':u};
function readImage(file,max=1280){return new Promise((res,rej)=>{
  if(!/^image\/(png|jpeg|webp)$/.test(file.type))return rej(Error('Format foto harus JPG, PNG, atau WEBP.'));
  if(file.size>15*1024*1024)return rej(Error('Ukuran foto terlalu besar (maks. 15 MB).'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.85))};
  img.onerror=()=>{URL.revokeObjectURL(url);rej(Error('Gagal membaca foto.'))};
  img.src=url})}
function previewPhoto(inputId,boxId){const i=$(inputId),b=$(boxId);i.onchange=()=>{const f=i.files[0];if(!f){b.innerHTML='';return}b.innerHTML='<img class="photo-preview" alt="Pratinjau foto" src="'+URL.createObjectURL(f)+'">'}}

/* ---------- util UI ---------- */
function toast(s,isErr){const t=$('#toast');if(!t)return;t.textContent=s;t.classList.toggle('err',!!isErr);t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),isErr?4200:2600)}
let inflight=0;
function progress(d){inflight=Math.max(0,inflight+d);const p=$('#progress');if(p)p.classList.toggle('on',inflight>0)}
const loaderBars=(cls='')=>`<div class="bars ${cls}" aria-hidden="true">${'<i></i>'.repeat(9)}</div>`;
function busy(btn,on){if(!btn)return;btn.classList.toggle('is-busy',on);btn.disabled=on}
function setApp(html){$('#app').innerHTML=html}

/* ---------- API ---------- */
class ApiError extends Error{constructor(m,kind){super(m);this.kind=kind}}
async function api(action,data={}){
  const body=new URLSearchParams({action,token});
  for(const [k,v] of Object.entries(data))body.set(k,String(v??''));
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);
  let text;
  progress(1);
  try{
    const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,signal:ctl.signal});
    text=await res.text();
  }catch(e){
    throw new ApiError(e.name==='AbortError'
      ?'Server tidak merespons dalam 30 detik. Coba lagi sebentar lagi.'
      :'Tidak dapat terhubung ke server. Periksa koneksi internet. Jika koneksi normal, pastikan URL Web App di config.js benar dan akses deployment diatur ke "Anyone".','network');
  }finally{clearTimeout(timer);progress(-1)}
  let j;
  try{j=JSON.parse(text)}catch(_){
    throw new ApiError('Server membalas bukan JSON (biasanya halaman login Google atau error Apps Script). Di Apps Script: Deploy > Manage deployments, set "Execute as: Me" dan "Who has access: Anyone", lalu deploy versi baru.','format');
  }
  if(!j.success)throw new ApiError(j.error||'Permintaan gagal','server');
  return j;
}
const sessionExpired=e=>e&&e.kind==='server'&&/^Sesi tidak valid/i.test(e.message);

/* ---------- Login ---------- */
function login(){
  const bars=[3,6,4,3,6,4,3,5,4,6,3,4,6,3,5,4,3,6,4,3,5,6,4,3].map(w=>`<i style="width:${w}px"></i>`).join('');
  setApp(`<div class="login">
    <section class="login-art">
      <div class="brand"><div class="brand-mark">RT</div><div><b>Rumah Tangga Aset</b><small>Sistem informasi aset Gubernuran</small></div></div>
      <div>
        <h2>Setiap barang tercatat. Setiap peminjaman terlacak.</h2>
        <p class="lede">Satu portal untuk inventaris, pengajuan, serah terima, dan pengembalian barang di lingkungan Gubernuran.</p>
        <div class="tagstrip" aria-hidden="true">${bars}</div>
      </div>
      <div class="login-points">
        <span>${I.check} Stok berkurang saat barang diserahkan, bertambah saat dikembalikan</span>
        <span>${I.check} Setiap perubahan tercatat di riwayat aktivitas</span>
      </div>
    </section>
    <section class="login-panel">
      <div class="login-card">
        <h1>Masuk</h1>
        <p class="sub">Gunakan akun yang dibuat oleh Admin Rumah Tangga.</p>
        <div class="login-err" id="loginErr" role="alert"></div>
        <form id="loginForm" novalidate>
          <div class="row"><label for="u">Username</label><input id="u" class="field" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
          <div class="row"><label for="p">Password</label><div class="pw"><input id="p" class="field" type="password" name="password" autocomplete="current-password" required><button type="button" id="showPw" aria-label="Tampilkan password">Lihat</button></div></div>
          <button class="btn" id="loginBtn" type="submit">Masuk</button>
        </form>
        <div class="conn wait" id="conn"><i></i><span>Memeriksa koneksi ke database…</span></div>
      </div>
    </section>
  </div>`);
  $('#u').focus();
  $('#showPw').onclick=()=>{const p=$('#p'),show=p.type==='password';p.type=show?'text':'password';$('#showPw').textContent=show?'Sembunyikan':'Lihat'};
  checkConn();
  $('#loginForm').onsubmit=async e=>{
    e.preventDefault();
    const err=$('#loginErr'),btn=$('#loginBtn');
    err.classList.remove('show');
    const username=$('#u').value.trim(),password=$('#p').value;
    if(!username||!password){err.textContent='Isi username dan password.';err.classList.add('show');return}
    busy(btn,true);
    try{
      const r=await api('login',{username,password});
      if(!r.token||!r.user)throw new ApiError('Balasan login tidak lengkap dari server.','format');
      token=r.token;me=r.user;
      store.set('rta_token',token);store.set('rta_user',JSON.stringify(me));
      shell();
    }catch(ex){
      err.textContent=ex.message;err.classList.add('show');busy(btn,false);$('#p').select();
    }
  };
}
async function checkConn(){
  const c=$('#conn');if(!c)return;
  try{await api('health');if(!$('#conn'))return;c.className='conn ok';c.lastChild.textContent='Terhubung ke database'}
  catch(e){if(!$('#conn'))return;c.className='conn bad';c.lastChild.textContent='Server tidak dapat dijangkau'; if(!$('#loginErr').classList.contains('show')){$('#loginErr').textContent=e.message;$('#loginErr').classList.add('show')}}
}

/* ---------- Shell ---------- */
function shell(){
  const admin=['admin','staff'].includes(me.role),ini=(me.name||'?').split(' ').filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
  const nav=(p,label)=>`<button class="nav-item" data-p="${p}">${I[p]}<span>${label}</span></button>`;
  setApp(`<div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand"><div class="brand-mark">RT</div><div><b>Rumah Tangga</b><small>Aset Gubernuran</small></div></div>
      <nav id="nav">${nav('dashboard','Dashboard')}${nav('assets','Inventaris')}${nav('loans','Peminjaman')}${admin?nav('vehicles','Kendaraan')+nav('users','Pengguna')+nav('activity','Aktivitas'):''}</nav>
      <div class="side-bottom">Terhubung ke Google Sheets</div>
    </aside>
    <div class="scrim" id="scrim"></div>
    <main class="main">
      <header class="topbar">
        <div class="top-left"><button class="mobile-menu" id="mobile" aria-label="Buka menu">${I.menu}</button><h1 id="title">Dashboard</h1></div>
        <div class="top-actions"><div class="user-chip"><div class="avatar">${esc(ini)}</div><div><b>${esc(me.name)}</b><small>${esc(me.department||me.role)}</small></div></div><button class="logout" id="logout">Keluar</button></div>
      </header>
      <section class="content" id="content"></section>
      <footer>Rumah Tangga Aset • Gubernuran</footer>
    </main></div>`);
  const sb=$('#sidebar'),sc=$('#scrim'),toggle=open=>{sb.classList.toggle('open',open);sc.classList.toggle('show',open)};
  $('#nav').onclick=e=>{const b=e.target.closest('[data-p]');if(b){toggle(false);go(b.dataset.p)}};
  $('#mobile').onclick=()=>toggle(!sb.classList.contains('open'));
  sc.onclick=()=>toggle(false);
  $('#logout').onclick=logout;
  go('dashboard');
}
function logout(){api('logout').catch(()=>{});token='';me=null;store.clear();login()}
const TITLES={dashboard:'Dashboard',assets:'Data Inventaris',loans:'Peminjaman Barang',vehicles:'Kendaraan',users:'Manajemen Pengguna',activity:'Riwayat Aktivitas'};
function go(p){page=p;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.p===p));$('#title').textContent=TITLES[p];render()}

function skeleton(){return `<div class="page-loading" role="status">${loaderBars('sm')}<span>Memuat data dari database…</span></div><div class="stats"><div class="sk sk-stat"></div><div class="sk sk-stat"></div><div class="sk sk-stat"></div><div class="sk sk-stat"></div></div><div class="panel"><div class="sk sk-row" style="width:30%"></div><div class="sk sk-row"></div><div class="sk sk-row" style="width:92%"></div><div class="sk sk-row" style="width:85%"></div></div>`}
let renderSeq=0;
async function render(){
  const c=$('#content'),seq=++renderSeq,p=page;
  c.innerHTML=skeleton();
  const view=({dashboard,assets,loans,vehicles,users,activity})[p];
  try{await view(c,()=>seq===renderSeq)}
  catch(e){
    if(seq!==renderSeq)return;
    if(sessionExpired(e)){toast('Sesi berakhir. Silakan masuk kembali.',true);return logout()}
    c.innerHTML=`<div class="note">${esc(e.message)}</div>`;
  }
}
function head(title,desc,button=''){return `<div class="page-head"><div><h2>${title}</h2><p>${desc}</p></div>${button}</div>`}

/* ---------- Halaman ---------- */
async function dashboard(c,live){
  const r=await api('dashboard');if(!live())return;const s=r.summary;
  const alert=['admin','staff'].includes(me.role)&&s.pendingLoans>0?`<div class="alert"><span><b>${s.pendingLoans} pengajuan</b> menunggu persetujuan.</span><button class="btn small dark" onclick="go('loans')">Tinjau pengajuan</button></div>`:'';
  c.innerHTML=head('Ringkasan Aset Gubernuran','Data langsung dari database pusat.')+alert+
  `<div class="stats">
    <div class="stat"><span>Total unit aset</span><strong>${s.totalAssets}</strong></div>
    <div class="stat s2"><span>Barang tersedia</span><strong>${s.availableAssets}</strong></div>
    <div class="stat s3"><span>Menunggu persetujuan</span><strong>${s.pendingLoans}</strong></div>
    <div class="stat s4"><span>Sedang dipinjam</span><strong>${s.activeLoans}</strong></div>
  </div>
  <div class="panel"><div class="panel-title"><h3>Akses cepat</h3></div><div class="quick-grid">
    <button class="quick" onclick="go('assets')">${I.assets}<span><b>Inventaris</b><small>Data dan ketersediaan barang</small></span></button>
    <button class="quick" onclick="go('loans')">${I.loans}<span><b>Peminjaman</b><small>Pengajuan dan pengembalian</small></span></button>
  </div></div>`;
}
async function assets(c,live){
  const r=await api('listAssets');if(!live())return;cache.assets=r.data||[];
  c.innerHTML=head('Daftar Inventaris','Data aset tersimpan di Google Sheets.',me.role==='admin'?'<button class="btn" onclick="assetForm()">Tambah aset</button>':'')+
  `<div class="panel"><div class="toolbar"><input id="q" class="field" placeholder="Cari kode atau nama barang" aria-label="Cari barang"></div><div id="tbl">${assetTable(cache.assets)}</div></div>`;
  $('#q').oninput=()=>{const v=$('#q').value.toLowerCase();$('#tbl').innerHTML=assetTable(cache.assets.filter(a=>(a.asset_name+' '+a.asset_id).toLowerCase().includes(v)))};
}
function assetTable(a){
  if(!a.length)return '<div class="empty">Belum ada data aset.</div>';
  return `<div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th>Lokasi</th><th>Jumlah</th><th>Kondisi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${a.map(x=>`<tr><td class="code">${esc(x.asset_id)}</td><td><b>${esc(x.asset_name)}</b></td><td>${esc(x.category)}</td><td>${esc(x.location)}</td><td class="num">${esc(x.quantity)}</td><td>${esc(x.condition)}</td><td>${tag(x.status)}</td><td><div class="actions"><button class="btn small light" onclick="assetQR(this)">QR</button><button class="btn small light" onclick="assetHistory(this)">Riwayat</button>${me.role==='admin'?`<button class="btn small light" onclick="assetForm('${esc(x.asset_id)}')">Edit</button>`:''}${x.status==='Tersedia'&&Number(x.quantity)>0?`<button class="btn small" onclick="loanForm('${esc(x.asset_id)}')">Pinjam</button>`:''}</div></td></tr>`).join('')}</tbody></table></div>`;
}
function tag(s){const m={'Tersedia':'green','Dikembalikan':'green','Aktif':'green','Menunggu Persetujuan':'amber','Perbaikan':'amber','Ditolak':'red','Nonaktif':'red','Dipinjam':'blue','Disetujui':'teal'};return `<span class="badge ${m[s]||''}">${esc(s)}</span>`}

/* ---------- Modal ---------- */
function modal(title,desc,body,fn,label='Simpan'){
  $('#modalRoot').innerHTML=`<div class="modal-backdrop" id="bd"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${title}</h2><p class="d">${desc}</p>${body}<div class="modal-actions"><button class="btn light" type="button" id="cancelModal">Batal</button><button class="btn" type="button" id="submitModal">${label}</button></div></div></div>`;
  $('#cancelModal').onclick=closeModal;
  $('#bd').addEventListener('mousedown',e=>{if(e.target.id==='bd')closeModal()});
  $('#submitModal').onclick=async()=>{const b=$('#submitModal');busy(b,true);try{await fn()}finally{if($('#submitModal'))busy($('#submitModal'),false)}};
  const f=$('#modalRoot .field');if(f)f.focus();
}
function closeModal(){$('#modalRoot').innerHTML=''}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#bd'))closeModal()});
async function submitForm(action,data,okMsg){
  try{await api(action,data);closeModal();toast(okMsg);render()}
  catch(e){if(sessionExpired(e)){closeModal();toast('Sesi berakhir. Silakan masuk kembali.',true);logout()}else toast(e.message,true)}
}
const formData=()=>Object.fromEntries(new FormData($('#f')));

function assetForm(id){
  const a=cache.assets.find(x=>String(x.asset_id)===String(id))||{};
  const sel=(v,o)=>o.map(x=>`<option ${x===v?'selected':''}>${x}</option>`).join('');
  modal(id?'Edit aset':'Tambah aset','Lengkapi identitas barang.',`<form id="f" class="form-grid">
    <div class="form-field full"><label>Nama barang</label><input class="field" name="asset_name" value="${esc(a.asset_name||'')}" required></div>
    <div class="form-field"><label>Kode aset (kosongkan untuk otomatis)</label><input class="field" name="asset_id" value="${esc(a.asset_id||'')}" ${id?'readonly':''}></div>
    <div class="form-field"><label>Kategori</label><input class="field" name="category" value="${esc(a.category||'')}" required></div>
    <div class="form-field"><label>Lokasi</label><input class="field" name="location" value="${esc(a.location||'')}"></div>
    <div class="form-field"><label>Jumlah</label><input class="field" type="number" min="0" name="quantity" value="${Number(a.quantity)||1}"></div>
    <div class="form-field"><label>Kondisi</label><select class="field" name="condition">${sel(a.condition,['Baik','Perlu pemeriksaan','Rusak'])}</select></div>
    <div class="form-field"><label>Status</label><select class="field" name="status">${sel(a.status,['Tersedia','Perbaikan'])}</select></div>
    <div class="form-field"><label>Penanggung jawab</label><input class="field" name="holder" value="${esc(a.holder||'Rumah Tangga')}"></div>
    <div class="form-field full"><label>Foto inventaris (JPG/PNG/WEBP, otomatis diperkecil)</label><input class="field" type="file" id="assetPhoto" accept="image/png,image/jpeg,image/webp"><div id="assetPreview">${a.image_url?`<img class="photo-preview" alt="Foto saat ini" src="${esc(imgUrl(a.image_url))}">`:''}</div></div>
    <div class="form-field full"><label>Catatan</label><textarea class="field" name="notes">${esc(a.notes||'')}</textarea></div></form>`,
    async()=>{const f=$('#f');if(!f.reportValidity())return;const d=formData(),file=$('#assetPhoto').files[0];try{
      const data=file?await readImage(file):null;
      const saved=await api('saveAsset',d);const assetId=saved.data?.asset_id||d.asset_id;
      if(data){try{await api('uploadAssetImage',{kind:'asset',asset_id:assetId,image_data:data})}catch(e){closeModal();render();return toast('Data aset tersimpan, tetapi foto gagal diunggah: '+e.message,true)}}
      closeModal();toast(file?'Data aset dan foto tersimpan':'Data aset tersimpan');render();
    }catch(e){toast(e.message,true)}});
  previewPhoto('#assetPhoto','#assetPreview');
}

async function loans(c,live){
  const r=await api('listLoans');if(!live())return;cache.loans=r.data||[];
  const rows=cache.loans.slice().reverse();
  c.innerHTML=head(['admin','staff'].includes(me.role)?'Pengelolaan Peminjaman':'Peminjaman Saya','Pengajuan, persetujuan, serah terima, dan pengembalian.',!['admin','staff'].includes(me.role)?'<button class="btn" onclick="loanForm()">Ajukan peminjaman</button>':'')+
  `<div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>No. transaksi</th><th>Pemohon</th><th>Bagian</th><th>Barang</th><th>Jadwal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(l=>`<tr><td class="code">${esc(l.loan_id)}</td><td>${esc(l.requester_name)}</td><td>${esc(l.department)}</td><td>${(l.items||[]).map(i=>esc(i.asset_name)+' × '+esc(i.quantity)).join('<br>')}</td><td>${esc(dt(l.usage_date))}<span class="sub">Kembali ${esc(dt(l.due_date))}</span></td><td>${tag(l.status)}</td><td>${loanActions(l)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Belum ada pengajuan.</div>'}</div>`;
}
function dt(v){if(!v)return '';const s=String(v);return /^\d{4}-\d{2}-\d{2}T/.test(s)?s.slice(0,10):s}
function loanActions(l){
  if(!['admin','staff'].includes(me.role))return '—';
  const id=esc(l.loan_id);
  if(l.status==='Menunggu Persetujuan')return `<div class="actions"><button class="btn small" onclick="loanAction('approveLoan','${id}')">Setujui</button><button class="btn small danger" onclick="loanAction('rejectLoan','${id}')">Tolak</button></div>`;
  if(l.status==='Disetujui')return `<button class="btn small dark" onclick="loanAction('handoverLoan','${id}')">Serahkan</button>`;
  if(l.status==='Dipinjam')return `<button class="btn small" onclick="returnForm('${id}')">Terima kembali</button>`;
  return '—';
}
async function loanAction(action,id){
  const done={approveLoan:'Pengajuan disetujui',rejectLoan:'Pengajuan ditolak',handoverLoan:'Barang diserahkan'};
  try{await api(action,{loan_id:id});toast(done[action]||'Status diperbarui');render()}
  catch(e){if(sessionExpired(e)){toast('Sesi berakhir. Silakan masuk kembali.',true);logout()}else toast(e.message,true)}
}
async function loanForm(prefill=''){
  let avail;
  try{const r=await api('listAssets');avail=(r.data||[]).filter(x=>x.status==='Tersedia'&&Number(x.quantity)>0)}
  catch(e){return toast(e.message,true)}
  if(!avail.length)return toast('Belum ada barang yang tersedia untuk dipinjam.',true);
  modal('Ajukan peminjaman','Permohonan langsung masuk ke Admin Rumah Tangga.',`<form id="f" class="form-grid">
    <div class="form-field full"><label>Barang</label><select class="field" name="asset_id">${avail.map(a=>`<option value="${esc(a.asset_id)}" ${String(a.asset_id)===String(prefill)?'selected':''}>${esc(a.asset_name)} — stok ${esc(a.quantity)}</option>`).join('')}</select></div>
    <div class="form-field"><label>Jumlah</label><input class="field" type="number" min="1" value="1" name="quantity"></div>
    <div class="form-field"><label>Bagian / Biro</label><input class="field" name="department" value="${esc(me.department||'')}" readonly></div>
    <div class="form-field"><label>Tanggal penggunaan</label><input class="field" type="date" name="usage_date" required></div>
    <div class="form-field"><label>Tanggal pengembalian</label><input class="field" type="date" name="due_date" required></div>
    <div class="form-field full"><label>Keperluan</label><textarea class="field" name="purpose" required></textarea></div></form>`,
    ()=>{const f=$('#f');if(!f.reportValidity())return;return submitForm('requestLoan',formData(),'Pengajuan terkirim')},'Kirim pengajuan');
}
function returnForm(id){
  modal('Pengembalian barang','Periksa kondisi barang sebelum menyelesaikan transaksi.',`<form id="f"><label>Kondisi saat dikembalikan</label><select class="field" name="return_condition"><option>Baik</option><option>Perlu pemeriksaan</option><option>Rusak</option></select></form>`,
    ()=>submitForm('returnLoan',{loan_id:id,return_condition:formData().return_condition},'Pengembalian dicatat'),'Selesaikan');
}

async function vehicles(c,live){
  const r=await api('listVehicles');if(!live())return;cache.vehicles=r.data||[];
  c.innerHTML=head('Kendaraan Operasional','Data kendaraan dinas, foto, dan informasi perangkat GPS.','<button class="btn" onclick="vehicleForm()">Tambah kendaraan</button>')+
  `<div class="panel">${cache.vehicles.length?`<div class="table-wrap"><table><thead><tr><th>Foto</th><th>Kode</th><th>Kendaraan</th><th>Nomor polisi</th><th>Jenis</th><th>Penanggung jawab</th><th>GPS</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${cache.vehicles.map(v=>`<tr><td>${v.image_url?`<img class="thumb" loading="lazy" alt="${esc(v.name)}" src="${esc(imgUrl(v.image_url))}">`:'<div class="thumb-empty">Belum ada</div>'}</td><td class="code">${esc(v.vehicle_id)}</td><td><b>${esc(v.name)}</b></td><td>${esc(v.plate_number)}</td><td>${esc(v.vehicle_type)}</td><td>${esc(v.responsible_person)}</td><td>${esc(v.gps_status)}</td><td>${tag(v.status)}</td><td><button class="btn small light" onclick="vehicleForm('${esc(v.vehicle_id)}')">Edit</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Belum ada kendaraan.</div>'}</div>`;
}
function vehicleForm(id){
  const v=cache.vehicles.find(x=>String(x.vehicle_id)===String(id))||{};
  const opt=(cur,list)=>[...new Set([...list,...(cur?[cur]:[])])].map(x=>`<option ${x===cur?'selected':''}>${esc(x)}</option>`).join('');
  const keep=k=>`<input type="hidden" name="${k}" value="${esc(v[k]||'')}">`;
  modal(id?'Edit kendaraan':'Tambah kendaraan','Catat data kendaraan operasional dan foto yang tampil di katalog publik.',`<form id="f" class="form-grid">
    ${id?`<input type="hidden" name="vehicle_id" value="${esc(v.vehicle_id)}">`:''}${keep('gps_status')}${keep('stnk_expiry')}${keep('tax_due')}${keep('service_due')}
    <div class="form-field"><label>Nama kendaraan</label><input class="field" name="name" value="${esc(v.name||'')}" required></div>
    <div class="form-field"><label>Nomor polisi</label><input class="field" name="plate_number" value="${esc(v.plate_number||'')}" required></div>
    <div class="form-field"><label>Jenis kendaraan</label><select class="field" name="vehicle_type">${opt(v.vehicle_type,['Mobil Dinas','Sepeda Motor'])}</select></div>
    <div class="form-field"><label>Tahun</label><input class="field" name="year" inputmode="numeric" value="${esc(v.year||'')}"></div>
    <div class="form-field"><label>Penanggung jawab</label><input class="field" name="responsible_person" value="${esc(v.responsible_person||'')}"></div>
    <div class="form-field"><label>Status (hanya "Aktif" yang tampil di katalog)</label><select class="field" name="status">${opt(v.status||'Aktif',['Aktif','Perawatan','Nonaktif'])}</select></div>
    <div class="form-field"><label>Penyedia GPS</label><input class="field" name="gps_provider" value="${esc(v.gps_provider||'')}"></div>
    <div class="form-field"><label>ID perangkat GPS</label><input class="field" name="gps_device_id" value="${esc(v.gps_device_id||'')}"></div>
    <div class="form-field full"><label>Foto kendaraan (JPG/PNG/WEBP, otomatis diperkecil)</label><input class="field" type="file" id="vehPhoto" accept="image/png,image/jpeg,image/webp"><div id="vehPreview">${v.image_url?`<img class="photo-preview" alt="Foto saat ini" src="${esc(imgUrl(v.image_url))}">`:''}</div></div></form>`,
    async()=>{const f=$('#f');if(!f.reportValidity())return;const d=formData(),file=$('#vehPhoto').files[0];try{
      const data=file?await readImage(file):null;
      const saved=await api('saveVehicle',d);const vid=saved.data?.vehicle_id||d.vehicle_id;
      if(data){try{await api('uploadAssetImage',{kind:'vehicle',asset_id:vid,image_data:data})}catch(e){closeModal();render();return toast('Data kendaraan tersimpan, tetapi foto gagal diunggah: '+e.message,true)}}
      closeModal();toast(file?'Kendaraan dan foto tersimpan':'Kendaraan disimpan');render();
    }catch(e){if(sessionExpired(e)){closeModal();toast('Sesi berakhir. Silakan masuk kembali.',true);logout()}else toast(e.message,true)}});
  previewPhoto('#vehPhoto','#vehPreview');
}

async function users(c,live){
  const r=await api('listUsers');if(!live())return;cache.users=r.data||[];
  const on=u=>u.active===true||String(u.active).toLowerCase()==='true'||String(u.active)==='1';
  c.innerHTML=head('Manajemen Pengguna','Admin Rumah Tangga membuat akun pegawai.','<button class="btn" onclick="userForm()">Buat akun</button>')+
  `<div class="panel"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Bagian</th><th>Status</th></tr></thead><tbody>${cache.users.map(u=>`<tr><td><b>${esc(u.name)}</b></td><td class="code">${esc(u.username)}</td><td>${u.role==='admin'?'Admin':u.role==='staff'?'Staff RT':'Pegawai'}</td><td>${esc(u.department)}</td><td>${tag(on(u)?'Aktif':'Nonaktif')}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function userForm(){
  modal('Buat akun pegawai','Buat akun baru untuk pengguna portal.',`<form id="f" class="form-grid">
    <div class="form-field"><label>Nama lengkap</label><input class="field" name="name" required></div>
    <div class="form-field"><label>Username</label><input class="field" name="username" autocapitalize="none" required></div>
    <div class="form-field"><label>Password (min. 12 karakter)</label><input class="field" name="password" type="password" minlength="12" autocomplete="new-password" required></div>
    <div class="form-field"><label>Peran</label><select class="field" name="role"><option value="borrower">Pegawai / Peminjam</option><option value="admin">Admin Rumah Tangga</option><option value="staff">Staff Rumah Tangga</option></select></div>
    <div class="form-field full"><label>Bagian / Biro</label><input class="field" name="department" required></div></form>`,
    ()=>{const f=$('#f');if(!f.reportValidity())return;return submitForm('createUser',formData(),'Akun berhasil dibuat')});
}

async function activity(c,live){
  const r=await api('activity');if(!live())return;const rows=(r.data||[]).slice().reverse().slice(0,300);
  c.innerHTML=head('Riwayat Aktivitas','Jejak aktivitas akun dan transaksi (300 terbaru).')+
  `<div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Jenis</th><th>ID</th></tr></thead><tbody>${rows.map(x=>`<tr><td class="num">${esc(String(x.created_at).replace('T',' ').slice(0,19))}</td><td>${esc(x.actor_name)}</td><td>${esc(x.action)}</td><td>${esc(x.record_type)}</td><td class="code">${esc(x.record_id)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Belum ada aktivitas.</div>'}</div>`;
}

/* ---------- Mulai ---------- */
if(!API){setApp('<div class="splash"><p>URL API belum dikonfigurasi di config.js.</p></div>')}
else if(token&&me){shell()}
else login();

Object.assign(window,{api,modal,closeModal,toast,render,assetTable,loanActions:typeof loanActions==='function'?loanActions:undefined});
