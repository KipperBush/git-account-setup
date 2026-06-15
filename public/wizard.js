const wizard = {
  state: {},
  currentStep: 1,

  init() {
    document.getElementById('btn-step1-next').addEventListener('click', () => this.show(2));
    document.getElementById('btn-step2-back').addEventListener('click', () => this.show(1));
    document.getElementById('btn-step2-next').addEventListener('click', () => this.submitPath());
    document.getElementById('btn-step3-back').addEventListener('click', () => this.show(2));
    document.getElementById('btn-step3-next').addEventListener('click', () => this.submitIdentity());
    document.getElementById('btn-step4-back').addEventListener('click', () => this.show(3));
    document.getElementById('btn-verify').addEventListener('click', () => this.verifyToken());
    document.getElementById('btn-step4-next').addEventListener('click', () => this.show(5));
    document.getElementById('btn-step5-back').addEventListener('click', () => this.show(4));
    document.getElementById('btn-apply').addEventListener('click', () => this.apply());
    document.getElementById('btn-add-another').addEventListener('click', () => this.addAnother());
    document.getElementById('btn-done').addEventListener('click', () => this.done());
    document.getElementById('btn-browse').addEventListener('click', () => this.openBrowser());
    document.getElementById('btn-browse-close').addEventListener('click', () => this.closeBrowser());
    document.getElementById('btn-browse-cancel').addEventListener('click', () => this.closeBrowser());
    document.getElementById('browse-backdrop').addEventListener('click', () => this.closeBrowser());
    document.getElementById('btn-browse-select').addEventListener('click', () => this.selectBrowsedPath());
  },

  show(step) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.progress-step').forEach(el => {
      el.classList.remove('active', 'done');
      const n = parseInt(el.dataset.step);
      if (n < step) el.classList.add('done');
      if (n === step) el.classList.add('active');
    });
    document.getElementById(`step-${step}`).classList.add('active');
    this.currentStep = step;
    if (step === 5) this.buildSummary();
    window.scrollTo(0, 0);
  },

  async submitPath() {
    const path = document.getElementById('input-path').value.trim();
    if (!path) { alert('Path is required.'); return; }
    this.state.path = path;

    const res = await fetch(`/api/config?path=${encodeURIComponent(path)}`);
    const config = await res.json();

    if (config.configured) {
      document.getElementById('input-name').value = config.name;
      document.getElementById('input-email').value = config.email;
      document.getElementById('input-username').value = config.username;
      document.getElementById('prefill-notice').style.display = 'block';
    } else {
      document.getElementById('prefill-notice').style.display = 'none';
    }
    this.show(3);
  },

  submitIdentity() {
    const name = document.getElementById('input-name').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const username = document.getElementById('input-username').value.trim();
    if (!name || !email || !username) { alert('All fields are required.'); return; }
    this.state.name = name;
    this.state.email = email;
    this.state.username = username;
    this.show(4);
  },

  async verifyToken() {
    const token = document.getElementById('input-token').value.trim();
    if (!token) { alert('Paste a token first.'); return; }

    const resultEl = document.getElementById('verify-result');
    resultEl.style.display = 'block';
    resultEl.className = 'notice notice-info';
    resultEl.textContent = 'Verifying…';

    const res = await fetch('/api/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, username: this.state.username })
    });
    const result = await res.json();

    if (!result.valid) {
      resultEl.className = 'notice notice-error';
      resultEl.textContent = '✗ Token is invalid — check that you copied it correctly.';
      return;
    }

    const orgsText = result.orgs.length ? `Orgs: ${result.orgs.join(', ')}.` : 'No org memberships visible — ensure read:org scope and SSO authorization if needed.';
    const matchText = result.match ? '' : ` (Note: token belongs to ${result.login}, not ${this.state.username}.)`;
    resultEl.className = result.match ? 'notice notice-success' : 'notice notice-warning';
    resultEl.textContent = `✓ Verified as ${result.login}.${matchText} ${orgsText}`;

    this.state.token = token;
    document.getElementById('btn-step4-next').disabled = false;
  },

  buildSummary() {
    const slug = this.state.username.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    document.getElementById('summary').innerHTML = `
      <div class="summary-table">
        <div class="summary-row"><span class="label">Path</span><code>${this.state.path}</code></div>
        <div class="summary-row"><span class="label">Identity</span><span>${this.state.name} &lt;${this.state.email}&gt;</span></div>
        <div class="summary-row"><span class="label">GitHub user</span><code>${this.state.username}</code></div>
        <div class="summary-row"><span class="label">Creates</span><div><code>~/.git-credential-${slug}</code><br><code>~/.gitconfig-${slug}</code></div></div>
        <div class="summary-row"><span class="label">gitconfig</span><code>includeIf "gitdir:${this.state.path}/"</code></div>
      </div>`;
  },

  async apply() {
    document.getElementById('apply-actions').style.display = 'none';
    const outputEl = document.getElementById('apply-output');
    outputEl.style.display = 'block';
    outputEl.textContent = '';

    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.state)
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))) {
        const { type, data } = JSON.parse(line.slice(6));
        if (type === 'step')    outputEl.textContent += `⟳ ${data}\n`;
        if (type === 'success') outputEl.textContent += `✓ ${data}\n`;
        if (type === 'error') {
          outputEl.textContent += `✗ ${data}\n`;
          document.getElementById('apply-actions').style.display = 'block';
          document.getElementById('btn-apply').textContent = 'Retry';
        }
        if (type === 'done') {
          document.getElementById('verify-cmd').textContent = data;
          document.getElementById('success-message').style.display = 'block';
        }
      }
    }
  },

  addAnother() {
    ['input-path','input-name','input-email','input-username','input-token'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('btn-step4-next').disabled = true;
    document.getElementById('verify-result').style.display = 'none';
    document.getElementById('prefill-notice').style.display = 'none';
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('apply-actions').style.display = 'block';
    document.getElementById('apply-output').style.display = 'none';
    document.getElementById('apply-output').textContent = '';
    this.state = {};
    this.show(2);
  },

  async openBrowser() {
    const current = document.getElementById('input-path').value.trim() || '~';
    await this.loadBrowseDir(current);
    document.getElementById('browse-modal').style.display = 'flex';
  },

  closeBrowser() {
    document.getElementById('browse-modal').style.display = 'none';
  },

  selectBrowsedPath() {
    document.getElementById('input-path').value = this._browsePath;
    this.closeBrowser();
  },

  async loadBrowseDir(dirPath) {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(dirPath)}`);
    const data = await res.json();
    if (data.error) return;

    this._browsePath = data.path;
    document.getElementById('browse-current-path').textContent = data.path;

    const list = document.getElementById('browse-list');
    list.innerHTML = '';

    if (data.parent) {
      const up = document.createElement('div');
      up.className = 'browse-item browse-up';
      up.innerHTML = '<span class="browse-item-icon">↑</span><span>.. (up one level)</span>';
      up.addEventListener('click', () => this.loadBrowseDir(data.parent));
      list.appendChild(up);
    }

    if (data.dirs.length === 0 && !data.parent) {
      list.innerHTML = '<div class="browse-empty">No subdirectories</div>';
      return;
    }

    for (const dir of data.dirs) {
      const item = document.createElement('div');
      item.className = 'browse-item';
      item.innerHTML = `<span class="browse-item-icon">📁</span><span>${dir}</span>`;
      item.addEventListener('click', () => this.loadBrowseDir(data.path + '/' + dir));
      list.appendChild(item);
    }
  },

  async done() {
    await fetch('/api/done', { method: 'POST' });
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;text-align:center"><div><h2 style="color:#6366f1">All done!</h2><p style="color:#64748b;margin-top:8px">You can close this window.</p></div></div>';
  }
};

wizard.init();
