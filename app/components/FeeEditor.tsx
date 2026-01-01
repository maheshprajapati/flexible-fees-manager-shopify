import { useState, useEffect } from "react";
import { Form, Link } from "react-router";

interface Condition {
  id: string;
  type: string;
  operator: string;
  value: string | string[];
}

interface ConditionGroup {
  id: string;
  andOr: "and" | "or";
  conditions: Condition[];
}

interface FeeRule {
  id: string;
  title: string;
  amount: number;
  calculationType: string;
  sign: string;
  taxClass: string | null;
  status: string;
  priority: number;
  parentAndOr: string;
  conditionGroups: Array<{
    id: string;
    andOr: string;
    order: number;
    conditions: Array<{
      id: string;
      type: string;
      operator: string;
      value: string | null;
    }>;
  }>;
}

interface SelectOption {
  value: string;
  label: string;
}

interface FeeEditorProps {
  feeRule: FeeRule | null;
  error?: string;
  isSubmitting?: boolean;
  products?: SelectOption[];
  collections?: SelectOption[];
}

// Condition types with icons (SVG paths)
const CONDITION_TYPES = {
  cart: [
    { value: "subtotal", label: "Subtotal", icon: "subtotal" },
    { value: "subtotal_ex_tax", label: "Subtotal ex. taxes", icon: "subtotal-taxes" },
    { value: "contains_product", label: "Contains Product", icon: "contains-product" },
    { value: "tax", label: "Tax", icon: "tax" },
    { value: "quantity", label: "Quantity", icon: "quantity" },
    { value: "coupon", label: "Coupon", icon: "coupon" },
    { value: "weight", label: "Weight", icon: "weight" },
    { value: "shipping_class", label: "Shipping Class", icon: "shipping-class" },
  ],
  user: [
    { value: "country", label: "Country", icon: "country" },
    { value: "customer_tag", label: "Customer Tag", icon: "user-role" },
    { value: "zipcode", label: "Zipcode", icon: "zipcode" },
    { value: "city", label: "City", icon: "city" },
    { value: "state", label: "State/Province", icon: "state" },
  ],
  product: [
    { value: "stock", label: "Stock", icon: "stock" },
    { value: "stock_status", label: "Stock Status", icon: "stock-status" },
    { value: "width", label: "Width", icon: "width" },
    { value: "height", label: "Height", icon: "height" },
    { value: "length", label: "Length", icon: "length" },
    { value: "collection", label: "Collection", icon: "category" },
  ],
};

const OPERATORS = {
  numeric: [
    { value: ">=", label: "Greater or equal to" },
    { value: "<=", label: "Less or equal to" },
    { value: ">", label: "Greater than" },
    { value: "<", label: "Less than" },
    { value: "==", label: "Equal to" },
    { value: "!=", label: "Not equal to" },
  ],
  string: [
    { value: "==", label: "Equal to" },
    { value: "!=", label: "Not equal to" },
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does not contain" },
  ],
  array: [
    { value: "in", label: "In" },
    { value: "not_in", label: "Not in" },
  ],
};

// Sample data for multi-select fields (in real app, these would come from API)
const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "JP", label: "Japan" },
];

const STATES = [
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "TX", label: "Texas" },
  { value: "FL", label: "Florida" },
  { value: "ON", label: "Ontario" },
  { value: "BC", label: "British Columbia" },
];

// Condition icon component
const ConditionIcon = ({ type }: { type: string }) => {
  const iconPaths: Record<string, JSX.Element> = {
    subtotal: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    "subtotal-taxes": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M7 15h0M12 15h0M17 15h0M7 10h10"/>
      </svg>
    ),
    "contains-product": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      </svg>
    ),
    tax: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16v16H4z"/><path d="M9 9l6 6M15 9l-6 6"/>
      </svg>
    ),
    quantity: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M2 12h20"/>
      </svg>
    ),
    coupon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V9z"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    weight: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"/>
      </svg>
    ),
    "shipping-class": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
        <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    country: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    "user-role": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    zipcode: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    ),
    city: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1"/>
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
      </svg>
    ),
    state: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
    stock: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>
      </svg>
    ),
    "stock-status": (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    width: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12H3M21 12l-4-4M21 12l-4 4M3 12l4-4M3 12l4 4"/>
      </svg>
    ),
    height: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 21V3M12 21l-4-4M12 21l4-4M12 3L8 7M12 3l4 4"/>
      </svg>
    ),
    length: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h20M6 8l-4 4 4 4M18 8l4 4-4 4"/>
      </svg>
    ),
    category: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  };

  return iconPaths[type] || iconPaths.subtotal;
};

