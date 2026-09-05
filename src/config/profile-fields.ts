/**
 * Single source of truth for registration + profile fields.
 * Add, remove or reorder entries here — the registration wizard and the
 * edit-profile form both render from this config, so no UI changes are needed
 * when the backend field list evolves.
 */
export type FieldType = "text" | "number" | "date" | "select" | "textarea" | "tel";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  maxLength?: number;
}

export interface FieldSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldConfig[];
}

export const profileSections: FieldSection[] = [
  {
    id: "basic",
    title: "Basic information",
    description: "Tell us who you are.",
    fields: [
      { name: "fullName", label: "Full name", type: "text", required: true, maxLength: 100 },
      {
        name: "gender",
        label: "Gender",
        type: "select",
        required: true,
        options: ["Male", "Female"],
      },
      { name: "dateOfBirth", label: "Date of birth", type: "date", required: true },
      {
        name: "maritalStatus",
        label: "Marital status",
        type: "select",
        required: true,
        options: ["Never married", "Divorced", "Widowed", "Awaiting divorce"],
      },
      {
        name: "height",
        label: "Height",
        type: "select",
        options: ["5'0\"", "5'2\"", "5'4\"", "5'6\"", "5'8\"", "5'10\"", "6'0\"", "6'2\""],
      },
      { name: "mobile", label: "Mobile number", type: "tel", required: true, maxLength: 10 },
    ],
  },
  {
    id: "community",
    title: "Community",
    description: "Helps us suggest matches your family will approve of.",
    fields: [
      {
        name: "religion",
        label: "Religion",
        type: "select",
        required: true,
        options: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"],
      },
      { name: "caste", label: "Caste / community", type: "text", maxLength: 60 },
      {
        name: "motherTongue",
        label: "Mother tongue",
        type: "select",
        options: [
          "Hindi",
          "Marathi",
          "Tamil",
          "Telugu",
          "Malayalam",
          "Kannada",
          "Gujarati",
          "Bengali",
          "Punjabi",
          "Other",
        ],
      },
    ],
  },
  {
    id: "career",
    title: "Education & career",
    fields: [
      {
        name: "education",
        label: "Highest qualification",
        type: "text",
        required: true,
        maxLength: 80,
      },
      { name: "occupation", label: "Occupation", type: "text", required: true, maxLength: 80 },
      {
        name: "employmentStatus",
        label: "Employment status",
        type: "select",
        options: ["Private sector", "Government", "Self employed", "Business", "Not working"],
      },
      {
        name: "incomeRange",
        label: "Annual income",
        type: "select",
        options: ["₹0–5 LPA", "₹5–9 LPA", "₹9–12 LPA", "₹12–18 LPA", "₹18–25 LPA", "₹25 LPA+"],
      },
      { name: "city", label: "City", type: "text", required: true, maxLength: 60 },
      { name: "state", label: "State", type: "text", maxLength: 60 },
    ],
  },
  {
    id: "about",
    title: "About & family",
    fields: [
      {
        name: "about",
        label: "About yourself",
        type: "textarea",
        maxLength: 600,
        placeholder: "A few lines about your personality, interests and what you value.",
      },
      { name: "fatherOccupation", label: "Father's occupation", type: "text", maxLength: 80 },
      { name: "motherOccupation", label: "Mother's occupation", type: "text", maxLength: 80 },
      { name: "siblings", label: "Siblings", type: "text", maxLength: 80 },
      { name: "familyType", label: "Family type", type: "select", options: ["Nuclear", "Joint"] },
      {
        name: "familyValues",
        label: "Family values",
        type: "select",
        options: ["Traditional", "Moderate", "Liberal"],
      },
    ],
  },
];
