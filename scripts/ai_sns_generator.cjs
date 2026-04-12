const fs = require('fs');
const path = require('path');

// Mock AI Post Generator for Marketing Automation
// In a real-world scenario, this would call Google Gemini API or OpenAI API
// using process.env.GEMINI_API_KEY

const generateSNSPost = (language, topic) => {
    const templates = {
        ko: [
            "🔥 노쇼 때문에 스트레스 받으시나요? PassFlow AI가 해결해 드립니다. 터치 한 번이면 노쇼 횟수 자동차감! 💳 연 10만원으로 시작하는 완벽한 요가/필라테스 스튜디오 관리. 지금 60일 무료 체험을 시작하세요! #요가원관리 #필라테스관리 #패스플로우AI #PassFlow #스튜디오운영",
            "✨ 얼굴 인식 출석체크, 아직도 수백만 원짜리 기기를 사시나요? 안 쓰는 태블릿 하나면 끝! PassFlow AI는 추가 비용 없이 AI 얼굴 인식 기능을 기본 제공합니다. 💻 매달 나가는 관리비 0원, 연 10만원만 내세요. #헬스장관리 #피트니스 #얼굴인식 #AI",
            "📊 우리 스튜디오의 가장 피크 타임은 언제일까요? PassFlow AI에 탑재된 스마트 대시보드로 출석률, 빈자리, 잔여 수강권을 한눈에 분석하세요. 🚀 똑똑한 원장님의 필수 선택! #요가스튜디오 #관리프로그램 #PassFlowAI"
        ],
        en: [
            "🚀 Tired of paying $200+/month for Mindbody or ZenPlanner? Switch to PassFlow AI for just $69/YEAR. Yes, per year. Fully loaded with AI facial recognition check-in, bookings, and CRM. 💳 Start your free trial today! #GymSoftware #PassFlowAI #FitnessBusiness #YogaStudio Software",
            "✨ Why buy expensive scanners? PassFlow AI turns any old iPad into an advanced AI facial recognition check-in kiosk. 📱 Your members just smile and walk in! Zero hardware cost. Zero per-member fees. #GymTech #PassFlow #StudioManagement #Fitness",
            "📊 Stop guessing and start growing! PassFlow AI’s GPT-powered dashboard gives you deep insights into revenue, attendance spikes, and drop-off rates. 💼 Manage your health club the smart way. #GymOwner #FitnessCRM #AI #PassFlowAI"
        ],
        ja: [
            "🔥 hacomonoの初期費用や月額数万円に悩んでいませんか？ PassFlow AIなら【年間わずか約10,000円（$69）】！ 💳 しかも初期費用は0円。iPadひとつでAI顔認証が使えます。今すぐ無料で試してみませんか？ #ヨガスタジオ経営 #フィットネスクラブ #PassFlowAI #コスト削減 #hacomono代替",
            "✨ 高価なスマートロックは不要です！PassFlow AIなら、市販のタブレットを置くだけで「顔認証チェックイン」が完成。手ぶらで通えるスタジオを実現します。💻 月額費用0円！ #ジムシステム #顔認証 #PassFlowAI #フィットネスシステム",
            "📊 スタジオの売上や混雑状況をパッと把握したいですか？ PassFlow AIの強力なダッシュボードが、あなたのスタジオ運営をAIでサポートします。 🚀 スマートなオーナーの賢い選択！ #ジム経営 #予約システム #PassFlowAI"
        ]
    };

    const topicsForLang = templates[language];
    if (!topicsForLang) return "Unsupported language.";
    
    // Select random post
    const post = topicsForLang[Math.floor(Math.random() * topicsForLang.length)];
    return post;
}

function runMarketingAutomation() {
    console.log("🤖 Starting AI SNS Post Generation...\n");
    const today = new Date().toISOString().split('T')[0];
    const outputFile = path.join(__dirname, '..', 'reports', 'sns_posts_' + today + '.md');
    
    let mdContent = '# 📅 PassFlow AI SNS 마케팅 포스트 (Date: ' + today + ')\n\n';
    mdContent += "> 이 파일은 마케팅 자동화 봇에 의해 생성되었습니다. 인스타그램, 페이스북, 트위터에 복사하여 사용하세요.\n\n";

    const langs = ['ko', 'en', 'ja'];
    for (let i = 0; i < langs.length; i++) {
        const lang = langs[i];
        mdContent += '## 🌐 [' + lang.toUpperCase() + '] Campaign Post\n';
        mdContent += '```text\n' + generateSNSPost(lang) + '\n```\n\n';
    }

    // Ensure reports dir exists
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)){
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, mdContent, 'utf8');
    console.log('✅ Generated SNS marketing posts for today: reports/sns_posts_' + today + '.md');
}

runMarketingAutomation();
