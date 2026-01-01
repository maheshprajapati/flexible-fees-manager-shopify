import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, Link, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  const feeRules = await prisma.feeRule.findMany({
    where: { shopId },
    include: {
      conditionGroups: {
        include: {
          conditions: true,
        },
      },
    },
    orderBy: [
      { priority: "asc" },
      { createdAt: "desc" },
    ],
  });

  // Convert Decimal to number for proper serialization
  const serializedFeeRules = feeRules.map(rule => ({
    ...rule,
    amount: Number(rule.amount),
  }));

  // Count by status
  const counts = {
    all: serializedFeeRules.length,
    published: serializedFeeRules.filter(r => r.status === "published").length,
    draft: serializedFeeRules.filter(r => r.status === "draft").length,
  };

  return { feeRules: serializedFeeRules, counts };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const feeRuleId = formData.get("feeRuleId") as string;
    await prisma.feeRule.delete({
      where: { id: feeRuleId, shopId },
    });
    return { success: true };
  }

  if (intent === "toggle-status") {
    const feeRuleId = formData.get("feeRuleId") as string;
    const feeRule = await prisma.feeRule.findFirst({
      where: { id: feeRuleId, shopId },
    });

    if (!feeRule) {
      return new Response("Fee rule not found", { status: 404 });
    }

    const newStatus = feeRule.status === "published" ? "draft" : "published";
    await prisma.feeRule.update({
      where: { id: feeRuleId },
      data: { status: newStatus },
    });

    return { success: true };
  }

  if (intent === "duplicate") {
    const feeRuleId = formData.get("feeRuleId") as string;
    const feeRule = await prisma.feeRule.findFirst({
      where: { id: feeRuleId, shopId },
      include: {
        conditionGroups: {
          include: {
            conditions: true,
          },
        },
      },
    });

    if (!feeRule) {
      return new Response("Fee rule not found", { status: 404 });
    }

    await prisma.feeRule.create({
      data: {
        shopId,
        title: `${feeRule.title} (Copy)`,
        amount: feeRule.amount,
        calculationType: feeRule.calculationType,
        sign: feeRule.sign,
        taxClass: feeRule.taxClass,
        status: "draft",
        priority: feeRule.priority,
        parentAndOr: feeRule.parentAndOr,
        conditionGroups: {
          create: feeRule.conditionGroups.map((group: any) => ({
            andOr: group.andOr,
            order: group.order,
            conditions: {
              create: group.conditions.map((condition: any) => ({
                type: condition.type,
                operator: condition.operator,
                value: condition.value,
              })),
            },
          })),
        },
      },
    });

    return { success: true };
  }

  return new Response("Invalid intent", { status: 400 });
};

