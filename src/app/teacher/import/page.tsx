'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileDown, Upload, CheckCircle, AlertCircle, Info, SkipForward } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFirebase } from '@/hooks/useFirebase';
import { batchSaveQuestions, getExistingQuestionTexts } from '@/lib/firebase/questions';
import { useToast } from '@/components/ui/Toast';
import type { Question } from '@/types/question';

const BG = [
  'radial-gradient(ellipse 70% 50% at 20% 10%,  rgba(16,185,129,0.1) 0%, transparent 55%)',
  'radial-gradient(ellipse 60% 60% at 80% 20%,  rgba(56,189,248,0.07) 0%, transparent 50%)',
  '#050814',
].join(',');

// ---------------------------------------------------------------------------
// Template CSV — all supported question types + valid topicKeys for every grade
// ---------------------------------------------------------------------------
// ANSWER FORMAT BY TYPE:
//   mcq         — 0-based index of correct option (0=A, 1=B, 2=C, 3=D)
//   truefalse   — "true" or "false" (case-insensitive; leave optionA-D blank)
//   shortanswer — expected keyword / phrase; graded case-insensitively (leave optionA-D blank)
//   fillinblank — missing word/phrase; use ___ in the question text (leave optionA-D blank)
//   matching    — pipe-separated RIGHT-side labels in the same order as optionA-D
//                 e.g. "Router|Switch|Hub|Modem" means A→Router B→Switch C→Hub D→Modem
//   ordering    — pipe-separated 0-based indices giving the correct sequence
//                 e.g. "2|0|3|1" means optC, optA, optD, optB
//
// VALID topicKey VALUES (copy exactly — wrong keys will be rejected):
//
// Grade 4 Computing:
//   gr4-ch1-peripherals  gr4-ch2-logo  gr4-ch3-files  gr4-ch4-desktop
//   gr4-ch5-formatting   gr4-ch6-word  gr4-ch7-internet  gr4-ch8-ppt1  gr4-ch9-ppt2
//
// Grade 5 Computing:
//   gr5-ch1-history   gr5-ch2-storage   gr5-ch3-tables   gr5-ch4-pptanim
//   gr5-ch5-slideshow gr5-ch6-internet  gr5-ch7-multimedia
//   gr5-ch8-scratch1  gr5-ch9-scratch2
//
// Grade 6 Computing:
//   gr6-ch1-robotics  gr6-ch2-mailmerge  gr6-ch3-email
//   gr6-ch4-excel1    gr6-ch5-excel2     gr6-ch6-excel3
//   gr6-ch7-algorithms gr6-ch8-scratch3  gr6-ch9-qb64
//
// Grade 7 Computing:
//   gr7-ch1-numbers       gr7-ch2-excel-calc   gr7-ch3-excel-data
//   gr7-ch4-excel-charts  gr7-ch5-internet     gr7-ch6-html1
//   gr7-ch7-html2         gr7-ch8-ai           gr7-ch9-qb64
//   gr7-ch10-python
//
// Grade 8 Computing:
//   gr8-ch1-ai         gr8-ch2-tech        gr8-ch3-access1
//   gr8-ch4-access2    gr8-ch5-access3     gr8-ch6-networks
//   gr8-ch7-google     gr8-ch8-malware     gr8-ch9-html-tables
//   gr8-ch10-social    gr8-ch11-troubleshoot  gr8-ch12-python
//
// Grade 9 CS IGCSE 0478:
//   gr9-cpu  gr9-fde  gr9-embedded  gr9-storage  gr9-os
//   gr9-languages  gr9-internet  gr9-logic
//   gr9-data-binary  gr9-data-twos  gr9-data-text
//   gr9-data-sound   gr9-data-images  gr9-data-compression
//   gr9-networking   gr9-programming
//
// Grade 9 DT IGCSE 0445:
//   gr9dt-influences  gr9dt-design-brief  gr9dt-developing  gr9dt-plan
//   gr9dt-evaluation  gr9dt-communication  gr9dt-making
//   gr9dt-materials   gr9dt-manufacturing  gr9dt-health-safety
//   gr9dt-structures  gr9dt-mechanisms
//
// Grade 10 CS IGCSE 0478:
//   gr10-data-integrity  gr10-cybersecurity  gr10-encryption
//   gr10-sensors  gr10-robotics  gr10-ai  gr10-quantum
//   gr10-abstraction  gr10-algorithms  gr10-programming  gr10-sql
//
// Grade 11 CS A-Level 9618:
//   gr11-information  gr11-communication  gr11-hardware  gr11-processor
//   gr11-system-software  gr11-security  gr11-ai-advanced
//   gr11-programming  gr11-oop  gr11-algorithms  gr11-databases
// ---------------------------------------------------------------------------

const TEMPLATE_HEADERS = 'id,topicKey,type,text,optionA,optionB,optionC,optionD,answer,explanation,difficulty,points,chapter,imageUrl';

