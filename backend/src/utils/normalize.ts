export const normalizeCompanyName = (name: string) =>
  name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000\-_.、,・/()]/g, '')
