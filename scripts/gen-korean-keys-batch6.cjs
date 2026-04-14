#!/usr/bin/env node
/**
 * gen-korean-keys-batch6.cjs — 최종 배치: 남은 한국어-키 모두 처리  
 */
const fs = require('fs');
const path = require('path');
const TRANSLATIONS_PATH = path.resolve(__dirname, '..', 'src', 'utils', 'translations.js');

function parseTranslationsFile() {
    const content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const languages = {};
    const lines = content.split('\n');
    for (const lang of ['ko','en','ru','zh','ja','es','pt','fr','de']) {
        let inBlock = false, bc = 0;
        const kvPairs = {};
        for (const line of lines) {
            if (line.match(new RegExp('^    ' + lang + ': \\{'))) { inBlock = true; bc = 1; continue; }
            if (!inBlock) continue;
            for (const c of line) { if (c === '{') bc++; if (c === '}') bc--; }
            if (bc <= 0) { inBlock = false; continue; }
            const m = line.match(/^\s+(?:"([^"]+)"|'([^']+)'|([a-zA-Z_]\w*))\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/);
            if (m) { const k = m[1] || m[2] || m[3]; const v = m[4] || m[5] || ''; if (k) kvPairs[k] = v; }
        }
        languages[lang] = kvPairs;
    }
    return languages;
}

