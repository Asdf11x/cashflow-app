import deRealEstateCosts from '../../config/investments/deRealEstateCosts.json';

const getDisplayValue = (item: any): string => {
  const rate = item.rateOfPurchasePrice ?? item.rate ?? item.percentageOfAnnualColdRent;

  if (typeof rate === 'number') {
    // Format as a percentage with 2 decimal places
    return `${(rate * 100).toFixed(2)} %`;
  }

  if (typeof item.manualAnnualAmount === 'number') {
    return `${item.manualAnnualAmount.toLocaleString('de-DE')} ${deRealEstateCosts.meta.currency}`;
  }

  // Fallback for any other type of value
  return 'N/A';
};

// A reusable component to render a section with a table
const DataSection = ({ title, data }: { title: string; data: Record<string, any> }) => {
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return (
    <div className="data-section-card">
      <h2 className="section-title">{title}</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-right">Default Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([key, item]) => (
              <tr key={key}>
                <td>
                  {item.label_de || item.label}
                  {item.optional && <span className="optional-tag">(Optional)</span>}
                </td>
                <td className="text-right value-cell">{getDisplayValue(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function OptionsMenu({ title }: { title: string }) {
  const { meta, purchaseCosts, rent, runningCosts } = deRealEstateCosts;

  return (
    <div className="options-container">
      <div className="header-container">
        <h1 className="page-title">{title}</h1>
        <div className="meta-info">
          <div className="meta-badge country-badge">
            <span>Country</span>
            <strong>{meta.country}</strong>
          </div>
          <div className="meta-badge currency-badge">
            <span>Currency</span>
            <strong>{meta.currency}</strong>
          </div>
        </div>
      </div>
      <p className="subtitle">Here are the default calculation values for Germany.</p>

      {/* --- Data Sections --- */}
      <DataSection
        title="Purchase Costs"
        data={{ ...purchaseCosts.basicCosts, ...purchaseCosts.additionalCosts }}
      />

      <DataSection title="Rent Taxes" data={rent.taxes} />

      <DataSection title="Annual Running Costs" data={runningCosts} />
    </div>
  );
}
