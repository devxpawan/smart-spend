import express from 'express';
import { check, validationResult } from 'express-validator';
import Warranty from '../models/Warranty.js';

const router = express.Router();

// @route   GET /api/warranties/expiring/soon
// @desc    Get warranties expiring soon
// @access  Private
// IMPORTANT: This must come BEFORE the /:id route
router.get('/expiring/soon', async (req, res) => {
  try {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const expiringWarranties = await Warranty.find({
      user: req.user.id,
      expirationDate: { $gte: today, $lte: nextMonth }
    }).sort({ expirationDate: 1 });
    
    res.json(expiringWarranties);
  } catch (error) {
    console.error('Get expiring warranties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/warranties
// @desc    Get all warranties for a user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { category, expired, limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const filter = { user: req.user.id };
    
    if (category) {
      filter.category = category;
    }
    
    const today = new Date();
    if (expired === 'true') {
      filter.expirationDate = { $lt: today };
    } else if (expired === 'false') {
      filter.expirationDate = { $gte: today };
    }
    
    const total = await Warranty.countDocuments(filter);
    
    const warranties = await Warranty.find(filter)
      .sort({ expirationDate: 1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    res.json({
      warranties,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get warranties error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warranties
// @desc    Create a new warranty
// @access  Private
router.post('/', [
  check('productName', 'Product name is required').trim().notEmpty(),
  check('expirationDate', 'Expiration date is required').notEmpty(),
  check('category', 'Category is required').notEmpty(),
  check('purchasePrice', 'Purchase price must be a number').optional().isNumeric(),
  check('retailer', 'Retailer name is invalid').optional().trim(),
  check('notes', 'Notes are invalid').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      productName,
      purchaseDate,
      expirationDate,
      retailer,
      purchasePrice,
      category,
      documentUrls,
      notes,
      reminderDate,
      currency
    } = req.body;

    // Validate dates
    const expDate = new Date(expirationDate);
    if (isNaN(expDate.getTime())) {
      return res.status(400).json({ message: 'Invalid expiration date format' });
    }

    if (purchaseDate) {
      const purDate = new Date(purchaseDate);
      if (isNaN(purDate.getTime())) {
        return res.status(400).json({ message: 'Invalid purchase date format' });
      }
    }
    
    const newWarranty = new Warranty({
      user: req.user.id,
      productName: productName.trim(),
      purchaseDate: purchaseDate || null,
      expirationDate: expDate,
      retailer: retailer?.trim() || null,
      purchasePrice: purchasePrice || null,
      category,
      documentUrls: documentUrls || [],
      notes: notes?.trim() || null,
      reminderDate: reminderDate || null,
      currency: currency || "USD"
    });

    const warranty = await newWarranty.save();
    res.status(201).json(warranty);
  } catch (error) {
    console.error('Create warranty error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid data provided',
        details: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate warranty entry' });
    }
    
    res.status(500).json({ message: 'Server error creating warranty' });
  }
});

// @route   GET /api/warranties/:id
// @desc    Get warranty by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!warranty) {
      return res.status(404).json({ message: 'Warranty not found' });
    }
    
    res.json(warranty);
  } catch (error) {
    console.error('Get warranty error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid warranty ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/warranties/:id
// @desc    Update warranty
// @access  Private
router.put('/:id', [
  check('productName', 'Product name is required').optional().trim().notEmpty(),
  check('expirationDate', 'Invalid expiration date').optional().isISO8601(),
  check('category', 'Category is required').optional().notEmpty(),
  check('purchasePrice', 'Purchase price must be a number').optional().isNumeric()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      productName,
      purchaseDate,
      expirationDate,
      retailer,
      purchasePrice,
      category,
      documentUrls,
      notes,
      reminderDate,
      currency
    } = req.body;

  const warranty = await Warranty.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!warranty) {
      return res.status(404).json({ message: 'Warranty not found' });
    }
    
    // Update fields
    if (productName !== undefined) warranty.productName = productName.trim();
    if (purchaseDate !== undefined) warranty.purchaseDate = purchaseDate;
    if (expirationDate !== undefined) warranty.expirationDate = expirationDate;
    if (retailer !== undefined) warranty.retailer = retailer?.trim() || null;
    if (purchasePrice !== undefined) warranty.purchasePrice = purchasePrice;
    if (category !== undefined) warranty.category = category;
    if (documentUrls !== undefined) warranty.documentUrls = documentUrls;
    if (notes !== undefined) warranty.notes = notes?.trim() || null;
    if (reminderDate !== undefined) warranty.reminderDate = reminderDate;
    if (currency !== undefined) warranty.currency = currency;

    const updatedWarranty = await warranty.save();
    res.json(updatedWarranty);
  } catch (error) {
    console.error('Update warranty error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid warranty ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/warranties/:id
// @desc    Delete warranty
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const warranty = await Warranty.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!warranty) {
      return res.status(404).json({ message: 'Warranty not found' });
    }
    
    await warranty.deleteOne();
    res.json({ message: 'Warranty removed' });
  } catch (error) {
    console.error('Delete warranty error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid warranty ID' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
