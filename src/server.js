require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(JSON.stringify({
    event: 'server-start',
    message: `Server running on port ${PORT}`
  }));
});
