/**
 * WOW Sir — Study Corner Chapter Resources
 * Keywords, notes per chapter for all grades (4–9)
 */

import type { ChapterResource } from './studyContent';

export const CHAPTER_RESOURCES: Record<string, ChapterResource> = {

  /* ══════════════════════════════════════════════════════
     GRADE 4
  ══════════════════════════════════════════════════════ */
  'gr4-ch1-peripherals': {
    keywords: [
      { term: 'Peripheral', definition: 'Any external device connected to a computer to give it extra functionality.' },
      { term: 'Input device', definition: 'Hardware that sends data INTO the computer (keyboard, mouse, scanner, microphone).' },
      { term: 'Output device', definition: 'Hardware that receives data FROM the computer (monitor, printer, speakers).' },
      { term: 'USB', definition: 'Universal Serial Bus — a common port used to connect many peripherals to a computer.' },
      { term: 'Bluetooth', definition: 'Wireless technology that lets devices communicate over short distances without cables.' },
      { term: 'Wireless', definition: 'A connection that uses radio waves instead of cables — e.g. wireless mouse or keyboard.' },
    ],
    notes: [
      'Input devices send information to the CPU; output devices receive information from the CPU.',
      'A touchscreen is BOTH an input (touch) and output (display) device.',
      'USB ports are the most common way to connect peripherals today.',
      'Printers, monitors and speakers are examples of output devices.',
      'Keyboards, mice and webcams are examples of input devices.',
      'Some devices like a USB hub need their own power source when connecting many peripherals.',
    ],
  },

  'gr4-ch2-logo': {
    keywords: [
      { term: 'Logo', definition: 'A programming language that uses a turtle on screen to draw shapes using simple commands.' },
      { term: 'FORWARD (FD)', definition: 'Logo command to move the turtle forward a set number of steps.' },
      { term: 'RIGHT (RT)', definition: 'Logo command to turn the turtle clockwise by a number of degrees.' },
      { term: 'LEFT (LT)', definition: 'Logo command to turn the turtle anti-clockwise by a number of degrees.' },
      { term: 'REPEAT', definition: 'Runs a set of commands a fixed number of times. E.g. REPEAT 4 [FD 50 RT 90].' },
      { term: 'Procedure', definition: 'A named block of Logo code you can call by name, like TO SQUARE.' },
      { term: 'Interior angle', definition: 'The angle inside a polygon at each vertex.' },
      { term: 'Exterior angle', definition: 'The turning angle needed to draw a polygon. For any polygon, all exterior angles sum to 360°.' },
    ],
    notes: [
      'To draw a square: REPEAT 4 [FD 50 RT 90]. The turn is 90° because 360 ÷ 4 = 90.',
      'To draw an equilateral triangle: REPEAT 3 [FD 50 RT 120]. Turn = 360 ÷ 3 = 120.',
      'For any regular polygon: turn angle = 360 ÷ number of sides.',
      'To draw a circle, use REPEAT 360 [FD 1 RT 1] — 360 tiny steps.',
      'PU (pen up) lifts the pen so moving leaves no line; PD (pen down) draws again.',
      'CS clears the screen; HOME returns the turtle to the centre.',
      'Use REPEAT inside procedures to create reusable shapes.',
    ],
  },

  'gr4-ch3-files': {
    keywords: [
      { term: 'File', definition: 'A named collection of data stored on a computer — documents, images, videos etc.' },
      { term: 'Folder (Directory)', definition: 'A container used to organise files on a computer.' },
      { term: 'File extension', definition: 'Letters after the dot in a filename that show its type — .docx, .jpg, .mp3.' },
      { term: 'Path', definition: 'The full address of a file\'s location, e.g. C:\\Users\\Wilfred\\Documents\\essay.docx.' },
      { term: 'Rename', definition: 'Changing the name of a file or folder without moving or deleting it.' },
      { term: 'Copy & Paste', definition: 'Duplicates a file — the original stays and a copy is placed elsewhere.' },
      { term: 'Cut & Paste', definition: 'Moves a file — the original is removed from its location and placed elsewhere.' },
      { term: 'Recycle Bin', definition: 'A temporary holding area for deleted files — they can be restored from here.' },
    ],
    notes: [
      'Always save files in a logical folder so you can find them later.',
      'Use Ctrl+C to copy, Ctrl+X to cut, and Ctrl+V to paste.',
      'The Recycle Bin only holds files deleted from the local hard drive, not USB drives.',
      'File extensions tell the computer which program to use to open a file.',
      'Renaming a file does not change its contents.',
      'Organise files into folders by subject or project to keep your computer tidy.',
      'Right-clicking a file gives you a context menu with options like copy, rename and delete.',
    ],
  },

  'gr4-ch4-desktop': {
    keywords: [
      { term: 'Desktop', definition: 'The main screen you see after logging into a computer — your workspace.' },
      { term: 'Wallpaper', definition: 'The background image displayed on the desktop.' },
      { term: 'Screensaver', definition: 'An animation or image that appears when the computer is idle, to protect the screen.' },
      { term: 'Taskbar', definition: 'The bar (usually at the bottom) showing open programs and the Start button.' },
      { term: 'Control Panel', definition: 'A Windows tool for adjusting system settings like display, sound and users.' },
      { term: 'Accessibility', definition: 'Features that make a computer easier to use for people with disabilities — e.g. magnifier, narrator.' },
      { term: 'Shortcut', definition: 'An icon on the desktop that links to a program or file for quick access.' },
    ],
    notes: [
      'Right-click on the desktop → Personalise to change wallpaper and themes.',
      'You can pin frequently used programs to the taskbar for quick access.',
      'Screensavers can be set to activate after a chosen number of idle minutes.',
      'Accessibility features include Magnifier, Narrator (reads text aloud) and High Contrast mode.',
      'Multiple desktops (virtual desktops) let you organise open windows into separate spaces.',
      'Display settings let you adjust resolution, brightness and screen orientation.',
    ],
  },

  'gr4-ch5-formatting': {
    keywords: [
      { term: 'Font', definition: 'The style and design of text characters — e.g. Arial, Times New Roman.' },
      { term: 'Font size', definition: 'The height of text, measured in points (pt). 12pt is standard body text.' },
      { term: 'Bold', definition: 'Makes text heavier/darker for emphasis. Shortcut: Ctrl+B.' },
      { term: 'Italic', definition: 'Slants text for emphasis or titles. Shortcut: Ctrl+I.' },
      { term: 'Underline', definition: 'Adds a line under text. Shortcut: Ctrl+U.' },
      { term: 'Alignment', definition: 'How text lines up: Left, Centre, Right or Justified.' },
      { term: 'Paragraph spacing', definition: 'The space before or after a paragraph, set in paragraph formatting.' },
      { term: 'Line spacing', definition: 'The amount of space between lines of text — Single, 1.5 or Double.' },
    ],
    notes: [
      'Select text first, then apply formatting — the Home tab holds most formatting tools.',
      'Ctrl+B = Bold, Ctrl+I = Italic, Ctrl+U = Underline.',
      'Use Justify alignment for formal documents to give neat left and right edges.',
      'Font size 10–12pt is standard for body text; headings are typically 14–18pt.',
      'Clear Formatting (in the Home tab) removes all applied formatting from selected text.',
      'The Format Painter (paintbrush icon) copies formatting from one piece of text to another.',
      'Avoid using too many different fonts — two is usually enough for one document.',
    ],
  },

  'gr4-ch6-word': {
    keywords: [
      { term: 'Header', definition: 'Text that appears at the top of every page of a document.' },
      { term: 'Footer', definition: 'Text that appears at the bottom of every page — often used for page numbers.' },
      { term: 'Page border', definition: 'A decorative line or box drawn around the edges of a page.' },
      { term: 'Page layout', definition: 'Settings that control page size, orientation (portrait/landscape) and margins.' },
      { term: 'Margins', definition: 'The blank space between the text area and the edge of the page.' },
      { term: 'Insert picture', definition: 'Adding an image file into a Word document using Insert → Pictures.' },
      { term: 'Text wrap', definition: 'Controls how text flows around an inserted image — e.g. Square, In Line.' },
    ],
    notes: [
      'Insert → Header & Footer to add repeating content at the top or bottom of every page.',
      'Page numbers are inserted in the Header or Footer: Insert → Page Number.',
      'Design → Page Borders opens the page border tool in Word.',
      'Landscape orientation (wider than tall) is useful for tables and charts.',
      'Margins: Layout → Margins. Normal margin is 2.54 cm on all sides.',
      'After inserting a picture, use the Layout Options button to change text wrapping.',
      'Hold Shift while resizing an image to keep its proportions.',
    ],
  },

  'gr4-ch7-internet': {
    keywords: [
      { term: 'Internet', definition: 'A global network connecting millions of computers worldwide.' },
      { term: 'Web browser', definition: 'Software used to access websites — e.g. Chrome, Firefox, Edge.' },
      { term: 'URL', definition: 'Uniform Resource Locator — the web address of a page, e.g. www.bbc.co.uk.' },
      { term: 'Search engine', definition: 'A tool for finding websites — e.g. Google, Bing.' },
      { term: 'Keyword', definition: 'A word or phrase typed into a search engine to find information.' },
      { term: 'Hyperlink', definition: 'Clickable text or image that takes you to another web page.' },
      { term: 'Online safety', definition: 'Rules and practices to stay safe when using the internet.' },
      { term: 'Bookmark', definition: 'A saved link to a website for quick future access.' },
    ],
    notes: [
      'The World Wide Web (WWW) is a collection of websites accessed through the internet.',
      'HTTPS in a URL means the site is secure — look for a padlock in the browser bar.',
      'Never share personal information (name, address, password) online with strangers.',
      'Use specific keywords for better search results — e.g. "capital of Ghana" not just "capital".',
      'Websites can contain unreliable information — always check a second source.',
      'Bookmarks/Favourites save time so you do not have to retype a URL every time.',
      'Avoid clicking unknown links — they could lead to harmful or inappropriate sites.',
    ],
  },

  'gr4-ch8-ppt1': {
    keywords: [
      { term: 'Presentation', definition: 'A set of slides used to share information with an audience.' },
      { term: 'Slide', definition: 'A single page in a PowerPoint presentation.' },
      { term: 'Layout', definition: 'A pre-set arrangement of placeholders on a slide (Title, Content, Blank etc.).' },
      { term: 'Placeholder', definition: 'A dashed box on a slide where you click to add text, images or media.' },
      { term: 'Theme', definition: 'A set of colours, fonts and backgrounds applied consistently to all slides.' },
      { term: 'Slide panel', definition: 'The left-side panel in PowerPoint showing thumbnail previews of all slides.' },
      { term: 'Normal view', definition: 'The main editing view in PowerPoint — slide panel on the left, editing area on the right.' },
    ],
    notes: [
      'Click New Slide in the Home tab to add a slide; right-click in the slide panel to duplicate or delete.',
      'Choose a layout from the Layout dropdown — "Title and Content" is the most common.',
      'A good presentation uses a consistent theme throughout all slides.',
      'Keep text on slides minimal — slides support your speech, not replace it.',
      'Use the Design tab to apply and customise themes and slide backgrounds.',
      'Slide Show → From Beginning (or press F5) to run the presentation.',
      'Ctrl+M adds a new slide; Delete key removes a selected slide.',
    ],
  },

  'gr4-ch9-ppt2': {
    keywords: [
      { term: 'Transition', definition: 'An animated effect when moving from one slide to the next.' },
      { term: 'Animation', definition: 'A movement or effect applied to objects (text, images) within a slide.' },
      { term: 'Slide Master', definition: 'A master template that controls the design of all slides at once.' },
      { term: 'Print layout', definition: 'Options for printing slides: full page, handouts or notes pages.' },
      { term: 'Handout', definition: 'A printed version of slides — can show multiple slides per page.' },
      { term: 'Notes pane', definition: 'Area below the slide in Normal view for speaker notes not visible to the audience.' },
    ],
    notes: [
      'Transitions tab: choose an effect, set speed, and apply to all slides for consistency.',
      'Animations tab: add entrance, emphasis and exit effects to individual objects.',
      'Do not use too many different transitions and animations — it distracts from the content.',
      'File → Print → Settings lets you choose Handouts (2, 4, 6 or 9 slides per page).',
      'The Notes pane is useful for writing reminders to yourself as the presenter.',
      'Insert → Pictures or Online Pictures to add visuals; drag the corner to resize.',
      'Always proofread your slides before presenting.',
    ],
  },

  /* ══════════════════════════════════════════════════════
     GRADE 5
  ══════════════════════════════════════════════════════ */
  'gr5-ch1-history': {
    keywords: [
      { term: 'Generation (computers)', definition: 'A period in computer history marked by a major technology change — 5 generations so far.' },
      { term: 'Vacuum tube', definition: '1st generation technology — large, hot, unreliable electronic switches.' },
      { term: 'Transistor', definition: '2nd generation — small solid-state switch that replaced vacuum tubes; faster and more reliable.' },
      { term: 'Integrated circuit (IC)', definition: '3rd generation — many transistors on a single silicon chip.' },
      { term: 'Microprocessor', definition: '4th generation — entire CPU on one chip; led to personal computers.' },
      { term: 'Artificial Intelligence', definition: '5th generation — computers that can learn and make decisions.' },
      { term: 'ENIAC', definition: 'One of the first electronic computers (1945), filled an entire room.' },
    ],
    notes: [
      '1st gen (1940s–50s): vacuum tubes, very large and expensive, used by governments.',
      '2nd gen (1950s–60s): transistors, smaller, cheaper, more reliable.',
      '3rd gen (1960s–70s): integrated circuits, even smaller, multipurpose computers.',
      '4th gen (1970s–now): microprocessors, personal computers, laptops, smartphones.',
      '5th gen (now–future): AI, machine learning, quantum computing.',
      'Moore\'s Law: the number of transistors on a chip doubles roughly every 2 years.',
      'Early computers had no screens — output was printed on paper.',
    ],
  },

  'gr5-ch2-storage': {
    keywords: [
      { term: 'Hard Disk Drive (HDD)', definition: 'A magnetic storage device with spinning platters — large capacity but slower.' },
      { term: 'Solid State Drive (SSD)', definition: 'Storage using flash memory chips — faster and more durable than HDD, no moving parts.' },
      { term: 'USB flash drive', definition: 'A small portable storage device that plugs into a USB port.' },
      { term: 'Optical disc', definition: 'A disc that stores data as tiny pits read by a laser — CD, DVD, Blu-ray.' },
      { term: 'Cloud storage', definition: 'Storing files on remote servers accessed over the internet (Google Drive, OneDrive).' },
      { term: 'Capacity', definition: 'The maximum amount of data a storage device can hold, measured in GB or TB.' },
      { term: 'Volatile memory', definition: 'Memory that loses its data when power is off — e.g. RAM.' },
      { term: 'Non-volatile memory', definition: 'Memory that keeps data without power — e.g. HDD, SSD, USB.' },
    ],
    notes: [
      '1 KB = 1024 bytes, 1 MB = 1024 KB, 1 GB = 1024 MB, 1 TB = 1024 GB.',
      'SSDs are faster and more shock-resistant than HDDs but are more expensive per GB.',
      'Cloud storage can be accessed from any internet-connected device.',
      'Optical discs are becoming less common as cloud storage grows.',
      'Always back up important data to at least two different locations.',
      'RAM is volatile — data is lost when the computer shuts down.',
      'A USB drive is convenient for moving files between computers.',
    ],
  },

  'gr5-ch3-tables': {
    keywords: [
      { term: 'Table', definition: 'A grid of rows and columns used to organise information in a document.' },
      { term: 'Row', definition: 'A horizontal line of cells in a table.' },
      { term: 'Column', definition: 'A vertical line of cells in a table.' },
      { term: 'Cell', definition: 'The intersection of a row and column — where data is entered.' },
      { term: 'Merge cells', definition: 'Combining two or more adjacent cells into one larger cell.' },
      { term: 'Split cells', definition: 'Dividing one cell into multiple rows or columns.' },
      { term: 'Table border', definition: 'The line around the edges of cells — can be styled or hidden.' },
    ],
    notes: [
      'Insert → Table: drag to select rows and columns, or type exact numbers.',
      'Click in a cell and press Tab to move to the next cell; Shift+Tab moves back.',
      'The Table Design and Layout tabs appear on the ribbon when a table is selected.',
      'Use "Distribute Rows/Columns Evenly" to make all rows or columns the same size.',
      'Right-click inside a table to access Insert Row, Delete Row and Merge Cells.',
      'Adding a header row (shaded differently) helps readers understand the table.',
      'You can convert a plain text list into a table: Insert → Table → Convert Text to Table.',
    ],
  },

  'gr5-ch4-pptanim': {
    keywords: [
      { term: 'Animation', definition: 'An effect applied to an object on a slide — entrance, emphasis or exit.' },
      { term: 'Entrance effect', definition: 'How an object appears on the slide — e.g. Fly In, Fade.' },
      { term: 'Exit effect', definition: 'How an object leaves the slide — e.g. Disappear, Fly Out.' },
      { term: 'Emphasis effect', definition: 'An animation applied to an object already visible — e.g. Spin, Pulse.' },
      { term: 'Animation Pane', definition: 'A panel showing all animations on a slide in the order they will play.' },
      { term: 'Trigger', definition: 'A condition that starts an animation — on click, after previous, or with previous.' },
      { term: 'Duration', definition: 'How long an animation takes to complete, set in seconds.' },
    ],
    notes: [
      'Select an object, go to Animations tab, then click an effect to apply it.',
      '"On Click" starts the animation when you click; "After Previous" starts it automatically.',
      'Use the Animation Pane to reorder, adjust timing and preview animations.',
      'Entrance effects are green; emphasis effects are yellow; exit effects are red.',
      'Keep animations simple and purposeful — avoid overloading slides with effects.',
      'Insert → Video to embed a video clip; it plays within the slide during presentation.',
      'Insert → Audio to add background music or a recorded narration.',
    ],
  },

  'gr5-ch5-slideshow': {
    keywords: [
      { term: 'Slide Show', definition: 'Full-screen presentation mode where slides are displayed to the audience.' },
      { term: 'Rehearse Timings', definition: 'Records how long you spend on each slide so slides advance automatically.' },
      { term: 'Presenter View', definition: 'Shows speaker notes and next slide on the presenter\'s screen, while the audience sees only the slide.' },
      { term: 'Kiosk mode', definition: 'A self-running loop presentation — slides advance automatically without a presenter.' },
      { term: 'Hyperlink (in PPT)', definition: 'A clickable link on a slide that jumps to another slide, file or website.' },
      { term: 'Action button', definition: 'A shape that performs an action when clicked — e.g. go to first slide, play sound.' },
    ],
    notes: [
      'Slide Show → Rehearse Timings: click through as if presenting; timings are saved per slide.',
      'Set Up Slide Show → Browsed at a kiosk enables loop mode.',
      'Use Presenter View (Slide Show → Use Presenter View) to see notes on your screen.',
      'Press B during a slide show to black out the screen; press W for white.',
      'Press Escape to exit a slide show at any time.',
      'Hyperlinks to other slides are useful for interactive/non-linear presentations.',
      'Right-click during a presentation to access navigation and pointer tools.',
    ],
  },

  'gr5-ch6-internet': {
    keywords: [
      { term: 'Email', definition: 'Electronic mail — messages sent digitally from one person to another over a network.' },
      { term: 'Inbox', definition: 'The folder where received emails are stored.' },
      { term: 'Attachment', definition: 'A file sent alongside an email message — document, image etc.' },
      { term: 'CC', definition: 'Carbon Copy — sends a copy of an email to additional recipients who are visible to everyone.' },
      { term: 'BCC', definition: 'Blind Carbon Copy — sends a copy to a recipient whose address is hidden from others.' },
      { term: 'Spam', definition: 'Unwanted junk emails, often promotional or fraudulent.' },
      { term: 'Phishing', definition: 'A fraudulent email that tricks you into revealing personal information or passwords.' },
      { term: 'Forum', definition: 'An online discussion board where people post messages and reply to each other.' },
    ],
    notes: [
      'Always use a clear and relevant Subject line in emails.',
      'Never open attachments from unknown senders — they may contain malware.',
      'BCC is used when emailing many people so recipients cannot see each other\'s addresses.',
      'Mark suspicious emails as Spam — do not click links in them.',
      'Netiquette: rules for polite online communication — no ALL CAPS (shouting), be respectful.',
      'Video calls (Zoom, Teams, Meet) allow face-to-face online meetings.',
      'Social media should be used responsibly — think before you post.',
    ],
  },

  'gr5-ch7-multimedia': {
    keywords: [
      { term: 'Multimedia', definition: 'A combination of different media types — text, images, audio, video and animation.' },
      { term: 'Resolution', definition: 'The number of pixels in an image — higher resolution means more detail.' },
      { term: 'Pixel', definition: 'The smallest unit of a digital image — a tiny coloured dot.' },
      { term: 'Compression', definition: 'Reducing a file\'s size by encoding data more efficiently.' },
      { term: 'JPEG', definition: 'A compressed image format suitable for photographs (.jpg).' },
      { term: 'PNG', definition: 'An image format that supports transparency and uses lossless compression.' },
      { term: 'MP3', definition: 'A compressed audio format that reduces file size while keeping good quality.' },
      { term: 'MP4', definition: 'A common video format that stores video and audio together.' },
    ],
    notes: [
      'Text is the simplest media type; audio and video files are much larger.',
      'Higher resolution images look better but take more storage space.',
      'JPEG compression is lossy — some quality is lost each time you save.',
      'PNG is better for images with sharp edges, text or transparency.',
      'Video files are large because they store many frames per second (fps).',
      'Multimedia is used in websites, apps, games, advertisements and education.',
      'Bitmap images store colour information for every pixel; vector images use mathematical shapes.',
    ],
  },

  'gr5-ch8-scratch1': {
    keywords: [
      { term: 'Sprite', definition: 'A character or object in Scratch that can be programmed to move and react.' },
      { term: 'Costume', definition: 'A visual appearance of a sprite — switching costumes creates animation.' },
      { term: 'Stage', definition: 'The background area in Scratch where sprites perform.' },
      { term: 'Block', definition: 'A piece of Scratch code represented as a shaped puzzle piece.' },
      { term: 'Script', definition: 'A sequence of blocks joined together to give a sprite instructions.' },
      { term: 'Event block', definition: 'A block that starts a script when something happens — e.g. "When green flag clicked".' },
      { term: 'Motion block', definition: 'Scratch blocks that control movement — move, turn, go to position.' },
    ],
    notes: [
      'Click the green flag to start the project; click the red stop button to stop it.',
      'Drag blocks from the block palette to the script area and snap them together.',
      'Each sprite has its own scripts — different sprites can do different things at the same time.',
      'Use "Wait" blocks to create pauses between actions.',
      '"Forever" loop repeats its contents until the project stops.',
      'The x-y coordinate system: centre of stage is (0, 0); right is +x, up is +y.',
      'Costumes tab: add, rename or draw costumes to animate your sprite.',
    ],
  },

  'gr5-ch9-scratch2': {
    keywords: [
      { term: 'Variable', definition: 'A named container that stores a value which can change — e.g. score, lives.' },
      { term: 'Operator block', definition: 'Performs maths (+, −, ×, ÷) or logic (and, or, not) operations.' },
      { term: 'Sensing block', definition: 'Detects conditions — e.g. touching colour, key pressed, mouse position.' },
      { term: 'Conditional (if)', definition: 'Runs code only if a condition is true — "If touching red then...".' },
      { term: 'Loop', definition: 'Repeats code — "Repeat 10" or "Forever".' },
      { term: 'Broadcast', definition: 'Sends a message to all sprites to trigger a script starting with "When I receive".' },
      { term: 'Clone', definition: 'Creates a copy of a sprite during the project — useful for enemies or bullets.' },
    ],
    notes: [
      'Create a variable: click "Make a Variable" in the Variables category.',
      'Use "Change [score] by 1" to increment a score when something happens.',
      'Broadcasts allow sprites to communicate and coordinate actions.',
      '"If/Else" blocks handle two outcomes: one for true, one for false.',
      'Nested loops: a loop inside another loop — useful for grid patterns.',
      'Clones are independent copies of a sprite that run their own scripts.',
      'Test your project frequently as you build — fix bugs early.',
    ],
  },

  /* ══════════════════════════════════════════════════════
     GRADE 6
  ══════════════════════════════════════════════════════ */
  'gr6-ch1-robotics': {
    keywords: [
      { term: 'Robot', definition: 'A programmable machine that can sense its environment and perform tasks automatically.' },
      { term: 'Sensor', definition: 'A component that detects information from the environment — light, sound, distance, touch.' },
      { term: 'Actuator', definition: 'A component that makes a robot move or do something — motors, servos, speakers.' },
      { term: 'Controller', definition: 'The "brain" of the robot — a microcontroller (e.g. Arduino) that runs the program.' },
      { term: 'Algorithm', definition: 'A step-by-step set of instructions for a robot to follow.' },
      { term: 'Autonomous', definition: 'A robot that makes decisions on its own based on sensor input, without human control.' },
    ],
    notes: [
      'Robots need three things: sensors (input), a controller (processing) and actuators (output).',
      'Robots are used in factories, medicine, space exploration and everyday life.',
      'Programming a robot requires a clear, logical algorithm.',
      'Trial and error (debugging) is normal when programming robots.',
      'A feedback loop: sensor reads data → controller decides → actuator acts → repeat.',
      'Different sensors: ultrasonic (distance), infrared (obstacles), light (colour/brightness).',
    ],
  },

  'gr6-ch2-mailmerge': {
    keywords: [
      { term: 'Mail merge', definition: 'A feature that creates personalised documents for many people using a template and a data source.' },
      { term: 'Data source', definition: 'A file (e.g. Excel spreadsheet) containing the list of recipients and their details.' },
      { term: 'Merge field', definition: 'A placeholder in the template that is replaced with data from the source — e.g. «FirstName».' },
      { term: 'Main document', definition: 'The Word template containing fixed text and merge fields.' },
      { term: 'Preview Results', definition: 'Shows how the merged document looks with actual data filled in.' },
      { term: 'Finish & Merge', definition: 'The final step that creates individual documents or prints them all.' },
    ],
    notes: [
      'Mailings tab → Start Mail Merge to begin; choose Letters, Email or Labels.',
      'Select Recipients → Use an Existing List to link your Excel data source.',
      'Insert Merge Field places a placeholder for each column from your data source.',
      'Every record in the data source produces one personalised copy of the document.',
      'Preview Results lets you check before printing or sending.',
      'Mail merge saves hours when sending the same letter to many people with different names/addresses.',
    ],
  },

  'gr6-ch3-email': {
    keywords: [
      { term: 'Email client', definition: 'Software used to send, receive and manage emails — e.g. Outlook, Gmail.' },
      { term: 'Reply', definition: 'Sends a response to the sender of an email.' },
      { term: 'Reply All', definition: 'Sends a response to the sender and all other recipients of the original email.' },
      { term: 'Forward', definition: 'Sends a received email to a new recipient.' },
      { term: 'Signature', definition: 'A block of text automatically added to the end of emails — name, title, contact info.' },
      { term: 'Folder', definition: 'A container in an email client for organising messages — Inbox, Sent, Drafts, Trash.' },
      { term: 'Filter/Rule', definition: 'An automatic instruction that moves or labels incoming emails based on criteria.' },
    ],
    notes: [
      'A professional email should have: clear subject, greeting, body, closing and signature.',
      'Avoid using Reply All unless all recipients need to see your response.',
      'An attachment size limit (often 25 MB) applies — use cloud links for large files.',
      'Mark emails as unread if you need to come back to them.',
      'Create folders and rules/filters to automatically organise incoming mail.',
      'Never forward chain emails or unverified information.',
      'Review your email before sending — typos and wrong recipients are common mistakes.',
    ],
  },

  'gr6-ch4-excel1': {
    keywords: [
      { term: 'Spreadsheet', definition: 'A grid of rows and columns used to store, organise and calculate data.' },
      { term: 'Cell reference', definition: 'The address of a cell — column letter then row number, e.g. B3.' },
      { term: 'Formula', definition: 'An expression that calculates a result — must start with =.' },
      { term: 'AutoFill', definition: 'Dragging the fill handle to copy or continue a pattern of data or formulas.' },
      { term: 'SUM', definition: '=SUM(A1:A5) adds all values from A1 to A5.' },
      { term: 'Worksheet', definition: 'A single sheet (tab) in an Excel workbook.' },
      { term: 'Workbook', definition: 'An Excel file — it can contain multiple worksheets.' },
    ],
    notes: [
      'Click a cell and type to enter data; press Enter to confirm and move down.',
      'All formulas start with = e.g. =A1+B1 or =SUM(A1:A10).',
      'A1 notation: A is the column, 1 is the row — columns go A, B, C... rows 1, 2, 3...',
      'Drag the fill handle (small square at bottom-right of cell) to copy a formula to other cells.',
      'Excel automatically updates formulas when data changes.',
      'Use descriptive column headers in row 1 to label your data clearly.',
      'Ctrl+S to save; save often to avoid losing work.',
    ],
  },

  'gr6-ch5-excel2': {
    keywords: [
      { term: 'AutoFill', definition: 'Dragging the fill handle to extend a series (Mon, Tue, Wed...) or copy a formula.' },
      { term: 'Cut', definition: 'Removes a cell\'s content and places it on the clipboard ready to paste elsewhere.' },
      { term: 'Relative reference', definition: 'A cell reference that adjusts when a formula is copied — e.g. A1 becomes A2.' },
      { term: 'Absolute reference', definition: 'A cell reference that stays fixed when copied — uses $ signs, e.g. $A$1.' },
      { term: 'Clear', definition: 'Removes the contents of a cell (or its formatting) without deleting the cell itself.' },
      { term: 'Delete row/column', definition: 'Right-click the row/column header → Delete removes it and shifts remaining data.' },
    ],
    notes: [
      'Press F2 to edit the active cell in-place without retyping the whole entry.',
      'Relative reference: =A1+B1 copied down becomes =A2+B2 automatically.',
      'Absolute reference: =$A$1 always refers to cell A1 regardless of where it is copied.',
      'Use $ before column, row, or both: $A1 (fixed column), A$1 (fixed row), $A$1 (both fixed).',
      'AutoFill recognises common series: dates, months, days, numbers with a pattern.',
      'Edit → Undo (Ctrl+Z) reverses the last action — use it freely when making mistakes.',
    ],
  },

  'gr6-ch6-excel3': {
    keywords: [
      { term: 'Number format', definition: 'Controls how numbers are displayed — Currency, Percentage, Date, etc.' },
      { term: 'Conditional formatting', definition: 'Automatically highlights cells based on their value — e.g. red for values below 50.' },
      { term: 'Merge & Centre', definition: 'Merges selected cells and centres the text — useful for table headings.' },
      { term: 'Wrap Text', definition: 'Makes long text visible in a cell by showing it on multiple lines.' },
      { term: 'Cell border', definition: 'Lines drawn around cells — Format Cells → Border tab.' },
      { term: 'Fill colour', definition: 'Background colour of a cell — Home tab → Fill Color.' },
    ],
    notes: [
      'Select cells → Home → Number group to apply formatting (Currency, %, Date etc.).',
      'Conditional Formatting: Home → Conditional Formatting → Highlight Cell Rules.',
      'Merge & Centre: select the cells to merge → Home → Merge & Centre.',
      'Column width: double-click the column border in the header to auto-fit contents.',
      'Adding borders and shading makes spreadsheets easier to read.',
      'Format as Table: Home → Format as Table applies instant professional styling.',
    ],
  },

  'gr6-ch7-algorithms': {
    keywords: [
      { term: 'Algorithm', definition: 'A precise, step-by-step set of instructions to solve a problem.' },
      { term: 'Decomposition', definition: 'Breaking a complex problem into smaller, manageable parts.' },
      { term: 'Sequence', definition: 'Instructions carried out one after another in order.' },
      { term: 'Selection', definition: 'A decision point — IF a condition is true, do one thing; otherwise do another.' },
      { term: 'Iteration', definition: 'Repeating a set of instructions — a loop.' },
      { term: 'Flowchart', definition: 'A diagram using standard shapes to represent the steps of an algorithm.' },
      { term: 'Pseudocode', definition: 'An informal way of writing an algorithm in plain English — not real code.' },
    ],
    notes: [
      'Flowchart shapes: oval = start/end, rectangle = process, diamond = decision, parallelogram = input/output.',
      'Every algorithm must have a definite start, a clear end, and handle all possible inputs.',
      'Sequence: step1 → step2 → step3 (no branches).',
      'Selection uses IF/THEN/ELSE — diamond shape in a flowchart.',
      'Iteration: REPEAT/WHILE/FOR loops — the flow goes back to the top of the loop.',
      'Test an algorithm with different inputs, including edge cases.',
      'A good algorithm is efficient — it solves the problem in the fewest steps possible.',
    ],
  },

  'gr6-ch8-scratch3': {
    keywords: [
      { term: 'List', definition: 'A variable that holds multiple values — like an array.' },
      { term: 'Clone', definition: 'A runtime copy of a sprite that can act independently.' },
      { term: 'Broadcast & receive', definition: 'A way for sprites to send messages to each other to trigger events.' },
      { term: 'Custom block', definition: 'A user-defined procedure created in the "My Blocks" category.' },
      { term: 'Pen blocks', definition: 'Scratch extension blocks that make the sprite draw on the stage.' },
    ],
    notes: [
      'Create a list: Variables → Make a List. Add items with "add [item] to [list]".',
      '"When I start as a clone" starts a script for every clone that is created.',
      'Delete a clone with "delete this clone" block to avoid infinite clones.',
      'Use broadcasts to trigger sound, score changes or level transitions across sprites.',
      'Custom blocks (My Blocks → Make a Block) reduce repetition in your scripts.',
      'Pen extension: go to Extensions → Pen to access drawing blocks.',
      'Large projects need good organisation — name sprites, variables and broadcasts clearly.',
    ],
  },

  'gr6-ch9-qb64': {
    keywords: [
      { term: 'QB64', definition: 'A modern version of the BASIC programming language — free, runs on Windows/Mac/Linux.' },
      { term: 'PRINT', definition: 'QB64 command to display text or a value on screen.' },
      { term: 'INPUT', definition: 'QB64 command to accept input from the user and store it in a variable.' },
      { term: 'Variable', definition: 'A named storage location that holds a value — e.g. name$, age%.' },
      { term: 'String variable', definition: 'Holds text — ends with $ sign in QB64, e.g. name$.' },
      { term: 'Integer variable', definition: 'Holds whole numbers — ends with % in QB64, e.g. age%.' },
      { term: 'REM', definition: 'A comment in QB64 — text after REM is ignored by the program.' },
    ],
    notes: [
      'Every QB64 program starts with CLS (clear screen) and ends with END.',
      'PRINT "Hello, World!" displays text; PRINT name$ displays a variable\'s value.',
      'INPUT "Enter your name: ", name$ waits for the user to type something.',
      'Variable names ending in $ store text (strings); % store integers.',
      'REM or \' (apostrophe) starts a comment — use comments to explain your code.',
      'CLS clears the output screen at the start of the program.',
      'QB64 is case-insensitive: PRINT, Print and print are all the same.',
    ],
  },

  /* ══════════════════════════════════════════════════════
     GRADE 7
  ══════════════════════════════════════════════════════ */
  'gr7-ch1-numbers': {
    keywords: [
      { term: 'Binary', definition: 'Base-2 number system — digits 0 and 1 only.' },
      { term: 'Denary', definition: 'Base-10 number system — the everyday digits 0–9.' },
      { term: 'Hexadecimal', definition: 'Base-16 system — digits 0–9 then A–F (A=10 to F=15).' },
      { term: 'Place value', definition: 'The value of a digit based on its position — in binary: 1, 2, 4, 8, 16...' },
      { term: 'Nibble', definition: '4 bits — one hex digit. E.g. 1010₂ = A₁₆.' },
      { term: 'Byte', definition: '8 bits — can hold values 0–255 in binary (00 to FF in hex).' },
    ],
    notes: [
      'Binary to denary: multiply each bit by its place value and add (e.g. 1011 = 8+0+2+1 = 11).',
      'Denary to binary: divide by 2, record remainders bottom to top.',
      'Binary to hex: group bits into nibbles from right; convert each nibble.',
      'Hex to binary: replace each hex digit with its 4-bit binary equivalent.',
      'Hex is used in web colours (#FF5733), memory addresses and error codes.',
      'Practice conversions both ways — it\'s the most tested skill in this chapter.',
    ],
  },

  'gr7-ch2-excel-calc': {
    keywords: [
      { term: 'SUM', definition: '=SUM(A1:A10) — adds a range of cells.' },
      { term: 'AVERAGE', definition: '=AVERAGE(B1:B10) — calculates the mean of a range.' },
      { term: 'MAX', definition: '=MAX(C1:C10) — returns the largest value in a range.' },
      { term: 'MIN', definition: '=MIN(C1:C10) — returns the smallest value in a range.' },
      { term: 'COUNT', definition: '=COUNT(D1:D10) — counts cells containing numbers.' },
      { term: 'COUNTA', definition: '=COUNTA(D1:D10) — counts non-empty cells (any type).' },
      { term: 'Range', definition: 'A group of cells selected together — written as A1:A10.' },
    ],
    notes: [
      'Functions always start with = and the function name e.g. =SUM(...).',
      'A colon (:) between two cells means "from ... to ..." — =SUM(A1:A5) adds A1, A2, A3, A4, A5.',
      'Commas separate individual cells: =SUM(A1,C1,E1) adds just those three cells.',
      'Use AutoSum (Home → Σ) to quickly insert SUM for a selected range.',
      'Functions are case-insensitive: =sum(a1:a5) works the same as =SUM(A1:A5).',
      'Errors: #VALUE! means wrong data type; #DIV/0! means dividing by zero; #REF! means invalid reference.',
    ],
  },

  'gr7-ch3-excel-data': {
    keywords: [
      { term: 'Sort', definition: 'Arranging data in ascending or descending order by a chosen column.' },
      { term: 'Filter', definition: 'Displaying only rows that match specified criteria, hiding the rest.' },
      { term: 'VLOOKUP', definition: '=VLOOKUP(lookup_value, table_array, col_index, 0) — searches a column and returns a value from the same row.' },
      { term: 'IF', definition: '=IF(condition, value_if_true, value_if_false) — returns different values based on a test.' },
      { term: 'Data validation', definition: 'Restricts what data can be entered in a cell — e.g. only numbers between 1 and 10.' },
      { term: 'Freeze Panes', definition: 'Locks rows or columns so they remain visible when scrolling.' },
    ],
    notes: [
      'Sort: Data → Sort; choose the column and order (A→Z or Z→A).',
      'Filter: Data → Filter adds dropdown arrows; click to filter by a value.',
      'VLOOKUP searches the leftmost column of a table and returns a value from another column.',
      'IF formula: =IF(B2>=50,"Pass","Fail") returns "Pass" if B2 is 50 or above.',
      'Data validation: Data → Data Validation; set Allow to Whole Number, List etc.',
      'Freeze Panes: View → Freeze Panes → Freeze Top Row (keeps row 1 visible while scrolling).',
    ],
  },

  'gr7-ch4-charts': {
    keywords: [
      { term: 'Bar chart', definition: 'Uses rectangular bars to compare values across categories.' },
      { term: 'Line chart', definition: 'Uses lines connecting data points — best for showing trends over time.' },
      { term: 'Pie chart', definition: 'A circle divided into slices showing proportion/percentage of a whole.' },
      { term: 'Scatter graph', definition: 'Plots pairs of values on x and y axes — shows correlation between two variables.' },
      { term: 'Chart title', definition: 'A label describing what the chart shows.' },
      { term: 'Axis label', definition: 'Labels on the x and y axes describing the data they represent.' },
      { term: 'Legend', definition: 'A key explaining which colour/pattern represents which data series.' },
    ],
    notes: [
      'Select data → Insert → Charts → choose chart type.',
      'Bar/column charts: comparing different categories (e.g. scores by student).',
      'Line charts: showing change over time (e.g. temperature over a week).',
      'Pie charts: showing parts of a whole (e.g. percentage of students per grade).',
      'Scatter graphs: showing relationship between two quantities (e.g. height vs weight).',
      'Always add a title, axis labels and a legend to make a chart meaningful.',
      'Right-click the chart to access Format Chart Area and customise colours.',
    ],
  },

  'gr7-ch5-internet': {
    keywords: [
      { term: 'ISP', definition: 'Internet Service Provider — the company that provides internet access (e.g. MTN, Vodafone).' },
      { term: 'IP address', definition: 'A unique numerical label identifying a device on a network — e.g. 192.168.1.1.' },
      { term: 'DNS', definition: 'Domain Name System — translates website names (e.g. google.com) into IP addresses.' },
      { term: 'Protocol', definition: 'A set of rules for how data is sent and received over a network.' },
      { term: 'HTTP/HTTPS', definition: 'HyperText Transfer Protocol — the rules for transferring web pages. HTTPS is the secure version.' },
      { term: 'Bandwidth', definition: 'The maximum amount of data that can be transferred per second on a connection.' },
      { term: 'Router', definition: 'A device that directs network traffic between devices and the internet.' },
    ],
    notes: [
      'The internet is a global network; the World Wide Web is a service that runs on it.',
      'DNS is like a phone book — it converts domain names to IP addresses.',
      'IPv4 addresses: four numbers 0–255 separated by dots (e.g. 172.16.0.1).',
      'IPv6 was introduced because IPv4 addresses are running out.',
      'Packets: data is broken into small packets, sent independently and reassembled at the destination.',
      'HTTP sends data in plain text; HTTPS encrypts it — always use HTTPS for secure sites.',
      'Wi-Fi connects devices wirelessly to a router; the router connects to the internet via the ISP.',
    ],
  },

  'gr7-ch6-html1': {
    keywords: [
      { term: 'HTML', definition: 'HyperText Markup Language — the language used to structure web pages.' },
      { term: 'Tag', definition: 'An HTML instruction surrounded by angle brackets — e.g. <p>, <h1>.' },
      { term: 'Element', definition: 'An opening tag, content and a closing tag — e.g. <p>Hello</p>.' },
      { term: 'Attribute', definition: 'Extra information inside an opening tag — e.g. href in <a href="...">.' },
      { term: 'Hyperlink', definition: '<a href="url">text</a> — a clickable link to another page.' },
      { term: 'Image tag', definition: '<img src="file.jpg" alt="description"> — embeds an image.' },
      { term: 'Heading tags', definition: '<h1> to <h6> — headings from largest to smallest.' },
    ],
    notes: [
      'HTML files are saved with a .html extension and opened in a browser.',
      'Basic structure: <!DOCTYPE html>, <html>, <head> (metadata), <body> (visible content).',
      '<p> creates a paragraph; <br> creates a line break (no closing tag needed).',
      '<h1> is the largest heading; <h6> is the smallest.',
      '<a href="https://...">Link text</a> creates a hyperlink; target="_blank" opens in a new tab.',
      '<img src="image.png" alt="description"> — alt text is important for accessibility.',
      'Tags are usually paired: <tag> opens and </tag> closes. Some are self-closing: <br>, <img>.',
    ],
  },

  'gr7-ch7-html2': {
    keywords: [
      { term: 'Ordered list', definition: '<ol> — a numbered list. Items use <li> tags.' },
      { term: 'Unordered list', definition: '<ul> — a bulleted list. Items use <li> tags.' },
      { term: 'Table (HTML)', definition: '<table>, <tr> (row), <td> (data cell), <th> (header cell).' },
      { term: 'Form', definition: 'HTML element that collects user input — <form> containing input fields.' },
      { term: 'Input', definition: '<input type="text"> — a text field; type="submit" creates a submit button.' },
      { term: 'Inline CSS', definition: 'Styling applied directly inside an HTML tag — e.g. style="color:red;".' },
      { term: 'CSS', definition: 'Cascading Style Sheets — used to control the visual design of HTML pages.' },
    ],
    notes: [
      '<ul> list: <ul><li>Item 1</li><li>Item 2</li></ul>.',
      '<ol> list: same but uses numbers automatically.',
      'Table: <table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>.',
      'colspan merges cells across columns; rowspan merges cells down rows.',
      'Inline style: <p style="color:blue; font-size:18px;">Text</p>.',
      'Form fields: text, password, email, radio, checkbox, select (dropdown), textarea.',
      'The <label> element links text to an input for accessibility: <label for="id">Name</label>.',
    ],
  },

  'gr7-ch8-ai': {
    keywords: [
      { term: 'Artificial Intelligence (AI)', definition: 'Technology that enables computers to perform tasks that normally require human intelligence.' },
      { term: 'Machine learning', definition: 'A subset of AI where computers learn from data rather than being explicitly programmed.' },
      { term: 'Training data', definition: 'The dataset used to teach a machine learning model.' },
      { term: 'Algorithm (AI)', definition: 'A set of rules or model that an AI uses to make decisions or predictions.' },
      { term: 'Natural Language Processing (NLP)', definition: 'AI that understands and generates human language — e.g. chatbots, voice assistants.' },
      { term: 'Bias (AI)', definition: 'Unfair results in AI systems caused by unbalanced or unrepresentative training data.' },
    ],
    notes: [
      'AI is already in everyday life: recommendations on YouTube/Netflix, face unlock, spam filters.',
      'Machine learning: show the system many examples → it finds patterns → it predicts new cases.',
      'Deep learning uses artificial neural networks inspired by the human brain.',
      'AI can be biased if the training data does not represent all groups equally.',
      'Ethical concerns with AI: privacy, job displacement, autonomous weapons, deepfakes.',
      'Strong AI (general intelligence) does not yet exist — current AI is narrow (specific tasks only).',
    ],
  },

  'gr7-ch9-qb64': {
    keywords: [
      { term: 'IF...THEN...ELSE', definition: 'Conditional statement — runs one block if condition is true, another if false.' },
      { term: 'FOR...NEXT', definition: 'A counting loop that runs a set number of times.' },
      { term: 'WHILE...WEND', definition: 'A loop that continues while a condition remains true.' },
      { term: 'DO...LOOP', definition: 'A flexible loop — can check condition at the start (WHILE) or end (UNTIL).' },
      { term: 'SUB', definition: 'A subroutine — a named block of code that can be called from elsewhere in the program.' },
      { term: 'FUNCTION', definition: 'Like a SUB but returns a value.' },
      { term: 'CALL', definition: 'Executes a subroutine by name.' },
    ],
    notes: [
      'IF condition THEN ... ELSE ... END IF — the ELSE block is optional.',
      'FOR i = 1 TO 10: code runs 10 times; i increases by 1 each iteration (STEP changes increment).',
      'WHILE condition: code runs as long as condition is true; WEND ends the block.',
      'Nested IF: an IF inside another IF handles multiple conditions.',
      'Subroutines avoid repeating the same code — define once, call many times.',
      'Variables declared inside a SUB are local — invisible outside it.',
      'GOSUB...RETURN is the older way to call a subroutine in classic BASIC.',
    ],
  },

  'gr7-ch10-python': {
    keywords: [
      { term: 'Python', definition: 'A high-level, interpreted programming language known for its clear, readable syntax.' },
      { term: 'Variable', definition: 'A named container storing a value — e.g. name = "Wilfred".' },
      { term: 'String', definition: 'A sequence of characters in quotes — e.g. "Hello".' },
      { term: 'Integer', definition: 'A whole number — e.g. 42.' },
      { term: 'Float', definition: 'A decimal number — e.g. 3.14.' },
      { term: 'print()', definition: 'Displays output on the screen.' },
      { term: 'input()', definition: 'Takes input from the user and returns it as a string.' },
      { term: 'type()', definition: 'Returns the data type of a value — e.g. type(42) returns <class \'int\'>.' },
    ],
    notes: [
      'Python uses indentation (spaces/tabs) instead of brackets to define blocks of code.',
      'name = input("Enter your name: ") stores user input as a string.',
      'int() and float() convert strings to numbers: age = int(input("Age: ")).',
      'str() converts a number to a string for concatenation: print("Age: " + str(age)).',
      'f-strings: print(f"Hello, {name}!") — easiest way to embed variables in strings.',
      'Comments start with # — Python ignores everything after # on that line.',
      'Python is case-sensitive: Name and name are different variables.',
    ],
  },

  /* ══════════════════════════════════════════════════════
     GRADE 8
  ══════════════════════════════════════════════════════ */
  'gr8-ch1-ai': {
    keywords: [
      { term: 'Neural network', definition: 'An AI model inspired by the brain — layers of nodes that process and pass on data.' },
      { term: 'Deep learning', definition: 'Machine learning using many-layered neural networks — excels at images and language.' },
      { term: 'Training', definition: 'The process of feeding data to a model so it learns to make accurate predictions.' },
      { term: 'Overfitting', definition: 'When a model learns training data too closely and performs poorly on new data.' },
      { term: 'Supervised learning', definition: 'Training with labelled examples — the model learns input-output pairs.' },
      { term: 'Unsupervised learning', definition: 'Training on unlabelled data — the model finds its own patterns.' },
      { term: 'Generative AI', definition: 'AI that creates new content — text, images, audio — e.g. ChatGPT, DALL-E.' },
    ],
    notes: [
      'Neural networks: input layer → hidden layers → output layer.',
      'Each connection has a weight; training adjusts weights to reduce prediction error.',
      'Image recognition, speech recognition and translation all use deep learning.',
      'AI ethics: fairness, accountability, transparency and privacy (FATP principles).',
      'Large Language Models (LLMs) are trained on vast amounts of text — they predict the next word.',
      'AI tools can produce incorrect information (hallucinations) — always verify.',
      'Data is essential to AI: more high-quality data generally leads to better models.',
    ],
  },

  'gr8-ch2-cybersafety': {
    keywords: [
      { term: 'Malware', definition: 'Malicious software designed to harm or gain unauthorised access — virus, worm, Trojan, ransomware.' },
      { term: 'Virus', definition: 'Malware that attaches to files and spreads when those files are shared.' },
      { term: 'Phishing', definition: 'A fake email or website designed to steal login credentials or personal data.' },
      { term: 'Social engineering', definition: 'Manipulating people psychologically to reveal information or take unsafe actions.' },
      { term: 'Brute force attack', definition: 'Repeatedly trying every possible password combination until one works.' },
      { term: 'Firewall', definition: 'Hardware or software that monitors and filters network traffic to block threats.' },
      { term: 'Two-factor authentication (2FA)', definition: 'A second verification step beyond a password — e.g. a code sent to your phone.' },
      { term: 'Encryption', definition: 'Converting data into unreadable code so only authorised parties can read it.' },
    ],
    notes: [
      'Strong passwords: long, mix of upper/lower case, numbers and symbols; unique per site.',
      'Ransomware encrypts your files and demands payment to restore them.',
      'Never click suspicious links even from known contacts — their account may be compromised.',
      'A VPN (Virtual Private Network) encrypts your internet connection for privacy.',
      'Regular software updates patch security vulnerabilities — always update.',
      '2FA adds a second layer — even if your password is stolen, an attacker cannot log in without the code.',
      'Back up data regularly so ransomware or hardware failure does not cause permanent loss.',
    ],
  },

  'gr8-ch3-excel-adv': {
    keywords: [
      { term: 'PivotTable', definition: 'An interactive table that automatically summarises and groups large datasets.' },
      { term: 'VLOOKUP', definition: 'Searches the first column of a table and returns a value from another column in the same row.' },
      { term: 'IF (nested)', definition: 'An IF inside another IF to handle multiple conditions — =IF(A>90,"A",IF(A>70,"B","C")).' },
      { term: 'COUNTIF', definition: '=COUNTIF(range, criteria) — counts cells matching a condition.' },
      { term: 'SUMIF', definition: '=SUMIF(range, criteria, sum_range) — sums cells where a condition is true.' },
      { term: 'Macro', definition: 'A recorded sequence of Excel actions that can be replayed automatically.' },
      { term: 'Named range', definition: 'Giving a cell range a name (e.g. "Scores") to use in formulas instead of cell references.' },
    ],
    notes: [
      'PivotTable: select data → Insert → PivotTable; drag fields to Rows, Columns and Values areas.',
      'VLOOKUP last argument: 0 or FALSE = exact match (use this); TRUE = approximate match.',
      'COUNTIF example: =COUNTIF(B2:B30, "Pass") counts how many cells say "Pass".',
      'SUMIF example: =SUMIF(A2:A30, "Gr9", C2:C30) sums column C where column A says "Gr9".',
      'Macros are recorded with Developer → Record Macro and run with Alt+F8.',
      'Use named ranges to make formulas readable: =SUM(Scores) instead of =SUM(B2:B31).',
    ],
  },

  'gr8-ch4-networks': {
    keywords: [
      { term: 'LAN', definition: 'Local Area Network — a network within a small geographic area like a school or office.' },
      { term: 'WAN', definition: 'Wide Area Network — connects LANs over large distances. The internet is the largest WAN.' },
      { term: 'Topology', definition: 'The physical or logical arrangement of devices in a network — star, bus, ring, mesh.' },
      { term: 'Star topology', definition: 'All devices connect to a central switch/hub — most common in schools and offices.' },
      { term: 'Switch', definition: 'A network device that connects devices within a LAN and forwards data only to the correct device.' },
      { term: 'Router', definition: 'Connects different networks and directs data packets between them.' },
      { term: 'MAC address', definition: 'A unique hardware address assigned to every network interface card.' },
      { term: 'TCP/IP', definition: 'The core internet protocols — TCP breaks data into packets; IP routes them.' },
    ],
    notes: [
      'Star topology advantage: if one cable fails, only that device is affected.',
      'Bus topology: all devices on one cable — cheap but a cable break stops the whole network.',
      'Switches work at the data link layer and use MAC addresses; routers use IP addresses.',
      'Wi-Fi (wireless LAN) uses radio waves; wired uses Ethernet cables (RJ45).',
      'A packet contains: source IP, destination IP, data payload and a sequence number.',
      'The OSI model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, Application.',
      'Bandwidth is measured in Mbps (megabits per second) or Gbps.',
    ],
  },

  'gr8-ch5-database': {
    keywords: [
      { term: 'Database', definition: 'An organised collection of structured data, stored and accessed electronically.' },
      { term: 'Table', definition: 'The basic storage structure in a database — rows (records) and columns (fields).' },
      { term: 'Record', definition: 'A single row in a table — represents one entity (e.g. one student).' },
      { term: 'Field', definition: 'A single column — represents one attribute (e.g. name, age, score).' },
      { term: 'Primary key', definition: 'A unique identifier for each record — no two records can share the same primary key.' },
      { term: 'Query', definition: 'A question asked of the database — retrieves specific records meeting set criteria.' },
      { term: 'Form', definition: 'A user-friendly interface for entering data into a database table.' },
      { term: 'Report', definition: 'A formatted printout of data from a database — good for presenting results.' },
    ],
    notes: [
      'Microsoft Access tables store data; queries filter and search it; forms enter it; reports print it.',
      'Primary key uniquely identifies each record — e.g. StudentID, not name (which could repeat).',
      'Create a query: Query Design → add table → drag fields → set criteria.',
      'Criteria in queries: ="Gr9" for text; >80 for numbers; Between #01/01/24# And #31/12/24# for dates.',
      'Relationships link tables via matching fields (foreign key to primary key).',
      'Sorting in a query: click the Sort row in Query Design → Ascending or Descending.',
      'Always back up your database — data loss in a database can be catastrophic.',
    ],
  },

  'gr8-ch6-css': {
    keywords: [
      { term: 'CSS', definition: 'Cascading Style Sheets — controls the appearance (colour, layout, fonts) of HTML pages.' },
      { term: 'Selector', definition: 'Targets the HTML element(s) to style — e.g. p, h1, .classname, #idname.' },
      { term: 'Property', definition: 'The aspect of the element to style — e.g. color, font-size, background-color.' },
      { term: 'Value', definition: 'The setting for a property — e.g. red, 16px, bold.' },
      { term: 'Box model', definition: 'Every element is a box: content → padding → border → margin.' },
      { term: 'Class selector', definition: 'Targets elements with a class attribute — .classname in CSS, class="classname" in HTML.' },
      { term: 'ID selector', definition: 'Targets a unique element — #idname in CSS, id="idname" in HTML.' },
    ],
    notes: [
      'External CSS: link a .css file with <link rel="stylesheet" href="style.css"> in the <head>.',
      'Syntax: selector { property: value; property: value; }',
      'color sets text colour; background-color sets the background.',
      'font-family, font-size, font-weight, text-align are common text properties.',
      'Box model: padding adds space inside the border; margin adds space outside.',
      'Classes can be applied to many elements; IDs should be unique on a page.',
      'Specificity: ID > Class > Element selector — more specific rules override less specific ones.',
    ],
  },

  'gr8-ch7-python-sel': {
    keywords: [
      { term: 'Boolean', definition: 'A data type with only two values: True or False.' },
      { term: 'Comparison operator', definition: 'Compares two values: ==, !=, <, >, <=, >=.' },
      { term: 'Logical operator', definition: 'Combines conditions: and, or, not.' },
      { term: 'if statement', definition: 'Runs code only if a condition is True.' },
      { term: 'elif', definition: 'Else-if — checks another condition if the previous one was False.' },
      { term: 'else', definition: 'Runs when all preceding conditions are False.' },
      { term: 'Nested if', definition: 'An if statement inside another if — handles complex multi-condition logic.' },
    ],
    notes: [
      'if condition: → block runs if True; else: → block runs if False.',
      'Use == (equality check) not = (assignment) inside conditions.',
      'and: both conditions must be True; or: at least one must be True; not: reverses True/False.',
      'Indentation is mandatory in Python — 4 spaces per level is standard.',
      'elif chains: Python checks each condition in order and runs the first True one.',
      'Example: if score >= 90: grade = "A" elif score >= 70: grade = "B" else: grade = "C"',
      'Tip: use elif instead of nested ifs when checking the same variable for different values.',
    ],
  },

  'gr8-ch8-python-loops': {
    keywords: [
      { term: 'for loop', definition: 'Iterates over a sequence (list, range, string) — runs once per item.' },
      { term: 'while loop', definition: 'Repeats as long as a condition is True.' },
      { term: 'range()', definition: 'Generates a sequence of numbers — range(5) gives 0,1,2,3,4.' },
      { term: 'break', definition: 'Exits the loop immediately, regardless of the condition.' },
      { term: 'continue', definition: 'Skips the rest of the current iteration and goes to the next.' },
      { term: 'Infinite loop', definition: 'A loop whose condition never becomes False — usually a bug.' },
      { term: 'Accumulator', definition: 'A variable that collects a running total inside a loop.' },
    ],
    notes: [
      'for i in range(1, 11): runs with i = 1, 2, 3, ... 10 (stop value is excluded).',
      'range(start, stop, step): range(0, 10, 2) gives 0, 2, 4, 6, 8.',
      'while True: with a break condition inside is a common pattern for menus.',
      'Use a for loop when you know how many times to repeat; while when you do not.',
      'Accumulator pattern: total = 0; for n in numbers: total += n.',
      'Nested loops: outer loop × inner loop iterations. A 3×3 grid needs 9 iterations total.',
      'Avoid infinite loops — always ensure the while condition can eventually become False.',
    ],
  },

  'gr8-ch9-python-func': {
    keywords: [
      { term: 'Function', definition: 'A named, reusable block of code defined with def.' },
      { term: 'Parameter', definition: 'A variable in the function definition that receives an argument.' },
      { term: 'Argument', definition: 'The actual value passed to a function when it is called.' },
      { term: 'return', definition: 'Sends a value back from the function to the caller.' },
      { term: 'Local variable', definition: 'A variable defined inside a function — only exists within that function.' },
      { term: 'Global variable', definition: 'A variable defined outside all functions — accessible throughout the program.' },
      { term: 'Docstring', definition: 'A description of a function written in triple quotes immediately after def.' },
    ],
    notes: [
      'def greet(name): → defines a function; greet("Wilfred") → calls it.',
      'A function without return gives None.',
      'Parameters act as local variables inside the function.',
      'def add(a, b): return a + b — calling add(3, 4) returns 7.',
      'Default parameters: def greet(name="Student"): → greet() uses "Student" if no argument given.',
      'Use functions to avoid repeating code — define once, call many times.',
      'Keep functions short and focused on one task — makes code easier to read and test.',
    ],
  },

  'gr8-ch10-python-lists': {
    keywords: [
      { term: 'List', definition: 'An ordered, mutable collection of items in square brackets — e.g. [1, 2, 3].' },
      { term: 'Index', definition: 'The position of an item — starts at 0. list[0] is the first item.' },
      { term: 'Slice', definition: 'list[1:4] returns items at index 1, 2, 3 (stop is excluded).' },
      { term: 'append()', definition: 'Adds an item to the end of the list — list.append("new").' },
      { term: 'remove()', definition: 'Removes the first occurrence of a value — list.remove("old").' },
      { term: 'len()', definition: 'Returns the number of items in a list — len([1,2,3]) = 3.' },
      { term: 'sort()', definition: 'Sorts the list in place — list.sort().' },
    ],
    notes: [
      'Lists can hold mixed types: ["Alice", 15, True].',
      'Negative index: list[-1] is the last item; list[-2] is the second to last.',
      'Iterate: for item in my_list: print(item).',
      'List comprehension: squares = [x**2 for x in range(1,6)] gives [1,4,9,16,25].',
      'in operator: if "Alice" in names: checks if a value exists.',
      'pop() removes and returns the last item (or item at given index).',
      'sorted() returns a new sorted list; sort() modifies the original.',
    ],
  },

  'gr8-ch11-ppt-adv': {
    keywords: [
      { term: 'Slide Master', definition: 'The top-level slide template that controls design elements on all slides.' },
      { term: 'Layout master', definition: 'A sub-template for a specific slide layout under the Slide Master.' },
      { term: 'Motion Path', definition: 'An animation that moves an object along a defined path on the slide.' },
      { term: 'Morph transition', definition: 'Smoothly animates objects between two slides that share elements.' },
      { term: 'Embed video', definition: 'Insert → Video → This Device or Online Video to place a video in a slide.' },
      { term: 'Section', definition: 'A named group of slides for organising a long presentation.' },
    ],
    notes: [
      'Slide Master (View → Slide Master): changes here affect every slide in the presentation.',
      'Add a logo or footer in the Slide Master to have it appear on all slides automatically.',
      'Motion Paths: Animations → Add Animation → Motion Paths — choose or draw a path.',
      'Morph transition requires duplicate slides with repositioned objects.',
      'Embed video from a file: Insert → Video → This Device; resize and position on the slide.',
      'Use Sections (right-click in slide panel) to organise a long deck into logical groups.',
      'Export as PDF: File → Export → Create PDF — useful for sharing with no PowerPoint needed.',
    ],
  },

  'gr8-ch12-python-proj': {
    keywords: [
      { term: 'Decomposition', definition: 'Breaking the project into smaller sub-problems, each solved by a function.' },
      { term: 'Pseudocode', definition: 'Plain-English planning of your program before writing real code.' },
      { term: 'Testing', definition: 'Running code with different inputs to verify it behaves correctly.' },
      { term: 'Edge case', definition: 'An unusual or extreme input that might cause bugs — e.g. empty string, zero, negative.' },
      { term: 'Bug', definition: 'An error in a program that causes incorrect or unexpected behaviour.' },
      { term: 'Debugging', definition: 'The process of finding and fixing bugs.' },
      { term: 'Iteration (development)', definition: 'Repeating the design-code-test cycle to gradually improve the program.' },
    ],
    notes: [
      'Plan first: what inputs, what processing, what outputs? Draw a flowchart or write pseudocode.',
      'Break the project into functions — each function solves one part of the problem.',
      'Test as you go — do not wait until the end to run the code.',
      'Use print() statements to see variable values during debugging.',
      'Test with valid data, invalid data and edge cases (e.g. 0, negative numbers, empty input).',
      'Comment your code thoroughly so others (and future you) can understand it.',
      'A well-structured project: main() calls helper functions — main() is short and readable.',
    ],
  },

  /* ══════════════════════════════════════════════════════
     GRADE 9 CS  (Ch1 already seeded inline; rest here)
  ══════════════════════════════════════════════════════ */
  'gr9-text-sound-images': {
    keywords: [
      { term: 'ASCII', definition: 'American Standard Code for Information Interchange — assigns a 7-bit code (0–127) to each character.' },
      { term: 'Unicode', definition: 'An extended character encoding (16-bit+) covering all world languages — superset of ASCII.' },
      { term: 'Character set', definition: 'The complete list of characters a system can represent.' },
      { term: 'Sample rate', definition: 'The number of audio samples taken per second — measured in Hz. CD quality is 44,100 Hz.' },
      { term: 'Bit depth', definition: 'Number of bits per sample in audio — more bits = more dynamic range and file size.' },
      { term: 'Bitmap image', definition: 'An image stored as a grid of pixels, each with a colour value.' },
      { term: 'Colour depth', definition: 'Number of bits used per pixel — 1-bit = B&W, 8-bit = 256 colours, 24-bit = 16.7M colours.' },
      { term: 'Resolution (image)', definition: 'Number of pixels in an image — width × height. Higher = more detail but larger file.' },
    ],
    notes: [
      'ASCII: "A" = 65, "a" = 97, "0" = 48 — useful to memorise a few key values.',
      'Unicode is backward compatible with ASCII for the first 128 characters.',
      'Image file size = width × height × colour depth (in bits) ÷ 8 (for bytes).',
      'Sound file size = sample rate × bit depth × duration × channels ÷ 8.',
      'Higher sample rate and bit depth → better audio quality → larger file.',
      'Colour depth of 24 bits = 8 bits each for Red, Green, Blue (RGB).',
      'Metadata is extra information stored with an image (date taken, camera settings etc.).',
    ],
  },

  'gr9-compression': {
    keywords: [
      { term: 'Compression', definition: 'Reducing the size of a file so it uses less storage or transfers faster.' },
      { term: 'Lossless compression', definition: 'Reduces file size without losing any data — original can be perfectly restored.' },
      { term: 'Lossy compression', definition: 'Reduces file size by permanently removing some data — original cannot be fully restored.' },
      { term: 'Run-length encoding (RLE)', definition: 'Lossless compression that replaces repeated consecutive data with a count and value.' },
      { term: 'Huffman coding', definition: 'Lossless compression that assigns shorter codes to more frequent characters.' },
      { term: 'JPEG', definition: 'Lossy compression format for photographs.' },
      { term: 'PNG', definition: 'Lossless compression format for images — supports transparency.' },
      { term: 'MP3', definition: 'Lossy compression for audio — removes frequencies humans can barely hear.' },
    ],
    notes: [
      'RLE example: AAAABBCC → 4A2B2C — stores count then symbol.',
      'RLE works well on images with large areas of the same colour.',
      'Huffman: frequent characters get short codes; rare ones get longer codes.',
      'Lossy compression is used for photos and audio where minor quality loss is acceptable.',
      'Lossless is used for text, programs and images where exact data is required.',
      'Compression ratio = original size ÷ compressed size.',
      'ZIP archives use lossless compression; JPEG uses lossy.',
    ],
  },

  'gr9-cpu': {
    keywords: [
      { term: 'CPU', definition: 'Central Processing Unit — the main chip that carries out instructions in a computer.' },
      { term: 'ALU', definition: 'Arithmetic Logic Unit — performs calculations and logical comparisons.' },
      { term: 'Control Unit (CU)', definition: 'Directs the operation of the CPU — fetches, decodes and executes instructions.' },
      { term: 'Register', definition: 'Tiny, ultra-fast storage locations inside the CPU — e.g. Program Counter, Accumulator.' },
      { term: 'Program Counter (PC)', definition: 'Holds the memory address of the next instruction to fetch.' },
      { term: 'Accumulator', definition: 'Register that stores the result of the most recent ALU operation.' },
      { term: 'Fetch-Decode-Execute cycle', definition: 'The continuous process: fetch instruction from RAM → decode it → execute it.' },
      { term: 'Clock speed', definition: 'Measured in GHz — the number of fetch-decode-execute cycles per second.' },
    ],
    notes: [
      'FDE cycle: PC sends address to MAR → instruction fetched to MDR → copied to CIR → decoded → executed.',
      'MAR = Memory Address Register; MDR = Memory Data Register; CIR = Current Instruction Register.',
      'Higher clock speed = more instructions per second = faster CPU.',
      'More cores = more instructions processed simultaneously.',
      'Cache is very fast memory between CPU and RAM — reduces fetch time.',
      'Von Neumann architecture: stored program — instructions and data in the same RAM.',
      'Word size (32-bit vs 64-bit) affects how much data the CPU processes at once.',
    ],
  },

  'gr9-memory': {
    keywords: [
      { term: 'RAM', definition: 'Random Access Memory — volatile, fast, temporary storage for running programs and data.' },
      { term: 'ROM', definition: 'Read-Only Memory — non-volatile, stores the BIOS/firmware needed to start the computer.' },
      { term: 'Cache', definition: 'Very fast memory inside or near the CPU — stores recently/frequently used data.' },
      { term: 'Virtual memory', definition: 'Part of the hard drive used as extra RAM when RAM is full — much slower.' },
      { term: 'Primary storage', definition: 'Storage directly accessed by the CPU — RAM and ROM.' },
      { term: 'Secondary storage', definition: 'Permanent storage not directly accessed by CPU — HDD, SSD, optical, flash.' },
      { term: 'Flash memory', definition: 'Non-volatile electronic storage used in SSDs, USB drives and memory cards.' },
    ],
    notes: [
      'RAM is volatile — loses all content when powered off.',
      'ROM is non-volatile — retains data without power (BIOS stored here).',
      'Cache hierarchy: L1 (fastest, smallest), L2, L3 (larger but slower).',
      'More RAM allows more programs to run simultaneously without slowdown.',
      'Virtual memory allows large programs to run but is slow — causes "thrashing" when overused.',
      'SSD vs HDD: SSD is faster, lighter, more expensive, no moving parts.',
      'Cloud storage is secondary storage accessed remotely over the internet.',
    ],
  },

  'gr9-io-devices': {
    keywords: [
      { term: 'Input device', definition: 'Hardware that sends data into the computer for processing.' },
      { term: 'Output device', definition: 'Hardware that presents processed data to the user.' },
      { term: 'Barcode reader', definition: 'Scans barcodes using laser or camera — used in shops and warehouses.' },
      { term: 'RFID', definition: 'Radio-Frequency Identification — uses radio waves to read tags on objects (contactless cards, stock).' },
      { term: 'Touchscreen', definition: 'Both input (touch) and output (display) device — capacitive or resistive.' },
      { term: 'Actuator (output)', definition: 'Converts electrical signals into physical movement — motors, LEDs, speakers.' },
      { term: 'Sensor', definition: 'Measures physical quantities and converts to electrical data — temperature, light, pressure.' },
    ],
    notes: [
      'Input devices: keyboard, mouse, microphone, scanner, webcam, barcode reader, sensors.',
      'Output devices: monitor, printer, speakers, projector, actuators.',
      'A touchscreen is both: the screen is output; the touch layer is input.',
      'Biometric devices (fingerprint, iris) capture biological data — used for security.',
      '2D barcode (QR code) stores much more data than a 1D barcode.',
      'OCR (Optical Character Recognition) reads printed text and converts it to editable digital text.',
      'RFID tags can be passive (no battery) or active (with battery for longer range).',
    ],
  },

  'gr9-os': {
    keywords: [
      { term: 'Operating System (OS)', definition: 'System software that manages hardware resources and provides services for application programs.' },
      { term: 'Process management', definition: 'The OS controls which processes use the CPU and for how long.' },
      { term: 'Memory management', definition: 'The OS allocates RAM to processes and retrieves it when no longer needed.' },
      { term: 'File system', definition: 'The structure the OS uses to store and retrieve files — e.g. NTFS, FAT32, ext4.' },
      { term: 'Device driver', definition: 'Software that allows the OS to communicate with hardware devices.' },
      { term: 'User interface', definition: 'How users interact with the OS — GUI (windows, icons) or CLI (command line).' },
      { term: 'Multitasking', definition: 'Running multiple programs concurrently by rapidly switching CPU time between them.' },
    ],
    notes: [
      'OS acts as an intermediary between user applications and computer hardware.',
      'GUI: uses windows, icons, menus, pointer (WIMP). CLI: text commands typed by the user.',
      'CLI is faster for experienced users; GUI is easier to learn.',
      'The OS loads into RAM during booting — it is always running in the background.',
      'File systems: Windows uses NTFS; Linux uses ext4; older systems used FAT32.',
      'Virtual machines run a guest OS inside a host OS — useful for testing.',
      'Examples of OS: Windows, macOS, Linux, Android, iOS.',
    ],
  },

  'gr9-networks': {
    keywords: [
      { term: 'LAN', definition: 'Local Area Network — a network within one building or campus.' },
      { term: 'WAN', definition: 'Wide Area Network — connects LANs across cities, countries or globally.' },
      { term: 'Client-server', definition: 'A network model where clients request services from a central server.' },
      { term: 'Peer-to-peer', definition: 'A network model where all devices share resources directly with each other.' },
      { term: 'Protocol', definition: 'An agreed set of rules governing communication between devices.' },
      { term: 'HTTP/HTTPS', definition: 'Protocol for web browsing; HTTPS adds TLS encryption.' },
      { term: 'FTP', definition: 'File Transfer Protocol — transfers files between computers on a network.' },
      { term: 'Packet switching', definition: 'Data split into packets, each routed independently, reassembled at destination.' },
    ],
    notes: [
      'Client-server: centralised control, easier management, but server failure affects all.',
      'Peer-to-peer: no central server, good for small networks and file sharing.',
      'The internet uses packet switching — packets may take different routes.',
      'TCP/IP: TCP ensures reliable delivery; IP handles addressing and routing.',
      'DNS resolves domain names to IP addresses — like a phonebook for the web.',
      'Encryption protects data in transit — HTTPS uses TLS/SSL.',
      'A packet contains: header (source/dest IP, sequence no.) and payload (data).',
    ],
  },

  'gr9-cybersec': {
    keywords: [
      { term: 'Malware', definition: 'Malicious software including viruses, worms, Trojans, ransomware and spyware.' },
      { term: 'Firewall', definition: 'Monitors and filters network traffic using rules — blocks unauthorised access.' },
      { term: 'Encryption', definition: 'Scrambles data so only authorised parties with the key can read it.' },
      { term: 'Phishing', definition: 'Fraudulent messages disguised as trustworthy sources to steal data.' },
      { term: 'Brute force', definition: 'Trying all possible password combinations until the correct one is found.' },
      { term: 'SQL injection', definition: 'Inserting malicious SQL code into a web form to manipulate a database.' },
      { term: 'DDoS', definition: 'Distributed Denial of Service — flooding a server with requests to overwhelm it.' },
      { term: 'Access control', definition: 'Restricting who can access systems or data — usernames, passwords, biometrics.' },
    ],
    notes: [
      'Defence layers: strong passwords + 2FA + firewall + encryption + updates + backups.',
      'Antivirus software detects and removes known malware using signature databases.',
      'Social engineering attacks target people, not systems — training and awareness are key defences.',
      'Penetration testing ("ethical hacking") tests a system\'s defences before attackers do.',
      'HTTPS encrypts data in transit; full-disk encryption protects stored data.',
      'Zero-day vulnerability: a software flaw unknown to the vendor — no patch exists yet.',
      'Principle of least privilege: users should have only the minimum access needed for their role.',
    ],
  },

  'gr9-data-rep': {
    keywords: [
      { term: 'Binary addition', definition: 'Adding binary numbers: 0+0=0, 0+1=1, 1+1=10 (carry 1), 1+1+1=11.' },
      { term: 'Overflow', definition: 'When a binary result is too large for the available number of bits.' },
      { term: 'Logical shift left', definition: 'Moves all bits left, fills right with 0 — multiplies by 2 per shift.' },
      { term: 'Logical shift right', definition: 'Moves all bits right, fills left with 0 — divides by 2 per shift.' },
      { term: "Two's complement", definition: 'Represents negative numbers: flip all bits of the positive value, then add 1.' },
      { term: 'Sign-and-magnitude', definition: 'Represents negative numbers by using the most significant bit as the sign bit.' },
    ],
    notes: [
      'Binary addition: work right to left, carry into the next column when sum ≥ 2.',
      'Overflow occurs when the result of an addition exceeds the bit width — the carry out of the MSB is lost.',
      "Two's complement: negate 0110 → flip → 1001 → add 1 → 1010 = −6 in 4-bit two's complement.",
      'Shift left by n = multiply by 2ⁿ. Shift right by n = divide by 2ⁿ (integer).',
      'Two\'s complement is the standard way modern CPUs represent signed integers.',
      'Range of n-bit two\'s complement: −2^(n−1) to +2^(n−1)−1. For 8 bits: −128 to +127.',
    ],
  },

  'gr9-algorithms': {
    keywords: [
      { term: 'Pseudocode', definition: 'A plain-English representation of an algorithm — not tied to any specific language.' },
      { term: 'Flowchart', definition: 'A diagram representing an algorithm using standard symbols.' },
      { term: 'Linear search', definition: 'Checks each item one by one from the start until the target is found.' },
      { term: 'Binary search', definition: 'Repeatedly halves a sorted list to find a target — much faster than linear on large lists.' },
      { term: 'Bubble sort', definition: 'Repeatedly swaps adjacent elements if out of order — simple but slow.' },
      { term: 'Merge sort', definition: 'Divides the list in half, sorts each half, then merges — efficient, O(n log n).' },
      { term: 'Time complexity', definition: 'A measure of how an algorithm\'s run time grows with input size.' },
    ],
    notes: [
      'Linear search: O(n) — checks every element in the worst case.',
      'Binary search: O(log n) — requires the list to be sorted first.',
      'Bubble sort: O(n²) worst case — inefficient for large lists.',
      'Binary search is much faster than linear on large sorted data.',
      'Trace table: a table used to manually step through an algorithm to check its logic.',
      'Flowchart symbols: oval (start/end), rectangle (process), diamond (decision), parallelogram (I/O).',
      'Pseudocode conventions (Cambridge IGCSE): INPUT, OUTPUT, IF/THEN/ELSE/ENDIF, WHILE/DO/ENDWHILE, FOR/TO/NEXT.',
    ],
  },

  'gr9-programming': {
    keywords: [
      { term: 'Variable declaration', definition: 'Reserving memory and naming it before use — e.g. DECLARE score : INTEGER.' },
      { term: 'Data type', definition: 'Specifies what kind of data a variable holds — INTEGER, REAL, CHAR, STRING, BOOLEAN.' },
      { term: 'Sequence', definition: 'Instructions executed one after another with no branching.' },
      { term: 'Selection', definition: 'IF/THEN/ELSE — the program chooses a path based on a condition.' },
      { term: 'Iteration', definition: 'FOR/WHILE/REPEAT loops — repeating a block of code.' },
      { term: 'Array', definition: 'A fixed-size collection of elements of the same type accessed by index.' },
      { term: 'Procedure', definition: 'A named block of code that performs a task but does not return a value.' },
    ],
    notes: [
      'IGCSE pseudocode: DECLARE name : STRING, INPUT name, OUTPUT "Hello " & name.',
      'FOR loop: FOR i ← 1 TO 10 ... NEXT i — iterates 10 times.',
      'WHILE loop: WHILE condition DO ... ENDWHILE — may not execute if condition is False from the start.',
      'REPEAT...UNTIL: runs at least once, checks condition at the end.',
      'Array declaration: DECLARE scores : ARRAY[1:10] OF INTEGER.',
      'Access array element: scores[3] ← 85.',
      'Functions return a value; procedures do not — both are subroutines.',
    ],
  },

  'gr9-logic': {
    keywords: [
      { term: 'Logic gate', definition: 'An electronic circuit that performs a Boolean operation on binary inputs.' },
      { term: 'AND gate', definition: 'Output is 1 only when ALL inputs are 1.' },
      { term: 'OR gate', definition: 'Output is 1 when AT LEAST ONE input is 1.' },
      { term: 'NOT gate', definition: 'Inverts the input — output is 1 when input is 0, and vice versa.' },
      { term: 'NAND gate', definition: 'NOT AND — output is 0 only when ALL inputs are 1.' },
      { term: 'NOR gate', definition: 'NOT OR — output is 1 only when ALL inputs are 0.' },
      { term: 'XOR gate', definition: 'Exclusive OR — output is 1 when inputs are DIFFERENT.' },
      { term: 'Truth table', definition: 'A table showing every possible combination of inputs and the resulting output.' },
    ],
    notes: [
      'AND: 1 AND 1 = 1; any other combination = 0.',
      'OR: 0 OR 0 = 0; any other combination = 1.',
      'NOT: NOT 0 = 1; NOT 1 = 0.',
      'NAND is NOT AND: 1 NAND 1 = 0; all others = 1.',
      'XOR: 0 XOR 0 = 0; 1 XOR 0 = 1; 0 XOR 1 = 1; 1 XOR 1 = 0.',
      'For n inputs, a truth table has 2ⁿ rows.',
      'Logic circuits combine gates — write the Boolean expression first, then build the circuit.',
    ],
  },

  'gr9-languages': {
    keywords: [
      { term: 'High-level language', definition: 'A programming language close to human language — e.g. Python, Java, C#.' },
      { term: 'Low-level language', definition: 'A language close to machine code — e.g. assembly language.' },
      { term: 'Machine code', definition: 'Binary instructions executed directly by the CPU — 0s and 1s.' },
      { term: 'Assembly language', definition: 'Uses mnemonics (MOV, ADD, JMP) instead of binary — specific to one CPU architecture.' },
      { term: 'Compiler', definition: 'Translates an entire high-level program into machine code at once before running.' },
      { term: 'Interpreter', definition: 'Translates and executes a high-level program one line at a time.' },
      { term: 'Assembler', definition: 'Translates assembly language into machine code.' },
    ],
    notes: [
      'High-level advantages: easier to write, portable across machines, closer to natural language.',
      'Low-level advantages: faster execution, direct hardware control, smaller program size.',
      'Compiled programs (C, C++) run faster — translation done once.',
      'Interpreted programs (Python, JavaScript) are easier to debug — translated line by line.',
      'Java uses both: compiled to bytecode, then interpreted by the JVM.',
      'Assembly language is specific to one CPU — not portable.',
      'Source code → Compiler → Object code (machine code) → Run.',
    ],
  },

  'gr9-embedded': {
    keywords: [
      { term: 'Embedded system', definition: 'A computer built into a device to control a specific function — not a general-purpose computer.' },
      { term: 'Microcontroller', definition: 'A small IC containing CPU, RAM, ROM and I/O on one chip — the brain of an embedded system.' },
      { term: 'Real-time system', definition: 'A system that must respond to inputs within strict time limits — e.g. ABS brakes, pacemaker.' },
      { term: 'Firmware', definition: 'Software stored in ROM that controls the embedded system — updated rarely.' },
      { term: 'Sensor (embedded)', definition: 'Input transducer that converts physical quantities into electrical signals for the microcontroller.' },
      { term: 'Actuator (embedded)', definition: 'Output transducer that converts electrical signals into physical actions — motor, buzzer, LED.' },
    ],
    notes: [
      'Embedded systems are everywhere: washing machines, cars, pacemakers, traffic lights, ATMs.',
      'They are designed for one task — unlike a PC which runs many applications.',
      'Firmware is stored in ROM or flash — can be updated ("flashed") by the manufacturer.',
      'Real-time systems have hard deadlines — missing a deadline can be catastrophic (e.g. car airbag).',
      'Microcontrollers: Arduino (education), PIC, ARM Cortex-M series.',
      'Low power consumption is critical for battery-powered embedded devices.',
      'IoT (Internet of Things): embedded systems connected to the internet — smart home devices.',
    ],
  },

  /* ══════════════════════════════════════════════════════
     GRADE 9 DT
  ══════════════════════════════════════════════════════ */
  'gr9dt-influences': {
    keywords: [
      { term: 'Cultural influence', definition: 'How tradition, values, beliefs and customs of a society shape product design.' },
      { term: 'Social influence', definition: 'How people\'s needs, trends and lifestyle choices affect design decisions.' },
      { term: 'Environmental influence', definition: 'Design choices made to reduce environmental harm — sustainable materials, recyclability.' },
      { term: 'Economic influence', definition: 'Cost constraints that affect material choice, manufacturing scale and retail price.' },
      { term: 'Ergonomics', definition: 'Designing products that are comfortable and efficient for human use.' },
      { term: 'Aesthetics', definition: 'The visual appearance and sensory qualities of a product — colour, form, texture.' },
    ],
    notes: [
      'Good design balances form (how it looks) and function (how it works).',
      'Cultural influences: religious symbols, traditional patterns, colour meanings vary by culture.',
      'Sustainable design: use renewable materials, design for disassembly, minimise waste.',
      'Ergonomics: grip shape, weight distribution, button placement — all affect usability.',
      'Economic constraints affect material choice — expensive materials raise product price.',
      'Social trends change quickly — designers must anticipate as well as respond.',
    ],
  },

  'gr9dt-design-brief': {
    keywords: [
      { term: 'Design brief', definition: 'A short statement describing the design problem and its context.' },
      { term: 'Design specification', definition: 'A detailed list of criteria the final product must meet.' },
      { term: 'Research', definition: 'Gathering information about the problem, users and existing solutions.' },
      { term: 'Target user', definition: 'The specific person or group the product is designed for.' },
      { term: 'Constraint', definition: 'A limitation on the design — budget, size, materials, time.' },
      { term: 'Criterion (plural: criteria)', definition: 'A measurable standard a design must meet — e.g. must weigh less than 500g.' },
    ],
    notes: [
      'The brief is short and open; the specification is detailed and measurable.',
      'Good research includes: surveys, interviews, studying existing products, market research.',
      'Specification criteria should be SMART — Specific, Measurable, Achievable, Relevant, Time-bound.',
      'Include constraints (what you cannot do) as well as objectives (what you must do).',
      'Always refer back to the specification throughout design and evaluation.',
      'The target user\'s needs drive all design decisions.',
    ],
  },

  'gr9dt-developing': {
    keywords: [
      { term: 'Ideation', definition: 'Generating a wide range of design ideas without judgement — quantity over quality first.' },
      { term: 'Annotated sketch', definition: 'A drawing with notes explaining materials, dimensions and design decisions.' },
      { term: 'Prototype', definition: 'An early model of a design used to test and develop ideas.' },
      { term: 'Modelling', definition: 'Creating a physical or digital representation of a design to test it.' },
      { term: 'Development', definition: 'Improving and refining an initial idea based on testing and feedback.' },
      { term: 'CAD', definition: 'Computer-Aided Design — using software to create 2D drawings or 3D models.' },
    ],
    notes: [
      'Generate at least 3 different initial ideas — variety shows creative thinking.',
      'Annotations explain design decisions: why this material? why this shape?',
      'Development shows iterative improvement — cross out a feature, try a new one, explain why.',
      'CAD software: Fusion 360, SketchUp, TinkerCAD (free, browser-based).',
      'Rapid prototyping: 3D printing, card modelling, foam cutting — test ideas cheaply before final manufacture.',
      'Feedback from the target user during development improves the final product.',
    ],
  },

  'gr9dt-evaluation': {
    keywords: [
      { term: 'Evaluation', definition: 'Assessing a design against the specification and identifying strengths and weaknesses.' },
      { term: 'Testing', definition: 'Checking the product performs its intended function under realistic conditions.' },
      { term: 'Feedback', definition: 'Opinions from users and others used to improve the design.' },
      { term: 'Modification', definition: 'A change made to a design as a result of evaluation or testing.' },
      { term: 'Iterative design', definition: 'A design process of repeatedly testing and improving — design → test → refine.' },
      { term: 'Fitness for purpose', definition: 'How well a product meets its original brief and specification.' },
    ],
    notes: [
      'Evaluate against EACH point in your specification — give evidence for pass or fail.',
      'Be honest in evaluation — acknowledge weaknesses as well as strengths.',
      'Suggest specific, realistic modifications — not just "make it better".',
      'User testing gives real feedback — ask target users, not just friends.',
      'A good evaluation also considers sustainability, cost and manufacture.',
      'Reference the brief and specification throughout the evaluation.',
    ],
  },

  'gr9dt-health-safety': {
    keywords: [
      { term: 'PPE', definition: 'Personal Protective Equipment — safety glasses, gloves, aprons, ear defenders.' },
      { term: 'Risk assessment', definition: 'Identifying hazards, assessing the likelihood and severity of harm, and stating control measures.' },
      { term: 'Hazard', definition: 'Something with potential to cause harm — e.g. sharp tool, hot surface, chemical.' },
      { term: 'Control measure', definition: 'An action taken to reduce risk — guarding, PPE, safe working procedure.' },
      { term: 'COSHH', definition: 'Control of Substances Hazardous to Health — rules for handling dangerous chemicals.' },
      { term: 'Safe working practice', definition: 'Following correct procedures to prevent accidents in the workshop.' },
    ],
    notes: [
      'Always wear appropriate PPE before starting a task in the workshop.',
      'Report hazards and near misses immediately to the teacher.',
      'Keep workspace tidy — clutter leads to accidents.',
      'Carry sharp tools pointing downward; never point them at others.',
      'Secure work with a vice or clamp before cutting or filing.',
      'Know where the first aid kit and fire extinguisher are located.',
      'Switch off machines before making adjustments or cleaning them.',
    ],
  },

  'gr9dt-materials': {
    keywords: [
      { term: 'Hardwood', definition: 'Timber from deciduous (broad-leaved) trees — e.g. oak, teak, mahogany. Generally denser and more expensive.' },
      { term: 'Softwood', definition: 'Timber from coniferous (cone-bearing) trees — e.g. pine, spruce. Generally cheaper and easier to work.' },
      { term: 'Ferrous metal', definition: 'A metal containing iron — e.g. mild steel, stainless steel, cast iron. Can rust.' },
      { term: 'Non-ferrous metal', definition: 'A metal without iron — e.g. aluminium, copper, brass. Does not rust.' },
      { term: 'Thermoplastic', definition: 'A plastic that softens when heated and can be reshaped — e.g. acrylic, PET, HDPE.' },
      { term: 'Thermoset', definition: 'A plastic that sets permanently when heated — cannot be remelted — e.g. epoxy resin, melamine.' },
      { term: 'Composite', definition: 'A material made of two or more different materials — e.g. fibreglass (GRP), carbon fibre.' },
    ],
    notes: [
      'Hardwoods: used for furniture, flooring, decorative items.',
      'Softwoods: used for construction, framing, cheap furniture.',
      'Mild steel: cheap, strong, easy to weld — rusts without treatment.',
      'Aluminium: lightweight, corrosion-resistant — used in aircraft, bikes, cans.',
      'Acrylic: transparent, colourful, easy to cut and heat-bend.',
      'Properties to consider: hardness, strength, toughness, elasticity, conductivity, cost.',
      'Sustainability: consider whether materials are renewable, recyclable or biodegradable.',
    ],
  },

  'gr9dt-mechanisms': {
    keywords: [
      { term: 'Lever', definition: 'A rigid bar pivoting around a fulcrum — used to multiply force or change direction.' },
      { term: 'Fulcrum (pivot)', definition: 'The fixed point a lever rotates around.' },
      { term: 'Gear', definition: 'A toothed wheel that meshes with another to transfer rotary motion and change speed/torque.' },
      { term: 'Gear ratio', definition: 'Driver teeth ÷ driven teeth — determines speed and torque change.' },
      { term: 'Cam', definition: 'An irregularly shaped wheel that converts rotary motion into reciprocating (up-down) motion.' },
      { term: 'Pulley', definition: 'A wheel with a belt or rope — used to transmit motion or lift loads.' },
      { term: 'Mechanical advantage', definition: 'Load ÷ Effort — the factor by which a mechanism multiplies force.' },
    ],
    notes: [
      'Three classes of lever differ by where the fulcrum, load and effort are placed.',
      'Class 1 lever: fulcrum in the middle — e.g. scissors, seesaw.',
      'Class 2 lever: load in the middle — e.g. wheelbarrow, nutcracker.',
      'Class 3 lever: effort in the middle — e.g. tweezers, fishing rod.',
      'Gear ratio > 1: driven gear is slower but has more torque (force).',
      'Gear ratio < 1: driven gear is faster but has less torque.',
      'Cam profiles determine the motion pattern — eccentric, pear-shaped, snail.',
    ],
  },

  'gr9dt-manufacturing': {
    keywords: [
      { term: 'One-off production', definition: 'Making a single, unique product — high cost, high skill, fully customised.' },
      { term: 'Batch production', definition: 'Making a set quantity of identical products — then retooling for a different product.' },
      { term: 'Mass production', definition: 'Continuous, large-scale manufacturing of identical items on an assembly line.' },
      { term: 'Cutting', definition: 'Removing material to shape it — sawing, drilling, turning, milling.' },
      { term: 'Joining', definition: 'Permanently (welding, soldering, gluing) or temporarily (screws, nuts & bolts) fixing parts.' },
      { term: 'Finishing', definition: 'Treating a surface to improve appearance or protect against wear/corrosion — paint, varnish, anodising.' },
      { term: 'Tolerance', definition: 'The acceptable range of variation in a dimension — e.g. 50 mm ± 0.5 mm.' },
    ],
    notes: [
      'One-off: bespoke furniture, prototype, wedding cake topper.',
      'Batch: shoes (run of one size), books, bread in a bakery.',
      'Mass production: cars, phones, tins of food — constant, automated, low unit cost.',
      'Drilling: always pilot drill before using a larger bit; secure the work.',
      'Filing: removes small amounts of material to refine shape and smooth edges.',
      'Sanding grits: start coarse (e.g. 80), finish fine (e.g. 400) for a smooth surface.',
      'Quality control checks tolerance during production to prevent defective parts.',
    ],
  },
};
