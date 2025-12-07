# World Cup Prediction App

A full-stack application for predicting World Cup matches with group stage, third-place selection, and knockout bracket predictions.

## Features

- 🏟️ **Group Stage Predictions** - Drag and drop teams to rank all 12 groups
- 🥉 **Third Place Selection** - Choose 8 teams from third-place finishers to advance
- 🏆 **Knockout Bracket** - Predict winners through Round of 32, Round of 16, Quarter Finals, Semi Finals, and Final
- 📊 **Live Leaderboard** - Track rankings and compete with other users
- 🔒 **Submission Lock** - Predictions are locked once submitted
- ⚡ **Real-time Updates** - Automatic elimination as results are published

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- express-validator

### Frontend
- React 18
- React Router v6
- @dnd-kit (Drag and Drop)
- Axios
- Modern CSS

## Setup Instructions

### Prerequisites
- Node.js 16+ 
- PostgreSQL 13+
- npm or yarn

### Backend Setup

1. Navigate to API directory:
```bash
cd wc_api
```

2. Install dependencies:
```bash
npm install
```

3. Create PostgreSQL database:
```sql
CREATE DATABASE worldcup_predictions;
```

4. Run the SQL schema (from the schema file provided)

5. Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=worldcup_predictions
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
ADMIN_SECRET_KEY=your_admin_key
```

6. Start the server:
```bash
npm start
```

API will be running on `http://localhost:3000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd worldcup-prediction-client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm start
```

App will open at `http://localhost:3001`

## Usage

### For Users

1. **Register/Login** - Create an account or login
2. **Group Stage** - Drag teams to predict final rankings for all 12 groups
3. **Third Place** - Select 8 teams from the 12 third-place finishers to advance
4. **Knockout Stage** - Predict winner of each match through to the final
5. **Submit** - Lock in your predictions before the deadline
6. **Leaderboard** - Watch your ranking as results come in

### For Admins

Use the admin API endpoints with `X-Admin-Key` header:

**Set Deadline:**
```bash
curl -X POST http://localhost:3000/api/admin/deadline \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"deadline":"2026-06-14T23:59:00Z"}'
```

**Publish Group Results:**
```bash
curl -X POST http://localhost:3000/api/admin/groups/1/results \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rankings":[{"position":1,"teamId":1},{"position":2,"teamId":2},{"position":3,"teamId":3},{"position":4,"teamId":4}]}'
```

**Publish Match Result:**
```bash
curl -X POST http://localhost:3000/api/admin/matches/1/result \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"winnerTeamId":5}'
```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login
- `GET /api/users/profile` - Get user profile

### Predictions
- `GET /api/predictions/status` - Get prediction status
- `GET /api/predictions/my-predictions` - Get user's predictions
- `POST /api/predictions/groups/:groupId/rankings` - Submit group ranking
- `POST /api/predictions/third-place` - Submit third-place selections
- `POST /api/predictions/matches/:matchId` - Submit match prediction
- `POST /api/predictions/submit` - Submit and lock all predictions

### Admin
- `POST /api/admin/deadline` - Set prediction deadline
- `POST /api/admin/groups/:groupId/results` - Publish group results
- `POST /api/admin/third-place/results` - Publish third-place advancers
- `POST /api/admin/matches/:matchId/result` - Publish match result
- `GET /api/admin/statistics` - Get system statistics

### Leaderboard
- `GET /api/leaderboard` - Get full leaderboard
- `GET /api/leaderboard/active` - Get active users
- `GET /api/leaderboard/my-rank` - Get user's rank

## License

MIT
