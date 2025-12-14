import { Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./layouts/DashboardLayout";
import Bills from "./pages/Bills";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Incomes from "./pages/Incomes";
import MonthlyBreakdown from "./pages/MonthlyBreakdown";

import OnlineStatusIndicator from "./components/OnlineStatusIndicator";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/auth-exports";
import About from "./pages/About";
import BankAccounts from "./pages/BankAccounts";
import CustomCategories from "./pages/CustomCategories";
import GoalsAndAchievements from "./pages/GoalsAndAchievements";
import LoginRegister from "./pages/LoginRegister";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import PublicWarrantyDetails from "./pages/PublicWarrantyDetails";
import Recurring from "./pages/Recurring";
import Warranties from "./pages/Warranties";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <OnlineStatusIndicator />
      <Routes>
        {/* Public Routes */}
        <Route path="/warranty/:id" element={<PublicWarrantyDetails />} />

        {/* Auth Routes */}
        <Route path="/auth" element={<LoginRegister />} />
        
        {/* Dashboard Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          {/* Expense Routes */}
          <Route path="incomes" element={<Incomes />} />
          <Route path="expenses" element={<Expenses />} />

          {/* Bill Routes */}
          <Route path="bills" element={<Bills />} />

          {/* Monthly Breakdown */}
          <Route path="monthly" element={<MonthlyBreakdown />} />

          {/* Recurring Transactions */}
          <Route path="recurring" element={<Recurring />} />

          {/* Goal Planning & Achievements */}
          <Route path="goals" element={<GoalsAndAchievements />} />

          {/* Warranty Routes */}
          <Route path="warranties" element={<Warranties />} />
          {/* Profile */}
          <Route path="profile" element={<Profile />} />
          <Route path="about" element={<About />} />
          <Route path="bank-accounts" element={<BankAccounts />} />
          <Route path="customcategories" element={<CustomCategories/>}/>
        </Route>
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;