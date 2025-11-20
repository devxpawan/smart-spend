import { check, validationResult } from "express-validator";
import express from "express";
import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Expense from "../models/Expense.js";
import BankAccount from "../models/BankAccount.js";

const router = express.Router();

// @route   GET /api/bills
router.get("/", async (req, res) => {
  try {
    const { isPaid, upcoming, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { user: req.user.id };

    if (isPaid !== undefined) {
      filter.isPaid = isPaid === "true";
    }

    if (upcoming === "true") {
      const today = new Date();
      filter.dueDate = { $gte: today };
      filter.isPaid = false;
    }

    const total = await Bill.countDocuments(filter);
    const bills = await Bill.find(filter)
      .populate("bankAccount", "accountName bankName")
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    res.json({
      bills,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/bills
router.post(
  "/",
  [
    check("name", "Bill name is required").trim().notEmpty().matches(/[a-zA-Z]/).withMessage("Bill name must contain at least one alphabetic character"),
    check("amount", "Amount is required and must be a number").isNumeric(),
    check("dueDate", "Due date is required and must be a valid date").isISO8601().toDate(),
    check("category", "Category is required").notEmpty(),
    check("bankAccount", "Bank account is required").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        name,
        amount,
        dueDate,
        category,
        isPaid,
        reminderDate,
        notes,
        bankAccount,
      } = req.body;

      const existingBill = await Bill.isDuplicateName(req.user.id, name);
      if (existingBill) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: "Duplicate bill name",
          message: "A bill with this name already exists",
        });
      }

      const newBill = new Bill({
        user: req.user.id,
        name,
        amount,
        dueDate,
        category,
        isPaid,
        reminderDate,
        notes,
        bankAccount,
      });

      const bill = await newBill.save({ session });



      await session.commitTransaction();
      session.endSession();
      res.status(201).json(bill);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Create bill error:", error);

      if (error.name === "DuplicateBillNameError") {
        return res.status(400).json({
          error: "Duplicate bill name",
          message: "A bill with this name already exists",
        });
      }

      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/bills/:id
router.put(
  "/:id",
  [
    check("name", "Bill name must contain at least one alphabetic character")
      .optional()
      .trim()
      .notEmpty()
      .matches(/[a-zA-Z]/),
    check("amount", "Amount must be a number").optional().isNumeric(),
    check("dueDate", "Due date must be a valid date")
      .optional()
      .isISO8601()
      .toDate(),
    check("category", "Category is required").optional().notEmpty(),
    check("bankAccount", "Bank account is required").optional().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const {
        name,
        amount,
        dueDate,
        category,
        isPaid,
        reminderDate,
        notes,
        bankAccount,
      } = req.body;

      const bill = await Bill.findOne({
        _id: req.params.id,
        user: req.user.id,
      }).session(session);

      if (!bill) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Bill not found" });
      }

      // If marking as unpaid, delete the associated expense
      if (isPaid === false && bill.isPaid === true) {
        const expense = await Expense.findOne({ bill: bill._id }).session(
          session
        );

        if (expense) {
          if (expense.bankAccount) {
            const account = await BankAccount.findById(
              expense.bankAccount
            ).session(session);
            if (account) {
              account.currentBalance += expense.amount;
              await account.save({ session });
            }
          }
          await expense.deleteOne({ session });
        }
      }


      // Check for duplicate bill name if name is being changed
      if (name && name !== bill.name) {
        const existingBill = await Bill.isDuplicateName(
          req.user.id,
          name,
          req.params.id
        );
        if (existingBill) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            error: "Duplicate bill name",
            message: "A bill with this name already exists",
          });
        }
      }

      if (name) bill.name = name;
      if (amount !== undefined) bill.amount = amount;
      if (dueDate) bill.dueDate = dueDate;
      if (category) bill.category = category;
      if (isPaid !== undefined) bill.isPaid = isPaid;
      if (reminderDate) bill.reminderDate = reminderDate;
      if (notes !== undefined) bill.notes = notes;
      if (bankAccount) bill.bankAccount = bankAccount;

      const updatedBill = await bill.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.json(updatedBill);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Update bill error:", error);

      if (error.name === "DuplicateBillNameError") {
        return res.status(400).json({
          error: "Duplicate bill name",
          message: "A bill with this name already exists",
        });
      }

      res.status(500).json({ message: "Server error" });
    }
  }
);


