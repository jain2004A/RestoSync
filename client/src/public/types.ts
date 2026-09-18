export interface PublicPlan {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  description: string;
  priceMonthly: number;
  priceYearly?: number;
  price?: number;
  interval?: string;
  maxOutlets?: number;
  maxStaffUsers?: number;
  trialDays?: number;
  isPopular?: boolean;
  buttonText?: string;
  features: string[] | Record<string, boolean>;
}

export interface EnquiryFormData {
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  city?: string;
  outletsCount?: string;
  message: string;
  interestedProduct?: string;
  formType?: string;
}

export type SubmissionStatus = 'idle' | 'loading' | 'success' | 'error';
