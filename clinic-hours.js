// Shared clinic-hours data for the homepage and future contact section.
// Update this file whenever the clinic's regular weekly schedule changes.
window.NorthernSmiles = window.NorthernSmiles || {};

window.NorthernSmiles.clinicHours = {
  timeZone: "America/Toronto",
  weeklySchedule: {
    Monday: { opens: "8:00 AM", closes: "4:00 PM" },
    Tuesday: { opens: "1:00 PM", closes: "8:00 PM" },
    Wednesday: { opens: "8:00 AM", closes: "4:00 PM" },
    Thursday: { opens: "8:00 AM", closes: "6:00 PM" },
    Friday: { opens: "9:00 AM", closes: "2:00 PM" },
    Saturday: null,
    Sunday: null,
  },
};
