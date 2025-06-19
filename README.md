# SmartSpend 💰

A comprehensive web application for managing personal finances, including bills, expenses, and warranties. SmartSpend helps users track their spending, manage recurring bills, and keep track of product warranties all in one place.

## Features ✨

- **User Authentication** 🔐

  - Secure login/registration system
  - Google OAuth integration
  - Protected routes for authenticated users

- **Bills Management** 📝

  - Track recurring bills
  - Set due dates and payment reminders
  - View bill history and payment status

- **Expense Tracking** 💳

  - Record and categorize expenses
  - Visual expense analytics with Chart.js
  - Track spending patterns

- **Warranty Management** 📋
  - Store warranty information for products
  - Set warranty expiration reminders
  - Upload and store warranty documents

## Technologies Used 💻

### Frontend

- React ⚛️
- TypeScript 🟦
- Vite ⚡
- Tailwind CSS 💨
- Framer Motion 🎨
- Chart.js 📊
- Axios 🌐

### Backend

- Node.js 🟢
- Express 🚀
- MongoDB 🌿
- JWT Authentication 🔑
- Express Validator ✅
- Rate Limiting 🚦

## Getting Started 🚀

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/smartspend.git
cd smartspend
```

2. Install Frontend Dependencies

```bash
cd client
npm install
```

3. Install Backend Dependencies

```bash
cd ../server
npm install
```

4. Set up Environment Variables
   Create `.env` files in both client and server directories with necessary configurations.

### Running the Application

1. Start the Backend Server

```bash
cd server
npm run dev
```

2. Start the Frontend Development Server

```bash
cd client
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure 📁

```
smartspend/
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
    └── uploads/         # File upload directory
```

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the ISC License.

## Contact 📧

For any queries or support, please open an issue in the repository.