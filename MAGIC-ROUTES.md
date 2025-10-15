# Julia MAGIC-Routed Endpoints

## Overview

Julia now supports MAGIC-routed versions of all POST, PUT, and DELETE operations. These spells route through Fount (the resolver) for centralized authentication. Julia handles user associations, messaging, and key coordination for the Planet Nine ecosystem.

## Converted Routes

### 1. Create User
**Direct Route**: `PUT /user/create`
**MAGIC Spell**: `juliaUserCreate`
**Cost**: 50 MP

**Components**:
```javascript
{
  user: {
    pubKey: "user-public-key",
    keys: {
      interactingKeys: {},
      coordinatingKeys: {}
    }
  }
}
```

**Returns**:
```javascript
{
  success: true,
  user: {
    uuid: "user-uuid",
    pubKey: "user-public-key",
    keys: {
      interactingKeys: {},
      coordinatingKeys: {}
    }
  }
}
```

**Validation**:
- Requires user object with pubKey

---

### 2. Save Signed Association Prompt
**Direct Route**: `POST /user/:uuid/associate/signedPrompt`
**MAGIC Spell**: `juliaUserAssociateSignedPrompt`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid",
  pubKey: "user-public-key",
  prompt: "association-prompt-string"
}
```

**Returns**:
```javascript
{
  success: true
}
```

**Validation**:
- Requires uuid, pubKey, and prompt
- Saves signed prompt for later association completion

---

### 3. Complete User Association
**Direct Route**: `POST /user/:uuid/associate`
**MAGIC Spell**: `juliaUserAssociate`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "primary-user-uuid",
  newUUID: "associated-user-uuid",
  newPubKey: "associated-user-pubkey",
  prompt: "previously-signed-prompt"
}
```

**Returns**:
```javascript
{
  success: true,
  user: {
    uuid: "primary-user-uuid",
    // ... updated user with association
  }
}
```

**Validation**:
- Requires uuid, newUUID, newPubKey, and prompt
- Verifies prompt exists in pendingPrompts
- Verifies prompt matches expected parameters
- Creates association between users
- Removes prompt after successful association

---

### 4. Delete User Association
**Direct Route**: `DELETE /associated/:associatedUUID/user/:uuid`
**MAGIC Spell**: `juliaAssociatedUserDelete`
**Cost**: 50 MP

**Components**:
```javascript
{
  associatedUUID: "associated-user-uuid",
  uuid: "primary-user-uuid"
}
```

**Returns**:
```javascript
{
  success: true,
  user: {
    uuid: "primary-user-uuid",
    // ... updated user without association
  }
}
```

**Validation**:
- Requires associatedUUID and uuid
- Both users must exist
- Removes association from primary user

---

### 5. Delete User
**Direct Route**: `DELETE /user/:uuid`
**MAGIC Spell**: `juliaUserDelete`
**Cost**: 50 MP

**Components**:
```javascript
{
  uuid: "user-uuid"
}
```

**Returns**:
```javascript
{
  success: true
}
```

**Validation**:
- Requires uuid
- User must exist

---

### 6. Send Message
**Direct Route**: `POST /message`
**MAGIC Spell**: `juliaMessage`
**Cost**: 50 MP

**Components**:
```javascript
{
  senderUUID: "sender-user-uuid",
  receiverUUID: "receiver-user-uuid",
  message: "message-content"
}
```

**Returns**:
```javascript
{
  success: true
}
```

**Validation**:
- Requires senderUUID, receiverUUID, and message
- Both sender and receiver must exist

---

### 7. Coordinate Keys
**Direct Route**: `POST /user/:uuid/coordinate`
**MAGIC Spell**: `juliaUserCoordinate`
**Cost**: 50 MP

**Components**:
```javascript
{
  primaryUUID: "primary-user-uuid",
  coordinatingPubKey: "coordinating-public-key",
  coordinatingUuid: "coordinating-user-uuid"
}
```

**Returns**:
```javascript
{
  success: true,
  coordinatingKeys: {
    // Updated coordinating keys object
  }
}
```

**Validation**:
- Requires primaryUUID, coordinatingPubKey, and coordinatingUuid
- Primary user must exist
- Adds coordinating key to user's key set

---

### 8. Verify NFC Key
**Direct Route**: `POST /nfc/verify`
**MAGIC Spell**: `juliaNfcVerify`
**Cost**: 50 MP

**Components**:
```javascript
{
  primaryUUID: "primary-user-uuid",
  pubKey: "nfc-public-key",
  bdoMessage: "message-from-bdo",
  isCoordinating: false  // true for coordinating, false for interacting
}
```

**Returns**:
```javascript
{
  success: true,
  message: "Key verified and added as interacting key",
  keyType: "interacting",  // or "coordinating"
  pubKey: "nfc-public-key"
}
```

**Validation**:
- Requires primaryUUID, pubKey, and bdoMessage
- Primary user must exist
- Adds key as either coordinating or interacting based on flag

---

## Implementation Details

### File Changes

1. **`/src/server/node/src/magic/magic.js`** - Added eight new spell handlers:
   - `juliaUserCreate(spell)`
   - `juliaUserAssociateSignedPrompt(spell)`
   - `juliaUserAssociate(spell)`
   - `juliaAssociatedUserDelete(spell)`
   - `juliaUserDelete(spell)`
   - `juliaMessage(spell)`
   - `juliaUserCoordinate(spell)`
   - `juliaNfcVerify(spell)`

