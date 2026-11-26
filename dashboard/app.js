// Token Radar dashboard: renders window.RADAR, no network, no framework.
(function () {
  var R = window.RADAR;
  var $ = function (s) { return document.querySelector(s); };
  var params = new URLSearchParams(location.search);

  function usd(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n == null) return '—';
    var s = (n > 0 ? '+' : '') + n.toFixed(1) + '%';
    return '<span class="' + (n > 0 ? 'up' : n < 0 ? 'down' : '') + '">' + s + '</span>';
  }
  function age(a) { return a == null ? '—' : a >= 365 ? (a / 365).toFixed(1) + 'y' : a + 'd'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // A row is on the watchlist when its TVL is at or above the floor: the board
  // adds early rows only below the floor, so the split is exact for board rows.
  function isWatch(r) { return r.tvl_usd >= R.floor_usd; }
  function isEarly(r) { return !isWatch(r); }

  // ---- header ----
  $('#meta').textContent = 'Snapshot ' + R.as_of + ' · ' + R.board_size + ' ranked protocols · ' +
    R.watchlist_size + ' on the watchlist, ' + R.early_size + ' early finds · ' + R.live_size + ' live tokens set aside · Model ' + R.model_version;
  $('#src').textContent = 'Source: ' + R.source + '.';

  // ---- model box ----
  var m = R.model;
  var multRows = R.category_fits.map(function (c) {
    return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.scale.toFixed(2) + '</td><td class="num">' + c.samples + ' live</td></tr>';
  }).join('');
  $('#model').innerHTML =
    '<h2>How a row is valued — model ' + esc(R.model_version) + '</h2>' +
    '<p><code>implied value = exp(intercept) × TVL^' + R.slope_b.toFixed(2) + '</code></p>' +
    '<p>The market does not pay a flat price per dollar locked: across the live-token protocols in this snapshot, log market cap grows with log TVL with a pooled within-category slope of ' + R.slope_b.toFixed(2) + ' — a protocol ten times larger is worth roughly five times as much, not ten. Each category keeps its own intercept (the table below), the mean of log(mcap) − slope × log(TVL) over that category' + "'" + 's live-token protocols, after dropping outlier mcap/TVL ratios outside [' + m.ratio_filter_lo + ', ' + m.ratio_filter_hi + '] and shrinking toward the overall intercept of ' + R.overall_intercept.toFixed(2) + ' with weight ' + m.shrinkage_k + '. A category with no surviving live sample uses the overall intercept. ' +
    'The 7-day TVL change and the listing age are shown for context but no longer move the value: once size is priced correctly they add no signal on the backtest, so the model does not pretend they do. The “× multiple” column in the board below is the effective multiple at that row' + "'" + 's TVL — implied value ÷ TVL — which falls as TVL rises because the slope is below 1.</p>' +
    '<table><thead><tr><th>Category</th><th class="num">Scale exp(intercept)</th><th class="num">Samples</th></tr></thead><tbody>' + multRows + '</tbody></table>';

  // ---- filter controls ----
  var cats = [...new Set(R.rows.map(function (r) { return r.category || 'Uncategorized'; }))].sort();
  var chains = [...new Set(R.rows.flatMap(function (r) { return r.chains; }))].sort();
  $('#cat').innerHTML = '<option value="">All categories</option>' + cats.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  $('#chain').innerHTML = '<option value="">All chains</option>' + chains.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');

  var state = {
    q: params.get('q') || '',
    cat: params.get('cat') || '',
    chain: params.get('chain') || '',
    scope: params.get('scope') || 'all',
    detail: params.get('detail') || null,
  };
  $('#q').value = state.q;
  $('#cat').value = state.cat;
  $('#chain').value = state.chain;
  document.querySelectorAll('.scope button').forEach(function (b) { b.classList.toggle('on', b.dataset.scope === state.scope); });

  function filtered() {
    var q = state.q.trim().toLowerCase();
    return R.rows.filter(function (r) {
      if (state.scope === 'watchlist' && !isWatch(r)) return false;
      if (state.scope === 'early' && !isEarly(r)) return false;
      if (state.scope === 'live') return false;
      if (state.cat && (r.category || 'Uncategorized') !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (q && (r.name + ' ' + r.slug).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function render() {
    var live = state.scope === 'live';
    $('#liveSec').hidden = !live;
    $('#board').style.display = live ? 'none' : '';
    if (live) { renderLive(); $('#count').textContent = R.live.length + ' live tokens'; $('#detail').hidden = true; return; }
    var rows = filtered();
    $('#count').textContent = rows.length + ' of ' + R.board_size + ' rows';
    $('#empty').hidden = rows.length > 0;
    $('#rows').innerHTML = rows.map(function (r) {
      return '<tr data-slug="' + esc(r.slug) + '" class="' + (state.detail === r.slug ? 'sel' : '') + '">' +
        '<td>' + r.rank + '</td>' +
        '<td><b>' + esc(r.name) + '</b>' +
        (isWatch(r) ? '<span class="badge wl">watchlist</span>' : '<span class="badge early">early</span>') + '</td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(r.chains.slice(0, 2).join(', ')) + (r.chains.length > 2 ? ' +' + (r.chains.length - 2) : '') + '</td>' +
        '<td class="num">' + usd(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num"><b>' + usd(r.implied_value_usd) + '</b></td>' +
        '<td class="num">' + age(r.age_days) + '</td>' +
        '<td class="num">' + r.category_multiple.toFixed(2) + '×</td></tr>';
    }).join('');
    if (state.detail) showDetail(state.detail); else $('#detail').hidden = true;
  }

  function renderLive() {
    $('#liveRows').innerHTML = R.live.map(function (r) {
      var ratio = r.mcap_usd && r.tvl_usd ? (r.mcap_usd / r.tvl_usd).toFixed(2) + '×' : '—';
      return '<tr><td><b>' + esc(r.name) + '</b></td><td>' + esc(r.category || '—') + '</td><td>' +
        esc(r.chains.slice(0, 2).join(', ')) + '</td><td class="num">' + usd(r.tvl_usd) + '</td>' +
        '<td class="num">' + usd(r.mcap_usd) + '</td><td class="num">' + ratio + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td></tr>';
    }).join('');
  }

  function showDetail(slug) {
    var r = R.rows.find(function (x) { return x.slug === slug; });
    var d = $('#detail');
    if (!r) { d.hidden = true; return; }
    var steps = R.plans[slug] || [];
    d.innerHTML =
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="facts">' + esc(r.category || 'Uncategorized') + ' · ' + esc(r.chains.join(', ')) +
      ' · TVL ' + usd(r.tvl_usd) + ' · 7d ' + (r.change_7d == null ? '—' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(1) + '%') +
      ' · ' + age(r.age_days) + ' without a token · Implied value <b>' + usd(r.implied_value_usd) + '</b>' +
      ' = exp(' + r.intercept.toFixed(2) + ') × TVL^' + R.slope_b.toFixed(2) + ' (effective multiple ' + r.category_multiple.toFixed(3) + '× at this TVL)</p>' +
      '<ol>' + steps.map(function (s) {
        var parts = s.split(' Cost: ');
        var action = parts[0];
        var rest = parts[1] ? parts[1].split(' Time: ') : [];
        return '<li><b>' + esc(action) + '</b><span class="cost">Cost: ' + esc(rest[0] || '—') + ' · Time: ' + esc(rest[1] || '—') + '</span></li>';
      }).join('') + '</ol>';
    d.hidden = false;
  }

  $('#q').addEventListener('input', function (e) { state.q = e.target.value; render(); });
  $('#cat').addEventListener('change', function (e) { state.cat = e.target.value; render(); });
  $('#chain').addEventListener('change', function (e) { state.chain = e.target.value; render(); });
  document.querySelectorAll('.scope button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.scope = b.dataset.scope; state.detail = null;
      document.querySelectorAll('.scope button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
  });
  $('#rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    state.detail = state.detail === tr.dataset.slug ? null : tr.dataset.slug;
    render();
    if (state.detail) $('#detail').scrollIntoView({ block: 'nearest' });
  });

  render();
})();
