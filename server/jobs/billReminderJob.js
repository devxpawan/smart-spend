import cron from "node-cron";
import Bill from "../models/Bill.js";
import { sendBillReminderNotification } from "../utils/billNotifications.js";

// Daily at 9 AM by default; override with BILL_REMINDER_SCHEDULE
const schedule = process.env.BILL_REMINDER_SCHEDULE || "0 9 * * *";

console.log(`Scheduling bill reminder job with cron: ${schedule}`);

const billReminderJob = cron.schedule(schedule, async () => {
  console.log("Running bill reminder job...");
  try {
    const now = new Date();

    const bills = await Bill.find({
      isPaid: false,
      reminderDate: { $ne: null, $lte: now },
      reminderSentAt: { $in: [null, undefined] },
    }).populate("user");

    console.log(`Found ${bills.length} bills needing reminders`);

    for (const bill of bills) {
      try {
        if (!bill.user || bill.user.isVerified === false) continue;
        await sendBillReminderNotification(bill, bill.user);
        bill.reminderSentAt = new Date();
        await bill.save();
      } catch (error) {
        console.error(`Error processing reminder for bill ${bill._id}:`, error);
      }
    }

    console.log("Bill reminder job completed");
  } catch (error) {
    console.error("Error in bill reminder job:", error);
  }
});

export default billReminderJob;
