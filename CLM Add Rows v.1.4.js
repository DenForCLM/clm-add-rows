// ==UserScript==
// @name         CLM Add Rows
// @namespace    http://tampermonkey.net/
// @version      2025-01-23
// @description  Automatically add rows and fill data in CLM
// @author       Denis Kiselev
// @match        *://elekta--svmxc.vf.force.com/*Review_Add_Labor_Time*
// @grant        none
// @run-at       document-end
// ==/UserScript==


(function() {
    'use strict';


// ================================================================
// PART 1: Table Processing (TableProcessor, DateUpdater, ProcessManager)
// ================================================================

// For demonstration: We'll store the final user input from the modal in `window.globalDates`.
// In case the user hasn't opened the modal yet, fallback to a default array:
window.globalDates = window.globalDates || [
    {
        start: { date: '01/05/2022', hours: '08', minutes: '00', amPm: 'AM' },
        end: { date: '01/05/2022', hours: '08', minutes: '30', amPm: 'AM' },
        hourType: 'Travel',
        servType: 'On-Site Service'
    },
    {
        start: { date: '06/16/2023', hours: '08', minutes: '30', amPm: 'AM' },
        end: { date: '06/16/2023', hours: '09', minutes: '30', amPm: 'PM' },
        hourType: 'Service',
        servType: 'On-Site Service'
    },
    {
        start: { date: '11/22/2024', hours: '09', minutes: '30', amPm: 'PM' },
        end: { date: '11/22/2024', hours: '10', minutes: '00', amPm: 'PM' },
        hourType: 'Travel',
        servType: 'On-Site Service'
    }
];

// Global SELECTORS
const SEL = {
  ROWS: '#svmx-listcomposite-1092-body tr.svmx-grid-row',
  HOUR_TYPE: '#sfm-picklistcelleditor-1061-triggerWrap',
  SERVICE_TYPE: '#sfm-picklistcelleditor-1062-triggerWrap',
  START_DATE: '#svmx-date-1064-inputEl',
  END_DATE: '#svmx-date-1071-inputEl',

  // Start time triggers
  S_HOUR: '#svmx-picklist-1065-triggerWrap .svmx-form-trigger',
  S_MIN: '#svmx-picklist-1066-triggerWrap .svmx-form-trigger',
  S_AM_PM: '#svmx-picklist-1067-triggerWrap .svmx-form-trigger',

  // End time triggers
  E_HOUR: '#svmx-picklist-1072-triggerWrap .svmx-form-trigger',
  E_MIN: '#svmx-picklist-1073-triggerWrap .svmx-form-trigger',
  E_AM_PM: '#svmx-picklist-1074-triggerWrap .svmx-form-trigger',

  // Grid columns
  COLUMNS: {
    'Hour Type': 'svmx-grid-cell-gridcolumn-1081',
    'Service Type': 'svmx-grid-cell-gridcolumn-1082',
    'Start Date Time': 'svmx-grid-cell-gridcolumn-1083',
    'End Date Time': 'svmx-grid-cell-gridcolumn-1084'
  }
};


class TableProcessor {
  constructor(columns, noDebug = true) {
    this.columns = columns;
    this.createdRowsCount = 0; // how many rows were created
    this.debug = !noDebug;
  }

  log(...args) {
    if (this.debug) console.log(...args);
  }

  // For example, find an "Add Row" button and click it 3 times
  createRows() {
    this.log('🔨 Creating rows...');
    const addRowButton = document.querySelector('#sfm-button-1099-btnEl');
    if (!addRowButton) {
      alert('❌ Error: Add Row button not found');
      throw new Error('Add Row button not found');
    }

    // Example: click it 3 times
    for (let i = 0; i < 3; i++) {
      addRowButton.click();
    }

    // Wait a bit (or handle it via promises/timeouts in your real code)
    // setTimeout(...) if needed

    // Suppose 3 rows are created
    this.createdRowsCount = 3;
    this.log('✅ 3 rows created successfully.');
  }

  // If your ProcessManager calls "verifyHeaders()", define it too
  verifyHeaders() {
    this.log('Verifying headers...');
    // Example logic: check each column in this.columns exists in the DOM
    // or do nothing if you don't actually need it
  }

  // If your ProcessManager calls "clickOnBlank()", define it too
  clickOnBlank() {
    this.log('Clicking on a blank cell...');
    // Example: find a blank cell or do nothing
  }
}


// Our "DateUpdater" class uses the data from `window.globalDates`
class DateUpdater {
  constructor(noDebug = true) {
    this.debug = !noDebug;
    this.wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  }
  log(...args) {
    if (this.debug) {
      console.log(...args);
    }
  }

  // Example only: If you want the "VALUES" from the older code, it can come from `globalDates`
  // or you can keep using a local reference. We'll just assume `ProcessManager` or external code sets it.

  logElements(description, selector) {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      console.warn(`❌ ${description}: No elements found for selector "${selector}"`);
    } else {
      this.log(`✅ ${description}: Found ${elements.length} element(s) for selector "${selector}"`);
      elements.forEach((el, index) => {
        this.log(`   [${index}] Tag: ${el.tagName}, ID: ${el.id || 'none'}, Classes: ${el.className}`);
      });
    }
  }

  async findList(type, value = null) {
    this.log(`\n--- findList: Searching for: ${type}, ${value} ---`);
    const visibleLists = Array.from(document.querySelectorAll('.svmx-boundlist')).filter(
      (list) => window.getComputedStyle(list).display !== 'none'
    );
    this.log(`Found ${visibleLists.length} visible lists.`);

    const expectedSizes = { hours: 12, minutes: 60, ampm: 2 };
    let targetSize = expectedSizes[type];
    if (value) {
      this.log(`#HoSeT Searching for specific value: ${value}`);
      targetSize = null;
    }

    let suitableList = null;
    for (const [index, list] of visibleLists.entries()) {
      const items = Array.from(list.querySelectorAll('.svmx-boundlist-item')).map((item) =>
        item.textContent.trim()
      );
      const size = items.length;
      this.log(`List ${index + 1}:${list.id}: ${size} items`, items);

      if (value && items.includes(value)) {
        this.log(`Found list with value "${value}"`);
        suitableList = list;
        break;
      }
      if (targetSize && size === targetSize) {
        this.log(`List ${list.id} matches size ${targetSize} for type "${type}"`);
        suitableList = list;
      }
    }

    if (!suitableList) {
      this.log(`No suitable list found for type "${type}"${value ? ` with value "${value}"` : ''}`);
    } else {
      this.log('Found suitable list:', suitableList.id);
    }
    return suitableList;
  }

  async setTimeField(selector, fieldType, targetValue, fieldName) {
    const trigger = document.querySelector(selector);
    if (!trigger) {
      console.error(`❌ Trigger for ${fieldType} not found`);
      return false;
    }
    trigger.click();

    let attempts = 10;
    let list = null;
    while (attempts > 0 && !list) {
      list = await this.findList(fieldType);
      if (!list) {
        await this.wait(10);
        attempts--;
      }
    }

    this.log(`Attempts "${11 - attempts}" for ${fieldType}`);

    if (!list) {
      console.error(`❌ ${fieldType.toUpperCase()} list not found for "${fieldName}"`);
      return false;
    }
    const option = Array.from(list.querySelectorAll('.svmx-boundlist-item')).find(
      (el) => el.textContent.trim() === targetValue
    );
    if (!option) {
      console.error(`❌ ${fieldType.toUpperCase()} option "${targetValue}" not found for "${fieldName}"`);
      return false;
    }
    option.click();
    this.log(`✅ ${fieldType.toUpperCase()} set to "${targetValue}" for "${fieldName}"`);
    return true;
  }

  async setHSType(rowIndex, options) {
    const { column, value, fieldName } = options;
    try {
      this.log(`\n=== Processing "${fieldName}" for row ${rowIndex + 1} ===`);
      this.logElements(`Elements with class "${column}"`, `.${column}`);
      const cells = document.querySelectorAll(`.${column}`);
      const cell = cells[rowIndex];
      if (!cell) {
        throw new Error(`❌ Cell with class "${column}" for row ${rowIndex + 1} not found`);
      }
      this.log(`🔄 Clicking on the cell in row ${rowIndex + 1}`);
      cell.click();
      await this.wait(100);

      const fieldSelectorMap = {
        'Hour Type': SEL.HOUR_TYPE,
        'Service Type': SEL.SERVICE_TYPE,
      };
      const editorSelector = fieldSelectorMap[fieldName];
      if (!editorSelector) {
        throw new Error(`❌ No selector for field "${fieldName}"`);
      }
      this.log(`🔍 Searching editor: "${editorSelector}"`);
      this.logElements(`Editors with selector "${editorSelector}"`, editorSelector);
      const fieldEditor = document.querySelector(editorSelector);
      if (!fieldEditor) {
        throw new Error('❌ Field editor did not appear');
      }
      this.logElements(
        'List triggers inside the editor',
        `${editorSelector} .svmx-form-trigger.svmx-form-arrow-trigger`
      );
      const arrowTrigger = fieldEditor.querySelector('.svmx-form-trigger.svmx-form-arrow-trigger');
      if (!arrowTrigger) {
        throw new Error('❌ Trigger not found in editor');
      }

      this.log('🔄 Clicking the list trigger');
      arrowTrigger.click();
      await this.wait(100);

      this.logElements(`All lists whose ID starts with "boundlist-"`, '[id^="boundlist-"]');
      const allBoundLists = document.querySelectorAll('[id^="boundlist-"]');
      if (allBoundLists.length === 0) {
        throw new Error('❌ No list with ID starting with "boundlist-" found');
      }

      let boundList = null;
      for (const list of allBoundLists) {
        const listItems = list.querySelectorAll('.svmx-boundlist-item');
        const availableOptions = Array.from(listItems).map((el) => el.textContent.trim());
        this.log(`🔍 Checking list ID "${list.id}" for the option "${value}":`, availableOptions);
        if (availableOptions.includes(value)) {
          boundList = list;
          this.log(`✅ List with ID "${list.id}" contains the option "${value}"`);
          break;
        }
      }
      if (!boundList) {
        throw new Error(`❌ List with the option "${value}" not found among all lists`);
      }

      this.logElements('Items of the found list', `#${boundList.id} .svmx-boundlist-item`);
      const listItems = boundList.querySelectorAll('.svmx-boundlist-item');
      const availableOptions = Array.from(listItems).map((el) => el.textContent.trim());
      this.log('📄 Available options in the found list:', availableOptions);

      const option = Array.from(listItems).find((el) => el.textContent.trim() === value);
      if (option) {
        this.log(`✅ Selecting the option "${value}"`);
        option.click();
        await this.wait(100);
        return true;
      } else {
        throw new Error(
          `❌ Option "${value}" not found. Available: ${availableOptions.join(', ')}`
        );
      }
    } catch (error) {
      console.error(`❗️ Error in row ${rowIndex + 1}:`, error.message);
      return false;
    }
  }

  async clickOnBlank() {
    // (Optional) click an empty cell
  }

  async setDateTime(row, columnClass, selectors, dateTime, fieldName) {
    this.log(`--- Setting DateTime for "${fieldName}" ---`);
    this.log(`Row: ${row.className}, Column: ${columnClass}, DateTime: ${JSON.stringify(dateTime)}`);
    this.log(`Selectors: ${JSON.stringify(selectors)}`);

    const cell = row.querySelector(`.${columnClass}`);
    if (!cell) {
      console.error(`❌ Cell for "${fieldName}" not found.`);
      return false;
    }
    this.log(`🔄 Clicking on "${fieldName}" cell.`);
    cell.click();
    await this.wait(100);

    // Date
    const dateInput = document.querySelector(selectors.SLdate);
    if (dateInput) {
      this.log(`📅 Setting date to "${dateTime.date}" for "${fieldName}". Current value: "${dateInput.value}"`);
      dateInput.value = '';
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.value = dateTime.date;
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      this.log(`✅ Date "${dateTime.date}" set for "${fieldName}".`);
    } else {
      console.error(`❌ Input field for "${fieldName}" not found.`);
    }
    await this.wait(100);

    // Time
    await this.setTimeField(selectors.SLhour, 'hours', dateTime.hours, fieldName);
    await this.wait(150);
    await this.setTimeField(selectors.SLminu, 'minutes', dateTime.minutes, fieldName);
    await this.wait(150);
    await this.setTimeField(selectors.SLamPm, 'ampm', dateTime.amPm, fieldName);
    await this.wait(150);
  }

  getRowIndex(row) {
    const rows = Array.from(document.querySelectorAll(SEL.ROWS));
    return rows.indexOf(row);
  }

  getRows() {
    const rows = Array.from(document.querySelectorAll(SEL.ROWS));
    this.log(`Found ${rows.length} rows.`);
    return rows;
  }

  async run() {
    const rows = this.getRows();
    if (!rows.length) {
      console.error('❌ No rows found. Exiting.');
      return;
    }

    // If you'd like to fill them automatically from globalDates, you can do so here
    this.log('🎉 All rows processed successfully.');
  }
}

// In older code, we had "VALUES". Now we rely on window.globalDates for the ProcessManager:
class ProcessManager {
  constructor(tableProcessor, dateUpdater) {
    this.tableProcessor = tableProcessor;
    this.dateUpdater = dateUpdater;
  }

  async createAndFillRows() {
    try {
      await this.tableProcessor.createRows();
      // Wait for the DOM to render the new rows
      await new Promise(resolve => setTimeout(resolve, 300)); //
      await this.tableProcessor.verifyHeaders();
      const allRows = this.dateUpdater.getRows();
      const newRows = Array.from(allRows).slice(-this.tableProcessor.createdRowsCount);

      // We'll fill each row using 'window.globalDates' (the user input from the modal).
      const inputData = window.globalDates || [];
      for (let i = 0; i < newRows.length; i++) {
        const row = newRows[i];
        const rowValues = inputData[i];
        if (!rowValues) break; // no more data

        // Set Start
        await this.dateUpdater.setDateTime(
          row,
          SEL.COLUMNS['Start Date Time'],
          {
            SLdate: SEL.START_DATE,
            SLhour: SEL.S_HOUR,
            SLminu: SEL.S_MIN,
            SLamPm: SEL.S_AM_PM
          },
          rowValues.start,
          'Start Date Time'
        );

        // Set End
        await this.dateUpdater.setDateTime(
          row,
          SEL.COLUMNS['End Date Time'],
          {
            SLdate: SEL.END_DATE,
            SLhour: SEL.E_HOUR,
            SLminu: SEL.E_MIN,
            SLamPm: SEL.E_AM_PM
          },
          rowValues.end,
          'End Date Time'
        );

        // Hour Type
        await this.dateUpdater.setHSType(this.dateUpdater.getRowIndex(row), {
          column: SEL.COLUMNS['Hour Type'],
          value: rowValues.hourType,
          fieldName: 'Hour Type'
        });

        // Service Type
        await this.dateUpdater.setHSType(this.dateUpdater.getRowIndex(row), {
          column: SEL.COLUMNS['Service Type'],
          value: rowValues.servType,
          fieldName: 'Service Type'
        });
      }

      await this.tableProcessor.clickOnBlank();
      console.log('✅ The last three rows have been successfully filled.');
    } catch (error) {
      console.error('❌ Error creating/filling rows:', error.message);
    }
  }
}

// Create instances
const tableProcessor = new TableProcessor(SEL.COLUMNS, true); // false => debug logs ON
const dateUpdater = new DateUpdater(true);                    // false => debug logs ON
const processManager = new ProcessManager(tableProcessor, dateUpdater);

// ================================================================
// PART 2: DateInputButton - UI for entering 3 rows of start/end date/time
// ================================================================
class DateInputButton {
    constructor(buttonText) {
        this.version = 'v1.4';
        this.buttonText = buttonText;

        const today = new Date();
        // Example default: YYYY-MM-DD
        const todayFormatted = `${today.getFullYear()}-${(today.getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        // Our local array of 3 rows (start/end date/time)
        // this.dates = Array(3)
        //     .fill()
        //     .map(() => ({
        //         start: {
        //             date: todayFormatted,
        //             hours: '08',
        //             minutes: '00',
        //             amPm: 'PM',
        //         },
        //         end: {
        //             date: todayFormatted,
        //             hours: '08',
        //             minutes: '30',
        //             amPm: 'AM',
        //         },
        //     }));
/**/
        this.dates = [
          {
            start: {
              date: todayFormatted,
              hours: '08',
              minutes: '00',
              amPm: 'AM',
            },
            end: {
              date: todayFormatted,
              hours: '08',
              minutes: '30',
              amPm: 'AM',
            }
          },
          {
            start: {
              date: todayFormatted,
              hours: '08',
              minutes: '30',
              amPm: 'AM',
            },
            end: {
              date: todayFormatted,
              hours: '09',
              minutes: '00',
              amPm: 'PM',
            }
          },
          {
            start: {
              date: todayFormatted,
              hours: '09',
              minutes: '00',
              amPm: 'PM',
            },
            end: {
              date: todayFormatted,
              hours: '10',
              minutes: '00',
              amPm: 'PM',
            }
          }
        ];


        // Create the "Add dates" button
        this.createButton();
    }

    convert24to12(hours) {
        let amPm = 'AM';
        let hour = parseInt(hours, 10);

        if (hour >= 12) {
            amPm = 'PM';
            if (hour > 12) {
                hour -= 12;
            }
        }
        if (hour === 0) {
            hour = 12;
        }

        return {
            hours: hour.toString().padStart(2, '0'),
            amPm: amPm,
        };
    }

    formatDateToMMDDYYYY(dateString) {
      const [y, m, d] = dateString.split('-').map(Number);
  // Explicitly create local date using year, month, day components
      const localDate = new Date(y, m - 1, d);

      const mm = String(localDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localDate.getDate()).padStart(2, '0');
      const yyyy = localDate.getFullYear();
      return `${mm}/${dd}/${yyyy}`;
    }

    createButton() {
        const button = document.createElement('button');
        button.textContent = this.buttonText;
        button.style.position = 'fixed';
        button.style.left = '50%';
        button.style.top = '2px';
        button.style.transform = 'translateX(-50%)';
        button.style.padding = '8px 20px';
        button.style.backgroundColor = '#007bff';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '1000';
        button.style.color = '#000';

        button.addEventListener('click', () => this.showInputModal());
        document.body.appendChild(button);
    }

    createDateTimeInput(label, initialValue) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.style.display = 'block';
        labelElement.style.marginBottom = '3px';

        const input = document.createElement('input');
        input.type = 'date';
        input.value = initialValue?.date || '';
        input.style.width = '100%';
        input.style.padding = '3px';
        input.style.marginBottom = '3px';

        container.appendChild(labelElement);
        container.appendChild(input);
        return { container, input };
    }

    createTimeInputs(label, timeData) {
        const container = document.createElement('div');
        container.style.marginBottom = '10px';

        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.style.display = 'block';
        labelElement.style.marginBottom = '3px';

        const timeContainer = document.createElement('div');
        timeContainer.style.display = 'flex';
        timeContainer.style.gap = '5px';

        const hours = document.createElement('input');
        hours.type = 'text';
        hours.placeholder = 'HH';
        hours.value = timeData?.hours || '';
        hours.style.width = '40px';
        hours.maxLength = 2;

        hours.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 0 || val > 23) {
                e.target.value = '';
            } else {
                if (val > 12) {
                    const converted = this.convert24to12(val);
                    e.target.value = converted.hours;
                    ampm.value = converted.amPm;
                }
            }
        });

        const minutes = document.createElement('input');
        minutes.type = 'text';
        minutes.placeholder = 'MM';
        minutes.value = timeData?.minutes || '';
        minutes.style.width = '40px';
        minutes.maxLength = 2;

        minutes.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (val > 59) {
                e.target.value = '59';
            }
        });

        const ampm = document.createElement('select');
        ['AM', 'PM'].forEach((opt) => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (timeData?.amPm === opt) option.selected = true;
            ampm.appendChild(option);
        });

        // Tab navigation
        ampm.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                setTimeout(() => {
                    const allInputs = document.querySelectorAll('input, select');
                    const currentIndex = Array.from(allInputs).indexOf(e.target);
                    const nextIndex = currentIndex + 2;
                    if (allInputs[nextIndex]) {
                        allInputs[nextIndex].focus();
                        allInputs[nextIndex].select();
                    } else {
                        const saveButton = document.querySelector('button');
                        if (saveButton) {
                            saveButton.focus();
                        }
                    }
                }, 0);
            }
        });

        timeContainer.appendChild(hours);
        timeContainer.appendChild(minutes);
        timeContainer.appendChild(ampm);

        container.appendChild(labelElement);
        container.appendChild(timeContainer);
        return { container, hours, minutes, ampm };
    }

    createRowInputs(rowIndex) {
        const rowData = this.dates[rowIndex];

        const container = document.createElement('div');
        container.style.marginBottom = '15px';
        container.style.padding = '10px';
        container.style.border = '1px solid #ccc';
        container.style.borderRadius = '5px';
        container.style.width = '100%';

        const rowLabel = document.createElement('div');
        rowLabel.textContent = `Row ${rowIndex + 1}`;
        rowLabel.style.fontWeight = 'bold';
        rowLabel.style.marginBottom = '5px';
        rowLabel.style.textAlign = 'center';
        container.appendChild(rowLabel);

        // Start date/time
        const startContainer = document.createElement('div');
        startContainer.style.display = 'flex';
        startContainer.style.gap = '10px';
        const startDate = this.createDateTimeInput('Start Date (mm/dd/yyyy):', rowData.start);
        const startTime = this.createTimeInputs('Start Time:', rowData.start);
        startContainer.appendChild(startDate.container);
        startContainer.appendChild(startTime.container);

        // End date/time
        const endContainer = document.createElement('div');
        endContainer.style.display = 'flex';
        endContainer.style.gap = '10px';
        endContainer.style.marginTop = '10px';
        const endDate = this.createDateTimeInput('End Date (mm/dd/yyyy):_', rowData.end);
        const endTime = this.createTimeInputs('End Time:', rowData.end);
        endContainer.appendChild(endDate.container);
        endContainer.appendChild(endTime.container);

        container.appendChild(startContainer);
        container.appendChild(endContainer);
        // ----------------------------------------------------------
        // COLORING the START FIELDS for 2nd & 3rd rows (rowIndex=1,2)
        // ----------------------------------------------------------
        endDate.input.style.backgroundColor   = '#eee';
        if (rowIndex >= 1) {
          // "startDate.input" is the <input type="date">
          startDate.input.style.backgroundColor = '#eee';
          // For "startTime", color hours, minutes, ampm
          startTime.hours.style.backgroundColor   = '#eee';
          startTime.minutes.style.backgroundColor = '#eee';
          startTime.ampm.style.backgroundColor    = '#eee';
        }

        return { container, startDate, startTime, endDate, endTime };
    }

    showInputModal() {
        if (document.getElementById('date-input-modal')) {
            return; // Already open
        }

        const modal = document.createElement('div');
        modal.id = 'date-input-modal';
        modal.style.position = 'fixed';
        modal.style.top = '50%';
        modal.style.left = '50%';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.maxHeight = '80vh';
        modal.style.overflowY = 'auto';
        modal.style.padding = '15px';
        modal.style.backgroundColor = '#d8f4fc';
        modal.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        modal.style.borderRadius = '5px';
        modal.style.zIndex = '1001';

        const rows = [];
        for (let i = 0; i < 3; i++) {
            const row = this.createRowInputs(i);
            rows.push(row);
            modal.appendChild(row.container);

            // If user changes date in the first row, replicate to all
            row.startDate.input.addEventListener('change', () => {
                const newDate = row.startDate.input.value;
                rows.forEach((r) => {
                    r.startDate.input.value = newDate;
                    r.endDate.input.value = newDate;
                });
            });

            // Some auto-copy logic from the end time of row i to the start time of row i+1
            if (i < 2) {
                row.endTime.hours.addEventListener('input', (e) => {
                    const nextRow = rows[i + 1];
                    nextRow.startTime.hours.value = e.target.value;
                    nextRow.startTime.minutes.value = row.endTime.minutes.value;
                    nextRow.startTime.ampm.value = row.endTime.ampm.value;
                });
                row.endTime.minutes.addEventListener('input', (e) => {
                    const nextRow = rows[i + 1];
                    nextRow.startTime.hours.value = row.endTime.hours.value;
                    nextRow.startTime.minutes.value = e.target.value;
                    nextRow.startTime.ampm.value = row.endTime.ampm.value;
                });
                row.endTime.ampm.addEventListener('change', (e) => {
                    const nextRow = rows[i + 1];
                    nextRow.startTime.hours.value = row.endTime.hours.value;
                    nextRow.startTime.minutes.value = row.endTime.minutes.value;
                    nextRow.startTime.ampm.value = e.target.value;
                });
            }
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '15px';

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.style.backgroundColor = '#f4f4f4';
        saveButton.style.color = '#000';
        saveButton.style.border = 'none';
        saveButton.style.padding = '2px 15px';
        saveButton.style.borderRadius = '3px';
        saveButton.style.cursor = 'pointer';
        saveButton.addEventListener('focus', () => {
            saveButton.style.background = '#64c4dc';
        });
        saveButton.addEventListener('blur', () => {
            saveButton.style.background = '#f4f4f4';
        });

        saveButton.addEventListener('click', () => {
            // Build the final array from user input
            this.dates = rows.map((row, index) => ({
                start: {
                    date: this.formatDateToMMDDYYYY(row.startDate.input.value),
                    hours: row.startTime.hours.value.padStart(2, '0'),
                    minutes: row.startTime.minutes.value.padStart(2, '0'),
                    amPm: row.startTime.ampm.value,
                },
                end: {
                    date: this.formatDateToMMDDYYYY(row.endDate.input.value),
                    hours: row.endTime.hours.value.padStart(2, '0'),
                    minutes: row.endTime.minutes.value.padStart(2, '0'),
                    amPm: row.endTime.ampm.value,
                },
                hourType: index === 1 ? 'Service' : 'Travel',
                servType: 'On-Site Service',
            }));

            console.log('Saved dates:', this.dates);

            // 1) Store these in the global array so our TableProcessor can use them
            window.globalDates = this.dates;

            // 2) Optionally run processManager to fill the table right after Save
            processManager.createAndFillRows();

            document.body.removeChild(modal);
        });

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.backgroundColor = '#dc3545';
        cancelButton.style.color = '#000';
        cancelButton.style.border = 'none';
        cancelButton.style.padding = '8px 15px';
        cancelButton.style.borderRadius = '3px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.addEventListener('focus', () => {
            cancelButton.style.background = '#94c4dc';
        });
        cancelButton.addEventListener('blur', () => {
            cancelButton.style.background = '#f4f4f4';
        });
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(cancelButton);
        modal.appendChild(buttonContainer);

        // Version info inside the modal
        const versionDiv = document.createElement('div');
        versionDiv.textContent = `Version: ${this.version}`;
        versionDiv.style.position = 'absolute';
        versionDiv.style.left = '10px';
        versionDiv.style.bottom = '10px';
        versionDiv.style.color = '#889';
        versionDiv.style.padding = '5px 10px';
        versionDiv.style.fontSize = '12px';
        modal.appendChild(versionDiv);

        document.body.appendChild(modal);
    }
}

    // -----------------------------------------------------------
    // Inject global CSS styles to highlight focused/active fields
    // -----------------------------------------------------------
    (function addFocusStyles() {
        const style = document.createElement('style');
        style.textContent = `
          /* Hover/focus styling for dropdown items */
          .svmx-boundlist-item:hover,
          .svmx-boundlist-item:focus,
          .svmx-boundlist-item:active {
          background-color: #cdefff !important; /* Lighter teal highlight */
          }

          /* Standardize borders for all text inputs, date inputs, and select boxes */
          input[type="text"],
          input[type="date"],
          select {
            border: 1px solid #ccc !important; 
            border-radius: 3px; 
            box-sizing: border-box; 
          }

          /* Outline/focus styling for text inputs and select boxes */
          input[type="text"]:focus,
          input[type="date"]:focus,
          select:focus {
          box-shadow: 0 0 0 1px #39AECF !important; 
          //background-color: #E4F7FC !important;  /* Light background to stand out from modal */
          }
        `;
        document.head.appendChild(style);
    })();

// Create the button instance
new DateInputButton('Add dates');
})();
