from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from .config import settings
from typing import Optional, Dict

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

async def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)) -> Dict:
    """
    Verifies the NextAuth.js JWT token.
    Checks Authorization header first, then 'next-auth.session-token' cookie.
    """
    if not token:
        # Try getting from cookie
        token = request.cookies.get("next-auth.session-token") or request.cookies.get("__Secure-next-auth.session-token")
    
    if not token:
        return None

    try:
        # NextAuth JWT default algorithm is HS256
        payload = jwt.decode(token, settings.NEXTAUTH_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        print(f"DEBUG: JWT Validation Failed: {e}")
        print(f"DEBUG: Token received: {token[:10]}...")
        print(f"DEBUG: Secret used: {settings.NEXTAUTH_SECRET[:3]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )



