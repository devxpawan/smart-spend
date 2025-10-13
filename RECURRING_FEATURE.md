# Recurring Transactions Feature

## Overview

The Recurring Transactions feature in SmartSpend allows users to automatically create income and expense records at regular intervals. This eliminates the need to manually enter transactions that occur on a regular basis, such as monthly subscriptions, salaries, or rent payments.

## How It Works

### 1. Creating Recurring Transactions

Users can create recurring transactions in the Expenses and Incomes sections by:

1. Adding a new transaction or editing an existing one
2. Checking the "Make this a recurring [expense/income]" checkbox
3. Selecting a recurring interval (daily, weekly, monthly, or yearly)
4. Optionally setting an end date for the recurrence

### 2. Managing Recurring Transactions

The "Recurring" section in the navigation allows users to:

- View all current recurring transactions
- See upcoming transaction dates
- Remove the recurring status from transactions

### 3. Backend Processing

The system includes a processor that runs daily to:

- Identify recurring transactions due for processing
- Create new transaction records
- Update the next occurrence date
- Handle end dates for recurring transactions

## Implementation Details

### Database Schema

The feature extends the existing Expense and Income models with the following fields:

- `isRecurring`: Boolean indicating if the transaction is recurring
- `recurringInterval`: String enum ("daily", "weekly", "monthly", "yearly")
- `recurringEndDate`: Date when the recurrence should stop (optional)
- `nextRecurringDate`: Date when the next occurrence is due

### API Endpoints

- `GET /api/recurring` - Get all recurring transactions for a user
- `PUT /api/recurring/:id?type=[expense|income]` - Update a recurring transaction
- `DELETE /api/recurring/:id?type=[expense|income]` - Remove recurring status from a transaction

### Frontend Components

- `Recurring.tsx` - Main page for viewing and managing recurring transactions
- `RecurringInfo.tsx` - Informational component explaining the feature
- Modified `ExpenseModal.tsx` and `IncomeModal.tsx` to include recurring options

## Setup and Configuration

### Backend

1. The recurring fields are already added to the Expense and Income models
2. The API routes have been updated to handle recurring transaction data
3. A utility script (`recurringProcessor.js`) is available for processing recurring transactions

### Frontend

1. The navigation has been updated to include a "Recurring" link
2. The Expense and Income forms now include recurring options
3. A dedicated Recurring Transactions page allows users to manage their recurring transactions

## Usage Examples

### Example 1: Monthly Netflix Subscription

1. Create a new expense:
   - Description: "Netflix Subscription"
   - Amount: 15.99
   - Category: "Entertainment"
   - Date: 2023-10-15
   - Check "Make this a recurring expense"
   - Select "Monthly" interval
   - No end date (continues indefinitely)

2. The system will automatically create a new expense record on the 15th of each month.

### Example 2: Weekly Grocery Shopping

1. Create a new expense:
   - Description: "Weekly Groceries"
   - Amount: 80.00
   - Category: "Groceries"
   - Date: 2023-10-10
   - Check "Make this a recurring expense"
   - Select "Weekly" interval
   - Set end date: 2023-12-31

2. The system will create a new expense record every Tuesday until December 31, 2023.

## Benefits

- **Time-saving**: Eliminates manual entry for regular transactions
- **Accuracy**: Reduces the chance of forgetting to record regular expenses or incomes
- **Planning**: Helps users anticipate future financial obligations
- **Consistency**: Ensures regular transactions are recorded with consistent details

## Limitations

- The recurring processor script needs to be run as a scheduled job (e.g., via cron)
- Users must manually trigger the creation of recurring transactions in the current implementation
- No notification system is currently implemented to alert users of upcoming recurring transactions

## Future Enhancements

- Implement automated processing via scheduled jobs
- Add email/SMS notifications for upcoming recurring transactions
- Allow users to preview upcoming recurring transactions
- Add the ability to pause recurring transactions temporarily
- Implement more complex recurrence patterns (e.g., "every 2 weeks", "last day of the month")