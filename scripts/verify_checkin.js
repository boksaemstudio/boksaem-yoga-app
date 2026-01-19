
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc, updateDoc, addDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAGoYm-y-nStH33UaRR8KIy2MRP_fQt_g0",
    authDomain: "studio-4401180292-32f52.firebaseapp.com",
    projectId: "studio-4401180292-32f52",
    storageBucket: "studio-4401180292-32f52.firebasestorage.app",
    messagingSenderId: "919620283844",
    appId: "1:919620283844:web:fd338767c8866cb2f84891"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STORAGE_KEYS = {
    MEMBERS: 'members',
    ATTENDANCE: 'attendance',
    SCHEDULES: 'schedules'
};

// Mocking storageService parts
const storageService = {
    async getMemberById(id) {
        const docSnap = await getDoc(doc(db, STORAGE_KEYS.MEMBERS, id));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    async getCurrentClassFromDB(branchId) {
        const today = new Date().toISOString().split('T')[0];
        const docRef = doc(db, 'daily_classes', `${branchId}_${today}`);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return "MOCKED CLASS"; // Simplified
    },

    async getCurrentClass(branchId) { return null; },

    async checkInById(memberId, branchId) {
        console.log(`[checkInById] Starting for ${memberId}, branch: ${branchId}`);
        try {
            // 1. Get Member
            console.log("[checkInById] Fetching member...");
            let member = await this.getMemberById(memberId); // Using 'this'

            if (!member) {
                return { success: false, message: '회원 정보를 찾을 수 없습니다.' };
            }
            console.log(`[checkInById] Member found: ${member.name}, Credits: ${member.credits}`);

            if (member.credits <= 0) {
                return { success: false, message: '잔여 횟수가 부족합니다.', member };
            }

            const today = new Date().toISOString().split('T')[0];
            const updateData = {
                credits: member.credits - 1,
                lastAttended: today
            };

            if (!member.startDate) {
                updateData.startDate = today;
            }

            console.log("[checkInById] Updating member doc...");
            await updateDoc(doc(db, STORAGE_KEYS.MEMBERS, member.id), updateData);

            // Skip cache update as we are in script

            // Find current class name
            let currentClass = null;
            try {
                // Bind check
                console.log("[checkInById] Looking up class...");
                currentClass = await this.getCurrentClassFromDB(branchId);
                if (!currentClass) currentClass = await this.getCurrentClass(branchId);
            } catch (err) {
                console.warn("Class lookup failed", err);
            }

            // Log attendance
            console.log("[checkInById] Logging attendance...");
            const newLog = {
                memberId: member.id,
                memberName: member.name,
                branchId,
                className: currentClass || '자율수련',
                timestamp: new Date().toISOString()
            };

            const logRef = await addDoc(collection(db, STORAGE_KEYS.ATTENDANCE), newLog);
            console.log(`[checkInById] Attendance logged: ${logRef.id}`);

            return {
                success: true,
                message: 'Success'
            };
        } catch (error) {
            console.error("checkInById critical error:", error);
            return { success: false, message: `오류가 발생했습니다: ${error.message}` };
        }
    }
};

async function runTest() {
    // 10529 or DwaOkAPtIrwPdLVepfvt
    const targetId = "10529";
    console.log(`Running test for ${targetId}`);
    const result = await storageService.checkInById(targetId, 'gwangheungchang');
    console.log("Result:", result);
    process.exit(0);
}

runTest();
