# PowerZone

PowerZone is a static frontend fitness web app with a modern landing page and Supabase-based authentication (login, register, and password reset flow).

## Features

- High-impact landing page with:
  - fixed navbar
  - hero section
  - feature timeline cards
  - app preview section with phone mockup
- Dedicated auth pages:
  - `login.html`
  - `register.html`
- Supabase auth integration:
  - email/password sign up
  - email/password login
  - forgot password reset email
- Profile bootstrap SQL for Supabase (`database/supabase_setup.sql`)
- Responsive CSS for mobile and desktop layouts

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Supabase Auth + Postgres (RLS policies and profile trigger)

## Project Structure

```text
PowerZen/
  database/
    supabase_setup.sql
  frontend/
    index.html
    styles.css
    script.js
    login.html
    register.html
    auth-pages.css
    auth-pages.js
    auth.html
    auth.css
    auth.js
    supabase-config.js
    images/
```

## Getting Started

### 1. Clone

```bash
git clone https://github.com/Priyanshu-Jangra-0007/PowerZone.git
cd PowerZone
```

### 2. Configure Supabase

Edit `frontend/supabase-config.js`:

```js
window.SUPABASE_URL = "YOUR_SUPABASE_URL";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

### 3. Setup Database (Supabase SQL Editor)

Run `database/supabase_setup.sql` in your Supabase project SQL editor.

This creates:
- `public.profiles` table
- RLS policies for self read/update/insert
- trigger to auto-create profile on `auth.users` signup
- `updated_at` auto-update trigger

### 4. Run Locally

Because this is a static frontend, serve it with any local static server.

Option A (VS Code Live Server):
- Open project
- Right click `frontend/index.html`
- Click `Open with Live Server`

Option B (Python):

```bash
cd frontend
python -m http.server 5500
```

Then open:
- `http://localhost:5500/index.html`

## Auth Flow Notes

- Login/Register pages use `auth-pages.js`.
- If Supabase keys are missing, UI will show:
  - `Supabase not configured. Add keys in supabase-config.js.`
- Password reset sends email with redirect:
  - `auth.html?mode=reset`

## Deployment

You can deploy `frontend/` on:
- GitHub Pages
- Netlify
- Vercel (static)

Important:
- Add your real Supabase URL/Anon key before deployment.
- Configure Supabase Auth redirect URLs to your deployed domain.

## Current Repository

GitHub: `https://github.com/Priyanshu-Jangra-0007/PowerZone`

## License

No explicit license file is currently included.
