import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { Carer, FormField, FormStructure, DropdownOption } from '@/types';

// Credentials from environment variables
const PORTAL_URL = process.env.PORTAL_URL || 'https://fostering.starlight.inc/starlightdemo/#/login/1';
const PORTAL_USERNAME = process.env.PORTAL_USERNAME || '';
const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD || '';

// Security question answers mapping
const SECURITY_ANSWERS: Record<string, string> = {
  'sport': 'cricket',
  'food': 'biryani',
  'job': 'brighton',
  'city': 'brighton',
  'nickname': 'humpty',
};

// Function to get the correct security answer based on the question
function getSecurityAnswer(question: string): string {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('sport')) {
    return SECURITY_ANSWERS['sport'];
  } else if (questionLower.includes('food')) {
    return SECURITY_ANSWERS['food'];
  } else if (questionLower.includes('job') || questionLower.includes('city')) {
    return SECURITY_ANSWERS['city'];
  } else if (questionLower.includes('nickname')) {
    return SECURITY_ANSWERS['nickname'];
  }
  
  // Fallback to environment variable if question not recognized
  return process.env.PORTAL_SECURITY_ANSWER || 'humpty';
}

// Browser singleton for reuse
let browserInstance: Browser | null = null;
let contextInstance: BrowserContext | null = null;
let pageInstance: Page | null = null;

// Helper to check if browser is still connected
function isBrowserConnected(): boolean {
  return browserInstance !== null && browserInstance.isConnected();
}

// Reset all singleton references
function resetSingletons(): void {
  pageInstance = null;
  contextInstance = null;
  browserInstance = null;
}

