/**
 * MI-Dojo - Motivational Interviewing Practice App
 * Main Application JavaScript
 */

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  initApp();
});

// Initialize the application
function initApp() {
  // Check if coming back from a previous session
  const sessionState = localStorage.getItem('mi-dojo-state');
  // Add a URL parameter check
  const urlParams = new URLSearchParams(window.location.search);
  const showLanding = urlParams.get('landing');
  
  if (sessionState === 'app' && showLanding !== 'true') {
    showApp();
  } else {
    // Reset state and show landing
    localStorage.removeItem('mi-dojo-state');
    document.getElementById('landing-page').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize UI based on device
  setupAdaptiveUI();
  
  // Add chat scrolling setup
  setupChatScrolling();
  
  // Check if Firebase is loaded
  checkFirebaseLoaded();
  
  // Initialize speech synthesis if available
  initSpeech();
}

// Set up all event listeners for the application
function setupEventListeners() {
  // Enter Dojo button
  const enterDojoBtn = document.getElementById('enter-dojo-btn');
  if (enterDojoBtn) {
    enterDojoBtn.addEventListener('click', playDojoTransition);
  }
  
  // Create Persona button
  const createPersonaBtn = document.getElementById('create-persona-btn');
  if (createPersonaBtn) {
    createPersonaBtn.addEventListener('click', createPersona);
  }
  
  // Send Message button
  const sendMessageBtn = document.getElementById('send-message-btn');
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', sendMessage);
  }
  
  // Session feedback button
  const sessionFeedbackBtn = document.getElementById('session-feedback-btn');
  if (sessionFeedbackBtn) {
    sessionFeedbackBtn.addEventListener('click', generateSessionFeedback);
  }

  // Message Input - Enter key functionality
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Get coaching/feedback button
  const getCoachingBtn = document.getElementById('get-coaching-btn');
  if (getCoachingBtn) {
    getCoachingBtn.addEventListener('click', function() {
      getCoaching(true);
    });
  }
  
  // End session button
  const endSessionBtn = document.getElementById('end-session-btn');
  if (endSessionBtn) {
    endSessionBtn.addEventListener('click', endSession);
  }
  
  // Back to chat button
  const backToChatBtn = document.getElementById('back-to-chat-btn');
  if (backToChatBtn) {
    backToChatBtn.addEventListener('click', function() {
      transitionToScreen('chat');
    });
  }
  
  // New session button
  const newSessionBtn = document.getElementById('new-session-btn');
  if (newSessionBtn) {
    newSessionBtn.addEventListener('click', function() {
      transitionToScreen('welcome');
    });
  }
  
  // Add download button
  addDownloadButton();
  
  // Add back to landing option if not already there
  if (!document.getElementById('back-to-landing-btn')) {
    const headerSection = document.querySelector('.sidebar-actions');
    if (headerSection) {
      const backToLandingBtn = document.createElement('button');
      backToLandingBtn.id = 'back-to-landing-btn';
      backToLandingBtn.className = 'secondary-btn';
      backToLandingBtn.innerHTML = 'Back to Landing';
      backToLandingBtn.addEventListener('click', function() {
        localStorage.removeItem('mi-dojo-state');
        window.location.href = window.location.pathname + '?landing=true';
      });
      headerSection.appendChild(backToLandingBtn);
    }
  }
}

// Setup chat scrolling behavior
function setupChatScrolling() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  // User scroll state tracking
  let userScrolled = false;
  let scrollTimeout;
  
  // Detect user scrolling
  chatMessages.addEventListener('scroll', function() {
    userScrolled = true;
    
    // Reset after some time of inactivity
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // Only reset if we're near the bottom already
      const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 100;
      if (isNearBottom) {
        userScrolled = false;
      }
    }, 2000);
  });
  
  // Add a "scroll to bottom" button that appears when scrolled up
  const scrollButton = document.createElement('button');
  scrollButton.className = 'scroll-to-bottom';
  scrollButton.innerHTML = '<span class="material-icons">arrow_downward</span>';
  scrollButton.style.position = 'absolute';
  scrollButton.style.bottom = '70px';
  scrollButton.style.right = '20px';
  scrollButton.style.zIndex = '10';
  scrollButton.style.display = 'none';
  scrollButton.style.borderRadius = '50%';
  scrollButton.style.width = '40px';
  scrollButton.style.height = '40px';
  
  scrollButton.addEventListener('click', () => {
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  });
  
  document.querySelector('.chat-main') && document.querySelector('.chat-main').appendChild(scrollButton);
  
  // Show/hide scroll button based on scroll position
  chatMessages.addEventListener('scroll', function() {
    const isScrolledUp = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight > 100;
    scrollButton.style.display = isScrolledUp ? 'block' : 'none';
  });
  
  // Override the auto-scroll in simulateStreamingResponse function
  window.originalScrollToBottom = function() {
    if (!userScrolled) {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
      });
    }
  };
}

// Check if Firebase is loaded
function checkFirebaseLoaded() {
  try {
    let app = firebase.app();
    let features = [
      'auth', 
      'database', 
      'firestore',
      'functions',
      'messaging', 
      'storage', 
      'analytics', 
      'remoteConfig',
      'performance',
    ].filter(feature => typeof app[feature] === 'function');
    console.log(`Firebase SDK loaded with ${features.join(', ')}`);
    
    // Initialize Firestore with correct location
    firebase.firestore().settings({
      ignoreUndefinedProperties: true,
    });
    
    // Initialize auth state listener
    initAuth();
    
  } catch (e) {
    console.error('Error loading the Firebase SDK:', e);
    showError('Firebase initialization failed. Please check your connection and try again.');
  }
}

// Initialize Firebase Authentication
function initAuth() {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // User is signed in
      console.log('User is signed in:', user.uid);
      // You can add user-specific initialization here
    } else {
      // No user is signed in, you may want to show a sign-in UI
      console.log('No user is signed in');
      // For now, we'll allow anonymous usage
    }
  });
}

