# Clinical Decision Support Tool

## Overview
A web-based clinical decision support tool that helps doctors analyze treatment options by providing AI-powered insights based on patient records and medical case studies, while maintaining strict boundaries around treatment recommendations.

## Authentication & Access
- Secure doctor authentication system
- Role-based access controls for patient data
- PHI compliance with encryption and access logging

## Patient Management
- Patient list view showing all patients accessible to the authenticated doctor
- Patient search and filtering capabilities
- Individual patient dashboard as the main workspace
- **Add New Patient functionality** with comprehensive patient registration form
- **Delete Patient functionality** with confirmation dialog to prevent accidental deletion
- **Edit Patient functionality** with modal or inline form for updating patient details

## Add New Patient Feature
- **Add Patient Form** with the following fields:
  - Patient Name (required)
  - Patient ID (required, must be unique)
  - Age (required)
  - Sex (required)
  - Occupation (optional)
  - Allergies (optional, multi-line text field)
- Form validation to ensure required fields are completed
- Patient ID uniqueness validation
- **Immediate Patient Availability**: New patients appear instantly in the patient list after successful creation
- **Seamless Navigation**: After adding a patient, users can immediately access the new patient's dashboard
- Form reset functionality after successful patient creation
- Error handling for duplicate patient IDs and validation failures

## Edit Patient Feature
- **Edit Patient Modal/Form** accessible from patient list and/or patient dashboard
- Editable fields matching the Add Patient form:
  - Patient Name (required)
  - Patient ID (required, must be unique, excluding current patient)
  - Age (required)
  - Sex (required)
  - Occupation (optional)
  - Allergies (optional, multi-line text field)
- Form validation to ensure required fields are completed
- Patient ID uniqueness validation (excluding the current patient being edited)
- **Immediate UI Updates**: Changes reflect instantly in patient list and dashboard after successful update
- Success and error notifications for edit operations
- Form pre-population with existing patient data
- Cancel functionality to discard changes

## Delete Patient Feature
- **Delete Patient functionality** accessible from patient list and/or patient dashboard
- **Confirmation Dialog** to prevent accidental deletion with clear warning message
- **Immediate UI Updates**: Patient removal from list and navigation handling after successful deletion
- Success and error notifications for delete operations
- Proper handling of active patient dashboard when patient is deleted

## Demo Patient Data Management
- **Dedicated Demo Data File**: Backend maintains a dedicated file containing demo patient data (including Michael Chen and any future demo patients)
- **Persistent Demo Data**: Demo patient data is always loaded and retained on each deployment, even if sessions expire
- **Persistent CRUD Operations**: All patient CRUD operations (add, edit, delete) update both in-memory state and the persistent demo data file
- **No Data Overwrite**: Backend logic prevents overwriting or clearing the demo patient data file on redeploy
- **Cross-Deployment Persistence**: Demo data remains consistent across application redeployments and updates

## Patient Dashboard Components

### Current Status
- Display current patient vitals and key health indicators
- Real-time status overview

### Summary Tab
- **Summary Tab** accessible alongside existing dashboard tabs (Vitals, Medical Records, etc.)
- **Reason for Visit** field - editable text field for doctors to input and update the primary reason for the patient's current visit
- **Patient Report** field - editable multi-line text field for doctors to input and update comprehensive patient assessment and notes
- **Edit Summary functionality** allowing doctors to modify both Reason for Visit and Patient Report fields
- **Save Summary functionality** with immediate persistence of changes to backend
- **Display Summary data** showing current saved values for both fields
- Success and error notifications for summary save operations
- Form validation and error handling for summary updates

### Medical Records (EMR)
- Searchable historical medical records
- Integration with existing EMR systems via FHIR APIs
- Chronological view of patient medical history
- **Edit Medical Record functionality** with modal or inline form for updating existing medical record entries
- **Delete Medical Record functionality** with confirmation dialog to prevent accidental deletion
- **Medical Record Management UI Controls** including edit and delete buttons for each medical record entry
- **Immediate UI Updates** for medical record changes with real-time reflection in the medical records list
- Success and error notifications for medical record edit and delete operations
- Form validation and error handling for medical record updates
- **White Text Styling for Details**: Medical record details text displayed in white color for improved readability and contrast in both light and dark modes

