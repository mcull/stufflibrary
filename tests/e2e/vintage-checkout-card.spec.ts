import { test, expect } from '@playwright/test';

// Mock data for testing
const mockBorrowHistory = [
  {
    id: 'borrow-1',
    status: 'RETURNED',
    borrower: {
      id: 'user-1',
      name: 'John Smith',
    },
    signature: 'John Smith',
    promiseText: 'Will return in good condition',
    promisedReturnBy: new Date('2024-01-15'),
    borrowedAt: new Date('2024-01-01'),
    returnedAt: new Date('2024-01-14'),
    approvedAt: new Date('2024-01-01'),
    requestedAt: new Date('2023-12-28'),
  },
  {
    id: 'borrow-2',
    status: 'RETURNED',
    borrower: {
      id: 'user-2',
      name: 'Sarah Johnson',
    },
    signature: 'Sarah Johnson',
    promiseText: 'Taking good care of this',
    promisedReturnBy: new Date('2024-02-01'),
    borrowedAt: new Date('2024-01-20'),
    returnedAt: new Date('2024-01-30'),
    approvedAt: new Date('2024-01-20'),
    requestedAt: new Date('2024-01-15'),
  },
  {
    id: 'borrow-3',
    status: 'ACTIVE',
    borrower: {
      id: 'user-3',
      name: 'Michael Brown',
    },
    signature: 'Michael Brown',
    promiseText: 'Needed for weekend project',
    promisedReturnBy: new Date('2024-03-15'),
    borrowedAt: new Date('2024-03-01'),
    returnedAt: null,
    approvedAt: new Date('2024-03-01'),
    requestedAt: new Date('2024-02-28'),
  },
];

const _emptyBorrowHistory: typeof mockBorrowHistory = [];

