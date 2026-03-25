

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");

const app = express();
connectDB();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/face", require("./routes/face.routes"));
// After your existing routes
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

