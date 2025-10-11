# Smart Spend

A web application for managing personal finances, including bills, expenses, income, and warranties. This project is a full-stack application built with React, Node.js, and MongoDB. It provides a secure and user-friendly way to track and manage your financial data.

## Features

- **User Authentication**
  - Secure login/registration system
  - Google OAuth integration
  - Protected routes

- **Income Management**
  - Record and categorize income
  - Track income sources
  - Analyze income trends

- **Expense Management**
  - Record and categorize expenses
  - Visual expense analytics
  - Track spending patterns

- **Bills Management**
  - Track recurring bills
  - Set due dates and payment reminders
  - View bill history and payment status

- **Warranty Management**
  - Store warranty information for products
  - Set warranty expiration reminders
  - Upload and store warranty documents
  - Automatic QR code generation for warranties
  - Public warranty access via QR codes
  - QR codes stored in Cloudinary for reliability

- **Image Upload & Storage**
  - Warranty document image uploads
  - User avatar uploads
  - Cloudinary integration for optimized storage

- **Data Analytics**
  - Expense management with visual charts
  - Monthly spending analysis
  - Income trend analysis and reporting
  - Bill payment management
  - Warranty expiration monitoring

- **Security Features**
  - JWT-based authentication
  - Password hashing with bcrypt
  - Protected API routes
  - Input validation and sanitization

## Tech Stack

### Frontend

- React with TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Chart.js
- Axios

### Backend

- Node.js
- Express
- MongoDB
- JWT Authentication
- Express Validator

## Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- npm
- Cloudinary account (for image storage)
- Google OAuth credentials (for authentication)

## Project Structure

The project is structured as a monorepo with two main directories:

- `client/`: A React (with TypeScript and Vite) single-page application for the frontend.
- `server/`: An Express.js backend providing a RESTful API.

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React context providers
│   │   ├── layouts/      # Page layouts
│   │   ├── pages/        # Application pages
│   │   └── types/        # TypeScript type definitions
│
└── server/              # Backend Node.js application
    ├── middleware/      # Express middlewares
    ├── models/          # MongoDB models
    ├── routes/          # API routes
    └── utils/           # Utility functions
```

## Environment Setup

The backend requires a `.env` file in the `server/` directory with the following variables:

```
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
GOOGLE_CLIENT_ID=<your_google_client_id>
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
EMAIL_USER=<your_email_address>
EMAIL_PASS=<your_email_password>
```

## Building and Running

### Client (Frontend)

The client-side is a React application built with Vite.

- **To install dependencies:**
  ```bash
  cd client
  npm install
  ```

- **To run in development mode (with hot-reloading):**
  ```bash
  cd client
  npm run dev
  ```
  This will start the development server, typically at `http://localhost:5173`.

- **To build for production:**
  ```bash
  cd client
  npm run build
  ```

- **To lint the code:**
  ```bash
  cd client
  npm run lint
  ```

### Server (Backend)

The server-side is a Node.js application using Express.

- **To install dependencies:**
  ```bash
  cd server
  npm install
  ```

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

## Development Conventions

- **Frontend:**
  - The frontend is built with React and TypeScript.
  - Styling is done using Tailwind CSS.
  - Components are located in `client/src/components`.
  - Pages are in `client/src/pages`.
  - The Vite development server proxies API requests from `/api` to the backend at `http://localhost:5000`.

- **Backend:**
  - The backend is built with Express and uses ES Modules.
  - It follows a standard structure with `routes`, `models`, and `middleware`.
  - Authentication is handled via JWTs.
  - Mongoose is used for MongoDB object modeling.
  - Input validation is performed using `express-validator`.

## License

This project is licensed under the ISC License.