require('dotenv').config();
const app = require('./app');
const { migrate } = require('./migrate');

const PORT = process.env.PORT || 3001;

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Migration failed, server not started:', err.message);
    process.exit(1);
  });
