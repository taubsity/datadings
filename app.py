from flask import (
    Flask,
    render_template,
    jsonify,
    send_from_directory,
    request,
    session,
    redirect,
    url_for,
)
import pandas as pd
import uuid
from datetime import datetime, timedelta

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


@app.route("/")
def index():
    return render_template("start.html")


@app.route("/study", methods=["GET", "POST"])
def study():
    if request.method == "POST":
        user_id = request.form.get("user_id")
        if user_id and user_id.strip():
            # Generate unique session ID
            session_id = str(uuid.uuid4())

            # Store minimal data in Flask session
            session.clear()
            session["session_id"] = session_id
            session["user_id"] = user_id.strip()

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
        # If GET request, check if user_id exists in session
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


@app.route("/timer.js")
def timer_js():
    return send_from_directory("static", "timer.js")


if __name__ == "__main__":
    app.run(debug=True)
