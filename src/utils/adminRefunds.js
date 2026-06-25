import { isShippableOrder } from './orderTypes';

export const REFUND_CATEGORY_OPTIONS = [
  'pre_ship_cancel',
  'withdrawal',
  'defect_complaint',
  'duplicate_payment',
  'goodwill',
  'other',
];

export const getDefaultRefundCategory = (request) =>
  REFUND_CATEGORY_OPTIONS.includes(request?.requestType)
    ? request.requestType
    : 'pre_ship_cancel';

export const getOrderHasDigitalItems = (order) =>
  order?.orderType === 'digital' ||
  order?.orderType === 'mixed' ||
  (order?.items || []).some((item) => !item.variantCode);

export const getOrderHasPhysicalItems = (order) =>
  isShippableOrder(order) || (order?.items || []).some((item) => item.variantCode);

export const getFullRefundDigitalWarning = ({
  order,
  amount,
  refundableMinor,
  formattedRefundAmount,
}) => {
  const isFullRefund = Number(amount || 0) === Number(refundableMinor || 0);
  if (!isFullRefund || !getOrderHasDigitalItems(order)) return '';

  const orderKind = order?.orderType === 'mixed'
    ? 'mixed order includes digital content and a physical product'
    : 'order includes digital content';

  return [
    `You are refunding the full ${formattedRefundAmount}.`,
    `This ${orderKind}.`,
    'The digital file may already have been delivered.',
    'Create the full Stripe refund anyway?',
  ].join('\n\n');
};
