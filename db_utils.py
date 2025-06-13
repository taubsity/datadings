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
    with closing(sqlite3.connect('study_results.db')) as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS participants (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE,
                start_time TEXT,
                confirmation_time TEXT,
                rankings TEXT,
                confirmed INTEGER
            )
        ''')
        db.commit()

def save_participant_data(session_id, user_sessions):
    """Save participant data to the database"""
    if not session_id or session_id not in user_sessions:
        return False
    
    session_data = user_sessions[session_id]
    
    # Only save confirmed rankings
    if not session_data.get("confirmed", False):
        return False
    
    with closing(sqlite3.connect('study_results.db')) as db:
        rankings_json = json.dumps(session_data.get("rankings", {}))
        
        # Get existing user_id or generate a new one
        user_id = session_data.get("user_id")
        if not user_id:
            user_id = generate_unique_id()
            session_data["user_id"] = user_id
        
        db.execute(
            "INSERT OR REPLACE INTO participants VALUES (?, ?, ?, ?, ?, ?)",
            (
                session_id,
                user_id,
                session_data.get("start_time", datetime.now()).isoformat(),
                session_data.get("confirmation_time", datetime.now()).isoformat(),
                rankings_json,
                1
            )
        )
        db.commit()
    
    return user_id

def export_results_csv():
    """Export all participant data as CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['user_id', 'start_time', 'confirmation_time', 'confirmed', 'rank1', 'rank2', 'rank3'])
    
    with closing(sqlite3.connect('study_results.db')) as db:
        for row in db.execute("SELECT user_id, start_time, confirmation_time, rankings, confirmed FROM participants"):
            rankings = json.loads(row[3])
            rank_data = {f'rank{rank}': study_key for study_key, rank in rankings.items() if rank in ['1', '2', '3']}
            
            writer.writerow([
                row[0],                      # user_id
                row[1],                      # start_time
                row[2],                      # confirmation_time
                bool(row[4]),                # confirmed
                rank_data.get('rank1', ''),  # study ranked #1
                rank_data.get('rank2', ''),  # study ranked #2
                rank_data.get('rank3', '')   # study ranked #3
            ])
    
    output.seek(0)
    return io.BytesIO(output.getvalue().encode('utf-8'))