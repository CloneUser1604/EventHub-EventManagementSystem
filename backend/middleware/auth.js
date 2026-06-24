const { verifyAccessToken } = require('../utils/jwt');
const { unauthorizedResponse, forbiddenResponse } = require('../utils/response');
const { getPool, sql } = require('../config/db');

/**
 * Protect routes — verifies JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB to check isActive
    const pool = getPool();
    const result = await pool
      .request()
      .input('UserID', sql.Int, decoded.userId)
      .query(`
        SELECT UserID, FullName, Email, Role, IsActive, IsVerified, AvatarURL, University
        FROM Users
        WHERE UserID = @UserID
      `);

    const user = result.recordset[0];
    if (!user) return unauthorizedResponse(res, 'User not found');
    if (!user.IsActive) return unauthorizedResponse(res, 'Account has been deactivated');

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return unauthorizedResponse(res, 'Invalid access token');
    }
    if (error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Access token expired');
    }
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * Require email verification
 */
const requireVerified = (req, res, next) => {
  if (!req.user.IsVerified) {
    return forbiddenResponse(res, 'Please verify your email address first');
  }
  next();
};

/**
 * Role-based access control factory
 * Usage: authorize('Admin', 'Organizer')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return unauthorizedResponse(res);
    if (!roles.includes(req.user.Role)) {
      return forbiddenResponse(res, `Access restricted to: ${roles.join(', ')}`);
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present but doesn't block
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const pool = getPool();
    const result = await pool
      .request()
      .input('UserID', sql.Int, decoded.userId)
      .query(`SELECT UserID, FullName, Email, Role, IsActive, IsVerified, University FROM Users WHERE UserID = @UserID`);

    if (result.recordset[0]?.IsActive) {
      req.user = result.recordset[0];
    }
  } catch {
    // silently ignore
  }
  next();
};

module.exports = { authenticate, requireVerified, authorize, optionalAuth };
