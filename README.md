# Task-update-monitoring-automation


A Google Apps Script-based web application for tracking and managing civil work jobs in Kachchh. This system provides a streamlined workflow for contractors to submit job details, reviewers to assess submissions, and administrators to provide final approval.

## Features

### Form Submission
- Contractors can submit job details including:
  - Multiple job sections per submission
  - Date and job type specification
  - Detailed measurements and remarks
  - Multiple image uploads (up to 10 images per submission)
- Automatic unique ID generation for each submission
- Email confirmation sent to contractors upon submission

### Review Process
- Two-tier review system:
  1. Initial review by designated reviewer
  2. Final approval by administrator
- Email notifications at each stage
- Ability to add comments for rejected submissions
- Automatic status updates and tracking

### Document Generation
- Automatic PDF generation for approved submissions
- Includes all submission details and images
- Professional formatting with sections for:
  - Job Information
  - Job Details
  - Measurements and Remarks
  - Uploaded Images

### Dashboard Access
- Different interfaces for different user roles:
  - Contractor submission form
  - Reviewer dashboard
  - Admin dashboard
  - Completed submissions view

### Email Notifications
- Automated notifications for:
  - New submission confirmations
  - Review requests
  - Admin approval requests
  - Status updates
  - Final approvals with PDF links

## Technical Details

### Prerequisites
- Google Workspace account
- Appropriate permissions for Google Drive and Gmail
- Google Apps Script editor access

### Configuration
The system requires initial setup of the following:
- Google Drive folders for:
  - Image storage
  - PDF storage
- Spreadsheet for data storage
- Email addresses for:
  - Admin notifications
  - Reviewer notifications

### Installation

1. Create a new Google Apps Script project
2. Copy the provided code into the script editor
3. Update the configuration constants:
```
const CONFIG = {
  DRIVE_IMAGE_FOLDER_ID: 'your_image_folder_id',
  DRIVE_PDF_FOLDER_ID: 'your_pdf_folder_id',
  ADMIN_EMAIL: 'admin@example.com',
  REVIEWER_EMAIL: 'reviewer@example.com'
};
```
4. Run the `initializeSheet` function to set up the required spreadsheet
5. Deploy the web app with appropriate access permissions

### Security Features
- XFrame options configured for secure embedding
- Input validation for form submissions
- Secure file handling for images and PDFs
- Role-based access control

## Usage

### For Contractors
1. Access the main submission form
2. Fill in contractor details
3. Add one or more job sections with relevant details
4. Upload images for documentation
5. Submit the form and receive confirmation email

### For Reviewers
1. Access the reviewer dashboard
2. View pending submissions
3. Review submission details and images
4. Approve or reject with comments
5. System automatically notifies relevant parties

### For Administrators
1. Access the admin dashboard
2. Review approved submissions
3. Make final approval or rejection
4. System generates PDF for approved submissions
5. Automatic notification sent to contractor
