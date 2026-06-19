from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import json

from app.database import get_db
from app.config import get_settings
from app.models import User
from app.schemas import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    UserResponse, UserUpdateRequest, ChangePasswordRequest,
    SendVerificationEmailRequest, VerifyEmailRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    ApiResponse
)
from app.core.security import (
    verify_password, get_password_hash,
    check_login_attempt, record_login_attempt,
    check_password_history, save_password_to_history
)
from app.core.auth import (
    create_access_token, create_refresh_token, verify_token,
    refresh_access_token, revoke_token, revoke_all_user_tokens,
    generate_verification_token, generate_password_reset_token
)
from app.core.email import send_verification_email, send_password_reset_email, is_email_configured
from app.dependencies import get_current_active_user

router = APIRouter(prefix="/api/auth", tags=["认证"])
settings = get_settings()


def get_client_ip(request: Request) -> str:
    """获取客户端 IP 地址"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def log_audit(db: Session, user_id: str, action: str, resource_type: str = None, resource_id: str = None,
             old_value: str = None, new_value: str = None, ip_address: str = None, user_agent: str = None):
    """记录审计日志（简化实现）"""
    try:
        from app.models import AuditLog
        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(audit_log)
        db.commit()
    except Exception:
        pass


@router.post("/register", response_model=ApiResponse[UserResponse])
def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名是否已存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已被使用"
        )

    # 检查邮箱是否已存在
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="邮箱已被使用"
        )

    # 创建用户
    hashed_password = get_password_hash(user_data.password)
    user = User(
        id=str(uuid.uuid4()),
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role="USER",
        quota_total=settings.default_quota,
        quota_used=0,
        is_active=True,
        email_verified=not settings.require_email_verification,
        require_password_change=False
    )

    # 保存密码历史
    db.add(user)
    db.commit()
    db.refresh(user)

    # 保存密码到历史记录
    save_password_to_history(db, user.id, hashed_password)

    # 如果需要邮箱验证，发送邮件
    if settings.require_email_verification and is_email_configured():
        token = generate_verification_token()
        user.email_verification_token = token
        user.email_verification_sent_at = datetime.utcnow()
        db.commit()
        send_verification_email(user.email, token)

    # 记录审计日志
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    log_audit(db, user.id, "REGISTER", ip_address=ip_address, user_agent=user_agent)

    return ApiResponse(
        data=UserResponse.model_validate(user),
        message="注册成功"
    )


@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(request: Request, login_data: UserLogin, db: Session = Depends(get_db)):
    """用户登录（支持邮箱或用户名）"""
    ip_address = get_client_ip(request)

    # 检查登录尝试次数
    ok, msg = check_login_attempt(login_data.login)
    if not ok:
        log_audit(db, None, "LOGIN_BLOCKED", ip_address=ip_address)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg
        )

    # 查找用户
    user = db.query(User).filter(User.username == login_data.login).first()
    if not user:
        user = db.query(User).filter(User.email == login_data.login).first()

    if not user:
        record_login_attempt(login_data.login, False)
        log_audit(db, None, "LOGIN_FAILED", old_value=f"login:{login_data.login}", ip_address=ip_address)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已禁用"
        )

    # 验证密码
    if not verify_password(login_data.password, user.hashed_password):
        record_login_attempt(login_data.login, False)
        log_audit(db, user.id, "LOGIN_FAILED", ip_address=ip_address)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    # 登录成功
    record_login_attempt(login_data.login, True)
    user.last_login_at = datetime.utcnow()
    db.commit()

    # 记录审计日志
    user_agent = request.headers.get("User-Agent")
    log_audit(db, user.id, "LOGIN_SUCCESS", ip_address=ip_address, user_agent=user_agent)

    # 生成 Token
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(data={"sub": user.id}, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(db, user.id)

    return ApiResponse(
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes
        ),
        message="登录成功"
    )


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """刷新 Token"""
    try:
        access_token, new_refresh_token = refresh_access_token(db, data.refresh_token)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的刷新凭证")

        return ApiResponse(
            data=TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                expires_in=settings.jwt_access_token_expire_minutes
            ),
            message="刷新成功"
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效的刷新凭证")


@router.post("/logout")
def logout(token_refresh: RefreshTokenRequest, db: Session = Depends(get_db)):
    """登出"""
    revoke_token(db, token_refresh.refresh_token)
    return ApiResponse(message="登出成功")


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_active_user)):
    """获取当前用户信息"""
    return ApiResponse(data=UserResponse.model_validate(current_user))


@router.put("/me", response_model=ApiResponse[UserResponse])
def update_user(data: UserUpdateRequest, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_active_user)):
    """更新当前用户信息"""
    if data.username and data.username != current_user.username:
        existing_user = db.query(User).filter(User.username == data.username).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="用户名已被使用")
        current_user.username = data.username

    if data.email and data.email != current_user.email:
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="邮箱已被使用")
        current_user.email = data.email
        current_user.email_verified = False

    db.commit()
    db.refresh(current_user)

    return ApiResponse(data=UserResponse.model_validate(current_user), message="更新成功")


@router.post("/change-password", response_model=ApiResponse)
def change_password(request: Request, data: ChangePasswordRequest, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_active_user)):
    """修改密码"""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="当前密码错误")

    if check_password_history(db, current_user.id, data.new_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="新密码不能与最近使用的密码相同")

    new_hashed = get_password_hash(data.new_password)
    current_user.hashed_password = new_hashed

    save_password_to_history(db, current_user.id, new_hashed)

    # 撤销用户所有 Refresh Token
    revoke_all_user_tokens(db, current_user.id)

    # 记录审计日志
    ip_address = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    log_audit(db, current_user.id, "PASSWORD_CHANGE", ip_address=ip_address, user_agent=user_agent)

    db.commit()

    return ApiResponse(message="密码修改成功")


@router.post("/send-verification-email")
def send_verification_email_endpoint(data: SendVerificationEmailRequest, db: Session = Depends(get_db)):
    """发送验证邮件"""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return ApiResponse(message="如果邮箱已注册，验证邮件将被发送")

    if user.email_verified:
        return ApiResponse(message="邮箱已验证")

    token = generate_verification_token()
    user.email_verification_token = token
    user.email_verification_sent_at = datetime.utcnow()
    db.commit()
    send_verification_email(user.email, token)

    return ApiResponse(message="如果邮箱已注册，验证邮件将被发送")


@router.post("/verify-email", response_model=ApiResponse[UserResponse])
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    """验证邮箱"""
    user = db.query(User).filter(User.email == data.email).first()
    if user and user.email_verification_token == data.token and not user.email_verified:
        user.email_verified = True
        user.email_verification_token = None
        db.commit()
        return ApiResponse(data=UserResponse.model_validate(user), message="邮箱验证成功")
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的验证链接或已过期")


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """忘记密码"""
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        token = generate_password_reset_token()
        user.password_reset_token = token
        user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        send_password_reset_email(user.email, token)

    return ApiResponse(message="如果邮箱已注册，重置密码的邮件将被发送")


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """重置密码"""
    user = db.query(User).filter(User.password_reset_token == data.token).first()
    if user and user.password_reset_token and user.password_reset_expires_at:
        if user.password_reset_expires_at > datetime.utcnow():
            if check_password_history(db, user.id, data.new_password):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="新密码不能与最近使用的密码相同")

            new_hashed = get_password_hash(data.new_password)
            user.hashed_password = new_hashed
            user.password_reset_token = None
            user.password_reset_expires_at = None
            db.commit()

            save_password_to_history(db, user.id, new_hashed)
            revoke_all_user_tokens(db, user.id)

            log_audit(db, user.id, "PASSWORD_RESET")

            return ApiResponse(message="密码重置成功，请重新登录")

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的重置链接或已过期")
