# Add User Authentication

## Overview

Implement JWT-based authentication for the API.

## Tasks

### 1. Create User Model

- Add `users` table with email, password_hash, created_at
- Add bcrypt for password hashing

### 2. Auth Endpoints

- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Returns JWT token
- `POST /api/auth/logout` - Invalidate token

### 3. Middleware

```typescript
async function authMiddleware(req: Request): Promise<User> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  return verifyJWT(token);
}
```

## Files to Modify

1. `src/models/user.ts` - New file
2. `src/routes/auth.ts` - New file
3. `src/middleware/auth.ts` - New file
4. `src/index.ts` - Add routes

## Verification

- [ ] Register new user
- [ ] Login and receive token
- [ ] Access protected route with token
- [ ] Reject request without token