// Play the dojo entrance transition animation
function playDojoTransition() {
  const transitionOverlay = document.getElementById('transition-overlay');
  transitionOverlay.classList.remove('hidden');
  
  // Animate the gates opening
  setTimeout(() => {
    const leftGate = document.querySelector('.gate.left');
    const rightGate = document.querySelector('.gate.right');
    
    leftGate.classList.add('open');
    rightGate.classList.add('open');
    
    // After animation completes, show the app
    setTimeout(() => {
      transitionOverlay.classList.add('fade-out');
      setTimeout(() => {
        showApp();
        transitionOverlay.classList.add('hidden');
        transitionOverlay.classList.remove('fade-out');
        leftGate.classList.remove('open');
        rightGate.classList.remove('open');
      }, 1000);
    }, 1500);
  }, 500);
}

// Show the main app container
function showApp() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  localStorage.setItem('mi-dojo-state', 'app');
}

// Enhanced screen transition with animation
function transitionToScreen(screenId) {
  // Show transition overlay
  const transition = document.createElement('div');
  transition.className = 'page-transition active';
  document.body.appendChild(transition);
  
  // After a short delay, hide current screen and show target
  setTimeout(() => {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      if (!screen.id.includes('landing-page')) {
        screen.classList.add('hidden');
      }
    });
    
    // Show the target screen after a brief delay
    setTimeout(() => {
      document.getElementById(`${screenId}-screen`).classList.remove('hidden');
      
      // Remove transition overlay
      setTimeout(() => {
        transition.classList.remove('active');
        setTimeout(() => {
          transition.remove();
        }, 300);
      }, 300);
    }, 100);
  }, 300);
}

// Fallback for compatibility with existing code
function showScreen(screenId) {
  transitionToScreen(screenId);
}

// Create a new persona
function createPersona() {
  const scenarioType = document.getElementById('scenario-type').value;
  const changeReadiness = document.getElementById('change-readiness').value;
  const additionalContext = document.getElementById('additional-context').value;
  const communicationStyle = document.getElementById('communication-style')?.value || '';
  
  createPersonaWithValues(scenarioType, changeReadiness, additionalContext, communicationStyle);
}

// Separated function for creating persona with direct values
function createPersonaWithValues(scenarioType, changeReadiness, additionalContext, communicationStyle) {
  // Show loading overlay
  showLoading(true);
  
  // Call the Firebase Function to generate persona
  const generatePersonaFn = firebase.functions().httpsCallable('generatePersona');
  
  generatePersonaFn({
    scenario_type: scenarioType,
    change_readiness: changeReadiness,
    additional_context: additionalContext,
    communication_style_prompt: communicationStyle
  })
  .then((result) => {
    // Store the persona details
    window.currentPersona = result.data;
    window.currentSessionId = result.data.persona_id;
    window.conversationHistory = [];
    
    // Render persona details
    renderPersonaDetails(result.data);
    
    // Switch to chat screen
    transitionToScreen('chat');
    
    // Clear previous chat
    document.getElementById('chat-messages').innerHTML = '';
    
    // Reset coaching button
    document.getElementById('get-coaching-btn').disabled = true;
    document.getElementById('session-feedback-btn').disabled = true;
    
    // Hide loading overlay
    showLoading(false);
    
    // Setup sidebar toggle
    setupSidebarToggle();
    
    // Setup coaching sidebar
    setupCoachingSidebar();
  })
  .catch((error) => {
    console.error('Error creating persona:', error);
    showError('Failed to create persona. Please try again.');
    showLoading(false);
  });
}

// Render persona details in the sidebar
function renderPersonaDetails(persona) {
  const personaInfoElement = document.getElementById('persona-info');
  
  // Clear existing content
  personaInfoElement.innerHTML = '';
  
  // Base characteristics
  const baseCharacteristics = document.createElement('div');
  baseCharacteristics.innerHTML = `
    <h4>Base Characteristics</h4>
    <p><strong>Condition:</strong> ${persona.base_characteristics.condition}</p>
    <p><strong>Stage of Change:</strong> ${persona.base_characteristics.stage_of_change}</p>
    <h4>Key Resistances</h4>
    <ul>
      ${persona.base_characteristics.key_resistances.map(resistance => `<li>${resistance}</li>`).join('')}
    </ul>
    <p><strong>Communication Style:</strong> ${persona.base_characteristics.communication_style}</p>
  `;
  
  // Scenario Context
  const scenarioContext = document.createElement('div');
  scenarioContext.innerHTML = `
    <h4>Life Circumstances</h4>
    <p>${persona.scenario_context.life_circumstances}</p>
    <p><strong>Support System:</strong> ${persona.scenario_context.support_system}</p>
    <h4>Stress Factors</h4>
    <ul>
      ${persona.scenario_context.stress_factors.map(factor => `<li>${factor}</li>`).join('')}
    </ul>
  `;
  
  // Change dynamics
  const changeDynamics = document.createElement('div');
  changeDynamics.innerHTML = `
    <h4>Change Dynamics</h4>
    <p><strong>Readiness:</strong> ${persona.change_dynamics.readiness_level}</p>
    <h4>Ambivalence Areas</h4>
    <ul>
      ${persona.change_dynamics.ambivalence_areas.map(area => `<li>${area}</li>`).join('')}
    </ul>
    <h4>Change Talk Patterns</h4>
  `;
  
  // Create progress bars for change talk patterns
  const patterns = persona.change_dynamics.change_talk_patterns;
  for (const [key, value] of Object.entries(patterns)) {
    const statDiv = document.createElement('div');
    statDiv.className = 'persona-stat';
    
    const label = document.createElement('span');
    label.textContent = key.charAt(0).toUpperCase() + key.slice(1) + ':';
    
    const valueSpan = document.createElement('span');
    valueSpan.textContent = `${value}/10`;
    
    statDiv.appendChild(label);
    statDiv.appendChild(valueSpan);
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.width = `${value * 10}%`;
    
    progressBar.appendChild(progressFill);
    
    changeDynamics.appendChild(statDiv);
    changeDynamics.appendChild(progressBar);
  }
  
  // Append all sections
  personaInfoElement.appendChild(baseCharacteristics);
  personaInfoElement.appendChild(scenarioContext);
  personaInfoElement.appendChild(changeDynamics);
}

