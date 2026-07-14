import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

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

  const performCheck = useCallback(debounce(async (checkValue, filters, recordIdToIgnore) => {
    if (!checkValue || !entity) {
      setIsChecking(false);
      setIsDuplicate(false);
      setDuplicateRecord(null);
      return;
    }

    setIsChecking(true);
    try {
      const queryFilters = {
        [field]: checkValue,
        ...filters
      };
      
      const results = await entity.filter(queryFilters);
      
      let foundDuplicate = false;
      let foundRecord = null;

      if (results && results.length > 0) {
        // If we are editing, we need to make sure the found record is not the one we are currently editing.
        const otherRecords = recordIdToIgnore 
          ? results.filter(record => record.id !== recordIdToIgnore) 
          : results;

        if (otherRecords.length > 0) {
          foundDuplicate = true;
          foundRecord = otherRecords[0];
        }
      }
      
      setIsDuplicate(foundDuplicate);
      setDuplicateRecord(foundRecord);

    } catch (error) {
      console.error(`Duplicate check failed for ${field}:`, error);
      // In case of an error, we default to not blocking the user.
      setIsDuplicate(false);
      setDuplicateRecord(null);
    } finally {
      setIsChecking(false);
    }
  }, 500), [entity, field]); // Debounce is created once per entity/field combo.

  useEffect(() => {
    const filters = JSON.parse(additionalFiltersJSON);
    // Only perform check if the value is not empty and any required additional filters are present
    const canCheck = Object.values(filters).every(val => val);

    if (value && canCheck) {
      performCheck(value, filters, idToIgnore);
    } else {
      // Reset state if value is cleared or dependencies are missing
      setIsDuplicate(false);
      setDuplicateRecord(null);
      setIsChecking(false);
      performCheck.cancel();
    }
  }, [value, idToIgnore, additionalFiltersJSON, performCheck]);

  return { isChecking, isDuplicate, duplicateRecord };
}
