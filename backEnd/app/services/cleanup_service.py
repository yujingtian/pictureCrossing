import logging
import os
import time
import threading
from typing import Optional
from datetime import datetime, timedelta

from app.config import get_settings

logger = logging.getLogger(__name__)


class CleanupService:
    """自动清理旧文件服务"""

    def __init__(self):
        self.settings = get_settings()
        self._running = False
        self._worker_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def start(self):
        """启动清理服务"""
        if not self.settings.cleanup_enabled:
            logger.info("自动清理功能已禁用，跳过启动")
            return

        if self._running:
            logger.warning("清理服务已在运行中")
            return

        self._running = True
        self._stop_event.clear()
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()
        logger.info(
            "自动清理服务已启动: 检查间隔=%d分钟, 上传文件保留=%d小时, 结果文件保留=%d小时",
            self.settings.cleanup_interval_minutes,
            self.settings.upload_file_ttl_hours,
            self.settings.result_file_ttl_hours,
        )

    def stop(self):
        """停止清理服务"""
        if not self._running:
            return

        logger.info("正在停止清理服务...")
        self._running = False
        self._stop_event.set()
        if self._worker_thread:
            self._worker_thread.join(timeout=5.0)
        logger.info("清理服务已停止")

    def _worker_loop(self):
        """后台工作线程循环"""
        while self._running:
            try:
                self._cleanup_uploads()
                self._cleanup_results()
            except Exception:
                logger.exception("清理任务执行异常")

            # 等待下一次检查或直到停止信号
            wait_seconds = self.settings.cleanup_interval_minutes * 60
            if self._stop_event.wait(wait_seconds):
                break

    def _cleanup_uploads(self):
        """清理上传目录中的旧文件"""
        if not os.path.exists(self.settings.upload_dir):
            return

        cutoff_time = datetime.now() - timedelta(hours=self.settings.upload_file_ttl_hours)
        deleted_count = self._cleanup_old_files(self.settings.upload_dir, cutoff_time)
        if deleted_count > 0:
            logger.info("清理了 %d 个过期的上传文件", deleted_count)

    def _cleanup_results(self):
        """清理结果目录中的旧文件"""
        if not os.path.exists(self.settings.result_dir):
            return

        cutoff_time = datetime.now() - timedelta(hours=self.settings.result_file_ttl_hours)
        deleted_count = self._cleanup_old_files(self.settings.result_dir, cutoff_time)
        if deleted_count > 0:
            logger.info("清理了 %d 个过期的结果文件", deleted_count)

    def _cleanup_old_files(self, directory: str, cutoff_time: datetime) -> int:
        """
        清理指定目录下超过 cutoff_time 的文件

        Returns:
            删除的文件数量
        """
        deleted_count = 0

        for filename in os.listdir(directory):
            filepath = os.path.join(directory, filename)
            if not os.path.isfile(filepath):
                continue

            try:
                # 获取文件修改时间
                mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                if mtime < cutoff_time:
                    os.remove(filepath)
                    deleted_count += 1
                    logger.debug("已删除过期文件: %s (修改时间: %s)", filepath, mtime)
            except Exception as e:
                logger.warning("删除文件 %s 失败: %s", filepath, e)

        return deleted_count

    def cleanup_now(self, upload_ttl_hours: Optional[int] = None, result_ttl_hours: Optional[int] = None):
        """
        立即执行一次清理（用于手动触发）

        Args:
            upload_ttl_hours: 覆盖配置的上传文件 TTL
            result_ttl_hours: 覆盖配置的结果文件 TTL
        """
        logger.info("开始手动清理...")

        # 清理上传文件
        if os.path.exists(self.settings.upload_dir):
            upload_cutoff = datetime.now() - timedelta(hours=upload_ttl_hours or self.settings.upload_file_ttl_hours)
            count = self._cleanup_old_files(self.settings.upload_dir, upload_cutoff)
            logger.info("上传文件清理完成，删除 %d 个文件", count)

        # 清理结果文件
        if os.path.exists(self.settings.result_dir):
            result_cutoff = datetime.now() - timedelta(hours=result_ttl_hours or self.settings.result_file_ttl_hours)
            count = self._cleanup_old_files(self.settings.result_dir, result_cutoff)
            logger.info("结果文件清理完成，删除 %d 个文件", count)


# 单例实例
_cleanup_service_instance: Optional[CleanupService] = None


def get_cleanup_service() -> CleanupService:
    """获取清理服务单例"""
    global _cleanup_service_instance
    if _cleanup_service_instance is None:
        _cleanup_service_instance = CleanupService()
    return _cleanup_service_instance