// Handle sending a message
function sendMessage() {
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value.trim();
 
  if (!message) return;
 
  // Clear input
  messageInput.value = '';
 
  // Add user message to chat
  addMessageToChat('user', message);
 
  // Create empty message for streaming response
  const personaMessageId = 'persona-message-' + Date.now();
  addEmptyMessageToChat('persona', personaMessageId);
 
  // Show loading indicator on message
  document.getElementById(personaMessageId).classList.add('typing');
 
  // Update conversation history
  if (!window.conversationHistory) {
    window.conversationHistory = [];
  }
 
  window.conversationHistory.push({
    role: 'user',
    content: message
  });
 
  // Call the persona chat function
  const personaChatFn = firebase.functions().httpsCallable('personaChat');
 
  personaChatFn({
    persona: window.currentPersona,
    message: message,
    conversation_history: window.conversationHistory
  })
  .then((result) => {
    // Get the response
    const response = result.data;
   
    // Simulate streaming for a better experience
    simulateStreamingResponse(personaMessageId, response);
   
    // Update conversation history
    window.conversationHistory.push({
      role: 'persona',
      content: response
    });
   
    // Enable buttons after first exchange
    document.getElementById('get-coaching-btn').disabled = false;
    document.getElementById('session-feedback-btn').disabled = false;
   
    // Request coaching feedback automatically
    setTimeout(() => {
      requestCoachingFeedback();
    }, 2000);
  })
  .catch((error) => {
    console.error('Error sending message:', error);
    showError('Error in conversation: ' + error.message);
    document.getElementById(personaMessageId).remove();
    showLoading(false);
  });
}

// Function to request coaching feedback automatically
function requestCoachingFeedback() {
  if (!window.conversationHistory || window.conversationHistory.length < 2) return;
  
  // Find the latest user message
  let userMessageIndex = -1;
  for (let i = window.conversationHistory.length - 1; i >= 0; i--) {
    if (window.conversationHistory[i].role === 'user') {
      userMessageIndex = i;
      break;
    }
  }
  
  if (userMessageIndex === -1) return;
  
  const userMessage = window.conversationHistory[userMessageIndex].content;
  const conversationHistoryForCoaching = window.conversationHistory.slice(0, userMessageIndex);
  
  // Call the coaching function without showing UI feedback
  const miCoachingFn = firebase.functions().httpsCallable('miCoaching');
  
  miCoachingFn({
    user_message: userMessage,
    conversation_history: conversationHistoryForCoaching,
    persona: window.currentPersona
  })
  .then((result) => {
    const coaching = result.data;
    
    // Update coaching sidebar content
    if (coaching.has_coaching) {
      const sidebarContent = document.querySelector('.coaching-sidebar-content');
      if (sidebarContent) {
        sidebarContent.innerHTML = `
          <div class="coaching-content">
            <p>${coaching.coaching_message || ''}</p>
            ${coaching.mi_technique_used ? `<div class="technique">Technique used: ${coaching.mi_technique_used}</div>` : ''}
            ${coaching.missed_opportunity ? `<div class="opportunity">Missed opportunity: ${coaching.missed_opportunity}</div>` : ''}
          </div>
        `;
        
        // Show notification on coaching button
        const coachingBtn = document.querySelector('.toggle-coaching-btn');
        if (coachingBtn) {
          coachingBtn.classList.add('has-update');
        }
      }
    }
  })
  .catch((error) => {
    console.error('Error getting coaching feedback:', error);
  });
}

