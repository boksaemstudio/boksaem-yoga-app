#!/usr/bin/env node
/**
 * gen-euro-translations.cjs
 * 
 * ru/zh에는 있지만 es/pt/fr/de에 없는 영어스타일 키의 네이티브 번역을 생성합니다.
 * en 섹션의 영어 번역을 기준으로 각 유럽 언어에 맞는 번역을 생성합니다.
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_PATH = path.resolve(__dirname, '..', 'src', 'utils', 'translations.js');

// Parse translations to get existing key-value pairs per language
function parseTranslationsFile() {
    const content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const languages = {};
    const langPositions = [];
    const langRegex = /^    (\w+): \{/gm;
    let match;
    while ((match = langRegex.exec(content)) !== null) {
        langPositions.push({ lang: match[1], start: match.index });
    }
    for (let i = 0; i < langPositions.length; i++) {
        const lang = langPositions[i].lang;
        const startIdx = langPositions[i].start;
        let braceCount = 0, inBlock = false, blockContent = '';
        for (let j = startIdx; j < content.length; j++) {
            if (content[j] === '{') { braceCount++; inBlock = true; }
            if (content[j] === '}') { braceCount--; }
            if (inBlock) blockContent += content[j];
            if (inBlock && braceCount === 0) break;
        }
        const kvPairs = {};
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

// Core member-app and admin keys that need translations in all languages
function getEnglishKeyTranslations() {
    return {
        // ═══ Login / Auth ═══
        loginTitle: { es: "Un momento de calma para encontrarme", pt: "Um momento de calma para me encontrar", fr: "Un moment de calme pour me retrouver", de: "Ein ruhiger Moment, um mich selbst zu finden" },
        loginWelcome: { es: "Bienvenido a nuestro espacio digital.", pt: "Bem-vindo ao nosso espaço digital.", fr: "Bienvenue dans notre espace numérique.", de: "Willkommen in unserem digitalen Raum." },
        loginSub: { es: "Comprueba tu dedicación sincera en la esterilla.", pt: "Confira sua dedicação sincera no tapete.", fr: "Vérifiez votre dévouement sincère sur le tapis.", de: "Prüfe deine aufrichtige Hingabe auf der Matte." },
        nameLabel: { es: "Nombre", pt: "Nome", fr: "Nom", de: "Name" },
        namePlaceholder: { es: "Introduzca su nombre", pt: "Insira seu nome", fr: "Entrez votre nom", de: "Bitte Namen eingeben" },
        phoneLabel: { es: "Últimos 4 dígitos del teléfono", pt: "Últimos 4 dígitos do telefone", fr: "4 derniers chiffres du téléphone", de: "Letzte 4 Ziffern der Telefonnummer" },
        phonePlaceholder: { es: "Introduzca 4 dígitos", pt: "Insira 4 dígitos", fr: "Entrez 4 chiffres", de: "4 Ziffern eingeben" },
        checkRecordBtn: { es: "Ver mis registros", pt: "Ver meus registros", fr: "Voir mes enregistrements", de: "Meine Aufzeichnungen ansehen" },
        loginFooter: { es: "Cuantos más datos, más profundo será el análisis de IA de tu práctica.", pt: "Quanto mais dados, mais profunda será a análise de IA da sua prática.", fr: "Plus vous pratiquez, plus l'IA analyse en profondeur votre pratique.", de: "Je mehr Daten, desto tiefer analysiert die KI Ihre Praxis." },
        logout: { es: "Cerrar sesión", pt: "Sair", fr: "Déconnexion", de: "Abmelden" },
        language: { es: "Idioma", pt: "Idioma", fr: "Langue", de: "Sprache" },
        logoutConfirm: { es: "¿Desea cerrar sesión?", pt: "Deseja sair?", fr: "Voulez-vous vous déconnecter ?", de: "Möchten Sie sich abmelden?" },
        
        // ═══ Tabs ═══
        tabHome: { es: "Inicio", pt: "Início", fr: "Accueil", de: "Start" },
        tabHistory: { es: "Historial", pt: "Histórico", fr: "Historique", de: "Verlauf" },
        tabSchedule: { es: "Horario", pt: "Horário", fr: "Horaire", de: "Zeitplan" },
        tabPrices: { es: "Precios", pt: "Preços", fr: "Tarifs", de: "Preise" },
        tabNotices: { es: "Avisos", pt: "Avisos", fr: "Avis", de: "Mitteilungen" },
        tabMessages: { es: "Mensajes", pt: "Mensagens", fr: "Messages", de: "Nachrichten" },
        
        // ═══ Home ═══
        currentMembership: { es: "Membresía actual", pt: "Assinatura atual", fr: "Abonnement actuel", de: "Aktuelle Mitgliedschaft" },
        remainingCredits: { es: "Créditos restantes", pt: "Créditos restantes", fr: "Crédits restants", de: "Restguthaben" },
        expiryDate: { es: "Fecha de vencimiento", pt: "Data de validade", fr: "Date d'expiration", de: "Ablaufdatum" },
        daysLeft: { es: "Días restantes", pt: "Dias restantes", fr: "Jours restants", de: "Verbleibende Tage" },
        expired: { es: "Expirado", pt: "Expirado", fr: "Expiré", de: "Abgelaufen" },
        unlimited: { es: "Ilimitado", pt: "Ilimitado", fr: "Illimité", de: "Unbegrenzt" },
        recentAttendance: { es: "Reciente", pt: "Recente", fr: "Récent", de: "Kürzlich" },
        viewAll: { es: "Ver todo", pt: "Ver tudo", fr: "Tout voir", de: "Alle anzeigen" },
        times: { es: "veces", pt: "vezes", fr: "fois", de: "Mal" },
        consecutiveDays: { es: "{n} días consecutivos", pt: "{n} dias consecutivos", fr: "{n} jours consécutifs", de: "{n} Tage in Folge" },
        notificationSetting: { es: "Notificaciones", pt: "Notificações", fr: "Notifications", de: "Benachrichtigungen" },
        installApp: { es: "Agregar app a la pantalla", pt: "Adicionar app à tela inicial", fr: "Ajouter l'app à l'écran d'accueil", de: "App zum Startbildschirm hinzufügen" },
        loading: { es: "Cargando...", pt: "Carregando...", fr: "Chargement...", de: "Laden..." },
        
        // ═══ History ═══
        myAnalysis: { es: "Mi análisis", pt: "Minha análise", fr: "Mon analyse", de: "Meine Analyse" },
        historyTitle: { es: "Registros", pt: "Registros", fr: "Historique", de: "Verlauf" },
        totalSessions: { es: "Total {n}", pt: "Total {n}", fr: "Total {n}", de: "Gesamt {n}" },
        scheduleTitle: { es: "Horario", pt: "Horário", fr: "Horaire", de: "Zeitplan" },
        viewCalendar: { es: "Calendario", pt: "Calendário", fr: "Calendrier", de: "Kalender" },
        viewWeekly: { es: "Semanal", pt: "Semanal", fr: "Hebdomadaire", de: "Wöchentlich" },
        noticesTitle: { es: "Avisos", pt: "Avisos", fr: "Avis", de: "Mitteilungen" },
        noNotices: { es: "No hay avisos nuevos.", pt: "Sem novos avisos.", fr: "Pas de nouveaux avis.", de: "Keine neuen Mitteilungen." },
        messagesTitle: { es: "Mensajes", pt: "Mensagens", fr: "Messages", de: "Nachrichten" },
        noMessages: { es: "No hay mensajes recibidos.", pt: "Sem mensagens recebidas.", fr: "Aucun message reçu.", de: "Keine Nachrichten erhalten." },
        errorMemberNotFound: { es: "Miembro no encontrado.", pt: "Membro não encontrado.", fr: "Membre introuvable.", de: "Mitglied nicht gefunden." },
        inputError: { es: "Ingrese nombre y 4 dígitos.", pt: "Insira nome e 4 dígitos.", fr: "Entrez le nom et 4 chiffres.", de: "Bitte Name und 4 Ziffern eingeben." },
        loginFailed: { es: "Error de inicio de sesión.", pt: "Falha no login.", fr: "Échec de la connexion.", de: "Anmeldung fehlgeschlagen." },
        unknownError: { es: "Error desconocido", pt: "Erro desconhecido", fr: "Erreur inconnue", de: "Unbekannter Fehler" },
        
        // ═══ Push Notifications ═══
        pushEnabled: { es: "Notificaciones activadas.", pt: "Notificações ativadas.", fr: "Notifications activées.", de: "Benachrichtigungen aktiviert." },
        pushBlocked: { es: "Notificaciones bloqueadas. Permítalo en la configuración.", pt: "Notificações bloqueadas. Permita nas configurações.", fr: "Notifications bloquées. Autorisez dans les paramètres.", de: "Benachrichtigungen blockiert. Bitte in den Einstellungen erlauben." },
        pushDisabledConfirm: { es: "¿Dejar de recibir notificaciones?", pt: "Parar de receber notificações?", fr: "Arrêter de recevoir des notifications ?", de: "Keine Benachrichtigungen mehr erhalten?" },
        pushDisabled: { es: "Notificaciones desactivadas.", pt: "Notificações desativadas.", fr: "Notifications désactivées.", de: "Benachrichtigungen deaktiviert." },
        
        // ═══ Member Status ═══
        myPassStatus: { es: "Estado de membresía", pt: "Status da assinatura", fr: "Statut de l'abonnement", de: "Mitgliedschaftsstatus" },
        statusPending: { es: "Pendiente (Pre-registro)", pt: "Pendente (Pré-registro)", fr: "En attente (Pré-inscription)", de: "Ausstehend (Vorregistrierung)" },
        statusActive: { es: "Activo", pt: "Ativo", fr: "Actif", de: "Aktiv" },
        statusExpired: { es: "Expirado", pt: "Expirado", fr: "Expiré", de: "Abgelaufen" },
        statusNone: { es: "Ninguno", pt: "Nenhum", fr: "Aucun", de: "Keine" },
        startDate: { es: "Inicio", pt: "Início", fr: "Début", de: "Beginn" },
        endDate: { es: "Fin", pt: "Fim", fr: "Fin", de: "Ende" },
        remainCount: { es: "Restante", pt: "Restante", fr: "Restant", de: "Verbleibend" },
        paymentHistory: { es: "Historial de pagos", pt: "Histórico de pagamentos", fr: "Historique des paiements", de: "Zahlungsverlauf" },
        noPaymentHistory: { es: "Sin historial de pagos.", pt: "Sem histórico de pagamentos.", fr: "Pas d'historique de paiements.", de: "Kein Zahlungsverlauf." },
        currentlyUsing: { es: "Activo actualmente", pt: "Em uso atualmente", fr: "Actuellement actif", de: "Derzeit aktiv" },
        preRegistered: { es: "Pre-registrado", pt: "Pré-registrado", fr: "Pré-inscrit", de: "Vorregistriert" },
        sessionOrder: { es: "Sesión {n}", pt: "Sessão {n}", fr: "Séance {n}", de: "Sitzung {n}" },
        
        // ═══ Classes ═══
        class_hatha: { es: "Hatha", pt: "Hatha", fr: "Hatha", de: "Hatha" },
        class_ashtanga: { es: "Ashtanga", pt: "Ashtanga", fr: "Ashtanga", de: "Ashtanga" },
        class_mysore: { es: "Mysore", pt: "Mysore", fr: "Mysore", de: "Mysore" },
        class_vinyasa: { es: "Vinyasa", pt: "Vinyasa", fr: "Vinyasa", de: "Vinyasa" },
        class_healing: { es: "Healing", pt: "Healing", fr: "Healing", de: "Healing" },
        class_yin: { es: "Yin Yoga", pt: "Yin Yoga", fr: "Yin Yoga", de: "Yin Yoga" },
        class_inyang: { es: "Yin Yang", pt: "Yin Yang", fr: "Yin Yang", de: "Yin Yang" },
        class_flying: { es: "Aéreo", pt: "Aéreo", fr: "Aérien", de: "Aerial" },
        class_lowflying: { es: "Aéreo bajo", pt: "Aéreo baixo", fr: "Aérien bas", de: "Low Aerial" },
        class_kids: { es: "Yoga infantil", pt: "Yoga infantil", fr: "Yoga enfants", de: "Kinder-Yoga" },
        class_pregnancy: { es: "Prenatal", pt: "Pré-natal", fr: "Prénatal", de: "Schwangerschafts-Yoga" },
        class_hatha_intensive: { es: "Hatha Intensivo", pt: "Hatha Intensivo", fr: "Hatha Intensif", de: "Hatha Intensiv" },
        class_intensive: { es: "Intensivo", pt: "Intensivo", fr: "Intensif", de: "Intensiv" },
        class_regular: { es: "General", pt: "Geral", fr: "Général", de: "Allgemein" },
        class_general: { es: "General", pt: "Geral", fr: "Général", de: "Allgemein" },
        class_advanced: { es: "Avanzado", pt: "Avançado", fr: "Avancé", de: "Fortgeschritten" },
        class_saturday_hatha: { es: "Hatha sábado", pt: "Hatha sábado", fr: "Hatha samedi", de: "Samstag-Hatha" },
        class_kids_flying: { es: "Aéreo infantil", pt: "Aéreo infantil", fr: "Aérien enfants", de: "Kinder-Aerial" },
        class_prenatal: { es: "Yoga prenatal", pt: "Yoga pré-natal", fr: "Yoga prénatal", de: "Schwangerschafts-Yoga" },
        class_TTC: { es: "TTC (Formación de instructores)", pt: "TTC (Formação de instrutores)", fr: "TTC (Formation d'instructeurs)", de: "TTC (Lehrerausbildung)" },
        
        // ═══ Weather ═══
        weather_clear: { es: "Despejado", pt: "Limpo", fr: "Dégagé", de: "Klar" },
        weather_partly_cloudy: { es: "Parcialmente nublado", pt: "Parcialmente nublado", fr: "Partiellement nuageux", de: "Teilweise bewölkt" },
        weather_cloudy: { es: "Nublado", pt: "Nublado", fr: "Nuageux", de: "Bewölkt" },
        weather_fog: { es: "Niebla", pt: "Nevoeiro", fr: "Brouillard", de: "Nebel" },
        weather_rain: { es: "Lluvia", pt: "Chuva", fr: "Pluie", de: "Regen" },
        weather_snow: { es: "Nieve", pt: "Neve", fr: "Neige", de: "Schnee" },
        weather_thunderstorm: { es: "Tormenta", pt: "Tempestade", fr: "Orage", de: "Gewitter" },
        weather_calm: { es: "Tranquilo", pt: "Calmo", fr: "Calme", de: "Ruhig" },
        
        // ═══ Calendar ═══
        date_header: { es: "{month}/{year}", pt: "{month}/{year}", fr: "{month}/{year}", de: "{month}/{year}" },
        legend_regular: { es: "General", pt: "Geral", fr: "Général", de: "Allgemein" },
        legend_pregnancy: { es: "Prenatal", pt: "Pré-natal", fr: "Prénatal", de: "Schwangerschaft" },
        legend_intensive: { es: "Intensivo/Niños", pt: "Intensivo/Crianças", fr: "Intensif/Enfants", de: "Intensiv/Kinder" },
        legend_saturday: { es: "Sábado/Especial", pt: "Sábado/Especial", fr: "Samedi/Spécial", de: "Samstag/Spezial" },
        legend_my_practice: { es: "Mi práctica", pt: "Minha prática", fr: "Ma pratique", de: "Meine Praxis" },
        stats_title: { es: "Mis estadísticas (Total)", pt: "Minhas estatísticas (Total)", fr: "Mes statistiques (Total)", de: "Meine Statistiken (Gesamt)" },
        stats_empty: { es: "Sin historial de clases.", pt: "Sem histórico de aulas.", fr: "Aucun historique de cours.", de: "Kein Kursverlauf." },
        auto_practice: { es: "Práctica libre", pt: "Prática livre", fr: "Pratique libre", de: "Freie Übung" },
        
        // ═══ Holidays ═══
        holiday_new_year: { es: "Año Nuevo", pt: "Ano Novo", fr: "Nouvel An", de: "Neujahr" },
        holiday_lunar_new_year: { es: "Año Nuevo Lunar", pt: "Ano Novo Lunar", fr: "Nouvel An lunaire", de: "Mondneujahr" },
        holiday_samiljeol: { es: "Día del Movimiento de Independencia", pt: "Dia do Movimento de Independência", fr: "Jour du Mouvement pour l'Indépendance", de: "Tag der Unabhängigkeitsbewegung" },
        holiday_arbor_day: { es: "Día del Árbol", pt: "Dia da Árvore", fr: "Fête des arbres", de: "Tag des Baumes" },
        holiday_childrens_day: { es: "Día del Niño", pt: "Dia das Crianças", fr: "Journée des enfants", de: "Kindertag" },
        holiday_buddha: { es: "Cumpleaños de Buda", pt: "Aniversário de Buda", fr: "Anniversaire de Bouddha", de: "Buddhas Geburtstag" },
        holiday_memorial: { es: "Día Conmemorativo", pt: "Dia Memorial", fr: "Jour du souvenir", de: "Gedenktag" },
        holiday_liberation: { es: "Día de la Liberación", pt: "Dia da Libertação", fr: "Jour de la Libération", de: "Befreiungstag" },
        holiday_chuseok: { es: "Chuseok", pt: "Chuseok", fr: "Chuseok", de: "Chuseok" },
        holiday_foundation: { es: "Día de la Fundación", pt: "Dia da Fundação", fr: "Jour de la Fondation", de: "Gründungstag" },
        holiday_hangul: { es: "Día del Hangul", pt: "Dia do Hangul", fr: "Jour du Hangul", de: "Hangul-Tag" },
        holiday_christmas: { es: "Navidad", pt: "Natal", fr: "Noël", de: "Weihnachten" },
        
        // ═══ Additional Member App ═══
        selfPractice: { es: "Práctica libre", pt: "Prática livre", fr: "Pratique libre", de: "Freie Übung" },
        ticket: { es: "Abono", pt: "Assinatura", fr: "Abonnement", de: "Abo" },
        noTimetableImage: { es: "No se ha registrado imagen de horario.", pt: "Imagem de horário não registrada.", fr: "Image d'horaire non enregistrée.", de: "Kein Stundenplanbild registriert." },
        noNewNotices: { es: "No hay avisos nuevos.", pt: "Sem novos avisos.", fr: "Pas de nouveaux avis.", de: "Keine neuen Mitteilungen." },
        loadMoreAttendance: { es: "Ver más historial", pt: "Ver mais histórico", fr: "Voir plus d'historique", de: "Mehr Verlauf anzeigen" },
        noAttendanceHistory: { es: "Sin historial de asistencia.", pt: "Sem histórico de frequência.", fr: "Aucun historique de présence.", de: "Kein Anwesenheitsverlauf." },
        loadMoreMessages: { es: "Cargar más mensajes", pt: "Carregar mais mensagens", fr: "Charger plus de messages", de: "Mehr Nachrichten laden" },
        loadingPayment: { es: "Cargando historial de pagos...", pt: "Carregando histórico de pagamentos...", fr: "Chargement de l'historique des paiements...", de: "Zahlungsverlauf wird geladen..." },
        
        // ═══ Insights ═══
        insight_dawn_type: { es: "Yogui del Amanecer", pt: "Yogui da Madrugada", fr: "Yogi de l'Aube", de: "Morgendämmerungs-Yogi" },
        insight_morning_type: { es: "Practicante Matutino", pt: "Praticante Matutino", fr: "Praticien du Matin", de: "Morgenübender" },
        insight_afternoon_type: { es: "Meditador Vespertino", pt: "Meditador Vespertino", fr: "Méditant de l'Après-midi", de: "Nachmittags-Meditierer" },
        insight_evening_type: { es: "Purificador Nocturno", pt: "Purificador Noturno", fr: "Purificateur du Soir", de: "Abend-Purifizierer" },
        
        // ═══ Admin Header ═══
        management: { es: "Gestión", pt: "Gestão", fr: "Gestion", de: "Verwaltung" },
        addToHomeScreen: { es: "Agregar a pantalla de inicio", pt: "Adicionar à tela inicial", fr: "Ajouter à l'écran d'accueil", de: "Zum Startbildschirm hinzufügen" },
        addToHomeShort: { es: "Agregar", pt: "Adicionar", fr: "Ajouter", de: "Hinzufügen" },
        collapseAll: { es: "Contraer todo", pt: "Recolher tudo", fr: "Tout réduire", de: "Alle einklappen" },
        expandAll: { es: "Expandir todo", pt: "Expandir tudo", fr: "Tout développer", de: "Alle ausklappen" },
        collapseAllCards: { es: "Contraer todas las tarjetas", pt: "Recolher todos os cartões", fr: "Réduire toutes les cartes", de: "Alle Karten einklappen" },
        expandAllCards: { es: "Expandir todas las tarjetas", pt: "Expandir todos os cartões", fr: "Développer toutes les cartes", de: "Alle Karten ausklappen" },
        aiAnalysisShort: { es: "Análisis IA", pt: "Análise IA", fr: "Analyse IA", de: "KI-Analyse" },
        notificationsOn: { es: "Notificaciones ON", pt: "Notificações ON", fr: "Notifications ON", de: "Benachrichtigungen AN" },
        notificationsOff: { es: "Notificaciones OFF", pt: "Notificações OFF", fr: "Notifications OFF", de: "Benachrichtigungen AUS" },
        allBranches: { es: "Todas las sedes", pt: "Todas as filiais", fr: "Toutes les succursales", de: "Alle Filialen" },
        
        // ═══ Admin Nav ═══
        navAttendance: { es: "Asistencia", pt: "Frequência", fr: "Présence", de: "Anwesenheit" },
        navMembers: { es: "Miembros", pt: "Membros", fr: "Membres", de: "Mitglieder" },
        navRevenue: { es: "Ingresos", pt: "Receita", fr: "Revenus", de: "Umsatz" },
        navSchedule: { es: "Horario", pt: "Horário", fr: "Horaire", de: "Zeitplan" },
        navBookings: { es: "Reservas", pt: "Reservas", fr: "Réservations", de: "Buchungen" },
        navNotices: { es: "Avisos", pt: "Avisos", fr: "Avis", de: "Mitteilungen" },
        navAlertHistory: { es: "Historial de alertas", pt: "Histórico de alertas", fr: "Historique des alertes", de: "Benachrichtigungsverlauf" },
        navKiosk: { es: "Kiosco", pt: "Quiosque", fr: "Kiosque", de: "Kiosk" },
        navPricing: { es: "Precios", pt: "Preços", fr: "Tarifs", de: "Preise" },
        navData: { es: "Datos", pt: "Dados", fr: "Données", de: "Daten" },
        navTrash: { es: "Papelera", pt: "Lixeira", fr: "Corbeille", de: "Papierkorb" },
        navAIAssistant: { es: "Asistente IA", pt: "Assistente IA", fr: "Assistant IA", de: "KI-Assistent" },
        navGuide: { es: "Guía", pt: "Guia", fr: "Guide", de: "Anleitung" },
        navSettings: { es: "Configuración", pt: "Configurações", fr: "Paramètres", de: "Einstellungen" },
        
        // ═══ Common UI ═══
        collapse: { es: "Cerrar", pt: "Fechar", fr: "Fermer", de: "Einklappen" },
        expand: { es: "Abrir", pt: "Abrir", fr: "Ouvrir", de: "Ausklappen" },
        settingUp: { es: "Configurando", pt: "Configurando", fr: "Configuration", de: "Einrichten" },
        noAttendanceRecords: { es: "Sin registros de asistencia.", pt: "Sem registros de frequência.", fr: "Aucun enregistrement de présence.", de: "Keine Anwesenheitseinträge." },
        todayActivityLog: { es: "Registro de actividad de hoy", pt: "Registro de atividade de hoje", fr: "Journal d'activité du jour", de: "Heutiges Aktivitätsprotokoll" },
        activityLog: { es: "Registro de actividad", pt: "Registro de atividade", fr: "Journal d'activité", de: "Aktivitätsprotokoll" },
        attendance: { es: "Asistencia", pt: "Frequência", fr: "Présence", de: "Anwesenheit" },
        
        // ═══ Kiosk ═══
        kioskChecking: { es: "Verificando asistencia...", pt: "Verificando frequência...", fr: "Vérification de présence...", de: "Anwesenheit wird überprüft..." },
        kioskMemberNotFound: { es: "Miembro no encontrado.", pt: "Membro não encontrado.", fr: "Membre introuvable.", de: "Mitglied nicht gefunden." },
        kioskSystemError: { es: "Error del sistema. Por favor, inténtelo de nuevo.", pt: "Erro do sistema. Tente novamente.", fr: "Erreur système. Veuillez réessayer.", de: "Systemfehler. Bitte versuchen Sie es erneut." },
        kioskExpiredDenied: { es: "Membresía expirada.", pt: "Assinatura expirada.", fr: "Abonnement expiré.", de: "Mitgliedschaft abgelaufen." },
        kioskSuccessStart: { es: "¡Comienza la práctica de hoy!", pt: "A prática de hoje começa!", fr: "La pratique du jour commence !", de: "Die heutige Praxis beginnt!" },
        kioskPrivacy: { es: "Política de privacidad", pt: "Política de privacidade", fr: "Politique de confidentialité", de: "Datenschutzrichtlinie" },
        kioskSleepTitle: { es: "Horario de atención finalizado", pt: "Horário de atendimento encerrado", fr: "Heures d'ouverture terminées", de: "Betriebszeit beendet" },
        kioskSleepSub: { es: "Nos vemos mañana", pt: "Nos vemos amanhã", fr: "À demain", de: "Bis morgen" },
        kioskFaceConfirmQ: { es: "¿Registrar asistencia?", pt: "Registrar frequência?", fr: "Enregistrer la présence ?", de: "Anwesenheit registrieren?" },
        kioskFaceNo: { es: "No", pt: "Não", fr: "Non", de: "Nein" },
        kioskFaceYes: { es: "Sí, soy yo", pt: "Sim, sou eu", fr: "Oui, c'est moi", de: "Ja, das bin ich" },
        accessDeniedTitle: { es: "🔒 Acceso Denegado", pt: "🔒 Acesso Negado", fr: "🔒 Accès Refusé", de: "🔒 Zugriff Verweigert" },
        accessDeniedDesc: { es: "No tiene permisos de administrador.", pt: "Sem permissões de administrador.", fr: "Pas d'autorisation d'administrateur.", de: "Keine Administratorberechtigung." },
        logoutBtn: { es: "Cerrar sesión", pt: "Sair", fr: "Déconnexion", de: "Abmelden" },
        adminLoginBtn: { es: "Inicio de sesión admin", pt: "Login de administrador", fr: "Connexion administrateur", de: "Admin-Login" },
        goHome: { es: "Ir al inicio", pt: "Ir para início", fr: "Aller à l'accueil", de: "Zur Startseite" },
        
        // ═══ Admin Login ═══
        emailLabel: { es: "Correo electrónico", pt: "E-mail", fr: "E-mail", de: "E-Mail" },
        passwordLabel: { es: "Contraseña", pt: "Senha", fr: "Mot de passe", de: "Passwort" },
        authenticating: { es: "Autenticando...", pt: "Autenticando...", fr: "Authentification...", de: "Authentifizierung..." },
        loginBtn: { es: "Iniciar sesión", pt: "Entrar", fr: "Se connecter", de: "Anmelden" },
        loginError: { es: "Error de inicio de sesión.", pt: "Erro de login.", fr: "Erreur de connexion.", de: "Anmeldefehler." },
    };
}

// ─── Apply ───

function applyEuroTranslations() {
    let content = fs.readFileSync(TRANSLATIONS_PATH, 'utf-8');
    const translations = getEnglishKeyTranslations();
    const existingTranslations = parseTranslationsFile();
    const targetLangs = ['es', 'pt', 'fr', 'de'];
    
    for (const lang of targetLangs) {
        const toAdd = [];
        for (const [key, langValues] of Object.entries(translations)) {
            if (!langValues[lang]) continue;
            // Skip if already exists
            if (existingTranslations[lang] && existingTranslations[lang][key]) continue;
            toAdd.push({ key, value: langValues[lang] });
        }
        
        if (toAdd.length === 0) {
            console.log(`  ⏭️  ${lang}: No new keys to add`);
            continue;
        }
        
        // Find closing brace of language block
        const langBlockRegex = new RegExp(`^(\\s{4}${lang}:\\s*\\{)`, 'm');
        const langMatch = content.match(langBlockRegex);
        if (!langMatch) { console.log(`  ❌ ${lang}: block not found`); continue; }
        const blockStart = langMatch.index;
        let braceCount = 0, closingBracePos = -1;
        for (let i = blockStart; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') { braceCount--; if (braceCount === 0) { closingBracePos = i; break; } }
        }
        if (closingBracePos === -1) { console.log(`  ❌ ${lang}: closing brace not found`); continue; }
        
        let newEntries = '\n        // ═══ Core translations (auto-generated) ═══\n';
        for (const { key, value } of toAdd) {
            const escapedValue = value.replace(/"/g, '\\"');
            newEntries += `        ${key}: "${escapedValue}",\n`;
        }
        
        content = content.slice(0, closingBracePos) + newEntries + content.slice(closingBracePos);
        console.log(`  ✅ ${lang}: Added ${toAdd.length} translations`);
    }
    
    fs.writeFileSync(TRANSLATIONS_PATH, content, 'utf-8');
    console.log('\n  📄 translations.js updated!');
}

console.log('\n🇪🇺 Generating core translations for European languages...\n');
applyEuroTranslations();
console.log('\n  Done!\n');
