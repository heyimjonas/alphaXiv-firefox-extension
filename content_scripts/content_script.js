console.log("Content script loaded");

function extractPaperId(url) {
  const pdfRegex = /arxiv\.org\/pdf\/((?:hep-th|math\/)?[0-9]+(?:\.[0-9]+)?(?:v[0-9]+)?)/i;
  const match = url.match(pdfRegex);

  if (match) {
    let id = match[1];
    id = id.replace('.pdf', ''); // Remove `.pdf` extension
    return {
      paperId: id,
      includesHepTh: id.startsWith('hep-th'),
      includesMath: id.startsWith('math'),
    };
  }
  return null;
}

// Main function for handling AlphaXiv functionality
function handleAlphaXivIntegration() {
  console.log("Handling AlphaXiv Integration");
  browser.storage.sync.get(['user_preferences']).then((result) => {
    const prefs = result.user_preferences || {
      showAlphaXiv: true,
      alertWhenActivity: false,
      ntab: false,
    };
    console.log("User Preferences:", prefs);
    const url = document.location.href;
    console.log("Current URL:", url);

    if (url.includes('/abs/')) {
      console.log("Handling Abstract Page");
      handleAbstractPage(url, prefs);
    } else if (url.includes('/pdf/')) {
      console.log("Handling PDF Page");
      handlePDFPage(url, prefs);
    }
  });
}

// Handle abstract page logic
function handleAbstractPage(url, prefs) {
  console.log("Checking for submission history");
  const hasSubmissionHistory = document.getElementsByClassName('submission-history').length > 0;
  console.log("Has Submission History:", hasSubmissionHistory);
  if (!hasSubmissionHistory) return;

  let paperId = extractPaperIdFromAbs(url);
  if (!paperId) {
    console.log("No Paper ID extracted from Abstract URL");
    return;
  }

  console.log("Sending message for Abstract Page:", paperId);
  browser.runtime.sendMessage({
    user_preferences: prefs,
    purpose: 'numcomments',
    paperId: paperId.paperId,
    includesHepTh: paperId.includesHepTh,
    includesMath: paperId.includesMath,
  }).then(response => {
    if (response && response.purpose === 'numcomments') {
      handleCommentsMessage(response);
    } else if (response && response.error) {
      console.error("Error from background script:", response.error);
    }
  }).catch(error => {
    console.error("Failed to send message:", error);
  });
}

// Handle PDF page logic
function handlePDFPage(url, prefs) {
  const paperInfo = extractPaperId(url);
  if (!paperInfo) {
    console.log("No Paper ID extracted from PDF URL");
    return;
  }

  console.log('PDF detected:', paperInfo);

  // Inject a popup for AlphaXiv after ensuring the PDF viewer is ready
  waitForElement('body', () => {
    injectPDFPopup(`https://alphaxiv.org/abs/${paperInfo.paperId}`);
  });

  browser.runtime.sendMessage({
    user_preferences: prefs,
    purpose: 'numcomments',
    paperId: paperInfo.paperId,
    webUrl: document.location.href,
    includesHepTh: paperInfo.includesHepTh,
    includesMath: paperInfo.includesMath,
  }).then(response => {
    if (response && response.purpose === 'numcomments') {
      handleCommentsMessage(response);
    } else if (response && response.error) {
      console.error("Error from background script:", response.error);
    }
  }).catch(error => {
    console.error("Failed to send message:", error);
  });
}

// Extract paper ID for /abs/ URLs
function extractPaperIdFromAbs(url) {
  const path = url.split('/abs/')[1];
  if (!path) return null;

  let includesHepTh = path.startsWith('hep-th/');
  let includesMath = path.startsWith('math/');
  return {
    paperId: path.split('/').join('_'),
    includesHepTh,
    includesMath,
  };
}

