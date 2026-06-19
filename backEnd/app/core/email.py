from typing import Optional
from app.config import get_settings

settings = get_settings()


def is_email_configured() -> bool:
    """检查邮件服务是否配置"""
    return (
        settings.smtp_host is not None
        and settings.smtp_user is not None
        and settings.smtp_password is not None
        and settings.from_email is not None
    )


def send_verification_email(email: str, token: str) -> bool:
    """发送邮箱验证邮件（占位实现，实际项目可配置 SMTP）"""
    if not is_email_configured():
        print(f"[邮件功能未配置] 跳过发送验证邮件到 {email}, token: {token}")
        # 在开发环境中，直接返回成功，或者打印 token 用于调试
        return True

    # 实际的 SMTP 发送实现示例
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg['From'] = settings.from_email
        msg['To'] = email
        msg['Subject'] = '验证您的邮箱'

        body = f'请点击以下链接验证您的邮箱：\n\n'
        body += f'http://localhost:5173/verify-email?email={email}&token={token}\n\n'
        body += f'如果您没有请求此验证，请忽略此邮件。'

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        print(f"已发送验证邮件到 {email}")
        return True

    except Exception as e:
        print(f"发送邮件失败: {e}")
        return False


def send_password_reset_email(email: str, token: str) -> bool:
    """发送密码重置邮件（占位实现）"""
    if not is_email_configured():
        print(f"[邮件功能未配置] 跳过发送密码重置邮件到 {email}, token: {token}")
        return True

    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        msg = MIMEMultipart()
        msg['From'] = settings.from_email
        msg['To'] = email
        msg['Subject'] = '重置您的密码'

        body = f'请点击以下链接重置您的密码：\n\n'
        body += f'http://localhost:5173/reset-password?token={token}\n\n'
        body += f'该链接将在 1 小时后过期。\n\n'
        body += f'如果您没有请求重置密码，请忽略此邮件。'

        msg.attach(MIMEText(body, 'plain'))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

        print(f"已发送密码重置邮件到 {email}")
        return True

    except Exception as e:
        print(f"发送邮件失败: {e}")
        return False
