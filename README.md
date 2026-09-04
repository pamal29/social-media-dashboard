# Social Media Dashboard

Node.js + Express + MongoDB + JWT backend for a social media dashboard: user registration/login, JWT auth, and CRUD on posts with pagination.

## Setup

```bash
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET
npm start
```

Server runs on `http://localhost:3000` by default.

## Endpoints

| Method | Route        | Auth required | Description                  |
|--------|-------------|----------------|-------------------------------|
| POST   | /register    | No             | Register a new user           |
| POST   | /login       | No             | Log in, returns JWT           |
| POST   | /logout      | Yes            | Log out (clears session)      |
| POST   | /post        | Yes            | Create a post                 |
| GET    | /posts       | Yes            | List posts (paginated)        |
| PUT    | /post/:id    | Yes            | Edit your own post            |
| DELETE | /post/:id    | Yes            | Delete your own post          |

Pass the JWT as `Authorization: Bearer <token>` on protected routes.

## Example curl commands

```bash
# Register
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"pamal29","email":"pamal@example.com","password":"password123"}'

# Register with existing details (expect 409)
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"username":"pamal29","email":"pamal@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pamal29","password":"password123"}'

# Login with wrong password (expect 401)
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pamal29","password":"wrongpassword"}'

# Create a post (replace TOKEN)
curl -X POST http://localhost:3000/post \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"content":"Hello world!"}'

# Get paginated posts
curl "http://localhost:3000/posts?page=1&limit=5" \
  -H "Authorization: Bearer TOKEN"

# Logout
curl -X POST http://localhost:3000/logout \
  -H "Authorization: Bearer TOKEN"
```
