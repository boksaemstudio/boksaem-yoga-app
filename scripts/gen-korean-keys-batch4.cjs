#!/usr/bin/env node
/**
 * gen-korean-keys-batch4.cjs — 한국어-키 311개의 네이티브 번역을 전 언어에 추가
 * 이 키들은 t("한국어텍스트") 형태로 사용되며, en에만 번역이 있고 다른 언어에는 없음
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

// Korean-text keys with native translations for all languages
// These are the most important admin/kiosk/studio UI strings
function getKoreanKeyNativeTranslations() {
    return {
        // ═══ Days of week ═══
        "월요일": { ru: "Понедельник", zh: "星期一", ja: "月曜日", es: "Lunes", pt: "Segunda-feira", fr: "Lundi", de: "Montag" },
        "화요일": { ru: "Вторник", zh: "星期二", ja: "火曜日", es: "Martes", pt: "Terça-feira", fr: "Mardi", de: "Dienstag" },
        "수요일": { ru: "Среда", zh: "星期三", ja: "水曜日", es: "Miércoles", pt: "Quarta-feira", fr: "Mercredi", de: "Mittwoch" },
        "목요일": { ru: "Четверг", zh: "星期四", ja: "木曜日", es: "Jueves", pt: "Quinta-feira", fr: "Jeudi", de: "Donnerstag" },
        "금요일": { ru: "Пятница", zh: "星期五", ja: "金曜日", es: "Viernes", pt: "Sexta-feira", fr: "Vendredi", de: "Freitag" },
        "토요일": { ru: "Суббота", zh: "星期六", ja: "土曜日", es: "Sábado", pt: "Sábado", fr: "Samedi", de: "Samstag" },
        "일요일": { ru: "Воскресенье", zh: "星期日", ja: "日曜日", es: "Domingo", pt: "Domingo", fr: "Dimanche", de: "Sonntag" },

        // ═══ Common Actions ═══
        "저장하기": { ru: "Сохранить", zh: "保存", ja: "保存する", es: "Guardar", pt: "Salvar", fr: "Enregistrer", de: "Speichern" },
        "추가하기": { ru: "Добавить", zh: "添加", ja: "追加する", es: "Agregar", pt: "Adicionar", fr: "Ajouter", de: "Hinzufügen" },
        "제목": { ru: "Заголовок", zh: "标题", ja: "タイトル", es: "Título", pt: "Título", fr: "Titre", de: "Titel" },
        "내용": { ru: "Содержание", zh: "内容", ja: "内容", es: "Contenido", pt: "Conteúdo", fr: "Contenu", de: "Inhalt" },
        "*필수": { ru: "*Обязательно", zh: "*必填", ja: "*必須", es: "*Obligatorio", pt: "*Obrigatório", fr: "*Obligatoire", de: "*Pflichtfeld" },
        "이름": { ru: "Имя", zh: "姓名", ja: "名前", es: "Nombre", pt: "Nome", fr: "Nom", de: "Name" },
        "전화번호": { ru: "Телефон", zh: "电话号码", ja: "電話番号", es: "Teléfono", pt: "Telefone", fr: "Téléphone", de: "Telefonnummer" },
        "새로고침": { ru: "Обновить", zh: "刷新", ja: "更新", es: "Actualizar", pt: "Atualizar", fr: "Actualiser", de: "Aktualisieren" },
        "등록일": { ru: "Дата регистрации", zh: "注册日期", ja: "登録日", es: "Fecha de registro", pt: "Data de registro", fr: "Date d'inscription", de: "Registrierungsdatum" },
        "완전 삭제": { ru: "Полное удаление", zh: "彻底删除", ja: "完全削除", es: "Eliminar permanentemente", pt: "Excluir permanentemente", fr: "Supprimer définitivement", de: "Endgültig löschen" },
        "원": { ru: "₩", zh: "₩", ja: "₩", es: "₩", pt: "₩", fr: "₩", de: "₩" },
        "횟수": { ru: "Кол-во занятий", zh: "次数", ja: "回数", es: "Número de sesiones", pt: "Número de sessões", fr: "Nombre de séances", de: "Anzahl" },
        "회": { ru: "раз", zh: "次", ja: "回", es: "sesión", pt: "sessão", fr: "séance", de: "Sitzung" },
        "주": { ru: "нед.", zh: "周", ja: "週", es: "semana", pt: "semana", fr: "semaine", de: "Woche" },
        "개월": { ru: "мес.", zh: "个月", ja: "ヶ月", es: "meses", pt: "meses", fr: "mois", de: "Monate" },
        "무제한": { ru: "Безлимит", zh: "无限", ja: "無制限", es: "Ilimitado", pt: "Ilimitado", fr: "Illimité", de: "Unbegrenzt" },
        "기본값": { ru: "По умолчанию", zh: "默认值", ja: "デフォルト", es: "Predeterminado", pt: "Padrão", fr: "Par défaut", de: "Standard" },
        "로고": { ru: "Логотип", zh: "Logo", ja: "ロゴ", es: "Logo", pt: "Logo", fr: "Logo", de: "Logo" },

        // ═══ Studio Settings ═══
        "스튜디오 이름": { ru: "Название студии", zh: "工作室名称", ja: "スタジオ名", es: "Nombre del estudio", pt: "Nome do estúdio", fr: "Nom du studio", de: "Studioname" },
        "스튜디오 로고": { ru: "Логотип студии", zh: "工作室Logo", ja: "スタジオロゴ", es: "Logo del estudio", pt: "Logo do estúdio", fr: "Logo du studio", de: "Studio-Logo" },
        "한 줄 소개": { ru: "Краткое описание", zh: "一句话介绍", ja: "一行紹介", es: "Descripción breve", pt: "Descrição breve", fr: "Description courte", de: "Kurzbeschreibung" },
        "우리 스튜디오 설정": { ru: "Настройки студии", zh: "工作室设置", ja: "スタジオ設定", es: "Configuración del estudio", pt: "Configurações do estúdio", fr: "Paramètres du studio", de: "Studio-Einstellungen" },
        "🏠 우리 스튜디오": { ru: "🏠 Наша студия", zh: "🏠 我们的工作室", ja: "🏠 スタジオ", es: "🏠 Nuestro estudio", pt: "🏠 Nosso estúdio", fr: "🏠 Notre studio", de: "🏠 Unser Studio" },
        "설정 로드 중...": { ru: "Загрузка настроек...", zh: "加载设置...", ja: "設定を読み込み中...", es: "Cargando configuración...", pt: "Carregando configurações...", fr: "Chargement des paramètres...", de: "Einstellungen werden geladen..." },
        "외부 링크 관리 (SNS, 블로그 등)": { ru: "Управление внешними ссылками (SNS, блог и т.д.)", zh: "外部链接管理（SNS、博客等）", ja: "外部リンク管理（SNS、ブログなど）", es: "Gestión de enlaces externos (SNS, blog, etc.)", pt: "Gerenciamento de links externos (SNS, blog, etc.)", fr: "Gestion des liens externes (réseaux sociaux, blog, etc.)", de: "Verwaltung externer Links (SNS, Blog usw.)" },
        "+ 링크 추가": { ru: "+ Добавить ссылку", zh: "+ 添加链接", ja: "+ リンク追加", es: "+ Agregar enlace", pt: "+ Adicionar link", fr: "+ Ajouter un lien", de: "+ Link hinzufügen" },
        "이름 (예: 인스타그램)": { ru: "Название (напр.: Instagram)", zh: "名称（如：Instagram）", ja: "名前（例：Instagram）", es: "Nombre (ej.: Instagram)", pt: "Nome (ex.: Instagram)", fr: "Nom (ex : Instagram)", de: "Name (z.B.: Instagram)" },
        "앱 URL 및 QR 코드": { ru: "URL приложения и QR-код", zh: "App URL 和 QR 码", ja: "アプリURL & QRコード", es: "URL de la app y código QR", pt: "URL do app e código QR", fr: "URL de l'appli et code QR", de: "App-URL und QR-Code" },
        "URL 복사": { ru: "Копировать URL", zh: "复制URL", ja: "URLをコピー", es: "Copiar URL", pt: "Copiar URL", fr: "Copier l'URL", de: "URL kopieren" },
        "클릭하여 새 탭에서 열기": { ru: "Нажмите, чтобы открыть в новой вкладке", zh: "点击在新标签页中打开", ja: "クリックして新しいタブで開く", es: "Clic para abrir en nueva pestaña", pt: "Clique para abrir em nova aba", fr: "Cliquez pour ouvrir dans un nouvel onglet", de: "Klicken zum Öffnen in neuem Tab" },
        "🔒 개인정보처리방침": { ru: "🔒 Политика конфиденциальности", zh: "🔒 隐私政策", ja: "🔒 プライバシーポリシー", es: "🔒 Política de privacidad", pt: "🔒 Política de privacidade", fr: "🔒 Politique de confidentialité", de: "🔒 Datenschutzrichtlinie" },

        // ═══ Branch Management ═══
        "지점 관리": { ru: "Управление филиалами", zh: "分店管理", ja: "支店管理", es: "Gestión de sedes", pt: "Gestão de filiais", fr: "Gestion des succursales", de: "Filialverwaltung" },
        "지점": { ru: "Филиал", zh: "分店", ja: "支店", es: "Sede", pt: "Filial", fr: "Succursale", de: "Filiale" },
        "+ 지점 추가": { ru: "+ Добавить филиал", zh: "+ 添加分店", ja: "+ 支店追加", es: "+ Agregar sede", pt: "+ Adicionar filial", fr: "+ Ajouter une succursale", de: "+ Filiale hinzufügen" },
        "⚠️ 지점 관리 주의사항": { ru: "⚠️ Предупреждения по управлению филиалами", zh: "⚠️ 分店管理注意事项", ja: "⚠️ 支店管理の注意事項", es: "⚠️ Precauciones de gestión de sedes", pt: "⚠️ Precauções de gestão de filiais", fr: "⚠️ Précautions de gestion des succursales", de: "⚠️ Hinweise zur Filialverwaltung" },

        // ═══ Member / Registration ═══
        "회원 등록": { ru: "Регистрация участника", zh: "会员注册", ja: "会員登録", es: "Registro de miembro", pt: "Registro de membro", fr: "Inscription du membre", de: "Mitglied registrieren" },
        "회원권 종류": { ru: "Тип абонемента", zh: "会员卡种类", ja: "会員権の種類", es: "Tipo de membresía", pt: "Tipo de assinatura", fr: "Type d'abonnement", de: "Mitgliedschaftstyp" },
        "수련 시작일": { ru: "Дата начала занятий", zh: "训练开始日", ja: "修練開始日", es: "Fecha de inicio", pt: "Data de início", fr: "Date de début", de: "Startdatum" },
        "등록 기간": { ru: "Период регистрации", zh: "注册期限", ja: "登録期間", es: "Período de registro", pt: "Período de registro", fr: "Période d'inscription", de: "Registrierungszeitraum" },
        "수강 기간": { ru: "Период обучения", zh: "课程期限", ja: "受講期間", es: "Período del curso", pt: "Período do curso", fr: "Période de cours", de: "Kurszeitraum" },
        "결제 금액": { ru: "Сумма оплаты", zh: "支付金额", ja: "決済金額", es: "Monto del pago", pt: "Valor do pagamento", fr: "Montant du paiement", de: "Zahlungsbetrag" },
        "결제 방식": { ru: "Способ оплаты", zh: "付款方式", ja: "決済方法", es: "Método de pago", pt: "Método de pagamento", fr: "Mode de paiement", de: "Zahlungsmethode" },
        "세부 옵션": { ru: "Дополнительные параметры", zh: "详细选项", ja: "詳細オプション", es: "Opciones detalladas", pt: "Opções detalhadas", fr: "Options détaillées", de: "Detailoptionen" },
        "첫 출석일 시작": { ru: "Начало с первого посещения", zh: "从首次出勤日开始", ja: "初出席日から開始", es: "Inicio desde primera asistencia", pt: "Início a partir da primeira presença", fr: "Début à la première présence", de: "Beginn ab erster Anwesenheit" },
        "*첫 출석 시 조정됨": { ru: "*Корректируется при первом посещении", zh: "*首次出勤时调整", ja: "*初出席時に調整", es: "*Ajustado en la primera asistencia", pt: "*Ajustado na primeira presença", fr: "*Ajusté lors de la première présence", de: "*Angepasst bei erster Anwesenheit" },
        "마감일(종료일)": { ru: "Дата окончания", zh: "截止日（结束日）", ja: "締切日（終了日）", es: "Fecha de fin", pt: "Data de término", fr: "Date de fin", de: "Enddatum" },
        "연장 기간": { ru: "Период продления", zh: "延长期限", ja: "延長期間", es: "Período de extensión", pt: "Período de extensão", fr: "Période de prolongation", de: "Verlängerungszeitraum" },
        "수강권 연장(재등록)": { ru: "Продление абонемента (перерегистрация)", zh: "课程票延长（重新注册）", ja: "受講券延長（再登録）", es: "Extensión de membresía (re-registro)", pt: "Extensão de assinatura (re-registro)", fr: "Prolongation d'abonnement (réinscription)", de: "Abo-Verlängerung (Neuregistrierung)" },
        "오늘 수련 포함": { ru: "Включить сегодняшнее занятие", zh: "包含今日训练", ja: "今日の修練を含む", es: "Incluir práctica de hoy", pt: "Incluir prática de hoje", fr: "Inclure la pratique d'aujourd'hui", de: "Heutige Übung einbeziehen" },
        "회 차감": { ru: "Списание сеансов", zh: "次数扣除", ja: "回数差引", es: "Deducción de sesiones", pt: "Dedução de sessões", fr: "Déduction de séances", de: "Sitzungsabzug" },
        "자율수련 (-1회)": { ru: "Свободная практика (-1)", zh: "自主练习（-1次）", ja: "自主練習（-1回）", es: "Práctica libre (-1)", pt: "Prática livre (-1)", fr: "Pratique libre (-1)", de: "Freie Übung (-1)" },

        // ═══ Booking / Reservation Settings ═══
        "📅 수업 예약": { ru: "📅 Бронирование занятий", zh: "📅 课程预约", ja: "📅 クラス予約", es: "📅 Reserva de clases", pt: "📅 Reserva de aulas", fr: "📅 Réservation de cours", de: "📅 Kursbuchung" },
        "예약 마감": { ru: "Крайний срок бронирования", zh: "预约截止", ja: "予約締切", es: "Plazo de reserva", pt: "Prazo de reserva", fr: "Date limite de réservation", de: "Buchungsfrist" },
        "취소 마감": { ru: "Крайний срок отмены", zh: "取消截止", ja: "キャンセル締切", es: "Plazo de cancelación", pt: "Prazo de cancelamento", fr: "Date limite d'annulation", de: "Stornierungsfrist" },
        "하루 최대 예약": { ru: "Макс. бронирований в день", zh: "每日最大预约数", ja: "1日最大予約数", es: "Máx. reservas por día", pt: "Máx. reservas por dia", fr: "Réservations max. par jour", de: "Max. Buchungen pro Tag" },
        "동시 예약 한도": { ru: "Лимит одновременных бронирований", zh: "同时预约限制", ja: "同時予約上限", es: "Límite de reservas simultáneas", pt: "Limite de reservas simultâneas", fr: "Limite de réservations simultanées", de: "Gleichzeitige Buchungslimit" },
        "수업당 최대 인원": { ru: "Макс. участников на занятие", zh: "每节课最大人数", ja: "クラスあたり最大人数", es: "Máx. personas por clase", pt: "Máx. pessoas por aula", fr: "Max. personnes par cours", de: "Max. Personen pro Kurs" },
        "대기열": { ru: "Очередь", zh: "候补队列", ja: "キャンセル待ち", es: "Lista de espera", pt: "Lista de espera", fr: "File d'attente", de: "Warteliste" },
        "일 전부터": { ru: "дней до", zh: "天前开始", ja: "日前から", es: "días antes", pt: "dias antes", fr: "jours avant", de: "Tage vorher" },
        "노쇼 (예약 후 미출석)": { ru: "Неявка (не пришёл после брони)", zh: "爽约（预约后未出勤）", ja: "ノーショー（予約後未出席）", es: "No presentado (reserva sin asistir)", pt: "Não compareceu (reservado sem comparecer)", fr: "Absent (réservation sans présence)", de: "Nicht erschienen (gebucht ohne Anwesenheit)" },
        "미출석 시 횟수 차감": { ru: "Списание при неявке", zh: "未出勤时扣除次数", ja: "未出席時の回数差引", es: "Deducción por inasistencia", pt: "Dedução por ausência", fr: "Déduction pour absence", de: "Abzug bei Nichterscheinen" },

        // ═══ Holding Rules ═══
        "⏸️ 회원 홀딩 (일시정지)": { ru: "⏸️ Приостановка абонемента", zh: "⏸️ 会员暂停（挂起）", ja: "⏸️ 会員ホールド（一時停止）", es: "⏸️ Pausa de membresía", pt: "⏸️ Pausa de assinatura", fr: "⏸️ Pause d'abonnement", de: "⏸️ Mitgliedschaftspause" },
        "홀딩 규칙 (수강권별)": { ru: "Правила приостановки (по абонементу)", zh: "暂停规则（按课程票）", ja: "ホールドルール（受講券別）", es: "Reglas de pausa (por membresía)", pt: "Regras de pausa (por assinatura)", fr: "Règles de pause (par abonnement)", de: "Pausenregeln (pro Mitgliedschaft)" },
        "최대 횟수": { ru: "Макс. раз", zh: "最大次数", ja: "最大回数", es: "Máx. veces", pt: "Máx. vezes", fr: "Max. fois", de: "Max. Mal" },
        "1회 최대": { ru: "Макс. за 1 раз", zh: "单次最大", ja: "1回最大", es: "Máx. por vez", pt: "Máx. por vez", fr: "Max. par fois", de: "Max. pro Mal" },
        "+ 규칙 추가": { ru: "+ Добавить правило", zh: "+ 添加规则", ja: "+ ルール追加", es: "+ Agregar regla", pt: "+ Adicionar regra", fr: "+ Ajouter une règle", de: "+ Regel hinzufügen" },

        // ═══ Credit Management ═══
        "🔢 수강 횟수 관리 방식": { ru: "🔢 Управление кредитами", zh: "🔢 次数管理方式", ja: "🔢 受講回数管理方式", es: "🔢 Gestión de créditos", pt: "🔢 Gestão de créditos", fr: "🔢 Gestion des crédits", de: "🔢 Guthabenverwaltung" },
        "주간 리셋 요일": { ru: "День сброса недельного лимита", zh: "每周重置日", ja: "週間リセット曜日", es: "Día de reinicio semanal", pt: "Dia de reinício semanal", fr: "Jour de réinitialisation hebdomadaire", de: "Wöchentlicher Reset-Tag" },
        "주간 한도 기준": { ru: "Критерий недельного лимита", zh: "每周限制标准", ja: "週間上限基準", es: "Criterio de límite semanal", pt: "Critério de limite semanal", fr: "Critère de limite hebdomadaire", de: "Wochenlimit-Kriterium" },
        "회원별 수동 설정": { ru: "Ручная настройка по участникам", zh: "按会员手动设置", ja: "会員別の手動設定", es: "Configuración manual por miembro", pt: "Configuração manual por membro", fr: "Configuration manuelle par membre", de: "Manuelle Einstellung pro Mitglied" },
        "📋 운영 규칙": { ru: "📋 Правила работы", zh: "📋 运营规则", ja: "📋 運営ルール", es: "📋 Reglas operativas", pt: "📋 Regras operacionais", fr: "📋 Règles opérationnelles", de: "📋 Betriebsregeln" },
        "요금제 자동 계산": { ru: "Автоматический расчёт тарифа", zh: "自动计算资费", ja: "料金自動計算", es: "Cálculo automático de tarifas", pt: "Cálculo automático de tarifas", fr: "Calcul automatique des tarifs", de: "Automatische Tarifberechnung" },

        // ═══ Face Recognition ═══
        "🧠 안면인식 자동 출석": { ru: "🧠 Автоматическая отметка по лицу", zh: "🧠 人脸识别自动签到", ja: "🧠 顔認識自動出席", es: "🧠 Asistencia automática facial", pt: "🧠 Presença automática facial", fr: "🧠 Présence automatique faciale", de: "🧠 Automatische Gesichtserkennung" },
        "📷 출석 화면 카메라": { ru: "📷 Камера на экране отметки", zh: "📷 签到屏幕摄像头", ja: "📷 出席画面カメラ", es: "📷 Cámara de pantalla de asistencia", pt: "📷 Câmera de tela de frequência", fr: "📷 Caméra d'écran de présence", de: "📷 Kamera am Anwesenheitsbildschirm" },
        "얼굴 등록 현황": { ru: "Статус регистрации лиц", zh: "人脸注册状态", ja: "顔登録状況", es: "Estado de registro facial", pt: "Status de registro facial", fr: "Statut d'enregistrement facial", de: "Gesichtsregistrierungsstatus" },
        "명 등록": { ru: "чел. зарегистрировано", zh: "人已注册", ja: "名登録", es: "registrados", pt: "registrados", fr: "inscrits", de: "registriert" },
        "✨ 오늘 AI 자동 인식 출석": { ru: "✨ Сегодня AI-распознавание", zh: "✨ 今日AI自动识别签到", ja: "✨ 今日のAI自動認識出席", es: "✨ Hoy asistencia IA automática", pt: "✨ Hoje presença IA automática", fr: "✨ Aujourd'hui présence IA automatique", de: "✨ Heute KI-Automatik-Anwesenheit" },

        // ═══ Timetable ═══
        "시간표 확인 및 관리": { ru: "Просмотр и управление расписанием", zh: "查看和管理课程表", ja: "時間割の確認と管理", es: "Ver y gestionar horarios", pt: "Ver e gerenciar horários", fr: "Voir et gérer les horaires", de: "Zeitplan ansehen und verwalten" },
        "주간 시간표": { ru: "Недельное расписание", zh: "每周课程表", ja: "週間時間割", es: "Horario semanal", pt: "Horário semanal", fr: "Emploi du temps hebdomadaire", de: "Wochenplan" },
        "월간 시간표": { ru: "Месячное расписание", zh: "月度课程表", ja: "月間時間割", es: "Horario mensual", pt: "Horário mensal", fr: "Emploi du temps mensuel", de: "Monatsplan" },
        "주간 시간표 (이미지)": { ru: "Недельное расписание (изображение)", zh: "每周课程表（图片）", ja: "週間時間割（画像）", es: "Horario semanal (imagen)", pt: "Horário semanal (imagem)", fr: "Horaire hebdomadaire (image)", de: "Wochenplan (Bild)" },
        "이미지 등록/변경": { ru: "Загрузить/изменить изображение", zh: "注册/更改图片", ja: "画像登録/変更", es: "Registrar/cambiar imagen", pt: "Registrar/alterar imagem", fr: "Enregistrer/modifier l'image", de: "Bild registrieren/ändern" },
        "📐 프리뷰 크기": { ru: "📐 Размер предпросмотра", zh: "📐 预览大小", ja: "📐 プレビューサイズ", es: "📐 Tamaño de vista previa", pt: "📐 Tamanho da pré-visualização", fr: "📐 Taille de l'aperçu", de: "📐 Vorschaugröße" },

        // ═══ Price List ═══
        "가격표 확인 및 관리": { ru: "Просмотр и управление прайс-листом", zh: "查看和管理价格表", ja: "料金表の確認と管理", es: "Ver y gestionar precios", pt: "Ver e gerenciar preços", fr: "Voir et gérer les tarifs", de: "Preisliste ansehen und verwalten" },
        "가격표 1": { ru: "Прайс-лист 1", zh: "价目表 1", ja: "料金表 1", es: "Lista de precios 1", pt: "Tabela de preços 1", fr: "Grille tarifaire 1", de: "Preisliste 1" },
        "가격표 2": { ru: "Прайс-лист 2", zh: "价目表 2", ja: "料金表 2", es: "Lista de precios 2", pt: "Tabela de preços 2", fr: "Grille tarifaire 2", de: "Preisliste 2" },

        // ═══ Messages ═══
        "메시지 보내기": { ru: "Отправить сообщение", zh: "发送消息", ja: "メッセージ送信", es: "Enviar mensaje", pt: "Enviar mensagem", fr: "Envoyer un message", de: "Nachricht senden" },
        "단체 메시지 전송": { ru: "Массовая рассылка", zh: "群发消息", ja: "一斉メッセージ送信", es: "Envío masivo de mensajes", pt: "Envio em massa de mensagens", fr: "Envoi de messages en masse", de: "Massennachricht senden" },
        "전송 방식": { ru: "Способ отправки", zh: "发送方式", ja: "送信方法", es: "Método de envío", pt: "Método de envio", fr: "Méthode d'envoi", de: "Sendemethode" },
        "📱 앱 푸시 • 무료": { ru: "📱 Push в приложении • бесплатно", zh: "📱 App推送 • 免费", ja: "📱 アプリプッシュ • 無料", es: "📱 Push de app • gratis", pt: "📱 Push do app • grátis", fr: "📱 Push appli • gratuit", de: "📱 App-Push • kostenlos" },
        "자주 쓰는 문구": { ru: "Частые фразы", zh: "常用短语", ja: "よく使うフレーズ", es: "Frases frecuentes", pt: "Frases frequentes", fr: "Phrases fréquentes", de: "Häufige Phrasen" },
        "전송할 내용을 입력하세요...": { ru: "Введите текст сообщения...", zh: "请输入发送内容...", ja: "送信内容を入力してください...", es: "Ingrese el contenido a enviar...", pt: "Insira o conteúdo a enviar...", fr: "Saisissez le contenu à envoyer...", de: "Inhalt zum Senden eingeben..." },
        "예약 발송": { ru: "Отложенная отправка", zh: "定时发送", ja: "予約送信", es: "Envío programado", pt: "Envio agendado", fr: "Envoi programmé", de: "Geplanter Versand" },

        // ═══ Notices ═══
        "공지사항 작성": { ru: "Написать уведомление", zh: "撰写公告", ja: "お知らせ作成", es: "Escribir aviso", pt: "Escrever aviso", fr: "Rédiger un avis", de: "Mitteilung verfassen" },
        "공지할 내용을 상세히 입력해주세요.": { ru: "Подробно опишите содержание уведомления.", zh: "请详细输入公告内容。", ja: "お知らせの内容を詳しく入力してください。", es: "Ingrese los detalles del aviso.", pt: "Insira os detalhes do aviso.", fr: "Veuillez saisir les détails de l'avis.", de: "Bitte geben Sie die Details der Mitteilung ein." },
        "알림 발송 기록": { ru: "История рассылки уведомлений", zh: "通知发送记录", ja: "通知送信履歴", es: "Historial de envío de notificaciones", pt: "Histórico de envio de notificações", fr: "Historique d'envoi des notifications", de: "Benachrichtigungsverlauf" },
        "승인 및 발송": { ru: "Утвердить и отправить", zh: "审批并发送", ja: "承認＆送信", es: "Aprobar y enviar", pt: "Aprovar e enviar", fr: "Approuver et envoyer", de: "Genehmigen und senden" },
        "발송 이력": { ru: "История отправок", zh: "发送记录", ja: "送信履歴", es: "Historial de envíos", pt: "Histórico de envios", fr: "Historique d'envois", de: "Versandverlauf" },

        // ═══ Trash ═══
        "삭제된 항목이 없습니다": { ru: "Удалённых элементов нет", zh: "没有已删除的项目", ja: "削除された項目はありません", es: "No hay elementos eliminados", pt: "Não há itens excluídos", fr: "Aucun élément supprimé", de: "Keine gelöschten Elemente" },
        "삭제된 항목 불러오는 중...": { ru: "Загрузка удалённых элементов...", zh: "加载已删除项目...", ja: "削除された項目を読み込み中...", es: "Cargando elementos eliminados...", pt: "Carregando itens excluídos...", fr: "Chargement des éléments supprimés...", de: "Gelöschte Elemente werden geladen..." },

        // ═══ Chart Stats ═══
        "수업별 인기 현황": { ru: "Популярность по классам", zh: "各课程人气状况", ja: "クラス別人気状況", es: "Popularidad por clase", pt: "Popularidade por aula", fr: "Popularité par cours", de: "Beliebtheit pro Kurs" },
        "시간대별 이용 현황": { ru: "Статистика по времени суток", zh: "各时段使用情况", ja: "時間帯別利用状況", es: "Uso por franja horaria", pt: "Uso por faixa horária", fr: "Utilisation par tranche horaire", de: "Nutzung nach Tageszeit" },
        "몇 시에 회원이 가장 많이": { ru: "В какое время больше всего", zh: "会员在什么时间最多", ja: "何時に会員が最も多く", es: "¿A qué hora hay más miembros?", pt: "Que hora tem mais membros?", fr: "À quelle heure y a-t-il le plus de membres ?", de: "Um wie viel Uhr sind die meisten Mitglieder?" },
        "오는지 한눈에 보여줍니다.": { ru: "Наглядная статистика посещений.", zh: "一目了然。", ja: "一目でわかります。", es: "Vista rápida.", pt: "Visão rápida.", fr: "Vue d'ensemble rapide.", de: "Auf einen Blick." },
        "어떤 수업이 가장 인기있는지": { ru: "Какие занятия наиболее популярны", zh: "哪些课程最受欢迎", ja: "どのクラスが最も人気か", es: "Qué clases son más populares", pt: "Quais aulas são mais populares", fr: "Quels cours sont les plus populaires", de: "Welche Kurse sind am beliebtesten" },
        "참석 횟수 기준으로 보여줍니다.": { ru: "По количеству посещений.", zh: "按出勤次数显示。", ja: "出席回数で表示します。", es: "Mostrado por número de asistencias.", pt: "Exibido por número de presenças.", fr: "Affiché par nombre de présences.", de: "Nach Anwesenheitsanzahl angezeigt." },

        // ═══ Data Backup ═══
        "데이터 자동 백업": { ru: "Автоматическое резервное копирование", zh: "数据自动备份", ja: "データ自動バックアップ", es: "Respaldo automático de datos", pt: "Backup automático de dados", fr: "Sauvegarde automatique des données", de: "Automatische Datensicherung" },
        "매일 23:00": { ru: "Ежедневно в 23:00", zh: "每天23:00", ja: "毎日23:00", es: "Todos los días 23:00", pt: "Todos os dias 23:00", fr: "Tous les jours à 23h00", de: "Täglich 23:00" },
        "1일 2회": { ru: "2 раза в день", zh: "每天2次", ja: "1日2回", es: "2 veces al día", pt: "2 vezes ao dia", fr: "2 fois par jour", de: "2 Mal täglich" },
        "60일 초과 시 삭제": { ru: "Удаление через 60 дней", zh: "超过60天时删除", ja: "60日超過時に削除", es: "Eliminado después de 60 días", pt: "Excluído após 60 dias", fr: "Supprimé après 60 jours", de: "Nach 60 Tagen gelöscht" },
        "날짜 초기화": { ru: "Сбросить дату", zh: "重置日期", ja: "日付リセット", es: "Restablecer fecha", pt: "Redefinir data", fr: "Réinitialiser la date", de: "Datum zurücksetzen" },
        "회원명/내용 검색...": { ru: "Поиск по имени/содержанию...", zh: "搜索会员名/内容...", ja: "会員名/内容で検索...", es: "Buscar por nombre/contenido...", pt: "Pesquisar por nome/conteúdo...", fr: "Rechercher par nom/contenu...", de: "Nach Name/Inhalt suchen..." },
        "시간 전": { ru: "ч. назад", zh: "小时前", ja: "時間前", es: "horas antes", pt: "horas atrás", fr: "heures avant", de: "Stunden zuvor" },
        "비율입니다.": { ru: "- это процент.", zh: "是比率。", ja: "の割合です。", es: "es la proporción.", pt: "é a proporção.", fr: "est le ratio.", de: "ist das Verhältnis." },
    };
}

function applyBatch() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const existing = parseTranslationsFile();
    const newData = getKoreanKeyNativeTranslations();
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
        if (!langMatch) { console.log(`  ❌ ${lang}: block not found`); continue; }
        let braceCount = 0, closingBracePos = -1;
        for (let i = langMatch.index; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') { braceCount--; if (braceCount === 0) { closingBracePos = i; break; } }
        }
        if (closingBracePos === -1) continue;

        let entries = '\n        // ═══ Korean-key translations (batch 4) ═══\n';
        for (const { key, value } of toAdd) {
            const ek = key.replace(/"/g, '\\"');
            const ev = value.replace(/"/g, '\\"');
            entries += `        "${ek}": "${ev}",\n`;
        }
        content = content.slice(0, closingBracePos) + entries + content.slice(closingBracePos);
        console.log(`  ✅ ${lang}: Added ${toAdd.length} Korean-key translations`);
    }

    fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf-8');
    console.log('\n  📄 translations.js updated!');
}

console.log('\n🌍 Batch 4: Korean-text key native translations...\n');
applyBatch();
console.log('\n  Done!\n');
