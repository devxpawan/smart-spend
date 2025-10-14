# Recurring Transactions Feature

## Overview

The recurring transactions feature allows users to set up transactions that automatically repeat at specified intervals. This is useful for regular expenses like subscriptions or regular incomes like salaries.

## Implementation Details

### Data Model

Recurring transactions use additional fields in the existing Expense and Income models:
- `isRecurring` (boolean) - indicates if the transaction is recurring
- `recurringInterval` (string) - the interval at which the transaction recurs (daily, weekly, monthly, yearly)
- `nextRecurringDate` (date) - the next date the transaction will recur
- `recurringEndDate` (date, optional) - the date after which the transaction will no longer recur

### API Endpoints

- `GET /api/recurring` - Get all recurring transactions for a user
- `PUT /api/recurring/:id?type=[expense|income]` - Update a recurring transaction
- `DELETE /api/recurring/:id?type=[expense|income]` - Remove recurring status from a transaction

### Frontend Components

- `Recurring.tsx` - Main page for viewing and managing recurring transactions
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