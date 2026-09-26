import app from './app';
import { startCronJobs } from './Infrastructure/jobs/syncLeadsCron';

const PORT = process.env['PORT'] ?? 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs  http://localhost:${PORT}/api/docs`);

  startCronJobs();
});

export default app;
