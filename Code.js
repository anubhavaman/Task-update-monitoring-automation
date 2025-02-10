// Configuration Constants
const CONFIG = {
  DRIVE_IMAGE_FOLDER_ID: '15gB',
  DRIVE_PDF_FOLDER_ID: '1VIm9',
  ADMIN_EMAIL: 'anubhavaman@ghcl.co.in',
  REVIEWER_EMAIL: 'anubhav.aman.92@gmail.com'
};

// Main Web App Functions
function doGet(e) {
  if (e.parameter.page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('Admin Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (e.parameter.page === 'reviewer') {
    return HtmlService.createHtmlOutputFromFile('Reviewer')
      .setTitle('Reviewer Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } else if (e.parameter.page === 'completed') {
    return HtmlService.createHtmlOutputFromFile('Completed')
      .setTitle('Completed Submissions')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Track Job Selection Form')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Spreadsheet Management Functions
function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CivilWorkKachchh');
  if (!sheet) {
    sheet = ss.insertSheet('CivilWorkKachchh');
  }
  sheet.clear();
  const headers = [
    'Contractor Name', 'Email', 'Date', 'Job', 'Action',
    'Measurements', 'Remarks', 'Image URL', 'PDF URL', 
    'Reviewer Action', 'Reviewer Comment', 'Status' // Added Reviewer Comment column
  ];
  // Add 10 additional image columns (can be extended if needed)
  for (let i = 2; i <= 10; i++) {
    headers.push(`Image URL${i}`);
  }
    headers.push('Timestamp');
  // Add TimeStamp column at the end
  headers.push('Unique ID');
  sheet.appendRow(headers);
  Logger.log('Spreadsheet initialized.');
}

// Form Submission Functions
function submitFormData(data) {
  try {
    if (!data || !data.contractorName || !data.empEmail || !data.sectionsData || !Array.isArray(data.sectionsData)) {
      throw new Error('Invalid form data');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CivilWorkKachchh');
    const imageFolder = DriveApp.getFolderById(CONFIG.DRIVE_IMAGE_FOLDER_ID);

    const updatedSectionsData = [];

    // Loop through sectionsData and process each section
    data.sectionsData.forEach(section => {
      let imageUrls = [];
      if (section.images && Array.isArray(section.images)) {
        imageUrls = section.images.map(image => {
          const imageBlob = Utilities.newBlob(
            Utilities.base64Decode(image.data),
            image.type,
            image.name
          );
          const imageFile = imageFolder.createFile(imageBlob);
          return imageFile.getUrl();
        });
      }

      // Generate timestamp
      const timestamp = new Date();

      // Generate unique ID based on timestamp
      const uniqueId = generateUniqueId(timestamp);
      section.uniqueId = uniqueId;

      // Prepare the row data
      const rowData = [
        data.contractorName,
        data.empEmail,
        section.date,
        section.job,
        section.action,
        section.measurements || '',
        section.remarks || '',
        imageUrls[0] || '', // Store the first image URL directly
        '', // PDF URL will be empty initially
        'Pending', // Initial reviewer action
        '',
        'Pending', // Initial status
        
      ];

      // Add additional image URLs
      for (let i = 1; i < 10; i++) {
        rowData.push(imageUrls[i] || '');
      }

      // Add timestamp
      rowData.push(timestamp);

      // Add unique ID
      rowData.push(uniqueId);

      // Append the row to the spreadsheet
      sheet.appendRow(rowData);

      // Send notification to the reviewer for each section, now including uniqueId
      // sendReviewerNotification(data.contractorName, section.job, section.action, uniqueId);
      sendReviewerNotification(data.contractorName, data.empEmail, section.date, section.job, section.action,uniqueId, section.measurements, section.remarks);

        updatedSectionsData.push({
        ...section,
        uniqueId: uniqueId
      });

    //       sendUserConfirmation(data);
    });


    // Send confirmation email to the user
    sendUserConfirmation(data);

    return 'Data submitted successfully! Waiting for reviewer approval.';
  } catch (error) {
    Logger.log('Error in submitFormData: ' + error.message);
    return 'Failed to submit data: ' + error.message;
  }
}

// Utility function to generate a unique ID based on timestamp
function generateUniqueId(timestamp) {
  // Format timestamp with milliseconds
  const formattedTimestamp = Utilities.formatDate(
    timestamp, 
    Session.getScriptTimeZone(), 
    "yyyyMMddHHmmssSSS"
  );
  return `${formattedTimestamp}`;
}


// Get Pending Submissions for Reviewer
function getPendingReviewerSubmissions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CivilWorkKachchh');
    const data = sheet.getDataRange().getValues();
    const submissions = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[9] === 'Pending') { // Check Reviewer Action column
      const imageUrls = [];
        // Collect all image URLs starting from the primary image URL
        for (let j = 7; j < row.length - 2; j++) {
          if (j === 8 || j === 9 || j === 10 || j === 11) {
            continue;
          }
          if (row[j] && typeof row[j] === 'string' && row[j].trim() !== '') {
            imageUrls.push(row[j]);
          }
        }

        submissions.push({
          rowIndex: i + 1,
          contractorName: row[0],
          email: row[1],
          date: formatDateForDisplay(row[2]),
          job: row[3],
          action: row[4],
          measurements: row[5],
          remarks: row[6],
          imageUrls: imageUrls,
          reviewerAction: row[9],
          reviewerComment: row[10],
          status: row[11],
          uniqueId: row[22]
        });
      }
    }
    return submissions;
  } catch (error) {
    Logger.log('Error in getPendingReviewerSubmissions: ' + error.message);
    throw error;
  }
}

