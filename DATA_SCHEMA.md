# Data Schema Documentation

**ë³µìƒ˜?”ê? ?œìŠ¤???°ì´?°ë² ?´ìŠ¤ ?¤í‚¤ë§?*

??ë¬¸ì„œ??Firestore ì»¬ë ‰??êµ¬ì¡°, ?„ë“œ ?•ì˜, ê´€ê³? ê·¸ë¦¬ê³??¸ë±?¤ë? ?•ì˜?©ë‹ˆ??

---

## ?“Š ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    MEMBERS ||--o{ ATTENDANCE : "records"
    MEMBERS ||--o{ FCM_TOKENS : "has"
    MEMBERS ||--o{ PRACTICE_EVENTS : "generates"
    ATTENDANCE ||--|| PRACTICE_EVENTS : "triggers"
    
    MEMBERS {
        string id PK
        string name
        string phone
        string homeBranch
        number credits
        date endDate
        string membershipType
        string subject
        date createdAt
        date lastAttendanceAt
        string language
    }
    
    ATTENDANCE {
        string id PK
        string memberId FK
        string branchId
        string date
        timestamp timestamp
        string classTitle
        number creditsUsed
    }
    
    PRACTICE_EVENTS {
        string id PK
        string memberId FK
        string attendanceId FK
        string eventType
        timestamp triggeredAt
        string date
        object context
        object displayMessage
    }
    
    FCM_TOKENS {
        string id PK "token itself"
        string memberId FK
        string role
        string language
        timestamp createdAt
    }
```

---

## 1ï¸âƒ£ `members` Collection

### ?¤ëª…
?Œì› ?•ë³´ë¥??€?¥í•˜???µì‹¬ ì»¬ë ‰?? ëª¨ë“  ì¶œì„, ?Œë¦¼, ?´ë²¤?¸ì˜ ê¸°ì????©ë‹ˆ??

### ?„ë“œ (Fields)

| ?„ë“œëª?| ?€??| ?„ìˆ˜ | ?¤ëª… | ?ˆì‹œ |
|---|---|---|---|---|
| `id` | string | ??| ?ë™ ?ì„± ë¬¸ì„œ ID (Firestore) | `xjk2n3kl...` |
| `name` | string | ??| ?Œì› ?´ë¦„ | `?ê¸¸?? |
| `phone` | string | ??| ?„í™”ë²ˆí˜¸ (??4?ë¦¬??PIN) | `010-1234-5678` |
| `homeBranch` | string | ??| ê¸°ë³¸ ì§€??| `mapo` or `gwangheungchang` |
| `credits` | number | ??| ?”ì—¬ ?¬ë ˆ??(ë¬´ì œ??999) | `10` |
| `endDate` | string | ??| ?Œì›ê¶?ë§Œë£Œ??(YYYY-MM-DD) | `2026-12-31` |
| `membershipType` | string | ? ï¸ | ?Œì›ê¶?? í˜• | `regular`, `advanced`, `flying` |
| `subject` | string | ? ï¸ | ?Œì›ê¶?ëª…ì¹­ | `10?Œê¶Œ`, `ë¬´ì œ?? |
| `createdAt` | timestamp | ??| ?±ë¡??| `Timestamp(...)` |
| `lastAttendanceAt` | timestamp | ? ï¸ | ìµœê·¼ ì¶œì„ ?œê° | `Timestamp(...)` |
| `language` | string | ? ï¸ | ? í˜¸ ?¸ì–´ | `ko`, `en`, `ru`, `zh`, `ja` |

### ?¸ë±??(Indexes)
- `phone` (ASC) - PIN ë¡œê·¸?¸ìš©
- `endDate` (ASC) - ë§Œë£Œ ?ˆì • ?Œì› ì¡°íšŒ??
- `credits` (ASC) - ?€?¬ë ˆ???Œì› ì¡°íšŒ??

### ë³´ì•ˆ ê·œì¹™ (Security Rules)
```javascript
// Anonymous users: READ only their own data
// Admin (authenticated): READ/WRITE all
match /members/{memberId} {
  allow read: if request.auth != null && request.auth.uid == memberId;
  allow write: if request.auth != null && request.auth.token.email != null;
}
```

---

## 2ï¸âƒ£ `attendance` Collection

### ?¤ëª…
ì¶œì„ ê¸°ë¡???€?¥í•˜??ì»¬ë ‰?? `practice_events` ?ì„±???¸ë¦¬ê±°ê? ?©ë‹ˆ??

### ?„ë“œ (Fields)

| ?„ë“œëª?| ?€??| ?„ìˆ˜ | ?¤ëª… | ?ˆì‹œ |
|---|---|---|---|---|
| `id` | string | ??| ?ë™ ?ì„± ë¬¸ì„œ ID | `abc123...` |
| `memberId` | string | ??| ?Œì› ID (FK to members) | `xjk2n3kl...` |
| `branchId` | string | ??| ì¶œì„ ì§€??| `mapo` |
| `date` | string | ??| ì¶œì„ ? ì§œ (YYYY-MM-DD) | `2026-01-20` |
| `timestamp` | timestamp | ??| ì¶œì„ ?œê° | `Timestamp(...)` |
| `classTitle` | string | ? ï¸ | ?˜ì—…ëª?(? íƒ) | `?Œë¼?‰ìš”ê°€ ?¬í™”` |
| `creditsUsed` | number | ??| ì°¨ê° ?¬ë ˆ??| `1` |

### ?¸ë±??(Indexes)
- `memberId` (ASC) + `date` (DESC) - ?Œì›ë³?ì¶œì„ ?´ë ¥ ì¡°íšŒ
- `date` (ASC) - ?¹ì • ? ì§œ ì¶œì„ ì§‘ê³„
- Composite: `memberId` + `date` + `timestamp` (DESC)

### Functions Trigger
```javascript
exports.onAttendanceCreated = onDocumentCreated("attendance/{attendanceId}", ...)
```
??ì¶œì„ ?ì„± ???ë™?¼ë¡œ `practice_events` ê³„ì‚° ë°??ì„±

---

## 3ï¸âƒ£ `practice_events` Collection

### ?¤ëª…
**Silent Recorder ì² í•™???µì‹¬**. ì¶œì„ ?¨í„´ ë³€?”ë? AI ?†ì´ ê³„ì‚°?˜ì—¬ ?´ë²¤?¸ë¡œ ?€?¥í•©?ˆë‹¤.

### ?„ë“œ (Fields)

| ?„ë“œëª?| ?€??| ?„ìˆ˜ | ?¤ëª… | ?ˆì‹œ |
|---|---|---|---|---|
| `id` | string | ??| ?ë™ ?ì„± ë¬¸ì„œ ID | `evt123...` |
| `memberId` | string | ??| ?Œì› ID (FK to members) | `xjk2n3kl...` |
| `attendanceId` | string | ??| ?¸ë¦¬ê±°ëœ ì¶œì„ ID (FK) | `abc123...` |
| `eventType` | string | ??| ?´ë²¤???€??(ENUM) | `FLOW_RESUMED` |
| `triggeredAt` | timestamp | ??| ?´ë²¤???ì„± ?œê° | `Timestamp(...)` |
| `date` | string | ??| ì¶œì„ ? ì§œ (YYYY-MM-DD) | `2026-01-20` |
| `context` | object | ??| ê³„ì‚°??ì»¨í…?¤íŠ¸ | `{ gapDays: 14, streak: 1 }` |
| `displayMessage` | object | ??| ?¤êµ­??ë©”ì‹œì§€ ?œí”Œë¦?| `{ ko: "...", en: "..." }` |

### ?´ë²¤???€??(Event Types - ENUM)

#### A. Practice Events (?˜ë ¨ ë¦¬ë“¬ ?´ë²¤??
| ?€??| ?¤ëª… | ?ì„± ì¡°ê±´ |
|---|---|---|
| `PRACTICE_COMPLETED` | ?˜ë ¨ ê¸°ë¡ ?„ë£Œ (ê¸°ë³¸) | ëª¨ë“  ì¶œì„ |
| `FLOW_MAINTAINED` | ë¦¬ë“¬ ? ì? | gap < 7??|
| `GAP_DETECTED` | ê°„ê²© ë°œìƒ | 7????gap < 30??|
| `FLOW_RESUMED` | ë³µê? | gap ??30??|
| `PATTERN_SHIFTED` | ?œê°„?€ ë³€??| timeBand ë³€ê²?ê°ì? |

#### B. Context Object Structure
```javascript
{
  gapDays: 14,              // ?´ì „ ì¶œì„ê³¼ì˜ ê°„ê²©
  streak: 1,                 // ?°ì† ì¶œì„ ?¼ìˆ˜
  timeBand: "MORNING",       // ?„ì¬ ?œê°„?€
  previousTimeBand: "EVENING", // ?´ì „ ?œê°„?€
  shiftDetails: "EVENING ??MORNING" // ?¨í„´ ë³€???ì„¸
}
```

### ?¸ë±??(Indexes)
- `memberId` (ASC) + `triggeredAt` (DESC) - ?Œì›ë³?ìµœì‹  ?´ë²¤??ì¡°íšŒ
- `eventType` (ASC) + `triggeredAt` (DESC) - ?´ë²¤???€?…ë³„ ?„í„°ë§?

---

## 4ï¸âƒ£ `fcm_tokens` Collection

### ?¤ëª…
Firebase Cloud Messaging ?¸ì‹œ ?Œë¦¼??? í°???€?¥í•©?ˆë‹¤. Primary Key??? í° ?ì²´?…ë‹ˆ??

### ?„ë“œ (Fields)

| ?„ë“œëª?| ?€??| ?„ìˆ˜ | ?¤ëª… | ?ˆì‹œ |
|---|---|---|---|---|
| `id` | string | ??| FCM ? í° (PK) | `eXjk2n3...` |
| `memberId` | string | ? ï¸ | ?Œì› ID (null=? ë ¹ ? í°) | `xjk2n3kl...` or `null` |
| `role` | string | ??| ??•  | `member`, `admin`, `kiosk` |
| `language` | string | ??| ? í˜¸ ?¸ì–´ | `ko` |
| `createdAt` | timestamp | ??| ? í° ?ì„± ?œê° | `Timestamp(...)` |

### ? ë ¹ ? í° (Ghost Tokens)
- **?•ì˜**: `memberId === null`??? í°
- **?ì¸**: ë¡œê·¸?„ì›ƒ ??ë¯¸ì‚­?? ???¬ì„¤ì¹???
- **?•ë¦¬**: `cleanupGhostTokens` ?¤ì?ì¤„ëŸ¬ (ë§¤ì£¼ ?¼ìš”??04:00 KST)

### ?¸ë±??(Indexes)
- `memberId` (ASC) - ?Œì›ë³?? í° ì¡°íšŒ
- `role` (ASC) - ??• ë³??„í„°ë§?
- Composite: `memberId` (ASC) + `createdAt` (DESC)

---

## 5ï¸âƒ£ ê¸°í? ì»¬ë ‰??(Supporting Collections)

### `notices`
- **?¤ëª…**: ê³µì??¬í•­
- **ì£¼ìš” ?„ë“œ**: `title`, `body`, `date`, `isPinned`

### `messages`
- **?¤ëª…**: 1:1 ë¬¸ì˜/?€??(ê´€ë¦¬ì ???Œì›)
- **ì£¼ìš” ?„ë“œ**: `memberId`, `content`, `sender`, `timestamp`

### `images`
- **?¤ëª…**: ?????´ë?ì§€ ?ì‚°
- **ì£¼ìš” ?„ë“œ**: `url`, `base64`

### `ai_error_logs`
- **?¤ëª…**: AI API ?¸ì¶œ ?¤íŒ¨ ë¡œê·¸
- **ì£¼ìš” ?„ë“œ**: `context`, `error`, `timestamp`
- **?©ë„**: ëª¨ë‹ˆ?°ë§ ë°??”ë²„ê¹?

### `error_logs`
- **?¤ëª…**: ?´ë¼?´ì–¸???ëŸ¬ ë¡œê·¸
- **ì£¼ìš” ?„ë“œ**: `message`, `url`, `userId`, `timestamp`

---

## ?” ë³´ì•ˆ ë°?ìµœì ???ì¹™

### 1. Protected Logic (Server-Side Only)
?¤ìŒ ?‘ì—…?€ **ë°˜ë“œ??Cloud Functions**?ì„œë§??¤í–‰:
- ?¬ë ˆ??ì°¨ê° (`checkInMemberV2Call`)
- ?Œì›ê¶?ë§Œë£Œ ì²´í¬ (`checkExpiringMembersV2`)
- ?Œìˆ˜ ?¬ë ˆ??ê°ì? (`onMemberUpdateSecurityAlertV2`)

### 2. ?´ë¼?´ì–¸???œí•œ
- **Kiosk Mode**: Firestore ë¦¬ìŠ¤??ë¹„í™œ?±í™” (?±ëŠ¥ ìµœì ??
- **Member Mode**: ë³¸ì¸ ?°ì´?°ë§Œ ?½ê¸° ê°€??
- **Admin Mode**: ?´ë©”???¸ì¦ ?„ìˆ˜

### 3. ?¸ë±???„ëµ
- **ë³µí•© ?¸ë±??*: ?ì£¼ ?¬ìš©?˜ëŠ” ì¿¼ë¦¬ ì¡°í•©
- **ASC/DESC ?¼ìš©**: ?•ë ¬ ë°©í–¥ ëª…ì‹œ
- **?„í„° + ?•ë ¬**: Firestore ?œì•½ ê³ ë ¤

---

## ?“ˆ ?•ì¥ ê³„íš (ë¯¸êµ¬??

### ?¥í›„ ì¶”ê? ?ˆì • ì»¬ë ‰??

#### `membership_events`
- ?Œì›ê¶?ë³€ê²??°ì¥ ?´ë ¥
- ?„ë“œ: `memberId`, `eventType`, `oldPlan`, `newPlan`

#### `class_sessions`
- ?˜ì—…ë³?ì¶œì„ ì§‘ê³„
- ?„ë“œ: `branchId`, `classTitle`, `date`, `attendeeIds[]`

#### `inflection_points` (ê´€ë¦¬ì??
- ë³€ê³¡ì  ?Œì› ë¦¬ìŠ¤??
- ?„ë“œ: `memberId`, `reason`, `severity`, `actionTaken`

---

## ?› ï¸?? ì?ë³´ìˆ˜ ê°€?´ë“œ

### Schema ë³€ê²???ì²´í¬ë¦¬ìŠ¤??
1. ????ë¬¸ì„œ ?…ë°?´íŠ¸
2. ??`firestore.indexes.json` ?˜ì •
3. ??Cloud Functions ì½”ë“œ ?˜ì •
4. ???´ë¼?´ì–¸??ì½”ë“œ ?˜ì •
5. ??ë§ˆì´ê·¸ë ˆ?´ì…˜ ?¤í¬ë¦½íŠ¸ ?‘ì„± (?„ìš”??

### ?¸ë±??ë°°í¬
```bash
firebase deploy --only firestore:indexes
```

---

**Last Updated**: 2026-01-20  
**Author**: Antigravity AI Agent  
**Status**: Production
