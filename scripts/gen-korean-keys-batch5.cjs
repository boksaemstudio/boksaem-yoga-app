#!/usr/bin/env node
/**
 * gen-korean-keys-batch5.cjs — 남은 한국어-키 ~190개 네이티브 번역 (긴 설명문 포함)
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
        // ═══ Navigation & Actions ═══
        "이전": { ru: "Назад", zh: "上一个", ja: "前へ", es: "Anterior", pt: "Anterior", fr: "Précédent", de: "Zurück" },
        "다음": { ru: "Далее", zh: "下一个", ja: "次へ", es: "Siguiente", pt: "Próximo", fr: "Suivant", de: "Weiter" },
        "이미지 없음": { ru: "Нет изображения", zh: "无图片", ja: "画像なし", es: "Sin imagen", pt: "Sem imagem", fr: "Pas d'image", de: "Kein Bild" },
        "이미지 변경": { ru: "Изменить изображение", zh: "更改图片", ja: "画像変更", es: "Cambiar imagen", pt: "Alterar imagem", fr: "Modifier l'image", de: "Bild ändern" },
        "예약 가능 기간": { ru: "Период доступного бронирования", zh: "可预约期间", ja: "予約可能期間", es: "Período de reserva disponible", pt: "Período de reserva disponível", fr: "Période de réservation disponible", de: "Verfügbarer Buchungszeitraum" },
        "10분 주기": { ru: "Каждые 10 мин.", zh: "每10分钟", ja: "10分周期", es: "Cada 10 min.", pt: "A cada 10 min.", fr: "Toutes les 10 min.", de: "Alle 10 Min." },
        "크레딧 소진 알림": { ru: "Уведомление об исчерпании кредитов", zh: "次数用完通知", ja: "クレジット消費通知", es: "Notificación de créditos agotados", pt: "Notificação de créditos esgotados", fr: "Notification de crédits épuisés", de: "Guthaben-erschöpft-Benachrichtigung" },

        // ═══ AI & Automation ═══
        "AI & 자동화": { ru: "AI и автоматизация", zh: "AI & 自动化", ja: "AI & 自動化", es: "IA y automatización", pt: "IA e automação", fr: "IA et automatisation", de: "KI & Automatisierung" },
        "AI 대시보드 브리핑": { ru: "AI-брифинг дашборда", zh: "AI仪表盘简报", ja: "AIダッシュボードブリーフィング", es: "Briefing IA del panel", pt: "Briefing IA do painel", fr: "Briefing IA du tableau de bord", de: "KI-Dashboard-Briefing" },
        "예약 메시지 자동 발송": { ru: "Автоотправка сообщений бронирования", zh: "预约消息自动发送", ja: "予約メッセージ自動送信", es: "Envío automático de mensajes de reserva", pt: "Envio automático de mensagens de reserva", fr: "Envoi automatique de messages de réservation", de: "Automatischer Versand von Buchungsnachrichten" },
        "일일 리포트 (매일 23시)": { ru: "Ежедневный отчёт (в 23:00)", zh: "日报（每天23时）", ja: "日次レポート（毎日23時）", es: "Informe diario (23:00)", pt: "Relatório diário (23:00)", fr: "Rapport quotidien (23h)", de: "Tagesbericht (23:00 Uhr)" },
        "유령 토큰 자동 정리": { ru: "Автоочистка устаревших токенов", zh: "无效令牌自动清理", ja: "ゴーストトークン自動整理", es: "Limpieza automática de tokens fantasma", pt: "Limpeza automática de tokens fantasma", fr: "Nettoyage automatique des tokens fantômes", de: "Automatische Bereinigung von Ghost-Token" },
        "선등록 시 회원권 전환": { ru: "Переключение абонемента при предрегистрации", zh: "预注册时会员卡转换", ja: "事前登録時の会員権切替", es: "Conversión de membresía al pre-registrar", pt: "Conversão de assinatura ao pré-registrar", fr: "Conversion d'abonnement à la pré-inscription", de: "Mitgliedschaftsumwandlung bei Vorregistrierung" },
        "정원 관리 & 대기열": { ru: "Управление вместимостью и очередь", zh: "容量管理 & 候补队列", ja: "定員管理 & キュー", es: "Gestión de capacidad y cola de espera", pt: "Gestão de capacidade e fila de espera", fr: "Gestion de capacité et file d'attente", de: "Kapazitätsverwaltung & Warteliste" },
        "노쇼 (미출석) 자동 처리": { ru: "Автообработка неявок", zh: "爽约（未出勤）自动处理", ja: "ノーショー（未出席）自動処理", es: "Procesamiento automático de no presentados", pt: "Processamento automático de não comparecimentos", fr: "Traitement automatique des absences", de: "Automatische Verarbeitung von Nichterscheinen" },
        "동시 예약 & 하루 예약 한도": { ru: "Одновременные бронирования и дневной лимит", zh: "同时预约 & 每日预约限制", ja: "同時予約 & 1日予約上限", es: "Reservas simultáneas y límite diario", pt: "Reservas simultâneas e limite diário", fr: "Réservations simultanées et limite quotidienne", de: "Gleichzeitige Buchungen & Tageslimit" },
        "횟수 0 + 기간 종료 → 재등록 (신규와 동일)": { ru: "0 кредитов + срок истёк → перерегистрация (как новый)", zh: "次数0 + 期限到期 → 重新注册（同新注册）", ja: "回数0 + 期間終了 → 再登録（新規と同じ）", es: "Créditos 0 + período expirado → re-registro (como nuevo)", pt: "Créditos 0 + período expirado → re-registro (como novo)", fr: "Crédits 0 + période expirée → réinscription (comme nouveau)", de: "0 Guthaben + Zeitraum abgelaufen → Neuregistrierung" },

        // ═══ Long descriptions (admin guide text) ═══
        "키오스크 얼굴인식 출석을 위해": { ru: "Для распознавания лиц на киоске", zh: "用于终端人脸识别签到", ja: "キオスク顔認識出席のため", es: "Para asistencia por reconocimiento facial", pt: "Para presença por reconhecimento facial", fr: "Pour la présence par reconnaissance faciale", de: "Für Gesichtserkennung am Kiosk" },
        "얼굴 데이터를 등록한 활성 회원의": { ru: "Активные участники с зарегистрированными данными лица", zh: "已注册人脸数据的活跃会员的", ja: "顔データを登録した有効会員の", es: "Miembros activos con datos faciales registrados", pt: "Membros ativos com dados faciais registrados", fr: "Membres actifs avec données faciales enregistrées", de: "Aktive Mitglieder mit registrierten Gesichtsdaten" },
        "회원이 앱에서 수강권을 일시정지할 수 있습니다": { ru: "Участники могут приостановить абонемент в приложении", zh: "会员可在App中暂停课程票", ja: "会員がアプリで受講券を一時停止できます", es: "Los miembros pueden pausar su membresía en la app", pt: "Os membros podem pausar sua assinatura no app", fr: "Les membres peuvent mettre en pause leur abonnement dans l'appli", de: "Mitglieder können ihr Abo in der App pausieren" },
        "회원의 수강 횟수를 전체 기간/주간/일간 단위로 관리합니다": { ru: "Управление кредитами за весь период/неделю/день", zh: "按全期/每周/每日管理会员的课程次数", ja: "会員の受講回数を全期間/週間/日単位で管理します", es: "Gestione los créditos por período completo/semanal/diario", pt: "Gerencie os créditos por período total/semanal/diário", fr: "Gérez les crédits par période totale/hebdomadaire/quotidienne", de: "Guthaben pro Gesamtzeitraum/Woche/Tag verwalten" },
        "회원 앱과 알림에 표시돼요": { ru: "Отображается в приложении и уведомлениях", zh: "显示在会员App和通知中", ja: "会員アプリと通知に表示されます", es: "Se muestra en la app y las notificaciones", pt: "Exibido no app e nas notificações", fr: "Affiché dans l'appli et les notifications", de: "Wird in der App und Benachrichtigungen angezeigt" },
        "회원이 앱에서 수업을 미리 예약할 수 있습니다": { ru: "Участники могут бронировать занятия в приложении", zh: "会员可在App中预约课程", ja: "会員がアプリで事前に予約できます", es: "Los miembros pueden reservar clases en la app", pt: "Os membros podem reservar aulas no app", fr: "Les membres peuvent réserver des cours dans l'appli", de: "Mitglieder können Kurse in der App vorbuchen" },
        "시간표에서 수업별로 따로 정할 수도 있습니다": { ru: "Можно настроить индивидуально для каждого занятия", zh: "也可在课程表中按课程单独设置", ja: "時間割でクラスごとに個別設定も可能です", es: "También se puede configurar por clase en el horario", pt: "Também pode ser definido por aula no horário", fr: "Peut aussi être défini par cours dans l'horaire", de: "Kann auch pro Kurs im Zeitplan festgelegt werden" },
        "등록된 회원의 얼굴을 인식하면 자동으로 출석 처리합니다": { ru: "При распознавании лица зарегистрированного участника отмечает автоматически", zh: "识别已注册会员的面部后自动处理签到", ja: "登録済み会員の顔を認識すると自動的に出席処理します", es: "La asistencia se procesa automáticamente al reconocer el rostro", pt: "A presença é processada automaticamente ao reconhecer o rosto", fr: "La présence est traitée automatiquement lors de la reconnaissance faciale", de: "Anwesenheit wird automatisch bei Gesichtserkennung verarbeitet" },
        "정원 초과 시 대기 → 취소 발생 시 자동 예약 + 알림": { ru: "При превышении → очередь → авто-бронирование при отмене + уведомление", zh: "超员时排队等候 → 有人取消时自动预约 + 通知", ja: "定員超過時は待機 → キャンセル発生時に自動予約 + 通知", es: "Lista de espera al exceder capacidad → reserva automática + notificación al cancelar", pt: "Fila de espera ao exceder capacidade → reserva automática + notificação ao cancelar", fr: "File d'attente en cas de surcharge → réservation auto + notification en cas d'annulation", de: "Warteliste bei Überbuchung → Auto-Buchung + Benachrichtigung bei Stornierung" },
        "출석체크 화면에 카메라 영상을 표시합니다": { ru: "Показывает видео с камеры на экране отметки", zh: "在签到界面显示摄像头画面", ja: "出席チェック画面にカメラ映像を表示します", es: "Muestra video de cámara en la pantalla de asistencia", pt: "Exibe vídeo da câmera na tela de frequência", fr: "Affiche la vidéo de la caméra sur l'écran de présence", de: "Zeigt Kameravideo auf dem Anwesenheitsbildschirm" },
        "회원, 출석 또는 매출을 삭제하면 이곳에 보관됩니다": { ru: "Удалённые участники, отметки и продажи хранятся здесь", zh: "删除的会员、出勤或销售将保存在此处", ja: "会員、出席、売上を削除するとここに保管されます", es: "Los miembros, asistencias o ventas eliminados se archivan aquí", pt: "Membros, presenças ou vendas excluídos são arquivados aqui", fr: "Les membres, présences ou ventes supprimés sont archivés ici", de: "Gelöschte Mitglieder, Anwesenheiten oder Umsätze werden hier archiviert" },
        "각 앱의 URL을 복사하거나 QR 코드를 공유할 수 있습니다.": { ru: "Можно скопировать URL приложений или поделиться QR-кодом.", zh: "可以复制各App的URL或分享QR码。", ja: "各アプリのURLをコピーまたはQRコードを共有できます。", es: "Puede copiar la URL de cada app o compartir el código QR.", pt: "Você pode copiar a URL de cada app ou compartilhar o código QR.", fr: "Vous pouvez copier l'URL de chaque appli ou partager le code QR.", de: "Sie können die URL jeder App kopieren oder den QR-Code teilen." },
        "의 회원에게 메시지를 보냅니다.": { ru: "Отправить сообщение участникам.", zh: "向会员发送消息。", ja: "の会員にメッセージを送信します。", es: "Enviar mensaje a los miembros.", pt: "Enviar mensagem aos membros.", fr: "Envoyer un message aux membres.", de: "Nachricht an Mitglieder senden." },
        "* 날짜 선택 시 수동 적용. 비우면 자동 계산.": { ru: "* При выборе даты — ручное. Пусто = автоматически.", zh: "* 选择日期时手动应用。留空则自动计算。", ja: "* 日付選択時は手動適用。空欄なら自動計算。", es: "* Aplicación manual al seleccionar fecha. Vacío = cálculo automático.", pt: "* Aplicação manual ao selecionar data. Vazio = cálculo automático.", fr: "* Application manuelle lors de la sélection de date. Vide = calcul automatique.", de: "* Manuelle Anwendung bei Datumsauswahl. Leer = automatische Berechnung." },
        "• 지점을 삭제하면, 해당 지점의 출석/매출/시간표 기록에서 지점 정보가 사라질 수 있습니다.": { ru: "• При удалении филиала данные могут исчезнуть из записей.", zh: "• 删除分店后，该分店的出勤/销售/课程表记录中分店信息可能消失。", ja: "• 支店を削除すると、出席/売上/時間割の記録から支店情報が消える場合があります。", es: "• Al eliminar una sede, la información puede desaparecer de los registros.", pt: "• Ao excluir uma filial, as informações podem desaparecer dos registros.", fr: "• La suppression d'une succursale peut faire disparaître les informations des registres.", de: "• Beim Löschen einer Filiale können Daten aus den Aufzeichnungen verschwinden." },

        // ═══ Long info texts ═══
        "💡 예약 기능을 켜도, 예약 없이 직접 오는 회원은 기존처럼 출석 가능합니다. 다만 정원이 찬 수업은 워크인이 제한될 수 있습니다.": {
            ru: "💡 Даже при включённой системе бронирования участники без брони могут отмечаться как обычно. Но при полном классе вход без брони может быть ограничен.",
            zh: "💡 即使开启预约功能，未预约的会员仍可像往常一样签到。但满员课程可能限制未预约入场。",
            ja: "💡 予約機能を有効にしても、予約なしで来る会員は従来通り出席できます。ただし定員に達したクラスはウォークインが制限される場合があります。",
            es: "💡 Incluso con reservas activadas, los miembros sin reserva pueden asistir normalmente. Sin embargo, las clases llenas pueden restringir el acceso sin reserva.",
            pt: "💡 Mesmo com reservas ativadas, membros sem reserva podem comparecer normalmente. Porém, aulas lotadas podem restringir o acesso sem reserva.",
            fr: "💡 Même avec les réservations activées, les membres sans réservation peuvent assister normalement. Toutefois, les cours complets peuvent limiter l'accès sans réservation.",
            de: "💡 Auch mit aktivierten Buchungen können Mitglieder ohne Buchung normal teilnehmen. Volle Kurse können den Zugang ohne Buchung jedoch einschränken."
        },
        "푸시 → SMS 순서로 발송합니다. 앱 미설치 회원에게도 SMS로 전달됩니다.": {
            ru: "Отправка: Push → SMS. Участники без приложения получат SMS.",
            zh: "按Push → SMS顺序发送。未安装App的会员也会通过SMS收到。",
            ja: "Push → SMS の順で送信します。アプリ未インストール会員にもSMSで届きます。",
            es: "Se envía en orden Push → SMS. Los miembros sin app reciben SMS.",
            pt: "Enviado na ordem Push → SMS. Membros sem app recebem SMS.",
            fr: "Envoi dans l'ordre Push → SMS. Les membres sans appli reçoivent un SMS.",
            de: "Versand: Push → SMS. Mitglieder ohne App erhalten SMS."
        },
        "매일 밤 11시에 오늘의 출석 수, 신규 가입 수, 보안 이상 여부를 정리한 요약 보고서가 관리자에게 푸시 알림으로 발송됩니다.": {
            ru: "Каждый день в 23:00 администратору отправляется push-отчёт: посещаемость, новые регистрации, безопасность.",
            zh: "每天晚上11点，向管理员发送当日出勤数、新注册数和安全异常的汇总报告推送通知。",
            ja: "毎晩23時に出席数、新規登録数、セキュリティ異常をまとめた要約レポートがプッシュ通知で管理者に送信されます。",
            es: "Cada noche a las 23:00 se envía al admin un resumen con asistencia, nuevos registros y seguridad.",
            pt: "Toda noite às 23:00 um resumo de presença, novos registros e segurança é enviado ao admin.",
            fr: "Chaque soir à 23h, un rapport résumé (présences, nouvelles inscriptions, sécurité) est envoyé à l'admin.",
            de: "Jeden Abend um 23:00 wird ein Zusammenfassungsbericht (Anwesenheit, Neuanmeldungen, Sicherheit) an den Admin gesendet."
        },
        "회원의 잔여 횟수가 0이 되면 AI가 해당 회원의 수강 패턴을 분석하여 맞춤형 알림 메시지를 자동 생성합니다. 관리자가 승인하면 회원에게 푸시 알림으로 발송됩니다.": {
            ru: "Когда кредиты участника = 0, AI анализирует паттерн и создаёт персонализированное уведомление. После одобрения администратора оно отправляется push-уведомлением.",
            zh: "当会员剩余次数为0时，AI分析该会员的上课模式并自动生成定制通知。管理员批准后通过推送发送给会员。",
            ja: "会員の残り回数が0になると、AIが受講パターンを分析しカスタム通知を自動生成します。管理者が承認するとプッシュ通知で送信されます。",
            es: "Cuando los créditos llegan a 0, la IA analiza el patrón y genera un mensaje personalizado. Se envía tras aprobación del admin.",
            pt: "Quando os créditos chegam a 0, a IA analisa o padrão e gera uma mensagem personalizada. Enviada após aprovação do admin.",
            fr: "Lorsque les crédits atteignent 0, l'IA analyse le profil et génère un message personnalisé. Envoyé après approbation de l'admin.",
            de: "Wenn das Guthaben 0 erreicht, analysiert die KI das Muster und erstellt eine personalisierte Nachricht. Nach Admin-Genehmigung per Push gesendet."
        },
        "관리자 대시보드에 접속하면 AI가 현재 시간대에 맞는 전략적 분석을 제공합니다. 활성 회원 수, 매출, 출석률 등 실시간 데이터를 기반으로 실행 가능한 인사이트를 생성합니다.": {
            ru: "При входе в админ-панель AI предоставляет стратегический анализ для текущего времени: активные участники, выручка, посещаемость.",
            zh: "访问管理员仪表盘时，AI根据当前时段提供战略分析。基于活跃会员数、营收、出勤率等实时数据生成可执行洞察。",
            ja: "管理者ダッシュボードにアクセスすると、AIが現在の時間帯に合わせた戦略分析を提供します。",
            es: "Al acceder al panel, la IA proporciona análisis estratégico basado en datos en tiempo real.",
            pt: "Ao acessar o painel, a IA fornece análise estratégica baseada em dados em tempo real.",
            fr: "En accédant au tableau de bord, l'IA fournit une analyse stratégique basée sur les données en temps réel.",
            de: "Beim Zugriff auf das Dashboard liefert die KI strategische Analysen basierend auf Echtzeitdaten."
        },
        "AI는 제공된 데이터의 정확한 수치만 사용하며, 임의의 숫자를 생성하지 않습니다.": {
            ru: "AI использует только точные цифры из данных и не генерирует случайные числа.",
            zh: "AI仅使用提供的数据精确数值，不会生成随机数字。",
            ja: "AIは提供されたデータの正確な数値のみを使用し、任意の数値は生成しません。",
            es: "La IA solo usa cifras exactas de los datos proporcionados, sin generar números aleatorios.",
            pt: "A IA usa apenas números exatos dos dados fornecidos, sem gerar números aleatórios.",
            fr: "L'IA n'utilise que les chiffres exacts des données fournies, sans générer de nombres aléatoires.",
            de: "Die KI verwendet nur exakte Zahlen aus den bereitgestellten Daten und generiert keine zufälligen Zahlen."
        },
        "자동 발송이 아닌 '관리자 승인 후 발송' 방식이므로 안심하셔도 됩니다.": {
            ru: "Отправка только после одобрения администратора — не автоматическая.",
            zh: "不是自动发送，而是'管理员审批后发送'方式，请放心。",
            ja: "自動送信ではなく「管理者承認後に送信」方式なのでご安心ください。",
            es: "No se envía automáticamente, sino tras aprobación del administrador.",
            pt: "Não é enviado automaticamente, mas após aprovação do administrador.",
            fr: "Envoi non automatique, mais après approbation de l'administrateur.",
            de: "Nicht automatisch, sondern erst nach Admin-Genehmigung versendet."
        },
        "관리자가 예약한 알림 메시지(수업 리마인더, 이벤트 안내 등)는 10분 간격으로 자동 발송됩니다. 푸시 알림 우선이며, 푸시 실패 시 SMS로 대체 발송합니다.": {
            ru: "Запланированные уведомления (напоминания, анонсы) рассылаются каждые 10 мин. Приоритет: push, при неудаче — SMS.",
            zh: "管理员预约的通知（课程提醒、活动指南等）每10分钟自动发送。优先推送，推送失败时改用SMS。",
            ja: "管理者が予約した通知メッセージは10分間隔で自動送信されます。プッシュ優先、失敗時はSMSで代替送信。",
            es: "Los mensajes programados se envían automáticamente cada 10 min. Push primero, SMS si falla.",
            pt: "Mensagens agendadas são enviadas automaticamente a cada 10 min. Push primeiro, SMS se falhar.",
            fr: "Les messages programmés sont envoyés toutes les 10 min. Push en priorité, SMS en cas d'échec.",
            de: "Geplante Nachrichten werden alle 10 Min. automatisch gesendet. Push zuerst, SMS bei Fehler."
        },
        "매시간 자동으로 체크합니다. 수업 시간이 지나야 노쇼로 처리됩니다.": {
            ru: "Проверяется автоматически каждый час. Неявка фиксируется после окончания занятия.",
            zh: "每小时自动检查。课程时间过后才处理为爽约。",
            ja: "毎時自動チェックします。授業時間後にノーショーとして処理されます。",
            es: "Se verifica automáticamente cada hora. El no-show se procesa después de la clase.",
            pt: "Verificado automaticamente a cada hora. O não-comparecimento é processado após a aula.",
            fr: "Vérifié automatiquement chaque heure. L'absence est traitée après le cours.",
            de: "Wird stündlich automatisch geprüft. Nichterscheinen wird nach dem Kurs verarbeitet."
        },
        "매일 오전과 오후, 하루 2회 Firestore 데이터가 자동으로 백업됩니다. 데이터 손실 시 백업 시점으로 복원할 수 있습니다.": {
            ru: "Firestore автоматически бэкапится 2 раза в день (утром и днём). При потере данных — восстановление из бэкапа.",
            zh: "Firestore数据每天上午和下午自动备份2次。数据丢失时可恢复到备份时间点。",
            ja: "毎日午前と午後の1日2回、Firestoreデータが自動バックアップされます。",
            es: "Los datos de Firestore se respaldan automáticamente 2 veces al día. Puede restaurarse desde el respaldo.",
            pt: "Os dados do Firestore são salvos automaticamente 2 vezes ao dia. Podem ser restaurados do backup.",
            fr: "Les données Firestore sont sauvegardées automatiquement 2 fois par jour. Peuvent être restaurées depuis la sauvegarde.",
            de: "Firestore-Daten werden automatisch 2x täglich gesichert. Bei Datenverlust kann aus dem Backup wiederhergestellt werden."
        },
        "단체 및 개별 푸시 알림 발송 이력입니다.": {
            ru: "История массовых и индивидуальных push-уведомлений.",
            zh: "群发和个别推送通知发送记录。",
            ja: "一斉および個別プッシュ通知の送信履歴です。",
            es: "Historial de envío de notificaciones push grupales e individuales.",
            pt: "Histórico de envio de notificações push em grupo e individuais.",
            fr: "Historique d'envoi des notifications push groupées et individuelles.",
            de: "Verlauf der Gruppen- und Einzel-Push-Benachrichtigungen."
        },
        "60일 이상 업데이트되지 않은 만료된 푸시 알림 토큰을 자동으로 정리합니다. 이를 통해 불필요한 알림 발송 시도를 줄이고 시스템 효율을 유지합니다.": {
            ru: "Автоматически очищает просроченные push-токены (>60 дней). Снижает ненужные попытки отправки и поддерживает эффективность системы.",
            zh: "自动清理超过60天未更新的过期推送令牌。减少不必要的推送尝试，维持系统效率。",
            ja: "60日以上更新されていない期限切れプッシュトークンを自動整理します。",
            es: "Limpia automáticamente tokens push vencidos (>60 días) para mantener la eficiencia del sistema.",
            pt: "Limpa automaticamente tokens push vencidos (>60 dias) para manter a eficiência do sistema.",
            fr: "Nettoie automatiquement les tokens push expirés (>60 jours) pour maintenir l'efficacité du système.",
            de: "Bereinigt automatisch abgelaufene Push-Token (>60 Tage) zur Systemeffizienz."
        },

        // ═══ Re-registration explanations ═══
        "종료일은 항상 '시작일 + 수강권 기간(개월) - 1일'로 자동 계산됩니다. 예를 들어 시작일이 3월 25일이고 3개월 수강권이면 종료일은 6월 24일입니다.": {
            ru: "Дата окончания всегда = дата начала + период (мес.) - 1 день. Например, 25 марта + 3 мес. = 24 июня.",
            zh: "结束日始终按'开始日 + 课程期限（月）- 1天'自动计算。例如开始日3月25日、3个月课程票，则结束日为6月24日。",
            ja: "終了日は常に「開始日 + 受講券期間（月）- 1日」で自動計算されます。",
            es: "La fecha de fin siempre = fecha inicio + período (meses) - 1 día.",
            pt: "A data final é sempre = data início + período (meses) - 1 dia.",
            fr: "La date de fin = date de début + période (mois) - 1 jour.",
            de: "Enddatum = Startdatum + Zeitraum (Monate) - 1 Tag."
        },
        "횟수도 0이고 기간도 지난 경우 재등록하면, 신규 등록과 완전히 동일하게 처리됩니다. 선택한 시작일부터 수강권 기간에 따라 종료일이 산정되고 새 횟수가 부여됩니다.": {
            ru: "Если кредиты = 0 и срок истёк, перерегистрация обрабатывается как новая.",
            zh: "如果次数为0且期限已过，重新注册时将完全按新注册处理。",
            ja: "回数が0で期間も過ぎた場合の再登録は新規登録と同じ扱いになります。",
            es: "Si créditos = 0 y período expirado, el re-registro se procesa como nuevo.",
            pt: "Se créditos = 0 e período expirado, o re-registro é processado como novo.",
            fr: "Si crédits = 0 et période expirée, la réinscription est traitée comme nouvelle.",
            de: "Bei 0 Guthaben und abgelaufenem Zeitraum wird die Neuregistrierung wie eine Erstanmeldung behandelt."
        },
        "기간이 만료되었지만 잔여 횟수가 남아있는 경우 재등록하면, 기존 잔여 횟수는 삭제(0)되고 새 수강권의 횟수가 부여됩니다. 종료일도 새 수강권 기간에 따라 새로 산정됩니다.": {
            ru: "Если срок истёк, но кредиты остались — при перерегистрации старые обнуляются, назначаются новые.",
            zh: "如果期限已过但剩余次数还有，重新注册时旧剩余次数清零，赋予新课程票次数。",
            ja: "期間満了でも残り回数がある場合、再登録すると既存回数は0になり新しい回数が付与されます。",
            es: "Si el período expiró pero quedan créditos, se reinician a 0 y se asignan nuevos al re-registrar.",
            pt: "Se o período expirou mas restam créditos, são zerados e novos são atribuídos ao re-registrar.",
            fr: "Si la période a expiré mais des crédits restent, ils sont remis à 0 et de nouveaux sont attribués.",
            de: "Bei abgelaufenem Zeitraum mit Restguthaben werden diese auf 0 gesetzt und neue vergeben."
        },
        "예: 기존 5회 남았지만 기간 만료 → 재등록 시 새 수강권 35회로 교체": {
            ru: "Пример: осталось 5 кредитов, срок истёк → при перерегистрации заменяется на 35 новых",
            zh: "例：剩余5次但期限已过 → 重新注册时替换为新课程票35次",
            ja: "例：残り5回だが期間満了 → 再登録時に新受講券35回に交換",
            es: "Ej.: quedan 5 pero expiró → al re-registrar se reemplaza por 35 nuevas",
            pt: "Ex.: restam 5 mas expirou → ao re-registrar substitui por 35 novas",
            fr: "Ex. : 5 restants mais expiré → remplacés par 35 nouveaux à la réinscription",
            de: "Z.B.: 5 übrig aber abgelaufen → bei Neuregistrierung durch 35 neue ersetzt"
        },
        "현재 수강권이 활성 상태인 회원에게 선등록하면, 기존 횟수가 소진되거나 기간이 만료되었을 때 첫 출석 시 자동으로 전환됩니다. 전환 시 기존 잔여 횟수는 0이 되고, 새 수강권의 횟수와 기간으로 완전히 교체됩니다.": {
            ru: "Предрегистрация для активного участника: при исчерпании кредитов или истечении срока, при первом посещении осуществляется автоматический переход на новый абонемент.",
            zh: "对课程票仍有效的会员进行预注册后，在次数用完或期限到期时，首次出勤时自动切换到新课程票。",
            ja: "現在の受講券が有効な会員に事前登録すると、回数消化または期間満了時の初出席で自動的に切り替わります。",
            es: "Al pre-registrar un miembro activo, se convierte automáticamente al agotar créditos o expirar el período.",
            pt: "Ao pré-registrar um membro ativo, a conversão automática ocorre ao esgotar créditos ou expirar o período.",
            fr: "En pré-inscrivant un membre actif, la conversion automatique se fait à l'épuisement des crédits ou à l'expiration.",
            de: "Bei Vorregistrierung eines aktiven Mitglieds erfolgt die automatische Umstellung bei Erschöpfung oder Ablauf."
        },
        "시작일 옵션(TBD/직접지정/즉시출석)에 따라 종료일이 산정됩니다. 어떤 경우든 기존 횟수는 보존되지 않습니다.": {
            ru: "Дата окончания рассчитывается по опции старта (TBD/прямое/немедленное). Текущие кредиты не сохраняются.",
            zh: "根据开始日选项（待定/直接指定/立即出勤）计算结束日。任何情况下现有次数都不保留。",
            ja: "開始日オプション（TBD/直接指定/即時出席）に応じて終了日が算定されます。いずれの場合も既存回数は保持されません。",
            es: "La fecha de fin se calcula según la opción de inicio. Los créditos existentes no se conservan.",
            pt: "A data final é calculada conforme a opção de início. Créditos existentes não são preservados.",
            fr: "La date de fin est calculée selon l'option de début. Les crédits existants ne sont pas conservés.",
            de: "Das Enddatum wird je nach Startoption berechnet. Bestehendes Guthaben wird nicht beibehalten."
        },
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
        if (!langMatch) { console.log(`  ❌ ${lang}: block not found`); continue; }
        let braceCount = 0, closingBracePos = -1;
        for (let i = langMatch.index; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') { braceCount--; if (braceCount === 0) { closingBracePos = i; break; } }
        }
        if (closingBracePos === -1) continue;

        let entries = '\n        // ═══ Korean-key translations (batch 5 - descriptions) ═══\n';
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

console.log('\n🌍 Batch 5: Korean-key descriptions + long texts...\n');
applyBatch();
console.log('\n  Done!\n');
