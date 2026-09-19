# Focus App backend

Flask API for the Focus App. This is the skeleton only. It boots, it answers a health check, and it has SQLAlchemy wired up ready for models.

Requires Python 3.9 or newer. Built and tested on 3.11.

## Setup

Run everything from inside the `backend/` folder.

### 1. Create a virtual environment

```bash
python -m venv venv
```

A virtual environment keeps this project's packages separate from everything else on your machine. The `venv/` folder is gitignored, so it never gets committed.

### 2. Activate it

The command differs per platform. Use the one for your machine.

**Windows PowerShell**

```powershell
venv\Scripts\Activate.ps1
```

**Windows Command Prompt**

```cmd
venv\Scripts\activate.bat
```

**Mac and Linux**

```bash
source venv/bin/activate
```

You will know it worked because your prompt gains a `(venv)` prefix. Activate it every time you open a new terminal to work on the backend.

If PowerShell refuses with a message about execution policies, run this once and then try again.

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create your env file

```bash
copy .env.example .env
```

On Mac and Linux use `cp .env.example .env` instead.

The defaults in the example file work as they are, so you can run the server without editing anything. The real `.env` is gitignored and must never be committed.

### 5. Run the server

```bash
python run.py
```

It starts on port 5000 and binds to `0.0.0.0`, which means other devices on your wifi can reach it. That is deliberate, because the Expo app runs on a physical phone and cannot reach a server bound to localhost.

## Checking that it works

Open this in a browser on the same machine.

```
http://localhost:5000/api/health
```

You should get back

```json
{"environment": "development", "status": "ok"}
```

If you see that, the backend is working.

### Reaching it from your phone

The phone cannot use `localhost`, because to the phone that means the phone itself. You need your computer's address on the local network.

**Windows**

```powershell
ipconfig
```

Look for the `IPv4 Address` under your active wifi adapter. It usually starts with `192.168.` or `10.`.

**Mac**

```bash
ipconfig getifaddr en0
```

**Linux**

```bash
hostname -I
```

Then open `http://<that address>:5000/api/health` in the phone's browser. Once that responds, the Expo app will be able to reach the API too.

Both devices must be on the same wifi network. If the address does not respond, the usual causes are a firewall prompt that was dismissed, or a campus or guest network that blocks devices from talking to each other. A phone hotspot with the laptop joined to it is a reliable fallback for testing.

## What is here

```
backend/
├── app/
│   ├── __init__.py      create_app() application factory
│   ├── config.py        config classes driven by environment variables
│   ├── extensions.py    shared SQLAlchemy, Migrate and CORS objects
│   ├── models/          empty, see the Database Table Shells ticket
│   └── routes/
│       └── health.py    the health check blueprint
├── requirements.txt
├── .env.example
└── run.py               development entry point
```

The app uses the factory pattern, meaning there is no module level `app` object. `create_app()` builds one, which keeps configuration switchable and makes the app testable later.

Routes are organised as blueprints. To add one, create a module under `app/routes/`, define a blueprint in it, and register it in `create_app()`.

## Database models

There are none yet. Models belong to the "Database Table Shells" ticket and are owned by someone else.

SQLAlchemy and Flask-Migrate are already configured, so that ticket starts by defining classes in `app/models/` rather than by wiring anything up.

## Notes

SQLite is used for local development because it needs no installation. The team has not chosen a production database, so the connection string is read from `DATABASE_URL` and can be swapped without touching code.

CORS is currently open to all origins for `/api/*`. That is fine while developing against a phone on the local network, but it must be restricted before this is deployed anywhere real.