const TEMPLATE_ROWS = [
  // One row per topicKey — copy the exact topicKey from column B into your own CSV.
  // answer = 0-based index of the correct option. Leave imageUrl (col 14) blank or add a full https:// URL.
  `scratch-basics-q001,scratch-basics,mcq,In Scratch; what is the term for the characters or objects that appear on the stage?,Sprites,Backdrops,Scripts,Blocks,0,Sprites are the characters or objects in a Scratch project. They can have costumes; sounds; and scripts attached to them.,easy,1,1,`,
  `scratch-control-q001,scratch-control,mcq,Which Scratch block will repeat a set of instructions exactly 10 times?,repeat 10,forever,if <> then,wait 10 seconds,0,The ’repeat 10’ block is a loop that runs the blocks inside it exactly 10 times before continuing.,easy,1,1,`,
  `word-layout-q001,word-layout,mcq,Which Microsoft Word feature lets you change the margin size on a page?,Page Layout → Margins,Insert → Header,Home → Font,View → Ruler,0,In Word; margins are adjusted through the Page Layout (or Layout) tab using the Margins option.,easy,1,1,`,
  `word-tables-q001,word-tables,mcq,To add a new row at the bottom of a Word table; you can press which key while the cursor is in the last cell?,Tab,Enter,Shift+Enter,Ctrl+Enter,0,Pressing Tab in the last cell of a Word table automatically adds a new row at the bottom.,easy,1,1,`,
  `html-basics-q001,html-basics,mcq,Which HTML tag is used to create the largest heading on a webpage?,<h1>,<head>,<header>,<big>,0,<h1> defines the most important (largest) heading. Headings go from <h1> (largest) to <h6> (smallest).,easy,1,1,`,
  `css-styling-q001,css-styling,mcq,Which CSS property changes the text colour of an element?,color,font-color,text-color,foreground,0,The ’color’ property sets the foreground (text) colour of an element in CSS.,easy,1,1,`,
  `small-basic-q001,small-basic,mcq,In Small Basic; which object is used to display text on the screen?,TextWindow,GraphicsWindow,Program,Clock,0,TextWindow is the Small Basic object for text-based output (and input). Use TextWindow.WriteLine() to print text.,easy,1,1,`,
  `presentations-q001,presentations,mcq,Which view in PowerPoint shows all slides as small thumbnails in sequence?,Slide Sorter,Normal,Reading,Presenter,0,Slide Sorter view displays all slides as thumbnails; making it easy to reorder or delete slides.,easy,1,1,`,
  `excel-basics-q001,excel-basics,mcq,In Excel; which function adds up all values in the range A1 to A10?,=SUM(A1:A10),=ADD(A1:A10),=TOTAL(A1:A10),=PLUS(A1:A10),0,=SUM(A1:A10) is the correct Excel formula to add all values from cell A1 through A10.,easy,1,1,`,
  `gr7-ch1-intro-q001,gr7-ch1-intro,mcq,Which of the following best describes a computer?,An electronic device that processes data according to instructions,A machine that only stores information,A device that only outputs information,A tool used only for communication,0,A computer is an electronic device that accepts input; processes it according to stored instructions; and produces output.,easy,1,1,`,
  `gr7-ch2-ipo-q001,gr7-ch2-ipo,mcq,In the IPO model; what does the letter ’P’ stand for?,Processing,Printing,Programming,Presenting,0,IPO stands for Input – Processing – Output; the three fundamental stages of how a computer handles data.,easy,1,1,`,
  `gr7-ch3-data-q001,gr7-ch3-data,mcq,Which of the following is an example of information rather than raw data?,A calculated class average of 72%,A list of unprocessed test scores,Temperature readings from a sensor,A set of survey responses before analysis,0,Information is data that has been processed and given meaning. A calculated average is processed data; making it information.,easy,1,1,`,
  `gr7-ch4-networks-q001,gr7-ch4-networks,mcq,What is the primary purpose of the internet?,To connect computers and devices globally for communication and data sharing,To store all the world’s data in one place,To control all computers from a central server,To run programs faster on local machines,0,The internet is a global network of interconnected computers and devices that enables communication and data sharing worldwide.,easy,1,1,`,
  `gr7-ch5-safety-q001,gr7-ch5-safety,mcq,Which practice best protects your online accounts from being hacked?,Using strong; unique passwords for each account,Using the same simple password everywhere,Sharing your password with trusted friends,Never logging out of accounts,0,Strong; unique passwords for each account reduce the risk that a breach on one site compromises other accounts.,easy,1,1,`,
  `gr4-ch1-peripherals-q001,gr4-ch1-peripherals,mcq,Which of the following is an OUTPUT device?,Monitor,Keyboard,Mouse,Scanner,0,A monitor displays information from the computer; making it an output device. Keyboards; mice; and scanners are input devices.,easy,1,1,`,
  `gr4-ch2-logo-q001,gr4-ch2-logo,mcq,In Logo programming; which command moves the turtle forward by 50 steps?,FORWARD 50,MOVE 50,GO 50,STEP 50,0,FORWARD (or FD) 50 moves the Logo turtle forward by 50 units in the direction it is currently facing.,easy,1,1,`,
  `gr4-ch3-files-q001,gr4-ch3-files,mcq,What is a folder (directory) used for on a computer?,To organise and group related files together,To run programs faster,To connect to the internet,To increase storage space,0,Folders (directories) are used to organise files into groups; making it easier to find and manage them.,easy,1,1,`,
  `gr4-ch4-desktop-q001,gr4-ch4-desktop,mcq,Which part of the Windows desktop shows the time; date; and system icons?,Taskbar / System Tray,Desktop wallpaper,Recycle Bin,Start Menu,0,The taskbar (specifically the system tray or notification area) at the bottom of the screen shows the clock; date; and system icons.,easy,1,1,`,
  `gr4-ch5-formatting-q001,gr4-ch5-formatting,mcq,Which keyboard shortcut makes selected text bold in most word processors?,Ctrl + B,Ctrl + U,Ctrl + I,Ctrl + F,0,Ctrl + B applies bold formatting to selected text in most word-processing applications.,easy,1,1,`,
  `gr4-ch6-word-q001,gr4-ch6-word,mcq,In Microsoft Word; which feature lets you apply a pre-designed combination of fonts; colours; and effects to text?,Styles,Templates,Themes,Macros,0,Styles in Word are named sets of formatting (font; size; colour; spacing) that can be applied to text with one click.,easy,1,1,`,
  `gr4-ch7-internet-q001,gr4-ch7-internet,mcq,What does URL stand for?,Uniform Resource Locator,Universal Reference Link,Unified Resource Language,Unique Routing Label,0,URL stands for Uniform Resource Locator — the web address used to locate a specific resource on the internet.,easy,1,1,`,
  `gr4-ch8-ppt1-q001,gr4-ch8-ppt1,mcq,In PowerPoint; what is each individual page of a presentation called?,Slide,Frame,Sheet,Page,0,Each page in a PowerPoint presentation is called a slide. A presentation is made up of one or more slides.,easy,1,1,`,
  `gr4-ch9-ppt2-q001,gr4-ch9-ppt2,mcq,Which PowerPoint feature controls how one slide transitions to the next during a slideshow?,Transitions,Animations,Timings,Themes,0,Transitions are visual effects that appear between slides. Animations apply to objects within a slide.,easy,1,1,`,
  `gr5-ch1-history-q001,gr5-ch1-history,mcq,What generation of computers first used transistors instead of vacuum tubes?,Second generation,First generation,Third generation,Fourth generation,0,Second-generation computers (late 1950s–early 1960s) replaced vacuum tubes with transistors; making them smaller and more reliable.,easy,1,1,`,
  `gr5-ch2-storage-q001,gr5-ch2-storage,mcq,Which storage medium uses laser light to read and write data?,Optical disc (CD/DVD),Hard disk drive,USB flash drive,RAM,0,Optical discs (CDs; DVDs; Blu-rays) use a laser beam to read and write data stored as tiny pits on the disc surface.,easy,1,1,`,
  `gr5-ch3-tables-q001,gr5-ch3-tables,mcq,In Microsoft Word; which menu option do you use to insert a table into your document?,Insert → Table,Home → Table,Layout → Table,View → Table,0,Tables are inserted via the Insert tab in Microsoft Word. You can choose the number of rows and columns.,easy,1,1,`,
  `gr5-ch4-pptanim-q001,gr5-ch4-pptanim,mcq,In PowerPoint; what is the difference between an animation and a transition?,Animations apply to objects on a slide; transitions apply between slides,Transitions apply to objects on a slide; animations apply between slides,They are the same thing,Animations only work on text; transitions only work on images,0,Animations control how objects (text; images) appear or move on a slide. Transitions control how the whole slide changes to the next.,easy,1,1,`,
  `gr5-ch5-slideshow-q001,gr5-ch5-slideshow,mcq,Which key starts a PowerPoint slideshow from the beginning?,F5,F1,Esc,Enter,0,Pressing F5 starts the slideshow from the first slide. Shift+F5 starts from the current slide.,easy,1,1,`,
  `gr5-ch6-internet-q001,gr5-ch6-internet,mcq,What is the purpose of a search engine?,To find and index web pages based on keywords,To store your personal files online,To send emails,To create websites,0,A search engine (e.g. Google) crawls and indexes the web so users can find pages relevant to their search keywords.,easy,1,1,`,
  `gr5-ch7-multimedia-q001,gr5-ch7-multimedia,mcq,Which of the following is NOT a type of multimedia?,Spreadsheet formula,Video,Audio,Animation,0,Multimedia refers to content that uses a combination of text; audio; images; video; and animation. A spreadsheet formula is not multimedia.,easy,1,1,`,
  `gr5-ch8-scratch1-q001,gr5-ch8-scratch1,mcq,In Scratch; which block category contains the ’move 10 steps’ block?,Motion,Looks,Control,Sound,0,The Motion category contains blocks that control sprite movement; including ’move 10 steps’ and ’turn’ blocks.,easy,1,1,`,
  `gr5-ch9-scratch2-q001,gr5-ch9-scratch2,mcq,In Scratch; what does the ’broadcast’ block do?,Sends a message that other sprites can receive and respond to,Makes the sprite louder,Moves the sprite to a random position,Changes the sprite’s costume,0,Broadcast sends a named message to all sprites. Any sprite with a ’when I receive’ block listening for that message will run its script.,medium,1,1,`,
  `gr6-ch1-robotics-q001,gr6-ch1-robotics,mcq,What is a sensor in the context of robotics?,A device that detects information from the environment,A motor that moves the robot,The robot’s central processor,The battery that powers the robot,0,Sensors detect environmental inputs (light; temperature; distance; etc.) and convert them into signals the robot can process.,easy,1,1,`,
  `gr6-ch2-mailmerge-q001,gr6-ch2-mailmerge,mcq,What is the main purpose of mail merge in Microsoft Word?,To personalise a document (e.g. a letter) with data from a list,To merge two Word documents into one,To send emails directly from Word,To format all paragraphs identically,0,Mail merge combines a template document with a data source (e.g. a spreadsheet) to produce personalised copies for each recipient.,easy,1,1,`,
  `gr6-ch3-email-q001,gr6-ch3-email,mcq,Which email field should you use to send a copy of a message to someone who is not the main recipient?,CC (Carbon Copy),BCC (Blind Carbon Copy),TO,Reply-To,0,CC (Carbon Copy) sends a visible copy to extra recipients. BCC sends a copy without other recipients seeing the address.,easy,1,1,`,
  `gr6-ch4-excel1-q001,gr6-ch4-excel1,mcq,In Excel; what is a cell reference?,The address of a cell; e.g. B3,The formula entered in a cell,The value displayed in a cell,The name of the worksheet,0,A cell reference (e.g. B3) identifies a specific cell by its column letter and row number. It is used in formulas to refer to that cell’s value.,easy,1,1,`,
  `gr6-ch5-excel2-q001,gr6-ch5-excel2,mcq,Which Excel shortcut key opens the Find & Replace dialog?,Ctrl + H,Ctrl + F,Ctrl + G,Ctrl + R,0,Ctrl + H opens Find & Replace in Excel; letting you find specific text and replace it. Ctrl + F opens Find only.,easy,1,1,`,
  `gr6-ch6-excel3-q001,gr6-ch6-excel3,mcq,In Excel; what does ’wrap text’ formatting do to a cell?,Displays long text on multiple lines within the cell,Shrinks the text to fit the cell width,Merges the cell with the one next to it,Rotates the text 90 degrees,0,Wrap Text makes long cell content display on multiple lines within the same cell rather than overflowing into adjacent cells.,easy,1,1,`,
  `gr6-ch7-algorithms-q001,gr6-ch7-algorithms,mcq,Which flowchart symbol is used to represent a decision (yes/no question)?,Diamond,Rectangle,Oval,Parallelogram,0,A diamond shape in a flowchart represents a decision point; typically a yes/no or true/false condition.,easy,1,1,`,
  `gr6-ch8-scratch3-q001,gr6-ch8-scratch3,mcq,In Scratch; which block lets you sense whether the mouse button is being pressed?,<mouse down?>,<touching mouse-pointer?>,ask [] and wait,set [mouse] to [],0,’mouse down?’ is a sensing block that reports true when the mouse button is currently held down.,easy,1,1,`,
  `gr6-ch9-qb64-q001,gr6-ch9-qb64,mcq,In QB64 (QuickBASIC); which keyword is used to display text on the screen?,PRINT,DISPLAY,SHOW,OUTPUT,0,The PRINT keyword in QB64/QBasic outputs text or values to the console screen.,easy,1,1,`,
  `gr7-ch1-numbers-q001,gr7-ch1-numbers,mcq,What is the decimal value of the binary number 1011?,11,9,13,7,0,1011 in binary = 1×8 + 0×4 + 1×2 + 1×1 = 8 + 0 + 2 + 1 = 11 in decimal.,medium,1,1,`,
  `gr7-ch2-excel-calc-q001,gr7-ch2-excel-calc,mcq,In Excel; which formula correctly calculates the average of cells B2 to B8?,=AVERAGE(B2:B8),=MEAN(B2:B8),=SUM(B2:B8)/COUNT,=AVG(B2:B8),0,=AVERAGE(B2:B8) is the correct Excel function to calculate the arithmetic mean of cells B2 through B8.,easy,1,1,`,
  `gr7-ch3-excel-data-q001,gr7-ch3-excel-data,mcq,Which Excel feature arranges data from lowest to highest value?,Sort Ascending (A→Z),Filter,Group,Pivot Table,0,Sort Ascending arranges data from smallest to largest (numbers) or A to Z (text).,easy,1,1,`,
  `gr7-ch4-excel-charts-q001,gr7-ch4-excel-charts,mcq,Which chart type is most suitable for showing how a value changes over time?,Line chart,Pie chart,Bar chart,Scatter chart,0,Line charts are best for showing trends and changes over a continuous period of time.,easy,1,1,`,
  `gr7-ch5-internet-q001,gr7-ch5-internet,mcq,Which protocol is used to securely transfer web pages over the internet?,HTTPS,HTTP,FTP,SMTP,0,HTTPS (Hypertext Transfer Protocol Secure) encrypts data between the browser and web server; making it the secure version of HTTP.,easy,1,1,`,
  `gr7-ch6-html1-q001,gr7-ch6-html1,mcq,Which HTML tag creates a hyperlink?,<a href=’...’>,<link>,<url>,<navigate>,0,The <a> (anchor) tag creates hyperlinks. The href attribute specifies the destination URL.,easy,1,1,`,
  `gr7-ch7-html2-q001,gr7-ch7-html2,mcq,What does the HTML <img> tag’s ’alt’ attribute do?,Provides alternative text if the image cannot be displayed,Sets the image height,Aligns the image on the page,Adds a caption below the image,0,The alt attribute supplies descriptive alternative text shown when an image fails to load; and is also read by screen readers.,easy,1,1,`,
  `gr7-ch8-ai-q001,gr7-ch8-ai,mcq,Which of the following is an example of machine learning?,A spam filter that improves by analysing thousands of emails,A calculator following fixed rules,A remote control turning on a TV,A thermostat set to a fixed temperature,0,Machine learning systems improve their performance by learning patterns from large amounts of data; unlike rule-based programs.,easy,1,1,`,
  `gr7-ch9-qb64-q001,gr7-ch9-qb64,mcq,In QB64; which statement is used to receive input from the user during program execution?,INPUT,GET,READ,RECEIVE,0,The INPUT statement pauses program execution; displays an optional prompt; and stores what the user types into a variable.,easy,1,1,`,
  `gr7-ch10-python-q001,gr7-ch10-python,mcq,Which Python function is used to display output on the screen?,print(),display(),show(),output(),0,print() is the built-in Python function for outputting text and values to the console.,easy,1,1,`,
  `gr8-ch1-ai-q001,gr8-ch1-ai,mcq,What type of AI task involves teaching a computer to recognise cats in photos?,Image classification,Natural language processing,Robotics control,Data encryption,0,Image classification is an AI task where a model is trained to assign labels (e.g. ’cat’) to images.,easy,1,1,`,
  `gr8-ch2-tech-q001,gr8-ch2-tech,mcq,What is the Internet of Things (IoT)?,A network of everyday physical devices connected to the internet,A new programming language,A type of computer virus,An internet service provider,0,IoT refers to everyday objects (smart watches; fridges; sensors) embedded with technology that allows them to connect and exchange data over the internet.,easy,1,1,`,
  `gr8-ch3-access1-q001,gr8-ch3-access1,mcq,In Microsoft Access; what is a table?,A structured collection of data organised in rows (records) and columns (fields),A visual form for entering data,A query that filters data,A printed summary of database information,0,In a database; a table stores data in rows (records) and columns (fields). It is the fundamental storage unit in Access.,easy,1,1,`,
  `gr8-ch4-access2-q001,gr8-ch4-access2,mcq,In Access; what is the purpose of a primary key?,To uniquely identify each record in a table,To link two tables together,To sort records alphabetically,To lock the database from editing,0,A primary key is a field (or set of fields) whose value is unique for every record; allowing each row to be identified unambiguously.,easy,1,1,`,
  `gr8-ch5-access3-q001,gr8-ch5-access3,mcq,What is the purpose of a report in Microsoft Access?,To present database data in a formatted; printable layout,To enter new records into a table,To run calculations on data,To connect two database tables,0,Reports format and present database information for printing or viewing; often summarising or grouping data from queries or tables.,easy,1,1,`,
  `gr8-ch6-networks-q001,gr8-ch6-networks,mcq,What does ’bandwidth’ refer to in networking?,The maximum amount of data that can be transmitted per second,The distance between two computers,The number of devices on a network,The security level of a network,0,Bandwidth is the capacity of a network connection; measured in bits per second (bps). Higher bandwidth means more data can be sent per second.,easy,1,1,`,
  `gr8-ch7-google-q001,gr8-ch7-google,mcq,Which Google app is best suited for creating and collaborating on a spreadsheet online?,Google Sheets,Google Docs,Google Slides,Google Drive,0,Google Sheets is the Google Workspace equivalent of Microsoft Excel — an online spreadsheet application with real-time collaboration.,easy,1,1,`,
  `gr8-ch8-malware-q001,gr8-ch8-malware,mcq,What type of malware disguises itself as legitimate software to trick users into installing it?,Trojan horse,Virus,Worm,Spyware,0,A Trojan horse appears to be a useful program but secretly carries malicious code. Unlike viruses; Trojans do not replicate themselves.,easy,1,1,`,
  `gr8-ch9-html-tables-q001,gr8-ch9-html-tables,mcq,Which HTML tag defines a data cell within a table row?,<td>,<th>,<tr>,<table>,0,<td> (table data) defines a standard data cell. <th> defines a header cell. <tr> defines a row. <table> defines the table itself.,easy,1,1,`,
  `gr8-ch10-social-q001,gr8-ch10-social,mcq,What is cyberbullying?,Using digital technology to harass; threaten; or embarrass another person,Installing harmful software on someone’s computer,Stealing someone’s personal files,Sending unsolicited commercial emails,0,Cyberbullying is the use of electronic communication (social media; messaging) to bully; intimidate; or harm another person.,easy,1,1,`,
  `gr8-ch11-troubleshoot-q001,gr8-ch11-troubleshoot,mcq,A computer is running very slowly. Which of the following is the FIRST troubleshooting step?,Restart the computer,Reinstall the operating system,Replace the hard drive,Buy a new computer,0,Restarting clears temporary files and memory and often resolves performance issues. It is always the first and simplest troubleshooting step.,easy,1,1,`,
  `gr8-ch12-python-q001,gr8-ch12-python,mcq,In Python; which keyword starts a function definition?,def,function,fun,define,0,In Python; functions are defined using the ’def’ keyword; followed by the function name and parentheses; e.g. def greet():,easy,1,1,`,
  `gr9-cpu-q001,gr9-cpu,mcq,What is the role of the Control Unit (CU) within the CPU?,It directs the operation of the processor by interpreting and executing instructions,It performs arithmetic and logical operations,It stores frequently used data temporarily,It manages input and output operations,0,The Control Unit fetches; decodes; and executes instructions. It coordinates the activities of the CPU and other hardware components.,medium,1,1,`,
  `gr9-memory-q001,gr9-memory,mcq,Which type of memory loses its contents when the computer is switched off?,RAM,ROM,Flash memory,Hard drive,0,RAM (Random Access Memory) is volatile — its contents are lost when power is removed. ROM and flash memory are non-volatile.,easy,1,1,`,
  `gr9-io-devices-q001,gr9-io-devices,mcq,Which of the following is a direct-entry input device?,Barcode scanner,Keyboard,Monitor,Printer,0,A barcode scanner reads data directly without the user typing it; making it a direct-entry (automatic) input device.,easy,1,1,`,
  `gr9-fde-q001,gr9-fde,mcq,During which stage of the Fetch-Decode-Execute cycle is the instruction retrieved from main memory?,Fetch,Decode,Execute,Store,0,In the Fetch stage; the CPU retrieves the next instruction from main memory using the address stored in the Program Counter (PC).,easy,1,1,`,
  `gr9-embedded-q001,gr9-embedded,mcq,Which of the following is an example of an embedded system?,The control system inside a microwave oven,A desktop computer running Windows,A laptop connected to the internet,A USB flash drive,0,An embedded system is a dedicated computer system built into a device to control a specific function; like the controller inside a microwave.,easy,1,1,`,
  `gr9-storage-q001,gr9-storage,mcq,Which secondary storage device has no moving parts and uses flash memory?,Solid State Drive (SSD),Hard Disk Drive (HDD),Magnetic tape,Optical disc,0,SSDs store data in flash memory chips with no moving mechanical parts; making them faster and more shock-resistant than HDDs.,easy,1,1,`,
  `gr9-os-q001,gr9-os,mcq,Which of the following is NOT a function of an operating system?,Editing a word-processing document,Managing memory allocation,Controlling input and output devices,Providing a user interface,0,Editing a document is done by application software. The OS manages hardware resources; memory; I/O; and provides a UI for applications to run on.,medium,1,1,`,
  `gr9-languages-q001,gr9-languages,mcq,What does a compiler do?,Translates the entire high-level source code into machine code before execution,Translates and executes source code one line at a time,Converts machine code back into source code,Checks source code for logic errors only,0,A compiler translates the whole high-level program into machine code in one go; producing an executable file. An interpreter translates line by line at run time.,medium,1,1,`,
  `gr9-internet-q001,gr9-internet,mcq,What is the purpose of DNS (Domain Name System)?,To translate domain names (e.g. www.google.com) into IP addresses,To encrypt web traffic between client and server,To assign IP addresses to devices on a network,To filter inappropriate content on the internet,0,DNS acts like a phonebook for the internet; converting human-readable domain names into numerical IP addresses that computers use to route traffic.,medium,1,1,`,
  `gr9-logic-q001,gr9-logic,mcq,What is the output of an AND gate when both inputs are 1?,1,0,Undefined,Depends on the circuit,0,An AND gate outputs 1 only when ALL inputs are 1. With both inputs at 1; the output is 1.,easy,1,1,`,
  `gr9-data-rep-q001,gr9-data-rep,mcq,How many different values can be represented with 4 bits?,16,8,4,32,0,With n bits you can represent 2ⁿ values. With 4 bits: 2⁴ = 16 possible values (0 through 15).,easy,1,1,`,
  `gr9-data-binary-q001,gr9-data-binary,mcq,Convert the hexadecimal number 2F to binary.,00101111,00110010,00101100,00111111,0,2 in hex = 0010 in binary; F in hex = 1111 in binary. Combined: 00101111.,medium,1,1,`,
  `gr9-data-twos-q001,gr9-data-twos,mcq,Using 8-bit two’s complement; what is the decimal value of 11111110?,-2,-1,254,-126,0,For two’s complement: 11111110 → invert bits = 00000001; add 1 = 00000010 = 2. Because MSB is 1 the number is negative: -2.,hard,1,1,`,
  `gr9-data-text-q001,gr9-data-text,mcq,What is the main advantage of Unicode over ASCII for text representation?,Unicode supports a much larger range of characters including non-Latin scripts,Unicode uses fewer bits per character,Unicode is faster to process,Unicode is only used for programming languages,0,ASCII uses 7 bits and covers only 128 characters (English). Unicode (e.g. UTF-8/UTF-16) supports over a million characters including Arabic; Chinese; emoji; etc.,easy,1,1,`,
  `gr9-data-sound-q001,gr9-data-sound,mcq,Which factor has the greatest effect on the file size of a digital audio recording?,Sample rate and bit depth,The type of microphone used,The volume of the recording,The operating system used,0,File size = sample rate × bit depth × duration × channels. Higher sample rate and bit depth produce better quality but larger files.,medium,1,1,`,
  `gr9-data-images-q001,gr9-data-images,mcq,What is a pixel?,The smallest unit of a digital image; representing a single point of colour,A unit of image file size,The resolution of a display screen,A type of image file format,0,A pixel (picture element) is the smallest unit of a digital image. Each pixel has a colour value; together they form the complete image.,easy,1,1,`,
  `gr9-data-compression-q001,gr9-data-compression,mcq,What is the key difference between lossy and lossless compression?,Lossy removes some data permanently; lossless allows perfect reconstruction of the original,Lossless removes data permanently; lossy keeps the original intact,Lossy is always smaller than lossless,They are the same process with different names,0,Lossy compression (e.g. JPEG; MP3) discards some data for smaller files. Lossless compression (e.g. PNG; FLAC) reduces size without losing any data.,easy,1,1,`,
  `gr9-number-systems-q001,gr9-number-systems,mcq,What is the base (radix) of the hexadecimal number system?,16,2,8,10,0,Hexadecimal is base-16; using digits 0–9 and letters A–F to represent values 0–15.,easy,1,1,`,
  `gr9-text-sound-images-q001,gr9-text-sound-images,mcq,Which file format is typically used for lossless image compression?,PNG,JPEG,MP3,AVI,0,PNG uses lossless compression — no image data is discarded; making it suitable for graphics that require sharp edges.,easy,1,1,`,
  `gr9-compression-q001,gr9-compression,mcq,Run-length encoding (RLE) is most effective for which type of data?,Data with many consecutive repeated values,Data that is already compressed,Data with no repeating values,Audio data,0,RLE replaces runs of repeated values with a count and a single value. It is highly effective when data has long sequences of the same value (e.g. simple images).,medium,1,1,`,
  `gr9-networking-q001,gr9-networking,mcq,What is the purpose of the TCP/IP protocol suite?,To define rules for how data is sent and received over the internet,To encrypt all internet traffic,To assign domain names to websites,To detect viruses on a network,0,TCP/IP is the foundational set of communication protocols for the internet; governing how data is packetised; addressed; transmitted; routed; and received.,easy,1,1,`,
  `gr9-networks-q001,gr9-networks,mcq,What is a MAC address?,A unique hardware identifier assigned to a network interface card,A software address assigned by a DHCP server,A URL for accessing a website,A password for a wireless network,0,A MAC (Media Access Control) address is a 48-bit hardware identifier permanently assigned to a network interface by its manufacturer.,easy,1,1,`,
  `gr9-programming-q001,gr9-programming,mcq,What is a variable in programming?,A named storage location in memory that holds a value,A fixed value that never changes,A type of loop,A function that returns a result,0,A variable is a named container in memory whose value can be read; changed; or used during program execution.,easy,1,1,`,
  `gr9-algorithms-q001,gr9-algorithms,mcq,What is the time complexity of a linear search on a list of n items in the worst case?,O(n),O(1),O(log n),O(n²),0,In the worst case; linear search checks every element once; giving O(n) time complexity.,medium,1,1,`,
  `gr9-cybersec-q001,gr9-cybersec,mcq,What is phishing?,A fraudulent attempt to obtain sensitive information by pretending to be a trustworthy source,Installing a program that monitors keystrokes,Flooding a server with traffic to make it unavailable,Encrypting a victim’s files and demanding a ransom,0,Phishing tricks users (typically via fake emails or websites) into revealing passwords; credit card numbers; or other sensitive data.,easy,1,1,`,
  `gr9dt-influences-q001,gr9dt-influences,mcq,Which of the following is a cultural influence on product design?,Designing a product that reflects the traditions and values of a specific community,Choosing cheaper materials to reduce cost,Making a product as small as possible,Using only one colour throughout the design,0,Cultural influences include local traditions; aesthetics; symbols; and values that shape what a product looks like or how it is used.,easy,1,1,`,
  `gr9dt-design-brief-q001,gr9dt-design-brief,mcq,What is the purpose of a design brief?,To clearly define the design problem and outline what the final product must achieve,To list the tools needed for manufacturing,To provide a detailed manufacturing plan,To record the cost of materials used,0,A design brief is a short written statement that identifies the design problem and sets the goals; constraints; and requirements the solution must meet.,easy,1,1,`,
  `gr9dt-developing-q001,gr9dt-developing,mcq,Why is it important to produce multiple design proposals before choosing one?,It allows comparison of different ideas and selection of the most suitable solution,It is a legal requirement for product design,It makes the final product cheaper,It reduces the need for a design brief,0,Multiple proposals widen the solution space; allow evaluation against design criteria; and reduce the risk of overlooking a better solution.,easy,1,1,`,
  `gr9dt-plan-q001,gr9dt-plan,mcq,What does a production plan (manufacturing plan) include?,The sequence of steps; tools; materials; and time needed to make the product,The final selling price of the product,A drawing of what the product will look like,User feedback on the finished product,0,A production plan sets out the order of manufacturing operations; the tools and materials required; and estimated time for each step.,easy,1,1,`,
  `gr9dt-evaluation-q001,gr9dt-evaluation,mcq,Against what should a final product be evaluated?,The original design specification,Products made by other students,The cost of materials only,The teacher’s personal preference,0,A design specification lists the measurable criteria the product must meet. Evaluating against it gives an objective measure of success.,easy,1,1,`,
  `gr9dt-design1-q001,gr9dt-design1,mcq,What is a design specification?,A detailed list of criteria the design solution must meet,A rough sketch of a possible solution,A list of materials required,A record of user feedback,0,A design specification is a precise list of requirements (size; function; safety; cost; aesthetics) that the final solution must satisfy.,easy,1,1,`,
  `gr9dt-design2-q001,gr9dt-design2,mcq,What is the purpose of a prototype in the design process?,To test and evaluate a design idea before full production,To finalise the selling price,To replace the design brief,To identify the target market,0,A prototype is a working model used to test how well a design meets its specification; identify problems; and inform improvements.,easy,1,1,`,
  `gr9dt-design3-q001,gr9dt-design3,mcq,Which method is used to evaluate a design against specific; measurable criteria?,Comparing the product point by point against the design specification,Asking a friend if they like it,Counting the number of design proposals made,Measuring only the cost of production,0,Systematic evaluation checks each criterion in the specification (e.g. dimensions; function; safety) against the actual product.,easy,1,1,`,
  `gr9dt-communication-q001,gr9dt-communication,mcq,Which drawing technique shows a 3D object with three faces visible; drawn along axes at 30° to the horizontal?,Isometric drawing,Orthographic projection,Perspective drawing,Exploded diagram,0,Isometric drawing uses axes at 30° to show three faces of an object simultaneously; giving a 3D appearance without vanishing points.,medium,1,1,`,
  `gr9dt-making-q001,gr9dt-making,mcq,Which of the following is a reason to wear safety goggles when working in a workshop?,To protect the eyes from flying particles; dust; or chemical splashes,To improve vision in low light,To identify the correct tool to use,To prevent static electricity,0,Safety goggles are personal protective equipment (PPE) that shield eyes from hazards such as debris; sparks; or chemical splashes.,easy,1,1,`,
  `gr9dt-materials-q001,gr9dt-materials,mcq,Which of the following is a thermoplastic?,Acrylic (Perspex),Fibreglass (GRP),Urea formaldehyde,Melamine,0,Thermoplastics (e.g. acrylic; PET; HDPE) soften when heated and can be reshaped. Thermosets (e.g. fibreglass; melamine) permanently harden when cured.,medium,1,1,`,
  `gr9dt-manufacturing-q001,gr9dt-manufacturing,mcq,What is vacuum forming used to produce?,Thin plastic sheets moulded into 3D shapes,Metal components with precise dimensions,Wooden joints and furniture,Fabric patterns for clothing,0,Vacuum forming heats a thermoplastic sheet; drapes it over a mould; then uses vacuum pressure to pull it into the mould shape.,easy,1,1,`,
  `gr9dt-health-safety-q001,gr9dt-health-safety,mcq,Before using a power tool; what should always be checked first?,That the tool is in good working order and guards are in place,That the tool matches the colour of the workpiece,That no one else is watching,That the tool is the most expensive available,0,Pre-use checks ensure guards are fitted; cables are undamaged; and the tool functions correctly — preventing accidents during use.,easy,1,1,`,
  `gr9dt-structures-q001,gr9dt-structures,mcq,What is a triangulated structure?,A structure strengthened by arranging members in triangles to distribute loads,A structure built from three identical parts,A structure that can only support vertical loads,A structure made entirely from triangular cross-section beams,0,Triangulation rigidifies a structure by converting bending forces into tension and compression through triangular arrangements of members (e.g. in trusses).,medium,1,1,`,
  `gr9dt-mechanisms-q001,gr9dt-mechanisms,mcq,What is a gear ratio?,The ratio of the number of teeth on the driver gear to the number of teeth on the driven gear,The speed of the motor in rpm,The size of the gear wheel,The force applied to the gear,0,Gear ratio = teeth on driver ÷ teeth on driven gear. It determines the change in speed and torque between the two gears.,medium,1,1,`,
  `gr10-data-integrity-q001,gr10-data-integrity,mcq,Which validation check ensures that a number entered falls within an acceptable range?,Range check,Type check,Length check,Presence check,0,A range check tests whether a value is between a specified minimum and maximum (e.g. a month number must be 1–12).,easy,1,1,`,
  `gr10-cybersecurity-q001,gr10-cybersecurity,mcq,What is a firewall?,A system that monitors and controls incoming and outgoing network traffic based on security rules,A type of antivirus software,A hardware device used to boost Wi-Fi signal,A tool for encrypting files,0,A firewall filters network traffic using predefined security rules to allow or block data packets; protecting a network from unauthorised access.,easy,1,1,`,
  `gr10-encryption-q001,gr10-encryption,mcq,In asymmetric encryption; what is used to encrypt a message that only the recipient can decrypt?,The recipient’s public key,The sender’s private key,A shared secret key,A hash function,0,In asymmetric (public-key) encryption; the sender encrypts with the recipient’s public key. Only the recipient’s private key can decrypt it.,medium,1,1,`,
  `gr10-sensors-q001,gr10-sensors,mcq,Which type of sensor would be used to detect how bright it is in a room?,Light dependent resistor (LDR),Thermistor,Pressure sensor,Moisture sensor,0,An LDR (light dependent resistor) changes its electrical resistance in response to light intensity; making it suitable for measuring brightness.,easy,1,1,`,
  `gr10-robotics-q001,gr10-robotics,mcq,What is the purpose of an actuator in an automated system?,To convert a control signal into physical movement or action,To detect changes in the environment,To process and interpret sensor data,To store instructions for the system,0,Actuators (motors; servos; solenoids) receive electrical signals from the controller and produce mechanical movement or other physical effects.,easy,1,1,`,
  `gr10-ai-q001,gr10-ai,mcq,What does a neural network use to improve its accuracy over time?,Training data and adjustment of weights between nodes,Faster processor speeds,More storage memory,A larger operating system,0,A neural network is trained by feeding it labelled examples and adjusting connection weights using algorithms (e.g. backpropagation) to minimise errors.,medium,1,1,`,
  `gr10-quantum-q001,gr10-quantum,mcq,What is a qubit in quantum computing?,The quantum equivalent of a classical bit; which can exist in a superposition of 0 and 1,A unit of classical computing memory,A type of quantum processor chip,A measurement of computing speed,0,A qubit can be in a superposition of both 0 and 1 simultaneously (until measured); enabling quantum computers to process many states in parallel.,medium,1,1,`,
  `gr10-abstraction-q001,gr10-abstraction,mcq,What is abstraction in problem-solving and programming?,Removing unnecessary details to focus on the essential aspects of a problem,Writing code as quickly as possible,Breaking a problem into smaller sub-problems,Testing every possible input,0,Abstraction simplifies complexity by hiding irrelevant details and representing only what is necessary to solve the problem.,easy,1,1,`,
  `gr10-algorithms-q001,gr10-algorithms,mcq,Which sorting algorithm repeatedly finds the smallest unsorted element and places it in the correct position?,Selection sort,Bubble sort,Merge sort,Insertion sort,0,Selection sort scans the unsorted portion to find the minimum element and swaps it into its correct position; repeating until sorted.,medium,1,1,`,
  `gr10-boolean-q001,gr10-boolean,mcq,Simplify the Boolean expression: A AND NOT A,0 (always false),1 (always true),A,NOT A,0,A AND NOT A is a contradiction — a variable and its complement can never both be true at the same time; so the result is always 0.,medium,1,1,`,
  `gr10-programming-q001,gr10-programming,mcq,What is the purpose of a test plan when developing software?,To document what inputs will be tested; expected outputs; and whether tests passed,To describe the user interface design,To list the programming languages used,To plan the project schedule,0,A test plan specifies test cases (normal; boundary; erroneous data); expected results; and records actual outcomes to verify software correctness.,easy,1,1,`,
  `gr10-system-analysis-q001,gr10-system-analysis,mcq,In the system development life cycle; what happens during the analysis stage?,The current system is investigated and requirements for the new system are identified,The new system is coded and built,The completed system is handed over to users,The system is tested with real data,0,Analysis involves studying the existing system; identifying problems; and defining what the new or improved system must do (requirements gathering).,easy,1,1,`,
  `gr10-sql-q001,gr10-sql,mcq,Which SQL keyword is used to retrieve data from a database table?,SELECT,INSERT,UPDATE,DELETE,0,SELECT is the SQL command for querying a database. It specifies which columns to return and can be combined with WHERE; ORDER BY; etc.,easy,1,1,`,
  `gr10-algorithms-adv-q001,gr10-algorithms-adv,mcq,What is the worst-case time complexity of binary search?,O(log n),O(n),O(n²),O(1),0,Binary search halves the search space with each comparison; giving O(log n) worst-case time complexity.,medium,1,1,`,
  `gr10-python-adv-q001,gr10-python-adv,mcq,In Python; what does the ’open()’ function return when used to read a file?,A file object that can be iterated or read with methods like .read() or .readlines(),The entire file contents as a string immediately,The file size in bytes,A list of filenames in the directory,0,open() returns a file object. You then call methods such as .read(); .readline(); or .readlines() on it to access the file’s content.,medium,1,1,`,
  `gr11-information-q001,gr11-information,mcq,How many bytes are needed to store a single character in UTF-16 encoding (minimum)?,2 bytes,1 byte,3 bytes,4 bytes,0,UTF-16 uses a minimum of 2 bytes (16 bits) per character for the Basic Multilingual Plane; compared to ASCII’s 1 byte.,medium,1,1,`,
  `gr11-communication-q001,gr11-communication,mcq,What is the difference between a LAN and a WAN?,A LAN covers a small geographic area; a WAN covers a large geographic area,A LAN uses wireless only; a WAN uses wired only,A WAN is faster than a LAN,A LAN requires an internet connection; a WAN does not,0,LAN (Local Area Network) covers a limited area such as a building. WAN (Wide Area Network) spans large geographic areas; often connecting multiple LANs.,easy,1,1,`,
  `gr11-hardware-q001,gr11-hardware,mcq,What is De Morgan’s first law?,NOT(A AND B) = NOT A OR NOT B,NOT(A OR B) = NOT A AND NOT B,A AND B = B AND A,NOT(NOT A) = A,0,De Morgan’s first law: NOT(A AND B) ≡ NOT A OR NOT B. This allows conversion between AND and OR gates using inverters.,hard,1,1,`,
  `gr11-processor-q001,gr11-processor,mcq,What is pipelining in a CPU?,Overlapping the fetch; decode; and execute stages of multiple instructions simultaneously,Running two processors in parallel,Caching frequently used instructions,Reducing the clock speed to save energy,0,Pipelining allows different stages of multiple instructions to run concurrently; improving throughput. While one instruction is executing; the next is being decoded; and the one after is being fetched.,hard,1,1,`,
  `gr11-os-q001,gr11-os,mcq,What is virtual memory?,A technique that uses secondary storage to extend the apparent size of RAM,Memory built directly into the CPU,Cache memory on the motherboard,A type of read-only memory,0,Virtual memory uses a section of the hard drive as extra RAM; allowing the OS to run programs larger than physical RAM by swapping data in and out.,medium,1,1,`,
  `gr11-security-q001,gr11-security,mcq,What does two-factor authentication (2FA) require?,Two separate forms of verification (e.g. password + one-time code),Two different passwords for the same account,A password longer than 16 characters,Biometric data only,0,2FA requires something you know (password) AND something you have (phone OTP) or something you are (biometrics); making unauthorised access much harder.,easy,1,1,`,
  `gr11-ai-advanced-q001,gr11-ai-advanced,mcq,In machine learning; what is overfitting?,When a model learns the training data too well and performs poorly on new data,When a model is too simple to capture patterns in the data,When a model takes too long to train,When a model uses too much memory,0,Overfitting occurs when a model memorises training examples (including noise) instead of learning general patterns; causing poor generalisation to unseen data.,medium,1,1,`,
  `gr11-programming-q001,gr11-programming,mcq,In Python; what mode string opens a file for appending new content without deleting existing content?,“a“,“w“,“r“,“x“,0,Opening a file with mode ’a’ (append) positions the write pointer at the end of existing content; so new data is added without overwriting anything.,medium,1,1,`,
  `gr11-oop-q001,gr11-oop,mcq,What is inheritance in object-oriented programming?,A mechanism where a child class derives attributes and methods from a parent class,Combining data and methods into a single unit,Hiding internal implementation details from the user,Creating multiple objects from the same class,0,Inheritance lets a subclass reuse (inherit) properties and behaviours from a superclass; enabling code reuse and a hierarchy of related classes.,easy,1,1,`,
  `gr11-data-structures-q001,gr11-data-structures,mcq,Which data structure operates on a Last In; First Out (LIFO) principle?,Stack,Queue,Linked list,Hash table,0,A stack is LIFO — the last element added (pushed) is the first one removed (popped). A queue is FIFO.,easy,1,1,`,
  `gr11-algorithms-q001,gr11-algorithms,mcq,What does Big O notation describe?,The growth rate of an algorithm’s time or space requirements as input size increases,The exact running time of an algorithm in seconds,The number of lines of code in an algorithm,The programming language used to implement an algorithm,0,Big O notation expresses how the resource requirements (time or memory) of an algorithm scale with input size; independent of hardware or implementation details.,medium,1,1,`,
  `gr11-databases-q001,gr11-databases,mcq,Which SQL clause filters the results of a SELECT query to rows that match a condition?,WHERE,HAVING,GROUP BY,ORDER BY,0,WHERE filters individual rows before any grouping. HAVING filters grouped results after GROUP BY.,easy,1,1,`,
  `gr11-system-software-q001,gr11-system-software,mcq,What is the role of a device driver?,To allow the operating system to communicate with a specific hardware device,To speed up the processor,To manage network connections,To encrypt stored files,0,A device driver is software that acts as a translator between the OS and a hardware component (printer; graphics card; etc.); handling low-level communication.,easy,1,1,`,
  `gr11-logic-q001,gr11-logic,mcq,What is a Karnaugh map (K-map) used for?,Simplifying Boolean expressions by grouping adjacent 1s in a grid,Drawing logic gate diagrams,Converting binary to hexadecimal,Calculating the clock speed of a CPU,0,A K-map is a visual tool for minimising Boolean expressions. Grouping adjacent 1s in powers of 2 allows common factors to be cancelled; simplifying the expression.,hard,1,1,`,
];

