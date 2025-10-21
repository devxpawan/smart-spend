import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  console.log(`Auth middleware called for ${req.method} ${req.path}`);
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("No token provided");
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const secret =
      process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    console.log("Token verified, user ID:", decoded.id);
    next();
  } catch (error) {
    console.log("Invalid token:", error.message);
    return res.status(403).json({ message: "Invalid token." });
  }
};