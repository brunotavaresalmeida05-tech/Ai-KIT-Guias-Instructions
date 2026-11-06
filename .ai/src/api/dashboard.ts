export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI-KIT Dashboard</title>
  <link rel="stylesheet" href="/dashboard.css">
</head>
<body>
  <header>
    <div>
      <h1>AI-KIT Dashboard</h1>
      <p class="muted">Workflows, memory, skills and events</p>
    </div>
    <div class="status" id="status">loading</div>
  </header>

  <section class="keybar">
    <label for="apiKey">API key</label>
    <input id="apiKey" type="password" placeholder="x-api-key (empty if disabled)">
    <button id="saveKey" type="button">Save</button>
    <button id="refresh" type="button">Refresh</button>
  </section>

  <section class="cards" id="cards"></section>

  <main>
    <section class="panel">
      <h2>Run workflow</h2>
      <form id="workflowForm">
        <label>Name <input id="wfName" value="demo" required></label>
        <label>Strategy
          <select id="wfStrategy">
            <option value="sequential">sequential</option>
            <option value="parallel">parallel</option>
            <option value="hybrid">hybrid</option>
          </select>
        </label>
        <label>Task type
          <select id="wfType">
            <option value="echo">echo</option>
            <option value="delay">delay</option>
            <option value="memory.search">memory.search</option>
          </select>
        </label>
        <label>Payload (JSON)
          <textarea id="wfPayload" rows="4">{"message":"hello"}</textarea>
        </label>
        <button type="submit">Execute</button>
      </form>
      <pre id="workflowResult" class="output"></pre>
    </section>

    <section class="panel">
      <h2>Memory search</h2>
      <form id="searchForm">
        <label>Query <input id="searchQuery" placeholder="architecture decisions" required></label>
        <button type="submit">Search</button>
      </form>
      <pre id="searchResult" class="output"></pre>
    </section>

    <section class="panel">
      <h2>Ingest event</h2>
      <form id="eventForm">
        <label>Title <input id="eventTitle" value="Build failed" required></label>
        <label>Type <input id="eventType" value="ci.failure" required></label>
        <label>Description <input id="eventDescription" value="Pipeline failed on main"></label>
        <label>Priority <input id="eventPriority" type="number" min="1" max="10" value="8"></label>
        <button type="submit">Ingest</button>
      </form>
      <pre id="eventResult" class="output"></pre>
    </section>

    <section class="panel">
      <h2>Skills</h2>
      <button id="validateSkills" type="button">Validate catalog</button>
      <pre id="skillsResult" class="output"></pre>
    </section>

    <section class="panel wide">
      <h2>Recent workflows</h2>
      <pre id="workflows" class="output"></pre>
    </section>

    <section class="panel wide">
      <h2>Recent events</h2>
      <pre id="events" class="output"></pre>
    </section>
  </main>

  <script src="/dashboard.js" defer></script>
