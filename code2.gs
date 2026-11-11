/**
 * RUMAH TANGGA ASET — BACKEND LIVE
 * Uses the existing spreadsheet. Never clears or recreates existing records.
 * Deploy as Web App, Execute as: Me.
 */
const SPREADSHEET_ID = '1LY63jrcYjnIj1vs5_G3ObdQOWYZDN1yki-P3ZM_CG08';
const SESSION_TTL = 21600;
const SHEETS = {
 Users:['user_id','name','username','password_hash','salt','role','department','active'],
 Departments:['department_id','department_name','leader_name','active'],
 Assets:['asset_id','asset_name','category','location','holder','condition','status','quantity','acquisition_date','notes','image_url','specs'],
 Loans:['loan_id','requester_id','requester_name','department','purpose','request_date','usage_date','due_date','status','approved_by','approved_at','handover_at','returned_at','return_condition','notes','handover_signature','handover_signed_at','requester_contact'],
 LoanItems:['loan_item_id','loan_id','asset_id','asset_name','quantity'],
 Vehicles:['vehicle_id','name','plate_number','vehicle_type','year','responsible_person','gps_provider','gps_device_id','gps_status','stnk_expiry','tax_due','service_due','status','image_url'],
 Maintenance:['maintenance_id','asset_or_vehicle_id','reported_by','report_date','description','cost','status','completed_at'],
 Activity:['activity_id','actor_id','actor_name','action','record_type','record_id','created_at']
};
function doGet(e){return json_({success:true,app:'Rumah Tangga Aset API',version:3,status:'online'});}
function doPost(e){
 try{
  let p=(e&&e.parameter)||{};
  if(e&&e.postData&&e.postData.contents){try{p=JSON.parse(e.postData.contents);}catch(_){}}
  return json_(route_(p));
 }catch(err){return json_({success:false,error:String(err.message||err)});}
}
function route_(p){
 const a=String(p.action||'');
 if(a==='health')return {success:true,version:4};
 if(a==='publicCatalog')return publicCatalog_();
 if(a==='publicRequest')return publicRequest_(p);
 if(a==='trackRequest')return trackRequest_(p);
 if(a==='uploadAssetImage'){const u=session_(p.token);if(!u)throw Error('Sesi tidak valid.');admin_(u);return uploadAssetImage_(u,p);}
 if(a==='login')return login_(p);
 if(a==='logout'){if(p.token)CacheService.getScriptCache().remove('rta_'+p.token);return {success:true};}
 const u=session_(p.token);if(!u)throw Error('Sesi tidak valid. Silakan login kembali.');
 if(a==='dashboard')return dashboard_();
 if(a==='listAssets')return {success:true,data:rows_('Assets')};
 if(a==='assetHistory'){admin_(u);return assetHistory_(p);}
 if(a==='listMaintenance'){admin_(u);return {success:true,data:rows_('Maintenance')};}
 if(a==='saveMaintenance'){admin_(u);return saveMaintenance_(u,p);}
 if(a==='signHandover'){admin_(u);return signHandover_(u,p);}
 if(a==='saveAsset'){admin_(u);return saveAsset_(u,p);}
 if(a==='listLoans')return listLoans_(u);
 if(a==='requestLoan')return requestLoan_(u,p);
 if(a==='approveLoan'){staff_(u);return loanStatus_(u,p,'Disetujui');}
 if(a==='rejectLoan'){staff_(u);return loanStatus_(u,p,'Ditolak');}
 if(a==='handoverLoan'){staff_(u);return loanStatus_(u,p,'Dipinjam');}
 if(a==='returnLoan'){staff_(u);return returnLoan_(u,p);}
 if(a==='listVehicles'){admin_(u);return {success:true,data:rows_('Vehicles')};}
 if(a==='saveVehicle'){admin_(u);return saveVehicle_(u,p);}
 if(a==='listUsers'){admin_(u);return {success:true,data:rows_('Users').map(publicUser_)};}
 if(a==='createUser'){admin_(u);return createUser_(u,p);}
 if(a==='activity'){admin_(u);return {success:true,data:rows_('Activity')};}
 throw Error('Perintah tidak dikenal: '+a);
}
function setupDatabase(){
 const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
 Object.keys(SHEETS).forEach(n=>{
  let sh=ss.getSheetByName(n);if(!sh)sh=ss.insertSheet(n);
  if(sh.getLastRow()===0){sh.appendRow(SHEETS[n]);sh.setFrozenRows(1);sh.getRange(1,1,1,SHEETS[n].length).setFontWeight('bold').setBackground('#142b4a').setFontColor('#fff');}
  else{
   const h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
   const missing=SHEETS[n].filter(x=>!h.includes(x));
   if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  }
  // Nomor WhatsApp wajib berupa teks agar angka 0 di depan tidak hilang.
  if(n==='Loans'){
   const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
   const contactCol=headers.indexOf('requester_contact')+1;
   if(contactCol>0)sh.getRange(1,contactCol,Math.max(sh.getMaxRows(),1),1).setNumberFormat('@');
  }
 });
 return 'Selesai; data lama tidak dihapus.';
}
function createInitialAdmin(){
 const users=rows_('Users');if(users.some(x=>String(x.username).toLowerCase()==='admin'))throw Error('Akun admin sudah ada.');
 const pw='GantiPassword!2026',salt=Utilities.getUuid();
 append_('Users',{user_id:id_('USR'),name:'Admin Rumah Tangga',username:'admin',password_hash:hash_(pw,salt),salt:salt,role:'admin',department:'Rumah Tangga',active:true});
 Logger.log('Username admin | Password sementara: '+pw+'. Segera buat akun admin baru dengan password kuat dan nonaktifkan akun awal.');
}
function login_(p){
 const un=String(p.username||'').trim().toLowerCase(),pw=String(p.password||'');
 if(!un||!pw)throw Error('Username dan password wajib diisi.');
 const u=rows_('Users').find(x=>String(x.username).trim().toLowerCase()===un&&isTrue_(x.active));
 if(!u||hash_(pw,String(u.salt))!==String(u.password_hash).trim())throw Error('Username atau password salah.');
 const t=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
 CacheService.getScriptCache().put('rta_'+t,JSON.stringify(publicUser_(u)),SESSION_TTL);
 // Catatan aktivitas tidak boleh menggagalkan login, dan token sesi tidak boleh ditulis ke Sheet.
 try{activity_(u,'LOGIN','User',u.user_id);}catch(e){Logger.log('Gagal mencatat aktivitas login: '+e.message);}
 return {success:true,token:t,user:publicUser_(u)};
}
function session_(t){if(!t)return null;const s=CacheService.getScriptCache().get('rta_'+t);try{return s?JSON.parse(s):null;}catch(e){return null;}}
function staff_(u){if(!['admin','staff'].includes(u.role))throw Error('Akses petugas ditolak.');}
function admin_(u){if(u.role!=='admin')throw Error('Akses ditolak.');}
function publicUser_(u){return {user_id:u.user_id,name:u.name,username:u.username,role:u.role,department:u.department,active:u.active};}
function dashboard_(){const a=rows_('Assets'),l=rows_('Loans');return {success:true,summary:{totalAssets:a.reduce((n,x)=>n+(Number(x.quantity)||0),0),availableAssets:a.filter(x=>x.status==='Tersedia').reduce((n,x)=>n+(Number(x.quantity)||0),0),pendingLoans:l.filter(x=>x.status==='Menunggu Persetujuan').length,activeLoans:l.filter(x=>x.status==='Dipinjam').length,overdueLoans:l.filter(x=>x.status==='Dipinjam'&&x.due_date&&new Date(x.due_date)<new Date()).length}};}
function listLoans_(u){let l=rows_('Loans');if(!['admin','staff'].includes(u.role))l=l.filter(x=>String(x.requester_id)===String(u.user_id));const it=rows_('LoanItems');l.forEach(x=>x.items=it.filter(y=>String(y.loan_id)===String(x.loan_id)));return {success:true,data:l};}
function ensureColumns_(n){const sh=sheet_(n),h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String),miss=SHEETS[n].filter(x=>!h.includes(x));if(miss.length)sh.getRange(1,sh.getLastColumn()+1,1,miss.length).setValues([miss]);}
function saveAsset_(u,p){
 ensureColumns_('Assets');
 const id=String(p.asset_id||id_('AST'));const existing=rows_('Assets').find(x=>String(x.asset_id)===id)||{};const d={asset_id:id,asset_name:req_(p.asset_name,'Nama barang'),category:String(p.category||'Umum'),location:String(p.location||''),holder:String(p.holder||'Rumah Tangga'),condition:String(p.condition||'Baik'),status:String(p.status||'Tersedia'),quantity:Math.max(0,Number(p.quantity)||0),acquisition_date:String(p.acquisition_date||existing.acquisition_date||''),notes:String(p.notes||''),image_url:String(p.image_url||existing.image_url||''),specs:(p.specs===undefined?String(existing.specs||''):String(p.specs).slice(0,3000))};
 upsert_('Assets','asset_id',d);log_(u,'SIMPAN ASET','Asset',id);return {success:true,data:d};
}
function requestLoan_(u,p){
 const id=req_(p.asset_id,'Aset'),qty=Math.max(1,Number(p.quantity)||1),a=rows_('Assets').find(x=>String(x.asset_id)===id);
 if(!a)throw Error('Aset tidak ditemukan.');if(a.status!=='Tersedia'||Number(a.quantity)<qty)throw Error('Stok tersedia tidak mencukupi.');
 const loan=id_('PJM');append_('Loans',{loan_id:loan,requester_id:u.user_id,requester_name:u.name,department:u.department,purpose:req_(p.purpose,'Keperluan'),request_date:new Date(),usage_date:String(p.usage_date||''),due_date:String(p.due_date||''),status:'Menunggu Persetujuan',approved_by:'',approved_at:'',handover_at:'',returned_at:'',return_condition:'',notes:''});
 append_('LoanItems',{loan_item_id:id_('LIT'),loan_id:loan,asset_id:id,asset_name:a.asset_name,quantity:qty});log_(u,'AJUKAN PEMINJAMAN','Loan',loan);return {success:true,loan_id:loan,status:'Menunggu Persetujuan'};
}
function loanStatus_(u,p,status){const lock=LockService.getScriptLock();lock.waitLock(20000);try{return loanStatusCore_(u,p,status);}finally{lock.releaseLock();}}
function loanStatusCore_(u,p,status){
 const id=req_(p.loan_id,'Nomor transaksi'),l=rows_('Loans').find(x=>String(x.loan_id)===id);if(!l)throw Error('Transaksi tidak ditemukan.');
 if(status==='Disetujui'||status==='Ditolak'){if(l.status!=='Menunggu Persetujuan')throw Error('Status transaksi tidak sesuai.');}
 if(status==='Dipinjam'){if(l.status!=='Disetujui')throw Error('Pengajuan belum disetujui.');adjust_(id,-1);}
 update_('Loans','loan_id',id,{status:status,approved_by:u.name,approved_at:status==='Disetujui'?new Date():l.approved_at,handover_at:status==='Dipinjam'?new Date():l.handover_at});
 log_(u,status.toUpperCase(),'Loan',id);return {success:true,status:status};
}
function returnLoan_(u,p){const lock=LockService.getScriptLock();lock.waitLock(20000);try{return returnLoanCore_(u,p);}finally{lock.releaseLock();}}
function returnLoanCore_(u,p){const id=req_(p.loan_id,'Nomor transaksi'),l=rows_('Loans').find(x=>String(x.loan_id)===id);if(!l||l.status!=='Dipinjam')throw Error('Transaksi bukan sedang dipinjam.');adjust_(id,1);update_('Loans','loan_id',id,{status:'Dikembalikan',returned_at:new Date(),return_condition:String(p.return_condition||'Baik')});log_(u,'PENGEMBALIAN','Loan',id);return {success:true};}
function adjust_(loan,delta){rows_('LoanItems').filter(x=>String(x.loan_id)===String(loan)).forEach(i=>{
 if(String(i.asset_id).indexOf('VEH:')===0){const vid=String(i.asset_id).slice(4),v=rows_('Vehicles').find(x=>String(x.vehicle_id)===vid);if(!v)throw Error('Kendaraan tidak ditemukan.');update_('Vehicles','vehicle_id',vid,{status:delta<0?'Dipinjam':'Aktif'});return;}
 const a=rows_('Assets').find(x=>String(x.asset_id)===String(i.asset_id));if(!a)throw Error('Aset tidak ditemukan.');const q=Number(a.quantity||0)+delta*Number(i.quantity||0);if(q<0)throw Error('Stok tidak cukup.');update_('Assets','asset_id',a.asset_id,{quantity:q,status:q?'Tersedia':'Dipinjam'});
 });}
