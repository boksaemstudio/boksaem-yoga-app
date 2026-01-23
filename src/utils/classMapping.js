export const classNameMap = {
    "하타": "hatha",
    "아쉬탕가": "ashtanga",
    "마이솔": "mysore",
    "빈야사": "vinyasa",
    "힐링": "healing",
    "인요가": "yin",
    "인양요가": "inyang",
    "플라잉": "flying",
    "로우플라잉": "lowflying",
    "키즈플라잉": "kids",
    "임신부요가": "pregnancy",
    "하타 인텐시브": "hatha_intensive",
    "심화": "intensive",
    "일반": "regular",
    "테라피": "healing",
    "소도구 테라피": "healing",
    "자율수련": "selfPractice",
    "자율수업": "selfPractice"
};

export const getTranslatedClass = (title, t) => {
    if (!title) return "";

    // Direct special cases handling keys that don't follow 'class_' prefix
    if (title === "자율수련" || title === "자율수업") {
        return t('selfPractice');
    }

    const key = classNameMap[title] || title;

    // Try translation with 'class_' prefix
    const translated = t(`class_${key}`);

    // If translation is same as key (missing), return original title
    return translated !== `class_${key}` ? translated : title;
};
