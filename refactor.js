const fs = require('fs');
const path = 'c:/Users/boksoon/.gemini/antigravity/scratch/yoga-app/src/pages/MeditationPage.jsx';
const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');

const importIndex = lines.findIndex(l => l.includes("import { PreparationView }"));
console.log("Found PreparationView at line: " + importIndex);

const newImports = `import { PreparationView } from '../components/meditation/views/PreparationView';
import { InitialPrepView } from '../components/meditation/views/InitialPrepView';
import { IntentionView } from '../components/meditation/views/IntentionView';
import { DiagnosisChatView } from '../components/meditation/views/DiagnosisChatView';
import { WeatherView, DiagnosisManualView } from '../components/meditation/views/WeatherView';
import { PrescriptionWizardView } from '../components/meditation/views/PrescriptionWizardView';
import { ActiveSessionView } from '../components/meditation/views/ActiveSessionView';`;

if(importIndex !== -1) {
    lines[importIndex] = newImports;
}

const renderStartIndex = lines.findIndex(l => l.includes("// 0. Initial Preparation Step"));
const renderEndIndex = lines.findIndex((l, i) => i > renderStartIndex && l.trim().startsWith("export default MeditationPage"));

console.log("Render blocks:", renderStartIndex, renderEndIndex);

if (renderStartIndex !== -1 && renderEndIndex !== -1) {
    const renderContent = `
    const viewProps = {
        config, visualTheme, isDebugMode, ttsState, step, setStep, audioVolumes, aiMessage, aiLatency,
        isOptionsLoading, selectedCategory, setSelectedCategory, dynamicCategories, dynamicIntentions,
        setSelectedIntention, fetchAIQuestion, stopAllAudio, onClose, navigate, lastSpokenMessage,
        currentAIChat, handleDebugToggle, setPrepSelections, ttcEnabled, isAILoading, setIsAILoading,
        chatHistory, setChatHistory, manualInput, setManualInput, isAnalyzing, finishAnalysis,
        handleChatResponse, handleManualSubmit, chatEndRef,
        setSelectedDiagnosis, setActiveMode, setTimeLeft, setInteractionType,
        DIAGNOSIS_OPTIONS, SELECTED_DIAGNOSIS_FALLBACK, MEDITATION_MODES, WEATHER_OPTIONS,
        handleWeatherSelect, handleDiagnosisSelect,
        prescriptionReason, INTERACTION_TYPES, activeMode,
        selectedDiagnosis, weatherContext, PREP_DIAGNOSIS_FALLBACK, fetchAIPrescription, setPrepStep,
        selectedAmbient, setSelectedAmbient, AMBIENT_SOUNDS, interactionType, startFromPrescription, handleReturnToChat,
        prepStep, prepSelections, startSession, feedbackData, formatTime, stopAllAudio, setAiMessage,
        isPlaying, micVolume, permissionError, completeSession, togglePlay, showVolumePanel,
        setShowVolumePanel, soundEnabled, setSoundEnabled, setAudioVolumes, currentAudioRef,
        updateAmbientVolume, updateBinauralVolume, videoRef, canvasRef, showVolumeHint
    };

    switch (step) {
        case 'initial_prep': return <InitialPrepView {...viewProps} />;
        case 'intention': return <IntentionView {...viewProps} />;
        case 'diagnosis': return <DiagnosisChatView {...viewProps} />;
        case 'diagnosis_manual': return <DiagnosisManualView {...viewProps} />;
        case 'weather': return <WeatherView {...viewProps} />;
        case 'prescription_summary':
        case 'interaction_select':
        case 'prescription': return <PrescriptionWizardView {...viewProps} />;
        case 'preparation': return <PreparationView {...viewProps} modeName={activeMode?.name || 'AI 맞춤 명상'} />;
        case 'feedback': return <FeedbackView {...viewProps} modeName={activeMode?.name || 'AI 맞춤 명상'} points={feedbackData?.feedbackPoints || []} />;
        default: return <ActiveSessionView {...viewProps} />;
    }
};
`;
    lines.splice(renderStartIndex, renderEndIndex - renderStartIndex, renderContent);
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Successfully refactored MeditationPage.jsx');
} else {
    console.error('Could not find render boundaries');
}
