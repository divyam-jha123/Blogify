# Blogging Application

A full-stack blogging platform built with Node.js, Express, and MongoDB. Users can sign up, log in, create blog posts with cover images, and browse a feed of all posts.

## Features

- **User authentication** — Sign up, log in, and log out with JWT-based sessions (stored in HTTP-only cookies)
- **Create blogs** — Add new posts with a title, content, and optional cover image
- **Browse feed** — Homepage shows all blogs sorted by newest first
- **View single blog** — Click a post to read the full content and see author info
- **Image uploads** — Cover images uploaded to Cloudinary and served via CDN

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Auto-restarting the server:** Nodemon
- **Template engine:** EJS
- **Auth:** JWT + bcrypt
- **File uploads:** Multer (memory storage)
- **Image hosting:** Cloudinary

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/) — either:
  - Local MongoDB installed and running, or
  - A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)
- [Cloudinary](https://cloudinary.com/) account (free tier works) — for image hosting

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/blogging-application.git
cd blogging-application
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Cloudinary

1. Create a free account at [Cloudinary](https://cloudinary.com/users/register_free)
2. Go to your [Dashboard](https://console.cloudinary.com/)
3. Copy the following credentials (you'll need them for the `.env` file):
   - **Cloud Name**
   - **API Key**
   - **API Secret** 
### 4. Environment variables

Create a `.env` file in the project root (same folder as `package.json`):

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/blogging-app
SECRET_KEY=your-super-secret-jwt-key-change-in-production
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

- **`PORT`** — Port the server runs on (e.g. `3000`).
- **`MONGO_URI`** — MongoDB connection string.
  - Local: `mongodb://localhost:27017/blogging-app`
  - Atlas: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/blogging-app?retryWrites=true&w=majority`
- **`SECRET_KEY`** — Secret used to sign JWT tokens. Use a long, random string in production.
- **`CLOUDINARY_CLOUD_NAME`** — Your Cloudinary cloud name. Get this from your [Cloudinary Dashboard](https://console.cloudinary.com/).
- **`CLOUDINARY_API_KEY`** — Your Cloudinary API key. Get this from your [Cloudinary Dashboard](https://console.cloudinary.com/).
- **`CLOUDINARY_API_SECRET`** — Your Cloudinary API secret. Get this from your [Cloudinary Dashboard](https://console.cloudinary.com/).

> **Note:** `.env` is gitignored. Never commit real secrets.

### 5. Run the app

**Production mode:**

```bash
npm start
```

**Development mode (with auto-restart):**

```bash
npm run dev
```

The server runs at `http://localhost:3000` (or whatever `PORT` you set).

### 6. Create an account

1. Open `http://localhost:3000` in your browser.
2. You’ll be redirected to **Login**. Use **Sign up** to create an account.
3. After signup, log in with your email and password.
4. Use **Add new blog** to create posts.

## Project Structure

```
blogging-application/
├── db/
│   └── connection.js      # MongoDB connection
├── middlewares/
│   └── auth.js            # JWT cookie auth & route protection
├── models/
│   ├── blog.js            # Blog post schema
│   └── user.js            # User schema
├── public/
│   └── image/             # Static images (e.g. default avatar)
├── routes/
│   ├── blog.js            # Blog CRUD & Cloudinary image upload
│   └── user.js            # Auth routes (signup, login, logout)
├── service/
│   └── authentication.js  # JWT create/verify helpers
├── views/                 # EJS templates
│   ├── addBlogs.ejs
│   ├── blog.ejs
│   ├── homepage.ejs
│   ├── login.ejs
│   ├── signup.ejs
│   └── partials/
├── .env                   # Your env vars (create this, not in git)
├── .gitignore
├── index.js               # App entry point
├── package.json
└── README.md
```

## Scripts

| Command     | Description                    |
|------------|--------------------------------|
| `npm start` | Run the server                 |
| `npm run dev` | Run with nodemon (auto-reload) |