// Get Pending Submissions for Admin
function getPendingAdminSubmissions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CivilWorkKachchh');
    const data = sheet.getDataRange().getValues();
    const submissions = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[9] === 'Approved' && row[11] === 'Pending') { // Check Reviewer Action and Status columns

      const imageUrls = [];
      for (let j = 7; j < row.length - 2; j++) {
        if (j === 8 || j === 9 || j === 10 || j === 11) {
            continue;
          }
          if (row[j] && typeof row[j] === 'string' && row[j].trim() !== '') {
            imageUrls.push(row[j]);
          }
        }
        submissions.push({
          rowIndex: i + 1,
          contractorName: row[0],
          email: row[1],
          date: formatDateForDisplay(row[2]),
          job: row[3],
          action: row[4],
          measurements: row[5],
          remarks: row[6],
          imageUrls: imageUrls,
          reviewerAction: row[9],
          status: row[11]
        });
      }
    }
    return submissions;
  } catch (error) {
    Logger.log('Error in getPendingAdminSubmissions: ' + error.message);
    throw error;
  }
}


// Update Reviewer Action
function updateReviewerAction(rowIndex, action, comment) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('CivilWorkKachchh');
  
  const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const userEmail = rowData[1];  // Email is in column 2 (index 1)
  const contractorName = rowData[0]; // Contractor Name is in column 1 (index 0)
  const job = rowData[3]; // Job is in column 4 (index 3)
  const actionType = rowData[4]; // Action is in column 5 (index 4)

  const date = rowData[2];
  const measurements = rowData[5]; // Adjusted for column 6
  const remarks = rowData[6]; 

  const uniqueId = rowData[rowData.length - 1];

  sheet.getRange(rowIndex, 10).setValue(action); // Update Reviewer Action column
  sheet.getRange(rowIndex, 11).setValue(comment); // Update Reviewer Comment column

  // Send Admin notification and status update based on Reviewer Action
  if (action === 'Approved') {
    sendAdminNotification(contractorName,  userEmail,date, job, actionType, measurements,remarks,uniqueId); // Send Admin Notification with job and action
    sendStatusNotification(userEmail, 'approved by reviewer', rowIndex,uniqueId); // Send Status Notification to User
  } else if (action === 'Rejected') {
    sheet.getRange(rowIndex, 12).setValue('Rejected'); // Update Status column to 'Rejected'
    sendStatusNotification(userEmail, 'rejected by reviewer', rowIndex,uniqueId); // Send Status Notification to User
  }

  return 'Reviewer action updated successfully';
}


