
/* Premium extensions for Rumah Tangga Aset */
(()=>{
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const originalShell=window.shell;
const originalGo=window.go;
const originalRender=window.render;
const extraNav=()=>{const n=$('#nav'); if(!n||n.querySelector('[data-p="maintenance"]'))return;
 const b=(p,t)=>`<button class="nav-item" data-p="${p}"><span>${t}</span></button>`;
 n.insertAdjacentHTML('beforeend',b('maintenance','Pemeliharaan')+b('reports','Laporan'));
};
const addButtons=()=>{extraNav();};
const wait=()=>{addButtons();};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-p]');
 if(b&&['maintenance','reports'].includes(b.dataset.p)){e.preventDefault();e.stopImmediatePropagation();window.goPremium(b.dataset.p);}
},true);
window.goPremium=async p=>{
 window.page=p;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.p===p));
 $('#title').textContent=p==='maintenance'?'Pemeliharaan': 'Laporan';
 const c=$('#content');c.innerHTML='<div class="panel">Memuat data…</div>';
 try{
 if(p==='maintenance'){
  const r=await window.api('listMaintenance');
  c.innerHTML=`<div class="page-head"><div><h2>Riwayat Pemeliharaan</h2><p>Catat kerusakan dan perawatan aset/kendaraan.</p></div><button class="btn" id="addMaint">Catat perawatan</button></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>ID aset/kendaraan</th><th>Pelapor</th><th>Deskripsi</th><th>Biaya</th><th>Status</th></tr></thead><tbody>${(r.data||[]).map(x=>`<tr><td>${esc(String(x.report_date||'').slice(0,10))}</td><td>${esc(x.asset_or_vehicle_id)}</td><td>${esc(x.reported_by)}</td><td>${esc(x.description)}</td><td>Rp ${Number(x.cost||0).toLocaleString('id-ID')}</td><td>${esc(x.status)}</td></tr>`).join('')||'<tr><td colspan="6">Belum ada catatan.</td></tr>'}</tbody></table></div></div>`;
  $('#addMaint').onclick=()=>maintenanceForm();
 }else{
  const [a,l]=await Promise.all([window.api('listAssets'),window.api('listLoans')]);
  const overdue=(l.data||[]).filter(x=>x.status==='Dipinjam'&&x.due_date&&new Date(x.due_date)<new Date());
  c.innerHTML=`<div class="page-head"><div><h2>Laporan & Pengingat</h2><p>Ekspor data inventaris dan peminjaman untuk administrasi.</p></div><div class="actions"><button class="btn" id="csvAssets">Ekspor inventaris CSV</button><button class="btn dark" id="csvLoans">Ekspor peminjaman CSV</button><button class="btn light" id="printReport">Cetak / PDF</button></div></div>
  <div class="stats"><div class="stat"><span>Total jenis aset</span><strong>${(a.data||[]).length}</strong></div><div class="stat s3"><span>Terlambat</span><strong>${overdue.length}</strong></div><div class="stat s4"><span>Transaksi peminjaman</span><strong>${(l.data||[]).length}</strong></div></div>
  <div class="panel"><div class="panel-title"><h3>Barang terlambat dikembalikan</h3></div><div class="table-wrap"><table><thead><tr><th>No. transaksi</th><th>Peminjam</th><th>Jatuh tempo</th><th>Status</th></tr></thead><tbody>${overdue.map(x=>`<tr><td>${esc(x.loan_id)}</td><td>${esc(x.requester_name)}</td><td>${esc(String(x.due_date).slice(0,10))}</td><td><span class="badge red">Terlambat</span></td></tr>`).join('')||'<tr><td colspan="4">Tidak ada peminjaman terlambat.</td></tr>'}</tbody></table></div></div>`;
  $('#csvAssets').onclick=()=>csv('inventaris-rumah-tangga.csv',a.data||[]);
  $('#csvLoans').onclick=()=>csv('peminjaman-rumah-tangga.csv',l.data||[]);
  $('#printReport').onclick=()=>window.print();
 }
 }catch(e){c.innerHTML=`<div class="note">${esc(e.message)}</div>`;}
};
function csv(name,rows){
 if(!rows.length){alert('Tidak ada data untuk diekspor.');return}
 const keys=[...new Set(rows.flatMap(x=>Object.keys(x)))];
 const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const data=[keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');
 const blob=new Blob(['\ufeff'+data],{type:'text/csv;charset=utf-8;'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();URL.revokeObjectURL(a.href);
}
window.maintenanceForm=()=>{
 const body=`<form id="premiumForm" class="form-grid"><div class="form-field"><label>ID aset/kendaraan</label><input class="field" name="asset_or_vehicle_id" required></div><div class="form-field"><label>Biaya (Rp)</label><input class="field" type="number" min="0" name="cost" value="0"></div><div class="form-field full"><label>Deskripsi kerusakan/perawatan</label><textarea class="field" name="description" required></textarea></div><div class="form-field"><label>Status</label><select class="field" name="status"><option>Dilaporkan</option><option>Dalam Perbaikan</option><option>Selesai</option></select></div></form>`;
 window.modal('Catat pemeliharaan','Catatan akan tersimpan di Google Sheets.',body,async()=>{const f=$('#premiumForm');if(!f.reportValidity())return;const d=Object.fromEntries(new FormData(f));try{await window.api('saveMaintenance',d);window.closeModal();window.toast('Catatan tersimpan');window.goPremium('maintenance')}catch(e){window.toast(e.message,true)}});
};
// Add QR and history controls to inventory rows via observer after asset page renders.
window.assetQR=btn=>{
 const tr=btn.closest('tr'),id=tr.querySelector('.code')?.textContent||'';
 const name=tr.querySelector('td:nth-child(2)')?.textContent||'Aset';
 const url='https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='+encodeURIComponent('RUMAH TANGGA ASET|'+id);
 const w=window.open('','_blank');if(!w)return;
 w.document.write(`<title>QR ${esc(id)}</title><h2>${esc(name)}</h2><p>${esc(id)}</p><img src="${url}" alt="QR aset"><p>Rumah Tangga Aset</p><script>window.onload=()=>window.print()<\/script>`);
};
window.assetHistory=async btn=>{
 const tr=btn.closest('tr'),id=tr.querySelector('.code')?.textContent||'';
 try{const r=await window.api('assetHistory',{asset_id:id});const loans=r.data.loans||[];
 const body=`<div class="table-wrap"><table><thead><tr><th>Transaksi</th><th>Peminjam</th><th>Tanggal</th><th>Status</th></tr></thead><tbody>${loans.map(x=>`<tr><td>${esc(x.loan_id)}</td><td>${esc(x.requester_name)}</td><td>${esc(String(x.request_date||'').slice(0,10))}</td><td>${esc(x.status)}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada riwayat peminjaman.</td></tr>'}</tbody></table></div>`;
 window.modal('Riwayat aset '+id,'Riwayat peminjaman yang tercatat.',body,async()=>window.closeModal(),'Tutup');
 }catch(e){window.toast(e.message,true)}
};
// Add digital signature action to approved loan handover flow; capture signature on canvas.
window.signAndHandover=id=>{
 const body=`<div class="signature-wrap"><p>Goreskan tanda tangan petugas pada area berikut.</p><canvas id="sigCanvas" width="560" height="190" style="width:100%;height:170px;border:1px solid #ccd5e2;border-radius:12px;touch-action:none;background:#fff"></canvas><button type="button" class="btn light small" id="clearSig">Hapus tanda tangan</button><p class="sub">Tanda tangan disimpan bersama transaksi serah terima.</p></div>`;
 window.modal('Konfirmasi serah terima','Tanda tangan digital petugas.',body,async()=>{
  const canvas=$('#sigCanvas'),ctx=canvas.getContext('2d');
  if(!canvas.dataset.drawn){window.toast('Tanda tangan belum diisi.',true);return}
  try{await window.api('signHandover',{loan_id:id,signature:canvas.toDataURL('image/png')});await window.api('handoverLoan',{loan_id:id});window.closeModal();window.toast('Tanda tangan dan serah terima tersimpan');window.render()}catch(e){window.toast(e.message,true)}
 },'Simpan & serahkan');
 const cv=$('#sigCanvas'),ctx=cv.getContext('2d');ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#142b4a';let down=false;
 const pos=e=>{const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*cv.width/r.width,y:(e.clientY-r.top)*cv.height/r.height}};
 cv.onpointerdown=e=>{down=true;cv.setPointerCapture(e.pointerId);const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
 cv.onpointermove=e=>{if(!down)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();cv.dataset.drawn='1'};
 cv.onpointerup=cv.onpointercancel=()=>down=false;
 $('#clearSig').onclick=()=>{ctx.clearRect(0,0,cv.width,cv.height);delete cv.dataset.drawn};
};
setInterval(()=>{if($('#nav'))extraNav()},700);
})();