function getTranslations() {
    return {
        // ═══ Admin UI Labels ═══
        "신규": { ru: "Новый", zh: "新", ja: "新規", es: "Nuevo", pt: "Novo", fr: "Nouveau", de: "Neu" },
        "재등록": { ru: "Перерегистрация", zh: "重新注册", ja: "再登録", es: "Re-registro", pt: "Re-registro", fr: "Réinscription", de: "Neuregistrierung" },
        "활동중": { ru: "Активный", zh: "活动中", ja: "活動中", es: "Activo", pt: "Ativo", fr: "Actif", de: "Aktiv" },
        "만료 회원": { ru: "Истёкший абонемент", zh: "过期会员", ja: "期限切れ会員", es: "Membresía expirada", pt: "Assinatura expirada", fr: "Abonnement expiré", de: "Abgelaufene Mitgliedschaft" },
        "만료/소진": { ru: "Истёк/Исчерпан", zh: "过期/用完", ja: "期限切れ/消化済", es: "Expirado/Agotado", pt: "Expirado/Esgotado", fr: "Expiré/Épuisé", de: "Abgelaufen/Aufgebraucht" },
        "만료/임박": { ru: "Истёк/Скоро", zh: "过期/即将", ja: "期限切れ/間近", es: "Expirado/Inminente", pt: "Expirado/Iminente", fr: "Expiré/Imminent", de: "Abgelaufen/Bevorstehend" },
        "기록 없음": { ru: "Нет записей", zh: "无记录", ja: "記録なし", es: "Sin registros", pt: "Sem registros", fr: "Aucun enregistrement", de: "Keine Einträge" },
        "시작 대기중": { ru: "Ожидание начала", zh: "等待开始", ja: "開始待ち", es: "Esperando inicio", pt: "Aguardando início", fr: "En attente de début", de: "Warten auf Start" },
        "선등록 대기중": { ru: "Ожидание предрегистрации", zh: "预注册等待中", ja: "事前登録待ち", es: "Esperando pre-registro", pt: "Aguardando pré-registro", fr: "En attente de pré-inscription", de: "Warten auf Vorregistrierung" },
        "⏸️ 홀딩 중": { ru: "⏸️ Приостановлено", zh: "⏸️ 暂停中", ja: "⏸️ ホールド中", es: "⏸️ En pausa", pt: "⏸️ Em pausa", fr: "⏸️ En pause", de: "⏸️ Pausiert" },
        "알림 꺼짐": { ru: "Уведомления выкл.", zh: "通知已关闭", ja: "通知OFF", es: "Notificaciones apagadas", pt: "Notificações desligadas", fr: "Notifications désactivées", de: "Benachrichtigungen aus" },
        "푸시 ON": { ru: "Push ВКЛ", zh: "推送 ON", ja: "プッシュON", es: "Push ON", pt: "Push ON", fr: "Push ON", de: "Push AN" },
        "⚠ 위험": { ru: "⚠ Опасность", zh: "⚠ 危险", ja: "⚠ 危険", es: "⚠ Peligro", pt: "⚠ Perigo", fr: "⚠ Danger", de: "⚠ Gefahr" },
        "⚙️ 설정": { ru: "⚙️ Настройки", zh: "⚙️ 设置", ja: "⚙️ 設定", es: "⚙️ Configuración", pt: "⚙️ Configurações", fr: "⚙️ Paramètres", de: "⚙️ Einstellungen" },
        "📖 운영 가이드": { ru: "📖 Руководство", zh: "📖 运营指南", ja: "📖 運営ガイド", es: "📖 Guía operativa", pt: "📖 Guia operacional", fr: "📖 Guide opérationnel", de: "📖 Betriebsanleitung" },
        "🧠 안면인식": { ru: "🧠 Распознавание лиц", zh: "🧠 人脸识别", ja: "🧠 顔認識", es: "🧠 Reconocimiento facial", pt: "🧠 Reconhecimento facial", fr: "🧠 Reconnaissance faciale", de: "🧠 Gesichtserkennung" },
        "🧠 AI 이탈 예측": { ru: "🧠 AI-прогноз оттока", zh: "🧠 AI流失预测", ja: "🧠 AI離脱予測", es: "🧠 Predicción IA de abandono", pt: "🧠 Previsão IA de abandono", fr: "🧠 Prédiction IA d'attrition", de: "🧠 KI-Abwanderungsprognose" },
        "AI 이탈 예측이란?": { ru: "Что такое AI-прогноз оттока?", zh: "什么是AI流失预测？", ja: "AI離脱予測とは？", es: "¿Qué es la predicción IA de abandono?", pt: "O que é a previsão IA de abandono?", fr: "Qu'est-ce que la prédiction IA d'attrition ?", de: "Was ist die KI-Abwanderungsprognose?" },
        "안면 미등록 회원": { ru: "Без регистрации лица", zh: "未注册人脸的会员", ja: "顔未登録会員", es: "Miembros sin registro facial", pt: "Membros sem registro facial", fr: "Membres sans enregistrement facial", de: "Mitglieder ohne Gesichtsregistrierung" },
        "누적 재등록률": { ru: "Накопленный % перерегистрации", zh: "累计重新注册率", ja: "累計再登録率", es: "Tasa acumulada de re-registro", pt: "Taxa acumulada de re-registro", fr: "Taux cumulé de réinscription", de: "Kumulierte Neuregistrierungsrate" },
        "오늘 전체 등록": { ru: "Все регистрации сегодня", zh: "今日全部注册", ja: "今日の全体登録", es: "Todos los registros hoy", pt: "Todos os registros hoje", fr: "Tous les enregistrements aujourd'hui", de: "Alle heutigen Registrierungen" },

        // ═══ Sort & Filter ═══
        "기본 정렬": { ru: "По умолчанию", zh: "默认排序", ja: "デフォルト並び順", es: "Orden predeterminado", pt: "Ordem padrão", fr: "Tri par défaut", de: "Standardsortierung" },
        "마감일 여유 순": { ru: "По запасу до окончания", zh: "按截止日余量排序", ja: "締切日余裕順", es: "Por margen de fecha límite", pt: "Por margem de data limite", fr: "Par marge de date limite", de: "Nach Fristpuffer" },
        "마감일 임박 순": { ru: "По близости окончания", zh: "按截止日临近排序", ja: "締切日切迫順", es: "Por proximidad de fecha límite", pt: "Por proximidade de data limite", fr: "Par proximité de date limite", de: "Nach Fristnähe" },
        "잔여 횟수 적은 순": { ru: "По убыванию остатка", zh: "按剩余次数少排序", ja: "残り回数少ない順", es: "Por menos créditos", pt: "Por menos créditos", fr: "Par crédits restants (décroissant)", de: "Nach wenigstem Guthaben" },
        "잔여 횟수 많은 순": { ru: "По возрастанию остатка", zh: "按剩余次数多排序", ja: "残り回数多い順", es: "Por más créditos", pt: "Por mais créditos", fr: "Par crédits restants (croissant)", de: "Nach meistem Guthaben" },

        // ═══ Stats Labels ═══
        ": 21~29일 미출석": { ru: ": 21~29 дней без посещений", zh: ": 21~29天未出勤", ja: ": 21~29日間未出席", es: ": 21~29 días sin asistencia", pt: ": 21~29 dias sem presença", fr: ": 21~29 jours d'absence", de: ": 21~29 Tage ohne Anwesenheit" },
        ": 14~20일 미출석": { ru: ": 14~20 дней без посещений", zh: ": 14~20天未出勤", ja: ": 14~20日間未出席", es: ": 14~20 días sin asistencia", pt: ": 14~20 dias sem presença", fr: ": 14~20 jours d'absence", de: ": 14~20 Tage ohne Anwesenheit" },
        "📊 월별 재등록 추이 (최근 6개월)": { ru: "📊 Тенденция перерегистраций (6 мес.)", zh: "📊 月度重新注册趋势（近6个月）", ja: "📊 月別再登録推移（直近6ヶ月）", es: "📊 Tendencia de re-registros (6 meses)", pt: "📊 Tendência de re-registros (6 meses)", fr: "📊 Tendance des réinscriptions (6 mois)", de: "📊 Neuregistrierungstrend (6 Monate)" },
        "잠든 회원 자동 분류": { ru: "Автоклассификация неактивных участников", zh: "休眠会员自动分类", ja: "休眠会員の自動分類", es: "Clasificación automática de miembros inactivos", pt: "Classificação automática de membros inativos", fr: "Classification automatique des membres inactifs", de: "Automatische Klassifizierung inaktiver Mitglieder" },

        // ═══ Notices ═══
        "공지 삭제": { ru: "Удалить объявление", zh: "删除公告", ja: "お知らせ削除", es: "Eliminar aviso", pt: "Excluir aviso", fr: "Supprimer l'avis", de: "Mitteilung löschen" },
        "공지 작성하기": { ru: "Написать объявление", zh: "撰写公告", ja: "お知らせ作成", es: "Escribir aviso", pt: "Escrever aviso", fr: "Rédiger un avis", de: "Mitteilung verfassen" },
        "공지 이미지": { ru: "Изображение объявления", zh: "公告图片", ja: "お知らせ画像", es: "Imagen del aviso", pt: "Imagem do aviso", fr: "Image de l'avis", de: "Mitteilungsbild" },
        "소식 및 공지 관리": { ru: "Управление новостями и объявлениями", zh: "新闻和公告管理", ja: "お知らせ管理", es: "Gestión de noticias y avisos", pt: "Gestão de notícias e avisos", fr: "Gestion des actualités et avis", de: "Nachrichten- und Mitteilungsverwaltung" },
        "등록된 공지사항이 없습니다.": { ru: "Нет объявлений.", zh: "暂无公告。", ja: "登録されたお知らせはありません。", es: "No hay avisos registrados.", pt: "Não há avisos registrados.", fr: "Aucun avis enregistré.", de: "Keine Mitteilungen registriert." },
        "회원용 앱의 메인 화면에 표시되는 공지사항입니다.": { ru: "Объявления, отображаемые на главном экране приложения.", zh: "显示在会员App主界面的公告。", ja: "会員アプリのメイン画面に表示されるお知らせです。", es: "Avisos mostrados en la pantalla principal de la app.", pt: "Avisos exibidos na tela principal do app.", fr: "Avis affichés sur l'écran principal de l'appli.", de: "Mitteilungen auf dem Hauptbildschirm der App." },
        "메모 작성/수정": { ru: "Создать/изменить заметку", zh: "撰写/编辑备注", ja: "メモ作成/修正", es: "Crear/editar nota", pt: "Criar/editar nota", fr: "Créer/modifier la note", de: "Notiz erstellen/bearbeiten" },

        // ═══ Search & UI ═══
        "🔍 이름 또는 전화번호 검색...": { ru: "🔍 Поиск по имени или телефону...", zh: "🔍 按姓名或手机号搜索...", ja: "🔍 名前または電話番号で検索...", es: "🔍 Buscar por nombre o teléfono...", pt: "🔍 Pesquisar por nome ou telefone...", fr: "🔍 Recherche par nom ou téléphone...", de: "🔍 Suche nach Name oder Telefonnummer..." },
        "검색 결과가 없거나 회원을 등록해주세요.": { ru: "Нет результатов. Зарегистрируйте участника.", zh: "无搜索结果，请注册会员。", ja: "検索結果がないか、会員を登録してください。", es: "Sin resultados. Registre un miembro.", pt: "Sem resultados. Registre um membro.", fr: "Aucun résultat. Inscrivez un membre.", de: "Keine Ergebnisse. Registrieren Sie ein Mitglied." },
        "으로 보고 계십니다.": { ru: "Вы просматриваете как.", zh: "您正在以查看。", ja: "として閲覧中です。", es: "Está viendo como.", pt: "Você está vendo como.", fr: "Vous consultez en tant que.", de: "Sie betrachten als." },
        "만료 임박 알림": { ru: "Уведомление о скором истечении", zh: "即将到期提醒", ja: "期限切れ間近通知", es: "Alerta de vencimiento inminente", pt: "Alerta de vencimento iminente", fr: "Alerte d'expiration imminente", de: "Ablaufwarnung" },

        // ═══ Guide page descriptions ═══
        "이 앱의 모든 자동화 규칙과 정책을 한 눈에 확인하세요": { ru: "Просмотрите все правила автоматизации одним взглядом", zh: "一目了然查看此App的所有自动化规则和策略", ja: "このアプリの全自動化ルールとポリシーを一目で確認", es: "Vea todas las reglas de automatización de un vistazo", pt: "Veja todas as regras de automação de uma vez", fr: "Consultez toutes les règles d'automatisation en un coup d'œil", de: "Alle Automatisierungsregeln auf einen Blick" },
        "위 설정값은 현재 업장의 실제 설정을 반영합니다.": { ru: "Настройки отражают текущую конфигурацию студии.", zh: "以上设置反映当前场馆的实际设置。", ja: "上記の設定値は現在の店舗の実際の設定を反映しています。", es: "Los ajustes reflejan la configuración actual del estudio.", pt: "As configurações refletem a configuração atual do estúdio.", fr: "Les paramètres reflètent la configuration actuelle du studio.", de: "Die Einstellungen spiegeln die aktuelle Studio-Konfiguration wider." },
        "현재 예약 기능이 비활성화되어 있습니다. 설정 탭에서 활성화할 수 있습니다.": { ru: "Бронирование деактивировано. Активируйте в настройках.", zh: "预约功能当前已关闭。可在设置中开启。", ja: "予約機能は無効です。設定タブで有効にできます。", es: "La reserva está desactivada. Actívela en configuración.", pt: "A reserva está desativada. Ative nas configurações.", fr: "Les réservations sont désactivées. Activez dans les paramètres.", de: "Buchungen sind deaktiviert. In den Einstellungen aktivieren." },

        // ═══ Kiosk / Attendance Guide ═══
        "회원 & 출석": { ru: "Участники и посещения", zh: "会员 & 出勤", ja: "会員 & 出席", es: "Miembros y asistencia", pt: "Membros e presença", fr: "Membres et présence", de: "Mitglieder & Anwesenheit" },
        "알림 & 보안": { ru: "Уведомления и безопасность", zh: "通知 & 安全", ja: "通知 & セキュリティ", es: "Notificaciones y seguridad", pt: "Notificações e segurança", fr: "Notifications et sécurité", de: "Benachrichtigungen & Sicherheit" },
        "예약 시스템": { ru: "Система бронирования", zh: "预约系统", ja: "予約システム", es: "Sistema de reservas", pt: "Sistema de reservas", fr: "Système de réservation", de: "Buchungssystem" },
        "출석 체크 & 횟수 차감": { ru: "Отметка и списание кредитов", zh: "签到 & 次数扣除", ja: "出席チェック & 回数差引", es: "Asistencia y deducción de créditos", pt: "Presença e dedução de créditos", fr: "Présence et déduction de crédits", de: "Anwesenheit & Guthabenabzug" },
        "출석 거부 (자동 차단)": { ru: "Отказ (автоблокировка)", zh: "签到拒绝（自动拦截）", ja: "出席拒否（自動ブロック）", es: "Rechazo de asistencia (bloqueo auto.)", pt: "Recusa de presença (bloqueio auto.)", fr: "Refus de présence (blocage auto.)", de: "Anwesenheitsablehnung (Auto-Block)" },
        "홀딩 (수강 일시정지)": { ru: "Приостановка (пауза)", zh: "暂停（挂起）", ja: "ホールド（受講一時停止）", es: "Pausa (suspensión temporal)", pt: "Pausa (suspensão temporária)", fr: "Pause (suspension temporaire)", de: "Pausierung (temporäre Aussetzung)" },
        "회원권 등록 · 재등록 로직": { ru: "Логика регистрации/перерегистрации", zh: "会员卡注册·重新注册逻辑", ja: "会員権登録・再登録ロジック", es: "Lógica de registro/re-registro", pt: "Lógica de registro/re-registro", fr: "Logique d'inscription/réinscription", de: "Registrierungs-/Neuregistrierungslogik" },
        "TBD: 시작일 미확정 등록": { ru: "TBD: Регистрация без даты начала", zh: "TBD：开始日未确定注册", ja: "TBD：開始日未確定登録", es: "TBD: Registro sin fecha de inicio", pt: "TBD: Registro sem data de início", fr: "TBD : Inscription sans date de début", de: "TBD: Registrierung ohne Startdatum" },
        "첫 출석 시 자동 확정": { ru: "Автоподтверждение при первом посещении", zh: "首次出勤时自动确定", ja: "初出席時に自動確定", es: "Confirmación automática en primera asistencia", pt: "Confirmação automática na primeira presença", fr: "Confirmation automatique à la première présence", de: "Automatische Bestätigung bei erster Anwesenheit" },
        "선등록 (미래 수강권 예약)": { ru: "Предрегистрация (резервирование)", zh: "预注册（未来课程票预约）", ja: "事前登録（将来の受講券予約）", es: "Pre-registro (reserva futura)", pt: "Pré-registro (reserva futura)", fr: "Pré-inscription (réservation future)", de: "Vorregistrierung (zukünftige Buchung)" },
        "소진/만료 시 자동 전환": { ru: "Авто-переключение при исчерпании/истечении", zh: "用完/到期时自动切换", ja: "消化/期限切れ時に自動切替", es: "Cambio automático al agotar/expirar", pt: "Mudança automática ao esgotar/expirar", fr: "Changement automatique à l'épuisement/expiration", de: "Automatischer Wechsel bei Erschöpfung/Ablauf" },
        "종료일 산정 기준": { ru: "Критерий расчёта даты окончания", zh: "结束日计算标准", ja: "終了日算定基準", es: "Criterio de cálculo de fecha de fin", pt: "Critério de cálculo de data final", fr: "Critère de calcul de date de fin", de: "Berechnungskriterium für Enddatum" },
        "시작일 기준 자동 계산": { ru: "Автоматический расчёт от даты начала", zh: "基于开始日自动计算", ja: "開始日基準の自動計算", es: "Cálculo automático desde fecha de inicio", pt: "Cálculo automático a partir da data de início", fr: "Calcul automatique à partir de la date de début", de: "Automatische Berechnung ab Startdatum" },
        "시작일부터 새로 계산": { ru: "Пересчёт с даты начала", zh: "从开始日重新计算", ja: "開始日から新たに計算", es: "Nuevo cálculo desde fecha de inicio", pt: "Novo cálculo a partir da data de início", fr: "Nouveau calcul à partir de la date de début", de: "Neuberechnung ab Startdatum" },
        "횟수 0 + 기간 남음 → 재등록": { ru: "0 кредитов + срок не истёк → перерегистрация", zh: "次数0 + 期限未到 → 重新注册", ja: "回数0 + 期間残り → 再登録", es: "0 créditos + período restante → re-registro", pt: "0 créditos + período restante → re-registro", fr: "0 crédits + période restante → réinscription", de: "0 Guthaben + Restlaufzeit → Neuregistrierung" },
        "횟수 남음 + 기간 종료 → 재등록": { ru: "Есть кредиты + срок истёк → перерегистрация", zh: "有次数 + 期限到 → 重新注册", ja: "回数残り + 期間終了 → 再登録", es: "Créditos restantes + período expirado → re-registro", pt: "Créditos restantes + período expirado → re-registro", fr: "Crédits restants + période expirée → réinscription", de: "Restguthaben + Zeitraumende → Neuregistrierung" },
        "기존 횟수 삭제 → 새로 부여": { ru: "Старые кредиты удаляются → назначаются новые", zh: "删除旧次数 → 赋予新次数", ja: "既存回数削除 → 新規付与", es: "Créditos anteriores eliminados → nuevos asignados", pt: "Créditos anteriores excluídos → novos atribuídos", fr: "Anciens crédits supprimés → nouveaux attribués", de: "Altes Guthaben gelöscht → neues vergeben" },
        "기존 횟수 사라짐": { ru: "Старые кредиты аннулируются", zh: "旧有次数消失", ja: "既存回数がなくなります", es: "Los créditos anteriores se eliminan", pt: "Os créditos anteriores são eliminados", fr: "Les anciens crédits disparaissent", de: "Bestehendes Guthaben entfällt" },
        "신규 등록과 동일": { ru: "Как новая регистрация", zh: "与新注册相同", ja: "新規登録と同じ", es: "Igual que registro nuevo", pt: "Igual a registro novo", fr: "Identique à une nouvelle inscription", de: "Wie Erstregistrierung" },
        "크레딧 정책 모드": { ru: "Режим кредитной политики", zh: "积分政策模式", ja: "クレジットポリシーモード", es: "Modo de política de créditos", pt: "Modo de política de créditos", fr: "Mode de politique de crédits", de: "Guthaben-Richtlinienmodus" },
        "취소 마감 시간": { ru: "Крайний срок отмены", zh: "取消截止时间", ja: "キャンセル締切時間", es: "Hora límite de cancelación", pt: "Hora limite de cancelamento", fr: "Heure limite d'annulation", de: "Stornierungsfrist" },

        // ═══ Partial sentences (used in template strings) ═══
        "로 테스트하여 데이터를 확인하세요.": { ru: "Проверьте данные, протестировав.", zh: "请测试验证数据。", ja: "でテストしてデータを確認してください。", es: "Pruebe para verificar los datos.", pt: "Teste para verificar os dados.", fr: "Testez pour vérifier les données.", de: "Testen Sie, um die Daten zu überprüfen." },
        "등록하지 않으면 설정 탭의 스튜디오 로고가 표시됩니다.": { ru: "Без регистрации будет показан логотип из настроек.", zh: "如不注册，将显示设置中的工作室Logo。", ja: "登録しない場合、設定タブのスタジオロゴが表示されます。", es: "Si no registra, se mostrará el logo del estudio.", pt: "Se não registrar, será exibido o logo do estúdio.", fr: "Sans enregistrement, le logo du studio sera affiché.", de: "Ohne Registrierung wird das Studio-Logo angezeigt." },
        "로 전환하여 진행하세요.": { ru: "Переключитесь и продолжите.", zh: "请切换后继续。", ja: "に切り替えて進めてください。", es: "Cambie y continúe.", pt: "Mude e continue.", fr: "Changez et continuez.", de: "Wechseln Sie und fahren Sie fort." },
        "위해 얼굴 등록이 아직": { ru: "Регистрация лица ещё не", zh: "人脸注册尚未", ja: "のため顔登録がまだ", es: "El registro facial aún no", pt: "O registro facial ainda não", fr: "L'enregistrement facial n'est pas encore", de: "Die Gesichtsregistrierung ist noch nicht" },
        "안 된 활성 회원 수": { ru: "количество активных участников", zh: "未完成的活跃会员数", ja: "完了していない有効会員数", es: "cantidad de miembros activos no completados", pt: "quantidade de membros ativos não concluídos", fr: "nombre de membres actifs non complétés", de: "Anzahl nicht abgeschlossener aktiver Mitglieder" },
        "키오스크 얼굴인식 출석을": { ru: "Отметку через распознавание лиц", zh: "终端人脸识别签到", ja: "キオスク顔認識出席を", es: "Asistencia por reconocimiento facial", pt: "Presença por reconhecimento facial", fr: "Présence par reconnaissance faciale", de: "Anwesenheit durch Gesichtserkennung" },
        "설정 변경은": { ru: "Изменение настроек", zh: "设置更改在", ja: "設定変更は", es: "Cambios de configuración", pt: "Alterações de configuração", fr: "Modifications des paramètres", de: "Einstellungsänderungen" },
        "탭에서 할 수 있습니다.": { ru: "можно на вкладке.", zh: "可在标签页中进行。", ja: "タブで行えます。", es: "se puede hacer en la pestaña.", pt: "pode ser feito na aba.", fr: "peut être fait dans l'onglet.", de: "kann im Tab vorgenommen werden." },
    };
}

