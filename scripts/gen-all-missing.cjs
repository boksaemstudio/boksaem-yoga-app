#!/usr/bin/env node
/**
 * gen-all-missing.cjs — 남은 모든 누락 키의 네이티브 번역을 전 언어에 추가
 */
const fs = require('fs');
const path = require('path');
const TRANSLATIONS_PATH = path.resolve(__dirname, '..', 'src', 'utils', 'translations.js');

function parseTranslationsFile() {
    const content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const languages = {};
    const langPositions = [];
    const langRegex = /^    (\w+): \{/gm;
    let match;
    while ((match = langRegex.exec(content)) !== null) { langPositions.push({ lang: match[1], start: match.index }); }
    for (let i = 0; i < langPositions.length; i++) {
        const lang = langPositions[i].lang;
        const startIdx = langPositions[i].start;
        let braceCount = 0, inBlock = false, blockContent = '';
        for (let j = startIdx; j < content.length; j++) {
            if (content[j] === '{') { braceCount++; inBlock = true; }
            if (content[j] === '}') braceCount--;
            if (inBlock) blockContent += content[j];
            if (inBlock && braceCount === 0) break;
        }
        const kvPairs = {};
        const lines = blockContent.split('\n');
        for (const line of lines) {
            const m = line.match(/^\s+(?:"([^"]+)"|'([^']+)'|([a-zA-Z_]\w*))\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/);
            if (m) { const key = m[1] || m[2] || m[3]; const value = m[4] || m[5] || m[6] || ''; if (key) kvPairs[key] = value; }
        }
        languages[lang] = kvPairs;
    }
    return languages;
}

function getEnglishKeyTranslations() {
// All remaining English-style keys with translations for all target languages
return {
    // ═══ Member App UI ═══
    installDescIOS: { ru: "Используйте приложение без ввода адреса каждый раз.", zh: "无需每次输入地址，直接作为应用使用。", ja: "毎回アドレスを入力する必要なく、アプリとして便利にご利用ください。", es: "Úselo como app sin ingresar la dirección cada vez.", pt: "Use como app sem digitar o endereço toda vez.", fr: "Utilisez comme app sans saisir l'adresse à chaque fois.", de: "Nutzen Sie es als App, ohne jedes Mal die Adresse einzugeben." },
    installDescAndroid: { ru: "Одна установка — управляйте записями быстрее.", zh: "一次安装，更快捷地管理练习记录。", ja: "一度のインストールで、より速く便利に記録を管理。", es: "Una instalación para gestionar registros más rápido.", pt: "Uma instalação para gerenciar registros mais rápido.", fr: "Une installation pour gérer vos enregistrements plus vite.", de: "Eine Installation für schnellere Verwaltung Ihrer Aufzeichnungen." },
    appInstallGuide: { ru: "💡 Выберите 'Установить приложение' в меню браузера.", zh: "💡 请在浏览器菜单中选择'安装应用'。", ja: "💡 ブラウザメニューから「アプリをインストール」を選択してください。", es: "💡 Seleccione 'Instalar app' en el menú del navegador.", pt: "💡 Selecione 'Instalar app' no menu do navegador.", fr: "💡 Sélectionnez 'Installer l'appli' dans le menu du navigateur.", de: "💡 Wählen Sie 'App installieren' im Browser-Menü." },
    inAppBrowserWarning: { ru: "💡 Для лучшего опыта откройте в Chrome или Safari.", zh: "💡 为获得更好的体验，请用Chrome或Safari打开。", ja: "💡 より良い体験のためにChromeまたはSafariで開いてください。", es: "💡 Para mejor experiencia, abra en Chrome o Safari.", pt: "💡 Para melhor experiência, abra no Chrome ou Safari.", fr: "💡 Pour une meilleure expérience, ouvrez dans Chrome ou Safari.", de: "💡 Für ein besseres Erlebnis bitte in Chrome oder Safari öffnen." },
    analysisPending: { ru: "Анализируем ваши данные для подготовки инсайтов...", zh: "正在分析您的记录以准备洞察...", ja: "記録を分析してインサイトを準備中...", es: "Analizando tus datos para preparar insights...", pt: "Analisando seus dados para preparar insights...", fr: "Analyse de vos données pour préparer des insights...", de: "Ihre Daten werden für Insights analysiert..." },
    scheduleSub: { ru: "Проверьте расписание и подготовьтесь.", zh: "查看今日课程表，做好准备。", ja: "今日のスケジュールを確認し、心身を整えましょう。", es: "Consulte el horario de hoy y prepárese.", pt: "Confira o horário de hoje e prepare-se.", fr: "Consultez l'horaire du jour et préparez-vous.", de: "Prüfen Sie den heutigen Zeitplan und bereiten Sie sich vor." },
    homeYogaTitle: { ru: "3-минутная йога дома", zh: "今日3分钟居家瑜伽", ja: "今日の3分ホームヨガ", es: "Yoga en casa de 3 minutos", pt: "Yoga em casa de 3 minutos", fr: "Yoga à la maison de 3 minutes", de: "3-Minuten-Yoga für zu Hause" },
    homeYogaSub: { ru: "Если не можете прийти в студию — хотя бы это!", zh: "来不到工作室的话，至少做这个！", ja: "スタジオに来られない日はこれだけでも！", es: "¡Al menos esto si no puede ir al estudio!", pt: "Pelo menos isto se não puder ir ao estúdio!", fr: "Au moins ceci si vous ne pouvez pas venir au studio !", de: "Zumindest das, wenn Sie nicht ins Studio kommen können!" },
    weatherPrefix: { ru: "Сеул", zh: "首尔", ja: "ソウル", es: "Seúl", pt: "Seul", fr: "Séoul", de: "Seoul" },

    // ═══ Payment / Membership ═══
    paymentItem: { ru: "Товар оплаты", zh: "付款项目", ja: "決済項目", es: "Artículo de pago", pt: "Item de pagamento", fr: "Article de paiement", de: "Zahlungsartikel" },
    payCard: { ru: "Карта", zh: "刷卡", ja: "カード", es: "Tarjeta", pt: "Cartão", fr: "Carte", de: "Karte" },
    payCash: { ru: "Наличные", zh: "现金", ja: "現金", es: "Efectivo", pt: "Dinheiro", fr: "Espèces", de: "Bargeld" },
    payOther: { ru: "Другое", zh: "其他", ja: "その他", es: "Otro", pt: "Outro", fr: "Autre", de: "Sonstiges" },
    payTransfer: { ru: "Перевод", zh: "转账", ja: "振込", es: "Transferencia", pt: "Transferência", fr: "Virement", de: "Überweisung" },
    paidOn: { ru: "Дата оплаты", zh: "支付日期", ja: "決済日", es: "Fecha de pago", pt: "Data de pagamento", fr: "Date de paiement", de: "Zahlungsdatum" },
    won: { ru: "₩", zh: "₩", ja: "₩", es: "₩", pt: "₩", fr: "₩", de: "₩" },
    countUnit: { ru: "раз", zh: "次", ja: "回", es: "veces", pt: "vezes", fr: "fois", de: "Mal" },
    nim: { ru: "", zh: "", ja: "さん", es: "", pt: "", fr: "", de: "" },

    // ═══ Hold / Pause ═══
    holdingStatus: { ru: "Приостановлено", zh: "暂停中", ja: "ホールド中", es: "En pausa", pt: "Em pausa", fr: "En pause", de: "Pausiert" },
    holdPauseTitle: { ru: "Приостановка абонемента", zh: "暂停会员资格", ja: "会員資格一時停止", es: "Pausar membresía", pt: "Pausar assinatura", fr: "Mettre en pause l'abonnement", de: "Mitgliedschaft pausieren" },
    holdElapsed: { ru: "Прошло", zh: "已经过", ja: "経過", es: "Transcurrido", pt: "Decorrido", fr: "Écoulé", de: "Vergangen" },
    holdAutoRelease: { ru: "Авто-возобновление", zh: "自动恢复", ja: "自動解除", es: "Reanudación automática", pt: "Retomada automática", fr: "Reprise automatique", de: "Automatische Wiederaufnahme" },
    holdExtended: { ru: "Абонемент продлён!", zh: "会员已延期！", ja: "会員期間が延長されました！", es: "¡Membresía extendida!", pt: "Assinatura estendida!", fr: "Abonnement prolongé !", de: "Mitgliedschaft verlängert!" },
    holdApplied: { ru: "Приостановка применена", zh: "暂停已生效", ja: "ホールドが適用されました", es: "Pausa aplicada", pt: "Pausa aplicada", fr: "Pause appliquée", de: "Pause angewendet" },
    holdFailed: { ru: "Не удалось приостановить", zh: "暂停失败", ja: "ホールド失敗", es: "Error al pausar", pt: "Falha ao pausar", fr: "Échec de la mise en pause", de: "Pause fehlgeschlagen" },
    holdError: { ru: "Ошибка приостановки", zh: "暂停错误", ja: "ホールドエラー", es: "Error de pausa", pt: "Erro de pausa", fr: "Erreur de pause", de: "Pausenfehler" },
    endDateTBD: { ru: "Будет определено", zh: "待定", ja: "未定", es: "Por determinar", pt: "A ser determinado", fr: "À déterminer", de: "Wird bestimmt" },
    daysLeftHolding: { ru: "Осталось (приостановлено)", zh: "剩余（暂停中）", ja: "残り（ホールド中）", es: "Restante (en pausa)", pt: "Restante (em pausa)", fr: "Restant (en pause)", de: "Verbleibend (pausiert)" },
    holdBtnLabel: { ru: "Приостановить", zh: "暂停", ja: "ホールド", es: "Pausar", pt: "Pausar", fr: "Mettre en pause", de: "Pausieren" },
    holdRemaining: { ru: "Оставшихся приостановок", zh: "剩余暂停次数", ja: "残りホールド回数", es: "Pausas restantes", pt: "Pausas restantes", fr: "Pauses restantes", de: "Verbleibende Pausen" },
    holdModalTitle: { ru: "Приостановка абонемента", zh: "暂停会员资格", ja: "会員資格ホールド", es: "Pausar membresía", pt: "Pausar assinatura", fr: "Pause de l'abonnement", de: "Mitgliedschaft pausieren" },
    holdModalDesc: { ru: "Выберите период приостановки.", zh: "选择暂停期间。", ja: "ホールド期間を選択してください。", es: "Seleccione el período de pausa.", pt: "Selecione o período de pausa.", fr: "Sélectionnez la période de pause.", de: "Wählen Sie den Pausenzeitraum." },
    holdSelectPeriod: { ru: "Выберите период", zh: "选择期间", ja: "期間を選択", es: "Seleccionar período", pt: "Selecionar período", fr: "Sélectionner la période", de: "Zeitraum auswählen" },
    holdWeekDays: { ru: "{n} нед. ({d} дней)", zh: "{n}周（{d}天）", ja: "{n}週間（{d}日）", es: "{n} sem. ({d} días)", pt: "{n} sem. ({d} dias)", fr: "{n} sem. ({d} jours)", de: "{n} Wo. ({d} Tage)" },
    holdNoteAuto: { ru: "Авто-возобновление по истечении.", zh: "到期后自动恢复。", ja: "期間終了後に自動解除されます。", es: "Se reanuda automáticamente al expirar.", pt: "Retomada automática ao expirar.", fr: "Reprise automatique à l'expiration.", de: "Automatische Wiederaufnahme nach Ablauf." },
    holdNoteExtend: { ru: "Дата окончания будет продлена на период приостановки.", zh: "到期日将延长暂停的天数。", ja: "ホールド期間分、終了日が延長されます。", es: "La fecha de fin se extiende por el período de pausa.", pt: "A data final é estendida pelo período de pausa.", fr: "La date de fin est prolongée de la durée de la pause.", de: "Das Enddatum verlängert sich um den Pausenzeitraum." },
    processing: { ru: "Обработка...", zh: "处理中...", ja: "処理中...", es: "Procesando...", pt: "Processando...", fr: "Traitement...", de: "Verarbeitung..." },
    holdStartBtn: { ru: "Начать приостановку", zh: "开始暂停", ja: "ホールド開始", es: "Iniciar pausa", pt: "Iniciar pausa", fr: "Démarrer la pause", de: "Pause starten" },

    // ═══ Attendance ═══
    practiceHistory: { ru: "История практик", zh: "练习历史", ja: "練習履歴", es: "Historial de práctica", pt: "Histórico de prática", fr: "Historique de pratique", de: "Übungsverlauf" },
    normalCount: { ru: "Обычные", zh: "正常", ja: "通常", es: "Normal", pt: "Normal", fr: "Normal", de: "Normal" },
    expiredCancelCount: { ru: "Истёкшие/Отменённые", zh: "过期/取消", ja: "期限切れ/キャンセル", es: "Expirado/Cancelado", pt: "Expirado/Cancelado", fr: "Expiré/Annulé", de: "Abgelaufen/Storniert" },
    listView: { ru: "Список", zh: "列表", ja: "リスト", es: "Lista", pt: "Lista", fr: "Liste", de: "Liste" },
    calendarView: { ru: "Календарь", zh: "日历", ja: "カレンダー", es: "Calendario", pt: "Calendário", fr: "Calendrier", de: "Kalender" },
    deniedNoCredits: { ru: "Кредиты закончились.", zh: "剩余次数不足。", ja: "残り回数がありません。", es: "Sin créditos restantes.", pt: "Sem créditos restantes.", fr: "Plus de crédits restants.", de: "Keine Guthaben mehr." },
    deniedWeeklyLimit: { ru: "Недельный лимит исчерпан.", zh: "已达到每周限制。", ja: "週間制限に達しました。", es: "Límite semanal alcanzado.", pt: "Limite semanal atingido.", fr: "Limite hebdomadaire atteinte.", de: "Wochenlimit erreicht." },
    deniedDailyLimit: { ru: "Дневной лимит исчерпан.", zh: "已达到每日限制。", ja: "1日の制限に達しました。", es: "Límite diario alcanzado.", pt: "Limite diário atingido.", fr: "Limite quotidienne atteinte.", de: "Tageslimit erreicht." },
    deniedExpired: { ru: "Абонемент истёк.", zh: "会员已过期。", ja: "会員期限が切れています。", es: "Membresía expirada.", pt: "Assinatura expirada.", fr: "Abonnement expiré.", de: "Mitgliedschaft abgelaufen." },
    sessionN: { ru: "Сессия {n}", zh: "第{n}次", ja: "第{n}回", es: "Sesión {n}", pt: "Sessão {n}", fr: "Séance {n}", de: "Sitzung {n}" },
    cancelAttendance: { ru: "Отменить посещение", zh: "取消出勤", ja: "出席を取消", es: "Cancelar asistencia", pt: "Cancelar frequência", fr: "Annuler la présence", de: "Anwesenheit stornieren" },
    loadMoreN: { ru: "Показать ещё {n}", zh: "加载更多 {n}", ja: "さらに{n}件読み込む", es: "Cargar {n} más", pt: "Carregar mais {n}", fr: "Charger {n} de plus", de: "Weitere {n} laden" },
    loadMsg1: { ru: "Загрузка истории...", zh: "加载历史中...", ja: "履歴を読み込み中...", es: "Cargando historial...", pt: "Carregando histórico...", fr: "Chargement de l'historique...", de: "Verlauf wird geladen..." },
    loadMsg2: { ru: "Почти готово...", zh: "快好了...", ja: "もう少しです...", es: "Casi listo...", pt: "Quase pronto...", fr: "Presque prêt...", de: "Fast fertig..." },
    loadMsg3: { ru: "Собираем данные...", zh: "正在整理数据...", ja: "データを整理中...", es: "Recopilando datos...", pt: "Coletando dados...", fr: "Collecte des données...", de: "Daten werden gesammelt..." },
    loadMsg4: { ru: "Осталось немного...", zh: "还剩一点...", ja: "あと少しです...", es: "Falta poco...", pt: "Falta pouco...", fr: "Encore un peu...", de: "Nur noch ein wenig..." },

    // ═══ Price / Tuition ═══  
    tuitionFee: { ru: "Стоимость обучения", zh: "学费", ja: "受講料", es: "Tarifa", pt: "Tarifa", fr: "Tarif", de: "Gebühr" },
    longTermDiscount: { ru: "Долгосрочная скидка", zh: "长期优惠", ja: "長期割引", es: "Descuento a largo plazo", pt: "Desconto a longo prazo", fr: "Réduction longue durée", de: "Langzeitrabatt" },
    classLabel: { ru: "Занятие", zh: "课程", ja: "クラス", es: "Clase", pt: "Aula", fr: "Cours", de: "Kurs" },
    threeMonthDiscount: { ru: "Скидка 3 мес.", zh: "3个月优惠", ja: "3ヶ月割引", es: "Descuento 3 meses", pt: "Desconto 3 meses", fr: "Réduction 3 mois", de: "3-Monats-Rabatt" },
    sixMonthDiscount: { ru: "Скидка 6 мес.", zh: "6个月优惠", ja: "6ヶ月割引", es: "Descuento 6 meses", pt: "Desconto 6 meses", fr: "Réduction 6 mois", de: "6-Monats-Rabatt" },
    ticketType: { ru: "Тип абонемента", zh: "票种类型", ja: "チケットタイプ", es: "Tipo de abono", pt: "Tipo de assinatura", fr: "Type d'abonnement", de: "Abo-Typ" },
    cashLabel: { ru: "Наличные", zh: "现金", ja: "現金", es: "Efectivo", pt: "Dinheiro", fr: "Espèces", de: "Bargeld" },
    deferRules: { ru: "Правила приостановки", zh: "暂停规则", ja: "休会規定", es: "Reglas de pausa", pt: "Regras de pausa", fr: "Règles de pause", de: "Pausenregeln" },
    paymentAccount: { ru: "Счёт для оплаты", zh: "付款账户", ja: "決済アカウント", es: "Cuenta de pago", pt: "Conta de pagamento", fr: "Compte de paiement", de: "Zahlungskonto" },
    accountHolder: { ru: "Владелец счёта", zh: "账户持有人", ja: "口座名義", es: "Titular de la cuenta", pt: "Titular da conta", fr: "Titulaire du compte", de: "Kontoinhaber" },
    todayWisdom: { ru: "Мудрость дня", zh: "今日智慧", ja: "今日の知恵", es: "Sabiduría del día", pt: "Sabedoria do dia", fr: "Sagesse du jour", de: "Weisheit des Tages" },
    sessionComplete: { ru: "Сессия завершена", zh: "课程完成", ja: "セッション完了", es: "Sesión completada", pt: "Sessão concluída", fr: "Séance terminée", de: "Sitzung abgeschlossen" },

    // ═══ Push / Install ═══
    pushOnLabel: { ru: "Включить уведомления", zh: "开启推送", ja: "プッシュON", es: "Activar notificaciones", pt: "Ativar notificações", fr: "Activer les notifications", de: "Benachrichtigungen ein" },
    pushOffLabel: { ru: "Выключить уведомления", zh: "关闭推送", ja: "プッシュOFF", es: "Desactivar notificaciones", pt: "Desativar notificações", fr: "Désactiver les notifications", de: "Benachrichtigungen aus" },
    pushOffConfirm: { ru: "Отключить уведомления?", zh: "关闭通知？", ja: "通知を無効にしますか？", es: "¿Desactivar notificaciones?", pt: "Desativar notificações?", fr: "Désactiver les notifications ?", de: "Benachrichtigungen deaktivieren?" },
    installIOS: { ru: "Установить на iOS", zh: "安装到iOS", ja: "iOSにインストール", es: "Instalar en iOS", pt: "Instalar no iOS", fr: "Installer sur iOS", de: "Auf iOS installieren" },
    installAndroid: { ru: "Установить на Android", zh: "安装到Android", ja: "Androidにインストール", es: "Instalar en Android", pt: "Instalar no Android", fr: "Installer sur Android", de: "Auf Android installieren" },
    installIOSDesc: { ru: "Удобный доступ с домашнего экрана.", zh: "从主屏幕方便访问。", ja: "ホーム画面から便利にアクセス。", es: "Acceso fácil desde la pantalla de inicio.", pt: "Acesso fácil na tela inicial.", fr: "Accès facile depuis l'écran d'accueil.", de: "Einfacher Zugriff vom Startbildschirm." },
    installAndroidDesc: { ru: "Удобный доступ с домашнего экрана.", zh: "从主屏幕方便访问。", ja: "ホーム画面から便利にアクセス。", es: "Acceso fácil desde la pantalla de inicio.", pt: "Acesso fácil na tela inicial.", fr: "Accès facile depuis l'écran d'accueil.", de: "Einfacher Zugriff vom Startbildschirm." },
    installBtn: { ru: "Установить", zh: "安装", ja: "インストール", es: "Instalar", pt: "Instalar", fr: "Installer", de: "Installieren" },
    installWord: { ru: "Установить", zh: "安装", ja: "インストール", es: "Instalar", pt: "Instalar", fr: "Installer", de: "Installieren" },
    addWord: { ru: "Добавить", zh: "添加", ja: "追加", es: "Agregar", pt: "Adicionar", fr: "Ajouter", de: "Hinzufügen" },
    bannerInstallDesc: { ru: "Установите приложение!", zh: "安装应用！", ja: "アプリをインストール！", es: "¡Instala la app!", pt: "Instale o app!", fr: "Installez l'application !", de: "App installieren!" },

    // ═══ Install Guide ═══
    installGuideTitle: { ru: "Руководство по установке", zh: "安装指南", ja: "インストールガイド", es: "Guía de instalación", pt: "Guia de instalação", fr: "Guide d'installation", de: "Installationsanleitung" },
    installGuideSub: { ru: "Добавьте на домашний экран", zh: "添加到主屏幕", ja: "ホーム画面に追加", es: "Agregar a la pantalla de inicio", pt: "Adicionar à tela inicial", fr: "Ajouter à l'écran d'accueil", de: "Zum Startbildschirm hinzufügen" },
    installGuideConfirm: { ru: "Понятно", zh: "明白了", ja: "了解しました", es: "Entendido", pt: "Entendido", fr: "Compris", de: "Verstanden" },
    guideAndroid: { ru: "Android", zh: "Android", ja: "Android", es: "Android", pt: "Android", fr: "Android", de: "Android" },
    guideIOS: { ru: "iOS", zh: "iOS", ja: "iOS", es: "iOS", pt: "iOS", fr: "iOS", de: "iOS" },
    guideChromeHint: { ru: "Откройте в Chrome", zh: "在Chrome中打开", ja: "Chromeで開いてください", es: "Abra en Chrome", pt: "Abra no Chrome", fr: "Ouvrez dans Chrome", de: "In Chrome öffnen" },
    guideSafariHint: { ru: "Откройте в Safari", zh: "在Safari中打开", ja: "Safariで開いてください", es: "Abra en Safari", pt: "Abra no Safari", fr: "Ouvrez dans Safari", de: "In Safari öffnen" },
    guideAndroidStep1Title: { ru: "Шаг 1", zh: "步骤1", ja: "ステップ1", es: "Paso 1", pt: "Passo 1", fr: "Étape 1", de: "Schritt 1" },
    guideAndroidStep1Desc: { ru: "Нажмите меню (⋮) в Chrome", zh: "点击Chrome菜单（⋮）", ja: "Chromeメニュー(⋮)をタップ", es: "Toque el menú (⋮) en Chrome", pt: "Toque no menu (⋮) no Chrome", fr: "Appuyez sur le menu (⋮) dans Chrome", de: "Tippen Sie auf das Menü (⋮) in Chrome" },
    guideAndroidStep2Title: { ru: "Шаг 2", zh: "步骤2", ja: "ステップ2", es: "Paso 2", pt: "Passo 2", fr: "Étape 2", de: "Schritt 2" },
    guideAndroidStep2Desc: { ru: "Выберите 'Добавить на главный экран'", zh: "选择'添加到主屏幕'", ja: "「ホーム画面に追加」を選択", es: "Seleccione 'Agregar a pantalla de inicio'", pt: "Selecione 'Adicionar à tela inicial'", fr: "Sélectionnez 'Ajouter à l'écran d'accueil'", de: "Wählen Sie 'Zum Startbildschirm hinzufügen'" },
    guideAndroidStep3Desc: { ru: "Нажмите 'Добавить'", zh: "点击'添加'", ja: "「追加」をタップ", es: "Toque 'Agregar'", pt: "Toque 'Adicionar'", fr: "Appuyez sur 'Ajouter'", de: "Tippen Sie auf 'Hinzufügen'" },
    guideIOSStep1Title: { ru: "Шаг 1", zh: "步骤1", ja: "ステップ1", es: "Paso 1", pt: "Passo 1", fr: "Étape 1", de: "Schritt 1" },
    guideIOSStep1Desc: { ru: "Нажмите кнопку ⎙ 'Поделиться' в Safari", zh: "在Safari中点击⎙'分享'按钮", ja: "Safariの⎙「共有」ボタンをタップ", es: "Toque el botón ⎙ 'Compartir' en Safari", pt: "Toque no botão ⎙ 'Compartilhar' no Safari", fr: "Appuyez sur le bouton ⎙ 'Partager' dans Safari", de: "Tippen Sie auf die ⎙ 'Teilen'-Schaltfläche in Safari" },
    guideIOSStep2Title: { ru: "Шаг 2", zh: "步骤2", ja: "ステップ2", es: "Paso 2", pt: "Passo 2", fr: "Étape 2", de: "Schritt 2" },
    guideIOSStep2Desc: { ru: "Выберите 'На экран «Домой»'", zh: "选择'添加到主屏幕'", ja: "「ホーム画面に追加」を選択", es: "Seleccione 'Añadir a pantalla de inicio'", pt: "Selecione 'Adicionar à tela de início'", fr: "Sélectionnez 'Sur l'écran d'accueil'", de: "Wählen Sie 'Zum Home-Bildschirm'" },
    guideIOSStep3Desc: { ru: "Нажмите 'Добавить'", zh: "点击'添加'", ja: "「追加」をタップ", es: "Toque 'Añadir'", pt: "Toque 'Adicionar'", fr: "Appuyez sur 'Ajouter'", de: "Tippen Sie auf 'Hinzufügen'" },
    guideInstallDone: { ru: "Установка завершена!", zh: "安装完成！", ja: "インストール完了！", es: "¡Instalación completada!", pt: "Instalação concluída!", fr: "Installation terminée !", de: "Installation abgeschlossen!" },

    // ═══ Misc Member ═══
    homeYogaDefault: { ru: "Домашняя йога", zh: "居家瑜伽", ja: "ホームヨガ", es: "Yoga en casa", pt: "Yoga em casa", fr: "Yoga à la maison", de: "Yoga zu Hause" },
    homeYogaAI: { ru: "ИИ-рекомендация", zh: "AI推荐", ja: "AI推薦", es: "Recomendación IA", pt: "Recomendação IA", fr: "Recommandation IA", de: "KI-Empfehlung" },
    homeYogaFallback: { ru: "Рекомендованные упражнения", zh: "推荐练习", ja: "推奨エクササイズ", es: "Ejercicios recomendados", pt: "Exercícios recomendados", fr: "Exercices recommandés", de: "Empfohlene Übungen" },
    bookingTab: { ru: "Бронирование", zh: "预约", ja: "予約", es: "Reservas", pt: "Reservas", fr: "Réservations", de: "Buchungen" },
    meditation: { ru: "Медитация", zh: "冥想", ja: "瞑想", es: "Meditación", pt: "Meditação", fr: "Méditation", de: "Meditation" },
    notEnoughData: { ru: "Недостаточно данных", zh: "数据不足", ja: "データ不足", es: "Datos insuficientes", pt: "Dados insuficientes", fr: "Données insuffisantes", de: "Nicht genügend Daten" },
    timetableLabel: { ru: "Расписание", zh: "时间表", ja: "時間割", es: "Horario", pt: "Horário", fr: "Emploi du temps", de: "Stundenplan" },
    preview: { ru: "Предпросмотр", zh: "预览", ja: "プレビュー", es: "Vista previa", pt: "Pré-visualização", fr: "Aperçu", de: "Vorschau" },
    monthUnit: { ru: "{n} мес.", zh: "{n}个月", ja: "{n}ヶ月", es: "{n} meses", pt: "{n} meses", fr: "{n} mois", de: "{n} Monate" },
    recent: { ru: "Недавние", zh: "最近", ja: "最近", es: "Reciente", pt: "Recente", fr: "Récent", de: "Kürzlich" },
    myYogaTaste: { ru: "Мой стиль йоги", zh: "我的瑜伽风格", ja: "私のヨガスタイル", es: "Mi estilo de yoga", pt: "Meu estilo de yoga", fr: "Mon style de yoga", de: "Mein Yoga-Stil" },
    analyzedRecent: { ru: "Недавний анализ", zh: "近期分析", ja: "最近の分析", es: "Análisis reciente", pt: "Análise recente", fr: "Analyse récente", de: "Aktuelle Analyse" },
    practiceCount: { ru: "Количество практик", zh: "练习次数", ja: "練習回数", es: "Número de prácticas", pt: "Número de práticas", fr: "Nombre de pratiques", de: "Übungsanzahl" },
    etcLabel: { ru: "Другое", zh: "其他", ja: "その他", es: "Otros", pt: "Outros", fr: "Autres", de: "Sonstiges" },
    pushNotification: { ru: "Push-уведомления", zh: "推送通知", ja: "プッシュ通知", es: "Notificaciones push", pt: "Notificações push", fr: "Notifications push", de: "Push-Benachrichtigungen" },
    pushSetSuccess: { ru: "Уведомления настроены!", zh: "通知设置成功！", ja: "通知設定完了！", es: "¡Notificaciones configuradas!", pt: "Notificações configuradas!", fr: "Notifications configurées !", de: "Benachrichtigungen eingerichtet!" },
    pushSetFail: { ru: "Не удалось настроить.", zh: "设置失败。", ja: "設定に失敗しました。", es: "Error al configurar.", pt: "Falha ao configurar.", fr: "Échec de la configuration.", de: "Einrichtung fehlgeschlagen." },
    pushTurnOffConfirm: { ru: "Отключить уведомления?", zh: "关闭通知？", ja: "通知を無効にしますか？", es: "¿Desactivar notificaciones?", pt: "Desativar notificações?", fr: "Désactiver les notifications ?", de: "Benachrichtigungen deaktivieren?" },
    iosShareStep1: { ru: "Нажмите кнопку 'Поделиться'", zh: "点击'分享'按钮", ja: "「共有」ボタンをタップ", es: "Toque el botón 'Compartir'", pt: "Toque no botão 'Compartilhar'", fr: "Appuyez sur le bouton 'Partager'", de: "Tippen Sie auf 'Teilen'" },
    iosShareStep2: { ru: "Выберите 'На экран «Домой»'", zh: "选择'添加到主屏幕'", ja: "「ホーム画面に追加」を選択", es: "Seleccione 'Añadir a inicio'", pt: "Selecione 'Adicionar à tela'", fr: "Sélectionnez 'Sur l'écran d'accueil'", de: "Wählen Sie 'Zum Home-Bildschirm'" },
    aiRecommendLoading: { ru: "ИИ-рекомендация загружается...", zh: "AI推荐加载中...", ja: "AIレコメンド読み込み中...", es: "Cargando recomendación IA...", pt: "Carregando recomendação IA...", fr: "Chargement de la recommandation IA...", de: "KI-Empfehlung wird geladen..." },
    messagesSubtitle: { ru: "Уведомления", zh: "通知", ja: "お知らせ", es: "Notificaciones", pt: "Notificações", fr: "Notifications", de: "Benachrichtigungen" },
    viewNotice: { ru: "Открыть уведомление", zh: "查看通知", ja: "お知らせを見る", es: "Ver aviso", pt: "Ver aviso", fr: "Voir l'avis", de: "Mitteilung ansehen" },
    msgIndividual: { ru: "Личное", zh: "个人", ja: "個別", es: "Individual", pt: "Individual", fr: "Individuel", de: "Individuell" },
    msgNotice: { ru: "Объявление", zh: "公告", ja: "お知らせ", es: "Aviso", pt: "Aviso", fr: "Avis", de: "Mitteilung" },

    // ═══ Admin / System ═══
    adminSystem: { ru: "Система управления", zh: "管理系统", ja: "管理システム", es: "Sistema de gestión", pt: "Sistema de gestão", fr: "Système de gestion", de: "Verwaltungssystem" },
    demoAutoLogin: { ru: "🚀 Авто-вход в демо", zh: "🚀 管理员演示自动登录", ja: "🚀 管理者デモ自動ログイン", es: "🚀 Inicio de sesión demo", pt: "🚀 Login demo automático", fr: "🚀 Connexion démo automatique", de: "🚀 Demo-Auto-Login" },
    kakaoSupport: { ru: "Поддержка через KakaoTalk", zh: "KakaoTalk客服", ja: "KakaoTalkお問い合わせ", es: "Soporte KakaoTalk", pt: "Suporte KakaoTalk", fr: "Support KakaoTalk", de: "KakaoTalk-Support" },
    superAdminOnly: { ru: "👑 Только суперадмин", zh: "👑 超级管理员专属", ja: "👑 スーパー管理者専用", es: "👑 Solo superadmin", pt: "👑 Apenas superadmin", fr: "👑 Superadmin uniquement", de: "👑 Nur Superadmin" },
    superAdminOnlyDesc: { ru: "Эта страница доступна только администраторам.", zh: "此页面仅限平台管理员使用。", ja: "このページはプラットフォーム管理者専用です。", es: "Esta página es solo para administradores.", pt: "Esta página é apenas para administradores.", fr: "Cette page est réservée aux administrateurs.", de: "Diese Seite ist nur für Administratoren." },
    demoSiteTitle: { ru: "🎯 Демо-сайт", zh: "🎯 演示站点", ja: "🎯 デモサイト", es: "🎯 Sitio demo", pt: "🎯 Site demo", fr: "🎯 Site de démo", de: "🎯 Demo-Seite" },
    demoSiteDesc: { ru: "Подключиться к демо-сайту.", zh: "连接到演示站点。", ja: "デモサイトに接続します。", es: "Conectar al sitio demo.", pt: "Conectar ao site demo.", fr: "Se connecter au site de démo.", de: "Zum Demo-Seite verbinden." },
    demoAccessBtn: { ru: "Открыть демо", zh: "访问演示", ja: "デモにアクセス", es: "Acceder a demo", pt: "Acessar demo", fr: "Accéder à la démo", de: "Demo öffnen" },
    demoPreparing: { ru: "Подготовка демо...", zh: "准备演示...", ja: "デモ準備中...", es: "Preparando demo...", pt: "Preparando demo...", fr: "Préparation de la démo...", de: "Demo wird vorbereitet..." },

    // ═══ Kiosk Extra ═══
    kioskSuccessExtra: { ru: "Отличная практика!", zh: "加油练习！", ja: "素晴らしい練習を！", es: "¡Gran práctica!", pt: "Ótima prática!", fr: "Belle pratique !", de: "Tolle Übung!" },
    kioskSuccessConsecutive: { ru: "Серия продолжается!", zh: "连续打卡中！", ja: "連続出席中！", es: "¡Racha continúa!", pt: "Sequência continua!", fr: "La série continue !", de: "Serie geht weiter!" },
    kioskExpiredMsg: { ru: "Срок абонемента истёк.", zh: "会员已过期。", ja: "会員期限が切れています。", es: "Membresía expirada.", pt: "Assinatura expirada.", fr: "Abonnement expiré.", de: "Mitgliedschaft abgelaufen." },
    kioskNoCredits: { ru: "Кредиты закончились.", zh: "剩余次数不足。", ja: "残り回数がありません。", es: "Sin créditos restantes.", pt: "Sem créditos restantes.", fr: "Plus de crédits.", de: "Keine Guthaben mehr." },
    kioskLastDay: { ru: "Последний день!", zh: "最后一天！", ja: "最終日です！", es: "¡Último día!", pt: "Último dia!", fr: "Dernier jour !", de: "Letzter Tag!" },
    kioskTouchGuide: { ru: "Нажмите для регистрации", zh: "触摸进行签到", ja: "タッチして出席", es: "Toque para registrar", pt: "Toque para registrar", fr: "Appuyez pour enregistrer", de: "Zum Registrieren tippen" },
    kioskFacePinFallback: { ru: "Введите 4-значный PIN", zh: "请输入4位PIN码", ja: "4桁PINを入力してください", es: "Ingrese PIN de 4 dígitos", pt: "Insira o PIN de 4 dígitos", fr: "Entrez le PIN à 4 chiffres", de: "4-stellige PIN eingeben" },

    // ═══ Misc ═══
    noImageTimetable: { ru: "Изображение расписания не зарегистрировано.", zh: "未注册课程表图片。", ja: "時間割画像が登録されていません。", es: "Imagen de horario no registrada.", pt: "Imagem de horário não registrada.", fr: "Image d'horaire non enregistrée.", de: "Stundenplanbild nicht registriert." },
    branchGwangheungchang: { ru: "Кванхынчан", zh: "光兴仓", ja: "光興倉", es: "G.Chang", pt: "G.Chang", fr: "G.Chang", de: "G.Chang" },
    branchMapo: { ru: "Мапо", zh: "麻浦", ja: "麻浦", es: "Mapo", pt: "Mapo", fr: "Mapo", de: "Mapo" },
};
}


function applyTranslations() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const existing = parseTranslationsFile();
    const newTranslations = getEnglishKeyTranslations();
    const targetLangs = ['ru', 'zh', 'ja', 'es', 'pt', 'fr', 'de'];
    
    for (const lang of targetLangs) {
        const toAdd = [];
        for (const [key, langValues] of Object.entries(newTranslations)) {
            if (!langValues[lang]) continue;
            if (existing[lang] && existing[lang][key]) continue;
            toAdd.push({ key, value: langValues[lang] });
        }
        if (toAdd.length === 0) { console.log(`  ⏭️  ${lang}: All up to date`); continue; }
        
        const langBlockRegex = new RegExp(`^(\\s{4}${lang}:\\s*\\{)`, 'm');
        const langMatch = content.match(langBlockRegex);
        if (!langMatch) { console.log(`  ❌ ${lang}: block not found`); continue; }
        let braceCount = 0, closingBracePos = -1;
        for (let i = langMatch.index; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') { braceCount--; if (braceCount === 0) { closingBracePos = i; break; } }
        }
        if (closingBracePos === -1) continue;
        
        let entries = '\n        // ═══ Full app translations (batch 3) ═══\n';
        for (const { key, value } of toAdd) {
            entries += `        ${key}: "${value.replace(/"/g, '\\"')}",\n`;
        }
        content = content.slice(0, closingBracePos) + entries + content.slice(closingBracePos);
        console.log(`  ✅ ${lang}: Added ${toAdd.length} translations`);
    }
    
    fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf-8');
    console.log('\n  📄 translations.js updated!');
}

console.log('\n🌍 Generating batch 3 translations (all remaining keys)...\n');
applyTranslations();
console.log('\n  Done!\n');
