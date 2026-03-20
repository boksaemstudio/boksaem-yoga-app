const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/MeditationPage.jsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

console.log(`Original: ${lines.length} lines`);

// Keep lines 0-948 (1-indexed: 1-949) — all imports + hooks + logic
const head = lines.slice(0, 949);

// Replace lines 949-2106 (1-indexed: 950-2107) with switch block
const switchBlock = `
    // ==========================================
    // 🎨 RENDER — View Components
    // ==========================================
    const sharedProps = {
        config, visualTheme, isDebugMode, ttsState, step, setStep, audioVolumes, aiMessage, aiLatency,
        stopAllAudio, onClose, navigate, handleDebugToggle, ttcEnabled, activeMode,
        MEDITATION_MODES, INTERACTION_TYPES, DIAGNOSIS_OPTIONS, AMBIENT_SOUNDS, WEATHER_OPTIONS
    };

    switch (step) {
        case 'initial_prep':
            return <InitialPrepView {...sharedProps} setPrepSelections={setPrepSelections} />;

        case 'intention':
            return <IntentionView {...sharedProps}
                isOptionsLoading={isOptionsLoading} selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory} dynamicCategories={dynamicCategories}
                dynamicIntentions={dynamicIntentions} setSelectedIntention={setSelectedIntention}
                fetchAIQuestion={fetchAIQuestion} lastSpokenMessage={lastSpokenMessage}
                currentAIChat={currentAIChat} />;

        case 'diagnosis':
            return <DiagnosisChatView {...sharedProps}
                isAILoading={isAILoading} setIsAILoading={setIsAILoading} currentAIChat={currentAIChat}
                chatHistory={chatHistory} setChatHistory={setChatHistory} manualInput={manualInput}
                setManualInput={setManualInput} isAnalyzing={isAnalyzing} finishAnalysis={finishAnalysis}
                handleChatResponse={handleChatResponse} handleManualSubmit={handleManualSubmit} chatEndRef={chatEndRef}
                setSelectedDiagnosis={setSelectedDiagnosis} setActiveMode={setActiveMode} setTimeLeft={setTimeLeft}
                setInteractionType={setInteractionType} SELECTED_DIAGNOSIS_FALLBACK={SELECTED_DIAGNOSIS_FALLBACK} />;

        case 'diagnosis_manual':
            return <DiagnosisManualView {...sharedProps} handleDiagnosisSelect={handleDiagnosisSelect} />;

        case 'weather':
            return <WeatherView {...sharedProps} handleWeatherSelect={handleWeatherSelect} />;

        case 'prescription_summary':
        case 'interaction_select':
        case 'prescription':
            return <PrescriptionWizardView {...sharedProps}
                currentAIChat={currentAIChat} prescriptionReason={prescriptionReason}
                setActiveMode={setActiveMode} setTimeLeft={setTimeLeft}
                selectedDiagnosis={selectedDiagnosis} weatherContext={weatherContext}
                setInteractionType={setInteractionType} fetchAIPrescription={fetchAIPrescription}
                setPrepStep={setPrepStep} selectedAmbient={selectedAmbient}
                setSelectedAmbient={setSelectedAmbient} interactionType={interactionType}
                startFromPrescription={startFromPrescription} handleReturnToChat={handleReturnToChat} />;

        case 'preparation':
            return <PreparationView {...sharedProps}
                prepStep={prepStep} setPrepStep={setPrepStep}
                prepSelections={prepSelections} setPrepSelections={setPrepSelections}
                interactionType={interactionType} startSession={startSession} />;

        case 'feedback':
            return <FeedbackView
                activeMode={activeMode} feedbackData={feedbackData} formatTime={formatTime}
                timeLeft={timeLeft} modeName={activeMode?.name || "AI 맞춤 명상"} onClose={onClose}
                visualTheme={visualTheme} isDebugMode={isDebugMode} ttsState={ttsState} step={step}
                audioVolumes={audioVolumes} aiMessage={aiMessage} aiLatency={aiLatency}
                isAILoading={isAILoading} points={feedbackData?.feedbackPoints || []}
                stopAllAudio={stopAllAudio} setAiMessage={setAiMessage} setChatHistory={setChatHistory} />;

        default:
            return <ActiveSessionView {...sharedProps}
                interactionType={interactionType} isPlaying={isPlaying} formatTime={formatTime}
                timeLeft={timeLeft} micVolume={micVolume} permissionError={permissionError}
                completeSession={completeSession} togglePlay={togglePlay}
                showVolumePanel={showVolumePanel} setShowVolumePanel={setShowVolumePanel}
                soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
                setAudioVolumes={setAudioVolumes} currentAudioRef={currentAudioRef}
                updateAmbientVolume={updateAmbientVolume} updateBinauralVolume={updateBinauralVolume}
                videoRef={videoRef} canvasRef={canvasRef} showVolumeHint={showVolumeHint} />;
    }
};`;

// Keep lines 2107+ (1-indexed: 2108+) — export default
const tail = lines.slice(2107);

const result = [...head, switchBlock, ...tail].join('\n');
fs.writeFileSync(filePath, result, 'utf-8');

const newLines = result.split('\n').length;
console.log(`Result: ${newLines} lines (removed ${lines.length - newLines} lines)`);
