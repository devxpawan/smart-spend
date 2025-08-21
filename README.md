# Smart Spend

A web application for managing personal finances, including bills, expenses, and warranties. This project is a full-stack application built with React, Node.js, and MongoDB. It provides a secure and user-friendly way to track and manage your financial data.

## Features

**User Authentication**

  - Secure login/registration system
  - Google OAuth integration
  - Protected routes

**Bills Management**

  - Track recurring bills
  - Set due dates and payment reminders
  - View bill history and payment status

**Expense Tracking**

  - Record and categorize expenses
  - Visual expense analytics
  - Track spending patterns

**Warranty Management**

  - Store warranty information for products
  - Set warranty expiration reminders
  - Upload and store warranty documents

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

### Prerequisites

- Node.js (v14 or higher)
- MongoDB database
- npm
- Cloudinary account (for image storage)
- Google OAuth credentials (for authentication)

## Project Structure

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

## Key Features

### QR Code Generation

- Automatic QR code generation for warranties
- Public warranty access via QR codes
- QR codes stored in Cloudinary for reliability

### Image Upload & Storage

- Warranty document image uploads
- User avatar uploads
- Cloudinary integration for optimized storage

### Data Analytics

- Expense tracking with visual charts
- Monthly spending analysis
- Bill payment tracking
- Warranty expiration monitoring

### Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization

## License

This project is licensed under the ISC License.
