# clm-add-rows

Automatically add 3 rows and fill travel/service date and time in WO.

## How to Install this script.

1. You need a browser extension like Tampermonkey  that runs custom scripts:

    Chrome:  https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

    Firefox: https://addons.mozilla.org/firefox/addon/tampermonkey/

    Edge:    https://microsoftedge.microsoft.com/addons/detail/tampermonkey/

    Safari:  https://apps.apple.com/app/tampermonkey/id1482490089

2. After installing Tampermonkey, click its icon in the toolbar and choose "Dashboard" (or "Manage scripts").

3. Create a New Script
  Click "+" (plus icon) or "Add new script".
  Delete the default template, then paste the entire script code into the editor.

  4. Click File → Save, or press Ctrl+S (Windows).

  5. Click on the "Installed Userscripts" and enable this script.

  6. Tampermonkey requires enabling Developer mode to install custom scripts. To do this:
  - Chrome: 
     > Open the extensions page (chrome://extensions) in your browser.
     > Enable the "Developer mode" switch in the left side of the page.
 - Opera
   > Open the extensions page (opera://extensions) in your browser.
   > Enable the "Developer mode" switch at the top right.
 - Microsoft Edge 
   > Open the extensions page (edge://extensions) in your browser.
   > Enable the "Developer mode" switch in the left side of the page.

  That’s all! Your userscript is now installed and will run whenever you visit the specified site(s).


  ## How to use this script.
  ![image](https://github.com/user-attachments/assets/f08f8fd5-c7ed-4b8f-9528-8a2d9806202b)


  Open the Work Order.
  Click on "Review and Add Labor Time"
  You'll see an "Add dates" button fixed at the top center of your screen. Click this button.
  A modal window opens with three rows of date/time inputs (Start and End fields).
  Fill Your Dates.

  Each row is labeled (Row 1, Row 2, Row 3). The gray fields are filled in automatically: 
  finishing one row’s end time pre-fill the next row’s start time.

  When you click "Save", the script insert those values into your Work Order Time table.

  ** Tips: **
  - You can enter time in 24-hour format (e.g., 14:30 for 2:30 PM).
  - It's convenient to switch between fields using the Tab key.

  Enjoy! 


- v1.3 Minor changes in highlighting the active field.
- v1.4 Time Zone Correction in Date Parsing.