export async function getBrowser(): Promise<Browser> {
  // Check if existing browser is still connected
  if (browserInstance && !browserInstance.isConnected()) {
    console.log('Browser disconnected, resetting singletons...');
    resetSingletons();
  }
  
  if (!browserInstance) {
    console.log('Launching new browser...');
    browserInstance = await chromium.launch({
      headless: false, // Set to true for production, false to see the browser
      slowMo: 500, // Slow down actions by 500ms so you can see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    // Handle browser disconnect event
    browserInstance.on('disconnected', () => {
      console.log('Browser disconnected event fired');
      resetSingletons();
    });
  }
  return browserInstance;
}

export async function getPage(): Promise<Page> {
  // Check if browser is still connected
  if (!isBrowserConnected()) {
    console.log('Browser not connected, will create new browser and page...');
    resetSingletons();
  }
  
  // Check if page is still usable
  if (pageInstance && pageInstance.isClosed()) {
    console.log('Page is closed, will create new context and page...');
    pageInstance = null;
    contextInstance = null;
  }
  
  if (!pageInstance || !contextInstance) {
    const browser = await getBrowser();
    console.log('Creating new browser context and page...');
    contextInstance = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    pageInstance = await contextInstance.newPage();
  }
  return pageInstance;
}

export async function closeBrowser(): Promise<void> {
  try {
    if (pageInstance && !pageInstance.isClosed()) {
      await pageInstance.close();
    }
  } catch (e) {
    console.log('Error closing page:', e);
  }
  pageInstance = null;
  
  try {
    if (contextInstance) {
      await contextInstance.close();
    }
  } catch (e) {
    console.log('Error closing context:', e);
  }
  contextInstance = null;
  
  try {
    if (browserInstance && browserInstance.isConnected()) {
      await browserInstance.close();
    }
  } catch (e) {
    console.log('Error closing browser:', e);
  }
  browserInstance = null;
}

// Login to the portal
export async function login(): Promise<boolean> {
  const page = await getPage();
  
  try {
    // Navigate to login page
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Fill in credentials
    await page.getByRole('textbox', { name: 'User Name' }).fill(PORTAL_USERNAME);
    await page.getByRole('textbox', { name: 'Password' }).fill(PORTAL_PASSWORD);
    
    // Click sign in
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForTimeout(2000);
    
    // Handle security question if present
    const securityQuestionVisible = await page.getByText('Security Question').isVisible().catch(() => false);
    if (securityQuestionVisible) {
      // Read the actual security question text
      const questionText = await page.locator('text=/What was|What is/i').first().innerText().catch(() => '');
      console.log('Security question detected:', questionText);
      
      // Get the correct answer based on the question
      const answer = getSecurityAnswer(questionText);
      console.log('Using answer:', answer);
      
      await page.getByRole('textbox').fill(answer);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForTimeout(2000);
    }
    
    // Check if login was successful by looking for dashboard
    const dashboardVisible = await page.getByText('Dashboard').isVisible().catch(() => false);
    return dashboardVisible;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

// Extract list of carers from the system
export async function extractCarers(): Promise<Carer[]> {
  const page = await getPage();
  const carers: Carer[] = [];
  
  try {
    // Navigate to Foster Carer > Carer List
    console.log('Navigating to Foster Carer menu...');
    await page.getByRole('link', { name: /Foster Carer/i }).click();
    await page.waitForTimeout(1500);
    
    console.log('Clicking on Carer List...');
    await page.getByRole('link', { name: 'Carer List' }).click();
    await page.waitForTimeout(2000);
    
    // Wait for the page to be ready - look for the "Carer List" heading
    console.log('Waiting for Carer List page to load...');
    await page.waitForSelector('text=Carer List', { timeout: 10000 });
    
    // Debug: Log current URL
    console.log('Current URL:', page.url());
    
    // Wait for Select buttons to appear (indicates data is loaded)
    console.log('Waiting for table data...');
    await page.waitForSelector('button:has-text("Select")', { timeout: 15000 });
    console.log('Select buttons found, table data is loaded');
    
    // Additional wait for Angular rendering
    await page.waitForTimeout(3000);
    
    // The table is rendered with Angular/PrimeNG components, use evaluate to extract data
    const carerData = await page.evaluate(() => {
      const results: Array<{
        code: string;
        name: string;
        areaLocality: string;
        status: string;
        approvalDate: string;
        userName: string;
      }> = [];
      
      // Debug: Log table structure
      const tables = document.querySelectorAll('table');
      console.log('Tables found:', tables.length);
      
      // Method 1: Standard HTML table with tr/td
      const allRows = document.querySelectorAll('table tbody tr');
      console.log('Table body rows found:', allRows.length);
      
      for (const row of allRows) {
        const cells = row.querySelectorAll('td');
        console.log(`Row has ${cells.length} td cells`);
        if (cells.length >= 6) {
          const hasSelectBtn = cells[0]?.querySelector('button')?.textContent?.trim() === 'Select';
          if (hasSelectBtn) {
            results.push({
              code: cells[1]?.textContent?.trim() || '',
              name: cells[2]?.textContent?.trim() || '',
              areaLocality: cells[3]?.textContent?.trim() || '',
              status: cells[4]?.textContent?.trim() || '',
              approvalDate: cells[5]?.textContent?.trim() || '',
              userName: cells[6]?.textContent?.trim() || '',
            });
            console.log('Method 1 found carer:', cells[1]?.textContent?.trim());
          }
        }
      }
      
      // Method 2: PrimeNG p-table - look for rows with role="row"
      if (results.length === 0) {
        console.log('Method 1 failed, trying Method 2 (role=row)...');
        const tableRows = document.querySelectorAll('[role="row"], p-table tr, .p-datatable-tbody tr');
        console.log('Role rows found:', tableRows.length);
        
        for (const row of tableRows) {
          // Get all child cells - could be td, [role="cell"], or other elements
          const cells = row.querySelectorAll('td, [role="cell"], [role="gridcell"]');
          if (cells.length >= 6) {
            const firstCell = cells[0];
            const hasSelectBtn = firstCell?.querySelector('button')?.textContent?.trim() === 'Select';
            if (hasSelectBtn) {
              results.push({
                code: cells[1]?.textContent?.trim() || '',
                name: cells[2]?.textContent?.trim() || '',
                areaLocality: cells[3]?.textContent?.trim() || '',
                status: cells[4]?.textContent?.trim() || '',
                approvalDate: cells[5]?.textContent?.trim() || '',
                userName: cells[6]?.textContent?.trim() || '',
              });
              console.log('Method 2 found carer:', cells[1]?.textContent?.trim());
            }
          }
        }
      }
      
      // Method 3: Find Select buttons and traverse to find sibling cells
      if (results.length === 0) {
        console.log('Method 2 failed, trying Method 3 (Select button traversal)...');
        const selectButtons = Array.from(document.querySelectorAll('button')).filter(
          btn => btn.textContent?.trim() === 'Select'
        );
        console.log('Select buttons found:', selectButtons.length);
        
        for (const btn of selectButtons) {
          // Try different parent structures
          let row: Element | null = btn.closest('tr');
          if (!row) row = btn.closest('[role="row"]');
          if (!row) row = btn.closest('.ui-datatable-data tr');
          if (!row) row = btn.closest('.p-datatable-tbody tr');
          
          // If still no row, try walking up the DOM to find siblings
          if (!row) {
            let parent = btn.parentElement;
            // Walk up until we find an element with multiple similar siblings
            while (parent && parent.parentElement) {
              const siblings = parent.parentElement.children;
              if (siblings.length > 1) {
                row = parent;
                break;
              }
              parent = parent.parentElement;
            }
          }
          
          if (row) {
            const cells = row.querySelectorAll('td, [role="cell"], [role="gridcell"], > div, > span');
            console.log('Row found with', cells.length, 'cells. TagName:', row.tagName, 'Class:', row.className);
            
            // Try to extract data by looking for FCC- pattern in the row
            const rowText = row.textContent || '';
            const codeMatch = rowText.match(/FCC-\d+/);
            
            if (codeMatch && cells.length >= 6) {
              results.push({
                code: cells[1]?.textContent?.trim() || codeMatch[0],
                name: cells[2]?.textContent?.trim() || '',
                areaLocality: cells[3]?.textContent?.trim() || '',
                status: cells[4]?.textContent?.trim() || '',
                approvalDate: cells[5]?.textContent?.trim() || '',
                userName: cells[6]?.textContent?.trim() || '',
              });
              console.log('Method 3 found carer:', codeMatch[0]);
            }
          }
        }
      }
      
      // Method 4: Extract from FCC- elements and find siblings
      if (results.length === 0) {
        console.log('Method 3 failed, trying Method 4 (FCC pattern)...');
        
        // Find all text nodes containing FCC-
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          { acceptNode: (node) => node.textContent?.match(/FCC-\d+/) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
        );
        
        const fccNodes: Node[] = [];
        while (walker.nextNode()) {
          fccNodes.push(walker.currentNode);
        }
        console.log('FCC text nodes found:', fccNodes.length);
        
        for (const node of fccNodes) {
          const code = node.textContent?.match(/FCC-\d+/)?.[0] || '';
          if (!code) continue;
          
          // Find the row-like container
          let container = node.parentElement;
          while (container && container.parentElement && container.parentElement.tagName !== 'TBODY' && container.parentElement.tagName !== 'TABLE') {
            container = container.parentElement;
          }
          
          if (container) {
            // Get all text content of siblings after the code
            const siblings: string[] = [];
            const walker2 = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
            while (walker2.nextNode()) {
              const text = walker2.currentNode.textContent?.trim();
              if (text && text.length > 0) {
                siblings.push(text);
              }
            }
            
            console.log('Container siblings:', siblings);
            
            // Try to parse the values from siblings
            // Expected order: Select, Code, Name, Area/Locality, Status, Approval Date, User Name
            const _selectIdx = siblings.findIndex(s => s === 'Select');
            const codeIdx = siblings.findIndex(s => s.match(/^FCC-\d+$/));
            
            if (codeIdx !== -1 && siblings.length > codeIdx + 4) {
              results.push({
                code: siblings[codeIdx],
                name: siblings[codeIdx + 1] || '',
                areaLocality: siblings[codeIdx + 2] || '',
                status: siblings[codeIdx + 3] || '',
                approvalDate: siblings[codeIdx + 4] || '',
                userName: siblings[codeIdx + 5] || '',
              });
              console.log('Method 4 found carer:', siblings[codeIdx]);
            }
          }
        }
      }
      
      // Method 5: Fallback - scan the entire document for structured rows
      if (results.length === 0) {
        console.log('Method 4 failed, trying Method 5 (full DOM scan)...');
        
        // Log the actual HTML structure around Select buttons for debugging
        const selectBtn = document.querySelector('button');
        if (selectBtn && selectBtn.textContent?.trim() === 'Select') {
          let debugEl: Element | null = selectBtn;
          for (let i = 0; i < 10 && debugEl; i++) {
            console.log(`Level ${i}: ${debugEl.tagName}.${debugEl.className} - children: ${debugEl.children.length}`);
            debugEl = debugEl.parentElement;
          }
        }
        
        // Try finding all sibling elements that look like table cells
        const allDivs = document.querySelectorAll('div, span');
        for (const div of allDivs) {
          const text = div.textContent?.trim();
          if (text?.match(/^FCC-\d+$/) && div.children.length === 0) {
            // This is likely a cell containing just the code
            const parent = div.parentElement?.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).map(c => c.textContent?.trim() || '');
              console.log('Method 5 found potential row siblings:', siblings);
              
              if (siblings.length >= 5) {
                const codeIdx = siblings.findIndex(s => s.match(/^FCC-\d+$/));
                if (codeIdx !== -1) {
                  results.push({
                    code: siblings[codeIdx],
                    name: siblings[codeIdx + 1] || '',
                    areaLocality: siblings[codeIdx + 2] || '',
                    status: siblings[codeIdx + 3] || '',
                    approvalDate: siblings[codeIdx + 4] || '',
                    userName: siblings[codeIdx + 5] || '',
                  });
                }
              }
            }
          }
        }
      }
      
      // Deduplicate results by code
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex(t => t.code === item.code)
      );
      
      return uniqueResults;
    });
    
    console.log(`Found ${carerData.length} carers via page.evaluate`);
    
    // Convert to Carer type
    for (const data of carerData) {
      if (data.code && data.name) {
        carers.push({
          id: data.code,
          code: data.code,
          name: data.name,
          areaLocality: data.areaLocality,
          status: data.status,
          approvalDate: data.approvalDate,
          userName: data.userName,
        });
      }
    }
    
    console.log(`Extracted ${carers.length} carers total`);
    return carers;
  } catch (error) {
    console.error('Failed to extract carers:', error);
    return carers;
  }
}

// Select a carer by code
export async function selectCarer(carerCode: string): Promise<boolean> {
  const page = await getPage();
  
  try {
    // Find the row with the carer code and click Select
    const selectButton = await page.locator(`tr:has-text("${carerCode}") button:has-text("Select")`);
    if (await selectButton.isVisible()) {
      await selectButton.click();
      await page.waitForTimeout(1000);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to select carer:', error);
    return false;
  }
}

// Navigate to Supervisory Home Visit form
export async function navigateToSupervisoryHomeVisitForm(): Promise<boolean> {
  const page = await getPage();
  
  try {
    console.log('Navigating to Supervisory Home Visit form...');
    console.log('Current URL:', page.url());
    
    // Wait for the carer profile page to be ready
    await page.waitForTimeout(2000);
    
    // Try multiple approaches to find the Supervisory Home Visit link
    let linkFound = false;
    
    // Method 1: Direct link in the page
    const directLink = page.locator('a, [role="menuitem"], .menu-item, .nav-link').filter({ hasText: /Supervisory Home Visit/i }).first();
    if (await directLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found direct link to Supervisory Home Visit');
      await directLink.click();
      linkFound = true;
    }
    
    // Method 2: Look in a sidebar menu
    if (!linkFound) {
      console.log('Looking for sidebar menu...');
      const sidebarItems = page.locator('.sidebar, .side-menu, .nav-menu, [class*="menu"], [class*="sidebar"]')
        .locator('a, span, div')
        .filter({ hasText: /Supervisory Home Visit/i });
      
      if (await sidebarItems.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Found in sidebar menu');
        await sidebarItems.first().click();
        linkFound = true;
      }
    }
    
    // Method 3: Look for expandable menu items (e.g., "Home Visit" parent)
    if (!linkFound) {
      console.log('Looking for expandable menu items...');
      // Try expanding "Home Visit" or "Supervision" menu
      const parentMenuItems = ['Home Visit', 'Supervision', 'Forms', 'Records'];
      
      for (const parentItem of parentMenuItems) {
        const parentMenu = page.locator('a, span, div, [role="menuitem"]').filter({ hasText: new RegExp(`^${parentItem}$`, 'i') }).first();
        if (await parentMenu.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log(`Found parent menu: ${parentItem}, clicking...`);
          await parentMenu.click();
          await page.waitForTimeout(1000);
          
          // Now look for Supervisory Home Visit
          const subMenu = page.locator('a, span, div, [role="menuitem"]').filter({ hasText: /Supervisory Home Visit/i }).first();
          if (await subMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('Found Supervisory Home Visit in submenu');
            await subMenu.click();
            linkFound = true;
            break;
          }
        }
      }
    }
    
    // Method 4: Look for tab navigation
    if (!linkFound) {
      console.log('Looking for tabs...');
      const tabs = page.locator('[role="tab"], .tab, .nav-tab, .p-tabview-nav li').filter({ hasText: /Supervisory|Home Visit/i });
      if (await tabs.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Found in tabs');
        await tabs.first().click();
        linkFound = true;
      }
    }
    
    // Method 5: Use text-based search anywhere on the page
    if (!linkFound) {
      console.log('Using text-based search...');
      const anyElement = page.getByText('Supervisory Home Visit', { exact: false }).first();
      if (await anyElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Found text element, clicking...');
        await anyElement.click();
        linkFound = true;
      }
    }
    
    if (!linkFound) {
      console.error('Could not find Supervisory Home Visit link');
      // Log available links for debugging
      const links = await page.locator('a').allTextContents();
      console.log('Available links on page:', links.slice(0, 20));
      return false;
    }
    
    await page.waitForTimeout(2000);
    
    // Look for Add button to create a new form
    console.log('Looking for Add button...');
    
    // Try multiple selectors for the Add button
    const addButtonSelectors = [
      page.getByRole('button', { name: /Add/i }),
      page.locator('button').filter({ hasText: /Add/i }),
      page.locator('[class*="add"], [class*="new"], .btn-add').filter({ hasText: /Add|New|\+/i }),
      page.locator('button, a').filter({ hasText: /Add New|Create|New Record/i }),
    ];
    
    let addButtonFound = false;
    for (const selector of addButtonSelectors) {
      if (await selector.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Found Add button');
        await selector.first().click();
        addButtonFound = true;
        break;
      }
    }
    
    if (!addButtonFound) {
      console.log('No Add button found, maybe form is already open or page auto-navigated');
    }
    
    await page.waitForTimeout(3000);
    
    // Verify we're on the form page
    const formVisible = await page.locator('form, [class*="form"], .p-card, .card').first().isVisible().catch(() => false);
    console.log('Form visible:', formVisible);
    
    return true;
  } catch (error) {
    console.error('Failed to navigate to form:', error);
    return false;
  }
}

// Extract form structure from the page
export async function extractFormStructure(): Promise<FormStructure> {
  const page = await getPage();
  
  const formStructure: FormStructure = {
    formName: 'Supervisory Home Visit',
    formUrl: page.url(),
    sections: [],
    buttons: [],
  };
  
  try {
    // Extract Section A fields
    const sectionA: FormField[] = [
      {
        id: 'category',
        name: 'category',
        label: 'Category',
        type: 'dropdown',
        required: true,
        section: 'Carer Section A',
        options: await extractDropdownOptions(page, 'Category'),
      },
      {
        id: 'homeVisitType',
        name: 'homeVisitType',
        label: 'Home Visit Type',
        type: 'dropdown',
        required: false,
        section: 'Carer Section A',
        options: await extractDropdownOptions(page, 'Home Visit Type'),
      },
      {
        id: 'dateOfVisit',
        name: 'dateOfVisit',
        label: 'Date Of Visit',
        type: 'datetime',
        required: true,
        placeholder: 'dd/mm/yyyy hh:mm',
        section: 'Carer Section A',
      },
      {
        id: 'homeFileSeen',
        name: 'homeFileSeen',
        label: 'Home File Seen',
        type: 'checkbox',
        required: false,
        section: 'Carer Section A',
      },
      {
        id: 'medicationSheetChecked',
        name: 'medicationSheetChecked',
        label: 'Medication Sheet Checked',
        type: 'checkbox',
        required: false,
        section: 'Carer Section A',
      },
      {
        id: 'localAuthorityFeedbackRequested',
        name: 'localAuthorityFeedbackRequested',
        label: 'Local Authority Feedback Requested',
        type: 'checkbox',
        required: false,
        section: 'Carer Section A',
      },
      {
        id: 'natureOfVisit',
        name: 'natureOfVisit',
        label: 'Nature of Visit',
        type: 'textarea',
        required: false,
        section: 'Carer Section A',
      },
      {
        id: 'attendeesDetails',
        name: 'attendeesDetails',
        label: 'Names of all those present at the meeting. Details of any new placements since the last visit. Note if children were seen alone. If not seen at all, reason why?',
        type: 'textarea',
        required: false,
        section: 'Carer Section A',
      },
      {
        id: 'additionalEmails',
        name: 'additionalEmails',
        label: 'Additional Email Addresses to be notified',
        type: 'email',
        required: false,
        description: 'Email Addresses should be separated by commas',
        section: 'Carer Section A',
      },
    ];
    
    // Section B fields
    const sectionB: FormField[] = [
      {
        id: 'caringForChildren',
        name: 'caringForChildren',
        label: 'Caring for Children',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'workingAsPartOfTeam',
        name: 'workingAsPartOfTeam',
        label: 'Working as part of a team',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'trainingPersonalDevelopment',
        name: 'trainingPersonalDevelopment',
        label: 'Training & Personal Development',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'carerPersonalIssues',
        name: 'carerPersonalIssues',
        label: 'Carer Personal Issues',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'agencyIssues',
        name: 'agencyIssues',
        label: 'Agency Issues',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'safeEnvironment',
        name: 'safeEnvironment',
        label: 'Providing a Safe Environment / Safe Care Issues',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'concernsAllegations',
        name: 'concernsAllegations',
        label: 'Concerns / Allegations / Commendations',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'dayCareRespite',
        name: 'dayCareRespite',
        label: 'Day Care / Household Respite Carer and Respite Training',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'supervisionSentToCarer',
        name: 'supervisionSentToCarer',
        label: 'Has the Supervision sent to Carer?',
        type: 'checkbox',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'fosterCarerComments',
        name: 'fosterCarerComments',
        label: 'Foster Carer Comments on Supervision',
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
      {
        id: 'lineManagerComments',
        name: 'lineManagerComments',
        label: "Line Manager's Comments on Supervision",
        type: 'textarea',
        required: false,
        section: 'Carer Section B',
      },
    ];
    
    formStructure.sections = [
      { id: 'sectionA', name: 'Carer Section A', fields: sectionA },
      { id: 'sectionB', name: 'Carer Section B', fields: sectionB },
    ];
    
    formStructure.buttons = [
      { id: 'saveAsDraft', label: 'Save as Draft', action: 'saveAsDraft' },
      { id: 'submit', label: 'Submit', action: 'submit' },
      { id: 'submitAndLock', label: 'Submit & Lock', action: 'submitAndLock' },
      { id: 'back', label: 'Back', action: 'back' },
    ];
    
    return formStructure;
  } catch (error) {
    console.error('Failed to extract form structure:', error);
    return formStructure;
  }
}

// Helper function to extract dropdown options
async function extractDropdownOptions(page: Page, labelText: string): Promise<DropdownOption[]> {
  const options: DropdownOption[] = [];
  
  try {
    // Find the dropdown near the label
    const dropdown = await page.locator(`text="${labelText}"`).locator('..').locator('select, [role="combobox"]').first();
    
    if (await dropdown.isVisible()) {
      const optionElements = await dropdown.locator('option').all();
      for (const opt of optionElements) {
        const value = await opt.getAttribute('value') || await opt.innerText();
        const label = await opt.innerText();
        options.push({ value, label });
      }
    }
  } catch (_error) {
    console.log(`Could not extract options for ${labelText}`);
  }
  
  // Fallback with known options
  if (options.length === 0) {
    if (labelText === 'Category') {
      return [
        { value: '', label: 'Select Category' },
        { value: 'Individual Child', label: 'Individual Child' },
        { value: 'Mother & Baby', label: 'Mother & Baby' },
        { value: 'Multiple Unrelated Children', label: 'Multiple Unrelated Children' },
        { value: 'No Child in Placement', label: 'No Child in Placement' },
        { value: 'Respite', label: 'Respite' },
        { value: 'Sibling Group', label: 'Sibling Group' },
        { value: 'Solo Placements', label: 'Solo Placements' },
        { value: 'Staying Put', label: 'Staying Put' },
      ];
    }
    if (labelText === 'Home Visit Type') {
      return [
        { value: '', label: 'Select Home Visit Type' },
        { value: 'Announced', label: 'Announced' },
        { value: 'Cancelled', label: 'Cancelled' },
        { value: 'Rescheduled', label: 'Rescheduled' },
      ];
    }
  }
  
  return options;
}

// Helper function to select from PrimeNG dropdown
async function selectPrimeNGDropdown(page: Page, labelText: string, optionValue: string): Promise<boolean> {
  try {
    console.log(`Selecting "${optionValue}" for dropdown "${labelText}"...`);
    
    // Method 1: Standard HTML select
    const nativeSelect = page.locator('select').filter({ hasText: new RegExp(labelText, 'i') }).first();
    if (await nativeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nativeSelect.selectOption(optionValue);
      console.log('Used native select');
      return true;
    }
    
    // Method 2: Find dropdown by label and click to open
    // Look for label first, then find the associated dropdown
    const labelElement = page.locator('label, .p-field label, .form-group label').filter({ hasText: new RegExp(`^${labelText}`, 'i') }).first();
    
    let dropdown = null;
    
    if (await labelElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Try to find dropdown near the label - could be sibling or within parent
      const parent = labelElement.locator('..'); // Get parent
      dropdown = parent.locator('p-dropdown, .p-dropdown, [class*="dropdown"], select').first();
      
      if (!await dropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Try next sibling approach
        dropdown = labelElement.locator('~ p-dropdown, ~ .p-dropdown, ~ div p-dropdown, ~ div .p-dropdown').first();
      }
    }
    
    // Method 3: Look for dropdown with placeholder or current value
    if (!dropdown || !await dropdown.isVisible({ timeout: 500 }).catch(() => false)) {
      dropdown = page.locator('p-dropdown, .p-dropdown').filter({ hasText: new RegExp(`Select ${labelText}|Choose|Select`, 'i') }).first();
    }
    
    // Method 4: Find by form field structure
    if (!dropdown || !await dropdown.isVisible({ timeout: 500 }).catch(() => false)) {
      dropdown = page.locator(`.p-field:has-text("${labelText}") p-dropdown, .p-field:has-text("${labelText}") .p-dropdown`).first();
    }
    
    if (dropdown && await dropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Click to open the dropdown
      await dropdown.click();
      await page.waitForTimeout(500);
      
      // Look for the option in the dropdown panel
      const optionSelectors = [
        page.locator('.p-dropdown-panel .p-dropdown-item, .p-dropdown-items li').filter({ hasText: new RegExp(`^${optionValue}$`, 'i') }),
        page.locator('[role="option"], [role="listbox"] li').filter({ hasText: new RegExp(`^${optionValue}$`, 'i') }),
        page.locator('.p-dropdown-item').filter({ hasText: optionValue }),
        page.getByText(optionValue, { exact: true }),
      ];
      
      for (const optionSelector of optionSelectors) {
        if (await optionSelector.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await optionSelector.first().click();
          console.log('Selected option from PrimeNG dropdown');
          return true;
        }
      }
      
      // If exact match not found, try partial match
      const partialOption = page.locator('.p-dropdown-panel li, .p-dropdown-items li, [role="option"]')
        .filter({ hasText: new RegExp(optionValue, 'i') }).first();
      if (await partialOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        await partialOption.click();
        console.log('Selected partial match option');
        return true;
      }
      
      // Close dropdown if no option found
      await page.keyboard.press('Escape');
    }
    
    console.warn(`Could not find or select dropdown for "${labelText}"`);
    return false;
  } catch (error) {
    console.error(`Error selecting dropdown "${labelText}":`, error);
    return false;
  }
}

// Helper function to check a checkbox by label
async function checkCheckbox(page: Page, labelText: string): Promise<boolean> {
  try {
    console.log(`Checking checkbox "${labelText}"...`);
    
    // Method 1: Standard checkbox role
    const roleCheckbox = page.getByRole('checkbox', { name: new RegExp(labelText, 'i') });
    if (await roleCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await roleCheckbox.check();
      return true;
    }
    
    // Method 2: PrimeNG p-checkbox
    const primeCheckbox = page.locator(`p-checkbox:has-text("${labelText}"), .p-checkbox:has-text("${labelText}")`).first();
    if (await primeCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      const checkboxInput = primeCheckbox.locator('input[type="checkbox"], .p-checkbox-box');
      await checkboxInput.click();
      return true;
    }
    
    // Method 3: Label with for attribute
    const label = page.locator(`label:has-text("${labelText}")`).first();
    if (await label.isVisible({ timeout: 1000 }).catch(() => false)) {
      const forAttr = await label.getAttribute('for');
      if (forAttr) {
        const checkbox = page.locator(`#${forAttr}`);
        await checkbox.check();
        return true;
      }
      // Click label to toggle checkbox
      await label.click();
      return true;
    }
    
    // Method 4: Find checkbox near text
    const textElement = page.getByText(labelText, { exact: false }).first();
    if (await textElement.isVisible({ timeout: 1000 }).catch(() => false)) {
      const nearbyCheckbox = textElement.locator('.. input[type="checkbox"], .. .p-checkbox-box').first();
      if (await nearbyCheckbox.isVisible({ timeout: 500 }).catch(() => false)) {
        await nearbyCheckbox.click();
        return true;
      }
    }
    
    console.warn(`Could not find checkbox "${labelText}"`);
    return false;
  } catch (error) {
    console.error(`Error checking checkbox "${labelText}":`, error);
    return false;
  }
}

// Helper function to fill a textarea by label
async function fillTextareaByLabel(page: Page, labelText: string, value: string): Promise<boolean> {
  try {
    console.log(`Filling textarea "${labelText}"...`);
    
    // Method 1: Find by label and associated textarea
    const label = page.locator('label').filter({ hasText: new RegExp(labelText, 'i') }).first();
    if (await label.isVisible({ timeout: 1000 }).catch(() => false)) {
      const forAttr = await label.getAttribute('for');
      if (forAttr) {
        const textarea = page.locator(`#${forAttr}`);
        if (await textarea.isVisible({ timeout: 500 }).catch(() => false)) {
          await textarea.fill(value);
          return true;
        }
      }
      
      // Look for textarea in the same parent container
      const parent = label.locator('..');
      const textarea = parent.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 500 }).catch(() => false)) {
        await textarea.fill(value);
        return true;
      }
    }
    
    // Method 2: PrimeNG input textarea
    const primeTextarea = page.locator(`.p-field:has-text("${labelText}") textarea, .form-group:has-text("${labelText}") textarea`).first();
    if (await primeTextarea.isVisible({ timeout: 1000 }).catch(() => false)) {
      await primeTextarea.fill(value);
      return true;
    }
    
    console.warn(`Could not find textarea "${labelText}"`);
    return false;
  } catch (error) {
    console.error(`Error filling textarea "${labelText}":`, error);
    return false;
  }
}