export default function FFMFSFeeEditor({ feeRule, error, isSubmitting, products = [], collections = [] }: FeeEditorProps) {
  const [idCounter, setIdCounter] = useState(0);
  const [showFeeSettings, setShowFeeSettings] = useState(!feeRule);
  
  const [title, setTitle] = useState(feeRule?.title || "");
  // Handle Prisma Decimal type - convert to string properly
  const [amount, setAmount] = useState(() => {
    if (!feeRule?.amount) return "";
    const numAmount = typeof feeRule.amount === "object" 
      ? parseFloat(String(feeRule.amount)) 
      : Number(feeRule.amount);
    return isNaN(numAmount) ? "" : numAmount.toString();
  });
  const [calculationType, setCalculationType] = useState(feeRule?.calculationType || "fixed");
  const [sign, setSign] = useState(feeRule?.sign || "+");
  const [taxClass, setTaxClass] = useState(feeRule?.taxClass || "");
  const [status, setStatus] = useState(feeRule?.status || "draft");
  const [priority, setPriority] = useState(feeRule?.priority?.toString() || "0");
  const [parentAndOr, setParentAndOr] = useState<"and" | "or">(
    (feeRule?.parentAndOr as "and" | "or") || "or"
  );

  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([]);

  useEffect(() => {
    if (feeRule?.conditionGroups && feeRule.conditionGroups.length > 0) {
      try {
        const groups = feeRule.conditionGroups.map((group) => ({
          id: group.id,
          andOr: group.andOr as "and" | "or",
          conditions: group.conditions.map((cond) => {
            let parsedValue: string | string[] = "";
            if (cond.value) {
              try {
                if (typeof cond.value === "string" && (cond.value.startsWith("[") || cond.value.startsWith("{"))) {
                  parsedValue = JSON.parse(cond.value);
                } else {
                  parsedValue = cond.value;
                }
              } catch {
                parsedValue = cond.value;
              }
            }
            return {
              id: cond.id,
              type: cond.type,
              operator: cond.operator,
              value: parsedValue,
            };
          }),
        }));
        setConditionGroups(groups);
      } catch {
        // Silently fail
      }
    }
  }, [feeRule?.id]);

  const generateId = (prefix: string) => {
    const newCounter = idCounter + 1;
    setIdCounter(newCounter);
    return `${prefix}-${Date.now()}-${newCounter}`;
  };

  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: generateId("group"),
      andOr: "and",
      conditions: [
        {
          id: generateId("cond"),
          type: "subtotal",
          operator: ">=",
          value: "",
        },
      ],
    };
    setConditionGroups([...conditionGroups, newGroup]);
  };

  const removeConditionGroup = (groupId: string) => {
    setConditionGroups(conditionGroups.filter((g) => g.id !== groupId));
  };

  const addCondition = (groupId: string) => {
    setConditionGroups(
      conditionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                {
                  id: generateId("cond"),
                  type: "subtotal",
                  operator: ">=",
                  value: "",
                },
              ],
            }
          : group
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setConditionGroups(
      conditionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.filter((c) => c.id !== conditionId),
            }
          : group
      )
    );
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    field: keyof Condition,
    value: string | string[]
  ) => {
    setConditionGroups(
      conditionGroups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map((cond) =>
                cond.id === conditionId ? { ...cond, [field]: value } : cond
              ),
            }
          : group
      )
    );
  };

  const updateGroupLogic = (groupId: string, andOr: "and" | "or") => {
    setConditionGroups(
      conditionGroups.map((group) =>
        group.id === groupId ? { ...group, andOr } : group
      )
    );
  };

  const getOperatorsForType = (type: string) => {
    if (["subtotal", "subtotal_ex_tax", "tax", "quantity", "weight", "stock", "width", "height", "length"].includes(type)) {
      return OPERATORS.numeric;
    }
    if (["contains_product", "collection", "coupon", "customer_tag", "country", "state", "shipping_class"].includes(type)) {
      return OPERATORS.array;
    }
    return OPERATORS.string;
  };

  const isMultiSelectType = (type: string) => {
    return ["country", "state", "contains_product", "collection", "customer_tag", "shipping_class", "coupon", "stock_status"].includes(type);
  };

  const getConditionLabel = (type: string) => {
    const allTypes = [...CONDITION_TYPES.cart, ...CONDITION_TYPES.user, ...CONDITION_TYPES.product];
    return allTypes.find((t) => t.value === type)?.label || type;
  };

  const getConditionIcon = (type: string) => {
    const allTypes = [...CONDITION_TYPES.cart, ...CONDITION_TYPES.user, ...CONDITION_TYPES.product];
    return allTypes.find((t) => t.value === type)?.icon || "subtotal";
  };

  const formatAmount = () => {
    if (!amount) return "Not set";
    const prefix = sign === "+" ? "+" : "-";
    if (calculationType === "percentage") return `${prefix}${amount}%`;
    if (calculationType === "multiple") return `$${amount} × qty`;
    return `${prefix}$${amount}`;
  };

  const getMultiSelectOptions = (type: string): SelectOption[] => {
    switch (type) {
      case "country":
        return COUNTRIES;
      case "state":
        return STATES;
      case "stock_status":
        return [
          { value: "instock", label: "In Stock" },
          { value: "outofstock", label: "Out of Stock" },
        ];
      case "contains_product":
        return products;
      case "collection":
        return collections;
      default:
        return [];
    }
  };

  const handleMultiSelectChange = (
    groupId: string,
    conditionId: string,
    selectedValue: string,
    currentValues: string[]
  ) => {
    const newValues = currentValues.includes(selectedValue)
      ? currentValues.filter((v) => v !== selectedValue)
      : [...currentValues, selectedValue];
    updateCondition(groupId, conditionId, "value", newValues);
  };

  return (
    <Form method="post" id="fee-form">
      <style>{`
        .fee-editor {
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          max-width: 640px;
          margin: 0 auto;
          padding: 24px;
          color: #1a1a1a;
        }
        
        .fee-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        
        .fee-header-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #6b7280;
        }
        
        .breadcrumb a {
          color: #5c6ac4;
          text-decoration: none;
        }
        
        .breadcrumb a:hover {
          text-decoration: underline;
        }
        
        .page-title-input {
          font-size: 20px;
          font-weight: 600;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 8px 12px;
          background: #f9fafb;
          min-width: 300px;
          transition: all 0.2s;
        }
        
        .page-title-input:focus {
          outline: none;
          border-color: #5c6ac4;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(92, 106, 196, 0.15);
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .status-badge.draft {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        
        .status-badge.published {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          text-decoration: none;
        }
        
        .btn-primary {
          background: #303030;
          color: #fff;
        }
        
        .btn-primary:hover {
          background: #1a1a1a;
        }
        
        .btn-secondary {
          background: #fff;
          color: #303030;
          border: 1px solid #d1d5db;
        }
        
        .btn-secondary:hover {
          background: #f9fafb;
        }
        
        .error-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          margin-bottom: 20px;
          color: #dc2626;
          font-size: 14px;
        }
        
        /* Fee Settings Card */
        .settings-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 32px;
          overflow: hidden;
        }
        
        .settings-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          cursor: pointer;
        }
        
        .settings-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        
        .settings-card-title svg {
          color: #6b7280;
        }
        
        .settings-card-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .settings-card-body {
          padding: 20px;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.2s;
          background: #f9fafb;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #5c6ac4;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(92, 106, 196, 0.1);
        }
        
        .form-select {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          background: #f9fafb url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E") no-repeat right 12px center;
          appearance: none;
          cursor: pointer;
        }
        
        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
        }
        
        .amount-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .currency-symbol {
          padding: 10px 14px;
          background: #e5e7eb;
          border: 1px solid #d1d5db;
          border-radius: 8px 0 0 8px;
          font-size: 14px;
          color: #6b7280;
          border-right: none;
        }
        
        .sign-toggle {
          display: flex;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .sign-btn {
          padding: 8px 14px;
          border: none;
          background: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }
        
        .sign-btn.active {
          background: #5c6ac4;
          color: #fff;
        }
        
        .amount-input {
          flex: 1;
          border-radius: 0 8px 8px 0 !important;
        }
        
        .amount-suffix {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          margin-left: 8px;
        }
        
        .helper-text {
          font-size: 12px;
          color: #6b7280;
          margin-top: 6px;
        }
        
        /* Fee Settings Summary */
        .settings-summary {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 32px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .settings-summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .settings-summary-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          background: #f3f4f6;
          padding: 6px 12px;
          border-radius: 6px;
        }
        
        .settings-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        
        .settings-summary-key {
          color: #6b7280;
        }
        
        .settings-summary-value {
          font-weight: 500;
          color: #111827;
        }
        
        /* Conditions Section */
        .conditions-section {
          margin-top: 24px;
        }
        
        .condition-group-wrapper {
          position: relative;
          margin-bottom: 24px;
        }
        
        .condition-group {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
        }
        
        .condition-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .condition-label-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }
        
        .condition-card {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        
        .condition-card:hover {
          border-color: #5c6ac4;
          box-shadow: 0 0 0 3px rgba(92, 106, 196, 0.1);
        }
        
        .condition-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%);
          border: 1px solid #a5b4fc;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          color: #4338ca;
          margin-bottom: 12px;
        }
        
        .condition-type-badge svg {
          color: #6366f1;
        }
        
        .operator-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #92400e;
          text-transform: uppercase;
        }
        
        .condition-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }
        
        .condition-value-field {
          grid-column: span 2;
        }
        
        .condition-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
        }
        
        .action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
        }
        
        .action-btn:hover {
          background: #f9fafb;
        }
        
        .action-btn.delete {
          border-color: #fca5a5;
          background: #fef2f2;
          color: #dc2626;
        }
        
        .action-btn.delete:hover {
          background: #fee2e2;
        }
        
        .and-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 8px 0;
        }
        
        .and-badge {
          padding: 4px 12px;
          background: #e7e7e7;
          border: 1px solid #b0b0b0;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #3a3a3a;
        }
        
        .or-group-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0;
          position: relative;
        }
        
        .or-group-connector::before {
          content: '';
          position: absolute;
          left: 50%;
          top: -20px;
          bottom: -20px;
          width: 2px;
          background: #a5b4fc;
          z-index: 0;
        }
        
        .or-group-badge {
          padding: 8px 16px;
          background: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #1e40af;
          text-transform: uppercase;
          z-index: 1;
          position: relative;
        }
        
        .add-buttons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
        }
        
        .add-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .add-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .add-btn.primary {
          background: #5c6ac4;
          border-color: #5c6ac4;
          color: #fff;
        }
        
        .add-btn.primary:hover {
          background: #4f5bb5;
        }
        
        .empty-conditions {
          text-align: center;
          padding: 48px 24px;
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 12px;
        }
        
        .empty-conditions-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #9ca3af;
        }
        
        .empty-conditions-text {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        
        .empty-conditions-hint {
          font-size: 14px;
          color: #9ca3af;
        }
        
        /* Multi-select tags */
        .multi-select-container {
          position: relative;
        }
        
        .selected-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        
        .selected-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: #5c6ac4;
          color: #fff;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .selected-tag button {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          line-height: 1;
          opacity: 0.8;
        }
        
        .selected-tag button:hover {
          opacity: 1;
        }
        
        .options-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 10;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .option-item {
          padding: 10px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }
        
        .option-item:hover {
          background: #f3f4f6;
        }
        
        .option-item.selected {
          background: #ede9fe;
          color: #5c6ac4;
        }
        
        .option-checkbox {
          width: 16px;
          height: 16px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .option-checkbox.checked {
          background: #5c6ac4;
          border-color: #5c6ac4;
          color: #fff;
        }
      `}</style>

      <div className="fee-editor">
        {/* Header */}
        <div className="fee-header">
          <div className="fee-header-left">
            <div className="breadcrumb">
              <Link to="/app">All Fees</Link>
              <span>/</span>
              <span>{feeRule ? title || "Edit Fee" : "New Fee"}</span>
            </div>
            <input
              type="text"
              className="page-title-input"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter fee title..."
              required
            />
            <span className={`status-badge ${status}`}>
              {status === "published" ? "✓" : "○"} {status}
            </span>
          </div>
          <div className="header-actions">
            <Link to="/app" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : feeRule ? "Update" : "Publish"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Fee Settings Summary (when collapsed) */}
        {!showFeeSettings && title && amount && (
          <div className="settings-summary">
            <div className="settings-summary-header">
              <div className="settings-summary-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Fee Settings
              </div>
              <button
                type="button"
                className="action-btn"
                onClick={() => setShowFeeSettings(true)}
              >
                ✏️ Edit
              </button>
            </div>
            <div className="settings-summary-row">
              <span className="settings-summary-key">Fee Title:</span>
              <span className="settings-summary-value">{title}</span>
            </div>
            <div className="settings-summary-row">
              <span className="settings-summary-key">Fee Amount:</span>
              <span className="settings-summary-value">{formatAmount()}</span>
            </div>
            <div className="settings-summary-row">
              <span className="settings-summary-key">Tax Status:</span>
              <span className="settings-summary-value">{taxClass || "Non taxable"}</span>
            </div>
          </div>
        )}

        {/* Fee Settings Card (when expanded) */}
        {showFeeSettings && (
          <div className="settings-card">
            <div 
              className="settings-card-header"
              onClick={() => title && amount ? setShowFeeSettings(false) : null}
            >
              <div className="settings-card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Fee Settings
              </div>
              <div className="settings-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => title && amount ? setShowFeeSettings(false) : null}
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                >
                  Save & Continue
                </button>
              </div>
            </div>
            <div className="settings-card-body">
              <div className="form-group">
                <label className="form-label">Fee Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Handling Fee"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fee Amount *</label>
                <select
                  className="form-select"
                  value={calculationType}
                  onChange={(e) => setCalculationType(e.target.value)}
                  name="calculationType"
                  style={{ marginBottom: "8px" }}
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                  <option value="multiple">Multiple (by quantity)</option>
                </select>
                <div className="amount-group">
                  <span className="currency-symbol">$</span>
                  <div className="sign-toggle">
                    <button
                      type="button"
                      className={`sign-btn ${sign === "+" ? "active" : ""}`}
                      onClick={() => setSign("+")}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={`sign-btn ${sign === "-" ? "active" : ""}`}
                      onClick={() => setSign("-")}
                    >
                      −
                    </button>
                  </div>
                  <input
                    type="number"
                    className="form-input amount-input"
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    step="0.01"
                    required
                  />
                  {calculationType === "percentage" && <span className="amount-suffix">%</span>}
                  {calculationType === "multiple" && <span className="amount-suffix">× qty</span>}
                </div>
                <input type="hidden" name="sign" value={sign} />
                <p className="helper-text">
                  {calculationType === "fixed" && "Enter a fixed amount. Use + to add fee or - to subtract (discount)."}
                  {calculationType === "percentage" && "Enter percentage. Fee will be calculated based on cart total."}
                  {calculationType === "multiple" && "Enter amount per item. Fee will be multiplied by product quantity."}
                </p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tax Status</label>
                  <select
                    className="form-select"
                    name="taxClass"
                    value={taxClass}
                    onChange={(e) => setTaxClass(e.target.value)}
                  >
                    <option value="">Non taxable</option>
                    <option value="taxable">Taxable</option>
                    <option value="standard">Standard Rate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <input
                    type="number"
                    className="form-input"
                    name="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conditions Section */}
        <div className="conditions-section">
          {conditionGroups.length === 0 ? (
            <div className="empty-conditions">
              <div className="empty-conditions-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              </div>
              <p className="empty-conditions-text">
                No conditions added yet
              </p>
              <p className="empty-conditions-hint">
                Without conditions, this fee will apply to all orders
              </p>
              <div style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  className="add-btn primary"
                  onClick={addConditionGroup}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Add Condition
                </button>
              </div>
            </div>
          ) : (
            <>
              {conditionGroups.map((group, groupIndex) => (
                <div key={group.id} className="condition-group-wrapper">
                  {/* OR Group Connector */}
                  {groupIndex > 0 && (
                    <div className="or-group-connector">
                      <span className="or-group-badge">OR Group</span>
                    </div>
                  )}

                  <div className="condition-group">
                    {/* Group Header */}
                    <div className="condition-group-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="condition-label-badge">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                          </svg>
                          Condition Group {groupIndex + 1}
                        </span>
                        <div className="sign-toggle" style={{ fontSize: "11px" }}>
                          <button
                            type="button"
                            className={`sign-btn ${group.andOr === "and" ? "active" : ""}`}
                            onClick={() => updateGroupLogic(group.id, "and")}
                            style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 600 }}
                          >
                            AND
                          </button>
                          <button
                            type="button"
                            className={`sign-btn ${group.andOr === "or" ? "active" : ""}`}
                            onClick={() => updateGroupLogic(group.id, "or")}
                            style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 600 }}
                          >
                            OR
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={() => removeConditionGroup(group.id)}
                      >
                        🗑️ Remove Group
                      </button>
                    </div>

                    {/* Conditions */}
                    {group.conditions.map((condition, condIndex) => (
                      <div key={condition.id}>
                        {/* AND Connector */}
                        {condIndex > 0 && (
                          <div className="and-connector">
                            <span className="and-badge">{group.andOr.toUpperCase()} condition</span>
                          </div>
                        )}

                        <div className="condition-card">
                          {/* Condition Type Badge */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div className="condition-type-badge">
                              <ConditionIcon type={getConditionIcon(condition.type)} />
                              {getConditionLabel(condition.type)}
                            </div>
                            <div className="operator-badge">
                              {getOperatorsForType(condition.type).find(o => o.value === condition.operator)?.label || condition.operator}
                            </div>
                          </div>

                          <div className="condition-fields">
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "12px" }}>Condition Type</label>
                              <select
                                className="form-select"
                                value={condition.type}
                                onChange={(e) => updateCondition(group.id, condition.id, "type", e.target.value)}
                              >
                                <optgroup label="Cart Conditions">
                                  {CONDITION_TYPES.cart.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Customer Details">
                                  {CONDITION_TYPES.user.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Product Conditions">
                                  {CONDITION_TYPES.product.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "12px" }}>Operator</label>
                              <select
                                className="form-select"
                                value={condition.operator}
                                onChange={(e) => updateCondition(group.id, condition.id, "operator", e.target.value)}
                              >
                                {getOperatorsForType(condition.type).map((op) => (
                                  <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                              </select>
                            </div>

                            <div className="form-group condition-value-field" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "12px" }}>Value</label>
                              {isMultiSelectType(condition.type) ? (
                                <div className="multi-select-container">
                                  {/* Selected Tags */}
                                  {Array.isArray(condition.value) && condition.value.length > 0 && (
                                    <div className="selected-tags">
                                      {condition.value.map((val) => {
                                        const options = getMultiSelectOptions(condition.type);
                                        const label = options.find(o => o.value === val)?.label || val;
                                        return (
                                          <span key={val} className="selected-tag">
                                            {label}
                                            <button
                                              type="button"
                                              onClick={() => handleMultiSelectChange(
                                                group.id,
                                                condition.id,
                                                val,
                                                condition.value as string[]
                                              )}
                                            >
                                              ×
                                            </button>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {/* Select Dropdown */}
                                  <select
                                    className="form-select"
                                    value=""
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const currentValues = Array.isArray(condition.value) ? condition.value : [];
                                        handleMultiSelectChange(group.id, condition.id, e.target.value, currentValues);
                                      }
                                    }}
                                  >
                                    <option value="">Select {getConditionLabel(condition.type)}...</option>
                                    {getMultiSelectOptions(condition.type).map((opt) => {
                                      const isSelected = Array.isArray(condition.value) && condition.value.includes(opt.value);
                                      return (
                                        <option key={opt.value} value={opt.value} disabled={isSelected}>
                                          {isSelected ? "✓ " : ""}{opt.label}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              ) : (
                                <input
                                  type={["subtotal", "subtotal_ex_tax", "tax", "quantity", "weight", "stock", "width", "height", "length"].includes(condition.type) ? "number" : "text"}
                                  className="form-input"
                                  value={Array.isArray(condition.value) ? condition.value.join(", ") : condition.value || ""}
                                  onChange={(e) => updateCondition(group.id, condition.id, "value", e.target.value)}
                                  placeholder={`Enter ${getConditionLabel(condition.type).toLowerCase()}...`}
                                  step="0.01"
                                />
                              )}
                            </div>
                          </div>

                          <div className="condition-actions">
                            <button
                              type="button"
                              className="action-btn delete"
                              onClick={() => removeCondition(group.id, condition.id)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Condition Button */}
                    <div style={{ marginTop: "12px" }}>
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => addCondition(group.id)}
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                        Add New Condition
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Group Button */}
              <div className="add-buttons">
                <button
                  type="button"
                  className="add-btn primary"
                  onClick={addConditionGroup}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create "OR" Group
                </button>
              </div>
            </>
          )}
        </div>

        {/* Hidden fields */}
        <input type="hidden" name="parentAndOr" value={parentAndOr} />
        <input type="hidden" name="conditionGroups" value={JSON.stringify(conditionGroups)} />
      </div>
    </Form>
  );
}
