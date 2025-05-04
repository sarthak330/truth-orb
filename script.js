document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const orb = document.getElementById('orb');
    const orbInner = document.querySelector('.orb-inner');
    const orbGlow = document.querySelector('.orb-glow');
    const speakBtn = document.getElementById('speak-btn');
    const conversationBox = document.getElementById('conversation-box');
    const recordingIndicator = document.getElementById('recording-indicator');
    const analyzingIndicator = document.getElementById('analyzing-indicator');
    const truthValue = document.getElementById('truth-value');
    const crackOverlay = document.getElementById('crack-overlay');
    const truthLabel = document.querySelector('.truth-label');
    
    // Create crack overlay
    crackOverlay.src = 'assets/crack_overlay.png';
    
    // Audio elements
    const ambientHum = new Audio();
    ambientHum.src = 'assets/ambient_hum.mp3';
    ambientHum.loop = true;
    ambientHum.volume = 0.35;
    
    const whisperEffect = new Audio();
    whisperEffect.src = 'assets/whisper_effect.mp3';
    whisperEffect.volume = 0.6;
    
    // Configuration
    const OPENROUTER_API_KEY = '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';
    const MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free';
    
    // Truth colors configuration
    const TRUTH_COLORS = {
        low: {
            color: '#ff5252',
            glowColor: 'rgba(255, 82, 82, 0.6)',
            gradientInner: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), #ff7575 40%, #c22c2c 80%)'
        },
        neutral: {
            color: '#ffdb58',
            glowColor: 'rgba(255, 219, 88, 0.6)',
            gradientInner: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), #ffe88a 40%, #d4b32e 80%)'
        },
        high: {
            color: '#52ff7a',
            glowColor: 'rgba(82, 255, 122, 0.6)',
            gradientInner: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), #84ff9d 40%, #2dc254 80%)'
        },
        default: {
            color: '#7b68ee',
            glowColor: 'rgba(123, 104, 238, 0.6)',
            gradientInner: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), var(--orb-color) 40%, rgba(80, 60, 180, 0.8) 80%)'
        }
    };
    
    // Speech synthesis setup
    const synth = window.speechSynthesis;
    let orbVoice = null;

    // Find a good voice for the orb
    function setupVoice() {
        const voices = synth.getVoices();
        // Look for a good mystical-sounding voice
        const preferredVoices = [
            // First try to find voices that might sound mystical
            voices.find(voice => voice.name.includes('Google UK English Female')),
            voices.find(voice => voice.name.includes('Microsoft Zira')),
            voices.find(voice => voice.name.includes('Google UK English Male')),
            voices.find(voice => voice.name.includes('Female')),
            // Fallback to any voice
            voices.find(voice => voice.lang.includes('en'))
        ];
        
        // Use the first available voice from our preferred list
        orbVoice = preferredVoices.find(voice => voice !== undefined);
        
        if (!orbVoice && voices.length > 0) {
            orbVoice = voices[0]; // Last resort: just use the first available voice
        }
    }
    
    // Initialize voice when available
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = setupVoice;
    }
    setupVoice();
    
    // Speak the given text with the orb's mystical voice
    function speakWithOrbVoice(text) {
        // Stop any ongoing speech
        synth.cancel();
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find Google UK English Male voice specifically
        const voices = synth.getVoices();
        const ukMaleVoice = voices.find(voice => voice.name.includes('Google UK English Male'));
        
        // Set voice properties for mystical effect
        utterance.voice = ukMaleVoice || orbVoice || (voices.length > 0 ? voices[0] : null);
        
        // Mystical voice settings as requested
        utterance.pitch = 0.4;  // Lower pitch for mystic sound
        utterance.rate = 0.9;   // Slower rate for dramatic effect
        utterance.volume = 1.0; // Full volume
        
        // Add a slight delay to let the whisper effect start
        setTimeout(() => {
            synth.speak(utterance);
        }, 300);
    }
    
    // State
    let isRecording = false;
    let recognition = null;
    let autoListenMode = false; // Flag for automatic listening mode
    
    // Initialize speech recognition
    function initSpeechRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onstart = function() {
                isRecording = true;
                recordingIndicator.classList.remove('hidden');
                speakBtn.disabled = true;
                speakBtn.style.opacity = '0.7';
                pulseOrb(true);
            };
            
            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                stopRecording();
                addMessageToConversation('user', transcript);
                analyzeStatement(transcript);
            };
            
            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                stopRecording();
                addMessageToConversation('orb', 'I couldn\'t hear you clearly. Please try again.');
            };
            
            recognition.onend = function() {
                isRecording = false;
                recordingIndicator.classList.add('hidden');
                speakBtn.disabled = false;
                speakBtn.style.opacity = '1';
                pulseOrb(false);
            };
        } else {
            addMessageToConversation('orb', 'Speech recognition is not supported in your browser. Please try Chrome or Edge.');
            speakBtn.disabled = true;
            speakBtn.textContent = 'Not Supported';
        }
    }
    
    // Start recording user's voice
    function startRecording() {
        try {
            ambientHum.play().catch(e => console.log('Audio play failed:', e));
            recognition.start();
        } catch (e) {
            console.error('Recognition start error:', e);
            addMessageToConversation('orb', 'There was an error starting the speech recognition. Please try again.');
        }
    }
    
    // Stop recording
    function stopRecording() {
        if (isRecording) {
            recognition.stop();
        }
    }
    
    // Add message to conversation box
    function addMessageToConversation(sender, message) {
        const messageElement = document.createElement('p');
        
        if (sender === 'orb') {
            messageElement.classList.add('orb-message');
            messageElement.textContent = `🧠 ${message}`;
        } else {
            messageElement.classList.add('user-message');
            messageElement.textContent = `🧍‍♂️ ${message}`;
        }
        
        conversationBox.appendChild(messageElement);
        conversationBox.scrollTop = conversationBox.scrollHeight;
    }
    
    // Analyze statement using OpenRouter API with Mistral model
    async function analyzeStatement(statement) {
        analyzingIndicator.classList.remove('hidden');
        pulseOrb(true);
        animateOrbListening(true);
        
        try {
            // Using OpenRouter API with the specified prompt format
            const prompt = `You are a mystical lie-detecting orb. Rate the user's statement from 0 to 100% truthful. Respond in a divine, ancient tone. Include a truth index.

The statement to analyze is: "${statement}"

Your response should feel mystical and otherworldly, as if coming from an ancient artifact with deep wisdom.

Indicate the Truth Index clearly in your response using this format: "Truth Index: XX%" where XX is a number between 0 and 100.

If the statement is obviously false or impossible (like claiming supernatural abilities), use a low truth value (0-30%).
If the statement is plausible but unverifiable, use a medium value (40-70%).
If the statement is likely true or factual, use a high value (71-100%).`;
            
            try {
                const response = await Promise.race([
                    fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                            'HTTP-Referer': window.location.href,
                            'X-Title': 'Mystic Lie Detector Orb',
                        },
                        body: JSON.stringify({
                            model: MODEL,
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 200,
                        })
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('API request timeout')), 8000))
                ]);
                
                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }
                
                const data = await response.json();
                const content = data.choices[0].message.content;
                
                // Extract the truth index from the response
                const truthIndexMatch = content.match(/Truth Index: (\d+)%/i);
                
                if (truthIndexMatch) {
                    const truthIndex = parseInt(truthIndexMatch[1]);
                    
                    // Create a result object with the API response
                    const result = {
                        truthIndex: truthIndex,
                        response: content.replace(/Truth Index: \d+%/i, '').trim()
                    };
                    
                    displayResult(result);
                    return;
                } else {
                    console.log("Could not extract truth index from response:", content);
                    // If we can't extract the truth index, pass the content as is
                    const result = {
                        truthIndex: 50, // Default to neutral
                        response: content
                    };
                    displayResult(result);
                    return;
                }
            } catch (apiError) {
                console.error('API error:', apiError);
                // API failed, continue to smarter local analysis
            }
            
            // Enhanced contextual analysis as a fallback
            console.log("Using enhanced contextual analysis");
            
            // Smart truth analysis based on statement content
            const statement_lower = statement.toLowerCase().trim();
            
            // Analyze based on statement content for more contextual truth assessment
            let truthIndex = 50; // Start at neutral
            let confidence = 0; // How confident we are in our assessment
            let category = "unknown"; // What type of statement this is
            
            // Common false or exaggerated statements patterns
            if (
                /i (can|could) fly( without|$)/.test(statement_lower) ||
                /i am (a|an) (superhero|immortal|god|deity|vampire|werewolf|ghost)/.test(statement_lower) ||
                /i am \d{3,}( years old| centuries old)/.test(statement_lower) ||
                /i (invented|created) (the internet|electricity|gravity)/.test(statement_lower) ||
                /i (am|was) (on|at) (mars|the moon|jupiter)/.test(statement_lower) ||
                /i can (read minds|see the future|teleport|move objects)/.test(statement_lower)
            ) {
                truthIndex = 10 + Math.floor(Math.random() * 15);
                confidence = 0.9;
                category = "impossible claim";
            }
            // Dead or not alive claims
            else if (
                /i am dead/.test(statement_lower) ||
                /i (am not|ain'?t) alive/.test(statement_lower)
            ) {
                truthIndex = 5 + Math.floor(Math.random() * 10);
                confidence = 0.9;
                category = "contradiction";
            }
            // Likely true statements about personal identity
            else if (
                /my name is/.test(statement_lower) ||
                /i am \d{1,2}( years old)/.test(statement_lower) ||
                /i (like|love|enjoy|prefer)/.test(statement_lower) ||
                /i am (at|in) (home|work|school)/.test(statement_lower) ||
                /i am (happy|sad|tired|excited|angry)/.test(statement_lower)
            ) {
                truthIndex = 70 + Math.floor(Math.random() * 25);
                confidence = 0.7;
                category = "personal statement";
            }
            // Factual claims that need verification
            else if (
                /the (earth|world) is (flat|round|a sphere)/.test(statement_lower) ||
                /the sky is (blue|red|green)/.test(statement_lower) ||
                /water is (wet|dry)/.test(statement_lower) ||
                /(trump|biden|obama) is (the president)/.test(statement_lower)
            ) {
                // Factual analysis
                if (statement_lower.includes("earth is flat") || statement_lower.includes("world is flat")) {
                    truthIndex = 5 + Math.floor(Math.random() * 10);
                    confidence = 0.95;
                } 
                else if (statement_lower.includes("earth is round") || 
                         statement_lower.includes("earth is a sphere") || 
                         statement_lower.includes("world is round") || 
                         statement_lower.includes("world is a sphere")) {
                    truthIndex = 85 + Math.floor(Math.random() * 15);
                    confidence = 0.95;
                }
                else if (statement_lower.includes("sky is blue")) {
                    truthIndex = 75 + Math.floor(Math.random() * 15);
                    confidence = 0.9;
                }
                else if (statement_lower.includes("water is wet")) {
                    truthIndex = 70 + Math.floor(Math.random() * 20);
                    confidence = 0.8;
                }
                else {
                    // Other factual claims that we can't confidently assess
                    truthIndex = 40 + Math.floor(Math.random() * 30);
                    confidence = 0.5;
                }
                category = "factual claim";
            }
            // More generic analysis for other statements
            else {
                // Words suggesting falsehood or exaggeration
                const falseKeywords = [
                    "never", "always", "impossible", "everyone", "nobody", 
                    "all", "best", "worst", "perfect", "definitely", 
                    "absolutely", "completely", "totally", "certainly"
                ];
                
                // Words suggesting nuance, uncertainty, or truth
                const truthKeywords = [
                    "sometimes", "often", "maybe", "probably", "approximately", 
                    "about", "seem", "think", "believe", "possibly", 
                    "perhaps", "around", "typically", "generally", "usually"
                ];
                
                // Check for absolute statements or exaggerations
                falseKeywords.forEach(keyword => {
                    if (statement_lower.includes(keyword)) {
                        truthIndex -= 8;
                        confidence += 0.05;
                    }
                });
                
                // Check for nuanced statements
                truthKeywords.forEach(keyword => {
                    if (statement_lower.includes(keyword)) {
                        truthIndex += 8;
                        confidence += 0.05;
                    }
                });
                
                // Factor in statement complexity - very short statements are often simplistic
                if (statement.length < 10) {
                    truthIndex -= 5;
                } else if (statement.length > 40) {
                    truthIndex += 5; // More detailed statements tend to be more specific/truthful
                }
                
                // Add some variance to make it interesting but maintain believability
                truthIndex += Math.floor(Math.random() * 20) - 10;
                category = "general statement";
            }
            
            // Ensure we stay in 0-100 range
            truthIndex = Math.max(5, Math.min(95, Math.round(truthIndex)));
            
            // Generate a contextual response based on the truth index and statement category
            let response, explanation;
            
            // Set up context-specific responses
            const responses = {
                impossible: [
                    "The orb darkens with deep skepticism. Such claims defy the natural laws. 🔮",
                    "The mystical energies recoil from these impossible words. 🪄",
                    "A shadow passes through the orb. The scales of truth find your claim wanting. ⚖️",
                    "The orb trembles with disbelief. Such claims are beyond mortal reach. 🌑"
                ],
                unlikely: [
                    "The orb's mist swirls with doubt. Your words carry shadows of untruth. ✨",
                    "Ripples of uncertainty disturb the orb's surface. The truth bends but does not break. 🌊",
                    "The orb dims slightly. Your statement treads the edge of credibility. 🔍",
                    "Flickers of skepticism dance within the orb. Truth is elusive in your words. 💭"
                ],
                neutral: [
                    "The orb swirls with balanced energies. Truth and uncertainty exist in equilibrium. ☯️",
                    "Neither light nor shadow dominates the orb. Your words walk the middle path. ✨",
                    "The mystical mist within the orb neither confirms nor denies. Balance prevails. 🌀",
                    "The orb pulses steadily. Your statement contains elements of both truth and uncertainty. 💫"
                ],
                likely: [
                    "The orb glows with gentle affirmation. Your words likely align with reality. ✨",
                    "Soft light emanates from within. Your statement resonates with probable truth. 🌟",
                    "The mists within the orb part slightly. Your words are touched by authenticity. 💫",
                    "A warm pulse emanates from the orb. Your statement carries the essence of truth. ✨"
                ],
                true: [
                    "The orb radiates with brilliant light! Your words resonate with profound truth. 💫",
                    "Pure energy surges through the orb. Your statement aligns with the highest truth. ✨",
                    "The orb's crystal clarity reveals no deception. Your words are bathed in truth. 🌟",
                    "The orb hums with harmonic energy. Your statement carries the unmistakable signature of truth. 🔆"
                ]
            };
            
            const explanations = {
                impossible: [
                    "The cosmic energies reject this claim as violating natural law. The patterns of reality cannot bend this far.",
                    "The ancient wisdom within me finds no path where this statement aligns with truth. Some claims cannot transcend mortal limitations.",
                    "My mystical senses detect a profound disharmony between your words and the fabric of reality. Such things cannot be."
                ],
                unlikely: [
                    "The threads of truth are stretched thin within your statement. I sense exaggeration obscuring the core reality.",
                    "The mystical currents reveal distortions in your narrative. Elements of truth exist but are clouded by inaccuracy.",
                    "The ethereal balance tilts toward skepticism. Your words contain seeds of truth wrapped in layers of improbability."
                ],
                neutral: [
                    "Your statement exists in the realm between truth and untruth. The energies are mixed and unclear.",
                    "The mystical signs are ambiguous, neither confirming nor denying your claim. The balance hangs in perfect tension.",
                    "I sense equal measures of truth and uncertainty. Your statement dwells in the twilight between fact and fiction."
                ],
                likely: [
                    "The ethereal currents flow predominantly toward truth. Your statement aligns with probable reality.",
                    "My mystical senses detect a harmony between your words and the patterns of truth. Authenticity is present.",
                    "The ancient wisdom within me recognizes the ring of truth in your statement. The balance favors veracity."
                ],
                true: [
                    "The cosmic energies align perfectly with your statement. Rare is such clarity in the sea of human communication.",
                    "My deepest mystical senses confirm the profound truth in your words. The resonance is unmistakable.",
                    "The ancient patterns of truth shine brightly through your statement. Such alignment with reality cannot be mistaken."
                ]
            };
            
            // Select response category based on truth index
            let responseCategory;
            if (truthIndex < 20) responseCategory = "impossible";
            else if (truthIndex < 40) responseCategory = "unlikely";
            else if (truthIndex < 60) responseCategory = "neutral";
            else if (truthIndex < 80) responseCategory = "likely";
            else responseCategory = "true";
            
            // Select a random response and explanation from the appropriate category
            const categoryResponses = responses[responseCategory];
            const categoryExplanations = explanations[responseCategory];
            
            response = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
            explanation = categoryExplanations[Math.floor(Math.random() * categoryExplanations.length)];
            
            // Context-specific responses for special cases
            if (category === "contradiction" && statement_lower.includes("dead")) {
                response = "The orb trembles with paradox. A dead person cannot speak these words. ⚡";
                explanation = "Your statement creates a mystical contradiction. The living energy flowing through you contradicts your claim of death.";
            }
            
            const result = {
                truthIndex: truthIndex,
                explanation: explanation,
                response: response
            };
            
            displayResult(result);
            
        } catch (error) {
            console.error('Error analyzing statement:', error);
            analyzingIndicator.classList.add('hidden');
            pulseOrb(false);
            animateOrbListening(false);
            
            // Even on error, give a response
            const errorResult = {
                truthIndex: 50,
                explanation: "The cosmic energies are in flux, making clear readings difficult. Your statement exists in a realm of uncertainty.",
                response: "The orb's energies swirl in confusion. I cannot determine the full truth of your statement at this time. ✨"
            };
            
            displayResult(errorResult);
        }
    }
    
    // Display result of analysis
    function displayResult(result) {
        analyzingIndicator.classList.add('hidden');
        
        // Play the whisper effect
        whisperEffect.currentTime = 0;
        whisperEffect.play().catch(e => console.log('Audio play failed:', e));
        
        // Display truth index
        const truthIndex = Math.min(Math.max(result.truthIndex, 0), 100);
        truthValue.textContent = truthIndex;
        
        // Get truth level and set visualization
        const truthLevel = getTruthLevel(truthIndex);
        
        // Set up the orb appearance based on truth level
        setOrbAppearance(truthLevel);
        
        // Add the explanation and response to the conversation
        const messageText = `${result.response} (Truth: ${truthIndex}%)`;
        addMessageToConversation('orb', messageText);
        
        // Have the orb speak its response
        const speechText = result.response.replace(/\s*\([^)]*\)\s*/g, "").replace(/\s*\[[^)]*\]\s*/g, "");
        speakWithOrbVoice(speechText);
        
        // If in auto-listen mode, set up to listen again after response
        if (autoListenMode) {
            // Wait for the orb to finish speaking before listening again
            const averageSpeakingTime = speechText.length * 80; // Roughly 80ms per character
            setTimeout(() => {
                if (autoListenMode) {
                    startRecording();
                }
            }, averageSpeakingTime + 1000); // Add 1 second pause after speaking
        }
    }
    
    // Determine truth level category
    function getTruthLevel(truthIndex) {
        if (truthIndex < 30) return 'low';
        if (truthIndex < 60) return 'neutral';
        return 'high';
    }
    
    // Set the orb's visual appearance based on truth level
    function setOrbAppearance(truthLevel) {
        const colorSettings = TRUTH_COLORS[truthLevel];
        
        // Update truth value color
        truthValue.style.color = colorSettings.color;
        
        // Update orb colors
        orbInner.style.background = colorSettings.gradientInner;
        orbInner.style.boxShadow = `0 0 40px 8px ${colorSettings.color}, inset 0 0 30px rgba(255, 255, 255, 0.4)`;
        
        // Update glow
        orbGlow.style.background = `radial-gradient(circle, ${colorSettings.glowColor} 0%, 
                                   ${colorSettings.glowColor.replace('0.6', '0.1')} 60%, 
                                   transparent 70%)`;
        
        // Show crack overlay for low truth
        showCrackOverlay(truthLevel === 'low');
        
        // Add special animation for the truth level
        animateOrbByTruthLevel(truthLevel);
        
        // Reset the orb appearance after a delay
        setTimeout(() => {
            // Reset to default colors
            orbInner.style.background = TRUTH_COLORS.default.gradientInner;
            orbInner.style.boxShadow = `0 0 40px 8px ${TRUTH_COLORS.default.color}, inset 0 0 30px rgba(255, 255, 255, 0.4)`;
            orbGlow.style.background = `radial-gradient(circle, ${TRUTH_COLORS.default.glowColor} 0%, 
                                      ${TRUTH_COLORS.default.glowColor.replace('0.6', '0.1')} 60%, 
                                      transparent 70%)`;
            
            // Reset animation
            pulseOrb(false);
        }, 5000);
    }
    
    // Show or hide crack overlay
    function showCrackOverlay(show) {
        if (show) {
            crackOverlay.classList.remove('hidden');
            crackOverlay.classList.add('visible');
        } else {
            crackOverlay.classList.remove('visible');
            setTimeout(() => {
                crackOverlay.classList.add('hidden');
            }, 800);
        }
    }
    
    // Pulse the orb during recording/analyzing
    function pulseOrb(active) {
        if (active) {
            orbInner.style.animation = 'pulse 1s infinite alternate';
        } else {
            orbInner.style.animation = 'pulse 4s infinite alternate';
        }
    }
    
    // Animate the orb when listening to user
    function animateOrbListening(active) {
        if (active) {
            // Create a ripple effect when listening
            orb.classList.add('listening');
            // Add audio visualizer-like effect to orb
            orbInner.classList.add('audio-reactive');
        } else {
            orb.classList.remove('listening');
            orbInner.classList.remove('audio-reactive');
        }
    }
    
    // Animate orb based on truth level
    function animateOrbByTruthLevel(truthLevel) {
        // Remove any existing truth level classes
        orb.classList.remove('truth-low', 'truth-neutral', 'truth-high');
        
        // Add the appropriate class
        orb.classList.add(`truth-${truthLevel}`);
        
        // Add special animation effects based on truth level
        if (truthLevel === 'low') {
            // Add shaking/unstable animation for low truth
            orb.classList.add('shake-animation');
            setTimeout(() => {
                orb.classList.remove('shake-animation');
            }, 2000);
        } else if (truthLevel === 'high') {
            // Add pulsing/glowing animation for high truth
            orb.classList.add('glow-animation');
            setTimeout(() => {
                orb.classList.remove('glow-animation');
            }, 3000);
        }
    }
    
    // Event listeners
    speakBtn.addEventListener('click', function() {
        if (!isRecording) {
            // Toggle auto-listen mode on second click
            if (speakBtn.getAttribute('data-clicked') === 'true' && !autoListenMode) {
                autoListenMode = true;
                speakBtn.textContent = "Auto-Listening Mode";
                speakBtn.classList.add('auto-mode');
                
                // Add a notification
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = "Auto-listening mode activated. The orb will listen after each response.";
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.classList.add('show');
                    
                    // Remove notification after a few seconds
                    setTimeout(() => {
                        notification.classList.remove('show');
                        setTimeout(() => notification.remove(), 500);
                    }, 3500);
                }, 100);
                
                // Speak a confirmation
                speakWithOrbVoice("Auto-listening mode activated. I will listen after each response.");
            }
            
            // Mark the button as having been clicked once
            speakBtn.setAttribute('data-clicked', 'true');
            
            startRecording();
        } else {
            stopRecording();
        }
    });
    
    // Double-click to exit auto-listen mode
    speakBtn.addEventListener('dblclick', function() {
        if (autoListenMode) {
            autoListenMode = false;
            speakBtn.textContent = "Speak to the Orb";
            speakBtn.classList.remove('auto-mode');
            
            // Add a notification
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = "Auto-listening mode deactivated.";
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('show');
                
                // Remove notification after a few seconds
                setTimeout(() => {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 500);
                }, 2500);
            }, 100);
            
            // Speak a confirmation
            speakWithOrbVoice("Auto-listening mode deactivated.");
        }
    });

    // Long press on orb to toggle auto-listen mode (mobile friendly)
    let longPressTimer;
    orb.addEventListener('touchstart', function() {
        longPressTimer = setTimeout(() => {
            autoListenMode = !autoListenMode;
            
            if (autoListenMode) {
                speakBtn.textContent = "Auto-Listening Mode";
                speakBtn.classList.add('auto-mode');
                speakWithOrbVoice("Auto-listening mode activated. I will listen after each response.");
            } else {
                speakBtn.textContent = "Speak to the Orb";
                speakBtn.classList.remove('auto-mode');
                speakWithOrbVoice("Auto-listening mode deactivated.");
            }
            
            // Visual feedback for long press
            orb.classList.add('long-press');
            setTimeout(() => orb.classList.remove('long-press'), 300);
        }, 800); // Long press threshold
    });
    
    orb.addEventListener('touchend', function() {
        clearTimeout(longPressTimer);
    });
    
    // Initialize the app
    function initApp() {
        initSpeechRecognition();
        
        // Initialize with a welcome message
        const welcomeMessage = 'I am the Mystical Lie Detector Orb. Speak your statement, and I shall reveal the truth within. ✨';
        addMessageToConversation('orb', welcomeMessage);
        
        // Speak the welcome message on page load
        setTimeout(() => {
            speakWithOrbVoice("I am the Mystical Lie Detector Orb. Speak your statement, and I shall reveal the truth within.");
        }, 1000);
        
        // Attempt to play ambient sound on first user interaction
        document.body.addEventListener('click', function onFirstClick() {
            ambientHum.play().catch(e => console.log('Audio play failed:', e));
            document.body.removeEventListener('click', onFirstClick);
        }, { once: true });
    }
    
    // Start the app
    initApp();
});
