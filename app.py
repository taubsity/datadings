from flask import (
    Flask,
    render_template,
    jsonify,
    send_from_directory,
    request,
    session,
    redirect,
    url_for,
    send_file,  # Add send_file import
)
import pandas as pd
import uuid
import json  # Add json import
import sqlite3  # Add sqlite3 import
from contextlib import closing  # Add closing import
from datetime import datetime, timedelta
from db_utils import (
    init_db,
    save_participant_data,
    generate_unique_id,
    export_results_csv,
)

app = Flask(__name__)
app.secret_key = "your-secret-key-change-this"  # Add a secret key for sessions


# In-memory storage for user sessions (consider Redis for production)
user_sessions = {}

# Cache loaded data to avoid repeated CSV reads
_data_cache = None
_cache_timestamp = None
CACHE_DURATION = timedelta(hours=1)


# Load CSV Data
def load_data(task=1):
    global _data_cache, _cache_timestamp

    # Cache key incorporating task number
    cache_key = f"task_{task}"

    # Use cached data if available and fresh
    if (
        _data_cache
        and _cache_timestamp
        and cache_key in _data_cache
        and datetime.now() - _cache_timestamp < CACHE_DURATION
    ):
        return _data_cache[cache_key]

    # Determine which file to load based on task
    if task == 0:
        data_file = "data/study_data_test_new.csv"  # Training data
    elif task > 1:
        data_file = "data/task2_transformed.csv"  # Task 2+ data
    else:
        data_file = "data/task1_transformed.csv"  # Task 1 data

    # Load fresh data
    print(f"Loading data from file: {data_file}")
    df = pd.read_csv(
        data_file,
        encoding="utf-8",
        sep=";",
        quotechar='"',
        dtype=str,
    )
    print(f"Loaded {len(df)} rows of data")

    # Convert DataFrame to dictionary with explicit column mapping to ensure consistency
    records = []
    for _, row in df.iterrows():
        record = {
            "First Author": str(row.get("First Author", "")),
            "Last Author": str(row.get("Last Author", "")),
            "Title": str(row.get("Title", "")),
            "Citation Count": str(row.get("Citation Count", "")),
            "Publikationsjahr": str(row.get("Publikationsjahr", "")),
            "Oxford Evidence Level": str(row.get("Oxford Evidence Level", "")),
            "Impact Factor": str(row.get("Impact Factor", "")),
            "Journal": str(row.get("Journal", "")),
            "Abstract": str(row.get("Abstract", "")),
            "Citation Trend": str(row.get("Citation Trend", "")),
            "Autoren": str(row.get("Autoren", "")),
            "Studiendesign/Studienart": str(row.get("Studiendesign/Studienart", "")),
            "Methdische Qualität": str(row.get("Methdische Qualität", "")),
            "Tumor Entität": str(row.get("Tumor Entität", "")),
            "Präregestriert": str(row.get("Präregestriert", "")),
            "Metanalayse": str(row.get("Metanalayse", "")),
            # Include any other columns that might be needed
        }
        records.append(record)

    # Initialize cache if needed
    if not _data_cache:
        _data_cache = {}

    # Store data in cache with task-specific key
    _data_cache[cache_key] = records
    _cache_timestamp = datetime.now()

    return _data_cache[cache_key]


# Initialize database when app starts
init_db()


@app.route("/")
def index():
    # Still generate a system ID for internal use
    system_id = generate_unique_id()
    session["system_id"] = system_id

    return render_template("start.html")


@app.route("/study/<int:task>", methods=["GET", "POST"])
def study_task(task):
    if request.method == "POST":
        user_id = request.form.get("user_id")
        if user_id and user_id.strip():
            session_id = str(uuid.uuid4())
            system_id = session.get("system_id", generate_unique_id())
            session["session_id"] = session_id
            session["user_id"] = user_id.strip()
            session["system_id"] = system_id
            session["task"] = task
            data = load_data(task)
            import random
            indices = list(range(len(data)))
            random.shuffle(indices)
            user_sessions[session_id] = {
                "user_id": user_id.strip(),
                "system_id": system_id,
                "task": task,
                "shuffle_order": indices,
                "start_time": datetime.now(),
                "rankings": {},
            }
            if task == 0:
                return render_template("instructions.html", user_id=user_id)
            return redirect(url_for("index_page", task=task))
        else:
            return redirect(url_for("index"))
    else:
        if "session_id" not in session:
            return redirect(url_for("index"))
        return render_template("index.html", task=task)


@app.route("/index/<int:task>", methods=["GET"])
def index_page(task):
    user_id = session.get("user_id")
    # Set the task in the session
    session["task"] = task
    
    # If there are query parameters, redirect to clean URL
    if request.query_string:
        return redirect(f"/index/{task}")
        
    return render_template("index.html", task=task, user_id=user_id)


@app.route("/data")
def get_data():
    session_id = session.get("session_id")
    # Task aus Query-Parameter oder Session holen
    task = request.args.get("task", type=int)
    if task is None:
        task = session.get("task", 1)
    if not session_id or session_id not in user_sessions:
        return jsonify([])
    data = load_data(task)
    shuffle_order = user_sessions[session_id]["shuffle_order"]
    shuffled_data = [data[i] for i in shuffle_order]
    return jsonify(shuffled_data)

@app.route("/data/<int:task>")
def get_data_by_task(task):
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify([])
    data = load_data(task)
    shuffle_order = user_sessions[session_id]["shuffle_order"]
    shuffled_data = [data[i] for i in shuffle_order]
    return jsonify(shuffled_data)


