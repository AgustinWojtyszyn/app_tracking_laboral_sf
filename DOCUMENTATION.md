
# Job Tracker - Documentation

## Overview
Job Tracker is a React-based web application for tracking daily jobs, expenses, and managing teams. It uses Supabase for authentication and database services.

## Setup Instructions

### Environment Variables
This application requires the following environment variables to be set in your `.env` file or environment configuration:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key

### How to Verify Installation

1. **Check Console**: Open the browser developer console (F12). Ensure there are no red error messages related to imports or missing files.
2. **Landing Page**: Visit the root URL `/`. You should see the "Job Tracker" landing page with a "Comenzar Gratis" button.
3. **Navigation**: Click "Iniciar Sesión" to go to `/login` and "Registrarse" to go to `/register`.
4. **Registration**: Create a new account. You should see a success message asking you to confirm your email.
5. **Login**: Log in with an existing (confirmed) account. You should be redirected to `/app/dashboard`.
6. **Dashboard**: Verify the sidebar navigation links work and the layout is correct.

## Troubleshooting

### Common Errors

- **"Missing VITE_SUPABASE_URL..."**: Check your environment variables. Ensure they are correctly spelled and loaded.
- **404 on Refresh**: This is a Single Page Application (SPA). If hosting on Netlify/Vercel, ensure you have a redirect rule `/* /index.html 200`. Locally, Vite handles this.
- **Styles missing**: Ensure `tailwind.config.js` content paths include all your component files.

## Deployment Checklist (Supabase)

The frontend uses build-time env vars. If a build is done with an old URL, the deployed app will keep pointing to the wrong project.

1. **Set correct env vars in your build environment** (CI/CD, Netlify, Vercel, Hostinger, etc.). Use `VITE_SUPABASE_URL=https://kaprywsyjqmqinyggsjt.supabase.co` and `VITE_SUPABASE_ANON_KEY=<anon key from the same project>`.
2. **Clear build cache and rebuild.** Netlify: "Deploys" → "Trigger deploy" → "Clear cache and deploy site". Vercel: "Deployments" → "Redeploy" → check "Clear build cache". Manual/Hostinger: delete old `dist/`, run `npm run build`, upload the new `dist/`.
3. **Avoid accidental prod usage of `.env`.** `.env` is ignored by git and should not be uploaded to the hosting server. The build system must supply the env vars; static hosts do not read `.env` at runtime.
4. **Verify after deploy.** Open DevTools → Network → verify requests go to `kaprywsyjqmqinyggsjt.supabase.co`.

## Modified Files
- `src/main.jsx`: Entry point, wraps app in providers.
- `src/App.jsx`: Routing logic, protected routes structure.
- `src/services/auth.service.js`: Authentication logic with env var validation.
- `src/contexts/SupabaseAuthContext.jsx`: Auth state management.
- `src/contexts/ToastContext.jsx`: Toast notification system.
- `src/pages/LandingPage.jsx`: Redesigned landing page.
- `src/pages/LoginPage.jsx`: Redesigned login page.
- `src/pages/RegisterPage.jsx`: Redesigned register page.
- `src/components/Card.jsx`: Reusable card component.
- `src/components/Button.jsx`: Reusable button component.
- `src/components/Input.jsx`: Reusable input component.
- `src/components/Alert.jsx`: Reusable alert component.
- `src/components/auth/ProtectedRoute.jsx`: Route protection logic.
- `src/components/layout/AppLayout.jsx`: Main app layout.
- `src/components/layout/Sidebar.jsx`: App navigation sidebar.
- `src/index.css`: Global styles and Tailwind directives.
- `tailwind.config.js`: Tailwind configuration.