// Update Admin Status
function updateAdminStatus(rowIndex, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('CivilWorkKachchh');

  if (!rowIndex || rowIndex <= 0 || rowIndex > sheet.getLastRow()) {
    Logger.log('Invalid row index: ' + rowIndex);
    throw new Error('Invalid row index');
  }
  
  const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const userEmail = rowData[1];
  const uniqueId = rowData[rowData.length - 1];
  
  sheet.getRange(rowIndex, 12).setValue(status); // Update Status column

  if (status === 'Approved') {
    const pdfFolder = DriveApp.getFolderById(CONFIG.DRIVE_PDF_FOLDER_ID);
    const pdfFile = createPDF({
      contractorName: rowData[0],
      empEmail: rowData[1]
    }, {
      date: rowData[2],
      job: rowData[3],
      action: rowData[4],
      measurements: rowData[5],
      remarks: rowData[6],
      rowIndex: rowIndex
    }, rowData[7], pdfFolder);

    sheet.getRange(rowIndex, 9).setValue(pdfFile.getUrl());
    sendStatusNotification(userEmail, 'approved by admin', rowIndex,uniqueId, pdfFile.getUrl());
  } else if (status === 'Rejected') {
    sendStatusNotification(userEmail, 'rejected by admin', rowIndex,uniqueId);
  }

  return 'Admin status updated successfully';
}

function getNotPendingSubmissions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CivilWorkKachchh');
    const data = sheet.getDataRange().getValues();
    const submissions = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[9] !== 'Pending' && row[11] !== 'Pending') { // Check Reviewer Action and Status columns

      const imageUrls = [];
      for (let j = 7; j < row.length - 2; j++) {
        if (j === 8 || j === 9 || j === 10 || j === 11) {
            continue;
          }
          if (row[j] && typeof row[j] === 'string' && row[j].trim() !== '') {
            imageUrls.push(row[j]);
          }
        }
        submissions.push({
          rowIndex: i + 1,
          contractorName: row[0],
          email: row[1],
          date: formatDateForDisplay(row[2]),
          job: row[3],
          action: row[4],
          measurements: row[5],
          remarks: row[6],
          imageUrls: imageUrls,
          reviewerAction: row[9],
          status: row[11]
        });
      }
    }
    return submissions;
  } catch (error) {
    Logger.log('Error in getNotPendingSubmissions: ' + error.message);
    throw error;
  }
}


function sendReviewerNotification(contractorName,empEmail, date, job, action,uniqueId, measurements,remarks) {
  try {
    const subject = `Pending Review: ${uniqueId}_${job}_${contractorName}_${action}`;
    const body = `
      A new submission from ${contractorName} is pending for your review.
      Unique ID: ${uniqueId}
      Contractor Name: ${contractorName}
      Contractor Eamil: ${empEmail}
      Date: ${date}
      Job: ${job}
      Action: ${action}
      Measurements: ${measurements}
      Remarks: ${remarks}
      
      Please visit the reviewer dashboard to review the submission.
      
      Reviewer Dashboard URL: ${ScriptApp.getService().getUrl()}?page=reviewer
      
      Best regards,
      System
    `;
    GmailApp.sendEmail(CONFIG.REVIEWER_EMAIL, subject, body);
    Logger.log(`Email sent to reviewer with subject: ${subject}`);
  } catch (error) {
    Logger.log(`Error in sendReviewerNotification: ${error.message}`);
    throw new Error(`Failed to send reviewer notification: ${error.message}`);
  }
}




function sendAdminNotification(contractorName, empEmail,date, job, action, measurements, remarks,uniqueId) {
  const subject = `Pending Admin Review: ${uniqueId}_${job}_${contractorName}_${action}`;
  const body = `
    A new job submission from ${contractorName} is pending for your review.
    Unique ID: ${uniqueId}
     Contractor Name: ${contractorName}
      Contractor Eamil: ${empEmail}
      Date: ${date}
      Job: ${job}
      Action: ${action}
      Measurements: ${measurements}
      Remarks: ${remarks}
    Please visit the admin dashboard to review the submission.
    
    Admin Dashboard URL: ${ScriptApp.getService().getUrl()}?page=admin
    
    Best regards,
    System
  `;
  
  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
}


