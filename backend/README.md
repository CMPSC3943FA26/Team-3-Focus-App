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

Six models live in `app/models/`, one file each.

| Model | Holds |
|---|---|
| `Category` | A task type with a name, a hex colour and an optional reminder preset (`reminder_tier` and `custom_offsets`) |
| `Event` | A calendar entry with a start, an end, an optional category, a location and manually entered travel minutes |
| `Alarm` | A reminder time with repeat days, a frequency tier and optional custom offsets, optionally attached to an Event |
| `Goal` | A long term goal with an optional target date, an urgency level and a completed flag |
| `Task` | A unit of work, optionally under a Goal and a Category, with a due date, a planned day (`scheduled_date`), an estimate in minutes, a priority and completed and locked flags |
| `TimeEntry` | A span of logged time with a start, an optional end and an optional note, optionally tied to a Task. No end means the timer is running |

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
| GET | `/api/events` | Lists every event by start time. Accepts `?start=&end=` |
| POST | `/api/events` | Creates an event, returns 201 |
| GET | `/api/events/<id>` | Returns one event, or 404 |
| PATCH | `/api/events/<id>` | Updates the fields you send, or 404 |
| DELETE | `/api/events/<id>` | Deletes an event, returns 204, or 404 |
| GET | `/api/goals` | Lists every goal, oldest first |
| POST | `/api/goals` | Creates a goal, returns 201 |
| GET | `/api/goals/<id>` | Returns one goal, or 404 |
| PATCH | `/api/goals/<id>` | Updates the fields you send, or 404 |
| DELETE | `/api/goals/<id>` | Deletes a goal and keeps its tasks, returns 204, or 404 |
| GET | `/api/tasks` | Lists every task, oldest first. Accepts `?goal_id=` |
| POST | `/api/tasks` | Creates a task, returns 201 |
| GET | `/api/tasks/<id>` | Returns one task, or 404 |
| PATCH | `/api/tasks/<id>` | Updates the fields you send, or 404 |
| DELETE | `/api/tasks/<id>` | Deletes a task, returns 204, or 404 |
| GET | `/api/tasks/suggest?now=` | Returns `{"task": ...}` with the task to do next, or `null` |
| GET | `/api/categories` | Lists every task type by name |
| POST | `/api/categories` | Creates a task type, returns 201 |
| GET | `/api/categories/<id>` | Returns one task type, or 404 |
| PATCH | `/api/categories/<id>` | Updates the fields you send, or 404 |
| DELETE | `/api/categories/<id>` | Deletes a task type and keeps its tasks, returns 204, or 404 |
| GET | `/api/time-entries` | Lists every time entry by start. Accepts `?date=` |
| POST | `/api/time-entries` | Creates a time entry, returns 201 |
| PATCH | `/api/time-entries/<id>` | Updates the fields you send, or 404 |
| DELETE | `/api/time-entries/<id>` | Deletes a time entry, returns 204, or 404 |

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

Example create an event.

```json
{
  "title": "OS lecture",
  "start_time": "2026-10-20T09:00:00",
  "end_time": "2026-10-20T10:15:00",
  "location": "Room 204",
  "travel_minutes": 15,
  "color": "#5E8C76"
}
```

Event times are local wall-clock time with no timezone, so `2026-10-20T09:00:00` means nine in the morning wherever the user is. `end_time` must be after `start_time`. `color` is a six digit hex value and comes back uppercase. `travel_minutes` runs from 0 to 600, and 0 is stored as null.

The `?start=&end=` query takes whole dates and returns every event overlapping that range, including one that began before the range and is still running.

```
GET /api/events?start=2026-10-20&end=2026-10-26
```

Both parameters are required together, and `end` must be on or after `start`.

### Repeating events and reminders

An event can repeat weekly, which is how a class schedule is stored. One row is the whole series.

| Field | Rule |
|---|---|
| `repeat_days` | List of `mon tue wed thu fri sat sun`, returned in week order. Empty means it does not repeat |
| `repeat_until` | Last day the series can land on, like `2026-12-18`, or null for no end. Must not be before the start date |
| `reminders_enabled` | `true` by default. `false` means the app sends no nudges for this event |
| `reminder_tier` | null means use the user's default, or one of `few`, `some`, `many` or `custom` |
| `custom_offsets` | Minutes before, from 0 to 1440. The `custom` tier needs at least one, and any other tier clears them |

`start_time` and `end_time` describe the first occurrence. The app works out every later one from `repeat_days`, so editing the event changes the whole series, and there are no single-occurrence exceptions.

A `?start=&end=` range returns a repeating series whenever it can still land in that range, even though its first occurrence is earlier, and stops returning it after `repeat_until`. The phone turns the series into individual days.

An event's reminders act as its alarm. The app does not create separate alarm rows for events, because that would send every nudge twice.

`time` is 24 hour `HH:MM`. `repeat_days` uses the codes `mon tue wed thu fri sat sun` and comes back sorted into week order, with an empty list meaning a one time alarm. `frequency_tier` is one of `few`, `some`, `many` or `custom`, and `custom_offsets` is only kept when the tier is `custom`, sorted from largest to smallest. Invalid input returns 400 with an `error` message.

### Tasks

A task takes these fields on top of its title, `goal_id`, `category_id`, `is_completed` and `is_locked`.

| Field | Rule |
|---|---|
| `due_date` | Local wall-clock date-time like `2026-10-20T17:00:00`, or null |
| `scheduled_date` | The day the task is planned for, like `2026-10-20`, or null |
| `estimated_minutes` | Whole number from 1 to 1440, or null |
| `priority` | `low`, `medium` (the default) or `high` |

`GET /api/tasks/suggest?now=2026-10-20T09:00:00` picks the next task from the open ones that are not planned for a later day. An overdue task wins, then the earliest due date, then the higher priority. The phone sends its own local time in `now`, so the server timezone never matters. The answer is `{"task": null}` when nothing is waiting. The phone runs the same ordering itself, so it also works offline.

### Task types

A category can carry a reminder preset. `reminder_tier` is null, which means use the user's default, or one of `few`, `some`, `many` or `custom`. The `custom` tier needs at least one value in `custom_offsets`, and any other tier clears `custom_offsets`. Names are unique, ignoring case.

### Time entries

An entry has `started_at`, an optional `ended_at` and an optional `task_id` and `note`. Times are local wall-clock like events. `ended_at` must be after `started_at`. Only one entry can have no `ended_at` at a time, and starting a second returns 409 with "Another timer is already running". To stop a timer, PATCH `ended_at`.

`?date=2026-10-20` returns every entry that overlaps that day, so an entry that runs past midnight shows on both days.

### Pace

Pace is not stored on the server. The app compares the minutes logged today with a daily target the user sets, which defaults to 3 hours. The target is scaled by how much of the day has passed between 8 AM and 10 PM, so a 3 hour target expects 90 minutes by 3 PM. At or above that the user is on pace, below it they are behind, and reaching the full target counts as done.

## Tests

```bash
python -m pytest
```

Tests run against an in memory SQLite database, so they never touch your development data.