### Treatment & Outcome History
- Timeline view of all treatments and their recorded outcomes
- Searchable log of past interventions and results
- Visual representation of treatment progression
- **Edit Treatment functionality** with modal or inline form for updating existing treatment entries
- **Delete Treatment functionality** with confirmation dialog to prevent accidental deletion
- **Automatic Outcome Deletion**: When a treatment is deleted, all associated outcomes for that treatment are automatically deleted
- **Treatment Management UI Controls** including edit and delete buttons for each treatment entry
- **Edit Outcome functionality** with modal or inline form for updating existing outcome entries
- **Delete Outcome functionality** with confirmation dialog to prevent accidental deletion
- **Outcome Management UI Controls** including edit and delete buttons for each outcome entry
- **Immediate UI Updates** for treatment and outcome changes with real-time reflection in the timeline view
- Success and error notifications for treatment and outcome edit and delete operations
- Form validation and error handling for treatment and outcome updates
- **Cascade Delete Confirmation**: Confirmation dialog for treatment deletion clearly indicates that associated outcomes will also be deleted
- **White Text Styling for Method**: Treatment method text displayed in white color for better contrast and accessibility in both light and dark modes

### AI Treatment Analysis Interface
- Chat-style interface for querying treatment options and analysis
- **Disclosure Notice**: Display disclaimer below the "AI Treatment Analysis" title stating that analysis is provided by AI for informational purposes only, combines patient historical records with scientific literature, does not make treatment recommendations, and all treatment decisions require professional medical judgment
- OpenAI-powered web search and analysis of proposed treatments
- Combines patient historical records with real scientific journals and case studies
- Returns probabilistic outcomes and evidence-based insights to doctors with reference links and citations
- Real-time analysis functionality with clear status indicators
- Enhanced error handling with detailed, actionable feedback for users
- Specific error messages for different failure types (authentication, network, service unavailable)
- Retry mechanisms with user-friendly retry buttons for failed operations
- Graceful degradation when AI services are temporarily unavailable with clear explanations
- **Chat History Management**: Clear chat history functionality with confirmation prompt to prevent accidental deletion
- **Clean AI Response Display**: Only displays the content field from OpenAI API responses, filtering out all metadata and removing the "AI Treatment Analysis" title from response content
- **Markdown Formatting Removal**: All Markdown bold/italic markers (such as "**" or "__") are stripped from OpenAI's content field before displaying to the user

## Treatment Analysis Workflow

### Treatment Input Methods
1. **Structured Form**: Standardized fields for treatment details
2. **AI Analysis**: Natural language queries for treatment analysis and outcome prediction

### Structured Form to Chat Redirection
- **Automatic Navigation**: After a treatment is analyzed using the Structured Form, the user is automatically redirected to the Chat Input interface
- **Seamless Workflow**: Users can immediately view the AI's response in the chat interface after structured form submission
- **Response Visibility**: The AI analysis results from structured form submissions are displayed in the chat interface for easy viewing and follow-up questions

### AI Analysis Capabilities
- OpenAI-powered analysis of proposed treatments using web search
- Combines patient's specific medical history with current scientific literature
- Returns evidence-based insights with:
  - Probabilistic outcome predictions with specific focus on likelihood of outcomes
  - Relevant case studies and research findings with reference links and citations
  - Treatment efficacy data from scientific journals with citations
  - Risk assessments based on patient profile
- Context-aware analysis based on patient's specific medical history
- Safety guardrails prevent direct treatment recommendations
- Real-time analysis with comprehensive error recovery
- Clean response formatting displaying only AI-generated content without metadata or title headers
- **Enhanced probability-focused analysis**: AI explicitly instructed to focus on probability of specific outcomes based on patient's historical records and scientific literature
- **Citation Requirements**: AI explicitly instructed to include reference links and citations for all information provided in analysis

### Outcome Logging
- Manual "Log Outcome" feature for doctors
- Flexible input system for:
  - Organ-specific metrics
  - Laboratory values
  - Custom health indicators
  - Treatment response data
- Outcomes automatically populate treatment history timeline

## Backend Data Management