function sendUserConfirmation(data) {
    const subject = `Job Submission Confirmation`;
    let body = `Dear ${data.contractorName},\n\n`;
    body += 'Thank you for your job submission. Here are the details of your submission(s):\n\n';
    
    data.sectionsData.forEach((section, index) => {
      body += `Submission ${index + 1}:\n`;
      body += `- Date: ${formatDateForDisplay(section.date)}\n`;
      body += `- Unique ID: ${section.uniqueId}\n`;
      body += `- Job: ${section.job}\n`;
      body += `- Action: ${section.action}\n`;
      body += `- Measurements: ${section.measurements || 'N/A'}\n`;
      body += `- Remarks: ${section.remarks || 'N/A'}\n\n`;
    });
    
    body += 'Your submission is pending reviewer approval. You will receive another email once it has been reviewed.\n\n';
    body += 'Best regards,\nThe Team';
    
    GmailApp.sendEmail(data.empEmail, subject, body);
  }

function sendStatusNotification(userEmail, status, rowIndex,uniqueId, pdfUrl = '') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CivilWorkKachchh');
    const rowData = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  
    const subject = `Job Submission ${status.charAt(0).toUpperCase() + status.slice(1)} - Unique ID: ${uniqueId}`;
    let body = `Dear ${rowData[0]},\n\n`;
  
    if (status === 'approved by admin') {
      body += `Your job submission for "${rowData[3]}" on ${formatDateForDisplay(rowData[2])} has been approved by the admin.\n`;
      body += `Unique ID: ${uniqueId}\n`;
      body += `You can access your PDF here: ${pdfUrl}\n\n`;
    } else if (status === 'approved by reviewer') {
      body += `Your job submission for "${rowData[3]}" on ${formatDateForDisplay(rowData[2])} has been approved by the reviewer.\n`;
      body += `Unique ID: ${uniqueId}\n`;
      body += `Your submission will now be reviewed by the admin.\n\n`;
    } else if (status.includes('rejected')) {
      body += `Your job submission for "${rowData[3]}" on ${formatDateForDisplay(rowData[2])} has been ${status}.\n`;
      body += `Here are the details of your submission:\n`;
      body += `Unique ID: ${uniqueId}\n`;
      body += `- ContractorName: ${rowData[0]}\n`;
      body += `- Email: ${rowData[1]}\n`;
      body += `- Date: ${formatDateForDisplay(rowData[2])}\n`;
      body += `- Job: ${rowData[3]}\n`;
      body += `- Action: ${rowData[4]}\n`;
      body += `- Measurements: ${rowData[5]}\n`;
      body += `- Remarks: ${rowData[6]}\n`;
      if (rowData[10]) { // Reviewer comment column
        body += `\nReviewer Comment: ${rowData[10]}\n`;
      }
  
    }
  
    body += 'Best regards';
    
    GmailApp.sendEmail(userEmail, subject, body);
  }


