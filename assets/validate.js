'use strict';

const CareValidate = (() => {
  const SERVICES = [
    'assessment',
    'recovery',
    'support',
    'ai_workflow',
    'business_process',
    'handover',
    'unsure',
  ];
  const AUDIENCES = [
    'startup',
    'investor',
    'enterprise',
    'business',
    'other',
  ];
  const TIMEFRAMES = ['soon', 'month', 'quarter', 'exploring'];
  const LANGS = ['en', 'uk', 'ru'];
  const UTM = ['utm_source', 'utm_medium', 'utm_campaign'];
  const ALLOWED = [
    'fullName',
    'email',
    'organization',
    'role',
    'preferredLanguage',
    'audience',
    'services',
    'projectName',
    'projectUrl',
    'summary',
    'technologies',
    'timeframe',
    'privacyAccepted',
    'locale',
    'privacyVersion',
    'attribution',
    'website',
  ];

  const codePoints = (value) => Array.from(value).length;

  const isEmail = (value) => {
    if (codePoints(value) > 254) return false;
    if (/\s/.test(value)) return false;
    const parts = value.split('@');
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (!local || !domain || !domain.includes('.')) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    return true;
  };

  const isUrl = (value) => {
    if (codePoints(value) > 2048) return false;
    let url;
    try {
      url = new URL(value);
    } catch (error) {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    if (url.username || url.password) return false;
    return true;
  };

  const fail = (fields) => ({
    ok: false,
    error: 'validation_failed',
    fields,
  });

  const checkText = (value, spec, fields, key) => {
    if (value == null) value = '';
    if (typeof value !== 'string') {
      fields[key] = 'invalid_value';
      return '';
    }
    const trimmed = value.trim();
    const size = codePoints(trimmed);
    if (!trimmed) {
      if (spec.required) fields[key] = 'required';
      return '';
    }
    if (spec.min && size < spec.min) fields[key] = 'invalid_length';
    else if (size > spec.max) fields[key] = 'too_long';
    return trimmed;
  };

  const check = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { ok: false, error: 'invalid_request' };
    }
    const fields = {};
    Object.keys(input).forEach((key) => {
      if (!ALLOWED.includes(key)) fields[key] = 'unknown_field';
    });
    if (Object.keys(fields).length) return fail(fields);

    const value = {};
    value.fullName = checkText(input.fullName, {
      required: true,
      min: 2,
      max: 120,
    }, fields, 'fullName');
    if (typeof input.email !== 'string' || !input.email.trim()) {
      fields.email = 'required';
      value.email = '';
    } else if (!isEmail(input.email.trim())) {
      fields.email = codePoints(input.email.trim()) > 254
        ? 'too_long'
        : 'invalid_email';
      value.email = input.email.trim();
    } else {
      value.email = input.email.trim();
    }
    value.organization = checkText(
      input.organization || '',
      { max: 160 },
      fields,
      'organization',
    );
    value.role = checkText(
      input.role || '',
      { max: 120 },
      fields,
      'role',
    );
    value.preferredLanguage = input.preferredLanguage;
    if (!LANGS.includes(value.preferredLanguage)) {
      fields.preferredLanguage = input.preferredLanguage
        ? 'invalid_value'
        : 'required';
    }
    value.audience = input.audience;
    if (!AUDIENCES.includes(value.audience)) {
      fields.audience = input.audience ? 'invalid_value' : 'required';
    }
    value.services = [];
    if (!Array.isArray(input.services) || !input.services.length) {
      fields.services = 'invalid_selection';
    } else {
      const unique = [];
      input.services.forEach((code) => {
        if (!SERVICES.includes(code) || unique.includes(code)) {
          fields.services = 'invalid_selection';
        } else unique.push(code);
      });
      if (unique.includes('unsure') && unique.length > 1) {
        fields.services = 'invalid_selection';
      }
      if (unique.length > 6) fields.services = 'invalid_selection';
      value.services = unique;
    }
    value.projectName = checkText(
      input.projectName || '',
      { max: 160 },
      fields,
      'projectName',
    );
    if (input.projectUrl == null || input.projectUrl === '') {
      value.projectUrl = '';
    } else if (
      typeof input.projectUrl !== 'string'
      || !isUrl(input.projectUrl.trim())
    ) {
      fields.projectUrl = 'invalid_url';
      value.projectUrl = typeof input.projectUrl === 'string'
        ? input.projectUrl.trim()
        : '';
    } else {
      value.projectUrl = input.projectUrl.trim();
    }
    value.summary = checkText(input.summary, {
      required: true,
      min: 30,
      max: 3000,
    }, fields, 'summary');
    value.technologies = checkText(
      input.technologies || '',
      { max: 500 },
      fields,
      'technologies',
    );
    value.timeframe = input.timeframe;
    if (!TIMEFRAMES.includes(value.timeframe)) {
      fields.timeframe = input.timeframe ? 'invalid_value' : 'required';
    }
    if (input.privacyAccepted !== true) {
      fields.privacyAccepted = 'consent_required';
    }
    value.privacyAccepted = input.privacyAccepted === true;
    if (!LANGS.includes(input.locale)) {
      fields.locale = input.locale ? 'invalid_value' : 'required';
    }
    value.locale = input.locale;
    if (typeof input.privacyVersion !== 'string' || !input.privacyVersion) {
      fields.privacyVersion = 'required';
      value.privacyVersion = '';
    } else {
      value.privacyVersion = input.privacyVersion;
    }
    value.attribution = null;
    if (input.attribution != null) {
      if (
        typeof input.attribution !== 'object'
        || Array.isArray(input.attribution)
      ) {
        fields.attribution = 'invalid_value';
      } else {
        const tags = {};
        Object.keys(input.attribution).forEach((key) => {
          if (!UTM.includes(key)) fields.attribution = 'unknown_field';
          else if (typeof input.attribution[key] !== 'string') {
            fields.attribution = 'invalid_value';
          } else if (codePoints(input.attribution[key]) > 100) {
            fields.attribution = 'too_long';
          } else tags[key] = input.attribution[key];
        });
        value.attribution = tags;
      }
    }
    const website = input.website;
    const honeypot = typeof website === 'string'
      ? website.trim() !== ''
      : website != null;
    if (Object.keys(fields).length) {
      return Object.assign(fail(fields), { honeypot });
    }
    return { ok: true, value, honeypot };
  };

  return {
    SERVICES,
    AUDIENCES,
    TIMEFRAMES,
    LANGS,
    codePoints,
    check,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CareValidate;
}
