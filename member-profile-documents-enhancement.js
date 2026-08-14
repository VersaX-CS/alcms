/**
 * MEMBER PROFILE - DOCUMENT MANAGEMENT ENHANCEMENT
 * 
 * This enhancement adds a Documents section to the member profile where staff can:
 * - Upload documents (PDFs, images, scanned reports)
 * - Add document names and summaries
 * - Track documents about or against students
 * - Preview and manage documents
 * 
 * IMPLEMENTATION GUIDE:
 * 1. Add this to your DB.users data structure (if not exists):
 *    documents: [
 *      {
 *        id: 'doc-001',
 *        name: 'Behavior Report',
 *        type: 'behavior', // behavior, academic, medical, disciplinary, other
 *        summary: 'Student was disruptive in class',
 *        dateUploaded: '2024-01-15',
 *        uploadedBy: 'admin-id',
 *        fileSize: '2.5 MB',
 *        mimeType: 'application/pdf',
 *        tags: ['warning', '2024'],
 *        base64Data: 'data:application/pdf;base64,...' // Store actual file
 *      }
 *    ]
 * 2. Replace the pageMemberProfile function with the enhanced version below
 * 3. Add the new functions (uploadMemberDocument, deleteMemberDocument, etc.)
 */

// ============================================================================
// ENHANCED pageMemberProfile() - ADD THIS TO REPLACE THE EXISTING FUNCTION
// ============================================================================

