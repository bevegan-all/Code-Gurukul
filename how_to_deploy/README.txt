
╔══════════════════════════════════════════════════════════════════╗
║             CODEGURUKUL — DEPLOYMENT QUICK REFERENCE            ║
╚══════════════════════════════════════════════════════════════════╝

FIRST TIME ON A NEW MACHINE?
──────────────────────────────────────────────────────────────────
  Just run:  10_full_fresh_deploy.bat
  (Does everything automatically and guides you through each step)

DAILY STARTUP (after initial setup):
──────────────────────────────────────────────────────────────────
  1. Run: ..\server_start.bat          (from Code Gurukul root)
  2. If ngrok URL changed: 4_update_ngrok_url.bat
  3. Update Vercel VITE_API_URL if needed → Redeploy

NGROK URL CHANGED?
──────────────────────────────────────────────────────────────────
  Run: 4_update_ngrok_url.bat
  Then update Vercel environment variable manually.
  Then rebuild Windows app if URL was baked into it: 7_build_windows_app.bat

ALL BATCH FILES:
──────────────────────────────────────────────────────────────────
  1_create_databases.bat     → Create PostgreSQL DB + seed admin user
  2_setup_env.bat            → Set up backend/.env interactively
  3_install_dependencies.bat → npm install for backend + frontend + windows-app
  4_update_ngrok_url.bat     → ⭐ Update ngrok URL in all config files
  5_test_windows_app.bat     → Launch Electron app (dev mode)
  6_push_to_github.bat       → Git add + commit + push
  7_build_windows_app.bat    → Build Electron .exe installer
  8_start_frontend_dev.bat   → Start frontend dev server (localhost:5173)
  9_restart_backend.bat      → Kill port 5000 + restart Node server
  10_full_fresh_deploy.bat   → Full automated first-time setup
  11_update_email_credentials.bat → Update Gmail config for sending mail

FULL GUIDE:  Read DEPLOYMENT_GUIDE.txt