function saveVehicle_(u,p){const id=String(p.vehicle_id||id_('KND')),existing=rows_('Vehicles').find(x=>String(x.vehicle_id)===id)||{},d={vehicle_id:id,name:req_(p.name,'Nama kendaraan'),plate_number:String(p.plate_number||''),vehicle_type:String(p.vehicle_type||''),year:String(p.year||''),responsible_person:String(p.responsible_person||''),gps_provider:String(p.gps_provider||''),gps_device_id:String(p.gps_device_id||''),gps_status:String(p.gps_status||'Belum terhubung'),stnk_expiry:String(p.stnk_expiry||''),tax_due:String(p.tax_due||''),service_due:String(p.service_due||''),status:String(p.status||'Aktif'),image_url:String(p.image_url||existing.image_url||'')};upsert_('Vehicles','vehicle_id',d);log_(u,'SIMPAN KENDARAAN','Vehicle',id);return {success:true,data:d};}
function createUser_(u,p){const un=req_(p.username,'Username').toLowerCase();if(rows_('Users').some(x=>String(x.username).toLowerCase()===un))throw Error('Username sudah dipakai.');const pw=req_(p.password,'Password');if(pw.length<12)throw Error('Password minimal 12 karakter.');const salt=Utilities.getUuid(),d={user_id:id_('USR'),name:req_(p.name,'Nama'),username:un,password_hash:hash_(pw,salt),salt:salt,role:['admin','staff'].includes(p.role)?p.role:'borrower',department:String(p.department||''),active:true};append_('Users',d);log_(u,'BUAT AKUN','User',d.user_id);return {success:true,user:publicUser_(d)};}
function saveMaintenance_(u,p){const id=String(p.maintenance_id||id_('MNT')),d={maintenance_id:id,asset_or_vehicle_id:req_(p.asset_or_vehicle_id,'ID aset/kendaraan'),reported_by:u.name,report_date:new Date(),description:req_(p.description,'Deskripsi'),cost:Number(p.cost)||0,status:String(p.status||'Dilaporkan'),completed_at:''};append_('Maintenance',d);log_(u,'CATAT PEMELIHARAAN','Maintenance',id);return {success:true,data:d};}