// @route   DELETE /api/bills/:id
router.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).session(session);

    if (!bill) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Bill not found" });
    }



    await bill.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Bill removed" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delete bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/bills/upcoming/reminders
router.get("/upcoming/reminders", async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingBills = await Bill.find({
      user: req.user.id,
      dueDate: { $gte: today, $lte: nextWeek },
      isPaid: false,
    }).sort({ dueDate: 1 });

    res.json(upcomingBills);
  } catch (error) {
    console.error("Get bill reminders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/bills/:id/pay
router.put("/:id/pay", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!req.user || !req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid bill ID" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).session(session);

    if (!bill) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.isPaid) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Bill is already paid" });
    }

    if (!bill.bankAccount) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "No bank account selected for this bill." });
    }

    bill.isPaid = true;
    const updatedBill = await bill.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json(updatedBill);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Pay bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// @route   GET /api/bills/monthly/:year/:month
// @desc    Get bills for a specific month
// @access  Private
router.get("/monthly/:year/:month", async (req, res) => {
  try {
    const { year, month } = req.params;
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(
      parseInt(year),
      parseInt(month),
      0,
      23,
      59,
      59
    );

    const filter = {
      user: req.user.id,
      dueDate: { $gte: startDate, $lte: endDate },
    };

    const total = await Bill.countDocuments(filter);
    const bills = await Bill.find(filter)
      .sort({ dueDate: 1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Calculate summary for the month
    const paidBills = bills.filter((bill) => bill.isPaid);
    const unpaidBills = bills.filter((bill) => !bill.isPaid);

    const summary = {
      totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
      paidAmount: paidBills.reduce((sum, bill) => sum + bill.amount, 0),
      unpaidAmount: unpaidBills.reduce(
        (sum, bill) => sum + bill.amount,
        0
      ),
      totalCount: bills.length,
      paidCount: paidBills.length,
      unpaidCount: unpaidBills.length,
    };

    res.json({
      bills,
      summary,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get monthly bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/bills/check-name
// @desc    Check if a bill name already exists for the user
// @access  Private
router.post("/check-name", async (req, res) => {
  try {
    const { name, userId, billId } = req.body;

    if (!name || !userId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Name and user ID are required'
      });
    }

    const query = { user: userId, name };
    if (billId) {
      query._id = { $ne: billId };
    }

    const existingBill = await Bill.isDuplicateName(userId, name, billId);

    if (existingBill) {
      return res.status(400).json({
        error: 'Duplicate bill name',
        message: 'A bill with this name already exists'
      });
    }

    res.json({ available: true });
  } catch (error) {
    console.error("Check bill name error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/bulk-update", async (req, res) => {
  const { ids, updates } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "Bill IDs must be a non-empty array." });
  }

  if (typeof updates !== 'object' || updates === null || Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "Update data must be a non-empty object." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const updatePromises = ids.map(async (id) => {
      const bill = await Bill.findOne({ _id: id, user: req.user.id }).session(session);
      if (!bill) {
        console.warn(`Bill with ID ${id} not found for this user.`);
        return null;
      }

      const oldIsPaid = bill.isPaid;
      const newIsPaid = updates.isPaid;


      // Handle marking as unpaid
      if (newIsPaid === false && oldIsPaid === true) {
        const expense = await Expense.findOne({ bill: bill._id }).session(session);
        if (expense) {
          if (expense.bankAccount) {
            const account = await BankAccount.findById(expense.bankAccount).session(session);
            if (account) {
              account.currentBalance += expense.amount;
              await account.save({ session });
            }
          }
          await expense.deleteOne({ session });
        }
      }

      // Apply other updates
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          bill[key] = updates[key];
        }
      });

      return await bill.save({ session });
    });

    const updatedBills = await Promise.all(updatePromises);

    await session.commitTransaction();
    res.json({
      message: "Bills updated successfully",
      updatedCount: updatedBills.filter(b => b !== null).length
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Bulk bill update error:", error);
    res.status(500).json({ message: "Server error during bulk update.", error: error.message });
  } finally {
    if (session) session.endSession();
  }
});


// get count of custom reminders (unpaid bills)
router.get("/custom/reminders/count", async (req, res) => {
  try {
    const today = new Date();

    const reminderCount = await Bill.countDocuments({
      user: req.user.id,
      reminderDate: { $lte: today },
      isPaid: false,
    });

    res.json({ count: reminderCount });
  } catch (error) {
    console.error("Get custom bill reminders count error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
