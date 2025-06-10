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

app = Flask(__name__)
app.secret_key = "your-secret-key-change-this"  # Add a secret key for sessions


# Load CSV Data
def load_data():
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

    return df_filtered.to_dict(orient="records")


@app.route("/")
def index():
    return render_template("start.html")


@app.route("/study", methods=["GET", "POST"])
def study():
    if request.method == "POST":
        user_id = request.form.get("user_id")
        if user_id and user_id.strip():
            session["user_id"] = user_id.strip()
            return render_template("index.html")
        else:
            # Redirect back to start if no user ID provided
            return redirect(url_for("index"))
    else:
        # If GET request, check if user_id exists in session
        if "user_id" not in session:
            return redirect(url_for("index"))
        return render_template("index.html")


@app.route("/data")
def get_data():
    data = load_data()
    import random

    random.shuffle(data)  # Shuffle rows on each page reload
    return jsonify(data)


@app.route("/detail/<int:row_id>")
def detail(row_id):
    data = load_data()  # from the load_data() function
    if 0 <= row_id < len(data):
        return render_template("detail.html", row=data[row_id])
    return "Detail not found", 404


@app.route("/timer.js")
def timer_js():
    return send_from_directory("static", "timer.js")


if __name__ == "__main__":
    app.run(debug=True)
