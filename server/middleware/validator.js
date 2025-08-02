import { body, param, query, validationResult } from "express-validator";

// Validation middleware
export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(
      validations.map((validation) => validation.run(req))
    );

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      errors: errors.array(),
    });
  };
};

// Auth validations
export const authValidation = {
  register: [
    body("name")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
      ),
  ],
  login: [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
};

// Warranty validations
export const warrantyValidation = {
  create: [
    body("productName")
      .trim()
      .notEmpty()
      .withMessage("Product name is required"),
    body("purchaseDate").isISO8601().withMessage("Invalid purchase date"),
    body("expirationDate")
      .isISO8601()
      .withMessage("Invalid expiration date"),
    body("retailer").trim().optional(),
    body("purchasePrice")
      .isFloat({ min: 0 })
      .optional()
      .withMessage("Purchase price must be a positive number"),
    body("category").trim().notEmpty().withMessage("Category is required"),
    body("documentUrls").isArray().optional(),
    body("documentUrls.*")
      .isURL()
      .optional()
      .withMessage("Invalid document URL"),
    body("notes").trim().optional(),
    body("reminderDate")
      .isISO8601()
      .optional()
      .withMessage("Invalid reminder date"),
  ],
  update: [
    param("id").isMongoId().withMessage("Invalid warranty ID"),
    body("productName").trim().optional(),
    body("purchaseDate")
      .isISO8601()
      .optional()
      .withMessage("Invalid purchase date"),
    body("expirationDate")
      .isISO8601()
      .optional()
      .withMessage("Invalid expiration date"),
    body("retailer").trim().optional(),
    body("purchasePrice")
      .isFloat({ min: 0 })
      .optional()
      .withMessage("Purchase price must be a positive number"),
    body("category").trim().optional(),
    body("documentUrls").isArray().optional(),
    body("documentUrls.*")
      .isURL()
      .optional()
      .withMessage("Invalid document URL"),
    body("notes").trim().optional(),
    body("reminderDate")
      .isISO8601()
      .optional()
      .withMessage("Invalid reminder date"),
  ],
  getById: [param("id").isMongoId().withMessage("Invalid warranty ID")],
  delete: [param("id").isMongoId().withMessage("Invalid warranty ID")],
  list: [
    query("category").trim().optional(),
    query("expired")
      .isBoolean()
      .optional()
      .withMessage("Invalid expired filter"),
    query("limit")
      .isInt({ min: 1, max: 100 })
      .optional()
      .withMessage("Limit must be between 1 and 100"),
    query("page")
      .isInt({ min: 1 })
      .optional()
      .withMessage("Page must be greater than 0"),
  ],
};