### Patient Data Storage
- Secure storage of patient records and medical history
- **Dedicated Demo Data File Management**: Backend maintains a dedicated file in the codebase specifically for storing demo patient data (including Michael Chen and future demo patients)
- **Persistent Demo Data Loading**: On deployment, demo patient data is always loaded from the dedicated file and retained across all sessions
- **Persistent CRUD Operations**: All patient CRUD operations (add, edit, delete) update both the in-memory patient state and write changes back to the dedicated demo data file
- **Cross-Deployment Data Persistence**: Demo patient data remains consistent and persistent across application redeployments and updates
- **No Demo Data Overwrite Protection**: Backend logic prevents any operations that would overwrite or clear the dedicated demo patient data file during redeployment
- **New Patient Creation**: Backend storage and management of manually added patients with all form fields, with persistence to demo data file
- **Patient Update Operations**: Backend functionality to update existing patient details with validation, with persistence to demo data file
- **Patient Deletion Operations**: Backend functionality to securely delete patient records and associated data, with updates to demo data file
- **Patient ID Uniqueness Enforcement**: Backend validation to prevent duplicate patient IDs during creation and editing
- **Real-time Patient List Updates**: Immediate availability of patient changes in patient queries
- **Summary Data Storage**: Backend storage and management of Reason for Visit and Patient Report fields for each patient
- **Summary Update Operations**: Backend functionality to update and retrieve summary data with validation
- Treatment and outcome history persistence
- Analysis query history per patient with ability to clear chat history
- Access logs and audit trails

### Medical Records Management
- **Medical Record Update Operations**: Backend functionality to update existing medical record entries with validation
- **Medical Record Deletion Operations**: Backend functionality to securely delete medical record entries
- **Medical Record Data Validation**: Backend validation for medical record updates and creation
- **Real-time Medical Record Updates**: Immediate availability of medical record changes in patient queries
- Secure storage and retrieval of medical record modifications
- Audit logging for medical record edit and delete operations

### Treatment & Outcome Management
- **Treatment Update Operations**: Backend functionality to update existing treatment entries with validation
- **Treatment Deletion Operations**: Backend functionality to securely delete treatment entries
- **Cascade Outcome Deletion**: When a treatment is deleted, automatically delete all associated outcomes for that treatment
- **Outcome Update Operations**: Backend functionality to update existing outcome entries with validation
- **Outcome Deletion Operations**: Backend functionality to securely delete individual outcome entries
- **Treatment-Outcome Relationship Management**: Backend maintains proper relationships between treatments and outcomes
- **Real-time Treatment and Outcome Updates**: Immediate availability of treatment and outcome changes in patient queries
- Secure storage and retrieval of treatment and outcome modifications
- Audit logging for treatment and outcome edit and delete operations
- **Data Integrity Enforcement**: Backend ensures referential integrity when deleting treatments and associated outcomes

### Chat History Management
- Secure storage of chat conversations per patient
- Clear chat history functionality with proper data deletion
- Confirmation mechanisms for chat history clearing operations
- Audit logging for chat history management actions

### Admin Settings Storage
- Secure storage of OpenAI API Key only
- Settings persistence across application restarts
- Encrypted storage of sensitive configuration values
- Version tracking of configuration changes

### OpenAI Integration
- Direct integration with OpenAI API for treatment analysis and web search
- Patient record context building for enhanced analysis relevance
- Contextual query construction for treatment analysis
- Dynamic retrieval of OpenAI API Key from admin settings
- Real-time AI-powered analysis with evidence-based insights
- Complete analysis workflow using admin-configured OpenAI API connection
- **Clean Response Processing**: Extracts only the content field from OpenAI API responses, discarding metadata
- **Markdown Formatting Removal**: Strips all Markdown bold/italic markers (such as "**" or "__") from OpenAI's content field before returning to frontend
- **Enhanced AI Prompt**: AI explicitly instructed to include reference links and citations for all information provided in analysis responses
- **Comprehensive Patient Context Integration**: AI analysis includes all relevant patient information in the context sent to OpenAI:
  - Patient Vitals and health indicators
  - Medical Records and historical data
  - Reason for Visit from Summary tab
  - Patient Report from Summary tab
  - **Treatment and Outcome History** from patient's historical treatment timeline