</body>
</html>`;
}

export function dashboardCss(): string {
  return `:root {
  color-scheme: dark;
  --bg: #0b1020;
  --panel: #121a31;
  --line: #243154;
  --text: #e6ecff;
  --muted: #93a1c7;
  --accent: #6ea8fe;
  --ok: #2ecc71;
  --bad: #ff6b6b;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 24px;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
  background: radial-gradient(circle at top left, #16224a, var(--bg) 45%);
  color: var(--text);
}
header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
h1 { margin: 0; font-size: 24px; }
h2 { margin: 0 0 12px; font-size: 16px; }
.muted { color: var(--muted); margin: 4px 0 0; }
.status { padding: 6px 12px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); }
.status.ok { color: var(--ok); }
.status.bad { color: var(--bad); }
.keybar, .cards, main { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.keybar { align-items: end; }
.keybar label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; }
input, select, textarea, button {
  font: inherit;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 10px;
}
button { cursor: pointer; background: #1d2b52; }
button:hover { border-color: var(--accent); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.card, .panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
}
.card .value { font-size: 26px; font-weight: 700; margin-top: 6px; }
.card .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
main { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items: start; }
.panel.wide { grid-column: 1 / -1; }
form { display: grid; gap: 10px; }
form label { display: grid; gap: 4px; color: var(--muted); font-size: 12px; }
.output {
  margin: 12px 0 0;
  padding: 12px;
  max-height: 260px;
  overflow: auto;
  background: #0a0f1e;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 12px;
  white-space: pre-wrap;
}
`;
}

export function dashboardScript(): string {
  return `(function () {
  'use strict';

  var key = sessionStorage.getItem('ai-kit-api-key') || '';
  var keyInput = document.getElementById('apiKey');
  keyInput.value = key;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({ 'content-type': 'application/json' }, options.headers || {});
    if (key) headers['x-api-key'] = key;

    var response = await fetch(path, Object.assign({}, options, { headers: headers }));

    if (response.status === 401 && !options.retried) {
      var provided = prompt('API key required');
      if (provided) {
        key = provided;
        sessionStorage.setItem('ai-kit-api-key', key);
        keyInput.value = key;
        return api(path, Object.assign({}, options, { retried: true }));
      }
    }

    var text = await response.text();
    var data;
    try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { raw: text }; }

    if (!response.ok) {
      throw new Error((data.error && data.error.message) || ('HTTP ' + response.status));
    }

    return data;
  }

  function setStatus(ok, text) {
    var status = $('status');
    status.textContent = text;
    status.className = 'status ' + (ok ? 'ok' : 'bad');
  }

  function renderCards(stats) {
    var cards = [
      ['Backend', stats.backend],
      ['Documents', stats.memory.documents],
      ['Sessions', stats.memory.sessions],
      ['Workflows', stats.workflows.total],
      ['Events', stats.events.events],
      ['Skills valid', stats.skills.valid + '/' + stats.skills.total]
    ];
    $('cards').innerHTML = cards.map(function (item) {
      return '<div class="card"><div class="label">' + escapeHtml(item[0]) +
        '</div><div class="value">' + escapeHtml(item[1]) + '</div></div>';
    }).join('');
  }

  async function refresh() {
    try {
      var stats = await api('/api/system/stats');
      renderCards(stats);
      setStatus(true, 'online - ' + stats.backend + ' / ' + stats.llmProvider);

      var workflows = await api('/api/workflows');
      $('workflows').textContent = JSON.stringify(workflows.workflows.slice(0, 10), null, 2);

      var events = await api('/api/events');
      $('events').textContent = JSON.stringify(events.events.slice(0, 10), null, 2);
    } catch (error) {
      setStatus(false, error.message);
    }
  }

  $('saveKey').addEventListener('click', function () {
    key = keyInput.value.trim();
    sessionStorage.setItem('ai-kit-api-key', key);
    refresh();
  });

  $('refresh').addEventListener('click', refresh);

  $('workflowForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    try {
      var payload = JSON.parse($('wfPayload').value || '{}');
      var result = await api('/api/workflows', {
        method: 'POST',
        body: JSON.stringify({
          name: $('wfName').value,
          strategy: $('wfStrategy').value,
          tasks: [{ name: 'task-1', type: $('wfType').value, payload: payload }]
        })
      });
      $('workflowResult').textContent = JSON.stringify(result, null, 2);
      refresh();
    } catch (error) {
      $('workflowResult').textContent = error.message;
    }
  });

  $('searchForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    try {
      var result = await api('/api/memory/search?q=' + encodeURIComponent($('searchQuery').value));
      $('searchResult').textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      $('searchResult').textContent = error.message;
    }
  });

  $('eventForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    try {
      var result = await api('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          source: 'api',
          type: $('eventType').value,
          title: $('eventTitle').value,
          description: $('eventDescription').value,
          priority: Number($('eventPriority').value)
        })
      });
      $('eventResult').textContent = JSON.stringify(result, null, 2);
      refresh();
    } catch (error) {
      $('eventResult').textContent = error.message;
    }
  });

  $('validateSkills').addEventListener('click', async function () {
    try {
      var report = await api('/api/skills/validate', { method: 'POST', body: '{}' });
      $('skillsResult').textContent = JSON.stringify(report, null, 2);
    } catch (error) {
      $('skillsResult').textContent = error.message;
    }
  });

  refresh();
})();
`;
}
