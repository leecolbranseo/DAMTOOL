const stage = document.getElementById('stage');

const state = {
  pillars: [],
  currentIndex: 0,
  answers: {}, // pillarId -> key ('A'|'B'|'C'|'D')
};

const BAND_ACCENT = {
  Functional: 'var(--band-functional)',
  Connected: 'var(--band-connected)',
  Integrated: 'var(--band-integrated)',
  Adaptive: 'var(--band-adaptive)',
  Intelligent: 'var(--band-intelligent)',
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
        <span class="progress-count">${stepNum} / ${total}</span>
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
    btn.innerHTML = `<span class="key">${opt.key}</span>${escapeHtml(opt.text)}`;
    btn.addEventListener('click', () => {
      state.answers[pillar.id] = opt.key;
      if (state.currentIndex < state.pillars.length - 1) {
        state.currentIndex += 1;
        renderQuestion();
      } else {
        renderTease();
      }
    });
    optionsEl.appendChild(btn);
  });
}

function renderTease() {
  stage.innerHTML = `
    <div class="card">
      <h1>Your results are ready</h1>
      <p>We've scored your answers against Fresh Egg's Data &amp; Analytics Maturity model — including where your biggest opportunity for improvement sits right now.</p>
      <p class="muted">Enter your details to see your full maturity band, your key result, and what it means for your business.</p>
      <button class="primary-btn" id="continue-btn" type="button">See my full results</button>
    </div>
  `;
  document.getElementById('continue-btn').addEventListener('click', renderEmailGate);
}

function renderEmailGate(errorMessage) {
  stage.innerHTML = `
    <div class="card">
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
        <button class="primary-btn" type="submit" id="submit-btn">Get my results</button>
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
  const accent = BAND_ACCENT[result.band] || 'var(--ink)';

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
        <p>Your answers didn't flag any single area as a blocker to your data maturity.</p>
      </div>
    `;

  stage.innerHTML = `
    <div class="card">
      <span class="band-badge" style="background:${accent}22; color:${accent === 'var(--ink)' ? 'var(--ink)' : '#1c1c1c'}">
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