// PDF Generation Functions
function createPDF(formData, sectionData, imageUrls, pdfFolder) {
  try {
    const formattedDate = formatDate(sectionData.date);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('CivilWorkKachchh');
    const rowData = sheet.getRange(sectionData.rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    const uniqueId = rowData[rowData.length - 1]; 

        const sanitizedFileName = `${uniqueId}_${formData.contractorName}_${formattedDate}_${sectionData.job}_${sectionData.action}`
                                .replace(/[^a-zA-Z0-9_]/g, '_');
    const pdfName = `${sanitizedFileName}.pdf`;

    const doc = DocumentApp.create('TemporaryDoc');
    const body = doc.getBody();
    body.clear();

    // Set page margins for better image fitting
    body.setMarginLeft(36); // 0.5 inch in points
    body.setMarginRight(36);

    const titleText = `Work update on ${sectionData.job} by ${formData.contractorName} as on ${formattedDate}`;
    const title = body.appendParagraph(titleText);
    title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendHorizontalRule();

    // Adding section headers and details
    addSectionHeader(body, 'Job Information');
    addKeyValue(body, 'UniqueID', uniqueId);
    addKeyValue(body, 'Contractor Name', formData.contractorName);
    addKeyValue(body, 'Email', formData.empEmail);

    addSectionHeader(body, 'Job Details');
    addKeyValue(body, 'Date', formatDateForDisplay(sectionData.date));
    addKeyValue(body, 'Job', sectionData.job);
    addKeyValue(body, 'Action', sectionData.action);

    addSectionHeader(body, 'Measurements and Remarks');
    addKeyValue(body, 'Measurements', sectionData.measurements || 'N/A');
    addKeyValue(body, 'Remarks', sectionData.remarks || 'N/A');

    // Handle image processing
    if (sectionData.rowIndex) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName('CivilWorkKachchh');
      const lastCol = sheet.getLastColumn();
      const rowData = sheet.getRange(sectionData.rowIndex, 1, 1, lastCol).getValues()[0];
      
      addSectionHeader(body, 'Uploaded Images');
      let imageCount = 0;

      for (let i = 7; i < rowData.length - 2; i++) {
        // Skip specific columns
        if (i >= 8 && i <= 11) {
          continue;
        }

        const imageUrl = rowData[i];
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
          imageCount++;
          
          try {
            // Add URL as text with center alignment
            const urlParagraph = body.appendParagraph(`Image ${imageCount} URL: ${imageUrl}`);
            urlParagraph.setLinkUrl(imageUrl);
            urlParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);

            let imageBlob;
            if (imageUrl.includes('drive.google.com')) {
              const fileId = imageUrl.match(/[-\w]{25,}/);
              if (fileId) {
                const file = DriveApp.getFileById(fileId[0]);
                imageBlob = file.getBlob();
              }
            } else {
              const options = {
                muteHttpExceptions: true,
                followRedirects: true
              };
              const response = UrlFetchApp.fetch(imageUrl, options);
              if (response.getResponseCode() === 200) {
                imageBlob = response.getBlob();
              }
            }

            if (imageBlob) {
              // Create a paragraph for the image and center it
              const imageParagraph = body.appendParagraph('');
              imageParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
              
              // Insert image
              const inline = imageParagraph.appendInlineImage(imageBlob);
              
              // Set image dimensions 
              const standardWidth = 600;  
              const standardHeight = 450; 
              
              inline.setWidth(standardWidth)
                   .setHeight(standardHeight);
              
              // Add spacing after image
              body.appendParagraph('')
                 .setSpacingAfter(20)
                 .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            } else {
              const errorParagraph = body.appendParagraph('Image not accessible');
              errorParagraph.setFontFamily('Arial');
              errorParagraph.setFontSize(10);
              errorParagraph.setForegroundColor('#FF0000');
              errorParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
            }
          } catch (imageError) {
            Logger.log(`Error processing image ${imageCount}: ${imageError.message}`);
            const errorNote = body.appendParagraph(`Note: Image ${imageCount} could not be loaded - ${imageError.message}`);
            errorNote.setFontFamily('Arial');
            errorNote.setFontSize(10);
            errorNote.setForegroundColor('#FF0000');
            errorNote.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          }
        }
      }

      // Handle case when no images are found
      if (imageCount === 0) {
        const noImagesMessage = body.appendParagraph('No images uploaded');
        noImagesMessage.setFontFamily('Arial');
        noImagesMessage.setFontSize(10);
        noImagesMessage.setForegroundColor('#FF0000');
        noImagesMessage.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }

    doc.saveAndClose();
    const pdfBlob = doc.getAs('application/pdf').setName(pdfName);
    const pdfFile = pdfFolder.createFile(pdfBlob);

    DriveApp.getFileById(doc.getId()).setTrashed(true);
    return pdfFile;

  } catch (error) {
    Logger.log('Error in createPDF: ' + error.message);
    throw error;
  }
}
// Utility Functions
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${month}${year}`;
  } catch (e) {
    return dateString;
  }
}

function formatDateForDisplay(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dateNum = date.getDate();
    const year = date.getFullYear();
    
    return `${day} ${month} ${dateNum} ${year}`;
  } catch (e) {
    return dateString;
  }
}

function addSectionHeader(body, text) {
  const header = body.appendParagraph(text);
  header.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  header.setBold(true);
  header.setSpacingBefore(10);
  header.setSpacingAfter(5);
}

function addKeyValue(body, key, value) {
  const paragraph = body.appendParagraph(`${key}: ${value}`);
  paragraph.setBold(false);
  paragraph.setSpacingAfter(5);
}