// Simulate streaming response for better UX
function simulateStreamingResponse(messageId, fullResponse) {
  const messageElement = document.getElementById(messageId);
  const messagePara = messageElement.querySelector('p');
  
  // Remove typing indicator
  messageElement.classList.remove('typing');
  
  // Calculate appropriate chunk size and delay
  const totalLength = fullResponse.length;
  const chunkSize = Math.max(3, Math.floor(totalLength / 20)); // Adjust for response length
  const baseDelay = 30; // milliseconds
  
  let currentPosition = 0;
  
  function addNextChunk() {
    if (currentPosition >= totalLength) {
      // All chunks added, finish up
      messagePara.textContent = fullResponse;
      
      // Speak text if speech is enabled
      if (window.speechEnabled) {
        speakText(fullResponse);
      }
      return;
    }
    
    // Calculate next chunk end (respecting word boundaries when possible)
    let nextEnd = Math.min(currentPosition + chunkSize, totalLength);
    if (nextEnd < totalLength) {
      // Try to find a space to break at
      const spacePos = fullResponse.indexOf(' ', nextEnd - 10);
      if (spacePos > 0 && spacePos < nextEnd + 15) {
        nextEnd = spacePos;
      }
    }
    
    // Add the next chunk
    messagePara.textContent = fullResponse.substring(0, nextEnd);
    
    // Use the custom scroll function that respects user scrolling
    if (window.originalScrollToBottom) {
      window.originalScrollToBottom();
    } else {
      // Fallback to direct scrolling if custom function not available
      const chatMessages = document.getElementById('chat-messages');
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Prepare for next chunk
    currentPosition = nextEnd;
    
    // Calculate variable delay based on punctuation
    let delay = baseDelay;
    const lastChar = fullResponse.charAt(nextEnd - 1);
    if (lastChar === '.') delay = 250;
    else if (lastChar === ',') delay = 150;
    else if (lastChar === '!') delay = 300;
    else if (lastChar === '?') delay = 250;
    
    // Schedule next chunk
    setTimeout(addNextChunk, delay);
  }
  
  // Start the streaming simulation
  addNextChunk();
}

// Add a message to the chat UI
function addMessageToChat(role, content) {
  const chatMessages = document.getElementById('chat-messages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  const messagePara = document.createElement('p');
  messagePara.textContent = content;
  
  messageDiv.appendChild(messagePara);
  chatMessages.appendChild(messageDiv);
  
  // Use the custom scroll function that respects user scrolling
  if (window.originalScrollToBottom) {
    window.originalScrollToBottom();
  } else {
    // Smooth scroll to bottom
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  }
  
  // Speak text if it's a persona message and speech is enabled
  if (role === 'persona' && window.speechEnabled) {
    speakText(content);
  }
}

// Add an empty message to the chat UI (for streaming)
function addEmptyMessageToChat(role, id) {
  const chatMessages = document.getElementById('chat-messages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  messageDiv.id = id;
  
  const messagePara = document.createElement('p');
  messageDiv.appendChild(messagePara);
  chatMessages.appendChild(messageDiv);
  
  // Use the custom scroll function that respects user scrolling
  if (window.originalScrollToBottom) {
    window.originalScrollToBottom();
  } else {
    // Smooth scroll to bottom
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  }
}

// Get conversation history
function getConversationHistory() {
  if (window.conversationHistory) {
    return window.conversationHistory;
  }
  
  const chatMessages = document.getElementById('chat-messages');
  const messageElements = chatMessages.querySelectorAll('.message');
  
  const history = [];
  messageElements.forEach(element => {
    const role = element.classList.contains('user-message') ? 'user' : 'persona';
    const content = element.querySelector('p').textContent;
    
    history.push({
      role: role,
      content: content
    });
  });
  
  window.conversationHistory = history;
  return history;
}

// Update coaching feedback automatically (for sidebar only)
function updateCoachingFeedback(showLoadingOverlay = false) {
  const history = getConversationHistory();
  if (history.length < 2) return; // Need at least one exchange
  
  // Find the last user message
  let userMessageIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      userMessageIndex = i;
      break;
    }
  }
  
  if (userMessageIndex === -1) return;
  
  // Get coaching without showing loading overlay
  const userMessage = history[userMessageIndex].content;
  const conversationHistory = history.slice(0, userMessageIndex);
  
  // Call function only to update sidebar, not main chat
  const miCoachingFn = firebase.functions().httpsCallable('miCoaching');
  
  if (showLoadingOverlay) {
    showLoading(true);
  }
  
  miCoachingFn({
    user_message: userMessage,
    conversation_history: conversationHistory,
    persona: window.currentPersona
  })
  .then((result) => {
    const coaching = result.data;
    
    if (coaching.has_coaching) {
      // Update only the sidebar, not the main chat
      const sidebarContent = document.getElementById('coaching-sidebar-content');
      if (sidebarContent) {
        const contentHTML = `
          <div class="coaching-content">
            <p>${coaching.coaching_message || ''}</p>
            ${coaching.mi_technique_used ? `<div class="technique">Technique used: ${coaching.mi_technique_used}</div>` : ''}
            ${coaching.missed_opportunity ? `<div class="opportunity">Missed opportunity: ${coaching.missed_opportunity}</div>` : ''}
          </div>
        `;
        sidebarContent.innerHTML = contentHTML;
        
        // Show notification indicator if sidebar is not open
        if (!document.querySelector('.coaching-sidebar').classList.contains('open')) {
          document.querySelector('.toggle-coaching-btn').classList.add('has-update');
        }
      }
    }
    
    if (showLoadingOverlay) {
      showLoading(false);
    }
  })
  .catch((error) => {
    console.error('Error updating coaching feedback:', error);
    if (showLoadingOverlay) {
      showLoading(false);
    }
  });
}

// Get coaching feedback (for main chat area)
function getCoaching(showLoadingOverlay = true) {
  const history = getConversationHistory();
  
  if (history.length < 2) {
    showError('You need more conversation history to get meaningful coaching.');
    return;
  }
  
  // Find the last user message
  let userMessageIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'user') {
      userMessageIndex = i;
      break;
    }
  }
  
  if (userMessageIndex === -1) {
    if (showLoadingOverlay) {
      showError('No user messages found to provide coaching on.');
    }
    return;
  }
  
  // Show loading if requested
  if (showLoadingOverlay) {
    showLoading(true);
  }
  
  // Get data for coaching request
  const userMessage = history[userMessageIndex].content;
  const conversationHistory = history.slice(0, userMessageIndex);
  
  // Call the coaching function
  const miCoachingFn = firebase.functions().httpsCallable('miCoaching');
  
  miCoachingFn({
    user_message: userMessage,
    conversation_history: conversationHistory,
    persona: window.currentPersona
  })
  .then((result) => {
    const coaching = result.data;
    
    // Update inline feedback in main chat
    const coachingElement = document.getElementById('coaching-feedback');
    const coachingContent = document.getElementById('coaching-content');
    
    const contentHTML = `
      <p>${coaching.coaching_message || ''}</p>
      ${coaching.mi_technique_used ? `<div class="technique">Technique used: ${coaching.mi_technique_used}</div>` : ''}
      ${coaching.missed_opportunity ? `<div class="opportunity">Missed opportunity: ${coaching.missed_opportunity}</div>` : ''}
    `;
    
    if (coaching.has_coaching) {
      coachingContent.innerHTML = contentHTML;
      coachingElement.classList.remove('hidden');
    } else {
      coachingContent.innerHTML = '<p>No specific coaching needed for your last message.</p>';
      coachingElement.classList.remove('hidden');
    }
    
    // Hide loading
    if (showLoadingOverlay) {
      showLoading(false);
    }
  })
  .catch((error) => {
    console.error('Error getting coaching:', error);
    if (showLoadingOverlay) {
      showError('Error getting coaching: ' + error.message);
      showLoading(false);
    }
  });
}

// Generate MITI session feedback
function generateSessionFeedback() {
  // Check if we have enough conversation
  const history = getConversationHistory();
  if (history.length < 2) {
    showError('You need more conversation history to generate meaningful feedback.');
    return;
  }
  
  // Show loading
  showLoading(true);
  
  // Call the feedback function
  const sessionFeedbackFn = firebase.functions().httpsCallable('sessionFeedback');
  
  sessionFeedbackFn({
    conversation: history,
    persona: window.currentPersona
  })
  .then((result) => {
    // Render the MITI feedback
    renderFeedback(result.data);
    
    // Switch to feedback screen
    transitionToScreen('feedback');
    
    // Hide loading
    showLoading(false);
  })
  .catch((error) => {
    console.error('Error generating feedback:', error);
    showError('Error generating feedback: ' + error.message);
    showLoading(false);
  });
}

