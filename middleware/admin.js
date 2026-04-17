
module.exports = (req, res, next) => {
   console.log("REQ.USER:", req.user); 
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
};
