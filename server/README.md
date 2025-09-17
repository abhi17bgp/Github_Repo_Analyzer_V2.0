# Backend Username Feature

This document describes the username feature implementation in the backend.

## Overview

The backend now supports usernames for user accounts, providing a more user-friendly way to identify users instead of just using email addresses.

## Features

### 1. User Registration with Username

- Users must provide a username during registration
- Username validation (3-20 characters, alphanumeric + underscores only)
- Username uniqueness check
- Real-time username availability checking

### 2. Database Schema

Users now have the following fields:

- `id`: Unique user identifier
- `email`: User's email address
- `username`: Unique username (3-20 characters)
- `password`: Hashed password
- `created_at`: Account creation timestamp

### 3. API Endpoints

#### POST `/api/auth/register`

Register a new user with username:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "john_doe"
}
```

#### POST `/api/auth/login`

Login with email and password (username is returned in response):

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### GET `/api/auth/check-username/:username`

Check if a username is available:

```json
{
  "available": true,
  "message": "Username is available"
}
```

#### GET `/api/auth/me`

Get current user info (includes username):

```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "username": "john_doe"
  }
}
```

## Validation Rules

### Username Requirements:

- **Length**: 3-20 characters
- **Characters**: Letters (a-z, A-Z), numbers (0-9), and underscores (\_) only
- **Uniqueness**: Must be unique across all users
- **Case**: Case-sensitive

### Error Messages:

- "Username must be between 3 and 20 characters"
- "Username can only contain letters, numbers, and underscores"
- "Username is already taken"

## Migration

For existing users without usernames, run the migration script:

```bash
npm run migrate
```

This will:

1. Find all users without usernames
2. Generate usernames from their email addresses
3. Ensure uniqueness by adding numbers if needed
4. Update the database

## Frontend Integration

The frontend has been updated to:

- Show username field during signup
- Display real-time username availability
- Show username in the header instead of email
- Provide visual feedback for username validation

## Security Considerations

- Usernames are validated on both frontend and backend
- Username uniqueness is enforced at the database level
- JWT tokens include user ID for authentication
- Passwords remain hashed using bcrypt

## Deployment

For deployment instructions, please refer to the [DEPLOYMENT.md](../DEPLOYMENT.md) file in the root directory. This file contains detailed instructions for deploying both the frontend and backend services on Render and Vercel respectively.
