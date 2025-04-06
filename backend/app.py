from flask import Flask
import sqlite3
from routes import auth_bp, channel_bp, message_bp
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# Secret key for JWT signing (should be kept secure in production)
SECRET_KEY = "supersecretkey"

# Initialize Database
def init_db():
    with sqlite3.connect("belay.db") as conn:
        cursor = conn.cursor()

        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        """)

        # Create channels table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS channels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        """)

        # Message table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                channel_id INTEGER NOT NULL,
                text TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                replies_to INTEGER DEFAULT NULL,  -- Threaded replies
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (channel_id) REFERENCES channels(id),
                FOREIGN KEY (replies_to) REFERENCES messages(id)
            )
        """)

        # Create last seen messages tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_last_seen (
                user_id INTEGER,
                channel_id INTEGER,
                last_seen_message_id INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, channel_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (channel_id) REFERENCES channels(id)
            )
        """)

        # Table for storing emoji reactions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                message_id INTEGER,
                emoji TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (message_id) REFERENCES messages(id),
                UNIQUE(user_id, message_id, emoji) -- Prevent duplicate reactions
            )
        """)

        conn.commit()

# Initialize the database
init_db()

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(channel_bp, url_prefix="/api/channel")  
app.register_blueprint(message_bp, url_prefix="/api/message")

if __name__ == "__main__":
    app.run(debug=True)

