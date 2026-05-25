# 🍽️ FoodSphere API Documentation

This document describes the REST API endpoints and integration patterns for the FoodSphere platform backend.

## Base URL
- **Local Development:** `http://localhost:8000`
- **Production:** `https://api.foodsphere.com` (TBD)

---

## 🔒 Security & Authentication

### JWT Authentication
All authenticated requests must include the JWT token in the HTTP Authorization header:
```http
Authorization: Bearer <access_token>
```

### Rate Limiting (Throttling)
- **Anonymous Requests:** Max `100` requests per hour.
- **Authenticated Requests:** Max `1000` requests per hour.

---

## 📦 Consistent Response Formats

### Success Response (GET / Retrieve)
```json
{
  "success": true,
  "data": {
    ...
  }
}
```

### Created Response (POST / Create)
```json
{
  "success": true,
  "message": "Resource created successfully",
  "data": {
    ...
  }
}
```

### Error Response (Validation / Auth / 500s)
```json
{
  "success": false,
  "message": "Detailed error message or concatenated validation fields"
}
```

---

## 🛣️ API Endpoints Reference

### 1. General & System
#### `GET /health/` or `GET /api/health/`
- **Description:** Checks server status and timestamp.
- **Authentication:** None
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "status": "OK",
      "timestamp": "2026-05-25T15:30:00.000Z"
    }
  }
  ```

### 2. Authentication (`/api/auth/`)
#### `POST /api/auth/register/`
- **Description:** Registers a new user.
- **Body:** `{ "username": "...", "email": "...", "password": "...", "phone": "..." }`
- **Response:** Success message and created user profile data.

#### `POST /api/auth/login/`
- **Description:** Authenticates user and returns JWT token pair.
- **Body:** `{ "username": "...", "password": "..." }`
- **Response:** `{ "success": true, "data": { "access": "...", "refresh": "...", "user": {...} } }`

#### `POST /api/auth/guest/`
- **Description:** Generates a guest token for users placing an order without registering.
- **Body:** `{}`
- **Response:** Guest user auth response with active access token.

#### `POST /api/auth/refresh/`
- **Description:** Refreshes an expired access token using the refresh token.
- **Body:** `{ "refresh": "..." }`
- **Response:** `{ "success": true, "data": { "access": "..." } }`

### 3. Restaurants (`/api/restaurants/`)
#### `GET /api/restaurants/`
- **Description:** List all active restaurants.
- **Response:** Array of restaurant records.

#### `GET /api/restaurants/{slug}/`
- **Description:** Get specific restaurant details (including its menu categories and items).
- **Response:** Restaurant details with nested active menu categories.

### 4. Orders (`/api/orders/`)
#### `POST /api/orders/`
- **Description:** Place a new order (supports guest and auth ordering).
- **Body:**
  ```json
  {
    "restaurant": 1,
    "guest_name": "John Doe",  // Required if guest
    "guest_phone": "12345678", // Required if guest
    "items": [
      { "menu_item": 10, "quantity": 2, "special_notes": "No onions" }
    ],
    "payment_method": "cod", // cod / stripe / payfast
    "delivery_address": "Street 45, Blue Area, Islamabad"
  }
  ```
- **Response:** Order details and starting status (`received`).

#### `GET /api/orders/{id}/`
- **Description:** Get specific order status and details (for tracking progress).

#### `GET /api/orders/my-orders/`
- **Description:** Get authenticated user's order history.

### 5. Payments (`/api/payments/`)
#### `POST /api/payments/cod/confirm/`
- **Description:** Confirm Cash on Delivery checkout.
- **Body:** `{ "order_id": 42 }`

#### `POST /api/payments/stripe/create/`
- **Description:** Initialize Stripe PaymentIntent.
- **Body:** `{ "order_id": 42 }`

#### `POST /api/payments/payfast/notify/`
- **Description:** PayFast IPN callback hook for local PK payment processing.
