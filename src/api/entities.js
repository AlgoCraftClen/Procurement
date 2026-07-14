import { isSupabaseConfigured, supabase } from "./supabaseClient";

const RECORDS_TABLE = "app_records";

const entityNames = [
  "Supplier",
  "RFQ",
  "RFQResponse",
  "RawMaterial",
  "Equipment",
  "FinishedGood",
  "PurchaseOrder",
  "EquipmentLog",
  "IssuedItem",
  "Invoice",
  "GoodsReceipt",
  "Contract",
  "SupplierPerformance",
  "ItemCatalog",
  "Budget",
  "Location",
  "InventoryAdjustment",
  "Notification",
  "Department"
];

const localStores = Object.fromEntries(entityNames.map((name) => [name, []]));

function normalizeRecord(row) {
  const data = row.data || {};
  return {
    id: row.id,
    created_date: row.created_at,
    updated_date: row.updated_at,
    ...data
  };
}

function removeReservedFields(record = {}) {
  const { id, created_at, updated_at, created_date, updated_date, ...data } = record;
  return data;
}

function compareValues(a, b, direction) {
  const aValue = a ?? "";
  const bValue = b ?? "";
  if (aValue === bValue) return 0;
  return aValue > bValue ? direction : -direction;
}

function sortRecords(records, sort) {
  if (!sort) return records;
  const descending = sort.startsWith("-");
  const field = descending ? sort.slice(1) : sort;
  const direction = descending ? -1 : 1;
  return [...records].sort((a, b) => compareValues(a[field], b[field], direction));
}

function matchesQuery(record, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(record[key]);
    return record[key] === value;
  });
}

function applyLimit(records, limit) {
  return Number.isFinite(limit) ? records.slice(0, limit) : records;
}

function localEntity(entityName) {
  const store = localStores[entityName];
  return {
    async list(sort, limit) {
      return applyLimit(sortRecords(store, sort), limit);
    },
    async filter(query = {}, sort, limit) {
      const records = store.filter((record) => matchesQuery(record, query));
      return applyLimit(sortRecords(records, sort), limit);
    },
    async get(id) {
      const record = store.find((item) => item.id === id);
      if (!record) throw new Error(`${entityName} record not found`);
      return record;
    },
    async create(data) {
      const now = new Date().toISOString();
      const record = {
        id: crypto.randomUUID(),
        created_date: now,
        updated_date: now,
        ...removeReservedFields(data)
      };
      store.unshift(record);
      return record;
    },
    async update(id, data) {
      const index = store.findIndex((item) => item.id === id);
      if (index < 0) throw new Error(`${entityName} record not found`);
      store[index] = {
        ...store[index],
        ...removeReservedFields(data),
        updated_date: new Date().toISOString()
      };
      return store[index];
    },
    async delete(id) {
      const index = store.findIndex((item) => item.id === id);
      if (index >= 0) store.splice(index, 1);
      return true;
    },
    async bulkCreate(records = []) {
      return Promise.all(records.map((record) => this.create(record)));
    },
    subscribe(callback) {
      callback?.(store);
      return () => {};
    }
  };
}

function createEntity(entityName) {
  const fallback = localEntity(entityName);

  async function withFallback(operation, fallbackOperation) {
    if (!isSupabaseConfigured) return fallbackOperation();
    try {
      return await operation();
    } catch (error) {
      console.warn(`[Supabase:${entityName}] ${error.message}. Falling back to local data for this operation.`);
      return fallbackOperation();
    }
  }

  return {
    async list(sort, limit) {
      return withFallback(async () => {
        const { data, error } = await supabase
          .from(RECORDS_TABLE)
          .select("id, entity, data, created_at, updated_at")
          .eq("entity", entityName);
        if (error) throw error;
        return applyLimit(sortRecords((data || []).map(normalizeRecord), sort), limit);
      }, () => fallback.list(sort, limit));
    },

    async filter(query = {}, sort, limit) {
      return withFallback(async () => {
        const records = await this.list(sort);
        return applyLimit(records.filter((record) => matchesQuery(record, query)), limit);
      }, () => fallback.filter(query, sort, limit));
    },

    async get(id) {
      return withFallback(async () => {
        const { data, error } = await supabase
          .from(RECORDS_TABLE)
          .select("id, entity, data, created_at, updated_at")
          .eq("entity", entityName)
          .eq("id", id)
          .single();
        if (error) throw error;
        return normalizeRecord(data);
      }, () => fallback.get(id));
    },

    async create(data) {
      return withFallback(async () => {
        const { data: inserted, error } = await supabase
          .from(RECORDS_TABLE)
          .insert({ entity: entityName, data: removeReservedFields(data) })
          .select("id, entity, data, created_at, updated_at")
          .single();
        if (error) throw error;
        return normalizeRecord(inserted);
      }, () => fallback.create(data));
    },

    async update(id, data) {
      return withFallback(async () => {
        const current = await this.get(id);
        const merged = { ...removeReservedFields(current), ...removeReservedFields(data) };
        const { data: updated, error } = await supabase
          .from(RECORDS_TABLE)
          .update({ data: merged, updated_at: new Date().toISOString() })
          .eq("entity", entityName)
          .eq("id", id)
          .select("id, entity, data, created_at, updated_at")
          .single();
        if (error) throw error;
        return normalizeRecord(updated);
      }, () => fallback.update(id, data));
    },

    async delete(id) {
      return withFallback(async () => {
        const { error } = await supabase
          .from(RECORDS_TABLE)
          .delete()
          .eq("entity", entityName)
          .eq("id", id);
        if (error) throw error;
        return true;
      }, () => fallback.delete(id));
    },

    async bulkCreate(records = []) {
      return Promise.all(records.map((record) => this.create(record)));
    },

    subscribe(callback) {
      if (!isSupabaseConfigured) return fallback.subscribe(callback);
      const channel = supabase
        .channel(`${entityName}-changes`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: RECORDS_TABLE, filter: `entity=eq.${entityName}` },
          async () => callback?.(await this.list("-updated_date"))
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  };
}

const entities = Object.fromEntries(entityNames.map((name) => [name, createEntity(name)]));

export const Supplier = entities.Supplier;
export const RFQ = entities.RFQ;
export const RFQResponse = entities.RFQResponse;
export const RawMaterial = entities.RawMaterial;
export const Equipment = entities.Equipment;
export const FinishedGood = entities.FinishedGood;
export const PurchaseOrder = entities.PurchaseOrder;
export const EquipmentLog = entities.EquipmentLog;
export const IssuedItem = entities.IssuedItem;
export const Invoice = entities.Invoice;
export const GoodsReceipt = entities.GoodsReceipt;
export const Contract = entities.Contract;
export const SupplierPerformance = entities.SupplierPerformance;
export const ItemCatalog = entities.ItemCatalog;
export const Budget = entities.Budget;
export const Location = entities.Location;
export const InventoryAdjustment = entities.InventoryAdjustment;
export const Notification = entities.Notification;
export const Department = entities.Department;

export const User = {
  async me() {
    return {
      id: "public-user",
      email: "public@tobolarprocurement.com",
      full_name: "Tobolar Procurement User",
      role: "admin",
      has_access: true
    };
  },
  async logout() {
    return true;
  }
};