function assetHistory_(p){
 const id=req_(p.asset_id,'Kode aset');
 const logs=rows_('Activity').filter(x=>String(x.record_id)===id);
 const loans=rows_('Loans').filter(l=>rows_('LoanItems').some(i=>String(i.loan_id)===String(l.loan_id)&&String(i.asset_id)===id));
 return {success:true,data:{activity:logs,loans:loans}};
}
function signHandover_(u,p){
 const id=req_(p.loan_id,'Nomor transaksi'),sig=req_(p.signature,'Tanda tangan');
 if(!/^data:image\/png;base64,/.test(sig)||sig.length>90000)throw Error('Data tanda tangan tidak valid atau terlalu besar.');
 const l=rows_('Loans').find(x=>String(x.loan_id)===id);
 if(!l||l.status!=='Disetujui')throw Error('Transaksi tidak dalam status Disetujui.');
 update_('Loans','loan_id',id,{handover_signature:sig,handover_signed_at:new Date(),notes:String(p.notes||l.notes||'')});
 log_(u,'TANDA TANGAN SERAH TERIMA','Loan',id);
 return {success:true};
}

function rows_(n){const s=sheet_(n),v=s.getDataRange().getValues();if(v.length<2)return [];const h=v[0].map(String);return v.slice(1).filter(r=>r.some(x=>x!==''&&x!==null)).map(r=>{let o={};h.forEach((k,i)=>o[k]=r[i]);return o;});}
function sheet_(n){const s=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(n);if(!s)throw Error('Sheet '+n+' belum ada. Jalankan setupDatabase().');return s;}
function append_(n,o){
 const s=sheet_(n),h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
 // Paksa kolom requester_contact menjadi Plain text sebelum menulis baris baru.
 if(n==='Loans'){
  const ci=h.indexOf('requester_contact');
  if(ci>=0)s.getRange(1,ci+1,Math.max(s.getMaxRows(),1),1).setNumberFormat('@');
 }
 const row=h.map(k=>o[k]===undefined?'':o[k]);
 s.appendRow(row);
}
function upsert_(n,k,o){const a=rows_(n);if(a.some(x=>String(x[k])===String(o[k])))update_(n,k,o[k],o);else append_(n,o);}
function update_(n,k,id,c){const s=sheet_(n),v=s.getDataRange().getValues(),h=v[0].map(String),ki=h.indexOf(k);for(let r=1;r<v.length;r++)if(String(v[r][ki])===String(id)){Object.keys(c).forEach(x=>{let ci=h.indexOf(x);if(ci>=0)s.getRange(r+1,ci+1).setValue(c[x]);});return;}throw Error('Data tidak ditemukan: '+id);}
function log_(u,a,t,id){append_('Activity',{activity_id:id_('ACT'),actor_id:u.user_id,actor_name:u.name,action:a,record_type:t,record_id:id,created_at:new Date()});}
// Alias untuk kompatibilitas pemanggilan activity_() pada proses login.
function activity_(u,action,type,id){ log_(u,action,type,id); }
function hash_(p,s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s)+String(p),Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function id_(p){return p+'-'+Utilities.getUuid().slice(0,8).toUpperCase();}
function req_(v,n){const s=String(v||'').trim();if(!s)throw Error(n+' wajib diisi.');return s;}
function isTrue_(v){return v===true||['true','1','ya','yes','aktif'].includes(String(v).trim().toLowerCase());}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}

