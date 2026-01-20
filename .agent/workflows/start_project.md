---
description: Start the Left2Right application
---

# Start the Backend

1. Open a new terminal.
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Install dependencies (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```
4. Ensure your local MongoDB server is running on port 27017.
5. Start the FastAPI server:
   ```bash
   uvicorn server:app --reload
   ```

# Start the Frontend

1. Open a new terminal.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
4. Start the Expo development server:
   ```bash
   npx expo start
   ```
   - Press `a` to open in Android emulator.
   - Press `w` to open in web browser.
