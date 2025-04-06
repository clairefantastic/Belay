from flask import Blueprint, request, jsonify
import sqlite3
import bcrypt
import jwt  
import datetime

auth_bp = Blueprint("auth", __name__)
channel_bp = Blueprint("channel", __name__)
message_bp = Blueprint("message", __name__)

# Secret key for JWT signing
SECRET_KEY = "supersecretkey"

# Helper function to interact with SQLite
def query_db(query, args=(), commit=False, one=False):
    with sqlite3.connect("belay.db") as conn:
        cursor = conn.cursor()
        cursor.execute(query, args)
        result = cursor.fetchall()
        
        if commit:  # Only commit for write operations
            conn.commit()
        
    return (result[0] if result else None) if one else result

# Generate JWT Token 
def generate_jwt(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256").decode("utf-8")  # Ensure String

# Decode JWT Token
def decode_jwt(token):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

def verify_token(auth_header):
    """Manually verify JWT token from Authorization header."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded_token["user_id"]
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    try:
        query_db("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                 (username, password_hash), commit=True)
        return jsonify({"message": "User created successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username already exists"}), 400

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400

        user = query_db("SELECT id, password_hash FROM users WHERE username = ?", (username,), one=True)

        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        stored_hash = user[1]
        if not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
            return jsonify({"error": "Invalid credentials"}), 401

        access_token = generate_jwt(user[0])  # Generate JWT Token
        return jsonify({"access_token": access_token}), 200  

    except Exception as e:
        print("Error during login:", str(e))  # Debugging print
        return jsonify({"error": "Internal Server Error"}), 500

@auth_bp.route("/profile", methods=["GET"])
def profile():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)

    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]
    user = query_db("SELECT id, username FROM users WHERE id = ?", (user_id,), one=True)

    return jsonify({
        "id": user[0],
        "username": user[1]
    }), 200

@auth_bp.route("/profile/change-username", methods=["POST"])
def change_username():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)

    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]
    data = request.json
    new_username = data.get("new_username")

    if not new_username:
        return jsonify({"error": "New username required"}), 400

    existing_user = query_db("SELECT id FROM users WHERE username = ?", (new_username,), one=True)
    if existing_user:
        return jsonify({"error": "Username already taken"}), 400

    query_db("UPDATE users SET username = ? WHERE id = ?", (new_username, user_id), commit=True)
    return jsonify({"message": "Username updated successfully"}), 200

@auth_bp.route("/profile/change-password", methods=["POST"])
def change_password():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)

    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]
    data = request.json
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return jsonify({"error": "Old and new password required"}), 400

    user = query_db("SELECT password_hash FROM users WHERE id = ?", (user_id,), one=True)
    if not user or not bcrypt.checkpw(old_password.encode("utf-8"), user[0]):
        return jsonify({"error": "Incorrect old password"}), 401

    new_password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    query_db("UPDATE users SET password_hash = ? WHERE id = ?", (new_password_hash, user_id), commit=True)

    return jsonify({"message": "Password updated successfully"}), 200

@channel_bp.route("/create", methods=["POST"])
def create_channel():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)

    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    data = request.json
    channel_name = data.get("name")

    if not channel_name:
        return jsonify({"error": "Channel name required"}), 400

    existing_channel = query_db("SELECT id FROM channels WHERE name = ?", (channel_name,), one=True)
    if existing_channel:
        return jsonify({"error": "Channel name already taken"}), 400

    query_db("INSERT INTO channels (name) VALUES (?)", (channel_name,), commit=True)
    return jsonify({"message": f"Channel '{channel_name}' created successfully"}), 201

@channel_bp.route("/list", methods=["GET"])
def list_channels():
    channels = query_db("SELECT id, name FROM channels")
    return jsonify({"channels": [{"id": c[0], "name": c[1]} for c in channels]}), 200

@channel_bp.route("/join", methods=["POST"])
def join_channel():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)

    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]
    data = request.json
    channel_id = data.get("channel_id")

    if not channel_id:
        return jsonify({"error": "Channel ID required"}), 400

    existing_entry = query_db("SELECT last_seen_message_id FROM user_last_seen WHERE user_id = ? AND channel_id = ?", 
                              (user_id, channel_id), one=True)

    if existing_entry is None:
        query_db("INSERT INTO user_last_seen (user_id, channel_id, last_seen_message_id) VALUES (?, ?, ?)", 
                 (user_id, channel_id, 0), commit=True)

    return jsonify({"message": f"User {user_id} joined channel {channel_id}"}), 200

@message_bp.route("/send", methods=["POST"])
def send_message():
    """Handles sending messages, including replies to other messages."""
    auth_header = request.headers.get("Authorization")
    user_id = verify_token(auth_header)

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    channel_id = data.get("channel_id")
    text = data.get("text")
    replies_to = data.get("replies_to")  # Optional reply ID

    if not channel_id or not text:
        return jsonify({"error": "Missing channel_id or text"}), 400

    query_db(
        "INSERT INTO messages (user_id, channel_id, text, replies_to) VALUES (?, ?, ?, ?)",
        (user_id, channel_id, text, replies_to),
        commit=True,
    )

    return jsonify({"message": "Message sent"}), 201

@message_bp.route("/replies/<int:message_id>", methods=["GET"])
def get_replies(message_id):
    """Fetch replies for a specific message."""
    replies = query_db("""
        SELECT m.id, u.username, m.text 
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.replies_to = ?
        ORDER BY m.id ASC
    """, (message_id,))

    return jsonify({"replies": [{"id": r[0], "username": r[1], "text": r[2]} for r in replies]}), 200


@message_bp.route("/channel/<int:channel_id>/messages", methods=["GET"])
def get_messages(channel_id):
    auth_header = request.headers.get("Authorization")
    user_id = verify_token(auth_header)

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401  

    messages = query_db("""
        SELECT m.id, u.username, m.text, 
            (SELECT COUNT(*) FROM messages r WHERE r.replies_to = m.id) AS reply_count
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.channel_id = ? AND m.replies_to IS NULL
        ORDER BY m.id ASC
    """, (channel_id,))

    return jsonify({"messages": [{"id": msg[0], "username": msg[1], "text": msg[2], "reply_count": msg[3]} for msg in messages]})


@message_bp.route("/reply", methods=["POST"])
def reply_to_message():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)

    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]
    data = request.json
    channel_id = data.get("channel_id")
    text = data.get("text")
    parent_message_id = data.get("replies_to")

    if not channel_id or not text or not parent_message_id:
        return jsonify({"error": "Channel ID, reply text, and parent message ID required"}), 400

    query_db("INSERT INTO messages (user_id, channel_id, text, replies_to) VALUES (?, ?, ?, ?)", 
             (user_id, channel_id, text, parent_message_id), commit=True)

    return jsonify({"message": "Reply sent successfully"}), 201

@message_bp.route("/update_last_read", methods=["POST"])
def update_last_read():
    """Updates the last read message for a user in a specific channel."""
    auth_header = request.headers.get("Authorization")
    user_id = verify_token(auth_header)

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    channel_id = data.get("channel_id")
    last_seen_message_id = data.get("last_seen_message_id")

    if not channel_id or not last_seen_message_id:
        return jsonify({"error": "Missing channel_id or last_seen_message_id"}), 400

    # First check if record exists
    existing_record = query_db(
        "SELECT 1 FROM user_last_seen WHERE user_id = ? AND channel_id = ?",
        (user_id, channel_id),
        one=True
    )

    if existing_record:
        # Update existing record
        query_db(
            "UPDATE user_last_seen SET last_seen_message_id = ? WHERE user_id = ? AND channel_id = ?",
            (last_seen_message_id, user_id, channel_id),
            commit=True
        )
    else:
        # Insert new record
        query_db(
            "INSERT INTO user_last_seen (user_id, channel_id, last_seen_message_id) VALUES (?, ?, ?)",
            (user_id, channel_id, last_seen_message_id),
            commit=True
        )

    return jsonify({"message": "Last read message updated"}), 200

@channel_bp.route("/unread_counts", methods=["GET"])
def get_unread_counts():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)
    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]

    # Query unread messages for each channel (only count top-level messages)
    unread_counts = query_db("""
        SELECT c.id, c.name, 
            COALESCE(SUM(CASE WHEN m.id > COALESCE(uls.last_seen_message_id, 0) AND m.replies_to IS NULL THEN 1 ELSE 0 END), 0) AS unread_count
        FROM channels c
        LEFT JOIN messages m ON c.id = m.channel_id
        LEFT JOIN user_last_seen uls ON uls.channel_id = c.id AND uls.user_id = ?
        GROUP BY c.id, c.name
    """, (user_id,))

    return jsonify({
        "unread_counts": {str(row[0]): row[2] for row in unread_counts}
    }), 200

@message_bp.route("/react", methods=["POST"])
def add_reaction():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token required"}), 401

    token = auth_header.split(" ")[1] if " " in auth_header else auth_header
    decoded_token = decode_jwt(token)
    if not decoded_token:
        return jsonify({"error": "Invalid or expired token"}), 401

    user_id = decoded_token["user_id"]
    data = request.json
    message_id = data.get("message_id")
    emoji = data.get("emoji")

    if not message_id or not emoji:
        return jsonify({"error": "Missing message_id or emoji"}), 400

    try:
        query_db(
            """
            INSERT INTO reactions (user_id, message_id, emoji)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, message_id, emoji) DO NOTHING
            """,
            (user_id, message_id, emoji),
            commit=True,
        )
        return jsonify({"message": "Reaction added"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@message_bp.route("/reactions/<int:message_id>", methods=["GET"])
def get_reactions(message_id):
    reactions = query_db(
        """
        SELECT r.emoji, u.username
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        WHERE r.message_id = ?
        """,
        (message_id,),
    )

    reaction_dict = {}
    for emoji, username in reactions:
        if emoji not in reaction_dict:
            reaction_dict[emoji] = []
        reaction_dict[emoji].append(username)

    return jsonify(reaction_dict), 200
