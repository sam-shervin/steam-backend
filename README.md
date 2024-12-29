
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

---

## **System Architecture Overview**
Your architecture integrates multiple components to provide a seamless, secure, and scalable solution. Below is a breakdown of each part of the system:

---

### **Core Infrastructure**
1. **Docker**  
   - Containerized setup ensures modular and portable development.
   - Services hosted as containers:
     - **webServer (Node.js)**: Hosts backend APIs.
     - **Database (PostgreSQL)**: Stores application data.
     - **Nginx**: Acts as a reverse proxy and handles SSL termination.
   - Facilitates orchestration of services and simplifies deployment.

2. **Cloudflared (Cloudflare Tunnel)**  
   - Exposes the locally deployed Docker services to a publicly accessible domain.
   - Uses Cloudflare DNS for routing traffic securely.
   - Eliminates the need for direct public IP exposure.

---

### **Frontend**
1. **Next.js (React-based Framework)**  
   - Developed for the user-facing application.
   - Fetches data from backend APIs to perform CRUD operations.
   - Implements CI/CD pipeline with **Cloudflare Pages**:
     - Code hosted on GitHub.
     - Automatic builds and deployments triggered on new commits.

2. **Heatmap Generation**
   - Coordinates collected from user interactions are sent to the backend via fetch requests.
   - Frontend displays processed heatmaps to users and NGOs after receiving results.

---

### **Authentication Layer**
1. **Auth0**  
   - Middleware service for user authentication and management.
   - Provides secure user discretization and role-based access control (e.g., users, NGOs).

---

### **Backend**
1. **Node.js Backend**  
   - Manages API requests from the frontend.
   - Performs CRUD operations on the PostgreSQL database.
   - Acts as a gateway for processing heatmap data.

2. **Integration with Deep Learning Model**  
   - Backend forwards heatmap coordinates to a dedicated Deep Learning Model API.
   - The model processes the data and returns relevant results.
   - Backend relays processed data to the frontend.

---

### **Database**
1. **PostgreSQL**  
   - Relational database for structured storage of user, heatmap, and application data.
   - Optimized for performance and scalability with Dockerized setup.

---

### **Security and Performance**
1. **Nginx (SSL Termination)**  
   - Encrypts data in transit between clients and server using HTTPS.
   - Manages load balancing and reverse proxy to backend services.
   
2. **Cloudflare**  
   - Protects the domain from attacks using DDoS protection and Web Application Firewall (WAF).
   - Ensures low-latency delivery through its global CDN.

---

### **Data Flow**
1. **Frontend to Backend**  
   - Frontend sends API requests (e.g., CRUD operations, heatmap coordinates).
   - Backend processes requests and communicates with PostgreSQL or the Deep Learning Model API.

2. **Backend to Deep Learning Model**  
   - Heatmap data sent for analysis.
   - Processed results returned to backend.

3. **Frontend to Users/NGOs**  
   - Processed heatmaps and relevant data are displayed to users in real time.

---

### **CI/CD Workflow**
1. **Frontend**  
   - Code changes on GitHub trigger Cloudflare Pages for automatic builds and deployments.

2. **Backend**  
   - Dockerized services allow rapid updates with minimal downtime.

---