/**
 * DIAGNOSA LOGIN — jalankan dari editor Apps Script (pilih fungsi ini > Run), lalu buka View > Logs.
 * Mengubah USERNAME_DIAGNOSA di bawah sesuai akun yang gagal login. Tidak menampilkan hash/password.
 */
function diagnoseLogin(){
 const USERNAME_DIAGNOSA='admin';
 const out=[];
 const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
 Object.keys(SHEETS).forEach(n=>{const sh=ss.getSheetByName(n);out.push((sh?'OK   ':'HILANG ')+'sheet '+n+(sh?' ('+Math.max(0,sh.getLastRow()-1)+' baris)':''));});
 const sh=ss.getSheetByName('Users');
 if(sh&&sh.getLastColumn()>0){
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
  SHEETS.Users.forEach(c=>{if(!h.includes(c))out.push('HILANG kolom Users.'+c);});
 }
 const rows=rows_('Users'),u=rows.find(x=>String(x.username).trim().toLowerCase()===USERNAME_DIAGNOSA);
 if(!u){out.push('TIDAK ADA user dengan username "'+USERNAME_DIAGNOSA+'". Jalankan createInitialAdmin().');}
 else{
  out.push('User ditemukan. active='+JSON.stringify(u.active)+' -> dianggap '+(isTrue_(u.active)?'AKTIF':'NONAKTIF (login ditolak)'));
  out.push('Panjang salt='+String(u.salt||'').length+', panjang password_hash='+String(u.password_hash||'').length+' (hash SHA-256 normal = 64)');
  if(!u.salt)out.push('MASALAH: salt kosong.');
  if(String(u.password_hash||'').trim().length!==64)out.push('MASALAH: password_hash bukan 64 karakter hex — kemungkinan dibuat skrip lama atau diketik manual. Pakai resetAdminPassword().');
 }
 try{CacheService.getScriptCache().put('rta_diag','1',30);out.push('OK   CacheService dapat menulis');}catch(e){out.push('GAGAL CacheService: '+e.message);}
 try{const a=ss.getSheetByName('Activity');out.push(a&&a.getLastColumn()>0?'OK   sheet Activity punya header':'MASALAH: sheet Activity kosong/tanpa header. Jalankan setupDatabase().');}catch(e){out.push('GAGAL Activity: '+e.message);}
 Logger.log(out.join('\n'));
 return out.join('\n');
}

