# Belay - A Slack-like Messaging App

## Backend Setup

1. Navigate to `backend/` and create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # Mac/Linux
   venv\Scripts\activate     # Windows
   ```
2. Install dependencies:
   ```
   pip install -r requirements.txt
   pip install flask_cors
   ```
3. Start the Flask server:
   ```
   flask run
   ```

## Frontend Setup

1. Navigate to `frontend/`:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the React app:
   ```
   npm start
   ```

The backend runs on `http://127.0.0.1:5000/` and the frontend runs on `http://localhost:3000/`.