// Render session feedback
function renderFeedback(feedback) {
  const feedbackContent = document.getElementById('feedback-content');
  
  // Create HTML for the feedback
  let html = `
    <h3>MITI Scores</h3>
    <div class="score-section">
      <h4>Global Scores (1-5 scale)</h4>
      <ul>
        <li><strong>Partnership:</strong> ${feedback.global_scores.partnership} - ${getCompetencyLabel(feedback.competency_assessment.relational)}</li>
        <li><strong>Empathy:</strong> ${feedback.global_scores.empathy} - ${getCompetencyLabel(feedback.competency_assessment.relational)}</li>
        <li><strong>Cultivating Change Talk:</strong> ${feedback.global_scores.cultivating_change_talk} - ${getCompetencyLabel(feedback.competency_assessment.technical)}</li>
        <li><strong>Softening Sustain Talk:</strong> ${feedback.global_scores.softening_sustain_talk} - ${getCompetencyLabel(feedback.competency_assessment.technical)}</li>
      </ul>
    </div>
    
    <div class="score-section">
      <h4>Behavior Counts</h4>
      <ul>
        <li><strong>Questions:</strong> ${feedback.behavior_counts.questions}</li>
        <li><strong>Simple Reflections:</strong> ${feedback.behavior_counts.simple_reflections}</li>
        <li><strong>Complex Reflections:</strong> ${feedback.behavior_counts.complex_reflections}</li>
        <li><strong>Affirmations:</strong> ${feedback.behavior_counts.affirm}</li>
        <li><strong>Seeking Collaboration:</strong> ${feedback.behavior_counts.seeking_collaboration}</li>
        <li><strong>Emphasizing Autonomy:</strong> ${feedback.behavior_counts.emphasizing_autonomy}</li>
      </ul>
    </div>
    
    <div class="score-section">
      <h4>Derived Metrics</h4>
      <ul>
        <li><strong>Reflection-to-Question Ratio:</strong> ${feedback.derived_metrics.reflection_to_question_ratio.toFixed(2)} - ${getCompetencyLabel(feedback.competency_assessment.reflection_to_question_ratio)}</li>
        <li><strong>Percent Complex Reflections:</strong> ${feedback.derived_metrics.percent_complex_reflections.toFixed(1)}% - ${getCompetencyLabel(feedback.competency_assessment.percent_complex_reflections)}</li>
        <li><strong>Total MI-Adherent:</strong> ${feedback.derived_metrics.total_mi_adherent}</li>
        <li><strong>Total MI Non-Adherent:</strong> ${feedback.derived_metrics.total_mi_non_adherent}</li>
      </ul>
    </div>
    
    <h3>Strengths</h3>
    <ul>
      ${feedback.strengths.map(strength => `<li>${strength}</li>`).join('')}
    </ul>
    
    <h3>Areas for Improvement</h3>
    <ul>
      ${feedback.areas_for_improvement.map(area => `<li>${area}</li>`).join('')}
    </ul>
  `;
  
  // Add examples if available
  if (feedback.examples && (feedback.examples.good_examples.length > 0 || feedback.examples.missed_opportunities.length > 0)) {
    html += `<h3>Examples</h3>`;
    
    if (feedback.examples.good_examples.length > 0) {
      html += `
        <div class="good-examples">
          <h4>Effective MI Techniques Used</h4>
          <ul>
            ${feedback.examples.good_examples.map(example => `<li>${example}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    
    if (feedback.examples.missed_opportunities.length > 0) {
      html += `
        <div class="missed-opportunities">
          <h4>Missed Opportunities</h4>
          <ul>
            ${feedback.examples.missed_opportunities.map(example => `<li>${example}</li>`).join('')}
          </ul>
        </div>
      `;
    }
  }
  
  feedbackContent.innerHTML = html;
  
  // Optimize for mobile if needed
  if (window.innerWidth <= 768) {
    optimizeFeedbackForMobile();
  }
}

// Optimize feedback display for mobile devices
function optimizeFeedbackForMobile() {
  const feedbackContent = document.getElementById('feedback-content');
  
  // Add collapsible sections
  const sections = feedbackContent.querySelectorAll('h3');
  
  sections.forEach(section => {
    // Get all elements until the next h3
    const content = [];
    let next = section.nextElementSibling;
    
    while (next && next.tagName !== 'H3') {
      content.push(next);
      next = next.nextElementSibling;
    }
    
    // Create collapsible container
    const container = document.createElement('div');
    container.className = 'collapsible-section';
    
    // Create header with toggle
    const header = document.createElement('div');
    header.className = 'collapsible-header';
    header.innerHTML = `${section.outerHTML}<span class="material-icons toggle-icon">expand_more</span>`;
    
    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'collapsible-content collapsed';
    
    // Move all content elements to the content container
    content.forEach(el => {
      contentDiv.appendChild(el);
    });
    
    // Add toggle functionality
    header.addEventListener('click', () => {
      contentDiv.classList.toggle('collapsed');
      header.querySelector('.toggle-icon').textContent = 
        contentDiv.classList.contains('collapsed') ? 'expand_more' : 'expand_less';
    });
    
    // Assemble section
    container.appendChild(header);
    container.appendChild(contentDiv);
    
    // Replace the original section
    section.replaceWith(container);
  });
}

// Get a user-friendly label for competency assessment
function getCompetencyLabel(assessment) {
  const labels = {
    'Below Fair': '<span style="color: #c62828;">Below Fair</span>',
    'Fair': '<span style="color: #ff8f00;">Fair</span>',
    'Good': '<span style="color: #2e7d32;">Good</span>'
  };
  
  return labels[assessment] || assessment;
}

// End the current session
function endSession() {
  if (confirm('Are you sure you want to end this session? Your conversation will be saved.')) {
    // Clear current session variables
    window.currentPersona = null;
    window.conversationHistory = [];
    
    // Return to welcome screen
    transitionToScreen('welcome');
  }
}

// Show loading overlay
function showLoading(show) {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (show) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

// Show error message
function showError(message) {
  alert(message);
}

// Download conversation
function downloadConversation() {
  const history = getConversationHistory();
  if (history.length === 0) {
    alert('No conversation to download.');
    return;
  }
  
  // Format conversation for download
  let content = "# MI-Dojo Conversation\n\n";
  content += `Date: ${new Date().toLocaleString()}\n\n`;
  
  // Add persona information
  if (window.currentPersona) {
    content += "## Persona Information\n\n";
    content += `Condition: ${window.currentPersona.base_characteristics.condition}\n`;
    content += `Stage of Change: ${window.currentPersona.base_characteristics.stage_of_change}\n`;
    content += `Communication Style: ${window.currentPersona.base_characteristics.communication_style}\n\n`;
  }
  
  // Add conversation
  content += "## Conversation\n\n";
  history.forEach(msg => {
    const speaker = msg.role === 'user' ? 'You' : 'Client';
    content += `**${speaker}**: ${msg.content}\n\n`;
  });
  
  // Create download link
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `midojo-conversation-${Date.now()}.md`;
  a.click();
  
  // Clean up
  URL.revokeObjectURL(url);
}

// Add download button
function addDownloadButton() {
  if (document.getElementById('download-conversation-btn')) {
    return; // Button already exists
  }
  
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-conversation-btn';
  downloadBtn.className = 'secondary-btn';
  downloadBtn.innerHTML = '<span class="material-icons">download</span> Download Chat';
  downloadBtn.addEventListener('click', downloadConversation);
  
  // Add to sidebar actions
  const sidebarActions = document.querySelector('.sidebar-actions');
  if (sidebarActions) {
    sidebarActions.appendChild(downloadBtn);
  }
}

// Initialize speech synthesis
let speechEnabled = false;
let speechSynthesis = window.speechSynthesis;
let currentVoice = null;

function initSpeech() {
  if ('speechSynthesis' in window) {
    speechSynthesis = window.speechSynthesis;
    
    // Wait for voices to be loaded
    speechSynthesis.onvoiceschanged = function() {
      const voices = speechSynthesis.getVoices();
      // Set a default voice
      currentVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
    };
    
    // Initial voice loading
    if (speechSynthesis.getVoices().length > 0) {
      const voices = speechSynthesis.getVoices();
      currentVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
    }
    
    // Add speech toggle button if not already there
    setupSpeechControls();
    
    return true;
  }
  return false;
}

function toggleSpeech() {
  speechEnabled = !speechEnabled;
  document.getElementById('toggle-speech-btn').classList.toggle('active', speechEnabled);
  
  // Announce status change
  if (speechEnabled) {
    speakText("Voice enabled");
  } else {
    // Stop any ongoing speech
    speechSynthesis.cancel();
  }
}

function speakText(text) {
  if (!speechEnabled || !speechSynthesis) return;
  
  // Stop any ongoing speech
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = currentVoice;
  
  // Use the speech rate from slider if available
  if (window.speechRate) {
    utterance.rate = window.speechRate;
  }
  
  // Adjust based on persona characteristics
  if (window.currentPersona) {
    // Example: Adjust voice based on persona characteristics
    if (window.currentPersona.base_characteristics.communication_style.includes('Assertive')) {
      utterance.pitch = 1.1; // Slightly higher
    } else if (window.currentPersona.base_characteristics.communication_style.includes('Hesitant')) {
      utterance.pitch = 0.95; // Slightly lower
    }
  }
  
  speechSynthesis.speak(utterance);
}

// Add speech controls
function setupSpeechControls() {
  if (document.getElementById('toggle-speech-btn')) {
    return; // Controls already exist
  }
  
  const speechToggle = document.createElement('button');
  speechToggle.id = 'toggle-speech-btn';
  speechToggle.className = 'secondary-btn speech-toggle';
  speechToggle.innerHTML = '<span class="material-icons">volume_up</span>';
  speechToggle.title = 'Toggle Voice';
  speechToggle.addEventListener('click', toggleSpeech);
  
  // Add to sidebar actions
  const sidebarActions = document.querySelector('.sidebar-actions');
  if (sidebarActions) {
    sidebarActions.prepend(speechToggle);
    
    // Add speed control slider with delay to ensure proper rendering
    setTimeout(() => addSpeechSpeedControl(), 100);
  }
}

// Add speech speed control
function addSpeechSpeedControl() {
  if (document.querySelector('.speech-speed-control')) {
    return; // Already exists
  }
  
  const speechBtn = document.getElementById('toggle-speech-btn');
  if (!speechBtn) return;
  
  // Create speed control container
  const speedControl = document.createElement('div');
  speedControl.className = 'speech-speed-control';
  speedControl.innerHTML = `
    <div class="speed-slider-container">
      <span class="speed-value">0.5×</span>
      <input type="range" min="0.5" max="2" step="0.1" value="1" class="speed-slider" id="speech-speed-slider">
      <span class="speed-value">2.0×</span>
    </div>
    <div class="current-speed">
      <span id="current-speed-value">1.0×</span>
    </div>
  `;
  
  // Insert after speech button
  speechBtn.parentNode.insertBefore(speedControl, speechBtn.nextSibling);
  
  // Set up event listener
  document.getElementById('speech-speed-slider').addEventListener('input', function(e) {
    const value = parseFloat(e.target.value).toFixed(1);
    document.getElementById('current-speed-value').textContent = `${value}×`;
    
    // Store the speech rate for use in speakText
    window.speechRate = parseFloat(value);
  });
}

// Setup sidebar toggle (persona info)
function setupSidebarToggle() {
  const sidebar = document.querySelector('.sidebar');
  const chatContainer = document.querySelector('.chat-container');
  if (!sidebar || document.querySelector('.sidebar-toggle')) return;
 
  const sidebarToggle = document.createElement('div');
  sidebarToggle.className = 'sidebar-toggle';
  sidebarToggle.innerHTML = '<span class="material-icons">chevron_left</span>';
  sidebarToggle.addEventListener('click', toggleSidebar);
  
  // Position toggle at sidebar edge
  sidebarToggle.style.position = 'absolute';
  sidebarToggle.style.zIndex = '20';
  sidebarToggle.style.left = '300px';
 
  // Add to the chat container instead of the sidebar so it remains visible when sidebar collapses
  chatContainer.appendChild(sidebarToggle);
  
  // Create coaching sidebar if it doesn't exist
  setupCoachingSidebar();
  
  // Add download button
  addDownloadButton();
}

// Toggle sidebar visibility
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const chatMain = document.querySelector('.chat-main');
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const isCollapsed = sidebar.classList.contains('collapsed');
 
  if (isCollapsed) {
    sidebar.classList.remove('collapsed');
    chatMain.classList.remove('expanded');
    sidebarToggle.querySelector('.material-icons').textContent = 'chevron_left';
    // Move toggle button back to align with sidebar edge
    sidebarToggle.style.left = '300px';
  } else {
    sidebar.classList.add('collapsed');
    chatMain.classList.add('expanded');
    sidebarToggle.querySelector('.material-icons').textContent = 'chevron_right';
    // Keep toggle button visible at the edge of the screen
    sidebarToggle.style.left = '20px';
  }
}

// Setup coaching sidebar
function setupCoachingSidebar() {
  if (document.querySelector('.coaching-sidebar')) return;
 
  // Create coaching sidebar
  const coachingSidebar = document.createElement('div');
  coachingSidebar.className = 'coaching-sidebar';
  coachingSidebar.innerHTML = `
    <div class="coaching-header">
      <h3>Coaching Feedback</h3>
      <span class="material-icons close-coaching-btn">close</span>
    </div>
    <div id="coaching-sidebar-content" class="coaching-sidebar-content">
      <div class="coaching-content">
        <p>No coaching feedback yet. Start a conversation to receive coaching.</p>
      </div>
    </div>
  `;
 
  document.body.appendChild(coachingSidebar);
 
  // Close button
  coachingSidebar.querySelector('.close-coaching-btn').addEventListener('click', () => {
    coachingSidebar.classList.remove('open');
  });
 
  // Create toggle button
  const toggleCoachingBtn = document.createElement('div');
  toggleCoachingBtn.className = 'toggle-coaching-btn';
  toggleCoachingBtn.innerHTML = '<span class="material-icons">psychology</span>';
  toggleCoachingBtn.addEventListener('click', toggleCoachingSidebar);
 
  document.body.appendChild(toggleCoachingBtn);
}

// Toggle coaching sidebar
function toggleCoachingSidebar() {
  const sidebar = document.querySelector('.coaching-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
    // Remove notification indicator when opening
    if (sidebar.classList.contains('open')) {
      document.querySelector('.toggle-coaching-btn').classList.remove('has-update');
    }
  }
}

// Setup adaptive UI for different devices
function setupAdaptiveUI() {
  const isMobile = window.innerWidth <= 768;
  document.body.classList.toggle('mobile-device', isMobile);
  
  // Listen for orientation changes
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      const isNowMobile = window.innerWidth <= 768;
      document.body.classList.toggle('mobile-device', isNowMobile);
      
      // Reload UI components if device type changed
      if (isNowMobile !== isMobile) {
        location.reload(); // Simple approach - could be more sophisticated
      }
    }, 300);
  });
  
  // If mobile, initialize mobile-specific features
  if (isMobile) {
    setupMobileNavigation();
    setupMobileGestures();
    setupMobileForm();
  }
}

