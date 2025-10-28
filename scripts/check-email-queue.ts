#!/usr/bin/env tsx

/**
 * Email Queue Monitor
 * Check the status of the email queue and worker
 */

import { emailQueue } from '../services/notify-svc/email-queue';

async function checkQueueStatus() {
  try {
    console.log('📊 Email Queue Status\n');

    const stats = await emailQueue.getQueueStats();

    console.log(`⏳ Waiting:    ${stats.waiting}`);
    console.log(`⚡ Active:     ${stats.active}`);
    console.log(`✅ Completed:  ${stats.completed}`);
    console.log(`❌ Failed:     ${stats.failed}`);
    console.log(`📈 Total:      ${stats.waiting + stats.active + stats.completed + stats.failed}`);

    if (stats.waiting > 0) {
      console.log('\n💡 Queue has pending jobs. Worker should be processing them.');
    } else if (stats.active > 0) {
      console.log('\n🔄 Worker is currently processing jobs.');
    } else {
      console.log('\n✨ Queue is idle - no pending or active jobs.');
    }

  } catch (error) {
    console.error('❌ Failed to check queue status:', error);
    process.exit(1);
  } finally {
    await emailQueue.close();
  }
}

if (require.main === module) {
  checkQueueStatus();
}