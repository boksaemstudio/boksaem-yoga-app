const { createGenerativeAI } = require("@google/genai");

async function testAIResponse() {
    const apiKey = "AIzaSyA-D2c3p_A8YLGkF1HLxmkayw39P52eEm0"; // API 키 직접 입력 (테스트용)
    const memberName = "테스트회원";
    const attendanceCount = 5;
    const upcomingClass = "하타 요가";
    const weather = "맑음, 기온 15도";
    const timeOfDay = 10;
    const dayOfWeek = "월";

    try {
        const client = createGenerativeAI({ apiKey });
        const model = "gemini-2.0-flash";

        const prompt = `
            당신은 프리미엄 요가 스튜디오 '복샘요가'의 친절하고 지혜로운 AI 원장님입니다.
            회원님에게 줄 따뜻한 응원 문구와 그에 어울리는 배경 테마를 정해주세요.

            정보:
            - 회원 이름: ${memberName}
            - 오늘의 수련 횟수: ${attendanceCount}회
            - 예정된 수업: ${upcomingClass}
            - 현재 날씨 정보: ${weather}
            - 시간대: ${timeOfDay}시
            - 요일: ${dayOfWeek}요일

            지침:
            1. 문구는 1~2문장으로 짧지만 깊은 울림이 있게 작성하세요.
            2. "나마스테"를 문구 끝에 포함하세요.
            3. 회원 이름을 자연스럽게 불러주세요. (예: "${memberName}님, ...")

            답변 형식 (JSON):
            {
              "message": "회원님을 향한 따뜻한 요가 응원 문구",
              "bgTheme": "dawn, sunny, rainy, night, flying, hatha, pregnancy, kids 중 하나",
              "colorTone": "#FDFCF0"
            }
        `;

        console.log("AI 호출 중 (Gemini 2.0 Flash)...");
        const result = await client.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = result.response.text();
        console.log("AI 응답 원문:", text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            console.log("추출된 JSON:", JSON.parse(jsonMatch[0]));
        } else {
            console.error("JSON 형식을 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error("테스트 실패:", error);
    }
}

testAIResponse();
