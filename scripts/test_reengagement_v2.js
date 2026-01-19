import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyA-D2c3p_A8YLGkF1HLxmkayw39P52eEm0"; // From previous script, might be expired but worth a shot
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function testReEngagement() {
    console.log("Testing AI Re-engagement Message Generation...");

    const member = {
        name: "송대민",
        endDate: "2026-01-17",
        credits: 0
    };
    const attendanceStats = "하타 요가 5회, 비크람 요가 3회, 주로 월요일 오전 수련";

    const prompt = `
        당신은 프리미엄 요가 스튜디오 '복샘요가'의 친절하고 지혜로운 AI 원장님입니다.
        회원님의 수강권이 만료되었거나 소진되었습니다. 다시 수련을 시작하도록 격려하는 짧고 따뜻한 메시지를 작성해주세요.

        회원 정보:
        - 이름: ${member.name}
        - 수련 데이터 요약: ${attendanceStats}

        지침:
        1. 1~2문장으로 아주 짧고 간결하게 작성하세요. (푸시 알림용)
        2. 회원님의 과거 수련 패턴(예: 꾸준함, 특정 요일 선호 등)을 언급하며 "그때의 평온함을 기억하시나요?" 같은 감성적인 접근을 하세요.
        3. "다시 매트 위에서 뵙기를 기다리겠습니다"라는 메시지를 포함하세요.
        4. 정중하되 따뜻한 어조를 사용하세요.

        답변은 오직 메시지 텍스트만 출력하세요.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        console.log("-----------------------------------------");
        console.log("AI Generated Message:");
        console.log(text);
        console.log("-----------------------------------------");
    } catch (error) {
        console.error("AI Generation Failed:", error);
    }
}

testReEngagement();
