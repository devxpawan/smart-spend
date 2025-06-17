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
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/bills/:id
router.get("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Get bill error:", error);
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

export default router;
