function ok(data = {}) {
  return Promise.resolve({ data: { success: true, ...data } });
}

export const generatePDF = async () => ok({ message: "PDF generation is not wired yet." });
export const sendNotification = async () => ok();
export const validateSupplier = async () => ok({ valid: true });
export const generateReport = async () => ok({ report: null });
export const autoReorder = async () => ok({ orders: [] });
export const sendWelcomeEmail = async () => ok();
export const validateInvitationCode = async () => ok({ valid: true });
export const updateBudgetOnPO = async () => ok();
export const updateBudgetOnInvoice = async () => ok();
export const cleanupDuplicateInvoices = async () => ok({ removed: 0 });
export const generateBarcode = async ({ value } = {}) => ok({ barcode: value || "" });

export async function generateInvitationCode() {
  return ok({
    generated_codes: [
      {
        code: "PUBLIC-OPEN",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }
    ]
  });
}

export async function identifyDuplicateInvoices() {
  return ok({ duplicates: [] });
}