export default function FFMFSFeesIndex() {
  const { feeRules, counts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  
  const currentFilter = searchParams.get("status") || "all";
  
  // Filter rules
  let filteredRules = feeRules;
  if (currentFilter !== "all") {
    filteredRules = feeRules.filter((r: any) => r.status === currentFilter);
  }
  if (searchQuery) {
    filteredRules = filteredRules.filter((r: any) => 
      r.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const formatAmount = (amount: number | null, calculationType: string, sign: string) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return "$0.00";
    const numAmount = Number(amount);
    const prefix = sign === "+" ? "+" : "-";
    if (calculationType === "percentage") {
      return `${prefix}${numAmount}%`;
    }
    if (calculationType === "multiple") {
      return `$${numAmount.toFixed(2)} × qty`;
    }
    return `${prefix}$${numAmount.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <style>{`
        .ffmfs-page {
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'San Francisco', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          padding: 20px;
          background: #f6f6f7;
          min-height: 100vh;
        }
        
        .ffmfs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        
        .ffmfs-title {
          font-size: 20px;
          font-weight: 600;
          color: #202223;
          margin: 0;
        }
        
        .ffmfs-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
          text-decoration: none;
        }
        
        .ffmfs-btn-primary {
          background: #008060;
          color: #fff;
        }
        
        .ffmfs-btn-primary:hover {
          background: #006e52;
        }
        
        .ffmfs-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .ffmfs-stat-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #e1e3e5;
        }
        
        .ffmfs-stat-label {
          font-size: 13px;
          color: #6d7175;
          margin-bottom: 8px;
        }
        
        .ffmfs-stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #202223;
        }
        
        .ffmfs-stat-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          margin-top: 8px;
        }
        
        .ffmfs-stat-badge.success {
          background: #aee9d1;
          color: #0a5c36;
        }
        
        .ffmfs-stat-badge.warning {
          background: #ffc96b;
          color: #5c4900;
        }
        
        .ffmfs-filters {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          background: #fff;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #e1e3e5;
        }
        
        .ffmfs-filter-tabs {
          display: flex;
          gap: 4px;
        }
        
        .ffmfs-filter-tab {
          padding: 8px 14px;
          border: 1px solid #c9cccf;
          background: #fff;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #202223;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .ffmfs-filter-tab:hover {
          background: #f6f6f7;
        }
        
        .ffmfs-filter-tab.active {
          background: #008060;
          border-color: #008060;
          color: #fff;
        }
        
        .ffmfs-search {
          flex: 1;
          max-width: 300px;
          margin-left: auto;
        }
        
        .ffmfs-search input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #c9cccf;
          border-radius: 6px;
          font-size: 13px;
          font-family: inherit;
        }
        
        .ffmfs-search input:focus {
          outline: none;
          border-color: #008060;
          box-shadow: 0 0 0 2px rgba(0, 128, 96, 0.2);
        }
        
        .ffmfs-count {
          font-size: 13px;
          color: #6d7175;
          margin-bottom: 12px;
        }
        
        .ffmfs-table-container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #e1e3e5;
          overflow: hidden;
        }
        
        .ffmfs-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .ffmfs-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #6d7175;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: #fafbfb;
          border-bottom: 1px solid #e1e3e5;
        }
        
        .ffmfs-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f2f3;
          font-size: 14px;
          color: #202223;
          vertical-align: middle;
        }
        
        .ffmfs-table tr:last-child td {
          border-bottom: none;
        }
        
        .ffmfs-table tr:hover {
          background: #fafbfb;
        }
        
        .ffmfs-fee-title {
          color: #008060;
          text-decoration: none;
          font-weight: 500;
        }
        
        .ffmfs-fee-title:hover {
          text-decoration: underline;
        }
        
        .ffmfs-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .ffmfs-badge.success {
          background: #aee9d1;
          color: #0a5c36;
        }
        
        .ffmfs-badge.warning {
          background: #fed3a1;
          color: #5c4102;
        }
        
        .ffmfs-badge.info {
          background: #a4e8f2;
          color: #00505e;
        }
        
        .ffmfs-toggle {
          width: 40px;
          height: 22px;
          border-radius: 11px;
          background: #c9cccf;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        
        .ffmfs-toggle.active {
          background: #008060;
        }
        
        .ffmfs-toggle::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          top: 3px;
          left: 3px;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        
        .ffmfs-toggle.active::after {
          left: 21px;
        }
        
        .ffmfs-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .ffmfs-action-btn {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #c9cccf;
          background: #fff;
          border-radius: 6px;
          cursor: pointer;
          color: #6d7175;
          transition: all 0.15s;
        }
        
        .ffmfs-action-btn:hover {
          background: #f6f6f7;
          color: #202223;
        }
        
        .ffmfs-action-btn.delete:hover {
          background: #ffd7d0;
          border-color: #e84c3d;
          color: #bf0b0b;
        }
        
        .ffmfs-empty {
          text-align: center;
          padding: 60px 24px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #e1e3e5;
        }
        
        .ffmfs-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          color: #c9cccf;
        }
        
        .ffmfs-empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #202223;
          margin-bottom: 8px;
        }
        
        .ffmfs-empty-text {
          font-size: 14px;
          color: #6d7175;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="ffmfs-page">
        {/* Header */}
        <div className="ffmfs-header">
          <h1 className="ffmfs-title">Fee Rules</h1>
          <Link to="/app/fees/new" className="ffmfs-btn ffmfs-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add New Fee
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="ffmfs-stats">
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Total Fees</div>
            <div className="ffmfs-stat-value">{counts.all}</div>
          </div>
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Active</div>
            <div className="ffmfs-stat-value">{counts.published}</div>
            <span className="ffmfs-stat-badge success">Published</span>
          </div>
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Draft</div>
            <div className="ffmfs-stat-value">{counts.draft}</div>
            <span className="ffmfs-stat-badge warning">Draft</span>
          </div>
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">All Configured</div>
            <div className="ffmfs-stat-value">{counts.all}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="ffmfs-filters">
          <div className="ffmfs-filter-tabs">
            <button
              className={`ffmfs-filter-tab ${currentFilter === "all" ? "active" : ""}`}
              onClick={() => setSearchParams({})}
            >
              All ({counts.all})
            </button>
            <button
              className={`ffmfs-filter-tab ${currentFilter === "published" ? "active" : ""}`}
              onClick={() => setSearchParams({ status: "published" })}
            >
              Active ({counts.published})
            </button>
            <button
              className={`ffmfs-filter-tab ${currentFilter === "draft" ? "active" : ""}`}
              onClick={() => setSearchParams({ status: "draft" })}
            >
              Draft ({counts.draft})
            </button>
          </div>
          <div className="ffmfs-search">
            <input
              type="text"
              placeholder="Search fees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="ffmfs-count">
          {filteredRules.length} {filteredRules.length === 1 ? "fee" : "fees"}
        </div>

        {/* Table or Empty State */}
        {filteredRules.length === 0 ? (
          <div className="ffmfs-empty">
            <div className="ffmfs-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 10h20"/>
              </svg>
            </div>
            <h3 className="ffmfs-empty-title">No fee rules yet</h3>
            <p className="ffmfs-empty-text">
              Create your first fee rule to start adding custom fees to orders
            </p>
            <Link to="/app/fees/new" className="ffmfs-btn ffmfs-btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Create Fee Rule
            </Link>
          </div>
        ) : (
          <div className="ffmfs-table-container">
            <table className="ffmfs-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Conditions</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule: any) => (
                  <tr key={rule.id}>
                    <td>
                      <Link to={`/app/fees/${rule.id}`} className="ffmfs-fee-title">
                        {rule.title}
                      </Link>
                    </td>
                    <td>
                      <span className="ffmfs-badge info">
                        {formatAmount(rule.amount, rule.calculationType, rule.sign)}
                      </span>
                    </td>
                    <td>
                      <span className="ffmfs-badge">
                        {rule.calculationType === "fixed" ? "Fixed" : 
                         rule.calculationType === "percentage" ? "Percentage" : "Per Qty"}
                      </span>
                    </td>
                    <td>
                      <fetcher.Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="intent" value="toggle-status" />
                        <input type="hidden" name="feeRuleId" value={rule.id} />
                        <button
                          type="submit"
                          className={`ffmfs-toggle ${rule.status === "published" ? "active" : ""}`}
                          title={rule.status === "published" ? "Active - Click to disable" : "Inactive - Click to enable"}
                        />
                      </fetcher.Form>
                    </td>
                    <td>{rule.conditionGroups.length} groups</td>
                    <td style={{ color: "#6d7175", fontSize: "13px" }}>{formatDate(rule.createdAt)}</td>
                    <td>
                      <div className="ffmfs-actions">
                        <Link to={`/app/fees/${rule.id}`} className="ffmfs-action-btn" title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Link>
                        <fetcher.Form method="post" style={{ display: "inline" }}>
                          <input type="hidden" name="intent" value="duplicate" />
                          <input type="hidden" name="feeRuleId" value={rule.id} />
                          <button type="submit" className="ffmfs-action-btn" title="Duplicate">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </button>
                        </fetcher.Form>
                        <fetcher.Form method="post" style={{ display: "inline" }}>
                          <input type="hidden" name="intent" value="delete" />
                          <input type="hidden" name="feeRuleId" value={rule.id} />
                          <button type="submit" className="ffmfs-action-btn delete" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </fetcher.Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};
