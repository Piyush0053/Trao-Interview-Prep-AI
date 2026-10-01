require('dotenv').config();
const app = require('./app');
const connectDB = require('./models/db');

const PORT = process.env.PORT || 8099;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
