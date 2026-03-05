/**
 * Meditation AI Conversation Logic Simulation
 * This script simulates how the generateMeditationGuidance function 
 * handles a multi-turn conversation with a user.
 */

const mockAIGenerate = async (prompt) => {
    // Simple mock to simulate AI decision making based on prompt
    const historyFound = prompt.includes('Client:');
    const isStart = !historyFound;
    
    if (isStart) {
        return JSON.stringify({
            question: "안녕하세요. 오늘 당신의 마음은 어떤 날씨인가요?",
            options: ["맑고 쾌활해요", "비가 오는 것처럼 차분해요", "바람이 부는 것처럼 어수선해요", "구름 낀 듯 답답해요"],
            isFinalAnalysis: false
        });
    }

    if (prompt.includes('바람이 부는 것처럼 어수선해요')) {
        return JSON.stringify({
            question: "생각이 이리저리 흩어지고 있군요. 혹시 그 어수선함이 몸의 긴장으로도 느껴지시나요?",
            options: ["머리가 무거워요", "어깨에 힘이 들어가요", "가슴이 답답해요", "신체적 긴장은 없어요"],
            isFinalAnalysis: false
        });
    }

    if (prompt.includes('가슴이 답답해요')) {
        return JSON.stringify({
            question: "",
            options: [],
            isFinalAnalysis: true,
            analysisSummary: "마음의 불안이 신체적 답답함으로 나타나고 있군요. 호흡을 통해 가슴의 압박을 풀어내고 흩어진 생각을 가다듬는 시간이 필요해 보입니다.",
            mappedDiagnosis: "anxious"
        });
    }

    return JSON.stringify({ question: "더 말씀해 주시겠어요?", options: ["괜찮아요"], isFinalAnalysis: false });
};

async function simulateConversation() {
    console.log("🚀 Starting Meditation AI Simulation...\n");
    let chatHistory = [];
    let isDone = false;
    let turn = 1;

    // Simulation steps
    const userAnswers = ["바람이 부는 것처럼 어수선해요", "가슴이 답답해요"];

    while (!isDone && turn <= 3) {
        console.log(`--- Turn ${turn} ---`);
        
        // Construct prompt (simplified)
        const historyText = chatHistory.length > 0 
            ? chatHistory.map(m => `${m.role === 'user' ? 'Client' : 'AI'}: ${m.content}`).join('\n')
            : 'No previous conversation.';
            
        const prompt = `Simulation Prompt with History:\n${historyText}`;
        
        const responseText = await mockAIGenerate(prompt);
        const response = JSON.parse(responseText);
        
        if (response.isFinalAnalysis) {
            console.log(`AI Analysis: ${response.analysisSummary}`);
            console.log(`Mapped Diagnosis: ${response.mappedDiagnosis}`);
            isDone = true;
        } else {
            console.log(`AI Question: ${response.question}`);
            console.log(`AI Options: [${response.options.join(', ')}]`);
            
            const nextAnswer = userAnswers[turn-1];
            console.log(`User Answer: ${nextAnswer}`);
            
            chatHistory.push({ role: 'assistant', content: response.question });
            chatHistory.push({ role: 'user', content: nextAnswer });
        }
        console.log("\n");
        turn++;
    }
    
    console.log("✅ Simulation Complete. Logic verified.");
}

simulateConversation();
