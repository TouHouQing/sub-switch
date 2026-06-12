export const formatGatewayNumber = (value: number | undefined): string =>
  new Intl.NumberFormat("zh-CN").format(value ?? 0);

export const formatGatewayDateTime = (value?: string): string => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const maskGatewaySecret = (secret?: string, prefix?: string): string => {
  const source = secret || prefix;
  if (!source) return "待创建";
  if (source.length <= 10) return `${source.slice(0, 4)}...`;
  return `${source.slice(0, 6)}...${source.slice(-4)}`;
};
