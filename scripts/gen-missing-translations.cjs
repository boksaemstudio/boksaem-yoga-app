#!/usr/bin/env node
/**
 * gen-missing-translations.cjs
 * 
 * translations.js에서 누락된 번역 키를 찾아서 각 언어의 네이티브 번역을 자동 생성합니다.
 * en 섹션의 번역을 기준으로 각 언어에 맞는 번역을 매핑합니다.
 * 
 * 사용법: node scripts/gen-missing-translations.cjs
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.resolve(__dirname, '..', 'src', 'utils', 'translations.js');

// ─── Step 1: Parse the existing translations.js to extract all keys per language ───

function parseTranslationsFile() {
    const content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const languages = {};
    
    // Find each language block
    const langPositions = [];
    const langRegex = /^    (\w+): \{/gm;
    let match;
    while ((match = langRegex.exec(content)) !== null) {
        langPositions.push({ lang: match[1], start: match.index });
    }
    
    for (let i = 0; i < langPositions.length; i++) {
        const lang = langPositions[i].lang;
        const startIdx = langPositions[i].start;
        
        // Find the closing brace for this language block
        let braceCount = 0;
        let blockContent = '';
        let inBlock = false;
        
        for (let j = startIdx; j < content.length; j++) {
            if (content[j] === '{') { braceCount++; inBlock = true; }
            if (content[j] === '}') { braceCount--; }
            if (inBlock) blockContent += content[j];
            if (inBlock && braceCount === 0) break;
        }
        
        // Extract key-value pairs
        const kvPairs = {};
        // Match both quoted keys and unquoted keys
        const kvRegex = /^\s+(?:"([^"]+)"|'([^']+)'|([a-zA-Z_]\w*))\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/gm;
        let kvMatch;
        while ((kvMatch = kvRegex.exec(blockContent)) !== null) {
            const key = kvMatch[1] || kvMatch[2] || kvMatch[3];
            const value = kvMatch[4] || kvMatch[5] || kvMatch[6] || '';
            if (key) kvPairs[key] = value;
        }
        
        languages[lang] = kvPairs;
    }
    
    return languages;
}

// ─── Step 2: Define native translations for each language ───
// These are professionally translated admin/UI terms

function getKoreanKeyTranslations() {
    // Korean-text keys that exist in en but need translations for other languages
    // Format: { koreanKey: { en: "...", ru: "...", zh: "...", ja: "...", es: "...", pt: "...", fr: "...", de: "..." } }
    
    return {
        // ═══ Admin Dashboard Core ═══
        "새로운 버전이 준비되었습니다": { en: "A new version is ready", ru: "Доступна новая версия", zh: "新版本已就绪", ja: "新しいバージョンの準備ができました", es: "Una nueva versión está lista", pt: "Uma nova versão está pronta", fr: "Une nouvelle version est prête", de: "Eine neue Version ist bereit" },
        "새로운 기능 활성화 및 최적화를 위해": { en: "To enable new features and optimizations", ru: "Для активации новых функций и оптимизации", zh: "为启用新功能和优化", ja: "新機能の有効化と最適化のため", es: "Para habilitar nuevas funciones y optimizaciones", pt: "Para habilitar novos recursos e otimizações", fr: "Pour activer de nouvelles fonctionnalités et optimisations", de: "Um neue Funktionen und Optimierungen zu aktivieren" },
        "지금 업데이트를 진행해주세요.": { en: "Please update now.", ru: "Пожалуйста, обновите сейчас.", zh: "请立即更新。", ja: "今すぐアップデートしてください。", es: "Por favor, actualice ahora.", pt: "Por favor, atualize agora.", fr: "Veuillez mettre à jour maintenant.", de: "Bitte jetzt aktualisieren." },
        "업데이트 중...": { en: "Updating...", ru: "Обновление...", zh: "更新中...", ja: "更新中...", es: "Actualizando...", pt: "Atualizando...", fr: "Mise à jour...", de: "Aktualisierung..." },
        "클릭하여 업데이트 및 재시작": { en: "Click to update and restart", ru: "Нажмите для обновления и перезагрузки", zh: "点击更新并重启", ja: "クリックして更新＆再起動", es: "Clic para actualizar y reiniciar", pt: "Clique para atualizar e reiniciar", fr: "Cliquez pour mettre à jour et redémarrer", de: "Klicken zum Aktualisieren und Neustarten" },
        
        // ═══ Attendance Trend Analysis ═══
        "출석 추세 분석": { en: "Attendance Trend Analysis", ru: "Анализ тенденций посещаемости", zh: "出勤趋势分析", ja: "出席トレンド分析", es: "Análisis de tendencias de asistencia", pt: "Análise de tendências de frequência", fr: "Analyse des tendances de présence", de: "Besuchstrend-Analyse" },
        "출석 추세 분석 중...": { en: "Analyzing attendance trends...", ru: "Анализ тенденций посещаемости...", zh: "正在分析出勤趋势...", ja: "出席トレンドを分析中...", es: "Analizando tendencias de asistencia...", pt: "Analisando tendências de frequência...", fr: "Analyse des tendances de présence...", de: "Besuchstrends werden analysiert..." },
        "일별 추세": { en: "Daily Trend", ru: "Дневная динамика", zh: "每日趋势", ja: "日別トレンド", es: "Tendencia diaria", pt: "Tendência diária", fr: "Tendance quotidienne", de: "Tagestrend" },
        "일별 출석": { en: "Daily Attendance", ru: "Ежедневная посещаемость", zh: "每日出勤", ja: "日別出席", es: "Asistencia diaria", pt: "Frequência diária", fr: "Présence quotidienne", de: "Tägliche Anwesenheit" },
        "7일 이동평균": { en: "7-Day Moving Average", ru: "7-дневная скользящая средняя", zh: "7日移动平均", ja: "7日移動平均", es: "Media móvil de 7 días", pt: "Média móvel de 7 dias", fr: "Moyenne mobile sur 7 jours", de: "7-Tage-Durchschnitt" },
        "데이터 없음": { en: "No Data", ru: "Нет данных", zh: "无数据", ja: "データなし", es: "Sin datos", pt: "Sem dados", fr: "Pas de données", de: "Keine Daten" },
        "인기 분석": { en: "Popularity Analysis", ru: "Анализ популярности", zh: "热门分析", ja: "人気分析", es: "Análisis de popularidad", pt: "Análise de popularidade", fr: "Analyse de popularité", de: "Beliebtheitsanalyse" },
        "이번 주": { en: "This Week", ru: "Эта неделя", zh: "本周", ja: "今週", es: "Esta semana", pt: "Esta semana", fr: "Cette semaine", de: "Diese Woche" },
        "지난 주": { en: "Last Week", ru: "Прошлая неделя", zh: "上周", ja: "先週", es: "Semana pasada", pt: "Semana passada", fr: "Semaine dernière", de: "Letzte Woche" },
        "신규 vs 기존 회원 (4주)": { en: "New vs Existing Members (4 Weeks)", ru: "Новые vs существующие участники (4 нед.)", zh: "新会员 vs 老会员（4周）", ja: "新規 vs 既存会員（4週間）", es: "Nuevos vs existentes (4 semanas)", pt: "Novos vs existentes (4 semanas)", fr: "Nouveaux vs existants (4 semaines)", de: "Neu vs Bestehend (4 Wochen)" },
        "○ 점선 = 오늘(집계 중)": { en: "○ Dotted line = Today (counting)", ru: "○ Пунктир = Сегодня (подсчёт)", zh: "○ 虚线 = 今天（统计中）", ja: "○ 点線 = 本日（集計中）", es: "○ Línea punteada = Hoy (contando)", pt: "○ Linha pontilhada = Hoje (contando)", fr: "○ Pointillé = Aujourd'hui (en cours)", de: "○ Gepunktet = Heute (zählt)" },
        "히트맵": { en: "Heatmap", ru: "Тепловая карта", zh: "热力图", ja: "ヒートマップ", es: "Mapa de calor", pt: "Mapa de calor", fr: "Carte thermique", de: "Heatmap" },
        "월~오늘": { en: "Mon~Today", ru: "Пн~Сегодня", zh: "周一~今天", ja: "月〜今日", es: "Lun~Hoy", pt: "Seg~Hoje", fr: "Lun~Aujourd'hui", de: "Mo~Heute" },
        "피크": { en: "Peak", ru: "Пик", zh: "峰值", ja: "ピーク", es: "Pico", pt: "Pico", fr: "Pic", de: "Spitze" },
        "동일 시점 대비": { en: "vs Same Point", ru: "По сравнению с тем же периодом", zh: "与同期对比", ja: "同時点比", es: "vs mismo punto", pt: "vs mesmo ponto", fr: "vs même point", de: "vs gleicher Zeitpunkt" },
        "적음": { en: "Less", ru: "Меньше", zh: "较少", ja: "少ない", es: "Menos", pt: "Menos", fr: "Moins", de: "Weniger" },
        "1년": { en: "1 Year", ru: "1 год", zh: "1年", ja: "1年", es: "1 año", pt: "1 ano", fr: "1 an", de: "1 Jahr" },
        "보통": { en: "Normal", ru: "Обычно", zh: "一般", ja: "普通", es: "Normal", pt: "Normal", fr: "Normal", de: "Normal" },
        "오늘": { en: "Today", ru: "Сегодня", zh: "今天", ja: "今日", es: "Hoy", pt: "Hoje", fr: "Aujourd'hui", de: "Heute" },
        
        // ═══ Kiosk Settings ═══
        "키오스크 화면 설정": { en: "Kiosk Screen Settings", ru: "Настройки экрана киоска", zh: "终端屏幕设置", ja: "キオスク画面設定", es: "Configuración de pantalla del kiosco", pt: "Configurações de tela do quiosque", fr: "Paramètres d'écran du kiosque", de: "Kiosk-Bildschirmeinstellungen" },
        "📷 출석 화면 로고": { en: "📷 Attendance Screen Logo", ru: "📷 Логотип экрана посещения", zh: "📷 签到屏幕Logo", ja: "📷 出席画面ロゴ", es: "📷 Logo de pantalla de asistencia", pt: "📷 Logo da tela de frequência", fr: "📷 Logo de l'écran de présence", de: "📷 Anwesenheits-Bildschirmlogo" },
        "사용 안내": { en: "Instructions", ru: "Инструкция", zh: "使用说明", ja: "使用案内", es: "Instrucciones", pt: "Instruções", fr: "Instructions", de: "Anleitung" },
        "변경": { en: "Change", ru: "Изменить", zh: "更改", ja: "変更", es: "Cambiar", pt: "Alterar", fr: "Modifier", de: "Ändern" },
        "삭제": { en: "Delete", ru: "Удалить", zh: "删除", ja: "削除", es: "Eliminar", pt: "Excluir", fr: "Supprimer", de: "Löschen" },
        "파일 선택": { en: "Select File", ru: "Выбрать файл", zh: "选择文件", ja: "ファイル選択", es: "Seleccionar archivo", pt: "Selecionar arquivo", fr: "Sélectionner un fichier", de: "Datei auswählen" },
        "로딩 중...": { en: "Loading...", ru: "Загрузка...", zh: "加载中...", ja: "読み込み中...", es: "Cargando...", pt: "Carregando...", fr: "Chargement...", de: "Laden..." },
        "불러오는 중...": { en: "Loading...", ru: "Загрузка...", zh: "加载中...", ja: "読み込み中...", es: "Cargando...", pt: "Carregando...", fr: "Chargement...", de: "Laden..." },
        "성공": { en: "Success", ru: "Успех", zh: "成功", ja: "成功", es: "Éxito", pt: "Sucesso", fr: "Succès", de: "Erfolg" },
        "실패": { en: "Failed", ru: "Ошибка", zh: "失败", ja: "失敗", es: "Error", pt: "Falha", fr: "Échec", de: "Fehler" },
        "취소": { en: "Cancel", ru: "Отмена", zh: "取消", ja: "キャンセル", es: "Cancelar", pt: "Cancelar", fr: "Annuler", de: "Abbrechen" },
        "다시 시도": { en: "Try Again", ru: "Повторить", zh: "重试", ja: "再試行", es: "Reintentar", pt: "Tentar novamente", fr: "Réessayer", de: "Erneut versuchen" },
        "예약": { en: "Reservation", ru: "Бронирование", zh: "预约", ja: "予約", es: "Reserva", pt: "Reserva", fr: "Réservation", de: "Reservierung" },
        "출석": { en: "Attendance", ru: "Посещение", zh: "出勤", ja: "出席", es: "Asistencia", pt: "Frequência", fr: "Présence", de: "Anwesenheit" },
        "명": { en: "people", ru: "чел.", zh: "人", ja: "名", es: "personas", pt: "pessoas", fr: "personnes", de: "Personen" },
        "건너뜀": { en: "Skipped", ru: "Пропущено", zh: "跳过", ja: "スキップ", es: "Omitido", pt: "Ignorado", fr: "Ignoré", de: "Übersprungen" },
        "노쇼": { en: "No Show", ru: "Неявка", zh: "未到", ja: "ノーショー", es: "No presentado", pt: "Não compareceu", fr: "Absent", de: "Nicht erschienen" },
        "오늘로 이동": { en: "Go to Today", ru: "Перейти к сегодня", zh: "跳转到今天", ja: "今日へ移動", es: "Ir a hoy", pt: "Ir para hoje", fr: "Aller à aujourd'hui", de: "Zum Heute gehen" },
        "오늘로 돌아가기": { en: "Back to Today", ru: "Вернуться к сегодня", zh: "返回今天", ja: "今日に戻る", es: "Volver a hoy", pt: "Voltar para hoje", fr: "Retour à aujourd'hui", de: "Zurück zu Heute" },
        "대기": { en: "Standby", ru: "Режим ожидания", zh: "待机", ja: "待機", es: "Espera", pt: "Espera", fr: "Veille", de: "Bereitschaft" },
        "먼저": { en: "First", ru: "Сначала", zh: "首先", ja: "まず", es: "Primero", pt: "Primeiro", fr: "D'abord", de: "Zuerst" },
        "아래": { en: "Below", ru: "Ниже", zh: "下方", ja: "下記", es: "Abajo", pt: "Abaixo", fr: "Ci-dessous", de: "Unten" },
        "합니다": { en: "", ru: "", zh: "", ja: "", es: "", pt: "", fr: "", de: "" },
        "배경:": { en: "Background:", ru: "Фон:", zh: "背景：", ja: "背景:", es: "Fondo:", pt: "Fundo:", fr: "Arrière-plan:", de: "Hintergrund:" },
        "농도 조절": { en: "Opacity Control", ru: "Настройка прозрачности", zh: "透明度调节", ja: "濃度調整", es: "Control de opacidad", pt: "Controle de opacidade", fr: "Contrôle d'opacité", de: "Transparenzkontrolle" },
        
        // ═══ Member Management ═══
        "🏆 인기 수업 Top 5": { en: "🏆 Top 5 Popular Classes", ru: "🏆 Топ-5 популярных занятий", zh: "🏆 热门课程Top 5", ja: "🏆 人気クラスTop 5", es: "🏆 Top 5 clases populares", pt: "🏆 Top 5 aulas populares", fr: "🏆 Top 5 cours populaires", de: "🏆 Top 5 beliebte Kurse" },
        "⭐ 인기 강사 Top 5": { en: "⭐ Top 5 Popular Instructors", ru: "⭐ Топ-5 популярных инструкторов", zh: "⭐ 热门讲师Top 5", ja: "⭐ 人気講師Top 5", es: "⭐ Top 5 instructores populares", pt: "⭐ Top 5 instrutores populares", fr: "⭐ Top 5 instructeurs populaires", de: "⭐ Top 5 beliebte Lehrer" },
        "📊 전체 통합": { en: "📊 Full Integration", ru: "📊 Общая сводка", zh: "📊 全部汇总", ja: "📊 全体統合", es: "📊 Integración total", pt: "📊 Integração total", fr: "📊 Intégration complète", de: "📊 Gesamtübersicht" },
        "다회 출석 (열성 회원)": { en: "Multiple Attendance (Enthusiastic)", ru: "Множественные посещения (активные)", zh: "多次出勤（热情会员）", ja: "複数回出席（熱心な会員）", es: "Asistencia múltiple (entusiasta)", pt: "Frequência múltipla (entusiasta)", fr: "Présences multiples (enthousiaste)", de: "Mehrfachanwesenheit (engagiert)" },
        "가장 붐비는 수업": { en: "Busiest Class", ru: "Самое популярное занятие", zh: "最繁忙的课程", ja: "最も混雑するクラス", es: "Clase más concurrida", pt: "Aula mais movimentada", fr: "Cours le plus fréquenté", de: "Meistbesuchter Kurs" },
        
        // ═══ Data Migration ═══
        "CSV 회원 데이터 마이그레이션": { en: "CSV Member Data Migration", ru: "Миграция данных участников CSV", zh: "CSV会员数据迁移", ja: "CSV会員データ移行", es: "Migración de datos CSV", pt: "Migração de dados CSV", fr: "Migration de données CSV", de: "CSV-Datenmigration" },
        "CSV 파일 업로드 (마이그레이션 실행)": { en: "Upload CSV (Run Migration)", ru: "Загрузить CSV (запуск миграции)", zh: "上传CSV（执行迁移）", ja: "CSVアップロード（移行実行）", es: "Subir CSV (Ejecutar migración)", pt: "Enviar CSV (Executar migração)", fr: "Télécharger CSV (Exécuter)", de: "CSV hochladen (Migration starten)" },
        "검증 모드": { en: "Verification Mode", ru: "Режим проверки", zh: "验证模式", ja: "検証モード", es: "Modo de verificación", pt: "Modo de verificação", fr: "Mode de vérification", de: "Überprüfungsmodus" },
        "실제 마이그레이션 모드": { en: "Actual Migration Mode", ru: "Режим реальной миграции", zh: "实际迁移模式", ja: "実際の移行モード", es: "Modo de migración real", pt: "Modo de migração real", fr: "Mode de migration réel", de: "Tatsächlicher Migrationsmodus" },
        "파일명:": { en: "File name:", ru: "Имя файла:", zh: "文件名：", ja: "ファイル名:", es: "Nombre del archivo:", pt: "Nome do arquivo:", fr: "Nom du fichier:", de: "Dateiname:" },
        
        // ═══ Booking/Reservation ═══
        "📋 예약": { en: "📋 Reservation", ru: "📋 Бронирование", zh: "📋 预约", ja: "📋 予約", es: "📋 Reserva", pt: "📋 Reserva", fr: "📋 Réservation", de: "📋 Reservierung" },
        "⏳ 대기": { en: "⏳ Wait", ru: "⏳ Ожидание", zh: "⏳ 等待", ja: "⏳ 待機", es: "⏳ Espera", pt: "⏳ Espera", fr: "⏳ Attente", de: "⏳ Warten" },
        "❌ 노쇼": { en: "❌ No Show", ru: "❌ Неявка", zh: "❌ 未到", ja: "❌ ノーショー", es: "❌ No presentado", pt: "❌ Não compareceu", fr: "❌ Absent", de: "❌ Nicht erschienen" },
        "✅ 출석": { en: "✅ Attendance", ru: "✅ Посещение", zh: "✅ 出勤", ja: "✅ 出席", es: "✅ Asistencia", pt: "✅ Frequência", fr: "✅ Présence", de: "✅ Anwesenheit" },
        "예약자 없음": { en: "No Reservations", ru: "Нет бронирований", zh: "无预约", ja: "予約者なし", es: "Sin reservas", pt: "Sem reservas", fr: "Pas de réservations", de: "Keine Reservierungen" },
        "이 날짜에 등록된 수업이 없습니다": { en: "No classes on this date", ru: "На эту дату занятий нет", zh: "该日期没有课程", ja: "この日は授業がありません", es: "No hay clases en esta fecha", pt: "Sem aulas nesta data", fr: "Pas de cours à cette date", de: "Keine Kurse an diesem Datum" },
        "매출 기록": { en: "Sales Records", ru: "Записи продаж", zh: "销售记录", ja: "売上記録", es: "Registros de ventas", pt: "Registros de vendas", fr: "Registres de ventes", de: "Verkaufsaufzeichnungen" },
        
        // ═══ Kiosk Media ═══
        "📂 미디어 갤러리": { en: "📂 Media Gallery", ru: "📂 Медиагалерея", zh: "📂 媒体库", ja: "📂 メディアギャラリー", es: "📂 Galería de medios", pt: "📂 Galeria de mídia", fr: "📂 Galerie multimédia", de: "📂 Mediengalerie" },
        "📎 업로드": { en: "📎 Upload", ru: "📎 Загрузить", zh: "📎 上传", ja: "📎 アップロード", es: "📎 Subir", pt: "📎 Enviar", fr: "📎 Télécharger", de: "📎 Hochladen" },
        "새 파일 업로드": { en: "Upload New File", ru: "Загрузить новый файл", zh: "上传新文件", ja: "新規ファイルアップロード", es: "Subir nuevo archivo", pt: "Enviar novo arquivo", fr: "Télécharger un nouveau fichier", de: "Neue Datei hochladen" },
        "업로드된 미디어가 없습니다": { en: "No media uploaded", ru: "Нет загруженных медиа", zh: "未上传媒体", ja: "アップロードされたメディアなし", es: "No hay medios subidos", pt: "Nenhuma mídia enviada", fr: "Aucun média téléchargé", de: "Keine Medien hochgeladen" },
        "표시할 미디어를 선택": { en: "Select media to display", ru: "Выберите медиа для показа", zh: "选择要显示的媒体", ja: "表示するメディアを選択", es: "Seleccionar medio para mostrar", pt: "Selecionar mídia para exibir", fr: "Sélectionner le média à afficher", de: "Medien zum Anzeigen auswählen" },
        "이미지 첨부": { en: "Attach Image", ru: "Прикрепить изображение", zh: "附加图片", ja: "画像添付", es: "Adjuntar imagen", pt: "Anexar imagem", fr: "Joindre une image", de: "Bild anhängen" },
        "회원현황_YYYYMMDD.csv": { en: "MemberStatus_YYYYMMDD.csv", ru: "СтатусУчастников_YYYYMMDD.csv", zh: "会员状况_YYYYMMDD.csv", ja: "会員状況_YYYYMMDD.csv", es: "EstadoMiembros_YYYYMMDD.csv", pt: "StatusMembros_YYYYMMDD.csv", fr: "StatutMembres_YYYYMMDD.csv", de: "Mitgliederstatus_YYYYMMDD.csv" },
        
        // ═══ Member Registration/Notes ═══
        "회원에 대한 메모를 입력하세요 (예: 허리 디스크, 오전반 선호 등)": { en: "Enter notes about the member (e.g., back issues, morning preference)", ru: "Введите заметки об участнике (напр., проблемы со спиной, утренние занятия)", zh: "输入会员备注（如腰部问题、偏好上午班等）", ja: "会員メモを入力（例：腰痛、午前クラス希望等）", es: "Ingrese notas sobre el miembro (ej. dolor de espalda, preferencia matutina)", pt: "Insira notas sobre o membro (ex. dor nas costas, preferência matutina)", fr: "Entrez des notes sur le membre (ex. mal de dos, préférence matinale)", de: "Notizen zum Mitglied eingeben (z.B. Rückenprobleme, Morgenklasse bevorzugt)" },
        "메시지를 전송하면 해당 회원의 앱으로 푸시 알림이 발송됩니다.": { en: "A push notification will be sent to the member's app.", ru: "Push-уведомление будет отправлено в приложение участника.", zh: "将向会员的App发送推送通知。", ja: "会員のアプリにプッシュ通知が送信されます。", es: "Se enviará una notificación push a la app del miembro.", pt: "Uma notificação push será enviada ao app do membro.", fr: "Une notification push sera envoyée à l'application du membre.", de: "Eine Push-Benachrichtigung wird an die App des Mitglieds gesendet." },
        "특이사항이나 메모를 입력하세요": { en: "Enter special info or notes", ru: "Введите особые сведения или заметки", zh: "输入特殊事项或备注", ja: "特記事項やメモを入力してください", es: "Ingrese información especial o notas", pt: "Insira informações especiais ou notas", fr: "Entrez des informations spéciales ou des notes", de: "Besonderheiten oder Notizen eingeben" },
        "자율수련": { en: "Self Practice", ru: "Самостоятельная практика", zh: "自主练习", ja: "自主練習", es: "Práctica libre", pt: "Prática livre", fr: "Pratique libre", de: "Freie Übung" },
        "뒷자리 8자리 숫자": { en: "Last 8 digits", ru: "Последние 8 цифр", zh: "后8位数字", ja: "下8桁の数字", es: "Últimos 8 dígitos", pt: "Últimos 8 dígitos", fr: "8 derniers chiffres", de: "Letzte 8 Ziffern" },
        "원장 메모 (선택)": { en: "Director's Note (Optional)", ru: "Заметка директора (необязательно)", zh: "院长备注（选填）", ja: "院長メモ（任意）", es: "Nota del director (opcional)", pt: "Nota do diretor (opcional)", fr: "Note du directeur (optionnel)", de: "Direktornotiz (optional)" },
        "전체 푸시 알림 보내기": { en: "Send Push to All", ru: "Отправить уведомление всем", zh: "发送全员推送通知", ja: "全体プッシュ通知送信", es: "Enviar push a todos", pt: "Enviar push para todos", fr: "Envoyer push à tous", de: "Push an alle senden" },
        "회원 이름 입력": { en: "Enter Member Name", ru: "Введите имя участника", zh: "输入会员姓名", ja: "会員名を入力", es: "Ingrese nombre del miembro", pt: "Insira o nome do membro", fr: "Entrez le nom du membre", de: "Mitgliedername eingeben" },
        "체크 해제 시 알림 없이 조용히 등록됩니다.": { en: "Unchecked: registered quietly without notification.", ru: "При снятии флажка: тихая регистрация без уведомления.", zh: "取消勾选时将静默注册，不发送通知。", ja: "チェック解除時は通知なしで静かに登録されます。", es: "Sin marcar: registrado silenciosamente sin notificación.", pt: "Desmarcado: registrado silenciosamente sem notificação.", fr: "Non coché : enregistré silencieusement sans notification.", de: "Deaktiviert: Leise registriert ohne Benachrichtigung." },
        "예: [안내] 동절기 수업 시간 변경": { en: "e.g., [Notice] Winter schedule change", ru: "Напр.: [Уведомление] Изменение зимнего расписания", zh: "例如：[通知] 冬季课程时间变更", ja: "例：[案内] 冬期授業時間変更", es: "Ej.: [Aviso] Cambio de horario de invierno", pt: "Ex.: [Aviso] Alteração de horário de inverno", fr: "Ex. : [Avis] Changement d'horaire d'hiver", de: "Z.B.: [Hinweis] Winterfahrplan-Änderung" },
        
        // ═══ Kiosk Advanced Settings ═══
        "키오스크 공지 기능 안내": { en: "Kiosk Notice Feature Guide", ru: "Руководство по функции уведомлений киоска", zh: "终端公告功能说明", ja: "キオスク通知機能ガイド", es: "Guía de función de aviso del kiosco", pt: "Guia de recurso de aviso do quiosque", fr: "Guide de la fonction d'avis du kiosque", de: "Kiosk-Ankündigungsfunktion" },
        "⚙️ 공지 화면 옵션": { en: "⚙️ Notice Screen Options", ru: "⚙️ Параметры экрана уведомлений", zh: "⚙️ 公告屏幕选项", ja: "⚙️ 通知画面オプション", es: "⚙️ Opciones de pantalla de aviso", pt: "⚙️ Opções de tela de aviso", fr: "⚙️ Options d'écran d'avis", de: "⚙️ Ankündigungs-Optionen" },
        "사용 방법:": { en: "How to use:", ru: "Как использовать:", zh: "使用方法：", ja: "使い方:", es: "Cómo usar:", pt: "Como usar:", fr: "Comment utiliser:", de: "Verwendung:" },
        "시작 시간 (켜짐)": { en: "Start Time (On)", ru: "Время начала (Вкл)", zh: "开始时间（开）", ja: "開始時間（オン）", es: "Hora de inicio (encendido)", pt: "Hora de início (ligado)", fr: "Heure de début (activé)", de: "Startzeit (ein)" },
        "자동 ON/OFF 스케줄 사용": { en: "Use Auto ON/OFF Schedule", ru: "Использовать авто вкл/выкл", zh: "使用自动开关计划", ja: "自動ON/OFFスケジュール使用", es: "Usar horario automático ON/OFF", pt: "Usar agendamento automático ON/OFF", fr: "Utiliser le programme auto ON/OFF", de: "Automatischen EIN/AUS-Zeitplan verwenden" },
        "터치 안내 텍스트 표시": { en: "Show Touch Guide Text", ru: "Показать текст подсказки", zh: "显示触摸提示文字", ja: "タッチガイドテキスト表示", es: "Mostrar texto de guía táctil", pt: "Mostrar texto de guia de toque", fr: "Afficher le texte du guide tactile", de: "Touch-Anleitungstext anzeigen" },
        
        // ═══ Common UI Terms ═══
        "판매금액이 0이 아닌 경우 자동으로 매출 기록이 추가됩니다.": { en: "Sales records are auto-added when amount is non-zero.", ru: "При ненулевой сумме запись о продаже добавляется автоматически.", zh: "销售金额非零时自动添加销售记录。", ja: "販売金額が0でない場合、売上記録が自動追加されます。", es: "Los registros de ventas se agregan automáticamente cuando el monto no es cero.", pt: "Registros de vendas são adicionados automaticamente quando o valor não é zero.", fr: "Les enregistrements de ventes sont ajoutés automatiquement lorsque le montant n'est pas nul.", de: "Verkaufsdatensätze werden automatisch hinzugefügt, wenn der Betrag nicht null ist." },
        "중복 전화번호가 있으면 기존 회원 데이터를 업데이트합니다.": { en: "Duplicate phone numbers update existing member data.", ru: "Дубликаты телефонов обновляют данные существующих участников.", zh: "重复手机号将更新现有会员数据。", ja: "重複する電話番号は既存会員データを更新します。", es: "Los números duplicados actualizan datos existentes.", pt: "Números duplicados atualizam dados existentes.", fr: "Les numéros en double mettent à jour les données existantes.", de: "Doppelte Nummern aktualisieren bestehende Daten." },
        "마이그레이션 중 오류가 발생했습니다.": { en: "An error occurred during migration.", ru: "Ошибка при миграции.", zh: "迁移过程中发生错误。", ja: "移行中にエラーが発生しました。", es: "Ocurrió un error durante la migración.", pt: "Ocorreu um erro durante a migração.", fr: "Une erreur s'est produite lors de la migration.", de: "Bei der Migration ist ein Fehler aufgetreten." },
    };
}

// ─── Step 3: Generate the patch content for translations.js ───

function generatePatch() {
    const existingTranslations = parseTranslationsFile();
    const koreanKeyTranslations = getKoreanKeyTranslations();
    
    const targetLangs = ['ru', 'zh', 'ja', 'es', 'pt', 'fr', 'de'];
    const stats = {};
    
    for (const lang of targetLangs) {
        let addedCount = 0;
        const toAdd = [];
        
        for (const [koKey, translations] of Object.entries(koreanKeyTranslations)) {
            // Skip if this key already exists in the language
            if (existingTranslations[lang] && existingTranslations[lang][koKey]) continue;
            
            const value = translations[lang];
            if (value !== undefined && value !== '') {
                toAdd.push({ key: koKey, value });
                addedCount++;
            }
        }
        
        stats[lang] = { added: addedCount, entries: toAdd };
    }
    
    return stats;
}

// ─── Step 4: Apply the patch to translations.js ───

function applyPatch() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const stats = generatePatch();
    
    const targetLangs = ['ru', 'zh', 'ja', 'es', 'pt', 'fr', 'de'];
    
    for (const lang of targetLangs) {
        const { entries } = stats[lang];
        if (entries.length === 0) {
            console.log(`  ⏭️  ${lang}: No new keys to add`);
            continue;
        }
        
        // Find the position of the language block's closing brace
        // We need to insert before the closing }, of the language block
        const langBlockRegex = new RegExp(`^(\\s{4}${lang}:\\s*\\{)`, 'm');
        const langMatch = content.match(langBlockRegex);
        if (!langMatch) {
            console.log(`  ❌ ${lang}: Could not find language block`);
            continue;
        }
        
        // Find the opening brace position
        const blockStart = langMatch.index;
        
        // Find matching closing brace
        let braceCount = 0;
        let closingBracePos = -1;
        for (let i = blockStart; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    closingBracePos = i;
                    break;
                }
            }
        }
        
        if (closingBracePos === -1) {
            console.log(`  ❌ ${lang}: Could not find closing brace`);
            continue;
        }
        
        // Build the new entries string
        let newEntries = '\n        // ═══ Auto-generated translations (i18n audit) ═══\n';
        for (const { key, value } of entries) {
            // Escape quotes in both key and value
            const escapedKey = key.replace(/"/g, '\\"');
            const escapedValue = value.replace(/"/g, '\\"');
            newEntries += `        "${escapedKey}": "${escapedValue}",\n`;
        }
        
        // Insert before closing brace
        content = content.slice(0, closingBracePos) + newEntries + content.slice(closingBracePos);
        
        console.log(`  ✅ ${lang}: Added ${entries.length} translations`);
    }
    
    fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf-8');
    console.log('\n  📄 translations.js updated successfully!');
}

// ─── Main ───
console.log('\n🌍 Generating missing translations for all languages...\n');

const stats = generatePatch();
let totalNew = 0;
for (const [lang, data] of Object.entries(stats)) {
    console.log(`  ${lang}: ${data.added} new translations to add`);
    totalNew += data.added;
}
console.log(`\n  Total: ${totalNew} new translation entries\n`);

if (totalNew > 0) {
    console.log('  Applying to translations.js...\n');
    applyPatch();
}

console.log('\n  Done! Run `node scripts/i18n-audit.cjs --scan` to verify coverage.\n');
