# Focus App backend

Flask API for the Focus App. Application factory, SQLAlchemy models, migrations, and the alarm endpoints.

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

### 5. Apply the database migrations

```powershell
$env:FLASK_APP = "run.py"
flask db upgrade
```

On Mac and Linux use `export FLASK_APP=run.py` instead.

### 6. Run the server

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

## Database

Five models live in `app/models/`, one file each.

| Model | Holds |
|---|---|
| `Category` | A task type with a name and a hex colour, used for colour coding |
| `Event` | A calendar entry with a start, an end, an optional category, a location and manually entered travel minutes |
| `Alarm` | A reminder time with repeat days, a frequency tier and optional custom offsets, optionally attached to an Event |
| `Goal` | A long term goal with an optional target date, an urgency level and a completed flag |
| `Task` | A unit of work, optionally under a Goal and a Category, with a due date and completed and locked flags |

Every model has an integer `id`, `created_at` and `updated_at`, and a `to_dict()` that returns JSON safe values with ISO 8601 strings for dates and times.

Deleting a Goal leaves its Tasks in place and clears their `goal_id`.

There is no User model and no `user_id` columns, because the team has not decided whether the app has accounts.

### After pulling

Whenever you pull changes that touch the backend, run both of these.

```powershell
pip install -r requirements.txt
$env:FLASK_APP = "run.py"
flask db upgrade
```

### Changing the schema

Edit the model, then generate and apply a migration.

```powershell
flask db migrate -m "describe the change"
flask db upgrade
```

Open the generated file under `migrations/versions/` before applying it and confirm it contains what you expect. An empty migration usually means a new model is not imported in `app/models/__init__.py`, so SQLAlchemy never saw it.

The `migrations/` folder is committed. The database file itself is not.

## API

Base path is `/api`.

| Method | Path | Does |
|---|---|---|
| GET | `/api/health` | Health check, returns status and environment |
| GET | `/api/alarms` | Lists every alarm, newest first |
| POST | `/api/alarms` | Creates an alarm, returns 201 |
| GET | `/api/alarms/<id>` | Returns one alarm, or 404 |
| PATCH | `/api/alarms/<id>` | Updates the fields you send, or 404 |
| DELETE | `/api/alarms/<id>` | Deletes an alarm, returns 204, or 404 |

Example create.

```json
{
  "time": "07:30",
  "label": "Leave for class",
  "repeat_days": ["mon", "wed"],
  "frequency_tier": "custom",
  "custom_offsets": [45, 20, 5],
  "snooze_duration": 5
}
```

`time` is 24 hour `HH:MM`. `repeat_days` uses the codes `mon tue wed thu fri sat sun` and comes back sorted into week order, with an empty list meaning a one time alarm. `frequency_tier` is one of `few`, `some`, `many` or `custom`, and `custom_offsets` is only kept when the tier is `custom`, sorted from largest to smallest. Invalid input returns 400 with an `error` message.

## Tests

```bash
python -m pytest
```

Tests run against an in memory SQLite database, so they never touch your development data.
