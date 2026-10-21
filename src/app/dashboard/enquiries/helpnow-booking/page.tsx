'use client';

import { EnquiryTablePage } from '@/components/enquiries/EnquiryTablePage';

// Enquiry Section → Help Now Booking: the Help Now website's "Book Now"
// (Instant Booking) form.
export default function HelpNowBookingEnquiriesPage() {
  return <EnquiryTablePage type="HELP_NOW_QUICK_BOOKING" />;
}
