# Member Profile Document Management - Integration Guide

## Overview
This enhancement adds a **Documents Management section** to the member profile, allowing admins to upload, organize, and track documents for each member (reports, scans, images, PDFs).

---

## 📋 What Gets Added

### New Features:
✅ **Documents Tab** - Visible only to admins  
✅ **Upload Interface** - Modal form for adding documents  
✅ **Document Card View** - Visual grid display of documents  
✅ **Quick Actions** - Download and delete buttons  
✅ **Metadata** - Document name, type, summary, tags, upload date  
✅ **File Support** - PDF, images (JPG/PNG), Word docs, text files  

---

## 🚀 Step-by-Step Integration

### Step 1: Prepare Your Data Structure

Add a `documents` array to each user object in your database. If it doesn't exist, the app creates it automatically.

**Example user object:**
```javascript
{
  id: "STU-001",
  name: "John Doe",
  category: "STUDENT",
  cls: "Form 4A",
  documents: [
    {
      id: "doc-1705321200000-abc123",
      name: "Behavior Report",
      type: "behavior",
      summary: "Student was disrupting class on January 15",
      dateUploaded: "2024-01-15",
      uploadedBy: "admin-id",
      fileSize: "2.5 MB",
      mimeType: "application/pdf",
      tags: ["warning", "January"],
      base64Data: "data:application/pdf;base64,JVBERi0xLjQKJeLj..." // Base64 encoded file
    }
  ]
}
```

---

### Step 2: Locate and Replace pageMemberProfile()

Find line **9823** in your index__9_.html file (the `function pageMemberProfile(){` declaration).

**Replace the entire function** (lines 9823-9921) with the enhanced version from `member-profile-documents-enhancement.js`.

The key changes:
- Added documents to the tab list
- Added new `else if(activeTab==='documents')` block
- Calls `renderMemberDocumentsTab()` for document display

---

### Step 3: Add the New Functions

Add all the new functions from `member-profile-documents-enhancement.js` after the `pageMemberProfile()` function:

1. **`renderMemberDocumentsTab()`** - Renders the documents tab UI
2. **`openMemberDocumentUploadModal()`** - Opens upload form modal
3. **`saveMemberDocument()`** - Handles file upload and storage
4. **`downloadMemberDocument()`** - Downloads stored document
5. **`deleteMemberDocument()`** - Removes document from member
6. **`showModal()`** - Helper to display modals
7. **`closeModal()`** - Helper to close modals

---

### Step 4: Verify Your App Has Required Helpers

Make sure your app has these existing functions (they should already exist):

```javascript
- isAdmin()           // Check if user is admin
- toast()             // Show toast notifications
- esc()               // HTML escape function
- fmtDate()           // Format dates
- saveDB()            // Save database
- render()            // Re-render page
- closeModal()        // Close modal (may need adjusting)
- $('#id')            // jQuery-like selector
```

---

## 📌 Usage Instructions

### For Admins:

1. **Go to a Member's Profile**
   - Navigate to Users → Click "Profile" on any member

2. **Open the Documents Tab**
   - Click the "Documents (0)" tab

3. **Upload a Document**
   - Click "➕ Add Document" button
   - Fill in:
     - Document Type (Behavior, Academic, Medical, Disciplinary, Other)
     - Document Name (e.g., "Behavior Report - Jan 15")
     - Summary (optional - brief description)
     - File (PDF, JPG, PNG, DOC, DOCX, TXT - max 10MB)
     - Tags (optional - comma-separated, e.g., "warning, urgent, 2024")

4. **View Documents**
   - Documents appear as cards with icon, name, type, summary
   - Upload date and file size shown at bottom
   - Tags displayed as badges

5. **Download/Delete**
   - ⬇️ Download button - saves file to downloads folder
   - 🗑️ Delete button - removes from member's file

---

## 🎨 Document Types