// Setup mobile navigation
function setupMobileNavigation() {
  if (document.querySelector('.mobile-nav')) {
    return; // Already initialized
  }
  
  const mobileNav = document.createElement('div');
  mobileNav.className = 'mobile-nav';
  mobileNav.innerHTML = `
    <div class="nav-item active" data-target="chat">
      <span class="material-icons">chat</span>
    </div>
    <div class="nav-item" data-target="persona">
      <span class="material-icons">person</span>
    </div>
    <div class="nav-item" data-target="coach">
      <span class="material-icons">psychology</span>
    </div>
    <div class="nav-item" data-target="tools">
      <span class="material-icons">build</span>
    </div>
  `;
  
  document.getElementById('app-container').appendChild(mobileNav);
  
  // Handle navigation
  mobileNav.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      // Update active state
      mobileNav.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      const target = this.getAttribute('data-target');
      
      switch(target) {
        case 'chat':
          // Hide persona drawer and coaching panel
          document.querySelector('.sidebar').classList.remove('expanded');
          if (document.querySelector('.coaching-sidebar')) {
            document.querySelector('.coaching-sidebar').classList.remove('open');
          }
          break;
        case 'persona':
          // Show persona drawer
          document.querySelector('.sidebar').classList.add('expanded');
          if (document.querySelector('.coaching-sidebar')) {
            document.querySelector('.coaching-sidebar').classList.remove('open');
          }
          break;
        case 'coach':
          // Show coaching panel
          if (document.querySelector('.coaching-sidebar')) {
            document.querySelector('.coaching-sidebar').classList.add('open');
          }
          document.querySelector('.sidebar').classList.remove('expanded');
          break;
        case 'tools':
          // Show tools menu (session feedback, download, etc.)
          showMobileToolsMenu();
          break;
      }
    });
  });
}