function pageMemberProfile(){
  const u = DB.users.find(x=>x.id===currentProfileMemberId);
  if(!u){
    return `<div class="empty"><div class="big">👤</div>No member selected — go to Members and click "Profile" on someone.<br><button class="btn secondary" style="margin-top:12px" onclick="route='users';render();">← Back to Members</button></div>`;
  }
  const allTxns = DB.circulation.filter(t=>t.userId===u.id).sort((a,b)=>(parseAnyDate(b.dateBorrowed)||0)-(parseAnyDate(a.dateBorrowed)||0));
  const active = allTxns.filter(t=>!t.returnDate);
  const history = allTxns.filter(t=>t.returnDate);
  const fines = DB.setup.fineEnabled ? allTxns.map(t=>({t, fine:fineForTxn(t)})).filter(x=>x.fine.amount>0) : [];
  const outstanding = fines.reduce((s,x)=>s+fineStatus(x.t).outstanding,0);
  const visits = DB.registerLog.filter(r=>r.id===u.id).sort((a,b)=>(parseAnyDate(b.date)||0)-(parseAnyDate(a.date)||0)).slice(0,15);
  const holds = DB.reservations.filter(r=>r.userId===u.id);
  const documents = u.documents || [];

  const tabs = [
    {key:'loans', label:`Loans (${active.length})`},
  ];
  if(u.category!=='STAFF') tabs.push({key:'subjects', label:'Subjects'});
  tabs.push({key:'visits', label:`Visits (${visits.length})`});
  if(DB.setup.fineEnabled && fines.length) tabs.push({key:'fines', label:`Fines (${fines.length})`});
  if(holds.length) tabs.push({key:'reservations', label:`Reservations (${holds.length})`});
  // NEW: Add Documents tab
  if(isAdmin()) tabs.push({key:'documents', label:`Documents (${documents.length})`});
  
  const activeTab = tabs.some(t=>t.key===memberProfileTab) ? memberProfileTab : 'loans';

  let tabBody = '';
  if(activeTab==='loans'){
    tabBody = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
        <h4 style="margin:0">Current (${active.length})</h4>
        ${active.length && isAdmin() ? `<button class="btn secondary small" onclick="sendBulkReminderViaWhatsApp('${esc(u.id)}')">📱 WhatsApp reminder — all borrowed</button>` : ''}
      </div>
      ${active.length? `<table class="datatable cards-on-mobile"><thead><tr><th>Title</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
        ${active.map(t=>`<tr><td data-label="Title">${esc(t.title)}</td><td data-label="Due">${fmtDate(t.dueDate)}</td><td data-label="Status"><span class="badge ${txnStatus(t)==='OVERDUE'?'red':'gold'}">${txnStatus(t)}</span></td>
          <td data-label="Actions"><button class="btn secondary small" onclick="renewLoan('${esc(t.trxId)}')">Renew</button></td></tr>`).join('')}
      </tbody></table>` : `<div class="empty" style="padding:12px"><div class="big">📗</div>No active loans</div>`}
      <h4 style="margin:16px 0 6px">History (${history.length})</h4>
      ${history.length? `<div class="table-wrap" style="max-height:240px;overflow:auto"><table class="datatable cards-on-mobile"><thead><tr><th>Title</th><th>Borrowed</th><th>Returned</th><th>Status</th></tr></thead><tbody>
        ${history.map(t=>`<tr><td data-label="Title">${esc(t.title)}</td><td data-label="Borrowed">${fmtDate(t.dateBorrowed)}</td><td data-label="Returned">${fmtDate(t.returnDate)}</td><td data-label="Status">${esc(txnStatus(t))}</td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty" style="padding:12px"><div class="big">📚</div>No past loans yet</div>`}`;
  } else if(activeTab==='subjects'){
    const subjActive = studentSubjects(u);
    const isOverridden = Array.isArray(u.subjects);
    const admin = isAdmin();
    tabBody = `
      <div class="field-hint" style="margin-bottom:10px">${esc(u.cls||'—')} ${isOverridden? '· <strong>custom selection</strong>' : '· using class default'}</div>
      <div class="subject-pill-grid" id="subjectGridProfile">
        ${DB.setup.subjects.map(s=>`<label class="subject-check"><input type="checkbox" class="subjChkProfile" value="${esc(s)}" ${subjActive.includes(s)?'checked':''} ${admin?'':'disabled'}> ${esc(s)}</label>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        ${admin && isOverridden? `<button class="btn secondary small" onclick="resetMemberSubjectsTab('${esc(u.id)}')">Reset to class default</button>`:''}
        <button class="btn secondary small" onclick="printMemberSubjectsTab('${esc(u.id)}')">🖨 Print</button>
        ${admin? `<button class="btn small" onclick="saveMemberSubjectsTab('${esc(u.id)}')">Save</button>`:''}
      </div>`;
  } else if(activeTab==='visits'){
    tabBody = visits.length? `<div class="table-wrap" style="max-height:280px;overflow:auto"><table class="datatable cards-on-mobile"><thead><tr><th>Date</th><th>Purpose</th></tr></thead><tbody>
      ${visits.map(v=>`<tr><td data-label="Date">${fmtDate(v.date)}</td><td data-label="Purpose">${esc(v.purpose||'—')}</td></tr>`).join('')}
    </tbody></table></div>` : `<div class="empty" style="padding:16px"><div class="big">🚪</div>No register visits on file</div>`;
  } else if(activeTab==='fines'){
    tabBody = `<table class="datatable cards-on-mobile"><thead><tr><th>Title</th><th>Days overdue</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
      ${fines.map(({t})=>{ const st=fineStatus(t); return `<tr><td data-label="Title">${esc(t.title)}</td><td data-label="Days overdue">${fineForTxn(t).days}</td><td data-label="Amount">${fmtCurrency(st.amount)}</td>
        <td data-label="Status"><span class="badge ${st.outstanding<=0?'green':st.paidAmount>0?'gold':'red'}">${st.label}${st.outstanding>0 && st.paidAmount>0? ' · '+fmtCurrency(st.outstanding)+' left':''}</span></td>
        <td data-label="Actions">${!st.waived? `<button class="btn secondary small" onclick="openFinePaymentModal('${esc(t.trxId)}')">${st.outstanding<=0?'View':'Record payment'}</button>`:''}</td></tr>`; }).join('')}
    </tbody></table>`;
  } else if(activeTab==='reservations'){
    tabBody = `<table class="datatable cards-on-mobile"><thead><tr><th>Title</th><th>Requested</th><th>Status</th></tr></thead><tbody>
      ${holds.map(r=>`<tr><td data-label="Title">${esc(r.title)}</td><td data-label="Requested">${fmtDate(r.dateRequested)}</td><td data-label="Status"><span class="badge ${r.status==='READY'?'green':r.status==='FULFILLED'?'grey':'gold'}">${esc(r.status)}</span></td></tr>`).join('')}
    </tbody></table>`;
  } else if(activeTab==='documents'){
    // NEW: Documents tab content
    tabBody = renderMemberDocumentsTab(u.id, documents);
  }

  return `
  <button class="btn secondary" style="margin-bottom:14px" onclick="route='users';render();">← Back to Members</button>
  <div class="card panel">
    <div class="panel-head">
      <h3>${esc(u.name)} <span class="badge ${u.status==='ACTIVE'?'green':'grey'}">${esc(u.status)}</span></h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn secondary small" onclick="openMemberCardModal('${esc(u.id)}')">🪪 ID Card</button>
        <button class="btn secondary small" onclick="printMemberFullProfile('${esc(u.id)}')">🖶 Print full profile</button>
      </div>
    </div>
    <table class="datatable">
      <tr><td style="font-weight:600;width:40%">Member ID</td><td>${esc(u.id)}</td></tr>
      <tr><td style="font-weight:600">Gender</td><td>${esc(u.gender||'—')}</td></tr>
      <tr><td style="font-weight:600">Category</td><td>${esc(u.category||'—')}</td></tr>
      <tr><td style="font-weight:600">Class / Designation</td><td>${esc(u.cls||'—')}</td></tr>
      <tr><td style="font-weight:600">${esc(memberContactRow(u).label)}</td><td>${esc(memberContactRow(u).value)}</td></tr>
      <tr><td style="font-weight:600">Currently borrowed</td><td>${u.borrowed||0} / ${u.maxAllowed||0}</td></tr>
      <tr><td style="font-weight:600">Total borrowed (all time)</td><td>${u.totalBorrowed||0}</td></tr>
      <tr><td style="font-weight:600">Strikes</td><td>${u.strike||0}</td></tr>
      <tr><td style="font-weight:600">Discipline</td><td>${esc(u.discipline||'—')}</td></tr>
      <tr><td style="font-weight:600">Eligibility</td><td>${esc(u.eligibility||'—')}</td></tr>
      <tr><td style="font-weight:600">Notes</td><td>${esc(u.notes||'—')}</td></tr>
      ${DB.setup.fineEnabled? `<tr><td style="font-weight:600">Outstanding fines</td><td style="color:${outstanding?'var(--terracotta)':'inherit'};font-weight:${outstanding?'700':'400'}">${fmtCurrency(outstanding)}</td></tr>`:''}
    </table>
  </div>
  <div class="card panel" style="margin-top:16px">
    <div class="profile-tabs">
      ${tabs.map(t=>`<button class="profile-tab-btn ${t.key===activeTab?'active':''}" onclick="setMemberProfileTab('${t.key}')">${esc(t.label)}</button>`).join('')}
    </div>
    <div class="profile-tab-body">${tabBody}</div>
  </div>`;
}


// ============================================================================
// NEW FUNCTIONS FOR DOCUMENT MANAGEMENT
// ============================================================================

function renderMemberDocumentsTab(memberId, documents) {
  if(!isAdmin()) return `<div class="empty"><div class="big">🔒</div>Only admins can manage member documents</div>`;
  
  const docTypes = ['behavior', 'academic', 'medical', 'disciplinary', 'other'];
  const docTypeLabels = {
    'behavior': '🎭 Behavior Report',
    'academic': '📚 Academic Report',
    'medical': '⚕️ Medical Report',
    'disciplinary': '⚠️ Disciplinary',
    'other': '📄 Other'
  };

  let html = `
    <div style="margin-bottom:20px">
      <button class="btn" onclick="openMemberDocumentUploadModal('${esc(memberId)}')">➕ Add Document</button>
    </div>
  `;

  if(documents.length === 0) {
    html += `<div class="empty" style="padding:20px"><div class="big">📄</div>No documents uploaded yet</div>`;
  } else {
    html += `<div class="documents-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">`;
    
    documents.forEach(doc => {
      const icon = doc.type === 'pdf' || doc.mimeType === 'application/pdf' ? '📕' : '🖼️';
      const typeLabel = docTypeLabels[doc.type] || docTypeLabels['other'];
      
      html += `
        <div class="card" style="padding:14px;display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:8px">
            <div style="flex:1">
              <div style="font-size:24px;margin-bottom:4px">${icon}</div>
              <div style="font-weight:600;font-size:14px;line-height:1.3">${esc(doc.name)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">${typeLabel}</div>
            </div>
            <div style="display:flex;gap:4px;flex-direction:column;align-items:flex-end">
              <button class="btn secondary xsmall" onclick="downloadMemberDocument('${esc(memberId)}','${esc(doc.id)}')" title="Download">⬇️</button>
              <button class="btn danger xsmall" onclick="deleteMemberDocument('${esc(memberId)}','${esc(doc.id)}')" title="Delete">🗑️</button>
            </div>
          </div>
          
          ${doc.summary ? `<div style="font-size:12px;line-height:1.4;color:var(--muted)">${esc(doc.summary)}</div>` : ''}
          
          <div style="border-top:1px solid var(--border);padding-top:8px;font-size:11px;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">
            <span>📅 ${fmtDate(doc.dateUploaded)}</span>
            <span>${doc.fileSize || '—'}</span>
          </div>
          
          ${doc.tags && doc.tags.length > 0 ? `
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              ${doc.tags.map(tag => `<span class="badge small" style="font-size:10px">${esc(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });
    
    html += `</div>`;
  }

  return html;
}

function openMemberDocumentUploadModal(memberId) {
  if(!isAdmin()) { toast('Only admins can upload documents'); return; }
  
  const u = DB.users.find(x => x.id === memberId);
  if(!u) { toast('Member not found'); return; }

  const docTypes = [
    {value:'behavior', label:'🎭 Behavior Report'},
    {value:'academic', label:'📚 Academic Report'},
    {value:'medical', label:'⚕️ Medical Report'},
    {value:'disciplinary', label:'⚠️ Disciplinary Notice'},
    {value:'other', label:'📄 Other Document'}
  ];

  const modalHtml = `
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal" style="max-width:500px">
        <div class="modal-head">
          <h3>Upload Document for ${esc(u.name)}</h3>
          <button class="close-btn" onclick="closeModal()">✕</button>
        </div>
        
        <div class="modal-body" style="gap:14px;display:flex;flex-direction:column">
          <div class="field">
            <label>Document Type</label>
            <select id="docTypeSelect" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px">
              ${docTypes.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label>Document Name *</label>
            <input id="docNameInput" type="text" placeholder="e.g., Incident Report - Jan 15" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px">
          </div>

          <div class="field">
            <label>Summary / Notes</label>
            <textarea id="docSummaryInput" placeholder="Brief description of the document..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;min-height:80px;font-family:inherit"></textarea>
          </div>

          <div class="field">
            <label>Upload File (PDF, Image, etc.) *</label>
            <input id="docFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px">
            <div style="font-size:11px;color:var(--muted);margin-top:6px">Accepted: PDF, JPG, PNG, DOC, DOCX, TXT (Max 10MB)</div>
          </div>

          <div class="field">
            <label>Tags (comma-separated)</label>
            <input id="docTagsInput" type="text" placeholder="e.g., warning, follow-up, 2024" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px">
          </div>
        </div>

        <div class="modal-foot" style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn secondary" onclick="closeModal()">Cancel</button>
          <button class="btn" onclick="saveMemberDocument('${esc(memberId)}')">Upload Document</button>
        </div>
      </div>
    </div>
  `;

  showModal(modalHtml);
}

function saveMemberDocument(memberId) {
  const name = $('#docNameInput')?.value?.trim();
  const type = $('#docTypeSelect')?.value || 'other';
  const summary = $('#docSummaryInput')?.value?.trim();
  const tagsInput = $('#docTagsInput')?.value?.trim();
  const fileInput = $('#docFileInput');

  if(!name) { toast('Please enter a document name'); return; }
  if(!fileInput || !fileInput.files || !fileInput.files.length) { toast('Please select a file'); return; }

  const file = fileInput.files[0];
  if(file.size > 10 * 1024 * 1024) { toast('File too large (max 10MB)'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const u = DB.users.find(x => x.id === memberId);
      if(!u) { toast('Member not found'); return; }

      // Initialize documents array if needed
      if(!Array.isArray(u.documents)) u.documents = [];

      // Create document object
      const doc = {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2,9),
        name: name,
        type: type,
        summary: summary || '',
        dateUploaded: new Date().toISOString().split('T')[0],
        uploadedBy: currentAccountId || 'admin',
        fileSize: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        mimeType: file.type,
        tags: tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0),
        base64Data: e.target.result // Store as base64
      };

      // Add to user's documents
      u.documents.push(doc);

      // Save to DB
      saveDB().then(() => {
        toast(`Document "${name}" uploaded successfully`);
        closeModal();
        setMemberProfileTab('documents');
        render();
      }).catch(err => {
        console.error('Failed to save document', err);
        toast('Failed to save document');
      });
    } catch(err) {
      console.error('Error saving document', err);
      toast('Error saving document');
    }
  };
  reader.onerror = () => toast('Failed to read file');
  reader.readAsDataURL(file);
}

function downloadMemberDocument(memberId, docId) {
  const u = DB.users.find(x => x.id === memberId);
  const doc = u?.documents?.find(d => d.id === docId);

  if(!doc) { toast('Document not found'); return; }

  try {
    // Create download link from base64
    const link = document.createElement('a');
    link.href = doc.base64Data;
    link.download = doc.name + (doc.mimeType === 'application/pdf' ? '.pdf' : '.' + doc.mimeType.split('/')[1]);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Downloaded: ' + doc.name);
  } catch(err) {
    console.error('Download failed', err);
    toast('Failed to download document');
  }
}

function deleteMemberDocument(memberId, docId) {
  if(!confirm('Delete this document? This cannot be undone.')) return;

  const u = DB.users.find(x => x.id === memberId);
  if(!u) { toast('Member not found'); return; }

  const idx = u.documents?.findIndex(d => d.id === docId);
  if(idx === undefined || idx < 0) { toast('Document not found'); return; }

  const docName = u.documents[idx].name;
  u.documents.splice(idx, 1);

  saveDB().then(() => {
    toast(`Deleted: ${docName}`);
    render();
  }).catch(err => {
    console.error('Failed to delete document', err);
    toast('Failed to delete document');
  });
}

// Helper: Show modal (if not already defined in your app)
function showModal(html) {
  if($('#modalContainer')) {
    $('#modalContainer').innerHTML = html;
  } else {
    const container = document.createElement('div');
    container.id = 'modalContainer';
    container.innerHTML = html;
    document.body.appendChild(container);
  }
}

// Helper: Close modal
function closeModal() {
  const modal = document.querySelector('.modal-overlay');
  if(modal) modal.remove();
}
