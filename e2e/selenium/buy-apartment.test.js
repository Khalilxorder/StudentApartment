const { Builder, By, Key, until } = require('selenium-webdriver');
require('chromedriver');
const chrome = require('selenium-webdriver/chrome');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function runTest() {
  const options = new chrome.Options();
  // Run headless for CI; comment out for debugging locally
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    console.log(`Opening login page: ${baseUrl}/login`);
    await driver.get(`${baseUrl}/login`);

    // Login
    const emailInput = await driver.wait(until.elementLocated(By.id('email-address')), 5000);
    await emailInput.sendKeys('student1@test.com');

    const passwordInput = await driver.findElement(By.id('password'));
    await passwordInput.sendKeys('Test123!');

    const submitButton = await driver.findElement(By.css('button[type="submit"]'));
    await submitButton.click();

    // Wait for redirect to dashboard or profile
    await driver.wait(async () => {
      const url = await driver.getCurrentUrl();
      return url.includes('/dashboard') || url.includes('/owner') || url.includes('/');
    }, 10000);
    console.log('Logged in');

    // Navigate to home or apartment listing
    await driver.get(`${baseUrl}/`);

    // Wait for apartment cards
    await driver.wait(until.elementLocated(By.css('[data-testid="apartment-card"]')), 10000);
    console.log('Apartment cards present');

    const firstCard = await driver.findElement(By.css('[data-testid="apartment-card"]'));
    await driver.executeScript('arguments[0].scrollIntoView(true);', firstCard);
    await firstCard.click();

    // Wait for apartment details to load
    await driver.wait(until.elementLocated(By.xpath("//button[contains(., 'Book Now & Pay Deposit') or contains(., 'Book Now') or contains(., 'Pay Now')]")), 10000);
    console.log('On apartment details page');

    // Click Book Now
    const bookButton = await driver.findElement(By.xpath("//button[contains(., 'Book Now & Pay Deposit') or contains(., 'Book Now') or contains(., 'Pay Now')]") );
    await bookButton.click();

    // Wait for payment modal overlay to appear (one of several possible texts)
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(),'Secure Payment') or contains(text(),'Payment System Unavailable') or contains(text(),'Initializing Payment') or contains(text(),'Login Required') or contains(text(),'Payment Error') or contains(text(),'Payment') ]")), 10000);
    console.log('Payment modal appeared');

    // Now test chat with owner
    const chatButton = await driver.findElement(By.xpath("//button[contains(., 'Chat with Owner') or contains(., 'Chat with owner') or contains(., 'Message Owner')]") );
    await chatButton.click();

    // Wait for chat overlay
    await driver.wait(until.elementLocated(By.xpath("//h3[contains(., 'Chat about:') or contains(., 'Property Owner')]")), 10000);
    console.log('Chat overlay opened');

    // Send a message
    const messageInput = await driver.wait(until.elementLocated(By.css("input[placeholder='Type your message...']")), 5000);
    await messageInput.sendKeys('Hello, I am interested in booking this apartment.', Key.RETURN);

    // Wait for message to appear in chat area
    await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Hello, I am interested in booking this apartment.')]")), 5000);
    console.log('Message sent and visible in chat');

    console.log('Selenium E2E test completed successfully');
    await driver.quit();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    await driver.takeScreenshot().then((data) => {
      const fs = require('fs');
      const path = 'selenium-failure.png';
      fs.writeFileSync(path, Buffer.from(data, 'base64'));
      console.log('Screenshot saved to', path);
    }).catch(() => {});
    await driver.quit();
    process.exit(1);
  }
}

runTest();
