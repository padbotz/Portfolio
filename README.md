# Health-Tech Developer Portfolio — Demo Pack

Three self-contained demos plus a landing page, built to showcase health-tech / HIPAA-aware development skills to freelance clients. Everything runs in a browser with **no build step, no server, and no dependencies** — just open the files.

## Files

| File | What it shows |
|------|---------------|
| `index.html` | Portfolio landing page tying the demos together. **Start here.** |
| `clinical-note-summarizer.html` | AI summarizer: free-text note → structured SOAP summary + problem list + ICD-10 suggestions. |
| `patient-intake.html` | Multi-step HIPAA-aware patient intake form with validation, consent, and review. |
| `telehealth-scheduler.html` | Book virtual visits by provider/day/time with live availability + patient dashboard. |

## Run it locally

Double-click `index.html`, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish it free (recommended for client links)

**GitHub Pages:**
1. Create a public repo and upload these files.
2. Repo → Settings → Pages → Source: `main` branch, `/root`.
3. Your portfolio goes live at `https://<username>.github.io/<repo>/`.

Netlify Drop (`app.netlify.com/drop`) and Vercel also work — just drag the folder in.

## Important: these are demos

- All data is **synthetic**. No real PHI is used or stored — everything stays in the browser.
- The AI summarizer uses a lightweight in-browser rule-based parser so it works offline with no API key.

## Taking these to production (talking points for clients)

- **Real AI:** replace `fakeSummarize()` in the summarizer with a call to a HIPAA-eligible model (Azure OpenAI or AWS Bedrock **under a signed BAA**). Run inference server-side; never expose API keys in the browser.
- **HIPAA data handling:** submit over TLS, encrypt data at rest, enforce role-based access, and log all access for audit trails.
- **Auth:** add patient/provider authentication (e.g. OAuth/OIDC) before any real deployment.

These are exactly the points a health-tech client wants to hear — the demos prove you can build the UI, and the notes prove you understand the compliance layer generic devs miss.
