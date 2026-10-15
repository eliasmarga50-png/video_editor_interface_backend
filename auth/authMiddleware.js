const jwt = require('jsonwebtoken');

const ROLE_ORDER = ['user', 'pro', 'admin'];

// Authentication: valid access token required. Sets req.user = { id, role }.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing access token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
    return res.status(401).json({ message });
  }
}

// Authorization: caller must have at least this role (user < pro < admin).
function requireRole(minimum) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    if (ROLE_ORDER.indexOf(req.user.role) < ROLE_ORDER.indexOf(minimum)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };