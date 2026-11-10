# care.meta-qube.com

Meta Qube Care: independent software assessment, recovery, modernisation, and ongoing engineering support. Public host: `https://care.meta-qube.com`.

The site is static HTML for GitHub Pages, the same way as the other subdomains. English is at `/`, Ukrainian at `/ua/`, Russian at `/ru/`. Each language has a landing page, `/apply/`, `/privacy/`, and `/thank-you/`. `CNAME` is `care.meta-qube.com`.

The project request form posts to Google Forms through a hidden iframe. Responses land in the linked Google Sheet. There is no application server.

The form action and field IDs in `assets/apply.js` are still placeholders (`CARE_FORM_ID`, `entry.REPLACE_*`). Until those are replaced, sending a request shows the email fallback and does not report success. Create the form with `GOOGLE_FORMS_SETUP.md`, then paste the real IDs into `assets/apply.js`.
