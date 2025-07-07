// Auth middleware: expects Authorization: Bearer <JWT>
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.replace('Bearer ', '').trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
        const user = await User.findOne({ email: decoded.email });
        if (user) {
          req.user = user;
        }
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
    }
  }
  next();
};
