// src/types/index.ts

export interface Member {
    id: string;
    name: string;
    phone?: string;
    homeBranch?: string;
    membershipType?: string;
    credits?: number;
    duration?: number;
    regDate?: string;
    createdAt?: string | any; // allow any for mixed firestore timestamp
    startDate?: string;
    endDate?: string;
    lastAttendance?: string;
    pushEnabled?: boolean;
    installedAt?: string;
    role?: 'member' | 'instructor';
    status?: string;
    price?: number;
    subject?: string;
    attendanceCount?: number;
    hasFaceDescriptor?: boolean;
    faceDescriptor?: number[] | null;
    faceUpdatedAt?: string | null;
    holdHistory?: HoldRecord[];
    upcomingMembership?: {
        membershipType?: string;
        credits?: number;
        durationMonths?: number;
        startDate?: string;
        endDate?: string;
    };
    [key: string]: any;
}

export interface SalesRecord {
    id?: string;
    memberId: string;
    branchId?: string;
    amount: number | string;
    item?: string;
    type?: 'register' | 'renewal' | 'etc';
    date?: string;
    timestamp?: string | { seconds: number; nanoseconds: number; toDate?: () => Date };
    [key: string]: any;
}

export interface AttendanceLog {
    id?: string;
    memberId: string;
    memberName?: string;
    branchId?: string;
    timestamp: string | any;
    status?: 'approved' | 'denied';
    denialReason?: 'expired' | 'no_credits';
    subject?: string;
    className?: string;
    instructor?: string;
    sessionCount?: number;
    isMultiSession?: boolean;
    photoURL?: string;
    [key: string]: any;
}

export interface PushToken {
    memberId: string;
    instructorName?: string;
    token?: string;
    [key: string]: any;
}

// ── Studio Configuration ──

export interface BranchConfig {
    id: string;
    name: string;
    color?: string;
    address?: string;
}

export interface HoldRule {
    durationMonths: number;
    maxCount: number;
    maxDaysPerHold: number;
}

export interface StudioConfig {
    STUDIO_NAME?: string;
    BRANCHES?: BranchConfig[];
    PRICING?: Record<string, { label: string; credits?: number; duration?: number; price?: number }>;
    MEMBERSHIP_TYPE_MAP?: Record<string, string>;
    DEFAULT_SCHEDULE_TEMPLATE?: Record<string, any>;
    SCHEDULE_LEGEND?: ScheduleLegendItem[];
    POLICIES?: {
        ALLOW_BOOKING?: boolean;
        ALLOW_SELF_HOLD?: boolean;
        HOLD_RULES?: HoldRule[];
        [key: string]: any;
    };
    [key: string]: any;
}

export interface ScheduleLegendItem {
    label: string;
    color: string;
    border: string;
    branches: string[];
}

// ── Schedule ──

export interface ScheduleClass {
    time: string;
    title: string;
    className?: string;
    instructor: string;
    status?: 'normal' | 'cancelled';
    duration?: number;
    level?: string;
}

export interface DailySchedule {
    [dateStr: string]: ScheduleClass[];
}

// ── Booking ──

export interface Booking {
    id?: string;
    memberId: string;
    memberName?: string;
    branchId: string;
    date: string;
    classIndex: number;
    status: 'booked' | 'cancelled' | 'attended';
    [key: string]: any;
}

// ── Messaging ──

export interface Message {
    id?: string;
    memberId: string;
    title?: string;
    body: string;
    type?: 'general' | 'expiry' | 'notice' | 'birthday';
    templateId?: string;
    createdAt?: string;
    sentAt?: string;
    isRead?: boolean;
    noticeId?: string;
    [key: string]: any;
}

// ── Face Recognition ──

export interface FaceDescriptorData {
    memberId: string;
    descriptor: number[];
    updatedAt?: string;
}

// ── Hold ──

export interface HoldRecord {
    startDate: string;
    endDate: string;
    days: number;
    cancelledAt?: string;
    appliedAt?: string;
}