const TEMPLATE_CSV = TEMPLATE_HEADERS + '\n' + TEMPLATE_ROWS.join('\n');

// ---------------------------------------------------------------------------
// topicKey auto-remap — old CSV keys → canonical app keys
// Teachers who export from the generated bank will have the old keys;
// this makes import work without manual editing.
// ---------------------------------------------------------------------------
const TOPIC_REMAP: Record<string, string> = {
  // Grade 5
  'gr5-computer-evolution': 'gr5-ch1-history',
  'gr5-storage-media':      'gr5-ch2-storage',
  // Grade 8
  'gr8-artificial-intelligence': 'gr8-ch1-ai',
  'gr8-technology-trends':       'gr8-ch2-tech',
  // Grade 9 CS
  'gr9-cs-cpu-architecture':       'gr9-cpu',
  'gr9-cs-data-storage':           'gr9-storage',
  'gr9-cs-os-accounts-security':   'gr9-os',
  'gr9-cs-os-file-management':     'gr9-os',
  'gr9-cs-os-interrupts':          'gr9-os',
  'gr9-cs-os-memory-management':   'gr9-os',
  'gr9-cs-os-peripherals-drivers': 'gr9-os',
  'gr9-cs-os-process-management':  'gr9-os',
  'gr9-cs-os-purpose':             'gr9-os',
  // Grade 9 DT
  'gr9-dt-defining':             'gr9dt-design-brief',
  'gr9-dt-developing':           'gr9dt-developing',
  'gr9-dt-identifying':          'gr9dt-design1',
  'gr9-dt-influences-designing': 'gr9dt-influences',
  'gr9-dt-proposing':            'gr9dt-plan',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ParsedRow = { ok: boolean; row: number; data?: Omit<Question, 'id'>; error?: string };

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set<string>(['mcq']);

export interface ParseMeta { remapped: number; }

function parseCSV(text: string): { rows: ParsedRow[]; meta: ParseMeta } {
  const rows = _parseCSVRows(text);
  const remapped = rows.filter(r => r.ok && (r as ParsedRow & { remappedKey?: boolean }).remappedKey).length;
  return { rows, meta: { remapped } };
}

function _parseCSVRows(text: string): ParsedRow[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [{ ok: false, row: 0, error: 'File is empty or has no data rows' }];

  // Strip the header row — we don't validate column names to stay lenient
  const results: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, '');
    if (!line.trim()) continue;

    // Basic CSV split — no embedded-comma support (quoted fields not handled)
    const cols = line.split(',');
    if (cols.length < 9) {
      results.push({ ok: false, row: i + 1, error: `Only ${cols.length} columns (need at least 9)` });
      continue;
    }

    const [
      id, topicKey, rawType, text,
      optA, optB, optC, optD,
      answer, explanation, difficulty, pointsStr, chapterStr, imageUrlRaw,
    ] = cols;

    const type = rawType?.trim().toLowerCase();

    if (!id?.trim() || !topicKey?.trim() || !text?.trim() || !answer?.trim()) {
      results.push({ ok: false, row: i + 1, error: 'Missing required field (id, topicKey, text or answer)' });
      continue;
    }

    // Auto-remap legacy topicKeys
    const rawTopicKey = topicKey.trim();
    const resolvedTopicKey = TOPIC_REMAP[rawTopicKey] ?? rawTopicKey;
    const wasRemapped = resolvedTopicKey !== rawTopicKey;

    if (!VALID_TYPES.has(type)) {
      results.push({
        ok: false, row: i + 1,
        error: `Type "${type}" is not supported — only "mcq" is accepted at this time`,
      });
      continue;
    }

    let options: string[] = [];
    let parsedAnswer: string = answer.trim();
    let parseError: string | null = null;

    switch (type) {
      case 'mcq': {
        options = [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);
        if (options.length < 2) {
          parseError = 'MCQ needs at least 2 options (optionA–optionD)';
          break;
        }
        // Accept: A/B/C/D, 1/2/3/4 (1-based), 0/1/2/3 (0-based)
        let idx: number;
        if (/^[a-dA-D]$/.test(parsedAnswer)) {
          idx = 'abcd'.indexOf(parsedAnswer.toLowerCase());
        } else {
          const n = parseInt(parsedAnswer, 10);
          if (isNaN(n)) {
            parseError = `MCQ answer must be A–D, 1–4, or 0–3, got "${parsedAnswer}"`;
            break;
          }
          // 1-based (1–4) → convert to 0-based
          idx = (n >= 1 && n <= 4) ? n - 1 : n;
        }
        if (idx < 0 || idx >= options.length) {
          parseError = `MCQ answer index ${idx} is out of range (0–${options.length - 1})`;
          break;
        }
        parsedAnswer = String(idx);
        break;
      }

      case 'truefalse': {
        options = ['True', 'False'];
        const norm = parsedAnswer.toLowerCase();
        if (norm.startsWith('t') || norm === '1' || norm === 'yes') {
          parsedAnswer = 'true';
        } else if (norm.startsWith('f') || norm === '0' || norm === 'no' || norm === '2') {
          parsedAnswer = 'false';
        } else {
          parseError = `True/False answer must be "True" or "False", got "${parsedAnswer}"`;
          break;
        }
        break;
      }

      case 'shortanswer':
      case 'fillinblank': {
        // No options — answer is the expected text
        options = [];
        if (!parsedAnswer) parseError = 'Short-answer/fill-in-the-blank requires a non-empty answer';
        break;
      }

      case 'matching': {
        options = [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);
        if (options.length < 2) {
          parseError = 'Matching needs at least 2 options (optionA–optionD for the left column)';
          break;
        }
        // answer is pipe-separated right-column values in matching order
        const pairs = parsedAnswer.split('|').map(s => s.trim()).filter(Boolean);
        if (pairs.length !== options.length) {
          parseError = `Matching answer must have ${options.length} pipe-separated values, got ${pairs.length}`;
          break;
        }
        parsedAnswer = pairs.join('|');
        break;
      }

      case 'ordering': {
        options = [optA, optB, optC, optD].map(o => o?.trim()).filter(Boolean);
        if (options.length < 2) {
          parseError = 'Ordering needs at least 2 options (optionA–optionD)';
          break;
        }
        // answer is pipe-separated 0-based indices representing the correct order
        const indices = parsedAnswer.split('|').map(s => parseInt(s.trim(), 10));
        if (
          indices.length !== options.length ||
          indices.some(n => isNaN(n) || n < 0 || n >= options.length)
        ) {
          parseError = `Ordering answer must be ${options.length} pipe-separated 0-based indices, e.g. "2|0|3|1"`;
          break;
        }
        // Check it's a valid permutation
        if (new Set(indices).size !== options.length) {
          parseError = 'Ordering answer indices must be a permutation with no repeats';
          break;
        }
        parsedAnswer = indices.join('|');
        break;
      }
    }

    if (parseError) {
      results.push({ ok: false, row: i + 1, error: parseError });
      continue;
    }

    const row: ParsedRow & { remappedKey?: boolean } = {
      ok: true,
      row: i + 1,
      remappedKey: wasRemapped,
      data: {
        quizId: null,
        topicKey: resolvedTopicKey,
        type: type as Question['type'],
        text: text.trim(),
        options,
        answer: parsedAnswer,
        explanation: explanation?.trim() || '',
        difficulty: (['easy', 'medium', 'hard'].includes(difficulty?.trim()) ? difficulty.trim() : 'medium') as Question['difficulty'],
        points: parseInt(pointsStr?.trim() || '1', 10) || 1,
        chapter: parseInt(chapterStr?.trim() || '1', 10) || 1,
        ...(imageUrlRaw?.trim() ? { imageUrl: imageUrlRaw.trim() } : {}),
        approvalStatus: 'pending',
        source: 'imported' as const,
        createdAt: Date.now(),
      },
    };
    results.push(row);
  }
  return results;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ImportCSVPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, ready } = useAuth();
  const { configured } = useFirebase();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [parseMeta, setParseMeta] = useState<ParseMeta | null>(null);
  const [filename, setFilename] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [autoApprove, setAutoApprove] = useState(false);

  if (!ready) return null;
  if (!configured || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="text-center">
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Sign in as a teacher to import questions.</p>
          <button onClick={() => router.push('/teacher')} className="btn-glass">Go to Teacher Login</button>
        </div>
      </div>
    );
  }

  function handleFile(file: File) {
    setFilename(file.name);
    setDone(false);
    setImportedCount(0);
    setSkippedCount(0);

    const reader = new FileReader();
    reader.onload = async e => {
      const text = e.target?.result as string;

      // Standard WOW format
      const { rows, meta } = parseCSV(text);
      setParsed(rows);
      setParseMeta(meta);
    };
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function doImport() {
    if (!parsed) return;
    const valid = parsed.filter(r => r.ok && r.data).map(r => r.data!);
    if (valid.length === 0) { toast('No valid rows to import', 'error'); return; }

    setImporting(true);
    try {
      // Collect unique topic keys in this batch
      const topicKeys = [...new Set(valid.map(q => q.topicKey))];

      // Fetch normalised texts already in the bank (approved + pending) for these topics
      const existingTexts = await getExistingQuestionTexts(topicKeys);

      // Deduplicate
      const toSave: Omit<Question, 'id'>[] = [];
      let skipped = 0;
      for (const q of valid) {
        const norm = q.text.toLowerCase().replace(/\s+/g, ' ').trim();
        if (existingTexts.has(norm)) {
          skipped++;
        } else {
          toSave.push(q);
          // Add to set so intra-batch duplicates are also caught
          existingTexts.add(norm);
        }
      }

      if (toSave.length > 0) {
        const finalSave = autoApprove
          ? toSave.map(q => ({ ...q, approvalStatus: 'approved' as const }))
          : toSave;
        await batchSaveQuestions(finalSave);
      }

      setImportedCount(toSave.length);
      setSkippedCount(skipped);
      setDone(true);

      const msg = toSave.length > 0
        ? `Imported ${toSave.length} question${toSave.length !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped)` : ''}`
        : `All ${skipped} question${skipped !== 1 ? 's' : ''} already exist — nothing imported`;
      toast(msg, toSave.length > 0 ? 'success' : 'error');
    } catch (e) {
      console.error('Import error:', e);
      toast('Import failed — check console for details', 'error');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wow-questions-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const okCount = parsed?.filter(r => r.ok).length ?? 0;
  const errCount = parsed?.filter(r => !r.ok).length ?? 0;

  return (
    <div className="min-h-screen" style={{ background: BG, color: '#f5f3ee' }}>
      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(5,8,20,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/teacher')} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronLeft size={14} /> Teacher
          </button>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>IMPORT CSV</span>
          <div style={{ width: 80 }} />
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', marginBottom: 6 }}>
            Import <span style={{ color: '#6ee7b7' }}>CSV</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
            Upload a CSV file to bulk-add questions to the question bank
          </p>
        </div>

        {/* Template download */}
        <div style={{ borderRadius: 14, padding: '16px 20px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
              <Info size={16} color="#7dd3fc" style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 8 }}>
                  Download the template for a ready-to-use MCQ example for every topic. New questions start as{' '}
                  <strong style={{ color: 'rgba(255,255,255,0.7)' }}>pending</strong> unless you enable auto-approve below.
                  Exact duplicates are skipped automatically. Legacy topicKeys (e.g. <code style={{ fontSize: 11 }}>gr5-computer-evolution</code>) are remapped automatically.
                  Add an <code style={{ fontSize: 11 }}>imageUrl</code> column (col 14) with a full <code style={{ fontSize: 11 }}>https://</code> URL to attach an image — leave it blank for text-only questions.
                </p>
                {/* Type legend — MCQ only */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: '#6ee7b7' }}>MCQ</span>: answer = option index (0-based) &nbsp;·&nbsp; set <code>type</code> column to <code>mcq</code>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={downloadTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'rgba(56,189,248,0.12)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.25)', flexShrink: 0 }}
            >
              <FileDown size={14} /> Template
            </button>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            borderRadius: 20, padding: '48px 24px',
            border: '2px dashed rgba(16,185,129,0.25)',
            background: 'rgba(16,185,129,0.04)',
            textAlign: 'center', cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
            marginBottom: 24,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.45)'; (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.04)'; }}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Upload size={36} color="rgba(110,231,183,0.6)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} />
          {filename ? (
            <p style={{ fontSize: 15, color: '#6ee7b7', fontWeight: 600 }}>{filename}</p>
          ) : (
            <>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Drop your CSV here or click to browse</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>.csv files only</p>
            </>
          )}
        </div>

        {/* Parse results */}
        {parsed && (
          <div style={{ marginBottom: 24 }}>
            {/* Summary */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, borderRadius: 12, padding: '14px 18px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color="#6ee7b7" />
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#6ee7b7' }}>{okCount}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>valid rows</p>
                </div>
              </div>
              {errCount > 0 && (
                <div style={{ flex: 1, borderRadius: 12, padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} color="#f87171" />
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#f87171' }}>{errCount}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>parse errors</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error rows */}
            {errCount > 0 && (
              <div style={{ borderRadius: 14, padding: '12px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#f87171', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-mono)' }}>PARSE ERRORS</p>
                {parsed.filter(r => !r.ok).map((r, i) => (
                  <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                    Row {r.row}: {r.error}
                  </p>
                ))}
              </div>
            )}

            {false && (
              <div style={{
                borderRadius: 10, background: 'rgba(56,189,248,0.07)',
                border: '1px solid rgba(56,189,248,0.25)', padding: '10px 14px',
                marginBottom: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={14} color="#38bdf8" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#38bdf8' }}>Wayground format detected.</strong>
                  {' '}Importing Multiple Choice, Fill-in-the-Blank, and Open-Ended questions.
                  {null}
                </span>
              </div>
            )}

            {/* topicKey remap notice */}
            {parseMeta && parseMeta.remapped > 0 && (
              <div style={{
                borderRadius: 10, background: 'rgba(251,191,36,0.07)',
                border: '1px solid rgba(251,191,36,0.25)', padding: '10px 14px',
                marginBottom: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <Info size={14} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fbbf24' }}>{parseMeta.remapped} topicKey{parseMeta.remapped !== 1 ? 's' : ''} auto-remapped</strong>
                  {' '}to canonical app keys (e.g. <code>gr9-cs-cpu-architecture</code> → <code>gr9-cpu</code>).
                  No action needed — they will import correctly.
                </span>
              </div>
            )}

            {/* Auto-approve toggle */}
            {!done && okCount > 0 && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 12, cursor: 'pointer',
                fontSize: 13, color: 'rgba(255,255,255,0.5)',
              }}>
                <span style={{
                  width: 36, height: 20, borderRadius: 10, position: 'relative',
                  background: autoApprove ? '#059669' : 'rgba(255,255,255,0.1)',
                  border: `1px solid ${autoApprove ? '#059669' : 'rgba(255,255,255,0.15)'}`,
                  transition: 'background 0.2s',
                  flexShrink: 0,
                  display: 'inline-block',
                }}>
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={e => setAutoApprove(e.target.checked)}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', top: 2, left: autoApprove ? 18 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                  }} />
                </span>
                Auto-approve questions on import
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                  (skip the approval queue — use for trusted curated content)
                </span>
              </label>
            )}

            {/* Import button / done state */}
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <CheckCircle size={40} color="#6ee7b7" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: 16, color: '#6ee7b7', fontWeight: 600, marginBottom: 6 }}>Import complete!</p>
                {importedCount > 0 && (
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                    {importedCount} question{importedCount !== 1 ? 's' : ''} added as{' '}
                    <strong style={{ color: autoApprove ? '#34d399' : 'rgba(255,255,255,0.6)' }}>
                      {autoApprove ? 'approved' : 'pending'}
                    </strong>
                  </p>
                )}
                {skippedCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                    <SkipForward size={14} color="rgba(255,255,255,0.3)" />
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                      {skippedCount} duplicate{skippedCount !== 1 ? 's' : ''} skipped
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                  <button onClick={() => router.push('/teacher/library')} className="btn-glass" style={{ fontSize: 14 }}>
                    View in Question Bank →
                  </button>
                  <button
                    onClick={() => { setParsed(null); setFilename(''); setDone(false); }}
                    style={{ fontSize: 14, padding: '10px 20px', borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                  >
                    Import another file
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={doImport}
                disabled={importing || okCount === 0}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 14, fontSize: 16, fontWeight: 700,
                  cursor: okCount === 0 ? 'not-allowed' : 'pointer',
                  background: okCount === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: okCount === 0 ? 'rgba(255,255,255,0.3)' : '#fff',
                  border: 'none',
                  boxShadow: okCount > 0 ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                  transition: 'opacity 0.15s',
                  opacity: importing ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {importing ? (
                  <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking for duplicates &amp; importing…</>
                ) : (
                  <><Upload size={16} /> Import {okCount} Question{okCount !== 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
