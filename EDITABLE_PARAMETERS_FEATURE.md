# Editable Analysis Parameters Feature

## Overview

The Sales Performance Analyzer now features an editable analysis parameters interface directly in the file upload component. Users can view, modify, and customize analysis parameters before triggering the upload and analysis process.

## Key Features

### 🎯 **Inline Parameter Configuration**
- **Location**: Integrated directly into the FileUpload component
- **Visibility**: Shows when files are ready for upload
- **Default State**: Displays the 5 default sales analysis parameters
- **Visual Design**: Clean, professional interface with blue theme

### ✏️ **Full Parameter Editing**
- **Toggle Parameters**: Enable/disable individual analysis parameters
- **Edit Parameters**: Modify names, descriptions, and analysis prompts
- **Add Custom Parameters**: Create new analysis criteria specific to business needs
- **Remove Custom Parameters**: Delete user-created parameters (default parameters cannot be removed)

### 🎨 **Dual View Modes**
1. **Compact View** (Default): Shows only enabled parameters with names and descriptions
2. **Detailed Edit View**: Full editing interface with checkboxes, edit buttons, and parameter management

### 💾 **Real-time Parameter Management**
- **Live Preview**: See exactly what will be analyzed before upload
- **Parameter Counter**: Shows number of selected parameters
- **Instant Updates**: Changes are immediately reflected in the interface

## User Interface Design

### **Compact View Features**
- Clean list of enabled parameters
- Parameter name and description display
- "Edit" button to expand to detailed view
- "Add" button to create new parameters
- Parameter count indicator

### **Detailed Edit View Features**
- Checkbox toggles for each parameter
- Inline editing with form fields (name, description, prompt)
- Edit and delete icons for each parameter
- Save/Cancel functionality for parameter editing
- Visual distinction between enabled/disabled parameters

### **Parameter Management Actions**
- **Toggle**: Click checkbox to enable/disable parameters
- **Edit**: Click edit icon to modify parameter details
- **Add**: Click "Add" button to create new custom parameters
- **Remove**: Click X icon to delete custom parameters (only for user-created ones)

## Technical Implementation

### **Frontend (FileUpload Component)**
```typescript
interface AnalysisParameter {
  id: string;
  name: string;
  description: string;
  prompt: string;
  enabled: boolean;
}
```

**State Management:**
- `analysisParameters`: Array of all analysis parameters
- `showParameterDetails`: Toggle between compact and detailed view
- `editingParameter`: ID of currently editing parameter

**Key Functions:**
- `handleParameterToggle()`: Enable/disable parameters
- `handleParameterEdit()`: Update parameter details
- `addNewParameter()`: Create new custom parameters
- `removeParameter()`: Delete custom parameters

### **Backend Integration**
- **Upload API**: Receives custom parameters via FormData
- **Analysis API**: Processes parameters for 'parameters' analysis type
- **Gemini Service**: Uses custom parameters for AI analysis
- **Memory Storage**: Stores custom parameters with analysis records

### **Data Flow**
1. User configures parameters in FileUpload component
2. Parameters sent to upload API via FormData
3. Upload API triggers analysis with custom parameters
4. Analysis API creates 'parameters' type analysis
5. Gemini service processes each enabled parameter
6. Results displayed with custom parameter names

## Usage Workflow

### **Step 1: File Selection**
- User uploads audio files
- Files appear in upload queue
- Parameter configuration interface becomes visible

### **Step 2: Parameter Configuration**
- Default parameters are pre-loaded and enabled
- User can view compact summary or expand to detailed edit mode
- Parameters can be toggled, edited, or new ones added

### **Step 3: Parameter Customization**
- **Edit Existing**: Click edit icon to modify name, description, or prompt
- **Add Custom**: Click "Add" to create business-specific parameters
- **Toggle Selection**: Enable/disable parameters as needed

### **Step 4: Upload & Analysis**
- User clicks "Upload & Analyze" button
- Selected parameters are sent with files
- Analysis runs using custom parameter configuration

### **Step 5: Results Display**
- Results show custom parameter names
- Analysis reflects user's specific configuration
- Parameters used are preserved with analysis record

## Example Custom Parameters

Users can create parameters like:
- **"Objection Handling"**: Focus on how sales objections are managed
- **"Product Demonstration"**: Evaluate product presentation skills
- **"Pricing Discussion"**: Analyze pricing conversation effectiveness
- **"Follow-up Planning"**: Assess next steps and follow-up strategy
- **"Competitor Comparison"**: Review competitive positioning discussions

## Benefits

### **For Users**
- **Complete Control**: Full customization of analysis criteria
- **Business Alignment**: Create parameters specific to company needs
- **Transparency**: See exactly what will be analyzed before processing
- **Flexibility**: Enable only relevant parameters for each analysis

### **For Sales Teams**
- **Targeted Analysis**: Focus on specific skills or conversation areas
- **Training Alignment**: Match analysis to current training objectives
- **Performance Tracking**: Monitor specific KPIs consistently
- **Custom Metrics**: Define company-specific success criteria

### **For Managers**
- **Standardization**: Ensure consistent analysis across team
- **Customization**: Adapt to different sales processes or products
- **Reporting**: Get insights on specific business priorities
- **Quality Control**: Define what constitutes effective sales conversations

## Technical Features

### **Parameter Validation**
- Required fields: name and prompt
- Real-time validation feedback
- Prevents empty or invalid parameters

### **User Experience**
- Intuitive interface design
- Smooth transitions between view modes
- Clear visual feedback for actions
- Professional styling consistent with app theme

### **Performance**
- Efficient state management
- Minimal re-renders
- Fast parameter updates
- Optimized bundle size

## Integration Points

### **API Endpoints**
- `POST /api/upload`: Receives custom parameters
- `POST /api/analyze`: Processes parameter-based analysis
- Analysis results include parameter names for proper display

### **Components**
- **FileUpload**: Main parameter configuration interface
- **EditParameterForm**: Inline editing component
- **AnalysisResults**: Displays results with custom parameter names

### **Data Storage**
- Parameters stored with analysis records
- Custom parameter names preserved for result display
- Full analysis configuration maintained for reference

This feature transforms the Sales Performance Analyzer from a fixed-parameter system to a fully customizable analysis platform, giving users complete control over what aspects of their sales calls are evaluated.