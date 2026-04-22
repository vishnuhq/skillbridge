/**
 * Server Entry Point
 * Starts the HTTP server on the configured port.
 */

import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`\n SkillBridge Backend running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL}\n`);
});
