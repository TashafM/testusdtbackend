// middleware/cors.js

const cors = require('cors');

const corsOptions = {
  // origin: 'http://localhost:5173', // 👈 Next.js frontend ka origin
  origin: 'https://fronttttt.vercel.app', // 👈 Next.js frontend ka origin
  credentials: true,               // 🔐 Cookies allow
};

module.exports = cors(corsOptions);
