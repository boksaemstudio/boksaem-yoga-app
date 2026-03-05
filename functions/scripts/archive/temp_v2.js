exports.generatePageExperienceV2 = onCall({ region: "asia-northeast3", cors: true }, async (request) => {
    await checkAIQuota();

    let { memberName, weather, timeOfDay, dayOfWeek, upcomingClass, language = 'ko', role = 'member', type } = request.data;
    const isCheckIn = request.data.context === 'checkin';
    const category = request.data.category;
    const preciseTime = request.data.preciseTime;
    const diligence = request.data.diligence || {};
    const streak = diligence.streak || 0;

    if (role === 'admin' && !request.auth) {
        role = 'visitor';
    }

    try {
        const ai = getAI();
        const targetLang = ai.getLangName(language);
        let prompt = "";

        // 1. SELECT PROMPT
        if (type === 'analysis' || role === 'admin') {
            const logs = request.data.logs || [];
            const recentLogs = logs.slice(0, 10).map(l => l.className).join(", ");
            const stats = request.data.stats || {};
            prompt = `
                 You are the Senior Analyst of '복샘요가'. 
                 Provide a **factual, data-driven analysis** for the ${role === 'admin' ? 'Administrator' : 'Member'}.
                 Recent Pattern: ${recentLogs}, Stats: ${JSON.stringify(stats)}
                 Requirements:
                 1. Tone: ${role === 'admin' ? 'Factual, Concise' : 'Meditative, Encouraging'}.
                 2. Length: **1-2 sentences**.
                 Language: **${targetLang}**.
                 Output Format (JSON ONLY): { "message": "Text...", "bgTheme": "data" }
            `;
        } else if (role === 'visitor' || !memberName || ["방문 회원", "방문회원", "visitor", "Guest"].includes(memberName)) {
            prompt = `
                 Poetic/warm greeting for a yoga visitor. 
                 Context: ${timeOfDay}h, Weather: ${weather}.
                 Length: **1 sentence**. Language: ${targetLang}.
                 Format: { "message": "...", "bgTheme": "dawn" }
            `;
        } else if (request.data.context === 'instructor') {
            const attendanceCount = request.data.attendanceCount || 0;
            prompt = `
                Director's greeting for instructor ${memberName}.
                Context: ${timeOfDay}h, Attendance: ${attendanceCount} members.
                Length: **1-2 sentences**. Language: Korean.
                Format: { "message": "...", "bgTheme": "dawn" }
            `;
        } else {
            prompt = `
                'Yoga Wisdom Guide' greeting for member ${memberName}.
                Context: ${weather}, ${timeOfDay}h, isCheckIn: ${isCheckIn}.
                Length: **1-2 sentences**. Language: ${targetLang}.
                Format: { "message": "...", "bgTheme": "dawn" }
            `;
        }

        // 2. GENERATE EXPERIENCE
        const result = await ai.generateExperience(prompt);
        if (!result) throw new Error("AI returned null");

        // 3. GENERATE AUDIO (COMBINED)
        const audioText = result.message || "";
        const audioContent = await generateInternalAudio(audioText);

        return {
            ...result,
            audioContent: audioContent
        };
    } catch (error) {
        console.error("AI Generation Failed:", error);
        return {
            message: "매트 위에서 나를 만나는 소중한 시간입니다.",
            bgTheme: "sunny",
            isFallback: true,
            error: error.message
        };
    }
});
