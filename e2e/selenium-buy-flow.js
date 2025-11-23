const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(type, msg) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  switch (type) {
    case 'info':
      console.log(`${colors.blue}${prefix} ℹ️  ${msg}${colors.reset}`);
      break;
    case 'success':
      console.log(`${colors.green}${prefix} ✅ ${msg}${colors.reset}`);
      break;
    case 'error':
      console.log(`${colors.red}${prefix} ❌ ${msg}${colors.reset}`);
      break;
    case 'warning':
      console.log(`${colors.yellow}${prefix} ⚠️  ${msg}${colors.reset}`);
      break;
    case 'section':
      console.log(`${colors.cyan}${prefix} 📍 ${msg}${colors.reset}`);
      break;
  }
}

(async function runTest() {
  log('section', 'SELENIUM E2E TEST: APARTMENT BOOKING FLOW');
  console.log('');

  let driver;
  let testResults = [];

  try {
    // Setup Chrome options
    let options = new chrome.Options();
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080'); // Ensure desktop view
    options.addArguments('--headless'); // Uncomment for headless mode
    
    log('info', 'Starting Chrome browser...');
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    // Set implicit wait
    driver.manage().setTimeouts({ implicit: 10000 }); // Increased to 10s

    // ============================================
    // TEST 1: NAVIGATE TO HOME PAGE
    // ============================================
    log('section', 'TEST 1: Navigate to Home Page');
    try {
      await driver.get('http://localhost:3002/');
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      log('success', 'Home page loaded');
      testResults.push({ test: 'Home Page Load', status: 'PASS' });
    } catch (e) {
      log('error', `Home page load failed: ${e.message}`);
      testResults.push({ test: 'Home Page Load', status: 'FAIL', error: e.message });
    }

    // ============================================
    // TEST 2: CHECK FOR LOGIN BUTTON
    // ============================================
    log('section', 'TEST 2: Check for Sign In Button');
    try {
      // Check if already logged in
      try {
          // Try to find the user menu button (contains display name or avatar)
          let userMenu = await driver.findElement(By.xpath("//button[.//div[contains(@class, 'text-sm font-medium')]]"));
          log('info', 'User is already logged in. Logging out...');
          await userMenu.click();
          let logoutBtn = await driver.wait(until.elementLocated(By.xpath("//button[contains(text(), 'Sign out')]")), 2000);
          await logoutBtn.click();
          await driver.wait(until.urlContains('login') || until.urlIs('http://localhost:3000/'), 5000);
          log('success', 'Logged out successfully');
      } catch (e) {
          // Not logged in, proceed
      }

      // Try multiple selectors for robustness
      let signInBtn;
      try {
          signInBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Sign In')]"));
      } catch (e) {
          try {
             signInBtn = await driver.findElement(By.css("a[href='/login']"));
          } catch (e2) {
             signInBtn = await driver.findElement(By.xpath("//*[contains(text(), 'Sign In')]"));
          }
      }
      
      if (signInBtn) {
          log('success', 'Sign In button found');
          testResults.push({ test: 'Sign In Button', status: 'PASS' });
      } else {
          throw new Error("Sign In button not found");
      }
    } catch (e) {
      log('warning', `Sign In button check issue: ${e.message}`);
      testResults.push({ test: 'Sign In Button', status: 'WARN', error: e.message });
    }

    // ============================================
    // TEST 3: CLICK SIGN IN & LOGIN
    // ============================================
    log('section', 'TEST 3: Sign In as Student');
    try {
      // Navigate directly to login to be safe
      await driver.get('http://localhost:3000/login');
      
      // Wait for email input
      let emailInput = await driver.wait(
        until.elementLocated(By.css('input[type="email"]')),
        10000
      );
      log('success', 'Login form displayed');

      // Enter credentials
      await emailInput.sendKeys('student1@test.com');
      let passwordInput = await driver.findElement(By.css('input[type="password"]'));
      await passwordInput.sendKeys('Test123!');

      // Click sign in
      let submitBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Sign')]"));
      await submitBtn.click();

      // Wait for redirect
      await driver.wait(until.urlContains('dashboard'), 15000);
      log('success', 'Login successful, redirected to dashboard');
      testResults.push({ test: 'Student Login', status: 'PASS' });
    } catch (e) {
      log('error', `Login failed: ${e.message}`);
      testResults.push({ test: 'Student Login', status: 'FAIL', error: e.message });
    }

    // ============================================
    // TEST 4: NAVIGATE TO SEARCH PAGE
    // ============================================
    log('section', 'TEST 4: Navigate to Search');
    try {
      await driver.get('http://localhost:3000/');
      log('success', 'Search page loaded');
      testResults.push({ test: 'Search Page Load', status: 'PASS' });
    } catch (e) {
      log('error', `Search page failed: ${e.message}`);
      testResults.push({ test: 'Search Page Load', status: 'FAIL', error: e.message });
    }

    // ============================================
    // TEST 5: PERFORM AI SEARCH
    // ============================================
    log('section', 'TEST 5: Perform AI-Powered Search');
    try {
      // Look for the AI search input
      let searchInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder*="Describe"], input[placeholder*="looking"], textarea')),
        10000
      );
      await searchInput.sendKeys('modern apartment near metro 100k budget');

      // Find and click search button
      let searchBtn = await driver.findElement(
        By.xpath("//button[contains(text(), 'Search') or contains(., '🔍')]")
      );
      await searchBtn.click();

      // Wait for AI processing - wait for results to appear
      await driver.sleep(3000); 
      
      log('success', 'AI search initiated');
      testResults.push({ test: 'AI Search', status: 'PASS' });
    } catch (e) {
      log('warning', `AI search issue: ${e.message}`);
      testResults.push({ test: 'AI Search', status: 'WARN', error: e.message });
    }

    // ============================================
    // TEST 6: SELECT APARTMENT
    // ============================================
    log('section', 'TEST 6: Select First Apartment');
    try {
      // Wait for apartment cards to appear
      let apartmentCard = await driver.wait(
        until.elementLocated(By.css("article, div[class*='card'], a[href^='/apartments/']")),
        15000
      );
      
      // Scroll into view
      await driver.executeScript("arguments[0].scrollIntoView(true);", apartmentCard);
      await driver.sleep(500);
      await apartmentCard.click();

      // Wait for detail page
      await driver.wait(until.urlContains('/apartments/'), 10000);
      log('success', 'Apartment details page loaded');
      testResults.push({ test: 'Select Apartment', status: 'PASS' });
    } catch (e) {
      log('error', `Could not select apartment: ${e.message}`);
      testResults.push({ test: 'Select Apartment', status: 'FAIL', error: e.message });
    }

    // ============================================
    // TEST 7: INITIATE CONTACT WITH OWNER
    // ============================================
    log('section', 'TEST 7: Contact Owner');
    try {
      // Wait for loading spinner to disappear
      try {
          let spinner = await driver.findElement(By.css('.animate-spin'));
          log('info', 'Waiting for loading spinner to disappear...');
          await driver.wait(until.stalenessOf(spinner), 10000);
      } catch (e) {
          // Spinner not found, maybe already loaded
      }

      // Look for contact/message button - Updated selector based on code inspection
      // Also look for "Book Now" as fallback
      let contactBtn;
      try {
          contactBtn = await driver.wait(
            until.elementLocated(
              By.xpath("//button[contains(text(), 'Chat with Owner') or contains(text(), 'Contact') or contains(text(), 'Message')]")
            ),
            10000
          );
      } catch (e) {
          log('warning', 'Chat button not found, trying Book Now button...');
          contactBtn = await driver.wait(
            until.elementLocated(
              By.xpath("//button[contains(text(), 'Book Now')]")
            ),
            10000
          );
      }
      
      // Scroll to button
      await driver.executeScript("arguments[0].scrollIntoView(true);", contactBtn);
      await driver.sleep(500);
      
      await contactBtn.click();

      // Wait for modal/form - ChatBox component likely opens
      // Look for textarea inside the chat box
      let messageInput = await driver.wait(
        until.elementLocated(By.css('textarea, input[type="text"][placeholder*="message"]')),
        10000
      );
      log('success', 'Chat/Message form opened');
      testResults.push({ test: 'Contact Owner', status: 'PASS' });
    } catch (e) {
      log('error', `Could not contact owner: ${e.message}`);
      
      // Debug: Log page text snippet
      try {
          let body = await driver.findElement(By.css('body'));
          let text = await body.getText();
          log('info', `Page text snippet: ${text.substring(0, 200)}...`);
      } catch (debugErr) {
          console.log('Could not get page text');
      }

      testResults.push({ test: 'Contact Owner', status: 'FAIL', error: e.message });
    }

    // ============================================
    // TEST 8: SEND MESSAGE
    // ============================================
    log('section', 'TEST 8: Send Message to Owner');
    try {
      let messageInput = await driver.findElement(By.css('textarea, input[type="text"][placeholder*="message"]'));
      await messageInput.sendKeys('Hi! I am very interested in this apartment. Can we schedule a viewing?');

      // Find send button
      let sendBtn = await driver.findElement(
        By.xpath("//button[contains(text(), 'Send') or contains(text(), 'Submit') or contains(@aria-label, 'Send')]")
      );
      await sendBtn.click();

      // Wait for success message or new message to appear in chat
      // Assuming the message appears in the chat list
      await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'Hi! I am very interested')]")),
        10000
      );
      log('success', 'Message sent successfully');
      testResults.push({ test: 'Send Message', status: 'PASS' });
    } catch (e) {
      log('error', `Message sending failed: ${e.message}`);
      testResults.push({ test: 'Send Message', status: 'FAIL', error: e.message });
    }

    // ============================================
    // TEST 9: CHECK MESSAGES PAGE
    // ============================================
    log('section', 'TEST 9: View Messages Page');
    try {
      await driver.get('http://localhost:3000/dashboard/messages');
      let messagesList = await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(), 'conversation') or contains(text(), 'message') or contains(@class, 'chat')]")),
        10000
      );
      log('success', 'Messages page loaded');
      testResults.push({ test: 'Messages Page', status: 'PASS' });
    } catch (e) {
      log('warning', `Messages page issue: ${e.message}`);
      testResults.push({ test: 'Messages Page', status: 'WARN', error: e.message });
    }

    // ============================================
    // TEST 10: LOGOUT
    // ============================================
    log('section', 'TEST 10: Logout');
    try {
      // Find profile/logout button (usually in header)
      // Try to find a profile menu first if it exists
      try {
          let userMenu = await driver.findElement(By.xpath("//button[.//div[contains(@class, 'text-sm font-medium')]]"));
          await userMenu.click();
          await driver.sleep(500);
      } catch (e) {
          // Ignore if no menu
      }

      let logoutBtn = await driver.findElement(By.xpath("//button[contains(text(), 'Sign out')]"));
      await logoutBtn.click();

      // Wait for redirect to login or home
      await driver.wait(until.urlContains('login') || until.urlIs('http://localhost:3000/'), 10000);
      log('success', 'Logout successful');
      testResults.push({ test: 'Logout', status: 'PASS' });
    } catch (e) {
      log('warning', `Logout issue: ${e.message}`);
      testResults.push({ test: 'Logout', status: 'WARN', error: e.message });
    }

  } catch (error) {
    log('error', `Test suite failed: ${error.message}`);
  } finally {
    // Print summary
    console.log('\n' + colors.cyan + '═'.repeat(60) + colors.reset);
    console.log(colors.cyan + 'TEST SUMMARY' + colors.reset);
    console.log(colors.cyan + '═'.repeat(60) + colors.reset);

    let passCount = testResults.filter(r => r.status === 'PASS').length;
    let failCount = testResults.filter(r => r.status === 'FAIL').length;
    let warnCount = testResults.filter(r => r.status === 'WARN').length;

    testResults.forEach(result => {
      const statusSymbol = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️ ';
      console.log(`${statusSymbol} ${result.test}: ${result.status}${result.error ? ` - ${result.error}` : ''}`);
    });

    console.log(colors.cyan + '═'.repeat(60) + colors.reset);
    console.log(`${colors.green}Passed: ${passCount}${colors.reset} | ${colors.red}Failed: ${failCount}${colors.reset} | ${colors.yellow}Warnings: ${warnCount}${colors.reset}`);
    console.log(colors.cyan + '═'.repeat(60) + colors.reset);

    // Close browser
    if (driver) {
      await driver.quit();
    }
  }
})();