/**
 * RESET PASSWORD ADMIN — isi PASSWORD_BARU (min. 12 karakter), jalankan sekali, lalu KOSONGKAN lagi nilainya
 * sebelum menyimpan skrip. Memakai skema hash yang sama dengan login_().
 */
function resetAdminPassword(){
 const USERNAME='admin',PASSWORD_BARU='';
 if(PASSWORD_BARU.length<12)throw Error('Isi PASSWORD_BARU dulu (min. 12 karakter) di dalam fungsi ini.');
 const u=rows_('Users').find(x=>String(x.username).trim().toLowerCase()===USERNAME);
 if(!u)throw Error('User "'+USERNAME+'" tidak ada. Jalankan createInitialAdmin().');
 const salt=Utilities.getUuid();
 update_('Users','user_id',u.user_id,{password_hash:hash_(PASSWORD_BARU,salt),salt:salt,active:true});
 Logger.log('Password '+USERNAME+' diganti. Kosongkan lagi PASSWORD_BARU di skrip.');
}

function publicCatalog_(){
 const a=rows_('Assets').filter(x=>String(x.status||'').toLowerCase()!=='dihapus').map(x=>({kind:'asset',asset_id:String(x.asset_id||''),asset_name:String(x.asset_name||''),category:String(x.category||'Umum'),condition:String(x.condition||''),quantity:Math.max(0,Number(x.quantity)||0),image_url:String(x.image_url||''),specs:String(x.specs||''),available:String(x.status||'').toLowerCase()==='tersedia'&&Number(x.quantity)>0}));
 const v=rows_('Vehicles').filter(x=>['aktif','tersedia'].includes(String(x.status||'').toLowerCase())).map(x=>({kind:'vehicle',asset_id:String(x.vehicle_id||''),asset_name:String(x.name||''),category:String(x.vehicle_type||'Kendaraan'),condition:String(x.status||'Aktif'),quantity:1,image_url:String(x.image_url||''),plate_number:String(x.plate_number||''),available:true}));
 return {success:true,data:a.concat(v)};
}
function normalizePhone_(value){
 let digits=String(value||'').replace(/\D/g,'');
 // Samakan format nomor Indonesia: 62xxxx dan 8xxxx menjadi 08xxxx.
 if(digits.indexOf('62')===0)digits='0'+digits.slice(2);
 else if(digits.indexOf('0')!==0&&digits.indexOf('8')===0)digits='0'+digits;
 if(digits.length<9||digits.length>15)throw Error('Nomor WhatsApp tidak valid. Gunakan nomor aktif, misalnya 08xxxxxxxxxx.');
 return digits;
}
function publicRequest_(p){
 if(String(p.website||'').trim())return {success:true,message:'Pengajuan diterima.'};
 const name=req_(p.name,'Nama lengkap').slice(0,100),dept=req_(p.department,'Bagian/instansi').slice(0,120);
 const contact=normalizePhone_(req_(p.contact,'Nomor WhatsApp')),purpose=req_(p.purpose,'Keperluan').slice(0,500);
 const id=req_(p.asset_id,'Kode aset'),kind=String(p.kind||'asset'),qty=kind==='vehicle'?1:Number(p.quantity);
 if(!Number.isInteger(qty)||qty<1||qty>1000)throw Error('Jumlah barang tidak valid.');
 if(!/^[0-9+().\s-]{8,22}$/.test(contact))throw Error('Nomor kontak tidak valid.');
 const usage=req_(p.usage_date,'Tanggal penggunaan'),due=req_(p.due_date,'Tanggal kembali');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(usage)||!/^\d{4}-\d{2}-\d{2}$/.test(due)||due<usage)throw Error('Tanggal peminjaman tidak valid.');
 if(new Date(usage+'T00:00:00Z')<new Date(Date.now()-86400000))throw Error('Tanggal penggunaan sudah lewat.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const cache=CacheService.getScriptCache(),key='public_req_'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,contact.replace(/\D/g,''))).slice(0,32);
  if(cache.get(key))throw Error('Mohon tunggu tiga menit sebelum mengajukan lagi.');
  let item;
  if(kind==='vehicle'){
   const v=rows_('Vehicles').find(x=>String(x.vehicle_id)===id&&['aktif','tersedia'].includes(String(x.status||'').toLowerCase()));
   if(!v)throw Error('Kendaraan tidak tersedia.');
   const conflict=rows_('Loans').some(l=>['Menunggu Persetujuan','Disetujui','Dipinjam'].includes(String(l.status))&&isoDate_(l.usage_date)<=due&&isoDate_(l.due_date)>=usage&&rows_('LoanItems').some(i=>String(i.loan_id)===String(l.loan_id)&&String(i.asset_id)==='VEH:'+id));
   if(conflict)throw Error('Kendaraan sudah memiliki pengajuan atau jadwal yang bertabrakan pada tanggal tersebut.');
   item={asset_id:'VEH:'+id,asset_name:v.name+' ('+v.plate_number+')',quantity:1};
  }else{
   const a=rows_('Assets').find(x=>String(x.asset_id)===id);
   if(!a||String(a.status)!=='Tersedia'||Number(a.quantity)<qty)throw Error('Barang tidak tersedia dalam jumlah yang diminta.');
   item={asset_id:id,asset_name:a.asset_name,quantity:qty};
  }
  const loan=id_('PJM');
  append_('Loans',{loan_id:loan,requester_id:'PUBLIC',requester_name:name,department:dept,purpose:purpose,request_date:new Date(),usage_date:usage,due_date:due,status:'Menunggu Persetujuan',notes:'Pengajuan publik',requester_contact:contact});
  append_('LoanItems',{loan_item_id:id_('LIT'),loan_id:loan,asset_id:item.asset_id,asset_name:item.asset_name,quantity:item.quantity});
  log_({user_id:'PUBLIC',name:'Pengunjung'},'AJUKAN PEMINJAMAN PUBLIK','Loan',loan);cache.put(key,'1',180);
  return {success:true,loan_id:loan,status:'Menunggu Persetujuan'};
 }finally{lock.releaseLock();}
}
function phoneKey_(v){let d=String(v||'').replace(/\D/g,'');if(d.indexOf('62')===0)d='0'+d.slice(2);else if(d.charAt(0)==='8')d='0'+d;return d;}
function isoDate_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');const x=String(v||'');return /^\d{4}-\d{2}-\d{2}/.test(x)?x.slice(0,10):x;}
function trackRequest_(p){
 const id=req_(p.loan_id,'Nomor resi'),phone=phoneKey_(req_(p.contact,'Nomor WhatsApp'));
 const l=rows_('Loans').find(x=>String(x.loan_id)===id&&String(x.requester_id)==='PUBLIC');
 if(!l||phoneKey_(l.requester_contact)!==phone)throw Error('Nomor resi atau nomor WhatsApp tidak cocok.');
 const items=rows_('LoanItems').filter(x=>String(x.loan_id)===id).map(x=>({name:x.asset_name,quantity:x.quantity}));
 return {success:true,data:{loan_id:l.loan_id,status:l.status,requester_name:l.requester_name,department:l.department,usage_date:isoDate_(l.usage_date),due_date:isoDate_(l.due_date),approved_by:l.approved_by||'',items:items,return_condition:l.return_condition||''}};
}
function uploadAssetImage_(u,p){
 const kind=String(p.kind||'asset'),id=req_(p.asset_id,'Kode aset'),data=req_(p.image_data,'File gambar');
 if(!/^data:image\/(png|jpeg|webp);base64,/.test(data)||data.length>5500000)throw Error('Gambar harus PNG/JPG/WEBP dan maksimal sekitar 4 MB.');
 const m=data.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/),bytes=Utilities.base64Decode(m[2]),blob=Utilities.newBlob(bytes,m[1],'aset-'+id);
 const folderName='Rumah Tangga Aset - Foto Inventaris',folders=DriveApp.getFoldersByName(folderName),folder=folders.hasNext()?folders.next():DriveApp.createFolder(folderName);
 const file=folder.createFile(blob);file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
 const url='https://drive.google.com/uc?export=view&id='+file.getId();
 if(kind==='vehicle')update_('Vehicles','vehicle_id',id,{image_url:url});else update_('Assets','asset_id',id,{image_url:url});log_(u,'UNGGAH FOTO '+(kind==='vehicle'?'KENDARAAN':'ASET'),kind==='vehicle'?'Vehicle':'Asset',id);
 return {success:true,image_url:url};
}
