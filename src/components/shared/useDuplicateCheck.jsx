import { useState, useEffect } from 'react';

/**
 * A reusable React hook to check for duplicate records in real-time.
 * @param {object} options - The configuration options.
 * @param {object} options.entity - The data entity to query (e.g., Supplier, Invoice).
 * @param {string} options.field - The field to check for duplicates (e.g., 'company_name', 'invoice_number').
 * @param {string} options.value - The current value of the field from the form.
 * @param {string|null} options.idToIgnore - The ID of the current record being edited, to prevent it from finding itself as a duplicate.
 * @param {object} options.additionalFilters - Extra filters to apply, e.g., { supplier_id: '...' }.
 * @returns {{isChecking: boolean, isDuplicate: boolean, duplicateRecord: object|null}} - State object.
 */
export function useDuplicateCheck({ entity, field, value, idToIgnore = null, additionalFilters = {} }) {
  const [isChecking, setIsChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState(null);

  // Use JSON.stringify to create a stable dependency for the filters object.
  const additionalFiltersJSON = JSON.stringify(additionalFilters);

  useEffect(() => {
    const filters = JSON.parse(additionalFiltersJSON);
    // Only perform check if the value is not empty and any required additional filters are present
    const canCheck = Object.values(filters).every(val => val);

    if (!value || !canCheck || !entity) {
      setIsDuplicate(false);
      setDuplicateRecord(null);
      setIsChecking(false);
      return undefined;
    }

    setIsChecking(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const queryFilters = {
          [field]: value,
          ...filters
        };

        const results = await entity.filter(queryFilters);
        const otherRecords = idToIgnore
          ? (results || []).filter(record => record.id !== idToIgnore)
          : (results || []);

        setIsDuplicate(otherRecords.length > 0);
        setDuplicateRecord(otherRecords[0] || null);
      } catch (error) {
        console.error(`Duplicate check failed for ${field}:`, error);
        setIsDuplicate(false);
        setDuplicateRecord(null);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [entity, field, value, idToIgnore, additionalFiltersJSON]);

  return { isChecking, isDuplicate, duplicateRecord };
}
