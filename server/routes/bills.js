import express from "express";
import mongoose from "mongoose";
import Bill from "../models/Bill.js";

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
router.post("/", async (req, res) => {
  try {
    const {
      name,
      amount,
      dueDate,
      category,
      isRecurring,
      recurringPeriod,
      reminderDate,
      notes,
    } = req.body;

    // Check for duplicate bill name
    const existingBill = await Bill.isDuplicateName(req.user.id, name);
    if (existingBill) {
      return res.status(400).json({
        error: 'Duplicate bill name',
        message: 'A bill with this name already exists'
      });
    }

    const newBill = new Bill({
      user: req.user.id,
      name,
      amount,
      dueDate,
      category,
      isRecurring,
      recurringPeriod,
      reminderDate,
      notes,
    });

    const bill = await newBill.save();
    res.status(201).json(bill);
  } catch (error) {
    console.error("Create bill error:", error);

    if (error.name === 'DuplicateBillNameError') {
      return res.status(400).json({
        error: 'Duplicate bill name',
        message: 'A bill with this name already exists'
      });
    }

    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/bills/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      amount,
      dueDate,
      category,
      isRecurring,
      recurringPeriod,
      isPaid,
      reminderDate,
      notes,
    } = req.body;

    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Check for duplicate bill name if name is being changed
    if (name && name !== bill.name) {
      const existingBill = await Bill.isDuplicateName(req.user.id, name, req.params.id);
      if (existingBill) {
        return res.status(400).json({
          error: 'Duplicate bill name',
          message: 'A bill with this name already exists'
        });
      }
    }

    if (name) bill.name = name;
    if (amount !== undefined) bill.amount = amount;
    if (dueDate) bill.dueDate = dueDate;
    if (category) bill.category = category;
    if (isRecurring !== undefined) bill.isRecurring = isRecurring;
    if (recurringPeriod) bill.recurringPeriod = recurringPeriod;
    if (isPaid !== undefined) bill.isPaid = isPaid;
    if (reminderDate) bill.reminderDate = reminderDate;
    if (notes !== undefined) bill.notes = notes;

    const updatedBill = await bill.save();
    res.json(updatedBill);
  } catch (error) {
    console.error("Update bill error:", error);

    if (error.name === 'DuplicateBillNameError') {
      return res.status(400).json({
        error: 'Duplicate bill name',
        message: 'A bill with this name already exists'
      });
    }

    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/bills/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      amount,
      dueDate,
      category,
      isRecurring,
      recurringPeriod,
      isPaid,
      reminderDate,
      notes,
    } = req.body;

    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (name) bill.name = name;
    if (amount !== undefined) bill.amount = amount;
    if (dueDate) bill.dueDate = dueDate;
    if (category) bill.category = category;
    if (isRecurring !== undefined) bill.isRecurring = isRecurring;
    if (recurringPeriod) bill.recurringPeriod = recurringPeriod;
    if (isPaid !== undefined) bill.isPaid = isPaid;
    if (reminderDate) bill.reminderDate = reminderDate;
    if (notes !== undefined) bill.notes = notes;

    const updatedBill = await bill.save();
    res.json(updatedBill);
  } catch (error) {
    console.error("Update bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/bills/:id
router.delete("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    await bill.deleteOne();
    res.json({ message: "Bill removed" });
  } catch (error) {
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
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid bill ID" });
    }

    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    bill.isPaid = true;

    if (bill.isRecurring) {
      const newDueDate = new Date(bill.dueDate);

      switch (bill.recurringPeriod) {
        case "Weekly":
          newDueDate.setDate(newDueDate.getDate() + 7);
          break;
        case "Monthly":
          newDueDate.setMonth(newDueDate.getMonth() + 1);
          break;
        case "Quarterly":
          newDueDate.setMonth(newDueDate.getMonth() + 3);
          break;
        case "Annually":
          newDueDate.setFullYear(newDueDate.getFullYear() + 1);
          break;
        default:
          newDueDate.setMonth(newDueDate.getMonth() + 1);
      }

      const newReminderDate = new Date(newDueDate);
      newReminderDate.setDate(newReminderDate.getDate() - 3);

      const newBill = new Bill({
        user: bill.user,
        name: bill.name,
        amount: bill.amount,
        dueDate: newDueDate,
        category: bill.category,
        isRecurring: bill.isRecurring,
        recurringPeriod: bill.recurringPeriod,
        reminderDate: newReminderDate,
        notes: bill.notes,
      });

      try {
        await newBill.save();
      } catch (newSaveErr) {
        console.error("Error saving new recurring bill:", newSaveErr);
        return res
          .status(500)
          .json({ message: "Failed to create next recurring bill" });
      }
    }

    try {
      const updatedBill = await bill.save();
      res.json(updatedBill);
    } catch (saveError) {
      console.error("Error saving paid bill:", saveError, saveError.stack);
      res.status(500).json({ message: "Failed to update bill status" });
    }
  } catch (error) {
    console.error("Pay bill error:", error);
    res.status(500).json({ message: "Server error" });
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

export default router;
