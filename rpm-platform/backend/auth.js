// auth.js — password hashing, JWT issue/verify, and Express middleware.

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In production, load from an environment variable / secrets manager.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const TOKEN_TTL = '8h';

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function issueToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    patientId: user.patientId || null
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Require a valid Bearer token; attaches req.user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Require one of the given roles (use after requireAuth).
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { verifyPassword, issueToken, requireAuth, requireRole, JWT_SECRET };