// Show mobile tools menu
function showMobileToolsMenu() {
  // Create a modal menu for tools
  const toolsMenu = document.createElement('div');
  toolsMenu.className = 'mobile-tools-menu';
  toolsMenu.innerHTML = `
    <div class="tools-backdrop"></div>
    <div class="tools-panel">
      <div class="tools-header">
        <h3>Tools</h3>
        <span class="material-icons close-btn">close</span>
      </div>
      <div class="tools-list">
        <div class="tool-item" id="mobile-feedback-btn">
          <span class="material-icons">assessment</span>
          <span>MITI Analysis</span>
        </div>
        <div class="tool-item" id="mobile-download-btn">
          <span class="material-icons">download</span>
          <span>Download Conversation</span>
        </div>
        <div class="tool-item" id="mobile-speech-btn">
          <span class="material-icons">volume_up</span>
          <span>Toggle Speech</span>
        </div>
        <div class="tool-item" id="mobile-end-btn">
          <span class="material-icons">exit_to_app</span>
          <span>End Session</span>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(toolsMenu);
  
  // Animate in
  setTimeout(() => toolsMenu.classList.add('active'), 10);
  
  // Add event listeners
  toolsMenu.querySelector('.close-btn').addEventListener('click', () => {
    toolsMenu.classList.remove('active');
    setTimeout(() => toolsMenu.remove(), 300);
  });
  
  toolsMenu.querySelector('.tools-backdrop').addEventListener('click', () => {
    toolsMenu.classList.remove('active');
    setTimeout(() => toolsMenu.remove(), 300);
  });
  
  // Connect tool buttons to functions
  document.getElementById('mobile-feedback-btn').addEventListener('click', () => {
    generateSessionFeedback();
    toolsMenu.classList.remove('active');
    setTimeout(() => toolsMenu.remove(), 300);
  });
  
  document.getElementById('mobile-download-btn').addEventListener('click', () => {
    downloadConversation();
    toolsMenu.classList.remove('active');
    setTimeout(() => toolsMenu.remove(), 300);
  });
  
  document.getElementById('mobile-speech-btn').addEventListener('click', () => {
    toggleSpeech();
    toolsMenu.classList.remove('active');
    setTimeout(() => toolsMenu.remove(), 300);
  });
  
  document.getElementById('mobile-end-btn').addEventListener('click', () => {
    endSession();
    toolsMenu.classList.remove('active');
    setTimeout(() => toolsMenu.remove(), 300);
  });
}

// Setup mobile gestures
function setupMobileGestures() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  
  // Basic touch gesture detection
  let touchStartY = 0;
  let touchEndY = 0;
  
  // For persona sidebar
  sidebar.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
  });
  
  sidebar.addEventListener('touchmove', function(e) {
    touchEndY = e.touches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    
    // Swipe up to expand, down to collapse
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0) {
        // Swipe up - expand
        sidebar.classList.add('expanded');
      } else {
        // Swipe down - collapse
        sidebar.classList.remove('expanded');
      }
      touchStartY = touchEndY;
    }
  });
  
  // Add a visible handle for the drawer if not already there
  if (!sidebar.querySelector('.sidebar-handle')) {
    const handle = document.createElement('div');
    handle.className = 'sidebar-handle';
    sidebar.prepend(handle);
  }
  
  // For chat messages - add pull to refresh
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  let refreshing = false;
  
  chatMessages.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
  });
  
  chatMessages.addEventListener('touchmove', function(e) {
    if (refreshing) return;
    
    touchEndY = e.touches[0].clientY;
    const deltaY = touchEndY - touchStartY;
    
    // Pull down when already at top
    if (chatMessages.scrollTop === 0 && deltaY > 50) {
      refreshing = true;
      showRefreshIndicator();
      
      // Simulate chat refresh
      setTimeout(() => {
        hideRefreshIndicator();
        refreshing = false;
      }, 1000);
    }
  });
}

// Show pull-to-refresh indicator
function showRefreshIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'refresh-indicator';
  indicator.innerHTML = '<span class="material-icons rotating">refresh</span>';
  document.getElementById('chat-messages').prepend(indicator);
}

// Hide pull-to-refresh indicator
function hideRefreshIndicator() {
  const indicator = document.getElementById('refresh-indicator');
  if (indicator) {
    indicator.classList.add('fade-out');
    setTimeout(() => indicator.remove(), 300);
  }
}

// Setup mobile form
function setupMobileForm() {
  const form = document.querySelector('.create-persona-form');
  if (!form) return;
  
  const formGroups = form.querySelectorAll('.form-group');
  if (formGroups.length === 0) return;
  
  // Create stepper container
  const stepper = document.createElement('div');
  stepper.className = 'form-stepper';
  
  // Create steps from form groups
  const steps = [];
  let currentStep = 0;
  
  // Group form elements into 2 per step
  for (let i = 0; i < formGroups.length; i += 2) {
    const step = document.createElement('div');
    step.className = 'form-step';
    
    // Add current group
    const clonedGroup1 = formGroups[i].cloneNode(true);
    step.appendChild(clonedGroup1);
    
    // Add next group if available
    if (formGroups[i + 1]) {
      const clonedGroup2 = formGroups[i + 1].cloneNode(true);
      step.appendChild(clonedGroup2);
    }
    
    stepper.appendChild(step);
    steps.push(step);
  }
  
  // Hide original form groups
  formGroups.forEach(group => group.style.display = 'none');
  
  // Add navigation
  const nav = document.createElement('div');
  nav.className = 'stepper-nav';
  nav.innerHTML = `
    <button type="button" class="secondary-btn" id="prev-step" disabled>Back</button>
    <div class="step-indicator">Step 1 of ${steps.length}</div>
    <button type="button" class="secondary-btn" id="next-step">Next</button>
  `;
  
  // Add to form
  form.appendChild(stepper);
  form.appendChild(nav);
  
  // Move submit button to nav for last step
  const submitBtn = document.getElementById('create-persona-btn');
  if (submitBtn) {
    submitBtn.style.display = 'none'; // Hide original
    
    const submitClone = submitBtn.cloneNode(true);
    submitClone.style.display = 'none';
    nav.appendChild(submitClone);
    
    // Handle navigation
    document.getElementById('next-step').addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        updateStepperState();
      }
    });
    
    document.getElementById('prev-step').addEventListener('click', () => {
      if (currentStep > 0) {
        currentStep--;
        updateStepperState();
      }
    });
    
    // Update stepper display based on current step
    function updateStepperState() {
      stepper.style.transform = `translateX(-${currentStep * 100}%)`;
      
      // Update indicator
      document.querySelector('.step-indicator').textContent = `Step ${currentStep + 1} of ${steps.length}`;
      
      // Update buttons
      document.getElementById('prev-step').disabled = currentStep === 0;
      
      // Show submit on last step, otherwise next
      if (currentStep === steps.length - 1) {
        document.getElementById('next-step').style.display = 'none';
        submitClone.style.display = 'block';
      } else {
        document.getElementById('next-step').style.display = 'block';
        submitClone.style.display = 'none';
      }
    }
    
    // Connect form submit functionality
    submitClone.addEventListener('click', () => {
      // Gather values from cloned fields
      const scenarioType = stepper.querySelector('#scenario-type').value;
      const changeReadiness = stepper.querySelector('#change-readiness').value;
      const additionalContext = stepper.querySelector('#additional-context').value;
      const communicationStyle = stepper.querySelector('#communication-style')?.value || '';
      
      // Call the original function with these values
      createPersonaWithValues(scenarioType, changeReadiness, additionalContext, communicationStyle);
    });
  }
}

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
        
        // Check for updates every 60 minutes
        setInterval(() => {
          registration.update();
          console.log('Checking for service worker updates...');
        }, 60 * 60 * 1000);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}