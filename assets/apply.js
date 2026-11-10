(() => {
  const i18n = JSON.parse(document.getElementById('care-i18n').textContent);
  const msg = i18n.messages;
  const form = document.getElementById('request-form');
  const steps = [...document.querySelectorAll('.wizard-step')];
  const dots = [...document.querySelectorAll('.stepper-step')];
  const status = document.getElementById('form-status');
  const inline = document.getElementById('inline-success');
  const wizard = document.getElementById('wizard');
  let current = 0;
  let maxReached = 0;
  let dirty = false;
  let started = false;
  let pendingHref = '';

  const FORM_ACTION = 'https://docs.google.com/forms/d/e/CARE_FORM_ID/formResponse';
  const FIELD_MAP = {
    requestId: 'entry.REPLACE_REQUEST_ID',
    locale: 'entry.REPLACE_LOCALE',
    website: 'entry.REPLACE_WEBSITE',
    fullName: 'entry.REPLACE_FULL_NAME',
    email: 'entry.REPLACE_EMAIL',
    organization: 'entry.REPLACE_ORGANIZATION',
    role: 'entry.REPLACE_ROLE',
    preferredLanguage: 'entry.REPLACE_LANGUAGE',
    audience: 'entry.REPLACE_AUDIENCE',
    services: 'entry.REPLACE_SERVICES',
    projectName: 'entry.REPLACE_PROJECT_NAME',
    projectUrl: 'entry.REPLACE_PROJECT_URL',
    summary: 'entry.REPLACE_SUMMARY',
    technologies: 'entry.REPLACE_TECHNOLOGIES',
    timeframe: 'entry.REPLACE_TIMEFRAME',
    privacyVersion: 'entry.REPLACE_PRIVACY_VERSION',
    attribution: 'entry.REPLACE_ATTRIBUTION',
  };
  const PLACEHOLDER_RE = /CARE_FORM_ID|REPLACE_/;

  const track = (name, params) => {
    if (typeof window.careAnalytics !== 'function') return;
    const allowed = [
      'locale',
      'placement',
      'audience',
      'serviceCode',
      'step',
      'errorCode',
    ];
    const safe = { locale: i18n.locale };
    allowed.forEach((key) => {
      if (params && params[key] != null) safe[key] = params[key];
    });
    window.careAnalytics(name, safe);
  };

  const format = (template, vars) => template.replace(
    /\{(\w+)\}/g,
    (_, key) => (vars && vars[key] != null ? vars[key] : ''),
  );

  const fieldError = (name, code) => {
    const limits = i18n.limits[name] || {};
    if (code === 'invalid_email') return msg.email;
    if (code === 'invalid_url') return msg.url;
    if (code === 'invalid_selection') return msg.selection;
    if (code === 'consent_required') return msg.consent;
    if (code === 'too_long') return format(msg.maxLength, limits);
    if (code === 'invalid_length') return format(msg.length, limits);
    return msg.required;
  };

  const control = (name) => (
    document.getElementById(name)
    || document.querySelector(`[data-field="${name}"]`)
  );

  const clearErrors = () => {
    document.querySelectorAll('.field-error').forEach((node) => {
      node.textContent = '';
      node.classList.remove('show');
    });
    document.querySelectorAll('[aria-invalid="true"]').forEach((node) => {
      node.setAttribute('aria-invalid', 'false');
    });
    status.textContent = '';
    status.classList.remove('show');
  };

  const showErrors = (fields) => {
    const names = Object.keys(fields);
    names.forEach((name) => {
      const node = document.getElementById(`err-${name}`);
      const input = control(name);
      if (node) {
        node.textContent = fieldError(name, fields[name]);
        node.classList.add('show');
      }
      if (input) input.setAttribute('aria-invalid', 'true');
      const group = document.querySelector(`[data-field="${name}"]`);
      if (group) group.setAttribute('aria-invalid', 'true');
    });
    if (!names.length) return;
    const order = i18n.fieldOrder;
    names.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const step = i18n.fieldStep[names[0]];
    if (step != null && step !== current) showStep(step, false);
    const input = control(names[0]);
    if (input && input.focus) input.focus();
    track('engineering_form_error', { errorCode: fields[names[0]], step: current });
  };

  const valueOf = (id) => document.getElementById(id).value;

  const selectedServices = () => [...form.querySelectorAll(
    'input[name="services"]:checked',
  )].map((input) => input.value);

  const utm = () => {
    const params = new URLSearchParams(location.search);
    const tags = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => {
      const value = params.get(key);
      if (value && Array.from(value).length <= 100) tags[key] = value;
    });
    return Object.keys(tags).length ? tags : null;
  };

  const collect = () => ({
    fullName: valueOf('fullName'),
    email: valueOf('email'),
    organization: valueOf('organization'),
    role: valueOf('role'),
    preferredLanguage: valueOf('preferredLanguage'),
    audience: valueOf('audience'),
    services: selectedServices(),
    projectName: valueOf('projectName'),
    projectUrl: valueOf('projectUrl'),
    summary: valueOf('summary'),
    technologies: valueOf('technologies'),
    timeframe: valueOf('timeframe'),
    privacyAccepted: document.getElementById('privacyAccepted').checked,
    locale: i18n.locale,
    privacyVersion: i18n.privacyVersion,
    attribution: utm(),
    website: valueOf('website'),
  });

  const blank = () => ({
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    organization: '',
    role: '',
    preferredLanguage: i18n.locale,
    audience: 'startup',
    services: ['assessment'],
    projectName: '',
    projectUrl: '',
    summary: 'A useful result needs at least thirty characters.',
    technologies: '',
    timeframe: 'soon',
    privacyAccepted: true,
    locale: i18n.locale,
    privacyVersion: i18n.privacyVersion,
  });

  const validateCurrent = () => {
    clearErrors();
    const data = collect();
    const probe = blank();
    i18n.steps[current].forEach((name) => {
      probe[name] = data[name];
    });
    const result = CareValidate.check(probe);
    if (result.ok) return true;
    const fields = {};
    i18n.steps[current].forEach((name) => {
      if (result.fields[name]) fields[name] = result.fields[name];
    });
    if (!Object.keys(fields).length) return true;
    showErrors(fields);
    return false;
  };

  const choice = (group, code) => (
    i18n.choices[group] && i18n.choices[group][code]
  ) || code;

  const addRow = (parent, key, val) => {
    const item = document.createElement('div');
    item.className = 'summary-item';
    const name = document.createElement('div');
    name.className = 'summary-key';
    name.textContent = key;
    const text = document.createElement('p');
    text.className = 'summary-val';
    text.textContent = val || msg.notProvided;
    item.append(name, text);
    parent.append(item);
  };

  const renderSummary = () => {
    const data = collect();
    const contact = document.getElementById('summary-contact');
    const project = document.getElementById('summary-project');
    contact.replaceChildren();
    project.replaceChildren();
    addRow(contact, i18n.labels.fullName, data.fullName.trim());
    addRow(contact, i18n.labels.email, data.email.trim());
    addRow(contact, i18n.labels.organization, data.organization.trim());
    addRow(contact, i18n.labels.role, data.role.trim());
    addRow(
      contact,
      i18n.labels.preferredLanguage,
      choice('language', data.preferredLanguage),
    );
    addRow(project, i18n.labels.audience, choice('audience', data.audience));
    addRow(
      project,
      i18n.labels.services,
      data.services.map((code) => choice('services', code)).join(', '),
    );
    addRow(project, i18n.labels.projectName, data.projectName.trim());
    addRow(project, i18n.labels.projectUrl, data.projectUrl.trim());
    addRow(project, i18n.labels.summary, data.summary.trim());
    addRow(project, i18n.labels.technologies, data.technologies.trim());
    addRow(project, i18n.labels.timeframe, choice('timeframe', data.timeframe));
  };

  const showStep = (step, focus) => {
    current = step;
    if (step > maxReached) maxReached = step;
    steps.forEach((node, index) => {
      node.classList.toggle('active', index === step);
    });
    dots.forEach((node, index) => {
      node.classList.toggle('active', index === step);
      const done = index <= maxReached && index !== step;
      node.classList.toggle('completed', done);
      node.classList.toggle('is-done', done);
      node.disabled = index > maxReached;
      if (index === step) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });
    const last = steps.length - 1;
    const isLast = step === last;
    document.getElementById('btn-back').style.visibility = step === 0
      ? 'hidden'
      : 'visible';
    document.getElementById('btn-next').style.display = isLast
      ? 'none'
      : 'inline-flex';
    document.getElementById('btn-send').style.display = isLast
      ? 'inline-flex'
      : 'none';
    document.getElementById('step-counter').textContent = format(msg.counter, {
      current: step + 1,
    });
    if (step === 2) renderSummary();
    if (focus) {
      const title = document.getElementById(`step-title-${step}`);
      title.focus();
      track('engineering_form_step', { step: step + 1 });
    }
  };

  const markStarted = () => {
    if (started) return;
    started = true;
    track('engineering_form_start', {});
  };

  const preselect = () => {
    const params = new URLSearchParams(location.search);
    const service = params.get('service');
    const audience = params.get('audience');
    if (CareValidate.SERVICES.includes(service) && service !== 'unsure') {
      const box = form.querySelector(`input[name="services"][value="${service}"]`);
      if (box) box.checked = true;
    }
    if (CareValidate.AUDIENCES.includes(audience)) {
      document.getElementById('audience').value = audience;
    }
  };

  const showStatus = (text) => {
    status.textContent = text;
    status.classList.add('show');
  };

  const formReady = () => (
    FORM_ACTION
    && !PLACEHOLDER_RE.test(FORM_ACTION)
    && Object.values(FIELD_MAP).every((id) => id && !PLACEHOLDER_RE.test(id))
  );

  const sheetValue = (key, data) => {
    if (key === 'services') return data.services.join(', ');
    if (key === 'attribution') {
      const tags = data.attribution;
      if (!tags) return '';
      return Object.keys(tags).map((name) => `${name}=${tags[name]}`).join(', ');
    }
    if (key === 'privacyAccepted') return data.privacyAccepted ? 'yes' : '';
    const value = data[key];
    if (value == null) return '';
    return String(value).trim();
  };

  const submitToGoogleForm = (data) => new Promise((resolve, reject) => {
    const frame = document.querySelector('iframe[name="hidden_submit_frame"]');
    if (!frame) {
      reject(new Error('missing iframe'));
      return;
    }
    const timer = window.setTimeout(() => {
      frame.removeEventListener('load', onLoad);
      reject(new Error('timeout'));
    }, 15000);
    function onLoad() {
      window.clearTimeout(timer);
      frame.removeEventListener('load', onLoad);
      resolve();
    }
    frame.addEventListener('load', onLoad);
    const post = document.createElement('form');
    post.method = 'POST';
    post.action = FORM_ACTION;
    post.target = 'hidden_submit_frame';
    const addInput = (name, value) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      post.appendChild(input);
    };
    if (data.email) addInput('emailAddress', data.email.trim());
    Object.keys(FIELD_MAP).forEach((key) => {
      const value = sheetValue(key, data);
      if (key !== 'website' && value === '') return;
      addInput(FIELD_MAP[key], value);
    });
    document.body.appendChild(post);
    post.submit();
    window.setTimeout(() => post.remove(), 3000);
  });

  const showInline = (id) => {
    wizard.hidden = true;
    document.querySelector('.stepper').hidden = true;
    inline.classList.add('active');
    document.getElementById('inline-title').textContent = msg.successTitle;
    document.getElementById('inline-text').textContent = msg.successText;
    document.getElementById('inline-ref').textContent = format(
      msg.successReference,
      { id },
    );
  };

  const resetMemory = () => {
    form.reset();
    document.getElementById('preferredLanguage').value = i18n.locale;
    dirty = false;
  };

  form.addEventListener('input', markStarted);
  form.addEventListener('change', markStarted);
  form.addEventListener('input', () => { dirty = true; });
  form.addEventListener('change', () => { dirty = true; });

  form.querySelectorAll('input[name="services"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.value === 'unsure' && input.checked) {
        form.querySelectorAll('input[name="services"]').forEach((other) => {
          if (other !== input) other.checked = false;
        });
      } else if (input.checked) {
        const unsure = form.querySelector('input[name="services"][value="unsure"]');
        if (unsure) unsure.checked = false;
      }
    });
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (current >= steps.length - 1) return;
    if (!validateCurrent()) return;
    showStep(current + 1, true);
  });

  document.getElementById('btn-back').addEventListener('click', () => {
    if (current > 0) showStep(current - 1, true);
  });

  dots.forEach((node, index) => {
    node.addEventListener('click', () => {
      if (index === current || index > maxReached) return;
      if (index > current && !validateCurrent()) return;
      showStep(index, true);
    });
  });

  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      showStep(Number(button.getAttribute('data-edit')), true);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateCurrent()) return;
    const data = collect();
    const result = CareValidate.check(data);
    if (!result.ok) {
      showErrors(result.fields || {});
      return;
    }
    if (!formReady()) {
      showStatus(msg.config);
      return;
    }
    const body = Object.assign({}, result.value, {
      website: data.website || '',
      requestId: crypto.randomUUID(),
    });
    const send = document.getElementById('btn-send');
    send.disabled = true;
    send.textContent = msg.sending;
    status.classList.remove('show');
    try {
      await submitToGoogleForm(body);
      track('engineering_request_saved', { audience: body.audience });
      resetMemory();
      try {
        sessionStorage.setItem('care-request-receipt', JSON.stringify({
          id: body.requestId,
          at: Date.now(),
        }));
        location.assign(i18n.thanksPath);
      } catch (error) {
        showInline(body.requestId);
      }
    } catch (error) {
      showStatus(msg.submit);
      send.disabled = false;
      send.textContent = msg.send;
    }
  });

  const withPreset = (href) => {
    const url = new URL(href, location.origin);
    const currentParams = new URLSearchParams(location.search);
    const service = currentParams.get('service');
    const audience = currentParams.get('audience');
    url.search = '';
    if (CareValidate.SERVICES.includes(service)) {
      url.searchParams.set('service', service);
    }
    if (CareValidate.AUDIENCES.includes(audience)) {
      url.searchParams.set('audience', audience);
    }
    return `${url.pathname}${url.search}${url.hash}`;
  };

  document.querySelectorAll('a.lang-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const next = withPreset(link.href);
      if (!dirty) {
        if (next !== `${link.pathname}${link.search}${link.hash}`) {
          event.preventDefault();
          location.assign(next);
        }
        return;
      }
      event.preventDefault();
      pendingHref = next;
      const dialog = document.getElementById('lang-dialog');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else if (window.confirm(msg.localeWarning)) location.assign(pendingHref);
    });
  });

  document.getElementById('lang-stay').addEventListener('click', () => {
    document.getElementById('lang-dialog').close();
  });
  document.getElementById('lang-change').addEventListener('click', () => {
    location.assign(pendingHref);
  });

  preselect();
  showStep(0, false);
})();