2. **`/fount/src/server/node/spellbooks/spellbook.js`** - Added spell definitions with destinations and costs

3. **`/test/mocha/magic-spells.js`** - New test file with comprehensive spell tests

4. **`/test/mocha/package.json`** - Added `fount-js` dependency

### Authentication Flow

```
Client → Fount (resolver) → Julia MAGIC handler → Business logic
           ↓
    Verifies signature
    Deducts MP
    Grants experience
    Grants nineum
```

**Before (Direct REST)**:
- Client signs request
- Julia verifies signature directly
- Julia executes business logic

**After (MAGIC Spell)**:
- Client signs spell
- Fount verifies signature & deducts MP
- Fount grants experience & nineum to caster
- Fount forwards to Julia
- Julia executes business logic (no auth needed)

### Naming Convention

Route path → Spell name transformation:
```
/user/create                              → juliaUserCreate
/user/:uuid/associate/signedPrompt       → juliaUserAssociateSignedPrompt
/user/:uuid/associate                    → juliaUserAssociate
/associated/:associatedUUID/user/:uuid   → juliaAssociatedUserDelete
/user/:uuid                              → juliaUserDelete
/message                                 → juliaMessage
/user/:uuid/coordinate                   → juliaUserCoordinate
/nfc/verify                              → juliaNfcVerify
```

Pattern: `[service][PathWithoutSlashesAndParams]`

### User Association System

Julia manages user associations for the Planet Nine ecosystem:

**Association Flow**:
1. User A creates association prompt with User B's details
2. User A saves signed prompt via `juliaUserAssociateSignedPrompt`
3. User B accepts and completes association via `juliaUserAssociate`
4. Julia verifies prompt matches and creates bidirectional association
5. Prompt is removed after successful association

**Association Use Cases**:
- Link multiple devices to same user
- Share access between family members
- Create team associations
- Connect service accounts

### Key Types

Julia distinguishes between two types of keys:

**Interacting Keys**:
- Used for associated users who interact with each other
- Added via association flow or NFC verification
- Stored in `keys.interactingKeys`

**Coordinating Keys**:
- Used for service-to-service coordination
- Added via coordinate endpoint or NFC verification
- Stored in `keys.coordinatingKeys`
- Enable cross-service operations

### NFC Verification

Julia supports NFC-based key addition:

**NFC Flow**:
1. Primary user initiates NFC verification
2. NFC device contains BDO with pubKey and message
3. Julia verifies signature against BDO message
4. Key is added as either coordinating or interacting
5. Creates temporary user if needed for interacting keys

**NFC Use Cases**:
- Add hardware security keys
- Onboard physical devices
- Create secure associations without typing
- Support offline key exchange

### Error Handling

All spell handlers return consistent error format:
```javascript
{
  success: false,
  error: "Error description"
}
```

**Common Errors**:
- Missing required fields
- User not found
- Prompt not found or invalid
- Association validation failed
- Sender or receiver not found

## Testing

Run MAGIC spell tests:
```bash
cd julia/test/mocha
npm install
npm test magic-spells.js
```

Test coverage:
- ✅ User creation via spell
- ✅ Second user creation for association
- ✅ Signed prompt saving via spell
- ✅ Message sending via spell
- ✅ Key coordination via spell
- ✅ NFC key verification via spell
- ✅ User deletion via spell
- ✅ Missing pubKey validation
- ✅ Missing message fields validation
- ✅ Missing coordinate fields validation

## Benefits

1. **No Direct Authentication**: Julia handlers don't need to verify signatures
2. **Centralized Auth**: All signature verification in one place (Fount)
3. **Automatic Rewards**: Every spell grants experience + nineum
4. **Gateway Rewards**: Gateway participants get 10% of rewards
5. **Reduced Code**: Julia handlers simplified without auth logic
6. **Consistent Pattern**: Same flow across all services

## Julia's Role in Planet Nine

Julia is the **social connectivity service** that manages:

### User Management
- Creates and manages user accounts
- Stores user public keys
- Tracks user associations and relationships

### Association System
- Prompt-based association workflow
- Bidirectional user linking
- Association deletion and management

### Messaging
- User-to-user messaging
- Message storage and retrieval
- Cross-user communication

### Key Coordination
- Coordinating keys for service-to-service operations
- Interacting keys for user associations
- NFC-based key addition
- Multi-device support

### Integration Points
- **Joan**: User authentication foundation
- **Fount**: Magic point and nineum coordination
- **BDO**: User data storage
- **Messaging**: Inter-user communication layer

## Next Steps

Progress on MAGIC route conversion:
- ✅ Joan (3 routes complete)
- ✅ Pref (4 routes complete)
- ✅ Aretha (4 routes complete)
- ✅ Continuebee (3 routes complete)
- ✅ BDO (4 routes complete)
- ✅ Julia (8 routes complete)
- ⏳ Dolores
- ⏳ Sanora
- ⏳ Addie
- ⏳ Covenant
- ⏳ Prof
- ⏳ Fount (internal routes)
- ⏳ Minnie (SMTP only, no HTTP routes)

## Last Updated
January 14, 2025
