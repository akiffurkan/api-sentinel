import asyncio
import logging
import signal
import sys
from backend.core.database import init_db
from backend.services.scheduler import MonitoringScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [worker] %(name)s: %(message)s"
)
logger = logging.getLogger("apisentinel.worker")


async def main():
    logger.info("Initializing API Sentinel background monitoring worker...")
    await init_db()

    scheduler = MonitoringScheduler()
    loop = asyncio.get_running_loop()

    # Graceful shutdown handler
    def handle_signal():
        logger.info("Shutdown signal received. Stopping worker gracefully...")
        scheduler.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except NotImplementedError:
            # Signal handling on Windows
            pass

    try:
        await scheduler.start()
    except asyncio.CancelledError:
        logger.info("Worker task cancelled.")
    except Exception as e:
        logger.critical(f"Fatal worker exception: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user. Exiting.")
