import sqlite3
import uuid
import json
import csv
import io
from contextlib import closing
from datetime import datetime
from flask import send_file


def generate_unique_id():
    """Generate a unique participant ID"""
    return str(uuid.uuid4())[:8]


def init_db():
    """Initialize the database with required tables"""
    with closing(sqlite3.connect("study_results.db")) as db:
        # Add system_id column to store the automatically generated ID
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS participants (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                system_id TEXT,
                task INTEGER,
                start_time TEXT,
                confirmation_time TEXT,
                rankings TEXT,
                confirmed INTEGER,
                UNIQUE(user_id, task)
            )
        """
        )
        db.commit()


def save_participant_data(session_id, user_sessions):
    """Save participant data to the database"""
    if not session_id or session_id not in user_sessions:
        return False

    session_data = user_sessions[session_id]

    # Only save confirmed rankings
    if not session_data.get("confirmed", False):
        return False

    with closing(sqlite3.connect("study_results.db")) as db:
        rankings_json = json.dumps(session_data.get("rankings", {}))

        # Get task information (default to 1 if not specified)
        task = session_data.get("task", 1)

        # Get user entered ID
        user_id = session_data.get("user_id")

        # Get system generated ID (or generate one if missing)
        system_id = session_data.get("system_id", generate_unique_id())

        # Create composite ID for the primary key
        composite_id = f"{session_id}_{task}"

        db.execute(
            "INSERT OR REPLACE INTO participants VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                composite_id,
                user_id,
                system_id,
                task,
                session_data.get("start_time", datetime.now()).isoformat(),
                session_data.get("confirmation_time", datetime.now()).isoformat(),
                rankings_json,
                1,
            ),
        )
        db.commit()

    return user_id


def export_results_csv():
    """Export all participant data as CSV with proper quoting"""
    output = io.StringIO()

    # Enable quoting for all fields
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)

    # Write header with task information and include system_id
    writer.writerow(
        [
            "user_id",
            "system_id",
            "task",
            "start_time",
            "confirmation_time",
            "confirmed",
            "rank1",
            "rank2",
            "rank3",
        ]
    )

    with closing(sqlite3.connect("study_results.db")) as db:
        for row in db.execute(
            "SELECT user_id, system_id, task, start_time, confirmation_time, rankings, confirmed FROM participants"
        ):
            rankings = json.loads(row[5])
            rank_data = {}

            # Convert rankings to rank1, rank2, rank3 format
            for study_key, rank in rankings.items():
                if rank in ["1", "2", "3"]:
                    rank_data[f"rank{rank}"] = study_key

            writer.writerow(
                [
                    row[0],  # user_id
                    row[1],  # system_id
                    row[2],  # task
                    row[3],  # start_time
                    row[4],  # confirmation_time
                    bool(row[6]),  # confirmed
                    rank_data.get("rank1", ""),  # study ranked #1
                    rank_data.get("rank2", ""),  # study ranked #2
                    rank_data.get("rank3", ""),  # study ranked #3
                ]
            )

    output.seek(0)
    return io.BytesIO(output.getvalue().encode("utf-8"))
