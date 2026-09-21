export const questionnaireConfig = {
  version: "v1.0",
  sections: [
    {
      id: "personal_info",
      title: "About You",
      description: "Basic information to identify you in the legal document.",
      questions: [
        { id: "fullName", type: "text", label: "Full Legal Name", required: true },
        { id: "dateOfBirth", type: "date", label: "Date of Birth", required: true },
        { id: "nationality", type: "text", label: "Nationality", required: true },
        { id: "address", type: "textarea", label: "Permanent Address", required: true },
        { id: "city", type: "text", label: "City", required: true },
        { id: "state", type: "text", label: "State", required: true },
        { id: "country", type: "text", label: "Country", required: true },
        { id: "email", type: "email", label: "Email Address", required: true },
        { id: "phone", type: "phone", label: "Phone Number", required: true },
        {
          id: "maritalStatus",
          type: "single_select",
          label: "What is your marital status?",
          required: true,
          options: [
            { label: "Single", value: "Single" },
            { label: "Married", value: "Married" },
            { label: "Divorced", value: "Divorced" },
            { label: "Widowed", value: "Widowed" },
            { label: "Other / requires review", value: "Other" }
          ]
        },
        {
          id: "spouseName",
          type: "text",
          label: "Spouse's Full Name",
          required: true,
          conditions: [
            { field: "maritalStatus", operator: "equals", value: "Married" }
          ]
        }
      ]
    },
    {
      id: "children",
      title: "Children",
      description: "Information about your children.",
      questions: [
        {
          id: "hasChildren",
          type: "yes_no",
          label: "Do you have children?",
          required: true
        },
        {
          id: "hasMinorChildren",
          type: "yes_no",
          label: "Do you have any minor children (under 18 years of age)?",
          required: true,
          conditions: [
            {
              field: "hasChildren",
              operator: "equals",
              value: "Yes"
            }
          ]
        },
        {
          id: "childrenList",
          type: "repeater",
          label: "Add Child",
          required: true,
          conditions: [
            { field: "hasChildren", operator: "equals", value: "Yes" }
          ],
          fields: [
            { id: "name", type: "text", label: "Name", required: true },
            { id: "dateOfBirth", type: "date", label: "Date of Birth", required: true },
            {
              id: "relationship",
              type: "single_select",
              label: "Relationship",
              required: true,
              options: [
                { label: "Biological", value: "Biological" },
                { label: "Adopted", value: "Adopted" },
                { label: "Other", value: "Other" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "guardian",
      title: "Guardian Nomination",
      description: "Appoint a guardian for your minor children.",
      conditions: [
        { field: "hasChildren", operator: "equals", value: "Yes" },
        // A real system would compute age. We use a manual toggle for the demo, or just assume the frontend calculates it. 
        // For simplicity, we add an explicit question to trigger this section.
        { field: "hasMinorChildren", operator: "equals", value: "Yes" }
      ],
      questions: [
        { id: "guardianName", type: "text", label: "Proposed Guardian Name", required: true },
        { id: "guardianRelationship", type: "text", label: "Relationship to Child", required: true },
        { id: "guardianAddress", type: "textarea", label: "Guardian Address", required: true },
        { id: "alternateGuardianName", type: "text", label: "Alternate Guardian Name (Optional)", required: false }
      ]
    },
    {
      id: "assets",
      title: "Assets & Properties",
      description: "List your assets and properties.",
      questions: [
        {
          id: "assetsList",
          type: "repeater",
          label: "Add Asset",
          required: true,
          fields: [
            {
              id: "type",
              type: "single_select",
              label: "Asset Type",
              required: true,
              options: [
                { label: "Property", value: "Property" },
                { label: "Bank Account", value: "BankAccount" },
                { label: "Investments", value: "Investments" },
                { label: "Vehicles", value: "Vehicles" },
                { label: "Digital Assets", value: "DigitalAssets" },
                { label: "Business Interests", value: "BusinessInterests" },
                { label: "Personal Property", value: "PersonalProperty" }
              ]
            },
            { id: "description", type: "text", label: "Description / Identification", required: true },
            { id: "value", type: "number", label: "Approximate Value (Optional)", required: false },
            { id: "ownershipPercentage", type: "number", label: "Ownership Percentage (%)", required: true }
          ]
        }
      ]
    },
    {
      id: "nri",
      title: "NRI / Foreign Assets",
      description: "Cross-border succession can involve the laws of multiple jurisdictions. Your answers help us determine the appropriate workflow, but additional legal advice may be required.",
      questions: [
        {
          id: "isNRI",
          type: "yes_no",
          label: "Do you currently live outside India or own assets outside India?",
          required: true
        },
        {
          id: "countryOfResidence",
          type: "text",
          label: "Country of Residence",
          required: true,
          conditions: [
            { field: "isNRI", operator: "equals", value: "Yes" }
          ]
        },
        {
          id: "foreignAssetCountries",
          type: "text",
          label: "Countries where foreign assets are located",
          required: true,
          conditions: [
            { field: "isNRI", operator: "equals", value: "Yes" }
          ]
        }
      ]
    },
    {
      id: "beneficiaries",
      title: "Beneficiaries",
      description: "Who should inherit your assets?",
      questions: [
        {
          id: "beneficiariesList",
          type: "repeater",
          label: "Add Beneficiary",
          required: true,
          fields: [
            { id: "name", type: "text", label: "Name of Individual / Organization", required: true },
            { id: "relationship", type: "text", label: "Relationship (if applicable)", required: false },
            { id: "allocation", type: "text", label: "Allocation (e.g., 50% or Specific Asset)", required: true }
          ]
        }
      ]
    },
    {
      id: "executor",
      title: "Executor",
      description: "Appoint someone to execute your will.",
      questions: [
        { id: "executorName", type: "text", label: "Executor Name", required: true },
        { id: "executorRelationship", type: "text", label: "Relationship", required: true },
        { id: "executorAddress", type: "textarea", label: "Address", required: true },
        { id: "executorPhone", type: "phone", label: "Contact Details", required: true },
        { id: "alternateExecutorName", type: "text", label: "Alternate Executor (Optional)", required: false }
      ]
    },
    {
      id: "existing_will",
      title: "Existing Will",
      description: "Details about any previous estate planning documents.",
      questions: [
        {
          id: "hasExistingWill",
          type: "single_select",
          label: "Do you already have a will or other estate-planning document?",
          required: true,
          options: [
            { label: "No", value: "No" },
            { label: "Yes", value: "Yes" },
            { label: "Not sure", value: "Not sure" }
          ]
        }
      ]
    },
    {
      id: "special_circumstances",
      title: "Special Circumstances",
      description: "Optional section for unusual situations.",
      questions: [
        { id: "specialNotes", type: "textarea", label: "Any special circumstances or notes?", required: false }
      ]
    }
  ]
};