- **Structured Patient Information Presentation**: OpenAI prompt construction clearly organizes and presents all patient data fields in the user message for comprehensive analysis
- **Robust JSON escaping for user input security:**
  - Comprehensive `escapeJson` function that properly escapes all special characters in user-supplied values and patient data
  - Escapes quotes, backslashes, newlines, tabs, and other control characters
  - Prevents JSON injection attacks from malicious user input
  - Applied to all user-supplied data including `patientId`, `treatmentDescription`, patient vitals, medical records, reason for visit, patient report, treatment history, and other dynamic content
  - Ensures valid JSON payload construction regardless of user input content
- **Strict compliance with latest OpenAI API documentation:**
  - Proper JSON payload construction using Motoko's JSON serialization libraries with secure escaping
  - Correct schema formatting for chat completions endpoint
  - Valid use of required parameters: `model`, `messages`, and optional parameters
  - Proper message structure with role and content fields
  - Compliant HTTP request headers and authentication
- **Enhanced HTTP request handling with proper timeout management:**
  - Configurable timeout settings for OpenAI API requests to prevent canister timeouts
  - Exponential backoff retry logic for failed requests
  - Proper HTTP request structure with correct OpenAI endpoint URLs
  - Request timeout detection and graceful handling
  - Connection pooling and request queuing for high-volume scenarios
- **Improved error handling and logging:**
  - Comprehensive error categorization for network timeouts, API errors, and service unavailability
  - Detailed logging of request/response cycles without exposing sensitive data
  - Clear error messages with actionable resolution steps for JSON formatting errors
  - Network connectivity issue detection and reporting
  - Service rate limiting and quota handling with user-friendly feedback

### OpenAI API Integration
- Backend performs direct queries to OpenAI API using admin-configured credentials
- Utilizes OpenAI for web search and analysis of medical literature and case studies
- Processes analysis results for treatment insights and probabilistic outcomes
- Retrieves OpenAI API Key from secure admin settings storage
- **Response Content Extraction**: Processes OpenAI API responses to extract only the content field from the message
- **Markdown Formatting Removal**: Strips all Markdown bold/italic markers (such as "**" or "__") from the extracted content before returning to frontend
- **Enhanced AI Instructions**: System prompt updated to explicitly require reference links and citations for all information provided in analysis
- **Comprehensive Patient Context Construction**: Treatment analysis requests include complete patient information:
  - Patient demographics and basic information
  - Current vitals and health status
  - Complete medical records and history
  - Current visit reason from Summary tab
  - Patient report and assessment from Summary tab
  - **Complete treatment and outcome history** from patient's historical treatment timeline
  - Treatment description from user input
- **Secure JSON payload construction with input sanitization:**
  - Refactored `analyzeTreatmentWithOpenAi` function uses robust JSON escaping for all patient data fields
  - All user-supplied values and patient information properly escaped before JSON construction
  - Prevention of JSON injection vulnerabilities from any patient data source
  - Maintains data integrity while ensuring security across all patient information fields including treatment history
- **Robust HTTP request implementation with strict API compliance:**
  - Properly formatted JSON payload construction using Motoko JSON libraries with secure escaping
  - Valid JSON serialization matching OpenAI's chat completions schema
  - Correct OpenAI API endpoint targeting (api.openai.com/v1/chat/completions)
  - Appropriate HTTP headers including Content-Type and Authorization
  - Request timeout configuration to prevent canister HTTP timeouts
  - Retry mechanisms with exponential backoff for transient failures
- **Enhanced error handling and diagnostics:**
  - Specific detection of JSON formatting errors with detailed diagnostics
  - Authentication failures with clear guidance
  - Network timeout handling with retry options
  - Service unavailability detection with fallback messaging
  - JSON parsing error handling with actionable feedback
  - Rate limiting and quota exceeded error handling
  - Comprehensive logging for debugging while protecting sensitive information
- **Dynamic configuration management:**
  - Runtime retrieval of OpenAI API Key from admin settings
  - No hardcoded API keys or sensitive configuration in codebase
  - Configuration validation before API requests
  - Graceful handling of missing or invalid settings