function applyBatch() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const existing = parseTranslationsFile();
    const newData = getTranslations();
    const targetLangs = ['ru', 'zh', 'ja', 'es', 'pt', 'fr', 'de'];

    for (const lang of targetLangs) {
        const toAdd = [];
        for (const [key, langValues] of Object.entries(newData)) {
            if (!langValues[lang]) continue;
            if (existing[lang] && existing[lang][key]) continue;
            toAdd.push({ key, value: langValues[lang] });
        }
        if (toAdd.length === 0) { console.log(`  ⏭️  ${lang}: All up to date`); continue; }

        const langBlockRegex = new RegExp(`^(\\s{4}${lang}:\\s*\\{)`, 'm');
        const langMatch = content.match(langBlockRegex);
        if (!langMatch) continue;
        let braceCount = 0, closingBracePos = -1;
        for (let i = langMatch.index; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') { braceCount--; if (braceCount === 0) { closingBracePos = i; break; } }
        }
        if (closingBracePos === -1) continue;

        let entries = '\n        // ═══ Korean-key translations (batch 6 - final) ═══\n';
        for (const { key, value } of toAdd) {
            const ek = key.replace(/"/g, '\\"');
            const ev = value.replace(/"/g, '\\"');
            entries += `        "${ek}": "${ev}",\n`;
        }
        content = content.slice(0, closingBracePos) + entries + content.slice(closingBracePos);
        console.log(`  ✅ ${lang}: Added ${toAdd.length} translations`);
    }

    fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf-8');
    console.log('\n  📄 translations.js updated!');
}

console.log('\n🌍 Batch 6 (final): Admin labels, sorts, guide pages...\n');
applyBatch();
console.log('\n  Done!\n');