// Function to wait for a specific element to be available in the DOM
function waitForElement(selector, callback) {
  const observer = new MutationObserver((mutations, obs) => {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Element "${selector}" found`);
      callback();
      obs.disconnect();
    }
  });

  observer.observe(document, {
    childList: true,
    subtree: true
  });

  // Optional timeout after which the observer stops
  setTimeout(() => {
    console.log(`Timeout waiting for element "${selector}"`);
    observer.disconnect();
  }, 10000);
}

// Inject popup for PDF viewer
function injectPDFPopup(alphaXivUrl) {
  console.log("Injecting PDF Popup:", alphaXivUrl);
  if (document.getElementById('alphaXiv-popup')) {
    console.log("Popup already exists");
    return;
  }

  const popup = document.createElement('div');
  popup.id = 'alphaXiv-popup';
  popup.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    padding: 10px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: Arial, sans-serif;
    opacity: 0.95;
  `;
  popup.innerHTML = `
    <p style="margin: 0;">View this paper on <strong>AlphaXiv</strong>:</p>
    <a href="${alphaXivUrl}" target="_blank" style="color: blue; text-decoration: underline;">${alphaXivUrl}</a>
  `;

  document.body.appendChild(popup);
  console.log("Popup injected");

  // Optional: Remove the popup after a longer duration or provide a close button
  setTimeout(() => {
    if (popup) {
      popup.remove();
      console.log("Popup removed after timeout");
    }
  }, 30000); // 30 seconds
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  console.log("Received message:", message);
  if (message.purpose === 'numcomments') {
    handleCommentsMessage(message);
  }
});

// Handle incoming messages related to comments
function handleCommentsMessage(message) {
  const { commentsNum, returnVersion, hasClaimedAuthorship } = message;
  const url = document.location.href;
  const isPDF = url.includes('/pdf/');

  const alphaXivUrl = isPDF
    ? `https://alphaxiv.org/pdf/${message.paperId}${returnVersion > 0 ? 'v' + returnVersion : ''}`
    : `https://alphaxiv.org/abs/${message.paperId}${returnVersion > 0 ? 'v' + returnVersion : ''}`;

  console.log("Handling comments message:", message);

  if (
    message.user_preferences.alertWhenActivity &&
    (commentsNum > 0 || hasClaimedAuthorship)
  ) {
    injectAlert(commentsNum, hasClaimedAuthorship, alphaXivUrl);
  }

  if (message.user_preferences.showAlphaXiv) {
    injectLink(commentsNum, alphaXivUrl);
  }
}

// Inject alert UI
function injectAlert(commentsNum, hasClaimedAuthorship, alphaXivUrl) {
  console.log("Injecting alert");
  if (document.getElementById('alphaXiv-alert')) {
    console.log("Alert already exists");
    return;
  }

  const alertContainer = document.createElement('div');
  alertContainer.id = 'alphaXiv-alert';
  alertContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    opacity: 0.95;
  `;
  const alertText = `
    ${hasClaimedAuthorship ? 'This paper has verified author activity!' : ''}
    ${commentsNum > 0 ? `${commentsNum} comment${commentsNum > 1 ? 's' : ''} available.` : ''}
  `.trim();

  alertContainer.innerHTML = `
    <p>${alertText}</p>
    <a href="${alphaXivUrl}" target="_blank" style="color: blue; text-decoration: underline;">View on AlphaXiv</a>
    <button id="close-alert" style="margin-left: 10px; cursor: pointer;">&times;</button>
  `;
  document.body.appendChild(alertContainer);
  console.log("Alert injected");

  // Add event listener to close the alert
  document.getElementById('close-alert').addEventListener('click', () => {
    alertContainer.remove();
    console.log("Alert manually removed");
  });

  // Optional: Automatically remove the alert after a certain time
  setTimeout(() => {
    if (alertContainer) {
      alertContainer.remove();
      console.log("Alert removed after timeout");
    }
  }, 10000); // 10 seconds
}

// Inject link next to the PDF download button
function injectLink(commentsNum, alphaXivUrl) {
  // Fix: Wait for the download element to be available
  waitForElement('.download-pdf, a[href*="/pdf/"]', () => {
    let downloadPdfElement = document.getElementsByClassName('download-pdf')[0] 
      || document.querySelector('a[href*="/pdf/"]');
    
    if (!downloadPdfElement) return;
    
    const container = document.createElement('li');
    const link = document.createElement('a');
    link.href = alphaXivUrl;
    link.innerText = commentsNum > 0 ? `AlphaXiv (${commentsNum})` : 'AlphaXiv';
    link.className = 'alphaXiv-link';
    
    container.appendChild(link);
    downloadPdfElement.parentElement.appendChild(container);
  });
}

// Add this helper function if not already present
function waitForElement(selector, callback, timeout = 10000) {
  if (document.querySelector(selector)) {
    callback();
    return;
  }
  
  const observer = new MutationObserver((_, obs) => {
    const element = document.querySelector(selector);
    if (element) {
      obs.disconnect();
      callback();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(() => {
    observer.disconnect();
  }, timeout);
}

// Wait until the DOM has fully rendered before running the integration handler
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded and parsed");
  setTimeout(() => {
    handleAlphaXivIntegration();
  }, 1000); // small delay
});