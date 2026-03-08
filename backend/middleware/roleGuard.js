const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Requires authMiddleware to have run before this
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden. You do not have permission to perform this action.',
      });
    }
    next();
  };
};

module.exports = requireRole;
