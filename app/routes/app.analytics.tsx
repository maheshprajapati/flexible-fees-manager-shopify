import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;

  // Get all fee rules
  const feeRules = await prisma.feeRule.findMany({
    where: { shopId },
    include: {
      conditionGroups: {
        include: {
          conditions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert Decimal to number for proper serialization
  const serializedFeeRules = feeRules.map(rule => ({
    ...rule,
    amount: Number(rule.amount),
  }));

  // Calculate analytics
  const totalFees = serializedFeeRules.length;
  const activeFees = serializedFeeRules.filter(f => f.status === "published").length;
  const draftFees = serializedFeeRules.filter(f => f.status === "draft").length;
  
  // Calculate total potential revenue (sum of all fee amounts)
  const totalFeeAmount = serializedFeeRules.reduce((sum, fee) => {
    return sum + (fee.status === "published" ? fee.amount : 0);
  }, 0);

  // Get top performing fees (by number of condition groups - more complex = more targeted)
  const topFees = [...serializedFeeRules]
    .filter(f => f.status === "published")
    .sort((a, b) => b.conditionGroups.length - a.conditionGroups.length)
    .slice(0, 5);

  // Fee type distribution
  const feeTypes = {
    fixed: serializedFeeRules.filter(f => f.calculationType === "fixed").length,
    percentage: serializedFeeRules.filter(f => f.calculationType === "percentage").length,
    multiple: serializedFeeRules.filter(f => f.calculationType === "multiple").length,
  };

  // Recent fees (last 5)
  const recentFees = serializedFeeRules.slice(0, 5);

  return {
    totalFees,
    activeFees,
    draftFees,
    totalFeeAmount,
    topFees,
    feeTypes,
    recentFees,
  };
};

export default function FFMFSAnalytics() {
  const { totalFees, activeFees, draftFees, totalFeeAmount, topFees, feeTypes, recentFees } = useLoaderData<typeof loader>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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

  return (
    <>
      <style>{`
        .ffmfs-analytics {
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
          border: 1px solid #c9cccf;
          text-decoration: none;
          background: #fff;
          color: #202223;
        }
        
        .ffmfs-btn:hover {
          background: #f6f6f7;
        }
        
        .ffmfs-section-title {
          font-size: 15px;
          font-weight: 600;
          color: #202223;
          margin: 0 0 16px 0;
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
        
        .ffmfs-stat-sub {
          font-size: 12px;
          color: #6d7175;
          margin-top: 8px;
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
        
        .ffmfs-card {
          background: #fff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #e1e3e5;
          margin-bottom: 24px;
        }
        
        .ffmfs-card-header {
          margin-bottom: 20px;
        }
        
        .ffmfs-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #202223;
          margin: 0 0 4px 0;
        }
        
        .ffmfs-card-subtitle {
          font-size: 13px;
          color: #6d7175;
          margin: 0;
        }
        
        .ffmfs-types-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        
        .ffmfs-type-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f6f6f7;
          border-radius: 10px;
        }
        
        .ffmfs-type-count {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #008060;
          color: #fff;
          border-radius: 10px;
          font-size: 20px;
          font-weight: 600;
        }
        
        .ffmfs-type-count.secondary {
          background: #5c6ac4;
        }
        
        .ffmfs-type-count.tertiary {
          background: #f49342;
        }
        
        .ffmfs-type-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: #202223;
          margin: 0 0 4px 0;
        }
        
        .ffmfs-type-info p {
          font-size: 12px;
          color: #6d7175;
          margin: 0;
        }
        
        .ffmfs-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .ffmfs-table th {
          text-align: left;
          padding: 12px 0;
          font-size: 12px;
          font-weight: 600;
          color: #6d7175;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e1e3e5;
        }
        
        .ffmfs-table td {
          padding: 14px 0;
          border-bottom: 1px solid #f1f2f3;
          font-size: 14px;
          color: #202223;
          vertical-align: middle;
        }
        
        .ffmfs-table tr:last-child td {
          border-bottom: none;
        }
        
        .ffmfs-fee-link {
          color: #008060;
          text-decoration: none;
          font-weight: 500;
        }
        
        .ffmfs-fee-link:hover {
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
        
        .ffmfs-badge.info {
          background: #a4e8f2;
          color: #00505e;
        }
        
        .ffmfs-badge.default {
          background: #e4e5e7;
          color: #202223;
        }
        
        .ffmfs-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        
        .ffmfs-quick-stat {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f1f2f3;
        }
        
        .ffmfs-quick-stat:last-child {
          border-bottom: none;
        }
        
        .ffmfs-quick-stat-label {
          font-size: 13px;
          color: #6d7175;
        }
        
        .ffmfs-quick-stat-value {
          font-size: 13px;
          font-weight: 600;
          color: #202223;
        }
        
        .ffmfs-empty {
          text-align: center;
          padding: 32px;
          color: #6d7175;
        }
        
        .ffmfs-recent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f2f3;
        }
        
        .ffmfs-recent-item:last-child {
          border-bottom: none;
        }
      `}</style>

      <div className="ffmfs-analytics">
        {/* Header */}
        <div className="ffmfs-header">
          <h1 className="ffmfs-title">Analytics</h1>
          <Link to="/app" className="ffmfs-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Fees
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="ffmfs-stats">
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Total Fee Rules</div>
            <div className="ffmfs-stat-value">{totalFees}</div>
            <div className="ffmfs-stat-sub">All configured fees</div>
          </div>
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Active Fees</div>
            <div className="ffmfs-stat-value">{activeFees}</div>
            <span className="ffmfs-stat-badge success">Published</span>
          </div>
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Draft Fees</div>
            <div className="ffmfs-stat-value">{draftFees}</div>
            <span className="ffmfs-stat-badge warning">Draft</span>
          </div>
          <div className="ffmfs-stat-card">
            <div className="ffmfs-stat-label">Active Fee Value</div>
            <div className="ffmfs-stat-value">{formatCurrency(totalFeeAmount)}</div>
            <div className="ffmfs-stat-sub">Combined amounts</div>
          </div>
        </div>

        {/* Fee Types Distribution */}
        <div className="ffmfs-card">
          <div className="ffmfs-card-header">
            <h2 className="ffmfs-card-title">Fee Types Distribution</h2>
            <p className="ffmfs-card-subtitle">Breakdown by calculation type</p>
          </div>
          <div className="ffmfs-types-grid">
            <div className="ffmfs-type-card">
              <div className="ffmfs-type-count">{feeTypes.fixed}</div>
              <div className="ffmfs-type-info">
                <h4>Fixed Amount</h4>
                <p>Flat fee per order</p>
              </div>
            </div>
            <div className="ffmfs-type-card">
              <div className="ffmfs-type-count secondary">{feeTypes.percentage}</div>
              <div className="ffmfs-type-info">
                <h4>Percentage</h4>
                <p>% of cart total</p>
              </div>
            </div>
            <div className="ffmfs-type-card">
              <div className="ffmfs-type-count tertiary">{feeTypes.multiple}</div>
              <div className="ffmfs-type-info">
                <h4>Per Quantity</h4>
                <p>Fee × item count</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Fees & Quick Stats */}
        <div className="ffmfs-row">
          {/* Top Targeted Fees */}
          <div className="ffmfs-card">
            <div className="ffmfs-card-header">
              <h2 className="ffmfs-card-title">Top Targeted Fees</h2>
              <p className="ffmfs-card-subtitle">Most conditions applied</p>
            </div>
            {topFees.length === 0 ? (
              <div className="ffmfs-empty">
                <p>No active fees yet</p>
                <Link to="/app/fees/new" className="ffmfs-fee-link">Create your first fee</Link>
              </div>
            ) : (
              <table className="ffmfs-table">
                <thead>
                  <tr>
                    <th>Fee Name</th>
                    <th>Amount</th>
                    <th>Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {topFees.map((fee: any) => (
                    <tr key={fee.id}>
                      <td>
                        <Link to={`/app/fees/${fee.id}`} className="ffmfs-fee-link">{fee.title}</Link>
                      </td>
                      <td>
                        <span className="ffmfs-badge info">
                          {formatAmount(fee.amount, fee.calculationType, fee.sign)}
                        </span>
                      </td>
                      <td>{fee.conditionGroups.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Stats */}
          <div className="ffmfs-card">
            <div className="ffmfs-card-header">
              <h2 className="ffmfs-card-title">Quick Stats</h2>
              <p className="ffmfs-card-subtitle">Usage overview</p>
            </div>
            <div className="ffmfs-quick-stat">
              <span className="ffmfs-quick-stat-label">Total condition groups</span>
              <span className="ffmfs-quick-stat-value">
                {topFees.reduce((sum: number, f: any) => sum + f.conditionGroups.length, 0)}
              </span>
            </div>
            <div className="ffmfs-quick-stat">
              <span className="ffmfs-quick-stat-label">Average groups per fee</span>
              <span className="ffmfs-quick-stat-value">
                {topFees.length > 0 
                  ? (topFees.reduce((sum: number, f: any) => sum + f.conditionGroups.length, 0) / topFees.length).toFixed(1)
                  : 0}
              </span>
            </div>
            <div className="ffmfs-quick-stat">
              <span className="ffmfs-quick-stat-label">Published rate</span>
              <span className="ffmfs-quick-stat-value">
                {totalFees > 0 ? ((activeFees / totalFees) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="ffmfs-quick-stat">
              <span className="ffmfs-quick-stat-label">Draft rate</span>
              <span className="ffmfs-quick-stat-value">
                {totalFees > 0 ? ((draftFees / totalFees) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Recently Created */}
        <div className="ffmfs-card">
          <div className="ffmfs-card-header">
            <h2 className="ffmfs-card-title">Recently Created</h2>
            <p className="ffmfs-card-subtitle">Your latest fee rules</p>
          </div>
          {recentFees.length === 0 ? (
            <div className="ffmfs-empty">
              <p>No fees created yet</p>
            </div>
          ) : (
            <>
              {recentFees.map((fee: any) => (
                <div key={fee.id} className="ffmfs-recent-item">
                  <Link to={`/app/fees/${fee.id}`} className="ffmfs-fee-link">{fee.title}</Link>
                  <span className={`ffmfs-badge ${fee.status === "published" ? "success" : "default"}`}>
                    {fee.status === "published" ? "Active" : "Draft"}
                  </span>
                  <span className="ffmfs-badge info">
                    {formatAmount(fee.amount, fee.calculationType, fee.sign)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};