- **Enhanced OpenAI Request Configuration:**
  - Increased `max_tokens` parameter to allow for longer, more complete responses
  - Updated system prompt to explicitly instruct AI to focus on probability of specific outcomes and include reference links/citations
  - Enhanced user message construction to emphasize probabilistic analysis based on patient's complete medical profile including reason for visit, patient report, and treatment history
  - Maintains extraction and display of only the "content" field from OpenAI responses
- **Clean Codebase:**
  - All remaining Pinecone-related logic completely removed from backend
  - All remaining sitemap-related logic completely removed from backend
  - Streamlined codebase focused solely on OpenAI integration

### Error Handling & User Feedback
- Comprehensive error categorization system for different failure types:
  - JSON formatting and serialization errors with specific diagnostic information
  - API authentication errors with specific resolution guidance
  - Network connectivity and timeout issues with retry options
  - Service rate limiting or quota exceeded with clear explanations
  - Unexpected API responses with fallback options
  - Configuration errors when OpenAI settings are missing or invalid
  - OpenAI API schema validation errors with corrective guidance
  - Chat history clearing errors with specific user feedback
  - **Patient creation errors with specific validation feedback**
  - **Patient update errors with specific validation feedback**
  - **Patient deletion errors with specific user feedback**
  - **Duplicate patient ID errors with clear resolution guidance**
  - **Summary update errors with specific validation feedback**
  - **Medical record update errors with specific validation feedback**
  - **Medical record deletion errors with specific user feedback**
  - **Treatment update errors with specific validation feedback**
  - **Treatment deletion errors with specific user feedback**
  - **Outcome update errors with specific validation feedback**
  - **Outcome deletion errors with specific user feedback**
  - **Cascade deletion errors with specific user feedback when treatment deletion affects outcomes**
- User-friendly error messages with specific guidance for resolution
- Real-time error reporting with context-specific help information
- Detailed logging and monitoring for system maintenance
- Enhanced timeout handling to prevent canister HTTP request failures

### External Integrations
- FHIR API connections for EMR data
- Dynamic OpenAI API connection using admin-configured credentials
- Medical literature and case study data access via web search
- Enhanced reliability and error recovery for all external API connections

### Admin Functions
- **Admin Settings Panel** for secure OpenAI API Key management only:
  - Secure OpenAI API Key input and storage exclusively
  - Settings validation before saving
  - Clear feedback on configuration changes
  - Test connection functionality to verify OpenAI settings
  - No hardcoded sensitive configuration values
- Secure credential management system with encryption
- Error monitoring dashboard for API connection health
- System status indicators for external service availability
- Configuration change audit logging

## Security & Compliance
- All patient data treated as Protected Health Information (PHI)
- Strong access controls and user permissions
- Data encryption at rest and in transit
- Secure storage of OpenAI API Key with encryption
- API keys never exposed to frontend or unauthorized users
- No hardcoded sensitive configuration in codebase
- Audit logging for all patient data access and configuration changes
- **Audit logging for patient creation, modification, and deletion activities**
- **Audit logging for summary data updates and access**
- **Audit logging for medical record edit and delete operations**
- **Audit logging for treatment and outcome edit and delete operations**
- **Audit logging for cascade deletion operations when treatments and associated outcomes are deleted**
- Secure API connections for external medical data sources
- Error logging that excludes sensitive information while maintaining debugging capability
- Enhanced security monitoring for API authentication failures
- **JSON injection prevention through comprehensive input escaping for all patient data fields including treatment history**
- **Secure handling of all user-supplied data and patient information in API requests**
- Secure chat history management with proper access controls
- **Secure validation and sanitization of patient form data for all operations**
- **Secure patient deletion with proper data cleanup and cascade handling**
- **Secure validation and sanitization of summary data for all operations**
- **Secure validation and sanitization of medical record data for all operations**
- **Secure validation and sanitization of treatment and outcome data for all operations**
- **Secure cascade deletion handling with proper data integrity enforcement**
- **Secure demo data file management with proper access controls and encryption**

## Application Language
- All user interface text and content displayed in English
- Error messages and system notifications in English
- Medical terminology and documentation in English
