export const isShippableOrder = (order) =>
  Boolean(order?.orderType === 'physical' || order?.orderType === 'mixed' || order?.hasPhysicalItems);
