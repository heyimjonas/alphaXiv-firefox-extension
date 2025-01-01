console.log("Background script loaded");

// Set default preferences
browser.runtime.onInstalled.addListener(() => {
  browser.storage.sync.set({
    user_preferences: {
      showAlphaXiv: true,
      // Feature flags for future implementation
      // alertWhenActivity: false,
      // ntab: false,
    },
  })
    .then(() => console.log("Default preferences set."))
    .catch((err) => console.error("Error setting default preferences:", err));
});

// Handle messages from content script
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.purpose === "numcomments") {
    try {
      const responseMessage = await handleNumCommentsMessage(message);
      return Promise.resolve(responseMessage);
    } catch (error) {
      console.error("Error in onMessage listener:", error);
      return Promise.resolve({ error: error.message });
    }
  }
  return true;
});

// Handle numcomments messages
async function handleNumCommentsMessage(message) {
  const { paperId, includesHepTh, includesMath, user_preferences } = message;

  try {
    const paperInfo = await fetchPaperInfo(paperId, includesHepTh, includesMath);
    const prefs = user_preferences || await getStoredPreferences();

    /* Disabled features
    if (prefs.ntab && webUrl && webUrl.includes('/pdf/')) {
      // New tab opening logic here
    }
    */

    return {
      purpose: "numcomments",
      user_preferences: prefs,
      commentsNum: paperInfo.numQuestions,
      returnVersion: paperInfo.returnVersion,
      hasClaimedAuthorship: paperInfo.hasClaimedAuthorship,
      paperId: paperId
    };
  } catch (error) {
    console.error("Error:", error);
    return { error: error.message };
  }
}

// API calls
async function fetchPaperInfo(paperId, includesHepTh, includesMath) {
  const prefix = includesHepTh ? 'hep-th_' : includesMath ? 'math_' : '';
  const apiUrl = `https://api.alphaxiv.org/v1/papers/getcrxpaperinfo/${prefix}${paperId}`;
  
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  return response.json();
}

// Get stored preferences
async function getStoredPreferences() {
  const result = await browser.storage.sync.get(['user_preferences']);
  return result.user_preferences || {
    showAlphaXiv: true,
    // alertWhenActivity: false,
    // ntab: false,
  };
}