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
from db_utils import init_db, save_participant_data, generate_unique_id, export_results_csv

app = Flask(__name__)
app.secret_key = "your-secret-key-change-this"  # Add a secret key for sessions


# In-memory storage for user sessions (consider Redis for production)
user_sessions = {}

# Cache loaded data to avoid repeated CSV reads
_data_cache = None
_cache_timestamp = None
CACHE_DURATION = timedelta(hours=1)


# Load CSV Data
def load_data():
    global _data_cache, _cache_timestamp

    # Use cached data if available and fresh
    if (
        _data_cache
        and _cache_timestamp
        and datetime.now() - _cache_timestamp < CACHE_DURATION
    ):
        return _data_cache

    # Load fresh data
    df = pd.read_csv(
        "study_data_test.csv", encoding="utf-8", on_bad_lines="skip", sep=";"
    )

    # Selecting main columns to display
    displayed_columns = [
        "First Author",
        "Last Author",
        "Title",
        "Citation Count",
        "Publikationsjahr",
        "Oxford Evidence Level",
        "Impact Factor",
        "Journal",
    ]

    # Additional details (expandable)
    expandable_columns = [
        "Abstract",
        "Citation Trend",
        "Autoren",
        "Studiendesign/Studienart",
        "Methdische Qualität",
        "Tumor Entität",
        "Präregestriert",
        "Metanalayse",
    ]

    # Filter the dataset
    df_filtered = df[displayed_columns + expandable_columns].dropna(how="all")
    _data_cache = df_filtered.to_dict(orient="records")
    _cache_timestamp = datetime.now()

    return _data_cache


# Initialize database when app starts
init_db()

@app.route("/")
def index():
    # Generate a unique session ID
    session_id = str(uuid.uuid4())
    session["session_id"] = session_id
    
    # Generate a unique participant ID
    participant_id = generate_unique_id()
    session["user_id"] = participant_id
    
    # Initialize user session
    user_sessions[session_id] = {
        "user_id": participant_id,
        "start_time": datetime.now(),
        "rankings": {},
        "confirmed": False
    }
    
    return render_template("start.html", participant_id=participant_id)


@app.route("/study", methods=["GET", "POST"])
def study():
    if request.method == "POST":
        user_id = request.form.get("user_id")
        if user_id and user_id.strip():
            # Generate unique session ID
            session_id = str(uuid.uuid4())

            # Store minimal data in Flask session
            session["session_id"] = session_id
            session["user_id"] = user_id.strip()  # Use the ID passed from form (the auto-generated one)

            # Store user data in memory with session ID
            data = load_data()
            import random

            indices = list(range(len(data)))
            random.shuffle(indices)

            user_sessions[session_id] = {
                "user_id": user_id.strip(),
                "shuffle_order": indices,
                "start_time": datetime.now(),
                "rankings": {},  # Store rankings server-side too
            }

            return render_template("index.html")
        else:
            # Redirect back to start if no user ID provided
            return redirect(url_for("index"))
    else:
        # If GET request, check if session_id exists
        if "session_id" not in session:
            return redirect(url_for("index"))
        return render_template("index.html")


@app.route("/data")
def get_data():
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify([])

    data = load_data()
    shuffle_order = user_sessions[session_id]["shuffle_order"]
    shuffled_data = [data[i] for i in shuffle_order]

    return jsonify(shuffled_data)


@app.route("/detail/<int:row_id>")
def detail(row_id):
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return redirect(url_for("index"))

    data = load_data()
    shuffle_order = user_sessions[session_id]["shuffle_order"]
    shuffled_data = [data[i] for i in shuffle_order]

    if 0 <= row_id < len(shuffled_data):
        return render_template("detail.html", row=shuffled_data[row_id])
    return "Detail not found", 404


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
        return jsonify({"error": "Invalid session"}), 400

    data = request.get_json()
    confirmed = data.get("confirmed", False)
    user_sessions[session_id]["confirmed"] = confirmed
    user_sessions[session_id]["confirmation_time"] = datetime.now()
    
    # Save to database if confirmed
    if confirmed:
        user_id = save_participant_data(session_id, user_sessions)
        if user_id:
            # Update session with user ID (in case it was generated in save_participant_data)
            session["user_id"] = user_id
    
    return jsonify({"success": True, "user_id": session.get("user_id")})


@app.route("/get_confirmation_status")
def get_confirmation_status():
    session_id = session.get("session_id")
    if not session_id or session_id not in user_sessions:
        return jsonify({"confirmed": False})

    return jsonify({"confirmed": user_sessions[session_id].get("confirmed", False)})


@app.route("/timer.js")
def timer_js():
    return send_from_directory("static", "timer.js")


# Add export endpoints
@app.route("/admin/export", methods=["GET"])
def export_results():
    # Add authentication here if needed
    results = []
    with closing(sqlite3.connect('study_results.db')) as db:
        for row in db.execute("SELECT user_id, start_time, confirmation_time, rankings, confirmed FROM participants"):
            results.append({
                "user_id": row[0],
                "start_time": row[1],
                "confirmation_time": row[2],
                "rankings": json.loads(row[3]),
                "confirmed": bool(row[4])
            })
    return jsonify(results)

@app.route("/admin/export_csv", methods=["GET"])
def download_csv():
    # Add authentication here if needed
    return send_file(
        export_results_csv(),
        mimetype='text/csv',
        download_name='study_results.csv',
        as_attachment=True
    )


@app.route("/admin")
def admin_page():
    # Add authentication here if needed
    return render_template("admin.html")


if __name__ == "__main__":
    app.run(debug=True)