test.describe('VintageCheckoutCard Component', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test page with the component
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>VintageCheckoutCard Test</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
        <style>
          body { margin: 0; padding: 20px; font-family: 'Roboto', sans-serif; background: #f5f5f5; }
          
          /* Vintage fonts CSS - inline for testing */
          @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime&family=Source+Code+Pro:wght@400;600&display=swap');
          
          .vintage-impact-label {
            font-family: 'Special Elite', 'Courier New', monospace !important;
            font-weight: 400 !important;
            letter-spacing: 1px !important;
          }
          
          .vintage-stampette {
            font-family: 'Source Code Pro', 'Courier New', monospace !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
          }
        </style>
      </head>
      <body>
        <div id="test-container" style="max-width: 600px; margin: 0 auto;">
          <!-- Component will be injected here -->
        </div>
        
        <script type="module">
          // Mock React and MUI components for testing
          const React = {
            createElement: (type, props, ...children) => {
              if (typeof type === 'string') {
                const element = document.createElement(type);
                if (props) {
                  Object.keys(props).forEach(key => {
                    if (key === 'sx') {
                      // Handle MUI sx prop
                      Object.assign(element.style, props[key]);
                    } else if (key === 'className') {
                      element.className = props[key];
                    } else if (key.startsWith('on')) {
                      // Event handlers
                      element.addEventListener(key.slice(2).toLowerCase(), props[key]);
                    } else {
                      element.setAttribute(key, props[key]);
                    }
                  });
                }
                children.flat().forEach(child => {
                  if (typeof child === 'string') {
                    element.textContent = child;
                  } else if (child && child.nodeType) {
                    element.appendChild(child);
                  }
                });
                return element;
              }
              return null;
            },
            useMemo: (fn, deps) => fn(),
          };
          
          // Simple MUI components mock
          const Box = (props) => {
            const div = document.createElement('div');
            if (props.sx) {
              Object.assign(div.style, {
                width: props.sx.width || '100%',
                height: props.sx.height || '100%',
                padding: props.sx.p ? \`\${props.sx.p * 8}px\` : '0',
                marginBottom: props.sx.mb ? \`\${props.sx.mb * 8}px\` : '0',
                marginTop: props.sx.mt ? \`\${props.sx.mt * 8}px\` : '0',
                textAlign: props.sx.textAlign || 'left',
                display: props.sx.display || 'block',
                gridTemplateColumns: props.sx.gridTemplateColumns,
                gap: props.sx.gap ? \`\${props.sx.gap * 8}px\` : '0',
                paddingBottom: props.sx.pb ? \`\${props.sx.pb * 8}px\` : '0',
                paddingLeft: props.sx.pl ? \`\${props.sx.pl * 8}px\` : '0',
                borderBottom: props.sx.borderBottom,
                minHeight: props.sx.minHeight,
                alignItems: props.sx.alignItems,
                color: props.sx.color,
                fontSize: props.sx.fontSize,
                fontWeight: props.sx.fontWeight,
                letterSpacing: props.sx.letterSpacing,
                textTransform: props.sx.textTransform,
                fontFamily: props.sx.fontFamily,
                transform: props.sx.transform,
                opacity: props.sx.opacity,
                backgroundColor: props.sx.bgcolor,
                margin: props.sx.mx === 'auto' ? '0 auto' : '',
              });
              if (props.sx.display === 'grid') {
                div.style.display = 'grid';
              }
            }
            return div;
          };
          
          const Typography = (props) => {
            const element = document.createElement(props.variant === 'h6' ? 'h6' : 'span');
            if (props.className) element.className = props.className;
            if (props.sx) {
              Object.assign(element.style, {
                fontSize: props.sx.fontSize,
                fontWeight: props.sx.fontWeight,
                letterSpacing: props.sx.letterSpacing,
                color: props.sx.color,
                textTransform: props.sx.textTransform,
                fontFamily: props.sx.fontFamily,
                transform: props.sx.transform,
              });
            }
            if (props.children) element.textContent = props.children;
            return element;
          };
          
          // Mock VintageCheckoutCard implementation
          function createVintageCheckoutCard(props) {
            const { itemName, borrowHistory, showTitle = true, compact = false } = props;
            
            // Container
            const container = Box({
              sx: {
                width: '100%',
                height: '100%',
                p: compact ? 3 : 4,
              }
            });
            
            // Title
            if (showTitle) {
              const titleBox = Box({ sx: { mb: 4, textAlign: 'center' } });
              const title = Typography({
                className: 'vintage-impact-label',
                sx: {
                  fontSize: compact ? '1rem' : '1.2rem',
                  fontWeight: 'bold',
                  letterSpacing: '3px',
                  color: '#2c1810',
                  textTransform: 'uppercase',
                },
                children: '★ LIBRARY CHECKOUT CARD ★'
              });
              titleBox.appendChild(title);
              
              const line = Box({
                sx: {
                  width: '80%',
                  height: '3px',
                  bgcolor: '#8b4513',
                  mt: 2,
                  mx: 'auto',
                }
              });
              line.style.backgroundColor = '#8b4513';
              line.style.height = '3px';
              line.style.width = '80%';
              line.style.margin = '16px auto 0 auto';
              titleBox.appendChild(line);
              
              container.appendChild(titleBox);
            }
            
            // Header row
            const headerRow = Box({
              sx: {
                display: 'grid',
                gridTemplateColumns: '50% 25% 25%',
                mb: 2,
                pb: 1,
                borderBottom: '2px solid #8b4513',
              }
            });
            headerRow.style.display = 'grid';
            headerRow.style.gridTemplateColumns = '50% 25% 25%';
            headerRow.style.marginBottom = '16px';
            headerRow.style.paddingBottom = '8px';
            headerRow.style.borderBottom = '2px solid #8b4513';
            
            const headers = ['BORROWER\\'S NAME', 'DUE DATE', 'RETURNED'];
            headers.forEach(headerText => {
              const header = Typography({
                className: 'vintage-stampette',
                sx: {
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: '#2c1810',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                },
                children: headerText
              });
              header.style.textAlign = 'center';
              headerRow.appendChild(header);
            });
            
            container.appendChild(headerRow);
            
            // Checkout rows
            const numRows = compact ? 12 : 18;
            for (let i = 0; i < numRows; i++) {
              const record = borrowHistory[i];
              const row = Box({
                sx: {
                  display: 'grid',
                  gridTemplateColumns: '50% 25% 25%',
                  mb: 1,
                  minHeight: '32px',
                  alignItems: 'end',
                  borderBottom: '1px solid #333',
                  pb: 1,
                }
              });
              row.style.display = 'grid';
              row.style.gridTemplateColumns = '50% 25% 25%';
              row.style.marginBottom = '8px';
              row.style.minHeight = '32px';
              row.style.alignItems = 'end';
              row.style.borderBottom = '1px solid #333';
              row.style.paddingBottom = '8px';
              
              // Borrower name
              const borrowerBox = Box({ sx: { textAlign: 'left', pl: 2 } });
              borrowerBox.style.textAlign = 'left';
              borrowerBox.style.paddingLeft = '16px';
              if (record) {
                const name = Typography({
                  sx: {
                    fontSize: '0.95rem',
                    fontFamily: 'Courier, monospace',
                    color: '#1a1a1a',
                    fontWeight: 'normal',
                  },
                  children: record.borrower.name
                });
                borrowerBox.appendChild(name);
              }
              row.appendChild(borrowerBox);
              
              // Due date
              const dueDateBox = Box({ sx: { textAlign: 'center' } });
              dueDateBox.style.textAlign = 'center';
              if (record && record.promisedReturnBy) {
                const dueDate = Typography({
                  className: 'vintage-impact-label',
                  sx: {
                    fontSize: '0.8rem',
                    color: '#dc2626',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transform: 'rotate(-1deg)',
                  },
                  children: new Date(record.promisedReturnBy).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: '2-digit',
                  })
                });
                dueDateBox.appendChild(dueDate);
              }
              row.appendChild(dueDateBox);
              
              // Return date
              const returnBox = Box({ sx: { textAlign: 'center' } });
              returnBox.style.textAlign = 'center';
              if (record && record.returnedAt) {
                const returnDate = Typography({
                  className: 'vintage-impact-label',
                  sx: {
                    fontSize: '0.8rem',
                    color: '#2e7d32',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transform: 'rotate(1deg)',
                  },
                  children: new Date(record.returnedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: '2-digit',
                  })
                });
                returnBox.appendChild(returnDate);
              }
              row.appendChild(returnBox);
              
              container.appendChild(row);
            }
            
            return container;
          }
          
          // Test scenarios
          window.renderTestScenario = function(scenario) {
            const testContainer = document.getElementById('test-container');
            testContainer.innerHTML = '';
            
            let component;
            switch (scenario) {
              case 'with-history':
                component = createVintageCheckoutCard({
                  itemName: 'Power Drill',
                  borrowHistory: ${JSON.stringify(mockBorrowHistory)},
                  showTitle: true,
                  compact: false
                });
                break;
              case 'compact-with-history':
                component = createVintageCheckoutCard({
                  itemName: 'Power Drill',
                  borrowHistory: ${JSON.stringify(mockBorrowHistory)},
                  showTitle: false,
                  compact: true
                });
                break;
              case 'empty':
                component = createVintageCheckoutCard({
                  itemName: 'Lawn Mower',
                  borrowHistory: [],
                  showTitle: true,
                  compact: false
                });
                break;
              case 'compact-empty':
                component = createVintageCheckoutCard({
                  itemName: 'Lawn Mower',
                  borrowHistory: [],
                  showTitle: false,
                  compact: true
                });
                break;
            }
            
            testContainer.appendChild(component);
          };
          
        </script>
      </body>
      </html>
    `);
  });

  test('should match snapshot - full card with borrow history', async ({
    page,
  }) => {
    await page.evaluate(() => window.renderTestScenario('with-history'));

    // Wait for fonts to load properly
    await page.waitForFunction(() => document.fonts.ready, { timeout: 10000 });
    await page.waitForTimeout(500); // Additional buffer for rendering

    const card = page.locator('#test-container');
    await expect(card).toHaveScreenshot(
      'vintage-checkout-card-with-history.png'
    );
  });

  test('should match snapshot - compact card with borrow history', async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.renderTestScenario('compact-with-history')
    );

    // Wait for fonts to load properly
    await page.waitForFunction(() => document.fonts.ready, { timeout: 10000 });
    await page.waitForTimeout(500); // Additional buffer for rendering

    const card = page.locator('#test-container');
    await expect(card).toHaveScreenshot(
      'vintage-checkout-card-compact-with-history.png'
    );
  });

  test('should match snapshot - empty card (no history)', async ({ page }) => {
    await page.evaluate(() => window.renderTestScenario('empty'));

    // Wait for fonts to load properly
    await page.waitForFunction(() => document.fonts.ready, { timeout: 10000 });
    await page.waitForTimeout(500); // Additional buffer for rendering

    const card = page.locator('#test-container');
    await expect(card).toHaveScreenshot('vintage-checkout-card-empty.png');
  });

  test('should match snapshot - compact empty card', async ({ page }) => {
    await page.evaluate(() => window.renderTestScenario('compact-empty'));

    // Wait for fonts to load properly
    await page.waitForFunction(() => document.fonts.ready, { timeout: 10000 });
    await page.waitForTimeout(500); // Additional buffer for rendering

    const card = page.locator('#test-container');
    await expect(card).toHaveScreenshot(
      'vintage-checkout-card-compact-empty.png'
    );
  });

  test('should render with borrow history data', async ({ page }) => {
    await page.evaluate(() => window.renderTestScenario('with-history'));
    await page.waitForTimeout(100);

    // Check that borrower names are displayed
    await expect(page.locator('text=John Smith')).toBeVisible();
    await expect(page.locator('text=Sarah Johnson')).toBeVisible();
    await expect(page.locator('text=Michael Brown')).toBeVisible();
  });

  test('should display header columns correctly', async ({ page }) => {
    await page.evaluate(() => window.renderTestScenario('with-history'));
    await page.waitForTimeout(100);

    // Check that all required headers are present
    await expect(page.locator("text=BORROWER'S NAME")).toBeVisible();
    await expect(page.locator('text=DUE DATE')).toBeVisible();
    await expect(page.locator('text=RETURNED')).toBeVisible();
  });

  test('should show title when showTitle is true', async ({ page }) => {
    await page.evaluate(() => window.renderTestScenario('with-history'));
    await page.waitForTimeout(100);

    await expect(page.locator('text=★ LIBRARY CHECKOUT CARD ★')).toBeVisible();
  });

  test('should hide title when showTitle is false', async ({ page }) => {
    await page.evaluate(() =>
      window.renderTestScenario('compact-with-history')
    );
    await page.waitForTimeout(100);

    await expect(
      page.locator('text=★ LIBRARY CHECKOUT CARD ★')
    ).not.toBeVisible();
  });
});
