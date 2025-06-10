from flask import Flask, render_template, jsonify, send_from_directory
import pandas as pd

app = Flask(__name__)


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
