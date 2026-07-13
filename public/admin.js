(function () {
  var CORRECTIONS = '/api/admin/corrections'
  var USERS = '/api/admin/users'
  var REFERENCE = '/api/admin/reference'
  var MEMBERSHIP = '/api/admin/membership'
  var REPORTS = '/api/admin/reports'
  var view = 'queue'
  var token = sessionStorage.getItem('nutriscan_admin_token') || ''
  var me = null

  var $ = function (id) { return document.getElementById(id) }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function headers() {
    return { 'authorization': 'Bearer ' + token, 'content-type': 'application/json' }
  }
  function when(ts) { return esc((ts || '').replace('T', ' ').slice(0, 16)) }

  function setLocked(locked, err) {
    $('login-card').style.display = locked ? '' : 'none'
    $('console').style.display = locked ? 'none' : ''
    $('login-err').textContent = err || ''
    if (locked) { token = ''; me = null; sessionStorage.removeItem('nutriscan_admin_token') }
  }

  function applyRole() {
    $('who').textContent = me ? me.name + ' · ' + me.role : ''
    document.querySelectorAll('#tabs button[data-admin]').forEach(function (b) {
      b.style.display = me && me.role === 'admin' ? '' : 'none'
    })
  }

  async function api(url, opts) {
    var res = await fetch(url, Object.assign({ headers: headers() }, opts || {}))
    if (res.status === 401) { setLocked(true, 'Invalid or revoked token.'); throw new Error('unauthorized') }
    var body = await res.json().catch(function () { return {} })
    if (!res.ok) throw Object.assign(new Error(body.error || ('Error ' + res.status)), { body: body })
    return body
  }

  async function load() {
    try {
      if (view === 'users') return renderUsers(await api(USERS))
      if (view === 'ingredients') return renderIngredients(await api(REFERENCE))
      if (view === 'membership') return renderMembership(await api(MEMBERSHIP))
      if (view === 'reports') return renderReports((await api(REPORTS)).report)
      var body = await api(CORRECTIONS + '?view=' + view)
      me = body.me || me
      sessionStorage.setItem('nutriscan_admin_token', token)
      applyRole()
      renderCorrections(body.items || [])
    } catch (e) {
      if (e.message !== 'unauthorized') $('list').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'
    }
  }

  // ---------- Corrections (queue / reviewed / audit) ----------
  function renderCorrections(items) {
    if (!items.length) return void ($('list').innerHTML = '<div class="empty">Nothing in ' + esc(view) + '.</div>')
    if (view === 'audit') {
      $('list').innerHTML = '<div class="card"><table style="width:100%"><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr>' +
        items.map(function (a) {
          var target = a.target || a.correctionId || ''
          var detail = [a.barcode ? '#' + a.barcode : '', a.override ? a.override.field + ' = ' + a.override.value : '', a.note].filter(Boolean).join(' · ')
          return '<tr><td>' + when(a.ts) + '</td><td>' + esc(a.reviewer) + '</td><td>' + esc(a.action) +
            '</td><td>' + esc(target) + '</td><td>' + esc(detail) + '</td></tr>'
        }).join('') + '</table></div>'
      return
    }
    $('list').innerHTML = items.map(function (r) {
      var actions = view === 'queue'
        ? '<div class="row" style="margin-top:10px">' +
            '<button class="approve" data-act="approve" data-id="' + esc(r.id) + '">Approve</button>' +
            '<button class="danger" data-act="reject" data-id="' + esc(r.id) + '">Reject</button>' +
          '</div>' +
          '<div class="note-box" id="note-' + esc(r.id) + '">' +
            '<textarea rows="2" style="width:100%" placeholder="Review note (what did you verify?)"></textarea>' +
            '<div class="override-box" style="margin-top:8px">' +
              '<div class="meta" style="margin:0 0 4px">Optional data override (approve only). Nutrients are per 100 g in OFF units — sodium/salt in grams.</div>' +
              '<div class="row">' +
                '<select class="ov-field">' +
                  '<option value="">No data override</option>' +
                  '<option value="energy-kcal_100g">Energy (kcal/100g)</option><option value="fat_100g">Total fat (g/100g)</option>' +
                  '<option value="saturated-fat_100g">Saturated fat (g/100g)</option><option value="trans-fat_100g">Trans fat (g/100g)</option>' +
                  '<option value="carbohydrates_100g">Carbohydrates (g/100g)</option><option value="sugars_100g">Sugars (g/100g)</option>' +
                  '<option value="fiber_100g">Fibre (g/100g)</option><option value="proteins_100g">Protein (g/100g)</option>' +
                  '<option value="sodium_100g">Sodium (g/100g)</option><option value="salt_100g">Salt (g/100g)</option>' +
                  '<option value="product_name">Product name</option><option value="serving_size">Serving size</option>' +
                  '<option value="quantity">Pack quantity</option>' +
                '</select>' +
                '<input type="text" class="ov-value" placeholder="Corrected value" style="flex:1" />' +
              '</div>' +
            '</div>' +
            '<div class="row" style="margin-top:6px"><button class="primary" data-confirm="1" data-id="' + esc(r.id) + '">Confirm</button>' +
            '<button data-cancel="1" data-id="' + esc(r.id) + '">Cancel</button></div>' +
          '</div>'
        : ((r.reviewNote ? '<div class="meta">Note: ' + esc(r.reviewNote) + '</div>' : '') +
           (r.reviewedBy ? '<div class="meta">Reviewer: ' + esc(r.reviewedBy) + '</div>' : '') +
           (r.override ? '<div class="meta">Override applied: ' + esc(r.override.field) + ' = ' + esc(r.override.value) + '</div>' : ''))
      return '<div class="card">' +
        '<div class="row"><span class="badge ' + esc(r.status) + '">' + esc(r.status) + '</span>' +
        '<strong style="font-size:14px">' + esc(r.type) + '</strong>' +
        (r.barcode ? '<span class="meta" style="margin-top:0">#' + esc(r.barcode) + '</span>' : '') + '</div>' +
        (r.productName ? '<div class="meta">' + esc(r.productName) + (r.field ? ' — field: ' + esc(r.field) : '') + '</div>' : '') +
        '<div class="detail">' + esc(r.detail) + '</div>' +
        (r.sourceUrl ? '<div class="meta">Source: ' + esc(r.sourceUrl) + '</div>' : '') +
        '<div class="meta">Submitted ' + when(r.ts) + (r.reviewedAt ? ' · reviewed ' + when(r.reviewedAt) : '') + '</div>' +
        actions + '</div>'
    }).join('')
  }

  var pendingAction = null
  $('list').addEventListener('click', async function (e) {
    var b = e.target.closest('button')
    if (!b) return
    var id = b.getAttribute('data-id')

    // Corrections actions
    if (b.hasAttribute('data-act')) {
      pendingAction = b.getAttribute('data-act')
      document.querySelectorAll('.note-box.open').forEach(function (n) { n.classList.remove('open') })
      var box = $('note-' + id)
      box.classList.add('open')
      box.querySelector('.override-box').style.display = pendingAction === 'approve' ? '' : 'none'
    } else if (b.hasAttribute('data-cancel')) {
      $('note-' + id).classList.remove('open')
    } else if (b.hasAttribute('data-confirm')) {
      b.disabled = true
      var noteBox = $('note-' + id)
      var payload = { id: id, action: pendingAction, note: noteBox.querySelector('textarea').value }
      if (pendingAction === 'approve') {
        var field = noteBox.querySelector('.ov-field').value
        var value = noteBox.querySelector('.ov-value').value.trim()
        if (field && value) payload.override = { field: field, value: value }
      }
      try { await api(CORRECTIONS, { method: 'POST', body: JSON.stringify(payload) }); load() }
      catch (err) { b.disabled = false; alert('Failed: ' + err.message) }
    }

    // Users actions
    else if (b.hasAttribute('data-user-action')) {
      var action = b.getAttribute('data-user-action')
      var name = b.getAttribute('data-name')
      if (action === 'delete' && !confirm('Delete user "' + name + '"? Their token stops working immediately.')) return
      try { await api(USERS, { method: 'POST', body: JSON.stringify({ action: action, name: name }) }); load() }
      catch (err) { alert('Failed: ' + err.message) }
    } else if (b.id === 'user-create') {
      var uname = $('new-user-name').value.trim()
      var urole = $('new-user-role').value
      b.disabled = true
      try {
        var res = await api(USERS, { method: 'POST', body: JSON.stringify({ name: uname, role: urole }) })
        $('user-created').innerHTML = '<div class="ok-box">Token for <strong>' + esc(res.user.name) +
          '</strong> (shown once — share it over a secure channel):<br><code>' + esc(res.token) + '</code></div>'
        $('new-user-name').value = ''
        var listBody = await api(USERS); renderUsersTable(listBody)
      } catch (err) { $('user-created').innerHTML = '<div class="err">' + esc(err.message) + '</div>' }
      b.disabled = false
    }

    // Ingredients actions
    else if (b.hasAttribute('data-ing')) {
      openEditor(b.getAttribute('data-ing'))
    } else if (b.id === 'ing-new') {
      var newId = prompt('New ingredient id (lowercase letters, digits, underscores — e.g. stevia_extract):')
      if (newId) openEditor(newId.trim(), true)
    } else if (b.id === 'ing-publish') {
      var pid = b.getAttribute('data-id')
      var entry
      try { entry = JSON.parse($('ing-json').value) }
      catch (err) { return void ($('ing-err').textContent = 'Invalid JSON: ' + err.message) }
      b.disabled = true
      try {
        var pub = await api(REFERENCE, { method: 'POST', body: JSON.stringify({ id: pid, entry: entry }) })
        $('ing-err').textContent = ''
        $('ing-status').innerHTML = '<div class="ok-box">Published v' + pub.published.version + ' — live on /api/ingredients/' + esc(pid) + '</div>'
      } catch (err) {
        $('ing-err').textContent = err.body && err.body.errors ? err.body.errors.join('\n') : err.message
      }
      b.disabled = false
    } else if (b.id === 'ing-unpublish') {
      var uid = b.getAttribute('data-id')
      if (!confirm('Unpublish "' + uid + '"? The app falls back to the built-in entry (or none, for CMS-added ingredients).')) return
      try { await api(REFERENCE, { method: 'POST', body: JSON.stringify({ action: 'unpublish', id: uid }) }); openEditor(uid) }
      catch (err) { alert('Failed: ' + err.message) }
    } else if (b.hasAttribute('data-revert')) {
      var rid = b.getAttribute('data-id')
      try { await api(REFERENCE, { method: 'POST', body: JSON.stringify({ action: 'revert', id: rid, version: Number(b.getAttribute('data-revert')) }) }); openEditor(rid) }
      catch (err) { alert('Failed: ' + err.message) }
    } else if (b.id === 'ing-back') {
      load()
    } else if (b.id === 'mem-setlimit') {
      try {
        var mr = await api(MEMBERSHIP, { method: 'POST', body: JSON.stringify({ action: 'setLimit', limit: Number($('mem-limit').value) }) })
        $('mem-limit-msg').innerHTML = '<div class="ok-box">Free-scan limit set to ' + mr.freeScanLimit + '.</div>'
      } catch (err) { $('mem-limit-msg').innerHTML = '<div class="err">' + esc(err.message) + '</div>' }
    } else if (b.id === 'mem-lookup') {
      var luid = $('mem-uid').value.trim(); if (!luid) return
      try { var lr = await api(MEMBERSHIP, { method: 'POST', body: JSON.stringify({ action: 'lookupUser', uid: luid }) }); renderMemberUser(luid, lr.entitlement) }
      catch (err) { $('mem-user').innerHTML = '<div class="err">' + esc(err.message) + '</div>' }
    } else if (b.id === 'mem-reset') {
      var muid = b.getAttribute('data-id')
      if (!confirm('Reset free scans for this user? They get a fresh allowance.')) return
      try { var rr = await api(MEMBERSHIP, { method: 'POST', body: JSON.stringify({ action: 'resetScans', uid: muid }) }); renderMemberUser(muid, rr.entitlement) }
      catch (err) { alert('Failed: ' + err.message) }
    } else if (b.id === 'rep-csv') {
      // CSV download needs the Bearer token, so fetch as a blob rather than a link.
      b.disabled = true
      try {
        var res = await fetch(REPORTS + '?format=csv', { headers: headers() })
        if (!res.ok) throw new Error('Download failed (' + res.status + ')')
        var blob = await res.blob()
        var url = URL.createObjectURL(blob)
        var a = document.createElement('a')
        a.href = url; a.download = 'zoco-report-' + new Date().toISOString().slice(0, 10) + '.csv'
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
      } catch (err) { alert('Failed: ' + err.message) }
      b.disabled = false
    }
  })

  // ---------- Reports tab ----------
  function renderReports(r) {
    r = r || {}
    var stat = function (label, val) {
      return '<div class="card" style="flex:1;min-width:120px;text-align:center">' +
        '<div style="font-size:26px;font-weight:700;color:#111827">' + esc(val || 0) + '</div>' +
        '<div class="meta" style="margin-top:2px">' + esc(label) + '</div></div>'
    }
    var searches = (r.topSearches || [])
    var rows = searches.length
      ? searches.map(function (s, i) {
        return '<tr><td>' + (i + 1) + '</td><td><strong>' + esc(s.term) + '</strong></td><td>' + esc(s.count) + '</td></tr>'
      }).join('')
      : ''
    $('list').innerHTML =
      '<div class="row" style="gap:8px;align-items:stretch">' +
        stat('Scans', r.scans) + stat('Lookup failures', r.lookupFail) +
        stat('Conversions', r.conversions) + stat('Searches', r.searchTotal) +
      '</div>' +
      '<div class="card"><div class="row"><strong style="font-size:14px">Most searched products</strong>' +
        '<button class="small" id="rep-csv" style="margin-left:auto">⬇ Download CSV</button></div>' +
        (rows
          ? '<table style="width:100%;margin-top:8px"><tr><th>#</th><th>Search term</th><th>Count</th></tr>' + rows + '</table>'
          : '<div class="empty">No searches recorded yet.</div>') +
        '<p class="meta">Aggregate counts only — no per-user data. Numbers accrue as the app is used.</p>' +
      '</div>'
  }

  // ---------- Membership tab ----------
  function renderMembership(body) {
    $('list').innerHTML =
      '<div class="card"><strong style="font-size:14px">Free-scan limit</strong>' +
        '<p class="meta">New users get this many free scans (lifetime) before they must subscribe.</p>' +
        '<div class="row" style="margin-top:8px">' +
          '<input type="text" id="mem-limit" value="' + esc(body.freeScanLimit) + '" style="width:100px" />' +
          '<button class="primary" id="mem-setlimit">Save limit</button>' +
        '</div><div id="mem-limit-msg"></div>' +
      '</div>' +
      '<div class="card"><strong style="font-size:14px">Look up / comp a user</strong>' +
        '<p class="meta">Enter a user\'s Firebase UID (from their account) to see usage or reset their free-scan count.</p>' +
        '<div class="row" style="margin-top:8px">' +
          '<input type="text" id="mem-uid" placeholder="Firebase uid" style="flex:1" />' +
          '<button id="mem-lookup">Look up</button>' +
        '</div><div id="mem-user"></div>' +
      '</div>'
  }

  function renderMemberUser(uid, ent) {
    var status = ent.subscribed
      ? 'Member — unlimited scans'
      : 'Free tier — ' + ent.used + ' of ' + ent.limit + ' used (' + ent.remaining + ' left)'
    $('mem-user').innerHTML =
      '<div style="margin-top:12px">' +
        '<div class="meta">' + esc(uid) + '</div>' +
        '<div style="font-size:14px;margin:4px 0 8px">' + esc(status) + '</div>' +
        '<button class="small danger" id="mem-reset" data-id="' + esc(uid) + '">Reset free scans (comp)</button>' +
      '</div>'
  }

  // ---------- Users tab ----------
  function renderUsersTable(body) {
    var rows = (body.users || []).map(function (u) {
      return '<tr><td><strong>' + esc(u.name) + '</strong></td>' +
        '<td><span class="badge ' + esc(u.role) + '">' + esc(u.role) + '</span></td>' +
        '<td>' + (u.disabled ? '<span class="badge disabled">disabled</span>' : '<span class="badge approved">active</span>') + '</td>' +
        '<td>' + when(u.createdAt) + ' by ' + esc(u.createdBy) + '</td>' +
        '<td class="row">' +
          '<button class="small" data-user-action="' + (u.disabled ? 'enable' : 'disable') + '" data-name="' + esc(u.name) + '">' + (u.disabled ? 'Enable' : 'Disable') + '</button>' +
          '<button class="small danger" data-user-action="delete" data-name="' + esc(u.name) + '">Delete</button>' +
        '</td></tr>'
    }).join('')
    $('users-table').innerHTML = rows
      ? '<table style="width:100%"><tr><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr>' + rows + '</table>'
      : '<div class="empty">No console users yet — env-token admins are managed on Vercel.</div>'
  }

  function renderUsers(body) {
    $('list').innerHTML =
      '<div class="card"><strong style="font-size:14px">Add a user</strong>' +
        '<div class="row" style="margin-top:8px">' +
          '<input type="text" id="new-user-name" placeholder="name (e.g. asha)" />' +
          '<select id="new-user-role"><option value="reviewer">reviewer — corrections only</option><option value="admin">admin — everything</option></select>' +
          '<button class="primary" id="user-create">Create & get token</button>' +
        '</div><div id="user-created"></div>' +
        '<p class="meta">Tokens are stored only as SHA-256 hashes. If a token is lost, delete the user and create them again.</p>' +
      '</div>' +
      '<div class="card" id="users-table"></div>'
    renderUsersTable(body)
  }

  // ---------- Ingredients tab ----------
  function renderIngredients(body) {
    var rows = (body.entries || []).map(function (e) {
      var status = e.published
        ? '<span class="badge published">v' + e.published.version + '</span>'
        : '<span class="badge base">base</span>'
      return '<tr><td><strong>' + esc(e.canonicalName) + '</strong><div class="meta" style="margin:0">' + esc(e.id) + '</div></td>' +
        '<td>' + status + (e.inBase ? '' : ' <span class="badge base">CMS-added</span>') + '</td>' +
        '<td>' + (e.published ? when(e.published.updatedAt) + ' by ' + esc(e.published.updatedBy) : '—') + '</td>' +
        '<td><button class="small" data-ing="' + esc(e.id) + '">Edit</button></td></tr>'
    }).join('')
    $('list').innerHTML =
      '<div class="card"><div class="row"><strong style="font-size:14px">Reference database — ingredient encyclopedia</strong>' +
      '<button class="primary small" id="ing-new" style="margin-left:auto">+ New ingredient</button></div>' +
      '<p class="meta">Base entries ship with the app (version ' + esc(body.meta && body.meta.version) + '). Publishing here creates a versioned override served by the API within minutes — no app release needed. Nutrient tables and fasting profiles ship as reviewed code releases and are not editable here.</p></div>' +
      '<div class="card"><table style="width:100%"><tr><th>Ingredient</th><th>Status</th><th>Last publish</th><th></th></tr>' + rows + '</table></div>'
  }

  async function openEditor(id, isNew) {
    var detail = null
    try { detail = await api(REFERENCE + '?id=' + encodeURIComponent(id)) }
    catch (e) { if (!isNew) return void alert(e.message) }
    var current = detail && (detail.published ? detail.published.entry : detail.base)
    var template = current || {
      canonicalName: '', aliases: [], insCodes: [], function: '', plainDescription: '', riskSummary: '',
      safety: { caution: [], allergen: null, note: '' },
      regulation: { status: 'permitted', category: '', maxLevel: null, unit: null, condition: null, confidence: 'medium', source: '', effectiveDate: null },
      cultural: { veg: 'unknown', jain: 'unknown', vegan: 'unknown', upvas: 'unknown' },
      confidence: 'medium', sources: [], lastReviewed: new Date().toISOString().slice(0, 10),
    }
    var pubMeta = detail && detail.published
      ? '<span class="badge published">published v' + detail.published.version + '</span> <span class="meta">by ' + esc(detail.published.updatedBy) + ' · ' + when(detail.published.updatedAt) + '</span>'
      : '<span class="badge base">' + (detail && detail.base ? 'base entry (no CMS override)' : 'new — not in base') + '</span>'

    var historyHtml = ''
    try {
      var hist = await api(REFERENCE + '?id=' + encodeURIComponent(id) + '&history=1')
      if (hist.history && hist.history.length) {
        historyHtml = '<div class="card"><strong style="font-size:13px">Version history</strong><table style="width:100%">' +
          hist.history.map(function (h) {
            return '<tr><td>v' + h.version + (h.revertedFrom ? ' (revert of v' + h.revertedFrom + ')' : '') + '</td>' +
              '<td>' + when(h.updatedAt) + '</td><td>' + esc(h.updatedBy) + '</td>' +
              '<td><button class="small" data-revert="' + h.version + '" data-id="' + esc(id) + '">Restore</button></td></tr>'
          }).join('') + '</table></div>'
      }
    } catch { /* history is optional */ }

    $('list').innerHTML =
      '<div class="card">' +
        '<div class="row"><button class="small" id="ing-back">← Back</button>' +
        '<strong style="font-size:14px">' + esc(id) + '</strong>' + pubMeta + '</div>' +
        '<textarea class="code" id="ing-json" rows="24" style="margin-top:10px">' + esc(JSON.stringify(template, null, 2)) + '</textarea>' +
        '<div class="err" id="ing-err"></div><div id="ing-status"></div>' +
        '<div class="row" style="margin-top:10px">' +
          '<button class="primary" id="ing-publish" data-id="' + esc(id) + '">Publish new version</button>' +
          (detail && detail.published ? '<button class="danger" id="ing-unpublish" data-id="' + esc(id) + '">Unpublish</button>' : '') +
        '</div>' +
        '<p class="meta">Validation on publish: required name + at least one source, whitelisted fields only, HTML stripped. The app and the public API pick this up within ~5 minutes (edge cache).</p>' +
      '</div>' + historyHtml
  }

  // ---------- Shell ----------
  document.querySelectorAll('.tabs button[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.tabs button[data-view]').forEach(function (x) { x.classList.remove('active') })
      b.classList.add('active')
      view = b.getAttribute('data-view')
      load()
    })
  })
  $('refresh').addEventListener('click', load)
  $('logout').addEventListener('click', function () { setLocked(true) })
  $('login-btn').addEventListener('click', function () {
    token = $('token').value.trim()
    if (!token) return
    setLocked(false)
    view = 'queue'
    load()
  })
  $('token').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('login-btn').click() })

  if (token) { setLocked(false); load() }
})()