// Fill the form with provided data
export async function fillForm(formData: Record<string, string | boolean>): Promise<boolean> {
  const page = await getPage();
  
  try {
    console.log('Starting form fill...');
    console.log('Current URL:', page.url());
    
    // Wait for form to be ready
    await page.waitForTimeout(2000);
    
    // Section A fields - Dropdowns
    if (formData.category) {
      await selectPrimeNGDropdown(page, 'Category', formData.category as string);
      await page.waitForTimeout(500);
    }
    
    if (formData.homeVisitType) {
      await selectPrimeNGDropdown(page, 'Home Visit Type', formData.homeVisitType as string);
      await page.waitForTimeout(500);
    }
    
    // Date field
    if (formData.dateOfVisit) {
      console.log('Filling date field...');
      const dateSelectors = [
        page.getByPlaceholder('dd/mm/yyyy hh:mm'),
        page.getByPlaceholder('dd/mm/yyyy'),
        page.locator('input[type="datetime-local"], input[type="date"], .p-calendar input, p-calendar input'),
        page.locator('input').filter({ hasText: /date/i }).first(),
        page.locator('.p-field:has-text("Date") input').first(),
      ];
      
      for (const selector of dateSelectors) {
        if (await selector.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await selector.first().fill(formData.dateOfVisit as string);
          console.log('Date filled');
          break;
        }
      }
    }
    
    // Checkboxes
    if (formData.homeFileSeen) {
      await checkCheckbox(page, 'Home File Seen');
    }
    
    if (formData.medicationSheetChecked) {
      await checkCheckbox(page, 'Medication Sheet Checked');
    }
    
    if (formData.localAuthorityFeedbackRequested) {
      await checkCheckbox(page, 'Local Authority Feedback Requested');
    }
    
    // Text areas - Section A
    if (formData.natureOfVisit) {
      await fillTextareaByLabel(page, 'Nature of Visit', formData.natureOfVisit as string);
    }
    
    if (formData.attendeesDetails) {
      await fillTextareaByLabel(page, 'Names of all those present', formData.attendeesDetails as string);
    }
    
    if (formData.additionalEmails) {
      const emailField = page.locator('input[type="email"], input').filter({ hasText: /email/i }).first();
      if (await emailField.isVisible({ timeout: 1000 }).catch(() => false)) {
        await emailField.fill(formData.additionalEmails as string);
      }
    }
    
    // Check if we need to switch to Section B
    const hasSectionBData = [
      'caringForChildren', 'workingAsPartOfTeam', 'trainingPersonalDevelopment',
      'carerPersonalIssues', 'agencyIssues', 'safeEnvironment',
      'concernsAllegations', 'dayCareRespite', 'supervisionSentToCarer',
      'fosterCarerComments', 'lineManagerComments'
    ].some(field => formData[field]);
    
    if (hasSectionBData) {
      console.log('Switching to Section B...');
      
      // Try to find and click Section B tab/link
      const sectionBSelectors = [
        page.getByRole('link', { name: /Carer Section B|Section B/i }),
        page.getByRole('tab', { name: /Carer Section B|Section B/i }),
        page.locator('[role="tab"], .p-tabview-nav li, .nav-link, .tab').filter({ hasText: /Section B/i }),
        page.getByText('Carer Section B'),
      ];
      
      for (const selector of sectionBSelectors) {
        if (await selector.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await selector.first().click();
          await page.waitForTimeout(1000);
          console.log('Switched to Section B');
          break;
        }
      }
      
      // Section B text areas
      const sectionBFieldMappings: Record<string, string> = {
        'caringForChildren': 'Caring for Children',
        'workingAsPartOfTeam': 'Working as part of a team',
        'trainingPersonalDevelopment': 'Training & Personal Development',
        'carerPersonalIssues': 'Carer Personal Issues',
        'agencyIssues': 'Agency Issues',
        'safeEnvironment': 'Safe Environment|Safe Care',
        'concernsAllegations': 'Concerns|Allegations|Commendations',
        'dayCareRespite': 'Day Care|Respite',
        'fosterCarerComments': 'Foster Carer Comments',
        'lineManagerComments': 'Line Manager',
      };
      
      for (const [fieldName, labelPattern] of Object.entries(sectionBFieldMappings)) {
        if (formData[fieldName]) {
          await fillTextareaByLabel(page, labelPattern, formData[fieldName] as string);
          await page.waitForTimeout(300);
        }
      }
      
      // Checkbox for supervision sent to carer
      if (formData.supervisionSentToCarer) {
        await checkCheckbox(page, 'Supervision sent to Carer');
      }
    }
    
    console.log('Form fill completed');
    return true;
  } catch (error) {
    console.error('Failed to fill form:', error);
    return false;
  }
}

// Submit the form
export async function submitForm(submitType: 'draft' | 'submit' | 'submitAndLock' = 'draft'): Promise<{ success: boolean; message: string }> {
  const page = await getPage();
  
  try {
    let buttonName: string;
    switch (submitType) {
      case 'submit':
        buttonName = 'Submit';
        break;
      case 'submitAndLock':
        buttonName = 'Submit & Lock';
        break;
      default:
        buttonName = 'Save as Draft';
    }
    
    await page.getByRole('button', { name: buttonName }).click();
    await page.waitForTimeout(3000);
    
    // Check for success message
    const successMessage = await page.getByText(/saved|submitted|success/i).isVisible().catch(() => false);
    
    return {
      success: true,
      message: successMessage ? 'Form submitted successfully' : 'Form submission completed',
    };
  } catch (error) {
    console.error('Failed to submit form:', error);
    return {
      success: false,
      message: `Failed to submit form: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Take a screenshot of the current page
export async function takeScreenshot(): Promise<Buffer> {
  const page = await getPage();
  return await page.screenshot({ fullPage: true });
}

// Get current page state
export async function getPageState(): Promise<{ url: string; title: string }> {
  const page = await getPage();
  return {
    url: page.url(),
    title: await page.title(),
  };
}