| Type | Icon | Use Case |
|------|------|----------|
| `behavior` | 🎭 | Behavior reports, incident reports |
| `academic` | 📚 | Academic progress, report cards, test results |
| `medical` | ⚕️ | Medical forms, health records, doctor notes |
| `disciplinary` | ⚠️ | Warnings, suspensions, disciplinary notices |
| `other` | 📄 | Scanned documents, permission forms, etc. |

---

## 🔧 Customization Options

### Change Max File Size
In `saveMemberDocument()`, change this line:
```javascript
if(file.size > 10 * 1024 * 1024) { // Currently 10MB
```

### Change Accepted File Types
In `openMemberDocumentUploadModal()`, modify:
```javascript
<input id="docFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt">
```

### Change Grid Layout
In `renderMemberDocumentsTab()`, adjust grid columns:
```javascript
// From:
grid-template-columns:repeat(auto-fill,minmax(280px,1fr));

// To wider cards:
grid-template-columns:repeat(auto-fill,minmax(350px,1fr));
```

### Add More Document Types
In `openMemberDocumentUploadModal()`, add to docTypes array:
```javascript
const docTypes = [
  {value:'behavior', label:'🎭 Behavior Report'},
  {value:'your-type', label:'🎯 Your Type'}, // Add here
];
```

---

## 💾 Data Storage

Documents are stored as **Base64-encoded data** directly in the user object. This means:

✅ **Pros:**
- Everything self-contained in the database
- No external file storage needed
- Works offline
- Data exports with member profile

⚠️ **Considerations:**
- Base64 increases data size (~33% larger than binary)
- Large files may slow down database operations
- Database file size will grow with documents

### If You Want External File Storage Instead:

Replace `base64Data` with a URL/path:
```javascript
// Option 1: Store file path
filePath: "/uploads/documents/doc-123.pdf"

// Option 2: Store external URL
fileUrl: "https://your-storage.com/doc-123.pdf"

// Then update download function to redirect to URL
```

---

## 🔐 Security Notes

- **Admin-Only**: Documents tab only visible to admins
- **No validation**: Currently accepts files at face value
- **Consider adding**:
  - File type validation (check magic bytes, not just extension)
  - Virus scanning for production
  - Access logging (who viewed/downloaded what)
  - Encryption for sensitive data

---

## 🐛 Troubleshooting

### Documents don't appear?
1. Ensure you're logged in as admin
2. Check browser console for errors
3. Verify `DB.users` has `documents` array

### Upload fails?
1. Check file size (max 10MB)
2. Check file type is accepted
3. Check browser storage quota
4. Look for errors in console

### Downloads not working?
1. Browser may block downloads from data URLs
2. Try a different browser
3. Check if file is actually stored (open DevTools → Application → LocalStorage)

### Modal doesn't close?
1. Ensure `closeModal()` exists in your app
2. Check for JavaScript errors in console
3. May need to adjust based on your modal implementation

---

## 📊 Example: What Gets Stored

```json
{
  "id": "doc-1705321200000-abc123",
  "name": "Classroom Disruption Incident",
  "type": "behavior",
  "summary": "John was using phone during lesson, warned twice before removal from class",
  "dateUploaded": "2024-01-15",
  "uploadedBy": "admin-mary",
  "fileSize": "1.2 MB",
  "mimeType": "application/pdf",
  "tags": ["warning", "urgent", "January"],
  "base64Data": "data:application/pdf;base64,JVBERi0xLjQKJeLj..."
}
```

---

## 🎯 Next Steps

1. **Integrate the code** into your HTML file
2. **Test** with a sample member
3. **Customize** document types as needed
4. **Consider backup strategy** for database with embedded documents
5. **Add access logging** if handling sensitive info

---

## 📝 Notes

- Documents are stored in each user's `documents` array
- Maximum 10MB per file (configurable)
- File data encoded as Base64 (URL-compatible)
- Admin-only feature for privacy
- No automatic cleanup or archiving

---

## Need Help?

If you have issues or want to modify features:
- Check browser console (F12 → Console tab) for errors
- Verify all helper functions exist in your app
- Test with different file types
- Check database structure matches expected format
