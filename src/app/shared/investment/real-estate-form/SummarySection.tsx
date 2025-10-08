import { useTranslation } from 'react-i18next';
import { Stack, Typography, Divider } from '@mui/material';
import Decimal from 'decimal.js';
import { ResultRow } from '../../SharedComponents';
import { fmtMoney } from '../../../../core/domain/calc';

interface SummarySectionProps {
  currency: string;
  totalPurchaseSideCosts: Decimal;
  grandTotalPrice: Decimal;
  netRentMonthly: Decimal;
  netRentAnnual: Decimal;
  yieldPct: string;
}

export default function SummarySection(props: SummarySectionProps) {
  const { t } = useTranslation();
  const {
    currency,
    totalPurchaseSideCosts,
    grandTotalPrice,
    netRentMonthly,
    netRentAnnual,
    yieldPct,
  } = props;

  return (
    <Stack spacing={1} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6">{t('realEstateForm.summary.title')}</Typography>
      <ResultRow
        label={t('realEstateForm.summary.totalSideCosts')}
        value={`${fmtMoney(totalPurchaseSideCosts.toString())} ${currency}`}
      />
      <ResultRow
        label={t('realEstateForm.summary.grandTotal')}
        value={`${fmtMoney(grandTotalPrice.toString())} ${currency}`}
        isBold
      />
      <Divider sx={{ my: 1 }} />
      <ResultRow
        label={t('realEstateForm.summary.netRentMonthly')}
        value={`${fmtMoney(netRentMonthly.toString())} ${currency}`}
      />
      <ResultRow
        label={t('realEstateForm.summary.netRentYearly')}
        value={`${fmtMoney(netRentAnnual.toString())} ${currency}`}
      />
      <ResultRow label={t('realEstateForm.summary.initialYield')} value={`${yieldPct} %`} isBold />
    </Stack>
  );
}
