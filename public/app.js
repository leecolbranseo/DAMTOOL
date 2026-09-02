const stage = document.getElementById('stage');

const state = {
  pillars: [],
  currentIndex: 0,
  answers: {}, // pillarId -> key ('A'|'B'|'C'|'D')
  preview: null, // set once /api/preview responds, after the last question
};

const BAND_ACCENT = {
  Fragmented: 'var(--band-fragmented)',
  Foundational: 'var(--band-foundational)',
  Operational: 'var(--band-operational)',
  Optimising: 'var(--band-optimising)',
  Strategic: 'var(--band-strategic)',
};

init();

async function init() {
  const res = await fetch('/api/questions');
  const data = await res.json();
  state.pillars = data.pillars;
  renderQuestion();
}

function renderQuestion() {
  const pillar = state.pillars[state.currentIndex];
  const total = state.pillars.length;
  const stepNum = state.currentIndex + 1;

  stage.innerHTML = `
    <div class="card">
      <div class="progress-row">
        <span class="progress-count">Step ${stepNum} of ${total}</span>
        <div class="progress-track">
          <div class="progress-fill" style="width:${(stepNum / total) * 100}%"></div>
        </div>
      </div>
      <h1>${escapeHtml(pillar.question)}</h1>
      <div class="options" id="options"></div>
    </div>
  `;

  const optionsEl = document.getElementById('options');
  pillar.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.type = 'button';
    btn.innerHTML = `<span class="key">${opt.key}</span><span class="option-text">${escapeHtml(opt.text)}</span>`;
    btn.addEventListener('click', () => selectOption(pillar.id, opt.key, btn, optionsEl));
    optionsEl.appendChild(btn);
  });
}

/**
 * Mirrors the real WPRA timing: flash the selected option to Raven via CSS
 * animation, disable the rest of the group so a second click can't land
 * mid-animation, then advance after 500ms (matching the production
 * setTimeout) — either to the next question or, on the last one, to a
 * server-scored tease screen.
 */
function selectOption(pillarId, key, selectedBtn, optionsEl) {
  const buttons = optionsEl.querySelectorAll('.option-btn');
  buttons.forEach((b) => { b.disabled = true; });
  selectedBtn.classList.add('flash-raven');

  state.answers[pillarId] = key;

  window.setTimeout(() => {
    if (state.currentIndex < state.pillars.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
    } else {
      renderTeaseLoading();
    }
  }, 500);
}

function renderTeaseLoading() {
  stage.innerHTML = `<div class="card"><p class="muted">Scoring your answers…</p></div>`;
  fetchPreview();
}

async function fetchPreview() {
  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: state.answers }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      stage.innerHTML = `<div class="card"><p class="error-text">${escapeHtml(data.message || 'Something went wrong scoring your answers.')}</p></div>`;
      return;
    }
    state.preview = data;
    renderTease();
  } catch (err) {
    stage.innerHTML = `<div class="card"><p class="error-text">Network error — please refresh and try again.</p></div>`;
  }
}

/**
 * Real teaser: a band-specific headline (always shown), a supporting line
 * that swaps to the fixed no-constraint copy when nothing cleared the
 * eligibility floor, and the actual primary constraint name (or the
 * no-constraint message) in the highlighted box — matching the real WPRA
 * tease screen rather than generic placeholder copy.
 */
function renderTease() {
  const { band, bandColor, bandBg, teaseHeadline, teaseCopy, primaryConstraintName, noConstraintMessage } = state.preview;

  const constraintBlock = primaryConstraintName
    ? `
      <p class="tease-label">Your biggest limitation appears to be:</p>
      <h3>${escapeHtml(primaryConstraintName)}</h3>
    `
    : `<h3>${escapeHtml(noConstraintMessage)}</h3>`;

  stage.innerHTML = `
    <div class="card">
      <span class="band-badge" style="background:${escapeHtml(bandBg)}; color:${escapeHtml(bandColor)};">
        <span class="band-dot" style="background:${escapeHtml(bandColor)}"></span>${escapeHtml(band)}
      </span>
      <p class="tease-prefix">The assessment indicates your organisation is at a <strong>${escapeHtml(band)}</strong> level.</p>
      <h1>${escapeHtml(teaseHeadline)}</h1>
      <p>${escapeHtml(teaseCopy)}</p>
      <div class="constraint-box">${constraintBlock}</div>
      <p class="tease-incentive">Unlock your full maturity score, a complete breakdown of every pillar, and the clearest next step for your organisation.</p>
      <button class="primary-btn" id="continue-btn" type="button">
        Continue to full diagnosis <span class="arrow">→</span>
      </button>
    </div>
  `;
  document.getElementById('continue-btn').addEventListener('click', renderEmailGate);
}

function renderEmailGate(errorMessage) {
  stage.innerHTML = `
    <div class="card card--boxed">
      <h2>Get your full results</h2>
      <p class="muted">We'll also send a copy to your inbox.</p>
      ${errorMessage ? `<p class="error-text">${escapeHtml(errorMessage)}</p>` : ''}
      <form id="gate-form">
        <div class="form-grid">
          <div class="form-row">
            <label for="firstname">First name</label>
            <input id="firstname" name="user_firstname" required />
          </div>
          <div class="form-row">
            <label for="surname">Surname</label>
            <input id="surname" name="user_surname" required />
          </div>
        </div>
        <div class="form-row">
          <label for="email">Work email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div class="form-row">
          <label for="jobtitle">Job title</label>
          <input id="jobtitle" name="user_jobtitle" required />
        </div>
        <div class="form-row">
          <label for="company">Company</label>
          <input id="company" name="company_name" required />
        </div>
        <button class="primary-btn primary-btn--block" type="submit" id="submit-btn">Get my results</button>
      </form>
    </div>
  `;

  document.getElementById('gate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Scoring your answers…';

    const form = e.target;
    const payload = {
      user_firstname: form.user_firstname.value.trim(),
      user_surname: form.user_surname.value.trim(),
      user_jobtitle: form.user_jobtitle.value.trim(),
      company_name: form.company_name.value.trim(),
      email: form.email.value.trim(),
      answers: state.answers,
    };

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        renderEmailGate(data.message || 'Something went wrong — please try again.');
        return;
      }
      renderResults(data.result);
    } catch (err) {
      renderEmailGate('Network error — please try again.');
    }
  });
}

function renderResults(result) {
  const accent = BAND_ACCENT[result.band] || 'var(--brand-raven)';

  const primaryHtml = result.primaryConstraint
    ? `
      <div class="constraint-box">
        <h3>${escapeHtml(result.primaryConstraint.name)}</h3>
        <p>${escapeHtml(result.primaryConstraint.description)}</p>
      </div>
    `
    : `
      <div class="constraint-box">
        <h3>No significant limitation found</h3>
        <p>In our experience, most reviews find additional opportunities even for strong-performing organisations.</p>
      </div>
    `;

  stage.innerHTML = `
    <div class="card card--boxed">
      <span class="band-badge" style="background:${accent}22;">
        <span class="band-dot" style="background:${accent}"></span>${escapeHtml(result.band)}
      </span>
      <h1>${escapeHtml(result.headline)}</h1>
      <p class="muted">Score: ${result.totalScore} / 28</p>

      <div>${result.whatThisMeansHtml}</div>

      <h3>Biggest opportunity</h3>
      ${primaryHtml}

      <h3>Other areas to watch</h3>
      <div class="secondary-list">${result.secondaryConstraintsHtml}</div>

      <div class="debug-note">
        Concept build — this panel is for testing only. Email delivery is
        mocked; check the server console for the logged Brevo payloads
        that would have been sent.
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