@app.route("/detail")
def detail_view():
    # If there are query parameters, redirect to clean URL
    if request.query_string:
        return redirect("/detail")
    
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return redirect(url_for("index"))
    
    # Get the current row_id and task from the session
    row_id = session.get("current_detail_row_id")
    task = session.get("task", 1)
    
    if row_id is None:
        return redirect(url_for("index_page", task=task))
    
    data = load_data(task)
    shuffle_order = user_sessions[session_id]["shuffle_order"]
    shuffled_data = [data[i] for i in shuffle_order]
    
    if 0 <= row_id < len(shuffled_data):
        return render_template("detail.html", row=shuffled_data[row_id], task=task)
    
    return "Detail not found", 404

@app.route("/set_detail/<int:row_id>/<int:task>")
def set_detail(row_id, task):
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return redirect(url_for("index"))
    
    # Store the current detail info in the session
    session["current_detail_row_id"] = row_id
    
    # Redirect to the consistent detail URL
    return redirect(url_for("detail_view"))

# Keep the original route for backward compatibility
@app.route("/detail/<int:row_id>/<int:task>")
def detail(row_id, task):
    # Store the detail info in the session
    session["current_detail_row_id"] = row_id
    session["task"] = task
    
    # Redirect to the new consistent URL
    return redirect(url_for("detail_view"))


# API to save/load rankings
@app.route("/save_ranking", methods=["POST"])
def save_ranking():
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify({"error": "Invalid session"}), 400

    data = request.get_json()
    user_sessions[session_id]["rankings"] = data.get("rankings", {})
    return jsonify({"success": True})


@app.route("/get_rankings")
def get_rankings():
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify({})

    return jsonify(user_sessions[session_id]["rankings"])


@app.route("/confirm_rankings", methods=["POST"])
def confirm_rankings():
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify({"error": "Session not found"}), 400

    # Mark rankings as confirmed
    user_sessions[session_id]["confirmed"] = True
    user_sessions[session_id]["confirmation_time"] = datetime.now()

    # Save to database
    save_participant_data(session_id, user_sessions)

    current_task = session.get("task", 0)

    # If this was the training task (0), move to task 1
    if current_task == 0:
        next_task = 1
        # Save the user_id for continuity
        user_id = user_sessions[session_id]["user_id"]

        return jsonify(
            {
                "success": True,
                "next_task": True,
                "redirect": url_for(
                    "task_transition", participant_id=user_id, next_task=next_task
                ),
            }
        )

    # If this was task 1, move to task 2
    elif current_task == 1:
        next_task = 2
        user_id = user_sessions[session_id]["user_id"]

        return jsonify(
            {
                "success": True,
                "next_task": True,
                "redirect": url_for(
                    "task_transition", participant_id=user_id, next_task=next_task
                ),
            }
        )

    # If this was task 2, redirect to debriefing
    elif current_task == 2:
        user_id = user_sessions[session_id]["user_id"]

        return jsonify(
            {
                "success": True,
                "task_complete": True,
                "user_id": user_id,
                "redirect": url_for("debriefing"),  # Redirect to debriefing page
            }
        )

    # Otherwise this was some other task
    else:
        return jsonify(
            {
                "success": True,
                "task_complete": True,
                "user_id": user_sessions[session_id]["user_id"],
            }
        )


@app.route("/transition")
def transition():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("index"))

    return render_template("transition.html", participant_id=user_id)


@app.route("/timer.js")
def timer_js():
    return send_from_directory("static", "timer.js")


# Add export endpoints
@app.route("/admin/export", methods=["GET"])
def export_results():
    # Add authentication here if needed
    results = []
    with closing(sqlite3.connect("study_results.db")) as db:
        for row in db.execute(
            "SELECT user_id, start_time, confirmation_time, rankings, confirmed FROM participants"
        ):
            results.append(
                {
                    "user_id": row[0],
                    "start_time": row[1],
                    "confirmation_time": row[2],
                    "rankings": json.loads(row[3]),
                    "confirmed": bool(row[4]),
                }
            )
    return jsonify(results)


@app.route("/admin/export_csv", methods=["GET"])
def download_csv():
    # Add authentication here if needed
    return send_file(
        export_results_csv(),
        mimetype="text/csv",
        download_name="study_results.csv",
        as_attachment=True,
    )


@app.route("/admin")
def admin_page():
    # Add authentication here if needed
    return render_template("admin.html")


@app.route("/get_confirmation_status")
def get_confirmation_status():
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify({"confirmed": False})

    return jsonify(
        {
            "confirmed": user_sessions[session_id].get("confirmed", False),
            "task": session.get("task", 1),
        }
    )


@app.route("/task_transition/<participant_id>/<int:next_task>")
def task_transition(participant_id, next_task):
    # Prepare for the next task
    message = "Trainingsaufgabe abgeschlossen!" if next_task == 1 else "Erste Aufgabe abgeschlossen!"
    description = (
        "Sie werden nun zur Hauptstudie weitergeleitet."
        if next_task == 1
        else "Sie werden nun zur zweiten Bewertungsaufgabe weitergeleitet."
    )

    return render_template(
        "transition.html",
        participant_id=participant_id,
        next_task=next_task,
        message=message,
        description=description,
    )


@app.route("/debriefing")
def debriefing():
    user_id = session.get("user_id")
    if not user_id:
        return redirect(url_for("index"))

    # Get participant details if needed for the debriefing content
    return render_template("debriefing.html", user_id=user_id)


@app.route("/oxford_explanation")
def oxford_explanation():
    # If there are query parameters, redirect to clean URL
    if request.query_string:
        return redirect("/oxford_explanation")
    return render_template("oxford_explanation.html")


@app.route("/training_transition")
def training_transition():
    # If there are query parameters, redirect to clean URL
    if request.query_string:
        return redirect("/training_transition")
    return render_template("training_transition.html")


if __name__ == "__main__":
    app.run(debug=True)
