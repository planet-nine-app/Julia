# Julia - Planet Nine Messaging Service

## Overview

Julia is a Planet Nine allyabase microservice that handles messaging and communication with sessionless authentication.

**Location**: `/julia/`
**Port**: 3005 (default)

## Core Features

### 💬 **Messaging**
- **Secure Messages**: Cryptographically authenticated messaging
- **User-to-User**: Direct messaging between users
- **Message History**: Retrieve conversation history
- **Sessionless Auth**: All operations use cryptographic signatures

## API Endpoints

### Messaging Operations
- `PUT /user/create` - Create messaging user
- `POST /message` - Send message
- `GET /user/:uuid/messages` - Retrieve user messages
- `DELETE /message/:messageId` - Delete message

### MAGIC Protocol
- `POST /magic/spell/:spellName` - Execute MAGIC spells for messaging operations

### Health & Status
- `GET /health` - Service health check

## MAGIC Route Conversion (October 2025)

All Julia REST endpoints have been converted to MAGIC protocol spells:

### Converted Spells (4 total)
1. **juliaUserCreate** - Create messaging user
2. **juliaMessageSend** - Send message
3. **juliaUserMessages** - Retrieve user messages
4. **juliaMessageDelete** - Delete message

**Testing**: Comprehensive MAGIC spell tests available in `/test/mocha/magic-spells.js` (10 tests covering success and error cases)

**Documentation**: See `/MAGIC-ROUTES.md` for complete spell specifications and migration guide

## Implementation Details

**Location**: `/src/server/node/src/magic/magic.js`

All messaging operations maintain the same functionality as the original REST endpoints while benefiting from centralized Fount authentication and MAGIC protocol features like experience granting and gateway rewards.

## Last Updated
October 14, 2025 - Completed full MAGIC protocol conversion. All 4 routes now accessible via MAGIC spells with centralized Fount authentication.
