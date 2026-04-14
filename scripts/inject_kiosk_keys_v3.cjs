const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/utils/translations.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('checkin_member_not_found')) {
    const koKeys = {
        checkin_verifying: '출석 확인 중...',
        checkin_success: '오늘의 수련이 시작됩니다.',
        checkin_extra: '반가워요! 이미 출석 확인이 완료되었습니다. (추가 출석)',
        checkin_consecutive: '오늘의 두 번째 수련이 시작됩니다. (연강 출석)',
        checkin_expired_contact_teacher: '수련권 기간이 만료되었습니다. 선생님께서 안내를 도와드릴게요.',
        checkin_credits_empty_contact_teacher: '수련 횟수가 모두 소진되었습니다. 선생님께서 안내를 도와드릴게요.',
        checkin_last_session: '오늘이 이번 수련권의 마지막 날이네요. 정성 가득한 수련 되세요!',
        checkin_ai_peaceful: '오늘도 평온한 요가 안내해 드릴게요. 나마스테 🙏',
        checkin_member_not_found: '회원 정보를 찾을 수 없습니다.',
        checkin_expired: '기간 혹은 횟수가 만료되었습니다.',
        checkin_system_error: '시스템 오류가 발생했습니다. 다시 시도해주세요.',
        checkin_closed_title: '운영 시간이 종료되었습니다',
        checkin_closed_sub: '내일 다시 만나요',
        checkin_touch_to_start: '화면을 터치하면 출석부로 이동합니다',
        checkin_confirm_question: '출석하시겠습니까?',
        checkin_pin_alternative: '본인이 아니면 4자리 핀번호로 출석해주세요',
        nim: '님',
        facereg_camera_preparing: '카메라 준비 중...',
        facereg_camera_error_permission: '카메라에 접근할 수 없어요. 카메라 권한을 확인해주세요.',
        facereg_member_not_found: '등록된 회원이 없어요. 번호를 확인해주세요.',
        facereg_member_lookup_error: '회원 조회 중 문제가 생겼어요. 다시 시도해주세요.',
        facereg_camera_not_ready: '카메라가 준비되지 않았어요. 잠시 후 다시 시도해주세요.',
        facereg_analyzing_face: '얼굴 분석 중...',
        facereg_loading_ai_models: 'AI 모델 로딩 중...',
        facereg_ai_timeout: 'AI 모델 로딩 시간 초과. 다시 시도해주세요.',
        facereg_video_stream_error: '카메라 영상을 가져올 수 없어요. 카메라 권한을 확인해주세요.',
        facereg_face_not_detected: '얼굴을 인식하지 못했어요. 카메라를 정면으로 바라봐주세요.',
        facereg_saving: '저장 중...',
        facereg_save_failed: '저장에 실패했어요. 다시 시도해주세요.',
        facereg_registration_error: '등록 중 문제가 생겼어요. 다시 시도해주세요.',
        facereg_title: '얼굴로 출석하기',
        facereg_privacy_title: '사진은 저장하지 않아요!',
        facereg_privacy_desc1: '사진은 저장하지 않고 암호화되어 128개 숫자로만 기억해요. 이 숫자로는 얼굴을 다시 만들 수 없어요. (불가역적)',
        facereg_privacy_desc2: '등록하면 다음부터 카메라 앞에 서기만 하면 자동으로 출석이 됩니다!',
        facereg_later: '다음에 할게요',
        facereg_register: '등록할게요!',
        facereg_identity_verify: '본인 확인',
        facereg_enter_pin: '핸드폰 번호 뒷 4자리를 눌러주세요',
        facereg_clear: '지우기',
        facereg_confirm: '확인',
        cancel: '취소',
        facereg_who_are_you: '어느 분이신가요?',
        facereg_multiple_members: '입력하신 번호와 일치하는 회원이 여러 명 있어요',
        facereg_status: '상태',
        facereg_status_active: '활성',
        facereg_go_back: '뒤로 가기',
        facereg_look_at_camera: '{name}님, 카메라를 봐주세요!',
        facereg_look_front: '정면을 바라보고 잠시만 기다려주세요',
        facereg_camera_inaccessible: '카메라 접근 불가',
        facereg_retry: '다시 시도',
        facereg_done_title: '등록 완료!',
        facereg_done_desc1: '<strong>{name}</strong>님의 얼굴이 등록되었어요.',
        facereg_done_desc2: '다음부터 카메라 앞에 서면 자동으로 출석됩니다 🎉',
    };
    
    const enKeys = {
        checkin_verifying: 'Verifying Check-in...',
        checkin_success: 'Your session begins now.',
        checkin_extra: 'Welcome back! You have already checked in. (Extra Session)',
        checkin_consecutive: 'Your second session begins now. (Consecutive Session)',
        checkin_expired_contact_teacher: 'Your pass has expired. Please contact the instructor.',
        checkin_credits_empty_contact_teacher: 'You have no sessions left. Please contact the instructor.',
        checkin_last_session: 'This is the last day of your pass. Have a great session!',
        checkin_ai_peaceful: 'I will guide your peaceful yoga today. Namaste 🙏',
        checkin_member_not_found: 'Member information not found.',
        checkin_expired: 'Pass expired or out of sessions.',
        checkin_system_error: 'A system error occurred. Please try again.',
        checkin_closed_title: 'Operating hours have ended',
        checkin_closed_sub: 'See you tomorrow!',
        checkin_touch_to_start: 'Touch the screen to start check-in',
        checkin_confirm_question: 'Would you like to check in?',
        checkin_pin_alternative: 'If this is not you, please check in using your 4-digit PIN.',
        nim: '',
        facereg_camera_preparing: 'Preparing camera...',
        facereg_camera_error_permission: 'Unable to access camera. Please check permissions.',
        facereg_member_not_found: 'No member registered with this number. Please check the number.',
        facereg_member_lookup_error: 'An error occurred while finding the member. Please try again.',
        facereg_camera_not_ready: 'Camera is not ready. Please try again in a moment.',
        facereg_analyzing_face: 'Analyzing face...',
        facereg_loading_ai_models: 'Loading AI models...',
        facereg_ai_timeout: 'AI model loading timed out. Please try again.',
        facereg_video_stream_error: 'Could not fetch camera stream. Please check permissions.',
        facereg_face_not_detected: 'Could not detect face. Please look straight at the camera.',
        facereg_saving: 'Saving...',
        facereg_save_failed: 'Failed to save. Please try again.',
        facereg_registration_error: 'A problem occurred during registration. Please try again.',
        facereg_title: 'Check-in with Face Recognition',
        facereg_privacy_title: 'We do not save your photos!',
        facereg_privacy_desc1: 'Instead of photos, we securely store your facial features as a 128-dimensional array of numbers. Faces cannot be reconstructed from these numbers.',
        facereg_privacy_desc2: 'Once registered, you can check in simply by standing in front of the camera!',
        facereg_later: 'Maybe later',
        facereg_register: 'Register now!',
        facereg_identity_verify: 'Verify Identity',
        facereg_enter_pin: 'Please enter the last 4 digits of your phone number',
        facereg_clear: 'Clear',
        facereg_confirm: 'Confirm',
        cancel: 'Cancel',
        facereg_who_are_you: 'Which one is you?',
        facereg_multiple_members: 'There are multiple members with the matching number.',
        facereg_status: 'Status',
        facereg_status_active: 'Active',
        facereg_go_back: 'Go back',
        facereg_look_at_camera: 'Please look at the camera, {name}!',
        facereg_look_front: 'Look straight ahead and hold still for a moment.',
        facereg_camera_inaccessible: 'Camera inaccessible',
        facereg_retry: 'Retry',
        facereg_done_title: 'Registration Complete!',
        facereg_done_desc1: '<strong>{name}</strong>, your face has been successfully registered.',
        facereg_done_desc2: 'Next time, just stand in front of the camera to check in 🎉',
    };

    const langs = ['ko', 'en', 'ja', 'zh_CN', 'zh_TW', 'fr', 'es', 'vi', 'th', 'hi', 'pt'];
    
    // Inject properly right after "lang: {" using Regex matching
    for (const lang of langs) {
        const isEn = lang === 'en';
        const sourceKeys = isEn ? enKeys : koKeys;
        
        // Build injection string without template literals to avoid escapes breaking
        let injectStr = '\\n        // =============== KIOSK NATIVE UI ===============\\n';
        for (const [k, v] of Object.entries(sourceKeys)) {
             injectStr += '        ' + k + ': ' + JSON.stringify(v) + ',\\n';
        }

        const regex = new RegExp("(" + lang + ":\\\\s*\\\\{)");
        content = content.replace(regex, "$1" + injectStr);
    }

    fs.writeFileSync(file, content);
    console.log('Successfully injected keys into translations.js for all languages.');
} else {
    console.log('Keys already exist.');
}
