export type FieldType = "text" | "number" | "select" | "radio" | "checklist";

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  isPrimary?: boolean;
  required?: boolean;
};

export type SubmissionData = Record<string, string | string[]>;

export interface FormDoc {
  _id: string;
  /** Capability secret held by the creator. Never sent to collaborators or the public. */
  adminToken: string;
  title: string;
  description?: string;
  fields: FormField[];
  createdAt?: Date;
  updatedAt?: Date;
  /** Set when the creator was signed in; otherwise the form is owned by whoever holds `adminToken`. */
  userId?: string;
  /** Lower-cased emails of accepted collaborators. */
  confirmedAdmins?: string[];
  isClosed?: boolean;
}

export interface SubmissionDoc {
  _id: string;
  formId: string;
  data: SubmissionData;
  submittedAt: Date;
}

export interface InviteDoc {
  _id: string;
  formId: string;
  formTitle: string;
  invitedEmail: string;
  /** Email of the inviter, or a display placeholder for anonymous token holders. */
  invitedBy: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
}
