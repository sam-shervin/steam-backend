
# Steam Backend

This is the backend for the Steam application, built with Node.js, Express, Prisma, and PostgreSQL. It includes authentication using Auth0 and various endpoints for managing user profiles, complaints, and more.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Endpoints](#endpoints)
  - [Authentication](#authentication)
  - [User Profile](#user-profile)
  - [Complaints](#complaints)
  - [Heatmap](#heatmap)
- [Docker Setup](#docker-setup)

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/steam-backend.git
   cd steam-backend
   ```

2. Install dependencies:
   ```sh
   npm install -g pnpm
   pnpm install
   ```

3. Set up the database:
   ```sh
   pnpx prisma migrate dev --name init
   ```

## Environment Variables

Create a 

.env

 file in the root directory and add the following environment variables:

```properties
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>?schema=<schema>"
POSTGRES_PASSWORD="<your_postgres_password>"
NODE_ENV="production"

AUTH_SECRET="<your_auth_secret>"
BASE_URL="<your_base_url>"
CLIENT_ID="<your_client_id>"
ISSUER_BASE_URL="<your_issuer_base_url>"

GOOGLE_CLIENT_ID="<your_google_client_id>"
GOOGLE_CLIENT_SECRET="<your_google_client_secret>"
```

## Running the Application

1. Start the application:
   ```sh
   node index.js
   ```

2. The server will be running on `http://localhost:8032`.

## Endpoints

### Authentication

- **GET /checkSession**: Check if the user is authenticated.
- **GET /letmein**: Redirects to login if not authenticated, otherwise logs in the user.

### User Profile

- **GET /self**: Get the authenticated user's profile information.
- **PUT /profileUpdate**: Update the authenticated user's profile.

### Complaints

- **GET /complaints**: Get all complaints (admin only).
- **PUT /complaintStatus**: Change the status of a complaint (admin only).
- **POST /complaint**: Submit a new complaint.
- **GET /myComplaints**: Get the authenticated user's complaints.

### Heatmap

- **GET /map**: Get the heatmap for a given location.

## Docker Setup

1. Build and run the Docker containers:
   ```sh
   docker-compose up --build
   ```

2. The backend will be running on `http://localhost:8032` and the NGINX server will be running on `https://localhost`.

## File Structure

```
.
├── .dockerignore
├── .env
├── .env.example
├── .gitignore
├── backend.Dockerfile
├── compose.yaml
├── index.js
├── map.html
├── nginx.conf
├── package.json
├── pnpm-lock.yaml
├── prisma
│   ├── schema.prisma
├── ssl
│   ├── nginx.crt
│   ├── nginx.key
└── foli.py
```

## License

This project is licensed under the MIT License.
