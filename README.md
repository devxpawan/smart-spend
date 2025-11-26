# Smart Spend

## Features

-   **Financial Tracking**: Manage income, expenses, and bills with categorization and analytics.
-   **Warranty Management**: Store product warranty details, set reminders, and generate QR codes for public access.
-   **User Authentication**: Secure login/registration, Google OAuth, and protected routes.
-   **Goal Planning**: Set financial goals with fixed monthly contributions that are automatically added.
-   **Automated Notifications**: Receive email and in-app notifications for goal expirations and contributions.
-   **Data & Security**: Visual analytics, JWT authentication, password hashing, and input validation.
-   **Cloud Integration**: Cloudinary for image uploads (warranty documents, user avatars).

## Tech Stack

-   **Frontend**: React with TypeScript, Vite, Tailwind CSS, Framer Motion, Chart.js, Axios.
-   **Backend**: Node.js, Express, MongoDB, JWT Authentication, Express Validator.

## Prerequisites

-   Node.js (v14 or higher)
-   MongoDB database
-   npm
-   Cloudinary account
-   Google OAuth credentials

## Environment Setup

### Backend (`server/.env`)

The backend requires a `.env` file in the `server/` directory with the following variables:

```
# MongoDB connection string
MONGODB_URI=<your_mongodb_connection_string>

# JWT secret for signing tokens
JWT_SECRET=<your_jwt_secret>

# Cloudinary credentials for image storage
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>

# Google OAuth client ID for authentication
GOOGLE_CLIENT_ID=<your_google_client_id>

# CORS origins for allowing frontend requests
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Email credentials for sending OTPs and other notifications
EMAIL_USER=<your_email_address>
EMAIL_PASS=<your_email_password>
```

### Frontend (`client/.env`)

The frontend requires a `.env` file in the `client/` directory with the following variables:

```
# The URL of the backend API
VITE_API_URL=<your_backend_api_url>

# Google OAuth client ID for authentication
VITE_GOOGLE_CLIENT_ID=<your_google_client_id>

# Web3Forms access key (for contact forms or similar)
VITE_WEB3FORMS_ACCESS_KEY=<your_web3forms_access_key>
```

## Building and Running

### Client (Frontend)

The client-side is a React application built with Vite.

-   **To run in development mode (with hot-reloading):**
    ```bash
    cd client
    npm run dev
    ```
    This will start the development server, typically at `http://localhost:5173`.

### Server (Backend)

The server-side is a Node.js application using Express.

- **To run in development mode (with auto-restarting via nodemon):**
  ```bash
  cd server
  npm run dev
  ```
  This will start the backend server, typically at `http://localhost:5000`.

- **To run in production mode:**
  ```bash
  cd server
  npm run start
  ```

## Goal Features

### Fixed Monthly Contributions
Users can set a fixed monthly contribution amount when creating or editing a goal. On the first day of each month, the system automatically adds this amount to the goal's saved amount.

### Automated Notifications
The system sends automated notifications and emails for:
- Goals expiring the next day (warning)
- Goals that have expired (follow-up)
- Monthly contributions added to goals (confirmation)

### Scheduled Jobs
Several background jobs run automatically:
- Daily at 9 AM: Check for expiring goals and send notifications
- First day of each month: Process monthly contributions for all goals
- Daily at midnight: Process recurring transactions

## License

This project is licensed under the ISC License.